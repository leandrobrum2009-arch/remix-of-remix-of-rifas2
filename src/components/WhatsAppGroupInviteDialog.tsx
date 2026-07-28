import { useEffect, useState } from "react";
import { useSiteSettings } from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";

const STORAGE_KEY = "wa_group_invite_shown_count";
const JOINED_KEY = "wa_group_invite_joined";
const MAX_SHOWS = 2;

export default function WhatsAppGroupInviteDialog() {
  const { data: settings } = useSiteSettings();
  const enabled = String((settings as any)?.whatsapp_group_enabled ?? "true") !== "false";
  const link = (settings as any)?.whatsapp_group_link as string | undefined;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled || !link) return;
    if (localStorage.getItem(JOINED_KEY) === "1") return;
    const shown = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    if (shown >= MAX_SHOWS) return;

    const t = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(STORAGE_KEY, String(shown + 1));
    }, 6000);
    return () => clearTimeout(t);
  }, [enabled, link]);

  const handleJoin = () => {
    localStorage.setItem(JOINED_KEY, "1");
    setOpen(false);
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  };

  if (!enabled || !link) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <MessageCircle className="h-7 w-7" fill="currentColor" />
          </div>
          <DialogTitle className="text-center text-lg font-black uppercase tracking-tight">
            Entre no nosso Grupo do WhatsApp
          </DialogTitle>
          <DialogDescription className="text-center">
            Receba avisos de novas ações, sorteios ao vivo e promoções exclusivas em primeira mão.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleJoin} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs">
            <MessageCircle className="h-4 w-4 mr-2" fill="currentColor" />
            Participar do Grupo
          </Button>
          <button
            onClick={() => setOpen(false)}
            className="text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1"
          >
            <X className="h-3 w-3" /> Agora não
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}