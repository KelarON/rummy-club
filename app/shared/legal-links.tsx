"use client";

import { useCallback, useEffect, useState } from "react";
import { LegalModal } from "./legal-modal";
import { PrivacyContent } from "@/app/legal/privacy-content";
import { TermsContent } from "@/app/legal/terms-content";

type LegalDocument = "privacy" | "terms";

const paths: Record<LegalDocument, string> = {
  privacy: "/privacy",
  terms: "/terms",
};

export function LegalLinks() {
  const [document, setDocument] = useState<LegalDocument | null>(null);

  const open = useCallback((next: LegalDocument) => {
    const path = paths[next];
    const method = document === null ? "pushState" : "replaceState";
    window.history[method]({ legalModal: next }, "", path);
    setDocument(next);
  }, [document]);

  const close = useCallback(() => {
    window.history.back();
  }, []);

  useEffect(() => {
    const onPopState = () => setDocument(null);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <>
      <span className="footer-links">
        <a
          href="/privacy"
          onClick={(event) => {
            if (event.defaultPrevented) return;
            event.preventDefault();
            open("privacy");
          }}
        >
          Конфиденциальность
        </a>
        <a
          href="/terms"
          onClick={(event) => {
            if (event.defaultPrevented) return;
            event.preventDefault();
            open("terms");
          }}
        >
          Условия
        </a>
      </span>
      {document && (
        <LegalModal onClose={close}>
          {document === "privacy" ? <PrivacyContent /> : <TermsContent />}
        </LegalModal>
      )}
    </>
  );
}
