"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function LegalModal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="legal-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
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
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <article className="legal-page legal-modal-page">{children}</article>
      </div>
    </div>
  );
}
