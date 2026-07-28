import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShieldCheck, AlertCircle, CheckCircle2, XCircle, 
  Search, Calendar, Clock, User, Globe, Info, Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminAuditLogs() {
  const [search, setSearch] = useState("");
  const [eventFilter, setFilter] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["auth-audit-logs", eventFilter, search],
    queryFn: async () => {
      let query = supabase
        .from('auth_audit_logs')
        .select('*, profiles!user_id(name, email)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventFilter !== 'all') {
        query = query.eq('event', eventFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const getEventBadge = (event: string) => {
    switch (event) {
      case 'login': return <Badge className="bg-blue-500/10 text-blue-500 border-none">LOGIN</Badge>;
      case 'logout': return <Badge className="bg-slate-500/10 text-slate-500 border-none">LOGOUT</Badge>;
      case 'admin_access': return <Badge className="bg-purple-500/10 text-purple-500 border-none">ACESSO ADMIN</Badge>;
      case 'unauthorized_attempt': return <Badge variant="destructive" className="animate-pulse">TENTATIVA NÃO AUTORIZADA</Badge>;
      case 'session_refresh': return <Badge className="bg-emerald-500/10 text-emerald-500 border-none">SESSÃO REVALIDADA</Badge>;
      default: return <Badge variant="outline">{event}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'success' 
      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 
      : <XCircle className="h-4 w-4 text-rose-500" />;
  };

  const filteredLogs = logs?.filter(log => 
    log.profiles?.name?.toLowerCase().includes(search.toLowerCase()) ||
    log.profiles?.email?.toLowerCase().includes(search.toLowerCase()) ||
    log.resource?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="mb-8 space-y-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
            Logs de Autorização
          </h1>
        </div>
        <p className="text-muted-foreground text-sm font-medium">Histórico de acessos e tentativas de segurança.</p>
      </div>

      <Card className="border-border bg-card shadow-sm mb-6">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por usuário ou recurso..." 
                className="pl-10 h-11 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              {['all', 'login', 'admin_access', 'unauthorized_attempt'].map(f => (
                <Button 
                  key={f}
                  variant={eventFilter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className="rounded-full text-[10px] font-bold uppercase tracking-widest px-4 h-9"
                >
                  {f === 'all' ? 'Tudo' : f.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-secondary/50 text-[10px] text-muted-foreground uppercase font-black tracking-widest border-b border-border">
                  <tr>
                    <th className="px-4 py-4">Evento / Status</th>
                    <th className="px-4 py-4">Usuário</th>
                    <th className="px-4 py-4">Recurso / IP</th>
                    <th className="px-4 py-4">Data / Hora</th>
                    <th className="px-4 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-20 text-center text-muted-foreground animate-pulse font-bold uppercase text-xs">
                        Carregando logs de segurança...
                      </td>
                    </tr>
                  ) : filteredLogs?.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/20 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          {getEventBadge(log.event)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">
                            {log.profiles?.name || 'Sistema / Anon'}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {log.profiles?.email || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono text-primary font-bold">
                            {log.resource || 'N/A'}
                          </span>
                          <span className="text-[9px] text-muted-foreground truncate max-w-[200px]" title={log.user_agent}>
                            {log.user_agent?.split(') ')[1] || log.user_agent}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-foreground">
                            {format(new Date(log.created_at), "dd 'de' MMM", { locale: ptBR })}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(log.created_at), "HH:mm:ss")}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredLogs?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-xs font-medium italic">
                        Nenhum log encontrado para estes filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border bg-primary/5 border-primary/20 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Monitoramento Ativo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-[10px] text-muted-foreground leading-relaxed">
            O sistema registra automaticamente todas as tentativas de acesso às áreas restritas. 
            Tentativas repetidas de <strong>unauthorized_attempt</strong> podem indicar atividade suspeita. 
            Recomendamos monitorar este log regularmente.
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Inteligência de Sessão</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-[10px] text-muted-foreground leading-relaxed">
            As sessões são revalidadas automaticamente para garantir que usuários removidos percam o acesso instantaneamente. 
            Cada revalidação bem-sucedida é registrada como <strong>session_refresh</strong>.
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
