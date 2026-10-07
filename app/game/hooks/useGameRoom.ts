import { useEffect, useRef, useState } from "react";
import {
  meld,
  sortRack,
  type OpeningRule,
  type RandomMode,
  type SortMode,
} from "../../../lib/game";
import type { ApiRoom, Lobby, Room, Seat } from "../types";

export function useGameRoom() {
  const [room, setRoom] = useState<Room | null>(null),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [rules, setRules] = useState(false),
    [board, setBoard] = useState<number[][]>([]),
    [rack, setRack] = useState<number[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [online, setOnline] = useState(true),
    [restoring, setRestoring] = useState(true);
  const [createOpen, setCreateOpen] = useState(false),
    [turnSeconds, setTurnSeconds] = useState(0),
    [inviteCode, setInviteCode] = useState(""),
    [invite, setInvite] = useState<Lobby | null>(null),
    [clock, setClock] = useState(0);
  const [botCount, setBotCount] = useState(0),
    [replaceLeavers, setReplaceLeavers] = useState(false),
    [randomMode, setRandomMode] = useState<RandomMode>("balanced"),
    [chatOpen, setChatOpen] = useState(false),
    [sandboxOpen, setSandboxOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("color"),
    [isPublic, setIsPublic] = useState(false),
    [openingRule, setOpeningRule] = useState<OpeningRule>("shared");
  const [lobbies, setLobbies] = useState<Lobby[]>([]),
    [lobbiesError, setLobbiesError] = useState(""),
    [lobbiesLoading, setLobbiesLoading] = useState(true),
    [listRefresh, setListRefresh] = useState(0);

  const latest = useRef<Room | null>(null);
  const actionBusy = useRef(false);
  const seq = useRef(0);
  const clockOffset = useRef(0);
  const sortRef = useRef<SortMode>("color");

  const goHome = (message = "") => {
    seq.current++;
    latest.current = null;
    setRoom(null);
    setBoard([]);
    setRack([]);
    setSelected([]);
    setInvite(null);
    setInviteCode("");
    setCode("");
    setRestoring(false);
    setCreateOpen(false);
    setSandboxOpen(false);
    history.replaceState(null, "", "/");
    if (message) setNotice(message);
  };

  const accept = (r: Room) => {
    if (r.serverNow) {
      clockOffset.current = r.serverNow - Date.now();
      setClock(r.serverNow);
    }
    const previous = latest.current;
    if (previous?.code === r.code && previous.version >= r.version) return;
    const sameTurn =
      previous?.code === r.code &&
      previous.round === r.round &&
      previous.status === r.status &&
      previous.players[previous.turn]?.id === r.players[r.turn]?.id &&
      previous.turnStartedAt === r.turnStartedAt;
    const sameTiles =
      JSON.stringify(previous?.board) === JSON.stringify(r.board) &&
      JSON.stringify(previous?.rack) === JSON.stringify(r.rack);
    latest.current = r;
    setRoom(r);
    setCode(r.code);
    if (!sameTurn || !sameTiles) {
      setBoard(r.board.map((x) => [...x]));
      setRack(sortRack(r.rack, sortRef.current));
      setSelected([]);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rummy-sort");
      if (saved === "color" || saved === "number") {
        sortRef.current = saved;
        setSortMode(saved);
      }
      setName(localStorage.getItem("rummy-name") || "");
      setChatOpen(localStorage.getItem("rummy-chat-open") === "true");
    } catch {}

    const c = new URLSearchParams(location.search).get("room")?.toUpperCase();
    if (!c) {
      setRestoring(false);
      return;
    }
    setCode(c);
    setInviteCode(c);
    fetch(`/api/game?room=${encodeURIComponent(c)}`)
      .then((r) => r.json() as Promise<ApiRoom>)
      .then((r) => {
        if (r.join && r.invite) setInvite(r.invite);
        else if (r.code) accept(r);
        else setError(r.error || "Комната недоступна.");
      })
      .catch(() =>
        setError("Не удалось подключиться. Обновите страницу и попробуйте снова."),
      )
      .finally(() => setRestoring(false));
  }, []);

  useEffect(() => {
    if (!room) return;
    let stopped = false,
      reconnectTimer: ReturnType<typeof setTimeout> | null = null,
      socket: WebSocket | null = null,
      attempt = 0;
    const connect = () => {
      if (stopped) return;
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(
        `${protocol}//${location.host}/api/game/ws?room=${encodeURIComponent(room.code)}`,
      );
      socket.onopen = () => {
        attempt = 0;
        if (!stopped) setOnline(true);
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as {
            type?: string;
            error?: string;
            room?: ApiRoom;
          };
          if (stopped) return;
          if (message.type === "state" && message.room) {
            accept(message.room);
            setOnline(true);
            return;
          }
          if (message.type === "closed" || message.type === "left") {
            goHome(message.error || "Вы вышли из комнаты.");
            return;
          }
          if (message.type === "error" && message.error) setError(message.error);
        } catch {}
      };
      socket.onerror = () => {
        if (!stopped) setOnline(false);
      };
      socket.onclose = () => {
        if (stopped) return;
        setOnline(false);
        const delay = Math.min(5000, 500 * Math.pow(2, attempt++));
        reconnectTimer = setTimeout(connect, delay);
      };
    };
    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [room?.code]);

  useEffect(() => {
    const t = setInterval(() => setClock(Date.now() + clockOffset.current), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!room) return;
    const c = room.code;
    const disconnect = (event: PageTransitionEvent) => {
      if (!event.persisted)
        navigator.sendBeacon(
          "/api/game",
          new Blob([JSON.stringify({ action: "disconnect", code: c })], {
            type: "application/json",
          }),
        );
    };
    window.addEventListener("pagehide", disconnect);
    return () => window.removeEventListener("pagehide", disconnect);
  }, [room?.code]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (actionBusy.current) return null;
    actionBusy.current = true;
    setLoading(true);
    setError("");
    const requestSeq = seq.current;
    try {
      const base = latest.current,
        c = base?.code || code.toUpperCase().trim();
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch("/api/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            code: c,
            version: latest.current?.version,
            name,
            ...extra,
          }),
        });
        const r = (await res.json()) as ApiRoom;
        if (requestSeq !== seq.current) return null;
        if (res.status === 409 && attempt === 0) {
          const freshRes = await fetch(`/api/game?room=${c}`),
            fresh = (await freshRes.json()) as ApiRoom;
          if (!freshRes.ok || !fresh.code || fresh.join)
            throw Error(fresh.error || "Комната недоступна.");
          const unchangedTurn =
            base?.round === fresh.round &&
            base?.status === fresh.status &&
            base?.players[base.turn]?.id === fresh.players[fresh.turn]?.id &&
            base?.turnStartedAt === fresh.turnStartedAt &&
            JSON.stringify(base?.board) === JSON.stringify(fresh.board) &&
            JSON.stringify(base?.rack) === JSON.stringify(fresh.rack);
          accept(fresh);
          if (!unchangedTurn) throw Error("Ход уже изменился. Стол обновлён.");
          continue;
        }
        if (r.closed) {
          goHome(r.error);
          return null;
        }
        if (!res.ok) throw Error(r.error || "Не удалось выполнить действие.");
        if (r.left) {
          goHome("Вы вышли из лобби.");
          return r;
        }
        accept(r);
        setCreateOpen(false);
        setInvite(null);
        setInviteCode("");
        try {
          localStorage.setItem(
            "rummy-name",
            name || r.players.find((p: Seat) => p.id === r.me)?.name || "",
          );
        } catch {}
        history.replaceState(null, "", `?room=${r.code}`);
        setOnline(true);
        return r;
      }
      return null;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      actionBusy.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    if (room || restoring || inviteCode) return;
    let stopped = false;
    const controller = new AbortController();
    async function refresh() {
      try {
        const res = await fetch("/api/lobbies", { signal: controller.signal });
        const data = (await res.json()) as { lobbies: Lobby[]; error?: string };
        if (!res.ok) throw Error(data.error);
        if (!stopped) {
          setLobbies(data.lobbies);
          setLobbiesError("");
        }
      } catch (e) {
        if (!stopped)
          setLobbiesError((e as Error).message || "Список временно недоступен.");
      } finally {
        if (!stopped) setLobbiesLoading(false);
      }
    }
    setLobbiesLoading(true);
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      stopped = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [room?.code, restoring, inviteCode, listRefresh]);

  useEffect(() => setSandboxOpen(false), [room?.code, room?.round]);
  useEffect(() => {
    if (room?.status !== "playing") setSandboxOpen(false);
  }, [room?.status]);

  useEffect(() => {
    type ModelContext = {
      registerTool?: (tool: unknown, options: { signal: AbortSignal }) => unknown;
    };
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const tool = {
      name: "read_rummy_club_table",
      title: "Состояние партии",
      description:
        "Read the current player’s visible game state, excluding opponents’ hidden tiles.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => {
        const r = latest.current;
        return r
          ? {
              room: r.code,
              status: r.status,
              players: r.players,
              board: r.board,
              rack: r.rack,
              turn: r.players[r.turn]?.name,
            }
          : { status: "not_joined" };
      },
    };
    try {
      Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(() => {});
    } catch {}
    return () => controller.abort();
  }, []);

  function toggleChat(open: boolean) {
    setChatOpen(open);
    try {
      localStorage.setItem("rummy-chat-open", String(open));
    } catch {}
  }

  function changeSort(mode: SortMode) {
    sortRef.current = mode;
    setSortMode(mode);
    setRack((r) => sortRack(r, mode));
    try {
      localStorage.setItem("rummy-sort", mode);
    } catch {}
  }

  const remaining =
    room?.turnSeconds && room.turnStartedAt
      ? Math.max(0, room.turnStartedAt + room.turnSeconds * 1000 - clock)
      : null;
  const mine =
    !!room &&
    room.status === "playing" &&
    room.players[room.turn]?.id === room.me &&
    (remaining === null || remaining > 0);
  const interactive = mine && !sandboxOpen;
  const me = room?.players.find((p) => p.id === room.me);
  const owner =
    !!room &&
    (room.ownerId ?? room.players.find((p) => !p.bot)?.id) === room.me;
  const changed =
    !!room &&
    (JSON.stringify(board) !== JSON.stringify(room.board) || rack.length !== room.rack.length);
  const reset = () => {
    if (room) {
      setBoard(room.board.map((x) => [...x]));
      setRack(sortRack(room.rack, sortRef.current));
      setSelected([]);
      setError("");
    }
  };
  const choose = (id: number, suppressClick?: { current: boolean }) => {
    if (suppressClick?.current) return;
    if (!interactive || loading) return;
    if (me?.requiresOpening && !room!.rack.includes(id)) return;
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };
  function move(target: number | "rack" | "new") {
    if (!interactive || !selected.length) return;
    if (target === "rack" && selected.some((id) => !room!.rack.includes(id))) {
      setError("Фишки с общего стола нельзя забирать себе.");
      return;
    }
    let rows = board.map((r) => r.filter((id) => !selected.includes(id)));
    const hand = rack.filter((id) => !selected.includes(id));
    if (target === "rack") hand.push(...selected);
    else if (target === "new") rows.push([...selected]);
    else rows[target].push(...selected);
    rows = rows.filter((r) => r.length).map((r) => {
      // Keep invalid/unordered temporary melds intact while the player is rearranging.
      try {
        return meld(r)?.order ?? r;
      } catch {
        return r;
      }
    });
    setBoard(rows);
    setRack(sortRack(hand, sortRef.current));
    setSelected([]);
    setError("");
  }
  async function share() {
    if (!room) return;
    const url = `${location.origin}/?room=${room.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Ссылка скопирована — отправьте коллегам");
    } catch {
      setNotice("Скопируйте ссылку из адресной строки");
    }
  }
  const newPoints = board
    .filter((r) => r.every((t) => room?.rack.includes(t)))
    .reduce((sum, r) => {
      try {
        return sum + (meld(r)?.points || 0);
      } catch {
        return sum;
      }
    }, 0);

  return {
    room,
    name,
    code,
    loading,
    error,
    notice,
    rules,
    board,
    rack,
    selected,
    online,
    restoring,
    createOpen,
    turnSeconds,
    inviteCode,
    invite,
    clock,
    botCount,
    replaceLeavers,
    randomMode,
    chatOpen,
    sandboxOpen,
    sortMode,
    isPublic,
    openingRule,
    lobbies,
    lobbiesError,
    lobbiesLoading,
    remaining,
    mine,
    interactive,
    me,
    owner,
    changed,
    newPoints,
    setName,
    setCode,
    setRules,
    setCreateOpen,
    setTurnSeconds,
    setInviteCode,
    setBotCount,
    setReplaceLeavers,
    setRandomMode,
    setChatOpen,
    setSandboxOpen,
    setIsPublic,
    setOpeningRule,
    setListRefresh,
    setError,
    setNotice,
    setSelected,
    setBoard,
    setRack,
    goHome,
    accept,
    act,
    toggleChat,
    changeSort,
    reset,
    choose,
    move,
    share,
    latest,
    sortRef,
  };
}
