import { spawn } from "node:child_process";
import process from "node:process";
import crypto from "node:crypto";

const internalToken = process.env.RUMMY_INTERNAL_TOKEN || crypto.randomUUID();
const appPort = Number(process.env.PORT || 8787);
const wsPort = Number(process.env.WS_PORT || 8788);
const app = spawn(process.execPath, ["dist/standalone/server.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: String(appPort),
    HOST: process.env.HOST || "0.0.0.0",
    RUMMY_INTERNAL_TOKEN: internalToken,
  },
});
const ws = spawn(process.execPath, ["scripts/ws-server.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    APP_HOST: "localhost",
    APP_PORT: String(appPort),
    WS_PORT: String(wsPort),
    RUMMY_INTERNAL_TOKEN: internalToken,
  },
});
let stopping = false;
let exitCode = 0;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  exitCode = code;
  app.kill("SIGTERM");
  ws.kill("SIGTERM");
  setTimeout(() => process.exit(exitCode), 1000).unref();
};
app.on("exit", (code, signal) => {
  if (!stopping) stop(code ?? (signal ? 1 : 0));
});
ws.on("exit", (code, signal) => {
  if (!stopping) stop(code ?? (signal ? 1 : 0));
});
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
