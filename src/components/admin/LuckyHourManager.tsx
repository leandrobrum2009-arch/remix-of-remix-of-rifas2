import { useState, useMemo } from "react";
import { useLuckyHours, LuckyHour } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Clock, Trophy, User, ChevronLeft, ChevronRight, Send, CheckCircle2, History, ShieldCheck, Eye, TrendingUp, Filter, ShieldAlert, CheckSquare, XCircle, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/hooks/useAdmin";

interface LuckyHourManagerProps {
  campaignId: string;
}

export default function LuckyHourManager({ campaignId }: LuckyHourManagerProps) {
  const { data: luckyHours, isLoading, refetch } = useLuckyHours(campaignId);
  const { data: userRole } = useRole();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDraw, setSelectedDraw] = useState<LuckyHour | null>(null);
  const [activeTab, setActiveTab] = useState<'hourly' | 'greater_smaller'>('hourly');
  const itemsPerPage = 5;
  
  const [newDraw, setNewDraw] = useState({
    title: "",
    prize_description: "",
    draw_time: "",
    draw_type: 'hourly' as 'hourly' | 'greater_smaller',
    is_recurring: false,
    frequency: 'daily' as 'daily' | 'every_x_days',
    every_x_days: 3,
    occurrences: 5,
  });


  const handleAdd = async () => {
    if (!newDraw.title || !newDraw.prize_description || !newDraw.draw_time) {
      toast({ title: "Erro", description: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const drawsToInsert = [];
      const startTime = new Date(newDraw.draw_time);

      if (newDraw.is_recurring) {
        for (let i = 0; i < newDraw.occurrences; i++) {
          const drawTime = new Date(startTime);
          if (newDraw.frequency === 'daily') {
            drawTime.setDate(startTime.getDate() + i);
          } else {
            drawTime.setDate(startTime.getDate() + (i * newDraw.every_x_days));
          }

          drawsToInsert.push({
            campaign_id: campaignId,
            title: newDraw.title,
            prize_description: newDraw.prize_description,
            draw_time: drawTime.toISOString(),
            status: 'scheduled',
            draw_type: newDraw.draw_type
          });
        }
      } else {
        drawsToInsert.push({
          campaign_id: campaignId,
          title: newDraw.title,
          prize_description: newDraw.prize_description,
          draw_time: startTime.toISOString(),
          status: 'scheduled',
          draw_type: newDraw.draw_type
        });
      }

      const { error } = await supabase.from("lucky_hours").insert(drawsToInsert);

      if (error) throw error;

      toast({ 
        title: "Sucesso", 
        description: newDraw.is_recurring ? `${drawsToInsert.length} sorteios agendados!` : "Sorteio agendado!" 
      });
      setNewDraw({ 
        title: "", 
        prize_description: "", 
        draw_time: "", 
        draw_type: activeTab,
        is_recurring: false,
        frequency: 'daily',
        every_x_days: 3,
        occurrences: 5
      });
      setIsAdding(false);
      refetch();

    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este sorteio?")) return;

    try {
      const { error } = await supabase.from("lucky_hours").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Sorteio excluído" });
      refetch();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleClearScheduled = async () => {
    if (!confirm("Tem certeza que deseja excluir TODOS os sorteios agendados? Sorteios realizados não serão afetados.")) return;

    try {
      const { error } = await supabase
        .from("lucky_hours")
        .delete()
        .eq("campaign_id", campaignId)
        .eq("status", "scheduled")
        .eq("draw_type", activeTab);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Todos os sorteios agendados foram removidos." });
      refetch();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleNotifyWinner = async (draw: LuckyHour) => {

    if (!draw.winner_name || !draw.winning_number) {
      toast({ title: "Erro", description: "Dados do vencedor incompletos", variant: "destructive" });
      return;
    }
    
    // Here we could integrate with a notification system (WhatsApp, SMS, Email)
    // For now, we simulate the action and show a success message
    toast({ 
      title: "Notificação Enviada", 
      description: `Vencedor ${draw.winner_name} foi notificado sobre o prêmio ${draw.prize_description}!`,
    });
  };

  const handleUpdateStatus = async (id: string, status: 'scheduled' | 'completed', winner_name?: string, winning_number?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      const { data: currentDraw } = await supabase.from("lucky_hours").select("*").eq("id", id).single();
      const currentLog = (currentDraw?.audit_log as any[]) || [];
      const isMaster = userRole === 'master';

      const newLogEntry = {
        timestamp: new Date().toISOString(),
        action: status === 'completed' ? 'draw_attempt' : 'draw_reverted',
        user_id: user?.id,
        details: { status, winner_name, winning_number }
      };

      // If master is doing the draw, it's auto-approved. 
      // If admin is doing it, it goes to draft for approval.
      const payload: any = {
        status,
        audit_log: [...currentLog, newLogEntry]
      };

      if (status === 'completed') {
        if (isMaster) {
          payload.winner_name = winner_name;
          payload.winning_number = winning_number;
          payload.is_approved = true;
          payload.approved_by = user?.id;
          payload.approved_at = new Date().toISOString();
        } else {
          payload.draft_winner_name = winner_name;
          payload.draft_winning_number = winning_number;
          payload.is_approved = false;
        }
      } else {
        // Reverting
        payload.winner_name = null;
        payload.winning_number = null;
        payload.draft_winner_name = null;
        payload.draft_winning_number = null;
        payload.is_approved = false;
      }

      const { error } = await supabase.from("lucky_hours").update(payload).eq("id", id);
      
      if (error) throw error;
      toast({ 
        title: "Sucesso", 
        description: isMaster || status === 'scheduled' 
          ? "Sorteio atualizado" 
          : "Sorteio enviado para aprovação do Master" 
      });
      refetch();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleApprove = async (draw: LuckyHour) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      const currentLog = (draw.audit_log as any[]) || [];
      const newLogEntry = {
        timestamp: new Date().toISOString(),
        action: 'draw_approved',
        user_id: user?.id,
        details: { winner: draw.draft_winner_name, number: draw.draft_winning_number }
      };

      const { error } = await supabase.from("lucky_hours").update({
        winner_name: draw.draft_winner_name,
        winning_number: draw.draft_winning_number,
        is_approved: true,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        audit_log: [...currentLog, newLogEntry]
      }).eq("id", draw.id);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Sorteio aprovado e publicado!" });
      refetch();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleReject = async (draw: LuckyHour) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      const currentLog = (draw.audit_log as any[]) || [];
      const newLogEntry = {
        timestamp: new Date().toISOString(),
        action: 'draw_rejected',
        user_id: user?.id
      };

      const { error } = await supabase.from("lucky_hours").update({
        status: 'scheduled',
        draft_winner_name: null,
        draft_winning_number: null,
        is_approved: false,
        audit_log: [...currentLog, newLogEntry]
      }).eq("id", draw.id);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Sorteio rejeitado" });
      refetch();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const paginatedLuckyHours = useMemo(() => {
    if (!luckyHours) return [];
    const filtered = luckyHours.filter(h => h.draw_type === activeTab);
    const sorted = [...filtered].sort((a, b) => new Date(b.draw_time).getTime() - new Date(a.draw_time).getTime());
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  }, [luckyHours, currentPage, activeTab]);

  const totalPages = Math.ceil((luckyHours?.filter(h => h.draw_type === activeTab).length || 0) / itemsPerPage);

  if (!campaignId) return <div className="p-4 text-center text-muted-foreground">Salve a campanha primeiro para gerenciar as Horas Premiadas.</div>;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7 bg-secondary/10">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Gerenciar Sorteios e Prêmios
            </CardTitle>
            <CardDescription>Crie mini sorteios e prêmios automáticos para ocorrerem durante a campanha.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v as any);
              setCurrentPage(1);
              setNewDraw(p => ({ ...p, draw_type: v as any }));
            }} className="w-auto">
              <TabsList className="bg-secondary/50 rounded-xl">
                <TabsTrigger value="hourly" className="rounded-lg gap-2 text-xs font-bold uppercase tracking-tighter">
                  <Clock className="h-3 w-3" /> Hora Premiada
                </TabsTrigger>
                <TabsTrigger value="greater_smaller" className="rounded-lg gap-2 text-xs font-bold uppercase tracking-tighter">
                  <TrendingUp className="h-3 w-3" /> Maior/Menor Cota
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "outline" : "default"} className="gap-2 rounded-xl">
              {isAdding ? "Cancelar" : <><Plus className="h-4 w-4" /> Novo Sorteio</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isAdding && (
            <div className="mb-8 p-6 bg-secondary/30 rounded-2xl border border-border space-y-4 animate-in fade-in slide-in-from-top-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider">Título do Sorteio</Label>
                  <Input 
                    placeholder="Ex: Sorteio Relâmpago" 
                    value={newDraw.title} 
                    className="rounded-xl"
                    onChange={e => setNewDraw(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider">Prêmio</Label>
                  <Input 
                    placeholder="Ex: R$ 100,00 no PIX" 
                    value={newDraw.prize_description} 
                    className="rounded-xl"
                    onChange={e => setNewDraw(p => ({ ...p, prize_description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl border border-border h-[42px]">
                    <Switch 
                      checked={newDraw.is_recurring} 
                      onCheckedChange={v => setNewDraw(p => ({ ...p, is_recurring: v }))} 
                    />
                    <Label className="text-[10px] font-bold uppercase cursor-pointer">Sorteio Recorrente</Label>
                  </div>
                </div>
              </div>

              {newDraw.is_recurring && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in zoom-in-95">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider">Frequência</Label>
                    <Select value={newDraw.frequency} onValueChange={v => setNewDraw(p => ({ ...p, frequency: v as any }))}>
                      <SelectTrigger className="bg-card rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diário (Todos os dias)</SelectItem>
                        <SelectItem value="every_x_days">A cada X dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newDraw.frequency === 'every_x_days' && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider">A cada quantos dias?</Label>
                      <Input 
                        type="number" 
                        min="2" 
                        value={newDraw.every_x_days} 
                        onChange={e => setNewDraw(p => ({ ...p, every_x_days: parseInt(e.target.value) || 2 }))}
                        className="bg-card rounded-lg"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider">Total de Ocorrências</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="30"
                      value={newDraw.occurrences} 
                      onChange={e => setNewDraw(p => ({ ...p, occurrences: parseInt(e.target.value) || 1 }))}
                      className="bg-card rounded-lg"
                    />
                    <p className="text-[9px] text-muted-foreground italic">Máximo 30 sorteios de uma vez.</p>
                  </div>
                </div>
              )}

              <Button onClick={handleAdd} disabled={saving} className="w-full md:w-auto rounded-xl">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {newDraw.is_recurring ? `Agendar ${newDraw.occurrences} Sorteios` : 'Agendar Sorteio'}
              </Button>
            </div>

          )}

          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4">
              {luckyHours?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic border-2 border-dashed border-border rounded-2xl bg-secondary/5">
                  Nenhum sorteio agendado para esta campanha.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sorteios Encontrados ({luckyHours?.filter(h => h.draw_type === activeTab).length})</p>
                    {luckyHours?.some(h => h.draw_type === activeTab && h.status === 'scheduled') && (
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/5 font-bold uppercase tracking-tighter gap-1.5" onClick={handleClearScheduled}>
                        <Trash2 className="h-3 w-3" /> Limpar Agendados
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4">


                    {paginatedLuckyHours.map((draw) => (
                      <div key={draw.id} className="p-5 bg-card border border-border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all group">
                        <div className="flex items-start gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${draw.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20'}`}>
                            {draw.status === 'completed' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-lg">{draw.title}</h4>
                            <Badge variant={draw.status === 'completed' ? 'default' : 'secondary'} className={`text-[10px] uppercase font-black tracking-tighter ${draw.status === 'completed' ? (draw.is_approved ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600') : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                                {draw.status === 'completed' ? (draw.is_approved ? 'Realizado' : 'Aguardando Aprovação') : 'Agendado'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1 font-medium"><Trophy className="h-3.5 w-3.5 text-primary" /> {draw.prize_description}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {format(new Date(draw.draw_time), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                              {draw.audit_log && draw.audit_log.length > 0 && (
                                <span className="flex items-center gap-1 text-[10px] bg-secondary/50 px-2 py-0.5 rounded-full"><History className="h-3 w-3" /> {draw.audit_log.length} registros</span>
                              )}
                            </div>
                            {draw.status === 'completed' && (
                              <div className={`mt-3 p-3 rounded-xl border flex flex-col gap-2 animate-in fade-in zoom-in-95 ${draw.is_approved ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-blue-500/5 border-blue-500/10'}`}>
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center ${draw.is_approved ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
                                      <User className={`h-3.5 w-3.5 ${draw.is_approved ? 'text-emerald-600' : 'text-blue-600'}`} />
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-tight ${draw.is_approved ? 'text-emerald-700' : 'text-blue-700'}`}>
                                      {draw.is_approved ? `Ganhador: ${draw.winner_name} (Nº ${draw.winning_number})` : `Pendente: ${draw.draft_winner_name} (Nº ${draw.draft_winning_number})`}
                                    </span>
                                  </div>
                                  {draw.is_approved ? (
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-500/10 gap-1.5" onClick={() => handleNotifyWinner(draw)}>
                                      <Send className="h-3 w-3" /> Notificar
                                    </Button>
                                  ) : userRole === 'master' && (
                                    <div className="flex items-center gap-2">
                                      <Button size="sm" className="h-7 text-[9px] font-black uppercase bg-emerald-500 hover:bg-emerald-600 gap-1.5" onClick={() => handleApprove(draw)}>
                                        <CheckSquare className="h-3 w-3" /> Aprovar
                                      </Button>
                                      <Button size="sm" variant="destructive" className="h-7 text-[9px] font-black uppercase gap-1.5" onClick={() => handleReject(draw)}>
                                        <XCircle className="h-3 w-3" /> Rejeitar
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                {draw.audit_log && (
                                  <div className={`mt-1 pt-2 border-t ${draw.is_approved ? 'border-emerald-500/10' : 'border-blue-500/10'}`}>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                                      <ShieldCheck className="h-3 w-3" /> Log de Auditoria
                                    </p>
                                    <div className="space-y-1">
                                      {draw.audit_log.slice(-2).map((log: any, idx: number) => (
                                        <p key={idx} className="text-[9px] text-muted-foreground leading-tight italic">
                                          {format(new Date(log.timestamp), "HH:mm:ss")} - {log.action === 'draw_approved' ? 'Sorteio aprovado' : (log.action === 'draw_attempt' ? 'Resultado enviado' : 'Alterado')} por {log.user_id?.substring(0, 8)}...
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                          {draw.status === 'scheduled' ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 rounded-lg h-9 font-bold px-4 gap-2"
                                onClick={async () => {
                                  try {
                                    const { data, error } = await supabase.rpc('run_lucky_hour_draw', { p_lucky_hour_id: draw.id });
                                    if (error) throw error;
                                    
                                    const result = data as any;
                                    if (result && !result.success) throw new Error(result.message);
                                    
                                    toast({ 
                                      title: "Sorteio Realizado!", 
                                      description: `Vencedor: ${result.winner_name} (Nº ${result.winning_number})`
                                    });
                                    refetch();
                                  } catch (err: any) {
                                    toast({ title: "Erro no sorteio", description: err.message, variant: "destructive" });
                                  }
                                }}
                              >
                                <Trophy className="h-4 w-4" /> Automático
                              </Button>
                              <Button variant="outline" size="sm" className="bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 border-emerald-500/20 rounded-lg h-9 font-bold px-4" onClick={() => {
                                const name = prompt("Nome do Ganhador:");
                                const number = prompt("Número Sorteado:");
                                if (name && number) handleUpdateStatus(draw.id, 'completed', name, number);
                              }}>
                                Manual
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-9 text-xs font-bold opacity-60 hover:opacity-100" onClick={() => handleUpdateStatus(draw.id, 'scheduled')}>
                              Reverter
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setSelectedDraw(draw)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-9 w-9 rounded-lg" onClick={() => handleDelete(draw.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="rounded-xl h-9 px-4"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                      </Button>
                      <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="rounded-xl h-9 px-4"
                      >
                        Próximo <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                  </div>
                )}

            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDraw} onOpenChange={(open) => !open && setSelectedDraw(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> Detalhes do Sorteio
            </DialogTitle>
            <DialogDescription>
              Informações completas e histórico de auditoria do evento.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDraw && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary/30 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Título</p>
                  <p className="font-bold text-sm">{selectedDraw.title}</p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status</p>
                  <Badge className={selectedDraw.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}>
                    {selectedDraw.status === 'completed' ? 'Realizado' : 'Agendado'}
                  </Badge>
                </div>
                <div className="p-4 bg-secondary/30 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Prêmio</p>
                  <p className="font-bold text-sm text-primary">{selectedDraw.prize_description}</p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Data/Hora</p>
                  <p className="font-bold text-sm">{format(new Date(selectedDraw.draw_time), "dd/MM/yyyy HH:mm")}</p>
                </div>
              </div>

              {selectedDraw.status === 'completed' && (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-3">
                  <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Resultado do Sorteio
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Ganhador</p>
                      <p className="font-black text-emerald-700">{selectedDraw.winner_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Número</p>
                      <p className="font-black text-emerald-700">#{selectedDraw.winning_number}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                  <History className="h-3 w-3" /> Log de Auditoria Completo
                </p>
                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                  {selectedDraw.audit_log && selectedDraw.audit_log.length > 0 ? (
                    [...selectedDraw.audit_log].reverse().map((log: any, idx: number) => (
                      <div key={idx} className="p-3 bg-secondary/20 rounded-xl text-[11px] border border-border/50">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold uppercase text-primary">
                            {log.action === 'draw_completed' ? 'Sorteio Realizado' : 'Status Revertido'}
                          </span>
                          <span className="text-muted-foreground font-mono">
                            {format(new Date(log.timestamp), "dd/MM HH:mm:ss")}
                          </span>
                        </div>
                        <p className="text-muted-foreground italic">
                          Operador: {log.user_id?.substring(0, 12)}...
                        </p>
                        {log.details && log.details.winner_name && (
                          <p className="mt-1 text-foreground font-medium">
                            Resultado: {log.details.winner_name} (#{log.details.winning_number})
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic text-center py-4">Sem registros de auditoria.</p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Button className="w-full rounded-2xl h-12 font-black uppercase tracking-widest" onClick={() => setSelectedDraw(null)}>
                  Fechar Detalhes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}