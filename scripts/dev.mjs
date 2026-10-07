import { spawn } from "node:child_process";
import process from "node:process";
import crypto from "node:crypto";

await import("./migrate-local.mjs");

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
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

// Start both processes independently. The old readiness fetch could report a
// false negative with Vinext and terminate the whole dev server even though
// Vite was already starting normally. The WS server is safe to start first:
// its HTTP calls simply retry/fail harmlessly until the app is ready.
app = spawn(npm, ["exec", "--", "vinext", "dev", "--host", host], {
  stdio: "inherit",
  env,
});
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
