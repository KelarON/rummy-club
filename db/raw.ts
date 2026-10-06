import {DatabaseSync} from "node:sqlite";

type Params = unknown[];

class BoundStatement {
  constructor(private statement: ReturnType<DatabaseSync["prepare"]>, private params: Params) {}
  first<T extends Record<string, unknown> = Record<string, unknown>>(): T | null {
    return this.statement.get(...this.params) as T | null;
  }
  all<T extends Record<string, unknown> = Record<string, unknown>>() {
    return {results: this.statement.all(...this.params) as T[]};
  }
  run() {
    const result = this.statement.run(...this.params);
    return {meta: {changes: Number(result.changes)}};
  }
}

class SqliteDb {
  constructor(private database: DatabaseSync) {}
  prepare(sql: string) {
    const statement = this.database.prepare(sql);
    return {
      bind: (...params: Params) => new BoundStatement(statement, params),
    };
  }
}

let instance: SqliteDb | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export const ROOM_RETENTION_MS = 24 * 60 * 60 * 1000;
export const ROOM_IDLE_RETENTION_MS = 60 * 60 * 1000 + ROOM_RETENTION_MS;

export function cleanupOldRooms(now = Date.now()) {
  if (!instance) return;
  const finishedCutoff = now - ROOM_RETENTION_MS;
  const lobbyCutoff = now - ROOM_IDLE_RETENTION_MS;
  instance.prepare(`
    DELETE FROM rooms
    WHERE (json_extract(state, '$.status') IN ('closed','finished') AND activity_at < ?)
       OR (json_extract(state, '$.status') = 'lobby' AND activity_at < ?)
  `).bind(finishedCutoff, lobbyCutoff).run();
}

export function db() {
  if (!instance) {
    const path = process.env.RUMMY_DB_PATH || "/app/data/rummy-club.db";
    const database = new DatabaseSync(path);
    database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
    instance = new SqliteDb(database);
    cleanupOldRooms();
    cleanupTimer = setInterval(() => {
      try { cleanupOldRooms(); } catch {}
    }, 15 * 60 * 1000);
    cleanupTimer.unref?.();
  }
  return instance;
}
