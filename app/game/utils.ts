import type { RandomMode } from "../../lib/game";

export const duration = (ms: number) => {
  const n = Math.max(0, Math.floor(ms / 1000));
  return n >= 3600
    ? `${Math.floor(n / 3600)}:${String(Math.floor(n / 60) % 60).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`
    : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};

export const timeLabel = (s: number) =>
  s === 0 ? "Без времени" : s < 60 ? `${s} сек.` : `${s / 60} мин.`;

export const randomLabels: Record<RandomMode, string> = {
  classic: "Классическая",
  balanced: "Сбалансированная",
  easy: "Лёгкая",
};
