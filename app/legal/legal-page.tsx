import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ children }: { children: ReactNode }) {
  return (
    <main className="app">
      <article className="legal-page">
        <Link className="legal-back" href="/" prefetch={false}>
          ← Вернуться к игре
        </Link>
        {children}
      </article>
    </main>
  );
}
