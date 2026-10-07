"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function LegalModal({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.back();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div
      className="legal-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) router.back();
      }}
    >
      <div
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Документ"
      >
        <button
          className="legal-modal-close"
          type="button"
          aria-label="Закрыть"
          onClick={() => router.back()}
        >
          <X size={20} />
        </button>
        <article className="legal-page legal-modal-page">{children}</article>
      </div>
    </div>
  );
}
