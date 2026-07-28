import { useSiteSettings } from "@/hooks/useData";
import { MessageCircle } from "lucide-react";

function normalizePhone(raw?: string) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export default function FloatingWhatsAppSupport() {
  const { data: settings } = useSiteSettings();
  const enabled = String((settings as any)?.support_whatsapp_enabled ?? "true") !== "false";
  const phone = normalizePhone((settings as any)?.support_whatsapp);
  if (!enabled || !phone) return null;

  const url = `https://wa.me/${phone}?text=${encodeURIComponent("Olá! Preciso de atendimento.")}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com o atendimento no WhatsApp"
      className="fixed bottom-20 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_8px_24px_-4px_rgba(16,185,129,0.6)] hover:scale-105 transition-transform"
    >
      <MessageCircle className="h-6 w-6" fill="currentColor" />
    </a>
  );
}