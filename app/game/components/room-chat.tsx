"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, ChevronDown, Smile, Send, Sticker } from "lucide-react";
import { EMOJIS, STICKERS, type ChatMessage } from "../../../lib/chat";

type Props = {
    code: string;
    me: string;
    messages: ChatMessage[];
    open: boolean;
    onOpen: (open: boolean) => void;
    onState: (state: unknown) => void;
};
export function RoomChat({ code, me, messages, open, onOpen, onState }: Props) {
    const [text, setText] = useState(""),
        [picker, setPicker] = useState<"emoji" | "sticker" | null>(null),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        [read, setRead] = useState<string | null>(null);
    const bottom = useRef<HTMLDivElement>(null),
        input = useRef<HTMLInputElement>(null),
        pending = useRef<{
            messageId: string;
            kind: "text" | "sticker";
            content: string;
        } | null>(null),
        sending = useRef(false);
    const last = messages.at(-1)?.id ?? null;
    useEffect(() => {
        setRead(last);
        setText("");
        setPicker(null);
        setError("");
        pending.current = null;
    }, [code]);
    useEffect(() => {
        if (open) {
            setRead(last);
            bottom.current?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
            });
        }
    }, [open, last]);
    const position = read ? messages.findIndex((m) => m.id === read) : -1;
    const unread = messages
        .slice(position + 1)
        .filter((m) => m.authorId !== me).length;
    async function send(kind: "text" | "sticker", content: string) {
        if (sending.current || !content.trim()) return;
        sending.current = true;
        setBusy(true);
        setError("");
        const body =
            pending.current?.kind === kind &&
            pending.current.content === content
                ? pending.current
                : { messageId: crypto.randomUUID(), kind, content };
        pending.current = body;
        try {
            const response = await fetch("/api/game", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "chat", code, ...body }),
            });
            const state = (await response.json()) as { error?: string };
            if (!response.ok) {
                if (response.status < 500) pending.current = null;
                throw Error(state.error || "Не удалось отправить сообщение.");
            }
            onState(state);
            pending.current = null;
            if (kind === "text") setText("");
            setPicker(null);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            sending.current = false;
            setBusy(false);
        }
    }
    if (!open)
        return (
            <button
                className="chat-launcher secondary"
                onClick={() => onOpen(true)}
                aria-label={`Открыть чат${unread ? `, новых сообщений: ${unread}` : ""}`}
            >
                <MessageCircle size={19} /> Чат
                {unread > 0 && <b className="unread-count">{unread}</b>}
            </button>
        );
    return (
        <aside className="room-chat" aria-label="Чат комнаты">
            <div className="chat-heading">
                <h2>
                    <MessageCircle size={19} /> Чат комнаты
                </h2>
                <button
                    className="iconbtn"
                    aria-label="Свернуть чат"
                    onClick={() => onOpen(false)}
                >
                    <ChevronDown size={20} />
                </button>
            </div>
            <div
                className="chat-history"
                role="log"
                aria-live="polite"
                aria-relevant="additions text"
            >
                {!messages.length && (
                    <p className="chat-empty">
                        Здесь можно обсудить ход, пошутить или отправить стикер.
                    </p>
                )}
                {messages.map((m) => {
                    const sticker =
                        m.kind === "sticker"
                            ? STICKERS.find((s) => s.id === m.content)
                            : null;
                    return (
                        <article
                            key={m.id}
                            className={`chat-message ${m.authorId === me ? "own" : ""}`}
                        >
                            <div className="chat-author">
                                <strong>{m.name}</strong>
                                <time
                                    dateTime={new Date(
                                        m.createdAt,
                                    ).toISOString()}
                                >
                                    {new Date(m.createdAt).toLocaleTimeString(
                                        "ru-RU",
                                        { hour: "2-digit", minute: "2-digit" },
                                    )}
                                </time>
                            </div>
                            {sticker ? (
                                <div
                                    className={`sticker-card tone-${sticker.tone}`}
                                    aria-label={sticker.label}
                                >
                                    <span>{sticker.emoji}</span>
                                    <b>{sticker.label}</b>
                                </div>
                            ) : (
                                <p>{m.content}</p>
                            )}
                        </article>
                    );
                })}
                <div ref={bottom} />
            </div>
            {picker && (
                <div
                    className={`chat-picker ${picker === "emoji" ? "emoji-picker" : "sticker-picker"}`}
                    aria-label={picker === "emoji" ? "Смайлики" : "Стикеры"}
                >
                    {picker === "emoji"
                        ? EMOJIS.map((e) => (
                              <button
                                  key={e}
                                  type="button"
                                  aria-label={`Добавить ${e}`}
                                  onClick={() => {
                                      setText((t) => (t + e).slice(0, 500));
                                      input.current?.focus();
                                  }}
                              >
                                  {e}
                              </button>
                          ))
                        : STICKERS.map((s) => (
                              <button
                                  key={s.id}
                                  type="button"
                                  className={`sticker-choice tone-${s.tone}`}
                                  disabled={busy}
                                  aria-label={`Отправить стикер «${s.label}»`}
                                  onClick={() => void send("sticker", s.id)}
                              >
                                  <span>{s.emoji}</span>
                                  <small>{s.label}</small>
                              </button>
                          ))}
                </div>
            )}
            {error && (
                <p className="chat-error" role="alert">
                    {error}
                </p>
            )}
            <form
                className="chat-compose"
                onSubmit={(e) => {
                    e.preventDefault();
                    void send("text", text);
                }}
            >
                <div className="chat-tools">
                    <button
                        type="button"
                        className="iconbtn"
                        aria-label="Смайлики"
                        aria-expanded={picker === "emoji"}
                        onClick={() =>
                            setPicker((p) => (p === "emoji" ? null : "emoji"))
                        }
                    >
                        <Smile size={20} />
                    </button>
                    <button
                        type="button"
                        className="iconbtn"
                        aria-label="Стикеры"
                        aria-expanded={picker === "sticker"}
                        onClick={() =>
                            setPicker((p) =>
                                p === "sticker" ? null : "sticker",
                            )
                        }
                    >
                        <Sticker size={20} />
                    </button>
                    <small>{text.length}/500</small>
                </div>
                <div className="chat-input-row">
                    <input
                        ref={input}
                        aria-label="Сообщение в чат"
                        maxLength={500}
                        placeholder="Сообщение коллегам…"
                        value={text}
                        disabled={busy}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="primary"
                        aria-label="Отправить"
                        disabled={busy || !text.trim()}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </aside>
    );
}
