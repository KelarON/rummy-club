"use client";

import { Bot, Plus } from "lucide-react";
import type { Room } from "../types";

type Props = {
  room: Room;
};

export function PlayersList({ room }: Props) {
  return (
    <section className="players" aria-label="Игроки">
      {room.players.map((player, i) => (
        <div
          key={player.id}
          className={`player ${room.status === "playing" && room.turn === i ? "active" : ""}`}
        >
          <span className={`avatar av-${i}`}>
            {player.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="player-name">
            <strong>
              {player.name}
              {player.bot && (
                <small className="bot-badge">
                  <Bot size={13} /> бот
                </small>
              )}
              {player.id === room.me && <small>вы</small>}
            </strong>
            <span>
              {room.status === "lobby"
                ? player.bot
                  ? "Бот готов"
                  : player.id === room.ownerId
                    ? "Создатель комнаты"
                    : "Готов к игре"
                : room.status === "finished"
                  ? `${player.penalty} очков на руках`
                  : `${player.count} фишек · ${player.requiresOpening ? "выход от 30" : player.opened ? "открылся" : "без порога 30"}`}
            </span>
          </div>
          {room.status === "playing" && room.turn === i && (
            <span className="turn-pill">Ходит</span>
          )}
        </div>
      ))}
      {room.status === "lobby" &&
        Array.from({ length: 4 - room.players.length }, (_, i) => (
          <div className="player empty-player" key={i}>
            <span className="avatar">
              <Plus size={18} />
            </span>
            <span>Ждём коллегу</span>
          </div>
        ))}
    </section>
  );
}
