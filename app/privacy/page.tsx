import type { Metadata } from "next";
import { LegalPage } from "@/app/legal/legal-page";
import { PrivacyContent } from "@/app/legal/privacy-content";

export const metadata: Metadata = {
  title: "Политика конфиденциальности · Rummy Клуб",
  description:
    "Политика конфиденциальности сервиса «Rummy Клуб · Перерыв на партию».",
};

export default function PrivacyPage() {
  return (
    <LegalPage>
      <PrivacyContent />
    </LegalPage>
  );
}
