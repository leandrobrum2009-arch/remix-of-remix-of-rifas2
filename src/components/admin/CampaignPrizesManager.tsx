import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Sparkles, Gift, RotateCw, Trophy, Loader2, ChevronDown, ChevronUp, Crown, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ScratchPrize = { id: string; campaign_id: string | null; label: string; value: number; prize_type: string; chance_percent: number; is_active: boolean };
type RoulettePrize = { id: string; campaign_id: string | null; label: string; value: number | null; prize_type: string; chance_percent: number | null; color: string | null };
type Rarity = "common" | "rare" | "epic" | "legendary";
type BoxConfig = { id: string; campaign_id: string | null; name: string; rarity: Rarity; cost: number; is_active: boolean | null };
type BoxPrize = { id: string; config_id: string | null; title: string; description: string | null; prize_type: string; prize_value: number | null; chance_percent: number; rarity: Rarity };

// Tipos de prêmio disponíveis para Raspadinha, Caixa Surpresa e Roleta.
// "free_*" = brinde de tentativa grátis (não custa saldo ao usuário).
const PRIZE_TYPES = [
  { value: "balance",      label: "Saldo (R$)",          hint: "Credita R$ na carteira do ganhador." },
  { value: "points",       label: "Pontos",              hint: "Pontos de fidelidade no perfil." },
  { value: "ticket",       label: "Cota grátis",         hint: "1 bilhete grátis desta campanha." },
  { value: "free_spin",    label: "Giro grátis",         hint: "1 giro de roleta sem custo." },
  { value: "free_scratch", label: "Raspadinha grátis",   hint: "1 raspadinha sem custo." },
  { value: "free_box",     label: "Caixa grátis",        hint: "1 abertura de caixa sem custo." },
  { value: "physical",     label: "Prêmio físico",       hint: "Produto entregue manualmente (ex.: relógio, eletrônico)." },
  { value: "none",         label: "Sem prêmio",          hint: "Tentativa sem ganho." },
];

const RARITIES: Rarity[] = ["common", "rare", "epic", "legendary"];

function SectionHeader({ icon: Icon, title, color, count, onAdd, addLabel }: any) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          <p className="text-xs text-muted-foreground">{count} item(ns) configurado(s)</p>
        </div>
      </div>
      <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4 mr-1" /> {addLabel}</Button>
    </div>
  );
}

export default function CampaignPrizesManager({ campaignId }: { campaignId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scratches, setScratches] = useState<ScratchPrize[]>([]);
  const [roulettes, setRoulettes] = useState<RoulettePrize[]>([]);
  const [boxes, setBoxes] = useState<BoxConfig[]>([]);
  const [boxPrizes, setBoxPrizes] = useState<Record<string, BoxPrize[]>>({});
  const [openBox, setOpenBox] = useState<string | null>(null);
  const [winners, setWinners] = useState<{ scratch: any[]; roulette: any[]; box: any[] }>({ scratch: [], roulette: [], box: [] });

  const load = async () => {
    setLoading(true);
    const [s, r, b, sw, rw, bw] = await Promise.all([
      supabase.from("scratch_card_prizes").select("*").eq("campaign_id", campaignId).order("created_at"),
      supabase.from("roulette_prizes").select("*").eq("campaign_id", campaignId).order("created_at"),
      supabase.from("mystery_box_configs").select("*").eq("campaign_id", campaignId).order("created_at"),
      supabase.from("scratch_card_scratches").select("id,prize_label,is_winner,created_at,user_id,profiles:user_id(name)").eq("campaign_id", campaignId).eq("is_winner", true).order("created_at", { ascending: false }).limit(20),
      supabase.from("roulette_spins").select("id,prize_label,created_at,user_id,profiles:user_id(name)").eq("campaign_id", campaignId).not("prize_label", "is", null).order("created_at", { ascending: false }).limit(20),
      supabase.from("mystery_box_wins").select("id,prize_title,created_at,user_id,profiles:user_id(name)").order("created_at", { ascending: false }).limit(20),
    ]);
    setScratches((s.data as any) || []);
    setRoulettes((r.data as any) || []);
    setBoxes((b.data as any) || []);
    setWinners({ scratch: sw.data || [], roulette: rw.data || [], box: bw.data || [] });

    const cfgIds = ((b.data as any[]) || []).map((c) => c.id);
    if (cfgIds.length) {
      const { data: bp } = await supabase.from("mystery_box_prizes").select("*").in("config_id", cfgIds);
      const grouped: Record<string, BoxPrize[]> = {};
      (bp || []).forEach((p: any) => { (grouped[p.config_id] ||= []).push(p); });
      setBoxPrizes(grouped);
    } else setBoxPrizes({});
    setLoading(false);
  };

  useEffect(() => { if (campaignId) load(); }, [campaignId]);

  // --- Scratch ---
  const addScratch = async () => {
    const { data, error } = await supabase.from("scratch_card_prizes").insert({ campaign_id: campaignId, label: "Nova Raspadinha", value: 0, prize_type: "balance", chance_percent: 5, is_active: true }).select().single();
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setScratches([...scratches, data as any]);
  };
  const updScratch = async (i: number, patch: Partial<ScratchPrize>) => {
    const n = [...scratches]; (n[i] as any) = { ...n[i], ...patch }; setScratches(n);
    await supabase.from("scratch_card_prizes").update(patch).eq("id", n[i].id);
  };
  const delScratch = async (id: string) => {
    await supabase.from("scratch_card_prizes").delete().eq("id", id);
    setScratches(scratches.filter((x) => x.id !== id));
  };

  // --- Roulette ---
  const addRoulette = async () => {
    const { data, error } = await supabase.from("roulette_prizes").insert({ campaign_id: campaignId, label: "Novo Prêmio", value: 0, prize_type: "balance", chance_percent: 10, color: "#FACC15" }).select().single();
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setRoulettes([...roulettes, data as any]);
  };
  const updRoulette = async (i: number, patch: Partial<RoulettePrize>) => {
    const n = [...roulettes]; (n[i] as any) = { ...n[i], ...patch }; setRoulettes(n);
    await supabase.from("roulette_prizes").update(patch).eq("id", n[i].id);
  };
  const delRoulette = async (id: string) => {
    await supabase.from("roulette_prizes").delete().eq("id", id);
    setRoulettes(roulettes.filter((x) => x.id !== id));
  };

  // --- Mystery Box ---
  const addBox = async () => {
    const { data, error } = await supabase.from("mystery_box_configs").insert({ campaign_id: campaignId, name: "Nova Caixa Surpresa", rarity: "common", cost: 0, is_active: true }).select().single();
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setBoxes([...boxes, data as any]);
    setOpenBox((data as any).id);
  };
  const updBox = async (i: number, patch: Partial<BoxConfig>) => {
    const n = [...boxes]; (n[i] as any) = { ...n[i], ...patch }; setBoxes(n);
    await supabase.from("mystery_box_configs").update(patch).eq("id", n[i].id);
  };
  const delBox = async (id: string) => {
    await supabase.from("mystery_box_configs").delete().eq("id", id);
    setBoxes(boxes.filter((x) => x.id !== id));
  };
  const addBoxPrize = async (configId: string) => {
    const { data, error } = await supabase.from("mystery_box_prizes").insert({ config_id: configId, title: "Novo Prêmio", prize_type: "balance", prize_value: 0, chance_percent: 10, rarity: "common" }).select().single();
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setBoxPrizes({ ...boxPrizes, [configId]: [...(boxPrizes[configId] || []), data as any] });
  };
  const updBoxPrize = async (configId: string, i: number, patch: Partial<BoxPrize>) => {
    const arr = [...(boxPrizes[configId] || [])];
    (arr[i] as any) = { ...arr[i], ...patch };
    setBoxPrizes({ ...boxPrizes, [configId]: arr });
    await supabase.from("mystery_box_prizes").update(patch).eq("id", arr[i].id);
  };
  const delBoxPrize = async (configId: string, id: string) => {
    await supabase.from("mystery_box_prizes").delete().eq("id", id);
    setBoxPrizes({ ...boxPrizes, [configId]: (boxPrizes[configId] || []).filter((x) => x.id !== id) });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Scratch */}
      <Card className="p-6 rounded-2xl">
        <SectionHeader icon={Sparkles} title="Raspadinhas" color="bg-sky-500/10 text-sky-500" count={scratches.length} onAdd={addScratch} addLabel="Nova Raspadinha" />
        <div className="space-y-2">
          {scratches.map((p, i) => (
            <div key={p.id} className="grid grid-cols-12 gap-2 items-center bg-secondary/40 p-3 rounded-xl">
              <Input className="col-span-4" value={p.label} onChange={(e) => updScratch(i, { label: e.target.value })} placeholder="Nome do prêmio" />
              <Select value={p.prize_type} onValueChange={(v) => updScratch(i, { prize_type: v })}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIZE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} title={t.hint}>{t.label}</SelectItem>
                ))}</SelectContent>
              </Select>
              <Input className="col-span-2" type="number" step="0.01" value={p.value} onChange={(e) => updScratch(i, { value: parseFloat(e.target.value) || 0 })} placeholder="Valor" />
              <Input className="col-span-2" type="number" step="0.01" value={p.chance_percent} onChange={(e) => updScratch(i, { chance_percent: parseFloat(e.target.value) || 0 })} placeholder="% chance" />
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => delScratch(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {scratches.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nenhuma raspadinha configurada.</p>}
        </div>
      </Card>

      {/* Mystery Boxes */}
      <Card className="p-6 rounded-2xl">
        <SectionHeader icon={Gift} title="Caixas Surpresas" color="bg-orange-500/10 text-orange-500" count={boxes.length} onAdd={addBox} addLabel="Nova Caixa" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Custo = preço da abertura. % chance é <b>proporcional</b> (não precisa somar 100). Sem prêmios, a caixa não aparece no site.
        </p>
        <div className="space-y-3">
          {boxes.length > 0 && (
            <div className="grid grid-cols-12 gap-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="col-span-4">Nome da Caixa</span>
              <span className="col-span-2">Raridade</span>
              <span className="col-span-2">Custo (R$)</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2 text-right">Prêmios</span>
            </div>
          )}
          {boxes.map((b, i) => (
            <div key={b.id} className="bg-secondary/40 rounded-xl border border-border">
              <div className="grid grid-cols-12 gap-2 items-center p-3">
                <Input className="col-span-4" value={b.name} onChange={(e) => updBox(i, { name: e.target.value })} placeholder="Nome da caixa" />
              <Select value={b.rarity} onValueChange={(v) => updBox(i, { rarity: v as any })}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>{RARITIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="col-span-2" type="number" step="0.01" value={b.cost} onChange={(e) => updBox(i, { cost: parseFloat(e.target.value) || 0 })} placeholder="Custo R$" />
                <div className="col-span-2 flex items-center gap-2"><Switch checked={!!b.is_active} onCheckedChange={(v) => updBox(i, { is_active: v })} /><Label className="text-xs">Ativa</Label></div>
                <Button variant="ghost" size="sm" className="col-span-1" onClick={() => setOpenBox(openBox === b.id ? null : b.id)}>{openBox === b.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => delBox(b.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              {openBox === b.id && (
                <div className="border-t border-border p-3 space-y-2 bg-background/40">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label className="text-xs font-bold">Prêmios desta caixa</Label>
                      <p className="text-[10px] text-muted-foreground">Preencha um prêmio por linha. A soma das chances é proporcional (não precisa dar 100%).</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addBoxPrize(b.id)}><Plus className="h-3 w-3 mr-1" /> Prêmio</Button>
                  </div>
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-muted-foreground uppercase px-1">
                    <span className="col-span-4">Nome do prêmio</span>
                    <span className="col-span-3">Tipo do prêmio</span>
                    <span className="col-span-2" title="Quanto o ganhador recebe (R$ para saldo, número de pontos, etc.)">Valor entregue</span>
                    <span className="col-span-2 flex items-center gap-1">
                      Chance
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <Info className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[260px] text-[11px] leading-relaxed normal-case">
                            <p className="font-semibold mb-1">Como funciona a Chance:</p>
                            <p>É um <b>peso proporcional</b>, não precisa somar 100.</p>
                            <p className="mt-1">A probabilidade real de cada prêmio é:</p>
                            <p className="font-mono bg-muted/40 rounded px-1 my-1">chance ÷ soma de todas as chances</p>
                            <p>Ex.: prêmios com chances 10, 5 e 1 (soma 16) saem em 62,5%, 31,25% e 6,25% das aberturas.</p>
                            <p className="mt-1 text-muted-foreground">Quer dar 1% de chance? Use 1 e coloque os outros com pesos altos (ex.: 99).</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                    <span className="col-span-1"></span>
                  </div>
                  <p className="text-[10px] text-muted-foreground px-1">
                    Ex.: "Relógio Casio" + tipo <b>Prêmio físico</b> + valor 0 + chance 1 → aparece com esse nome na caixa; entrega é manual.
                  </p>
                  {(boxPrizes[b.id] || []).map((bp, idx) => (
                    <div key={bp.id} className="grid grid-cols-12 gap-2 items-center">
                      <Input className="col-span-4" value={bp.title} onChange={(e) => updBoxPrize(b.id, idx, { title: e.target.value })} placeholder="Ex: R$ 50 no saldo" />
                       <Select value={bp.prize_type} onValueChange={(v) => updBoxPrize(b.id, idx, { prize_type: v })}>
                         <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                         <SelectContent>{PRIZE_TYPES.map((t) => (
                           <SelectItem key={t.value} value={t.value} title={t.hint}>{t.label}</SelectItem>
                         ))}</SelectContent>
                       </Select>
                      <Input className="col-span-2" type="number" step="0.01" value={bp.prize_value ?? 0} onChange={(e) => updBoxPrize(b.id, idx, { prize_value: parseFloat(e.target.value) || 0 })} placeholder="Ex: 50" title="Quantia que o ganhador recebe (R$ ou pontos, conforme o tipo)" />
                      <Input className="col-span-2" type="number" step="0.01" value={bp.chance_percent} onChange={(e) => updBoxPrize(b.id, idx, { chance_percent: parseFloat(e.target.value) || 0 })} placeholder="Ex: 10" title="Chance de sair: 10 = 10% se a soma der 100; é proporcional ao total" />
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => delBoxPrize(b.id, bp.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  {(boxPrizes[b.id] || []).length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Adicione prêmios a esta caixa.</p>}
                </div>
              )}
            </div>
          ))}
          {boxes.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nenhuma caixa surpresa configurada.</p>}
        </div>
      </Card>

      {/* Roulette */}
      <Card className="p-6 rounded-2xl">
        <SectionHeader icon={RotateCw} title="Roletas Instantâneas" color="bg-rose-500/10 text-rose-500" count={roulettes.length} onAdd={addRoulette} addLabel="Novo Prêmio" />
        <div className="space-y-2">
          {roulettes.map((p, i) => (
            <div key={p.id} className="grid grid-cols-12 gap-2 items-center bg-secondary/40 p-3 rounded-xl">
              <Input className="col-span-4" value={p.label} onChange={(e) => updRoulette(i, { label: e.target.value })} placeholder="Nome do prêmio" />
              <Select value={p.prize_type} onValueChange={(v) => updRoulette(i, { prize_type: v })}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIZE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} title={t.hint}>{t.label}</SelectItem>
                ))}</SelectContent>
              </Select>
              <Input className="col-span-2" type="number" step="0.01" value={p.value ?? 0} onChange={(e) => updRoulette(i, { value: parseFloat(e.target.value) || 0 })} placeholder="Valor" />
              <Input className="col-span-2" type="number" step="0.01" value={p.chance_percent ?? 0} onChange={(e) => updRoulette(i, { chance_percent: parseFloat(e.target.value) || 0 })} placeholder="% chance" />
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => delRoulette(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {roulettes.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nenhum prêmio de roleta configurado.</p>}
        </div>
      </Card>

      {/* Winners */}
      <Card className="p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center"><Crown className="h-5 w-5" /></div>
          <div>
            <h3 className="text-base font-bold">Ganhadores da Campanha</h3>
            <p className="text-xs text-muted-foreground">Lista dos prêmios já entregues (raspadinhas, caixas e roletas).</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Raspadinhas", icon: Sparkles, color: "text-sky-500", data: winners.scratch, getLabel: (w: any) => w.prize_label },
            { title: "Caixas Surpresas", icon: Gift, color: "text-orange-500", data: winners.box, getLabel: (w: any) => w.prize_title },
            { title: "Roletas", icon: RotateCw, color: "text-rose-500", data: winners.roulette, getLabel: (w: any) => w.prize_label },
          ].map((s) => (
            <div key={s.title} className="border border-border rounded-xl p-3 bg-secondary/30">
              <div className="flex items-center gap-2 mb-2"><s.icon className={`h-4 w-4 ${s.color}`} /><span className="text-xs font-bold">{s.title}</span></div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {s.data.length === 0 && <p className="text-[10px] text-muted-foreground">Nenhum ganhador ainda.</p>}
                {s.data.map((w: any) => (
                  <div key={w.id} className="flex justify-between items-center text-[11px] py-1 border-b border-border/40 last:border-0">
                    <span className="font-medium truncate">{w.profiles?.name || "Usuário"}</span>
                    <span className="text-muted-foreground truncate ml-2">{s.getLabel(w)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}