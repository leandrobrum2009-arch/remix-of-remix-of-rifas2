import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Upload, Gift, Eye } from "lucide-react";
import { compressImage } from "@/lib/image-upload";

interface GiftPrize {
  id?: string;
  ticket_number: string;
  prize_type: "pix" | "item";
  prize_value_cents: number | null;
  prize_title: string;
  prize_image_url: string | null;
}

interface Props {
  campaignId: string;
  totalTickets: number;
  giftModeEnabled: boolean;
  giftRevealMode: "on_draw" | "on_sold_out";
  giftResultsRevealed: boolean;
  onChangeSetting: (patch: {
    gift_mode_enabled?: boolean;
    gift_reveal_mode?: "on_draw" | "on_sold_out";
  }) => void;
}

export default function GiftPrizesManager({
  campaignId,
  totalTickets,
  giftModeEnabled,
  giftRevealMode,
  giftResultsRevealed,
  onChangeSetting,
}: Props) {
  const { toast } = useToast();
  const [prizes, setPrizes] = useState<GiftPrize[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [revealing, setRevealing] = useState(false);

  const padLen = String(Math.max(1, totalTickets - 1)).length;

  useEffect(() => {
    if (campaignId) load();
     
  }, [campaignId]);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("campaign_gift_prizes")
      .select("id, ticket_number, prize_type, prize_value_cents, prize_title, prize_image_url")
      .eq("campaign_id", campaignId)
      .order("ticket_number", { ascending: true });
    if (error) toast({ title: "Erro ao carregar prêmios", description: error.message, variant: "destructive" });
    else setPrizes((data as GiftPrize[]) ?? []);
    setLoading(false);
  }

  function addRow() {
    setPrizes((p) => [
      ...p,
      {
        ticket_number: "".padStart(padLen, "0"),
        prize_type: "pix",
        prize_value_cents: 5000,
        prize_title: "R$ 50 no PIX",
        prize_image_url: null,
      },
    ]);
  }

  function updateRow(i: number, patch: Partial<GiftPrize>) {
    setPrizes((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function removeRow(i: number) {
    const row = prizes[i];
    if (row.id) {
      const { error } = await (supabase as any)
        .from("campaign_gift_prizes")
        .delete()
        .eq("id", row.id);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    setPrizes((p) => p.filter((_, idx) => idx !== i));
  }

  async function handleImageUpload(i: number, file: File) {
    setUploadingIdx(i);
    try {
      const compressed = await compressImage(file);
      const ext = compressed.name.split(".").pop() || "jpg";
      const path = `gift-prizes/${campaignId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("campaigns").upload(path, compressed);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("campaigns").getPublicUrl(path);
      updateRow(i, { prize_image_url: data.publicUrl });
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally {
      setUploadingIdx(null);
    }
  }

  async function saveAll() {
    setLoading(true);
    try {
      // Validate numbers unique
      const nums = new Set<string>();
      for (const p of prizes) {
        const n = p.ticket_number.trim();
        if (!n) throw new Error("Todos os prêmios precisam de um número.");
        if (nums.has(n)) throw new Error(`Número duplicado: ${n}`);
        nums.add(n);
        if (!p.prize_title.trim()) throw new Error(`Prêmio do número ${n} precisa de um título.`);
      }

      const payload = prizes.map((p) => ({
        ...(p.id ? { id: p.id } : {}),
        campaign_id: campaignId,
        ticket_number: p.ticket_number.padStart(padLen, "0"),
        prize_type: p.prize_type,
        prize_value_cents: p.prize_value_cents,
        prize_title: p.prize_title,
        prize_image_url: p.prize_image_url,
      }));

      const { error } = await (supabase as any)
        .from("campaign_gift_prizes")
        .upsert(payload, { onConflict: "campaign_id,ticket_number" });
      if (error) throw error;

      toast({ title: "Prêmios salvos!", description: `${payload.length} prêmio(s) atualizado(s).` });
      await load();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function revealResults() {
    if (!confirm("Revelar os resultados agora? Essa ação é irreversível e mostrará os prêmios publicamente.")) return;
    setRevealing(true);
    try {
      const { error } = await (supabase as any).rpc("reveal_gift_results", { p_campaign_id: campaignId });
      if (error) throw error;
      toast({ title: "Resultados revelados!", description: "Os prêmios agora estão públicos." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setRevealing(false);
    }
  }

  return (
    <Card className="p-6 rounded-2xl border-border shadow-sm space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <Label className="text-base font-bold">Presente Premiado</Label>
            <p className="text-xs text-muted-foreground">Substitui a grade numérica por caixas-surpresa. Os prêmios só são revelados no final.</p>
          </div>
        </div>
        <Switch
          checked={giftModeEnabled}
          onCheckedChange={(v) => onChangeSetting({ gift_mode_enabled: v })}
        />
      </div>

      {giftModeEnabled && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Quando revelar os prêmios</Label>
              <Select
                value={giftRevealMode}
                onValueChange={(v) => onChangeSetting({ gift_reveal_mode: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_draw">No dia do sorteio</SelectItem>
                  <SelectItem value="on_sold_out">Ao esgotar / botão manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                onClick={revealResults}
                disabled={revealing || giftResultsRevealed}
                className="w-full h-11 rounded-xl gap-2"
              >
                {revealing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                {giftResultsRevealed ? "Resultados já revelados" : "Revelar resultados agora"}
              </Button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold">Números Premiados ({prizes.length})</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
                <Button size="sm" onClick={saveAll} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Salvar prêmios
                </Button>
              </div>
            </div>

            {prizes.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-xl">
                Nenhum número premiado ainda. Clique em "Adicionar" para criar o primeiro.
              </p>
            )}

            <div className="space-y-3">
              {prizes.map((p, i) => (
                <div key={p.id ?? i} className="grid grid-cols-1 md:grid-cols-[100px_120px_1fr_150px_100px_40px] gap-3 items-end p-4 rounded-xl bg-secondary/40 border">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Número</Label>
                    <Input
                      value={p.ticket_number}
                      onChange={(e) => updateRow(i, { ticket_number: e.target.value })}
                      placeholder={"".padStart(padLen, "0")}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo</Label>
                    <Select value={p.prize_type} onValueChange={(v) => updateRow(i, { prize_type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="item">Item</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Título do prêmio</Label>
                    <Input
                      value={p.prize_title}
                      onChange={(e) => updateRow(i, { prize_title: e.target.value })}
                      placeholder={p.prize_type === "pix" ? "R$ 50 no PIX" : "PlayStation 5"}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={p.prize_value_cents != null ? (p.prize_value_cents / 100).toString() : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateRow(i, { prize_value_cents: v ? Math.round(parseFloat(v) * 100) : null });
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Foto</Label>
                    <div className="flex items-center gap-2">
                      {p.prize_image_url ? (
                        <img src={p.prize_image_url} alt="" className="h-10 w-10 rounded-lg object-cover border" />
                      ) : null}
                      <label className="cursor-pointer inline-flex items-center justify-center h-10 w-10 rounded-lg border border-dashed hover:bg-secondary transition">
                        {uploadingIdx === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleImageUpload(i, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeRow(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}