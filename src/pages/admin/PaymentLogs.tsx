import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, RefreshCw, Eye, AlertCircle, CheckCircle2, Clock, History, Play
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminPaymentLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('webhook_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`event_id.ilike.%${searchTerm}%,provider.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      toast.error("Erro ao carregar logs: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [searchTerm]);

  const handleRetryQueue = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-webhook-queue', {
        method: 'POST'
      });
      if (error) throw error;
      toast.success(`Fila processada! ${data.processed} eventos verificados.`);
      fetchLogs();
    } catch (err: any) {
      toast.error("Erro ao processar fila: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1"><CheckCircle2 className="h-3 w-3" /> Processado</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Falhou</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
              <History className="h-6 w-6 text-primary" /> Logs de Pagamento
            </h1>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Acompanhe as notificações dos provedores em tempo real</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={fetchLogs} 
              className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button 
              onClick={handleRetryQueue} 
              className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 glow-primary"
              disabled={isProcessing}
            >
              <Play className="h-3 w-3 fill-current" /> Processar Fila Agora
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por ID do evento ou provedor..." 
                className="pl-10 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Data/Hora</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Provedor</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">ID do Evento</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Tentativas</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic uppercase text-xs">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-secondary/20 transition-colors">
                      <TableCell className="text-xs font-medium">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">{log.provider}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground truncate max-w-[150px]">
                        {log.event_id}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-bold">{log.attempts}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">Detalhes do Evento</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest">
              ID: {selectedLog?.event_id} | Provedor: {selectedLog?.provider}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4 custom-scrollbar">
            {selectedLog?.error_log && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 space-y-2">
                <h4 className="text-[10px] font-black uppercase text-destructive tracking-widest flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" /> Log de Erro
                </h4>
                <p className="text-xs font-mono break-all">{selectedLog.error_log}</p>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                <Clock className="h-3 w-3" /> Histórico de Processamento
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Recebido em</p>
                  <p className="text-xs font-black">{selectedLog && format(new Date(selectedLog.created_at), "dd/MM HH:mm:ss")}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Última Tentativa</p>
                  <p className="text-xs font-black">
                    {selectedLog?.last_attempt_at ? format(new Date(selectedLog.last_attempt_at), "dd/MM HH:mm:ss") : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Payload Bruto (JSON)</h4>
              <div className="p-4 rounded-2xl bg-zinc-950 text-emerald-500 font-mono text-[10px] whitespace-pre-wrap overflow-x-auto border border-white/5 shadow-inner">
                {JSON.stringify(selectedLog?.payload, null, 2)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setSelectedLog(null)} className="rounded-xl uppercase font-bold text-[10px] tracking-widest">Fechar</Button>
            {selectedLog?.status !== 'processed' && (
              <Button 
                onClick={async () => {
                  try {
                    // Trigger manual processing for this specific log if needed, 
                    // but usually queue processing is enough.
                    // For now, let's just trigger the queue.
                    handleRetryQueue();
                    setSelectedLog(null);
                  } catch (err) {}
                }}
                className="rounded-xl uppercase font-black text-[10px] tracking-widest glow-primary"
              >
                Tentar Processar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
