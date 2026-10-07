"use client";

import { Layers, Plus, Trophy } from "lucide-react";
import type { PointerEvent } from "react";
import { meld } from "../../../lib/game";
import type { Room } from "../types";
import { duration } from "../utils";
import { TileButton } from "./tile-button";

type Props = {
  room: Room;
  board: number[][];
  selected: number[];
  dragging: number[];
  dragTarget: string;
  loading: boolean;
  remaining: number | null;
  mine: boolean;
  interactive: boolean;
  changed: boolean;
  owner: boolean;
  me: Room["players"][number] | undefined;
  sandboxOpen: boolean;
  choose: (id: number) => void;
  move: (target: number | "rack" | "new") => void;
  act: (action: string, extra?: Record<string, unknown>) => Promise<unknown>;
  beginDrag: (id: number, e: PointerEvent<HTMLButtonElement>) => void;
  updateDrag: (e: PointerEvent<HTMLButtonElement>) => void;
  endDrag: (e: PointerEvent<HTMLButtonElement>) => void;
  finishDrag: (cancel?: boolean) => void;
};

export function GameBoard({
  room,
  board,
  selected,
  dragging,
  dragTarget,
  loading,
  remaining,
  mine,
  interactive,
  changed,
  owner,
  me,
  sandboxOpen,
  choose,
  move,
  act,
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
    <section className="game-table felt">
      <div className="table-heading">
        <div>
          <span className="eyebrow">ОБЩИЙ СТОЛ</span>
          <h2>
            {room.status === "finished"
              ? "Партия завершена"
              : mine
                ? "Ваш ход"
                : `Ходит ${room.players[room.turn].name}`}
          </h2>
        </div>
        <div className="table-timing">
          {room.status === "playing" && (
            <span
              className={`turn-clock ${remaining != null && remaining < 10000 ? "urgent" : ""}`}
            >
              {room.players[room.turn]?.bot
                ? "Бот думает…"
                : remaining == null
                  ? "Без времени"
                  : `На ход ${duration(remaining)}`}
            </span>
          )}
          <div className="pool">
            <Layers size={22} />
            <span>
              <strong>{room.poolCount}</strong>
              <small>в банке</small>
            </span>
          </div>
        </div>
      </div>

      {room.status === "finished" && (
        <div className="winner">
          <Trophy size={30} />
          <h2>
            {room.winner
              ? room.players.some((x) => x.id === room.winner)
                ? `${room.players.find((x) => x.id === room.winner)!.name} побеждает!`
                : "Партия завершена"
              : "Ничья!"}
          </h2>
          {owner && room.players.length > 1 ? (
            <button
              className="primary"
              disabled={loading}
              onClick={() => act("rematch")}
            >
              Ещё одну партию
            </button>
          ) : (
            <p>
              {room.players.length > 1
                ? "Создатель комнаты может начать новую партию."
                : "Для следующей партии создайте новое лобби."}
            </p>
          )}
        </div>
      )}

      <div
        className={`melds ${dragTarget === "new" ? "drag-over-new" : ""}`}
        data-table-drop
      >
        {board.map((row, i) => (
          <div
            className={`meld ${meld(row) ? "valid" : "invalid"} ${dragTarget === `meld:${i}` ? "drag-over" : ""}`}
            data-meld-index={i}
            key={i}
          >
            <div className="meld-tiles">{row.map(tileNode)}</div>
            {interactive && (
              <button
                className="add-to-set"
                aria-label={`Добавить выбранные фишки в комбинацию ${i + 1}`}
                disabled={
                  !selected.length ||
                  !!(
                    me?.requiresOpening &&
                    row.some((id) => !room.rack.includes(id))
                  )
                }
                onClick={() => move(i)}
              >
                <Plus size={17} />
              </button>
            )}
            <span className="meld-status">{meld(row) ? "✓" : "!"}</span>
          </div>
        ))}
        {!board.length && (
          <div className="empty-table">
            <Layers size={34} />
            <h3>
              {room.openingUnlocked
                ? "Можно выкладывать без порога 30"
                : "Стол ждёт первого выкладывания"}
            </h3>
            <p>
              {room.openingUnlocked
                ? "Соберите любую правильную комбинацию."
                : "Выложите комбинации минимум на 30 очков."}
              <br />
              Выберите фишки на подставке и создайте комбинацию.
            </p>
          </div>
        )}
      </div>

      {interactive && (
        <div className="table-controls">
          <button
            className="new-set"
            disabled={!selected.length || loading}
            onClick={() => move("new")}
          >
            <Plus size={18} /> Новая комбинация
            {selected.length > 0 && ` · ${selected.length}`}
          </button>
          <span>
            {selected.length
              ? "Можно добавить в комбинацию кнопкой +"
              : changed
                ? "Изменения увидят все после завершения хода"
                : "Нажимайте на фишки, чтобы выбрать их"}
          </span>
        </div>
      )}
    </section>
  );
}
