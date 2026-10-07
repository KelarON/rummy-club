import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import process from "node:process";

const PORT = Number(process.env.WS_PORT || 8788);
const APP_PORT = Number(process.env.APP_PORT || 8787);
const DB_PATH =
  process.env.RUMMY_DB_PATH || resolve(process.cwd(), "data/rummy-club.db");
const APP_HOST = process.env.APP_HOST || "localhost";
const APP_ORIGIN = `http://${APP_HOST}:${APP_PORT}`;
const INTERNAL_TOKEN = process.env.RUMMY_INTERNAL_TOKEN || "";
const connections = new Set();
let database = null;
const timers = new Map();

function db() {
  if (!database) {
    database = new DatabaseSync(DB_PATH);
    database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  }
  return database;
}

function roomCode(value) {
  return typeof value === "string" && /^[A-Z2-9]{8}$/.test(value)
    ? value
    : null;
}
function tokenFromCookie(cookie) {
  return cookie?.match(/(?:^|;\s*)rummy_player=([a-f0-9-]{36})/)?.[1] || null;
}
function identity(token) {
  return createHash("sha256").update(token).digest("hex");
}
function tile(id) {
  return {
    n: id >= 104 ? 0 : (id % 13) + 1,
    c: id >= 104 ? 4 : Math.floor(id / 13) % 4,
  };
}
function requiresOpening(g, p) {
  return g.openingRule === "shared" ? !g.openingUnlocked : !p.opened;
}
function host(g) {
  return g.players.find((p) => !p.bot);
}
function view(g, id, code, version, isPublic) {
  const own = g.players.find((p) => p.id === id);
  return {
    ...g,
    code,
    version,
    isPublic,
    serverNow: Date.now(),
    randomMode: g.randomMode ?? "classic",
    replaceLeavers: g.replaceLeavers ?? false,
    ownerId: host(g)?.id,
    chat: g.chat ?? [],
    openingRule: g.openingRule ?? "classic",
    openingUnlocked: g.openingUnlocked ?? false,
    lastDrawn:
      own?.lastDrawn != null && own.rack.includes(own.lastDrawn)
        ? own.lastDrawn
        : null,
    pool: undefined,
    poolCount: g.pool.length,
    players: g.players.map((p) => ({
      id: p.id,
      name: p.name,
      bot: p.bot === true,
      opened: p.opened,
      requiresOpening: requiresOpening(g, p),
      count: p.rack.length,
      penalty:
        g.status === "finished"
          ? p.rack.reduce((sum, t) => sum + (tile(t).n || 30), 0)
          : undefined,
    })),
    rack: own?.rack ?? [],
    me: id,
  };
}
function invite(row, g, code) {
  return {
    code,
    host: host(g)?.name ?? "",
    playerCount: g.players.length,
    openingRule: g.openingRule ?? "classic",
    turnSeconds: g.turnSeconds ?? 0,
    randomMode: g.randomMode ?? "classic",
    botCount: g.players.filter((p) => p.bot).length,
    replaceLeavers: g.replaceLeavers ?? false,
    status: g.status,
    canJoin: g.status === "lobby" && g.players.length < 4,
    isPublic: row.is_public === 1,
  };
}
function readRoom(code) {
  const row = db()
    .prepare(
      "SELECT state,version,created,is_public,activity_at FROM rooms WHERE code=?",
    )
    .get(code);
  if (!row) return null;
  return { ...row, g: JSON.parse(row.state) };
}
function sendFrame(socket, payload) {
  if (socket.destroyed) return;
  const body = Buffer.from(JSON.stringify(payload));
  let header;
  if (body.length < 126) header = Buffer.from([0x81, body.length]);
  else if (body.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(body.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(body.length), 2);
  }
  socket.write(Buffer.concat([header, body]));
}
function sendClose(socket) {
  if (socket.destroyed) return;
  socket.write(Buffer.from([0x88, 0]));
  socket.end();
}
function sendPing(socket) {
  if (socket.destroyed) return;
  socket.write(Buffer.from([0x89, 0]));
}
function acceptKey(key) {
  return createHash("sha1")
    .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
    .digest("base64");
}
function parseFrames(state, data) {
  state.buffer = Buffer.concat([state.buffer, data]);
  while (state.buffer.length >= 2) {
    const b0 = state.buffer[0],
      b1 = state.buffer[1];
    let offset = 2;
    let len = b1 & 0x7f;
    if (len === 126) {
      if (state.buffer.length < 4) return;
      len = state.buffer.readUInt16BE(2);
      offset = 4;
    } else if (len === 127) {
      if (state.buffer.length < 10) return;
      const n = state.buffer.readBigUInt64BE(2);
      if (n > BigInt(Number.MAX_SAFE_INTEGER)) return sendClose(state.socket);
      len = Number(n);
      offset = 10;
    }
    const masked = Boolean(b1 & 0x80);
    if (masked) offset += 4;
    if (state.buffer.length < offset + len) return;
    const mask = masked ? state.buffer.subarray(offset - 4, offset) : null;
    const payload = Buffer.from(state.buffer.subarray(offset, offset + len));
    state.buffer = state.buffer.subarray(offset + len);
    if (mask) {
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    }
    const opcode = b0 & 0x0f;
    if (opcode === 0x8) return sendClose(state.socket);
    if (opcode === 0x9) {
      const h =
        payload.length < 126 ? Buffer.from([0x8a, payload.length]) : null;
      if (h) state.socket.write(Buffer.concat([h, payload]));
    }
  }
}
function closeConnection(conn) {
  if (conn.closed) return;
  conn.closed = true;
  connections.delete(conn);
  if (
    ![...connections].some((other) => other.code === conn.code && !other.closed)
  )
    clearRoomTimer(conn.code);
  try {
    conn.socket.destroy();
  } catch {}
}
async function advanceRoom(code) {
  try {
    const response = await fetch(`${APP_ORIGIN}/api/game`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "x-rummy-internal-token": INTERNAL_TOKEN,
      },
      body: JSON.stringify({ action: "tick", code }),
    });
    const text = await response.text();
    let result = null;
    try {
      result = JSON.parse(text);
    } catch {}
    if (!response.ok) {
      const detail =
        result?.error || text.slice(0, 200) || `HTTP ${response.status}`;
      throw new Error(detail);
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[rummy-ws] tick ${code} failed: ${message} (${APP_ORIGIN})`);
    return null;
  }
}

function clearRoomTimer(code) {
  const timer = timers.get(code);
  if (timer) {
    clearTimeout(timer);
    timers.delete(code);
  }
}

function scheduleRoom(code) {
  clearRoomTimer(code);
  const row = readRoom(code);
  if (!row || row.g.status !== "playing" || row.g.turnStartedAt == null) return;
  const player = row.g.players[row.g.turn];
  if (!player) return;
  const seconds = player.bot ? 2 : (row.g.turnSeconds ?? 0);
  const delay =
    player.bot || seconds > 0
      ? Math.max(0, row.g.turnStartedAt + seconds * 1000 - Date.now())
      : Math.max(0, row.g.turnStartedAt + 30 * 60 * 1000 - Date.now());
  const timer = setTimeout(async () => {
    timers.delete(code);
    if (!connections.size) return;
    const active = [...connections].some(
      (conn) => conn.code === code && !conn.closed,
    );
    if (!active) return;
    const result = await advanceRoom(code);
    if (!result) return;
    const current = readRoom(code);
    if (current) {
      broadcastRoom(code);
      scheduleRoom(code);
    }
  }, delay);
  timer.unref?.();
  timers.set(code, timer);
}

function broadcastRoom(code) {
  const row = readRoom(code);
  if (!row) return;
  for (const conn of connections) {
    if (conn.code !== code || conn.closed) continue;
    const p = row.g.players.find((p) => p.id === conn.id);
    if (!p) {
      sendFrame(conn.socket, {
        type: "left",
        error: "Вы больше не участник комнаты.",
      });
      sendClose(conn.socket);
      continue;
    }
    if (row.g.status === "closed") {
      sendFrame(conn.socket, {
        type: "closed",
        error: row.g.closedReason || "Комната закрыта.",
      });
      sendClose(conn.socket);
      continue;
    }
    sendFrame(conn.socket, {
      type: "state",
      room: view(row.g, conn.id, code, row.version, row.is_public === 1),
    });
    conn.version = row.version;
  }
}

const heartbeat = setInterval(() => {
  for (const conn of connections) {
    if (!conn.closed) sendPing(conn.socket);
  }
}, 30000);
heartbeat.unref?.();

const server = createServer();
server.on("request", (req, res) => {
  if (
    req.method === "POST" &&
    new URL(req.url || "/", `http://${req.headers.host || "localhost"}`)
      .pathname === "/internal/notify"
  ) {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk.slice(0, 256);
    });
    req.on("end", () => {
      try {
        const { code } = JSON.parse(body);
        if (roomCode(code)) {
          broadcastRoom(code);
          scheduleRoom(code);
        }
        res.writeHead(204);
        res.end();
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});
server.on("upgrade", (req, socket) => {
  try {
    const url = new URL(
      req.url || "/",
      `http://${req.headers.host || "localhost"}`,
    );
    if (url.pathname !== "/api/game/ws") {
      socket.destroy();
      return;
    }
    const code = roomCode(url.searchParams.get("room")?.toUpperCase());
    const rawToken = tokenFromCookie(req.headers.cookie);
    if (!code || !rawToken) {
      socket.destroy();
      return;
    }
    const id = identity(rawToken),
      row = readRoom(code);
    if (!row) {
      socket.destroy();
      return;
    }
    const player = row.g.players.find((p) => p.id === id);
    if (!player) {
      const inviteData = invite(row, row.g, code);
      const key = req.headers["sec-websocket-key"];
      if (typeof key !== "string") {
        socket.destroy();
        return;
      }
      socket.write(
        `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
      );
      sendFrame(socket, { type: "join", invite: inviteData });
      sendClose(socket);
      return;
    }
    const key = req.headers["sec-websocket-key"];
    if (typeof key !== "string") {
      socket.destroy();
      return;
    }
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
    );
    const conn = {
      socket,
      code,
      id,
      token: rawToken,
      version: row.version,
      buffer: Buffer.alloc(0),
      created: Date.now(),
      closed: false,
    };
    connections.add(conn);
    sendFrame(socket, {
      type: "state",
      room: view(row.g, id, code, row.version, row.is_public === 1),
    });
    scheduleRoom(code);
    socket.on("data", (data) => parseFrames(conn, data));
    socket.on("error", () => closeConnection(conn));
    socket.on("close", () => closeConnection(conn));
  } catch {
    socket.destroy();
  }
});
server.listen(PORT, "0.0.0.0", () =>
  console.log(`[rummy-ws] WebSocket server listening on :${PORT}`),
);
