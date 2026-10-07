import type { OpeningRule, RandomMode } from "../../lib/game";
import type { ChatMessage } from "../../lib/chat";

export type Seat = {
  id: string;
  name: string;
  count: number;
  opened: boolean;
  requiresOpening: boolean;
  penalty?: number;
  bot?: boolean;
};

export type Room = {
  code: string;
  version: number;
  me: string;
  players: Seat[];
  rack: number[];
  board: number[][];
  poolCount: number;
  turn: number;
  status: string;
  winner: string | null;
  log: string[];
  round: number;
  isPublic: boolean;
  openingRule: OpeningRule;
  openingUnlocked: boolean;
  lastDrawn: number | null;
  turnSeconds?: number;
  startedAt?: number | null;
  endedAt?: number | null;
  turnStartedAt?: number | null;
  serverNow: number;
  chat?: ChatMessage[];
  ownerId?: string;
  randomMode?: RandomMode;
  replaceLeavers?: boolean;
};

export type Lobby = {
  code: string;
  host: string;
  playerCount: number;
  openingRule: OpeningRule;
  turnSeconds?: number;
  status?: string;
  canJoin?: boolean;
  randomMode?: RandomMode;
  botCount?: number;
  replaceLeavers?: boolean;
};

export type ApiRoom = Room & {
  error?: string;
  join?: boolean;
  invite?: Lobby;
  left?: boolean;
  closed?: boolean;
};
