import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminOrders, useAdminCampaigns, useAdminUsers } from "@/hooks/useAdmin";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Download, Filter, ArrowUpRight, 
  CreditCard, Wallet, User, ShoppingBag, 
  Loader2, CheckCircle2, XCircle, Clock, 
  Users, Megaphone
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminTransactions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  
  const { data: orders, isLoading: loadingOrders } = useAdminOrders();
  const { data: campaigns } = useAdminCampaigns();
  const { data: users } = useAdminUsers();

  const filteredTransactions = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o: any) => {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        o.id.toLowerCase().includes(searchLower) ||
        (o.profiles?.name || "").toLowerCase().includes(searchLower) ||
        (o.profiles?.email || "").toLowerCase().includes(searchLower) ||
        (o.campaigns?.title || "").toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === "all" || o.payment_status === statusFilter;
      const matchesCampaign = campaignFilter === "all" || o.campaign_id === campaignFilter;
      const matchesUser = userFilter === "all" || o.user_id === userFilter;
      
      return matchesSearch && matchesStatus && matchesCampaign && matchesUser;
    });
  }, [orders, search, statusFilter, campaignFilter, userFilter]);

  const stats = useMemo(() => {
    if (!filteredTransactions) return { total: 0, paid: 0, pending: 0, revenue: 0 };
    const paid = filteredTransactions.filter((o: any) => o.payment_status === "paid");
    return {
      total: filteredTransactions.length,
      paid: paid.length,
      pending: filteredTransactions.filter((o: any) => o.payment_status === "pending").length,
      revenue: paid.reduce((acc: number, o: any) => acc + Number(o.total_amount), 0)
    };
  }, [filteredTransactions]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1"><CheckCircle2 className="h-3 w-3" /> Pago</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'cancelled':
      case 'expired':
        return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 gap-1"><XCircle className="h-3 w-3" /> {status === 'cancelled' ? 'Cancelado' : 'Expirado'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleExport = () => {
    if (!filteredTransactions.length) return;
    
    const headers = ["ID", "Data", "Cliente", "Email", "Campanha", "Valor", "Status", "Método"];
    const csvContent = [
      headers.join(","),
      ...filteredTransactions.map((tx: any) => [
        tx.id,
        format(new Date(tx.created_at), "dd/MM/yyyy HH:mm"),
        tx.profiles?.name || "Convidado",
        tx.profiles?.email || "—",
        tx.campaigns?.title || "—",
        tx.total_amount,
        tx.payment_status,
        tx.payment_provider || "PIX"
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `transacoes_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = loadingOrders;

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" /> Transações Financeiras
          </h1>
          <p className="text-muted-foreground mt-1">Filtragem avançada por campanha, usuário e status.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2"
            onClick={handleExport}
            disabled={filteredTransactions.length === 0}
          >
            <Download className="h-3 w-3" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {[
          { label: "Receita (Filtrada)", val: `R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Pagas", val: stats.paid, icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Pendentes", val: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Total Selecionado", val: stats.total, icon: ShoppingBag, color: "text-primary", bg: "bg-primary/10" },
        ].map((stat, i) => (
          <Card key={i} className="border-border bg-card/50 backdrop-blur-xl shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-black text-foreground">{stat.val}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-xl shadow-md overflow-hidden">
        <CardHeader className="pb-6 border-b border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="ID, Cliente, Email..." 
                  className="pl-10 h-10 rounded-xl border-border bg-background"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Campaign Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Campanha</label>
              <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-background">
                  <Megaphone className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Todas as campanhas" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="all">Todas as campanhas</SelectItem>
                  {campaigns?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Usuário</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-background">
                  <Users className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users?.map((u: any) => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-background">
                  <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="paid">Pagas</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6 py-4">Data / ID</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Cliente</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Campanha</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Valor</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Método</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-muted-foreground italic uppercase text-xs">
                      Nenhuma transação encontrada para os filtros selecionados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx: any) => (
                    <TableRow key={tx.id} className="border-border hover:bg-secondary/10 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-foreground">
                            {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground uppercase">
                            #{tx.id.substring(0, 8)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground truncate max-w-[120px]">{tx.profiles?.name || "Convidado"}</span>
                            <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">{tx.profiles?.email || "—"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col max-w-[150px]">
                          <span className="text-[10px] font-bold text-foreground truncate">{tx.campaigns?.title || "—"}</span>
                          <span className="text-[9px] text-muted-foreground uppercase">{tx.quantity} títulos</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-black text-foreground">
                          R$ {Number(tx.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-tighter">
                          {tx.payment_provider || 'PIX'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tx.payment_status)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => window.open(`/checkout/${tx.id}`, '_blank')}
                          title="Ver detalhes do pedido"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
