import { useSiteSettings } from "@/hooks/useData";
import { MessageCircle, Share2, Headset } from "lucide-react";
import { toast } from "sonner";

function normalizePhone(raw?: string) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export default function FloatingActions() {
  const { data: settings } = useSiteSettings();
  const s: any = settings || {};

  const groupEnabled = String(s.whatsapp_group_enabled ?? "true") !== "false";
  const groupLink = s.whatsapp_group_link as string | undefined;

  const supportEnabled = String(s.support_whatsapp_enabled ?? "true") !== "false";
  const supportPhone = normalizePhone(s.support_whatsapp);
  const supportUrl = supportPhone
    ? `https://wa.me/${supportPhone}?text=${encodeURIComponent("Olá! Preciso de atendimento.")}`
    : "";

  const handleShare = async () => {
    const url = window.location.href;
    const title = document.title || "Confira!";
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível compartilhar");
    }
  };

  const items: Array<{ key: string; node: JSX.Element }> = [];

  items.push({
    key: "share",
    node: (
      <button
        type="button"
        onClick={handleShare}
        aria-label="Compartilhar página"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)] hover:scale-105 transition-transform"
      >
        <Share2 className="h-5 w-5" />
      </button>
    ),
  });

  if (groupEnabled && groupLink) {
    items.push({
      key: "group",
      node: (
        <a
          href={groupLink}
          target="_blank"
          rel="noreferrer"
          aria-label="Entrar no grupo do WhatsApp"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_8px_24px_-4px_rgba(16,185,129,0.6)] hover:scale-105 transition-transform"
        >
          <MessageCircle className="h-6 w-6" fill="currentColor" />
        </a>
      ),
    });
  }

  if (supportEnabled && supportUrl) {
    items.push({
      key: "support",
      node: (
        <a
          href={supportUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Falar com o atendimento no WhatsApp"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_8px_24px_-4px_rgba(16,185,129,0.6)] hover:scale-105 transition-transform"
        >
          <Headset className="h-5 w-5" />
        </a>
      ),
    });
  }

  if (!items.length) return null;

  return (
    <div className="fixed right-3 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2.5">
      {items.map((i) => <div key={i.key}>{i.node}</div>)}
    </div>
  );
}