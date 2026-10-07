import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: "Rummy Club · Перерыв с коллегами",
    description:
        "Общий стол, любимая игра и коллеги рядом. Создайте комнату для партии в Rummy Club на 2–4 игроков.",
    icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
    children,
    modal,
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    return (
        <html lang="ru">
            <body>
                {children}
                {modal}
            </body>
        </html>
    );
}
