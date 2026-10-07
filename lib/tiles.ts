export type Tile = { id: number; n: number; c: number };
export const tile = (id: number): Tile => ({
    id,
    n: id >= 104 ? 0 : (id % 13) + 1,
    c: id >= 104 ? 4 : Math.floor(id / 13) % 4,
});
export function meld(ids: number[]) {
    if (ids.length < 3 || ids.length > 13 || new Set(ids).size !== ids.length)
        return null;
    const ts = ids.map(tile),
        real = ts.filter((t) => t.n);
    if (!real.length) return null;
    if (
        ids.length <= 4 &&
        real.every((t) => t.n === real[0].n) &&
        new Set(real.map((t) => t.c)).size === real.length
    )
        return {
            points: real[0].n * ids.length,
            order: [...ids].sort((a, b) => tile(a).c - tile(b).c),
        };
    if (
        !real.every((t) => t.c === real[0].c) ||
        new Set(real.map((t) => t.n)).size !== real.length
    )
        return null;
    const sorted = real.sort((a, b) => a.n - b.n),
        min = sorted[0].n,
        max = sorted.at(-1)!.n;
    if (max - min + 1 > ids.length) return null;
    const start = Math.max(1, Math.min(min, 14 - ids.length));
    if (start + ids.length - 1 < max) return null;
    const jokers = ts.filter((t) => !t.n).map((t) => t.id),
        order = [];
    for (let n = start; n < start + ids.length; n++)
        order.push(sorted.find((t) => t.n === n)?.id ?? jokers.shift()!);
    return { points: ((2 * start + ids.length - 1) * ids.length) / 2, order };
}
