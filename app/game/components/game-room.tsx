"use client";

import { Coffee, Copy } from "lucide-react";
import type { PointerEvent } from "react";
import { RoomChat } from "./room-chat";
import type { SortMode } from "../../../lib/game";
import type { Room } from "../types";
import { randomLabels, timeLabel } from "../utils";
import { GameBoard } from "./game-board";
import { PlayersList } from "./players-list";
import { RackPanel } from "./rack-panel";
import { RoomHeader } from "./room-header";

type Props = {
  room: Room;
  board: number[][];
  rack: number[];
  selected: number[];
  dragging: number[];
  dragTarget: string;
  loading: boolean;
  online: boolean;
  clock: number;
  remaining: number | null;
  mine: boolean;
  interactive: boolean;
  owner: boolean;
  changed: boolean;
  newPoints: number;
  sortMode: SortMode;
  chatOpen: boolean;
  sandboxOpen: boolean;
  share: () => void;
  act: (action: string, extra?: Record<string, unknown>) => Promise<unknown>;
  move: (target: number | "rack" | "new") => void;
  reset: () => void;
  changeSort: (mode: SortMode) => void;
  setSandboxOpen: (open: boolean) => void;
  toggleChat: (open: boolean) => void;
  accept: (room: Room) => void;
  choose: (id: number) => void;
  beginDrag: (id: number, e: PointerEvent<HTMLButtonElement>) => void;
  updateDrag: (e: PointerEvent<HTMLButtonElement>) => void;
  endDrag: (e: PointerEvent<HTMLButtonElement>) => void;
  finishDrag: (cancel?: boolean) => void;
};

export function GameRoom(p: Props) {
  const me = p.room.players.find((x) => x.id === p.room.me);

  return (
    <div className={`room-layout ${p.chatOpen ? "with-chat" : ""}`}>
      <div className="room-content">
        <RoomHeader
          room={p.room}
          clock={p.clock}
          online={p.online}
          share={p.share}
        />

        <PlayersList room={p.room} />

        {p.room.status === "lobby" ? (
          <section className="lobby felt">
            <div className="lobby-icon">
              <Coffee size={34} />
            </div>
            <span className="eyebrow">ВСТРЕЧА БЕЗ ПОВЕСТКИ</span>
            <h1>
              {p.room.players.length < 2
                ? "Зовите коллег за стол"
                : "Все на месте?"}
            </h1>
            <p>
              Отправьте ссылку в ваш рабочий чат.
              <br />
              Для партии нужны от 2 до 4 участников, включая ботов.
            </p>
            <div className="lobby-rules">
              <span>
                {p.room.isPublic ? "Открытое лобби" : "По приглашению"}
              </span>
              <span>
                {p.room.openingRule === "shared"
                  ? "Упрощённый старт: один выход на всех"
                  : "Обычный старт: 30 очков у каждого"}
              </span>
              <span>Ход: {timeLabel(p.room.turnSeconds ?? 0)}</span>
              <span>
                Раздача: {randomLabels[p.room.randomMode ?? "classic"]}
              </span>
              <span>
                Ботов: {p.room.players.filter((x) => x.bot).length}
              </span>
              <span>
                {p.room.replaceLeavers
                  ? "Вышедших заменит бот"
                  : "Без замены вышедших"}
              </span>
            </div>
            <div className="lobby-actions">
              <button className="secondary" onClick={p.share}>
                <Copy size={17} /> Скопировать приглашение
              </button>
              {p.owner ? (
                <button
                  className="primary"
                  onClick={() => p.act("start")}
                  disabled={p.loading || p.room.players.length < 2}
                >
                  Начать партию · {p.room.players.length}/4
                </button>
              ) : (
                <span className="waiting-note">
                  Создатель комнаты начнёт партию
                </span>
              )}
            </div>
            <small>
              Лобби закроется после часа без активности или выхода всех игроков.
            </small>
          </section>
        ) : (
          <>
            <GameBoard
              room={p.room}
              board={p.board}
              selected={p.selected}
              dragging={p.dragging}
              dragTarget={p.dragTarget}
              loading={p.loading}
              remaining={p.remaining}
              mine={p.mine}
              interactive={p.interactive}
              changed={p.changed}
              owner={p.owner}
              me={me}
              sandboxOpen={p.sandboxOpen}
              choose={p.choose}
              move={p.move}
              act={p.act}
              beginDrag={p.beginDrag}
              updateDrag={p.updateDrag}
              endDrag={p.endDrag}
              finishDrag={p.finishDrag}
            />

            <RackPanel
              room={p.room}
              board={p.board}
              rack={p.rack}
              selected={p.selected}
              dragging={p.dragging}
              dragTarget={p.dragTarget}
              loading={p.loading}
              mine={p.mine}
              interactive={p.interactive}
              changed={p.changed}
              newPoints={p.newPoints}
              sortMode={p.sortMode}
              sandboxOpen={p.sandboxOpen}
              me={me}
              move={p.move}
              reset={p.reset}
              changeSort={p.changeSort}
              setSandboxOpen={p.setSandboxOpen}
              act={p.act}
              choose={p.choose}
              beginDrag={p.beginDrag}
              updateDrag={p.updateDrag}
              endDrag={p.endDrag}
              finishDrag={p.finishDrag}
            />

            <div className="activity">
              <span className="eyebrow">ЗА СТОЛОМ</span>
              <span aria-live="polite">{p.room.log[0]}</span>
            </div>
          </>
        )}
      </div>

      <RoomChat
        key={p.room.code}
        code={p.room.code}
        me={p.room.me}
        messages={p.room.chat ?? []}
        open={p.chatOpen}
        onOpen={p.toggleChat}
        onState={(room) => p.accept(room as Room)}
      />
    </div>
  );
}
