"use client";

import type { PointerEvent } from "react";
import { tile } from "../../../lib/game";

const colors = ["Красная", "Синяя", "Жёлтая", "Чёрная", "Джокер"];
const symbols = ["◆", "●", "▲", "■", "✦"];

type TileButtonProps = {
  id: number;
  decor?: boolean;
  selected?: boolean;
  dragging?: boolean;
  locked?: boolean;
  newlyDrawn?: boolean;
  disabled?: boolean;
  onChoose?: (id: number) => void;
  onPointerDown?: (id: number, event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: () => void;
};

export function TileButton({
  id,
  decor = false,
  selected = false,
  dragging = false,
  locked = false,
  newlyDrawn = false,
  disabled = false,
  onChoose,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: TileButtonProps) {
  const t = tile(id);
  return (
    <button
      data-tile-id={id}
      type="button"
      className={`tile color-${t.c} ${selected && !decor ? "selected" : ""} ${dragging && !decor ? "dragging" : ""} ${decor ? "decor" : ""} ${locked && !decor ? "draft-locked" : ""} ${newlyDrawn && !decor ? "newly-drawn" : ""}`}
      aria-label={
        (t.n ? `${colors[t.c]} ${t.n}` : "Джокер") +
        (newlyDrawn && !decor ? " — новая фишка" : "")
      }
      aria-pressed={!decor && selected}
      onClick={() => !decor && onChoose?.(id)}
      onPointerDown={(event) => !decor && onPointerDown?.(id, event)}
      onPointerMove={(event) => !decor && onPointerMove?.(event)}
      onPointerUp={(event) => !decor && onPointerUp?.(event)}
      onPointerCancel={() => !decor && onPointerCancel?.()}
      disabled={decor || disabled}
    >
      <span>{t.n || "✦"}</span>
      <small>{symbols[t.c]}</small>
      {!decor && newlyDrawn && <b className="new-tile-badge">новая</b>}
    </button>
  );
}

export function TilePreview({
  id,
  left,
  top,
  fromRack,
  overTable,
}: {
  id: number;
  left: number;
  top: number;
  fromRack: boolean;
  overTable: boolean;
}) {
  const t = tile(id);
  return (
    <button
      type="button"
      className={`tile drag-preview-tile selected ${fromRack ? "rack-preview-tile" : ""} ${fromRack && overTable ? "drag-preview-on-table" : ""} color-${t.c}`}
      style={{ left, top }}
      tabIndex={-1}
      aria-hidden="true"
    >
      <span>{t.n || "✦"}</span>
      <small>{symbols[t.c]}</small>
    </button>
  );
}
