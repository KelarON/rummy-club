"use client";

import { Copy, Link as LinkIcon } from "lucide-react";
import type { Room } from "../types";
import { duration } from "../utils";

type Props = {
  room: Room;
  clock: number;
  online: boolean;
  share: () => void;
};

export function RoomHeader({ room, clock, online, share }: Props) {
  return (
    <div className="room-bar">
      <div>
        <span className="eyebrow">КОМНАТА</span>
        <button className="room-code" onClick={share}>
          {room.code} <Copy size={16} />
        </button>
      </div>
      <div className="room-meta">
        {room.startedAt != null && (
          <span className="game-duration">
            Партия{" "}
            <strong>
              {duration((room.endedAt ?? clock) - room.startedAt)}
            </strong>
          </span>
        )}
        <span className={online ? "connection" : "connection offline"}>
          {online ? "На связи" : "Переподключаемся…"}
        </span>
        <button className="secondary compact" onClick={share}>
          <LinkIcon size={16} /> Пригласить
        </button>
      </div>
    </div>
  );
}
