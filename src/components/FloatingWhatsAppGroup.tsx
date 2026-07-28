import { useSiteSettings } from "@/hooks/useData";
import { MessageCircle } from "lucide-react";

export default function FloatingWhatsAppGroup() {
  const { data: settings } = useSiteSettings();
  const enabled = String(settings?.whatsapp_group_enabled ?? "true") !== "false";
  const link = settings?.whatsapp_group_link as string | undefined;
  if (!enabled || !link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      aria-label="Entrar no grupo do WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-white shadow-[0_8px_24px_-4px_rgba(16,185,129,0.6)] hover:scale-105 transition-transform"
    >
      <MessageCircle className="h-5 w-5" fill="currentColor" />
      <span className="text-[11px] font-black uppercase tracking-widest hidden sm:inline">
        Grupo WhatsApp
      </span>
    </a>
  );
}