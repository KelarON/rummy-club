"use client";

import { NotebookPen, RotateCcw, Shuffle, Check } from "lucide-react";
import type { PointerEvent } from "react";
import type { SortMode } from "../../../lib/game";
import type { Room } from "../types";
import { TileButton } from "./tile-button";

type Props = {
  room: Room;
  rack: number[];
  selected: number[];
  dragging: number[];
  dragTarget: string;
  loading: boolean;
  mine: boolean;
  interactive: boolean;
  changed: boolean;
  board: number[][];
  newPoints: number;
  sortMode: SortMode;
  sandboxOpen: boolean;
  me: Room["players"][number] | undefined;
  move: (target: number | "rack" | "new") => void;
  reset: () => void;
  changeSort: (mode: SortMode) => void;
  setSandboxOpen: (open: boolean) => void;
  act: (action: string, extra?: Record<string, unknown>) => Promise<unknown>;
  choose: (id: number) => void;
  beginDrag: (id: number, e: PointerEvent<HTMLButtonElement>) => void;
  updateDrag: (e: PointerEvent<HTMLButtonElement>) => void;
  endDrag: (e: PointerEvent<HTMLButtonElement>) => void;
  finishDrag: (cancel?: boolean) => void;
};

export function RackPanel({
  room,
  rack,
  selected,
  dragging,
  dragTarget,
  loading,
  mine,
  interactive,
  changed,
  board,
  newPoints,
  sortMode,
  sandboxOpen,
  me,
  move,
  reset,
  changeSort,
  setSandboxOpen,
  act,
  choose,
  beginDrag,
  updateDrag,
  endDrag,
  finishDrag,
}: Props) {
  const tileNode = (id: number) => (
    <TileButton
      key={id}
      id={id}
      selected={selected.includes(id)}
      dragging={dragging.includes(id)}
      locked={sandboxOpen}
      newlyDrawn={room.lastDrawn === id}
      disabled={
        !interactive ||
        loading ||
        !!(me?.requiresOpening && !room.rack.includes(id))
      }
      onChoose={choose}
      onPointerDown={beginDrag}
      onPointerMove={updateDrag}
      onPointerUp={endDrag}
      onPointerCancel={() => finishDrag(true)}
    />
  );

  return (
    <section className="rack-panel">
      <div className="rack-heading">
        <div>
          <span className="eyebrow">ВАША ПОДСТАВКА</span>
          <h2>
            {rack.length} фишек{" "}
            <span>
              {me?.requiresOpening
                ? `Первый выход: ${newPoints} / 30`
                : "Можно перестраивать стол"}
            </span>
          </h2>
        </div>
        <div className="sort-actions">
          {interactive && selected.length > 0 && (
            <button
              className={`return-tile ${dragTarget === "rack" ? "drag-over" : ""}`}
              data-rack-return-drop
              onClick={() => move("rack")}
            >
              Вернуть на подставку
            </button>
          )}
          <button
            className="secondary compact"
            disabled={loading || changed || room.status !== "playing"}
            onClick={() => setSandboxOpen(true)}
          >
            <NotebookPen size={16} /> Черновик
          </button>
          <button
            className="textbtn"
            aria-pressed={sortMode === "color"}
            onClick={() => changeSort("color")}
          >
            <Shuffle size={15} /> По цвету
          </button>
          <button
            className="textbtn"
            aria-pressed={sortMode === "number"}
            onClick={() => changeSort("number")}
          >
            По числу
          </button>
        </div>
      </div>

      <div
        className={`rack ${dragTarget === "rack" ? "drag-over" : ""}`}
        data-rack-drop
      >
        {rack.map(tileNode)}
      </div>

      <div className="turn-actions">
        <p>
          {sandboxOpen
            ? "Рука заблокирована, пока открыт черновик."
            : mine
              ? "Составьте группы или ряды от 3 фишек."
              : room.status === "finished"
                ? "Спасибо за игру. Можно повторить!"
                : "Можно отсортировать фишки, пока ходит коллега."}
        </p>
        <div>
          <button
            className="secondary"
            disabled={!interactive || !changed || loading}
            onClick={reset}
          >
            <RotateCcw size={16} /> Отменить
          </button>
          <button
            className="secondary"
            disabled={!interactive || loading || changed}
            onClick={() => act("draw")}
          >
            {room.poolCount ? "Взять фишку" : "Пропустить"}
          </button>
          <button
            className="primary"
            disabled={!interactive || !changed || loading}
            onClick={() => act("play", { board })}
          >
            <Check size={18} /> Завершить ход
          </button>
        </div>
      </div>
    </section>
  );
}
