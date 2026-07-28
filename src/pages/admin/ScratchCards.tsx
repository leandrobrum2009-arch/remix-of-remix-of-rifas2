import AdminLayout from "@/components/AdminLayout";
import { useAdminScratchCards, useAdminScratchCardStats } from "@/hooks/useAdmin";
import { useGlobalScratchCardScratches } from "@/hooks/useData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Pencil, Trash2, Layout, History, Trophy, TrendingUp, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminScratchCards() {
  const { data: prizes, isLoading, refetch } = useAdminScratchCards();
  const { data: stats, isLoading: isLoadingStats } = useAdminScratchCardStats();
  const { data: recentScratches } = useGlobalScratchCardScratches(10);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    prize_type: "fixed_value",
    value: "0",
    chance_percent: "1",
    is_active: true
  });

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from("scratch_card_prizes").insert({
        label: formData.label,
        prize_type: formData.prize_type,
        value: parseFloat(formData.value),
        chance_percent: parseFloat(formData.chance_percent),
        is_active: formData.is_active
      });

      if (error) throw error;

      toast.success("Prêmio criado com sucesso!");
      setIsDialogOpen(false);
      refetch();
      setFormData({ label: "", prize_type: "fixed_value", value: "0", chance_percent: "1", is_active: true });
    } catch (error: any) {
      toast.error("Erro ao criar prêmio: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este prêmio?")) return;
    
    try {
      const { error } = await supabase.from("scratch_card_prizes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Prêmio excluído!");
      refetch();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
            Raspadinhas Premiadas
          </h1>
          <p className="text-muted-foreground mt-1">Configure prêmios e probabilidades das raspadinhas.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-bold shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] border-none">
              <Plus className="mr-2 h-4 w-4" /> Novo Prêmio
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Novo Prêmio de Raspadinha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Prêmio</Label>
                <Input 
                  placeholder="Ex: R$ 50,00 no PIX" 
                  value={formData.label}
                  onChange={e => setFormData({...formData, label: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={formData.prize_type}
                    onValueChange={v => setFormData({...formData, prize_type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_value">Valor Fixo</SelectItem>
                      <SelectItem value="multiplier">Multiplicador</SelectItem>
                      <SelectItem value="bonus">Bônus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input 
                    type="number"
                    value={formData.value}
                    onChange={e => setFormData({...formData, value: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Probabilidade (%)</Label>
                <Input 
                  type="number"
                  step="0.1"
                  value={formData.chance_percent}
                  onChange={e => setFormData({...formData, chance_percent: e.target.value})}
                />
                <p className="text-[10px] text-muted-foreground">A soma de todas as probabilidades não deve ultrapassar 100%.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Criar Prêmio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-border bg-card/50 backdrop-blur-xl">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total de Jogos</p>
            <h3 className="text-2xl font-black text-foreground">{stats?.totalScratches || 0}</h3>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50 backdrop-blur-xl">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Prêmios Distribuídos</p>
            <h3 className="text-2xl font-black text-emerald-500">R$ {stats?.totalPrizesValue.toFixed(2) || "0.00"}</h3>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50 backdrop-blur-xl">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Ganhadores / Participantes</p>
            <h3 className="text-2xl font-black text-foreground">
              {stats?.winnersCount || 0} <span className="text-muted-foreground text-sm">/ {stats?.totalScratches || 0}</span>
            </h3>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50 backdrop-blur-xl">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Taxa de Vitória</p>
            <h3 className="text-2xl font-black text-primary">
              {stats?.totalScratches ? ((stats.winnersCount / stats.totalScratches) * 100).toFixed(1) : "0.0"}%
            </h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-border bg-card/50 backdrop-blur-xl">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Prêmio</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Tipo</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Valor</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Chance</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Status</TableHead>
                    <TableHead className="text-right text-muted-foreground font-bold uppercase text-[10px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prizes?.map((p) => (
                    <TableRow key={p.id} className="border-border hover:bg-secondary/20 transition-colors group">
                      <TableCell>
                        <span className="font-bold text-foreground tracking-tight">{p.label}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-secondary/20 border-border text-foreground capitalize text-[10px]">
                          {p.prize_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-emerald-500 font-bold font-mono text-xs">
                        R$ {Number(p.value).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-secondary/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${p.chance_percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-foreground">{p.chance_percent}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                         <Badge className={p.is_active ? "bg-emerald-500/20 text-emerald-500" : "bg-zinc-500/20 text-zinc-500"}>
                            {p.is_active ? "ATIVO" : "INATIVO"}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-card/10">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!prizes || prizes.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground font-medium italic">
                        Nenhum prêmio configurado na raspadinha.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border bg-card/50 backdrop-blur-xl">
            <CardContent className="p-6">
              <h3 className="text-sm font-black uppercase text-foreground tracking-widest mb-4 flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Histórico de Raspadas
              </h3>
              <div className="space-y-4">
                {recentScratches?.map((scratch, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-xs font-bold text-foreground">{scratch.profiles?.name || "Usuário"}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                         {scratch.is_winner ? "Venceu" : "Tentou"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black uppercase italic ${scratch.is_winner ? "text-primary" : "text-muted-foreground"}`}>
                        {scratch.prize_label || "Sem prêmio"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{new Date(scratch.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                {(!recentScratches || recentScratches.length === 0) && (
                  <p className="text-xs text-muted-foreground italic text-center py-4">Nenhuma atividade recente.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-primary/5 backdrop-blur-xl border-primary/20">
            <CardContent className="p-6">
              <h3 className="text-sm font-black uppercase text-primary tracking-widest mb-2 flex items-center gap-2">
                 <TrendingUp className="h-4 w-4" />
                 Métricas de Engajamento
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] uppercase font-bold mb-1">
                    <span className="text-muted-foreground">Conversão de Prêmios</span>
                    <span className="text-foreground">
                      {stats?.totalScratches 
                        ? ((stats.winnersCount / stats.totalScratches) * 100).toFixed(1) 
                        : "0.0"}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${Math.min(100, (stats?.totalScratches ? (stats.winnersCount / stats.totalScratches) * 100 : 0))}%` }}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Analise o balanceamento das chances para manter os usuários engajados e a operação saudável.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}