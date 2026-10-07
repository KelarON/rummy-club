export const STICKERS = [
    { id: "coffee", emoji: "☕", label: "Кофе и комбинации", tone: "green" },
    { id: "thinking", emoji: "🤔", label: "Сейчас придумаю", tone: "blue" },
    { id: "bravo", emoji: "👏", label: "Красивый ход!", tone: "gold" },
    { id: "lucky", emoji: "🍀", label: "Вот это удача", tone: "green" },
    { id: "oops", emoji: "🙈", label: "Ой, всё", tone: "pink" },
    { id: "fire", emoji: "🔥", label: "Стол в огне", tone: "gold" },
    { id: "cat", emoji: "😼", label: "У меня есть план", tone: "blue" },
    { id: "win", emoji: "🏆", label: "Ещё одну?", tone: "pink" },
] as const;
export const EMOJIS = [
    "😀",
    "😂",
    "😊",
    "😎",
    "🤔",
    "🙈",
    "😅",
    "😭",
    "😴",
    "😼",
    "👍",
    "👏",
    "❤️",
    "🔥",
    "☕",
    "🍀",
    "🎲",
    "🏆",
];
export type ChatMessage = {
    id: string;
    authorId: string;
    name: string;
    kind: "text" | "sticker";
    content: string;
    createdAt: number;
};
export function chatMessage(
    input: { messageId?: unknown; kind?: unknown; content?: unknown },
    author: { id: string; name: string },
    messages: ChatMessage[],
    now = Date.now(),
): ChatMessage | null {
    if (
        typeof input.messageId !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(input.messageId)
    )
        throw Error("Некорректное сообщение.");
    const previous = messages.find((m) => m.id === input.messageId);
    if (previous) {
        if (previous.authorId !== author.id)
            throw Error("Некорректный идентификатор сообщения.");
        return null;
    }
    const kind = input.kind;
    if (kind !== "text" && kind !== "sticker")
        throw Error("Неизвестный тип сообщения.");
    if (typeof input.content !== "string") throw Error("Введите сообщение.");
    const content = input.content.trim();
    if (!content || content.length > 500)
        throw Error("Сообщение должно содержать от 1 до 500 символов.");
    if (kind === "sticker" && !STICKERS.some((s) => s.id === content))
        throw Error("Неизвестный стикер.");
    const recent = messages.filter(
        (m) => m.authorId === author.id && now - m.createdAt < 10000,
    );
    if (recent.length >= 8 || recent.some((m) => now - m.createdAt < 700))
        throw Error("Слишком быстро. Подождите немного.");
    return {
        id: input.messageId,
        authorId: author.id,
        name: author.name,
        kind,
        content,
        createdAt: now,
    };
}
