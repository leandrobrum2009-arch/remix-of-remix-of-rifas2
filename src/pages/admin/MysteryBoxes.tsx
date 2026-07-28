import AdminLayout from "@/components/AdminLayout";
import { useAdminMysteryBoxes } from "@/hooks/useAdmin";
import { useCampaigns } from "@/hooks/useData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Gift, Plus, Pencil, Trash2, Box, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Info, ExternalLink } from "lucide-react";

export default function AdminMysteryBoxes() {
  const { data: boxes, isLoading, refetch } = useAdminMysteryBoxes();
  const { data: campaigns } = useCampaigns();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    campaign_id: "",
    name: "",
    rarity: "common",
    cost: "10",
    is_active: true
  });

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error("Insira o nome da caixa");
      return;
    }
    if (!formData.campaign_id) {
      toast.error("Selecione uma campanha");
      return;
    }

    setIsSaving(true);
    try {
      const { data: created, error } = await supabase.from("mystery_box_configs").insert({
        campaign_id: formData.campaign_id,
        name: formData.name,
        rarity: formData.rarity as any,
        cost: parseFloat(formData.cost),
        is_active: formData.is_active
      }).select().single();

      if (error) throw error;

      // Habilita o recurso na campanha automaticamente para que apareça no site
      await supabase.from("campaigns").update({ mystery_box_enabled: true }).eq("id", formData.campaign_id);

      toast.success("Caixa criada e recurso ativado na campanha! Agora cadastre os prêmios dentro da edição da campanha.");
      setIsDialogOpen(false);
      refetch();
      setFormData({ campaign_id: "", name: "", rarity: "common", cost: "10", is_active: true });
    } catch (error: any) {
      toast.error("Erro ao criar caixa: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta caixa?")) return;
    
    try {
      const { error } = await supabase.from("mystery_box_configs").delete().eq("id", id);
      if (error) throw error;
      toast.success("Caixa excluída!");
      refetch();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Caixas Misteriosas</h1>
          <p className="text-muted-foreground mt-1">Gerencie tipos de caixas, custos e prêmios.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-bold shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] border-none">
              <Plus className="mr-2 h-4 w-4" /> Nova Caixa
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Nova Caixa Misteriosa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Campanha</Label>
                <Select
                  value={formData.campaign_id}
                  onValueChange={v => setFormData({...formData, campaign_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a campanha" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome da Caixa</Label>
                <Input 
                  placeholder="Ex: Caixa de Ouro" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Raridade</Label>
                  <Select 
                    value={formData.rarity}
                    onValueChange={v => setFormData({...formData, rarity: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="common">Comum</SelectItem>
                      <SelectItem value="rare">Raro</SelectItem>
                      <SelectItem value="epic">Épico</SelectItem>
                      <SelectItem value="legendary">Lendário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Custo para Abrir (R$)</Label>
                  <Input 
                    type="number"
                    value={formData.cost}
                    onChange={e => setFormData({...formData, cost: e.target.value})}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Os prêmios da caixa são cadastrados na página de edição da campanha, em "Prêmios da Campanha".
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Criar Caixa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Aviso explicativo */}
      <Card className="border-amber-500/30 bg-amber-500/5 mb-6">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-foreground">Como funciona</p>
            <p className="text-muted-foreground leading-relaxed">
              1) Crie a caixa aqui vinculada a uma campanha (custo, raridade e nome). <br />
              2) Para a caixa <b>aparecer no site</b>, é preciso adicionar pelo menos 1 <b>prêmio</b> dentro da edição da campanha (aba "Prêmios da Campanha" → seção "Caixas Surpresas"). <br />
              3) O recurso é ativado automaticamente na campanha quando você cria a caixa por aqui.
            </p>
            <p className="text-muted-foreground"><b>Campos:</b> <i>Custo</i> = quanto o usuário paga para abrir (R$). <i>Raridade</i> = etiqueta visual. <i>Ativa</i> = mostra/oculta no site.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-4 mb-8">
        {[
          { key: 'common', label: 'Comum' },
          { key: 'rare', label: 'Raro' },
          { key: 'epic', label: 'Épico' },
          { key: 'legendary', label: 'Lendário' },
        ].map(({ key: rarity, label }) => (
          <Card key={rarity} className="border-border bg-card/50 backdrop-blur-xl relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-full h-1 ${
              rarity === 'common' ? 'bg-slate-400' :
              rarity === 'rare' ? 'bg-blue-400' :
              rarity === 'epic' ? 'bg-purple-400' : 'bg-amber-400'
            }`} />
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {boxes?.filter((b: any) => b.rarity === rarity).length || 0} Ativas
                </p>
              </div>
              <Box className={`h-8 w-8 ${
                rarity === 'common' ? 'text-muted-foreground' :
                rarity === 'rare' ? 'text-blue-600' :
                rarity === 'epic' ? 'text-purple-400' : 'text-amber-400'
              } opacity-20`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Caixa</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Campanha</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Custo</TableHead>
                  <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground font-bold uppercase text-[10px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(boxes as any[])?.map((b: any) => (
                  <TableRow key={b.id} className="border-border hover:bg-secondary/20 transition-colors group">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground tracking-tight">{b.name}</span>
                        <span className="text-[10px] text-muted-foreground">{(b as any).rarity || 'Geral'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{b.campaigns?.title || '—'}</TableCell>
                    <TableCell className="text-foreground font-bold font-mono text-xs">
                      R$ {Number(b.cost || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] font-bold tracking-widest ${b.is_active ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' : 'bg-secondary/500/20 text-muted-foreground border-slate-500/20'}`}>
                        {b.is_active ? 'ATIVA' : 'INATIVA'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {b.campaign_id && (
                        <Link to={`/admin/campanhas/editar/${b.campaign_id}`}>
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:bg-primary/10">
                            <ExternalLink className="h-3 w-3 mr-1" /> Prêmios
                          </Button>
                        </Link>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleDelete(b.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {boxes?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground font-medium italic">
                      Nenhuma caixa misteriosa encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
