import { useRef, useState, type PointerEvent } from "react";
import { meld, sortRack } from "../../../lib/game";
import type { Room } from "../types";

type TileOffset = { id: number; x: number; y: number };

type Args = {
  room: Room | null;
  board: number[][];
  rack: number[];
  selected: number[];
  interactive: boolean;
  loading: boolean;
  sortMode: "color" | "number";
  suppressClickRef: { current: boolean };
  setBoard: (value: number[][]) => void;
  setRack: (value: number[]) => void;
  setSelected: (value: number[]) => void;
  setError: (value: string) => void;
};

export function useTileDrag({
  room,
  board,
  rack,
  selected,
  interactive,
  loading,
  sortMode,
  suppressClickRef,
  setBoard,
  setRack,
  setSelected,
  setError,
}: Args) {
  const [dragging, setDragging] = useState<number[]>([]),
    [dragTarget, setDragTarget] = useState(""),
    [dragPos, setDragPos] = useState({ x: 0, y: 0 }),
    [dragOffsets, setDragOffsets] = useState<TileOffset[]>([]);
  const dragRef = useRef<{
    ids: number[];
    primaryId: number | null;
    pointerId: number;
    moved: boolean;
    target: string;
    startX: number;
    startY: number;
    offsets: TileOffset[];
  }>({
    ids: [],
    primaryId: null,
    pointerId: -1,
    moved: false,
    target: "",
    startX: 0,
    startY: 0,
    offsets: [],
  });

  const dropTarget = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const meldEl = el?.closest<HTMLElement>("[data-meld-index]");
    if (meldEl) return `meld:${meldEl.dataset.meldIndex}`;
    if (el?.closest("[data-rack-return-drop]")) return "rack";
    if (el?.closest("[data-rack-drop]")) return "rack";
    if (el?.closest("[data-table-drop]")) return "new";
    return "";
  };

  const finishDrag = (cancel = false) => {
    const d = dragRef.current;
    if (!d.ids.length) return;
    if (d.moved) suppressClickRef.current = true;
    if (!cancel && d.moved && d.target) {
      const target =
        d.target === "rack"
          ? "rack"
          : d.target === "new"
            ? "new"
            : Number(d.target.slice(5));
      if (target === "rack" && d.ids.some((id) => !room!.rack.includes(id))) {
        setError("Фишки с общего стола нельзя забирать себе.");
      } else {
        let rows = board.map((r) => r.filter((id) => !d.ids.includes(id)));
        const hand = rack.filter((id) => !d.ids.includes(id));
        if (target === "rack") hand.push(...d.ids);
        else if (target === "new") rows.push([...d.ids]);
        else if (Number.isInteger(target) && target >= 0 && target < rows.length)
          rows[target].push(...d.ids);
        rows = rows.filter((r) => r.length).map((r) => meld(r)?.order ?? r);
        setBoard(rows);
        setRack(sortRack(hand, sortMode));
        setSelected([]);
        setError("");
      }
    }
    dragRef.current = {
      ids: [],
      primaryId: null,
      pointerId: -1,
      moved: false,
      target: "",
      startX: 0,
      startY: 0,
      offsets: [],
    };
    setDragging([]);
    setDragTarget("");
    setDragOffsets([]);
  };

  const beginDrag = (id: number, e: PointerEvent<HTMLButtonElement>) => {
    suppressClickRef.current = false;
    if (!interactive || loading) return;
    if (selected.length > 0 && !selected.includes(id)) return;
    const ids = [...selected];
    if (!ids.length) ids.push(id);
    const requiresOpening = room?.players.find((p) => p.id === room.me)?.requiresOpening;
    if (requiresOpening && ids.some((x) => !room!.rack.includes(x))) return;
    const offsets = ids.map((tileId) => {
      const el = document.querySelector<HTMLElement>(`[data-tile-id="${tileId}"]`);
      const rect = el?.getBoundingClientRect();
      return {
        id: tileId,
        x: (rect?.left ?? e.clientX) - e.clientX,
        y: (rect?.top ?? e.clientY) - e.clientY,
      };
    });
    dragRef.current = {
      ids,
      primaryId: id,
      pointerId: e.pointerId,
      moved: false,
      target: "",
      startX: e.clientX,
      startY: e.clientY,
      offsets,
    };
    setDragOffsets(offsets);
    setDragPos({ x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const groupedOffsets = () => {
    const d = dragRef.current;
    const primary = d.primaryId;
    const primaryOffset = d.offsets.find((item) => item.id === primary);
    const primaryEl = document.querySelector<HTMLElement>(`[data-tile-id="${primary}"]`);
    if (!primaryOffset || !primaryEl) return d.offsets;
    const step = primaryEl.getBoundingClientRect().width + 5;
    const others = d.offsets.filter((item) => item.id !== primary);
    const left = others
      .filter((item) => item.x < primaryOffset.x)
      .sort((a, b) => a.x - b.x);
    const right = others
      .filter((item) => item.x > primaryOffset.x)
      .sort((a, b) => a.x - b.x);
    return [
      { id: primary!, x: primaryOffset.x, y: primaryOffset.y },
      ...left.map((item, index) => ({
        id: item.id,
        x: primaryOffset.x - step * (left.length - index),
        y: primaryOffset.y,
      })),
      ...right.map((item, index) => ({
        id: item.id,
        x: primaryOffset.x + step * (index + 1),
        y: primaryOffset.y,
      })),
    ];
  };

  const updateDrag = (e: PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (d.pointerId !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5) {
      d.moved = true;
      const offsets = groupedOffsets();
      d.offsets = offsets;
      setDragOffsets(offsets);
      setDragging([...d.ids]);
    }
    if (d.moved) setDragPos({ x: e.clientX, y: e.clientY });
    const target = dropTarget(e.clientX, e.clientY);
    if (target !== d.target) {
      d.target = target;
      setDragTarget(target);
    }
  };

  const endDrag = (e: PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (d.pointerId === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      finishDrag(false);
    }
  };

  return {
    dragging,
    dragTarget,
    dragPos,
    dragOffsets,
    beginDrag,
    updateDrag,
    endDrag,
    finishDrag,
  };
}
