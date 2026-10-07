import { spawn } from "node:child_process";
import process from "node:process";
import crypto from "node:crypto";

await import("./migrate-local.mjs");

const isWindows = process.platform === "win32";
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "localhost";
const wsPort = Number(process.env.WS_PORT || 8788);
const internalToken = process.env.RUMMY_INTERNAL_TOKEN || crypto.randomUUID();

const env = {
  ...process.env,
  PORT: String(port),
  HOST: host,
  RUMMY_INTERNAL_TOKEN: internalToken,
};

let stopping = false;
let app = null;
let ws = null;

const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;

  app?.kill("SIGTERM");
  ws?.kill("SIGTERM");

  setTimeout(() => process.exit(code), 250);
};

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

// Start the application.
// On Windows, npm.cmd cannot be spawned directly on some Node/NVM
// configurations and results in EINVAL. Run npm through cmd.exe instead.
if (isWindows) {
  app = spawn(
    process.env.ComSpec || "cmd.exe",
    [
      "/d",
      "/s",
      "/c",
      "npm",
      "exec",
      "--",
      "vinext",
      "dev",
      "--host",
      host,
    ],
    {
      stdio: "inherit",
      env,
    },
  );
} else {
  app = spawn(
    "npm",
    ["exec", "--", "vinext", "dev", "--host", host],
    {
      stdio: "inherit",
      env,
    },
  );
}

// Start WebSocket server independently.
ws = spawn(process.execPath, ["scripts/ws-server.mjs"], {
  stdio: "inherit",
  env: {
    ...env,
    APP_HOST: host,
    APP_PORT: String(port),
    WS_PORT: String(wsPort),
  },
});

app.on("exit", (code) => {
  if (!stopping) stop(code ?? 1);
});

ws.on("exit", (code) => {
  if (!stopping && code !== 0) stop(code ?? 1);
});

console.log(`[dev] Starting application on http://${host}:${port}/`);
console.log(`[dev] Starting WebSocket server on :${wsPort}`);