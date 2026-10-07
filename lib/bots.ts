import { tile, meld } from "./tiles";
import { chooseMelds } from "./solver";

// Only own tiles and the public table are inputs: bots cannot inspect hidden hands.
export function planBotMove(
    rack: number[],
    table: number[][],
    opening: boolean,
): number[][] | null {
    const board = table.map((r) => [...r]);
    let remaining = [...rack],
        played = false;
    if (!opening) {
        // Extend existing groups/runs; split long runs to use a second physical copy.
        for (let pass = 0; pass < rack.length; pass++) {
            let used: number | null = null;
            for (const id of remaining) {
                for (let i = 0; i < board.length; i++) {
                    const row = board[i],
                        extended = meld([...row, id]);
                    if (extended) {
                        board[i] = extended.order;
                        used = id;
                        break;
                    }
                    if (
                        row.length < 5 ||
                        row.some((t) => t >= 104) ||
                        !row.every((t) => tile(t).c === tile(row[0]).c)
                    )
                        continue;
                    const ordered = meld(row)!.order;
                    for (let cut = 2; cut <= ordered.length - 2; cut++) {
                        for (const side of [0, 1]) {
                            const a = ordered.slice(0, cut),
                                b = ordered.slice(cut);
                            (side === 0 ? a : b).push(id);
                            const left = meld(a),
                                right = meld(b);
                            if (left && right) {
                                board[i] = left.order;
                                board.push(right.order);
                                used = id;
                                break;
                            }
                        }
                        if (used != null) break;
                    }
                    if (used != null) break;
                }
                if (used != null) break;
            }
            if (used == null) break;
            remaining = remaining.filter((id) => id !== used);
            played = true;
        }
    }
    const fresh = chooseMelds(remaining, opening ? 30 : 0);
    if (fresh.length) {
        board.push(...fresh);
        played = true;
    }
    return played ? board : null;
}
