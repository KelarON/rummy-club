import type { Metadata } from "next";
import { LegalPage } from "@/app/legal/legal-page";
import { TermsContent } from "@/app/legal/terms-content";

export const metadata: Metadata = {
  title: "Условия использования · Rummy Клуб",
  description:
    "Условия использования сервиса «Rummy Клуб · Перерыв на партию».",
};

export default function TermsPage() {
  return (
    <LegalPage>
      <TermsContent />
    </LegalPage>
  );
}
