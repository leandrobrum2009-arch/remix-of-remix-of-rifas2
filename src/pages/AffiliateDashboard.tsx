import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAffiliateData } from "@/hooks/useAffiliate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, DollarSign, Users, MousePointer2, TrendingUp, Copy, Check, 
  PieChart, BarChart3, LayoutDashboard, Megaphone, Link as LinkIcon, Share2, Crown,
  ShoppingBag, CheckCircle2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function AffiliateDashboard() {
  const { data, isLoading } = useAffiliateData();
  const [copied, setCopied] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("home");

  const getLink = () => {
    if (!data?.affiliate?.referral_code) return "";
    const baseUrl = window.location.origin;
    if (selectedCampaign === "home") {
      return `${baseUrl}/?ref=${data.affiliate.referral_code}`;
    }
    const campaign = data.campaigns.find(c => c.id === selectedCampaign);
    return `${baseUrl}/campanha/${campaign?.slug || campaign?.id}?ref=${data.affiliate.referral_code}`;
  };

  const copyLink = () => {
    const link = getLink();
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link de afiliado copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const link = getLink();
    if (!link) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Participe da nossa Ação!',
          text: 'Confira esta campanha incrível e concorra a prêmios!',
          url: link,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') copyLink();
      }
    } else {
      copyLink();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.isAffiliate) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container pt-32 pb-20 text-center space-y-6">
          <div className="max-w-md mx-auto p-8 rounded-3xl bg-secondary/20 border border-border">
            <LayoutDashboard className="h-16 w-16 text-primary/20 mx-auto mb-4" />
            <h1 className="text-2xl font-black uppercase italic">Painel de Afiliado</h1>
            <p className="text-muted-foreground mt-2">Você ainda não é um afiliado cadastrado. Entre em contato com o administrador.</p>
            <Button className="mt-6 rounded-xl font-bold uppercase italic" onClick={() => window.location.href = "/"}>Voltar ao Início</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Prepare chart data
  const last7Days = [...Array(7)].map((_, i) => {
    const date = subDays(new Date(), i);
    const count = data.clicksHistory.filter(c => isSameDay(new Date(c.created_at), date)).length;
    return {
      name: format(date, 'dd/MM'),
      clicks: count
    };
  }).reverse();

  const totalEarnings = data.commissions.reduce((acc, comm) => acc + (Number(comm.amount) || 0), 0);
  const pendingEarnings = data.commissions.filter(c => c.status === 'pending').reduce((acc, comm) => acc + (Number(comm.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container pt-32 pb-20">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/10 border border-primary/20">
                {data.affiliate.type === 'influencer' ? <Crown className="h-8 w-8 fill-primary" /> : <Users className="h-8 w-8" />}
              </div>
              <div>
                <h1 className="text-3xl font-black uppercase italic tracking-tighter">
                  Painel do <span className="text-primary">{data.affiliate.type === 'influencer' ? 'Influenciador' : 'Afiliado'}</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20">
                    CÓDIGO: {data.affiliate.referral_code}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
                    COMISSÃO: {(data.affiliate.commission_rate * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Card className="border-border/50 bg-card/30 backdrop-blur-xl overflow-hidden rounded-3xl border-2 border-primary/10">
            <CardHeader className="bg-primary/5 border-b border-primary/10 py-4">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                <LinkIcon className="h-4 w-4" /> Gerador de Link para Divulgação
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-12 items-end">
                <div className="md:col-span-5 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Escolha o destino</label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger className="h-12 bg-secondary/50 border-border rounded-xl font-bold">
                      <SelectValue placeholder="Selecione uma campanha" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Página Inicial</SelectItem>
                      {data.campaigns?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-7 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 bg-secondary/30 border border-border/50 rounded-xl h-12 flex items-center px-4 overflow-hidden">
                    <code className="text-[11px] font-mono font-bold text-primary truncate">
                      {getLink()}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" className="h-12 w-12 rounded-xl" onClick={copyLink}>
                      {copied ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                    </Button>
                    <Button className="h-12 rounded-xl gap-2 font-black uppercase italic px-6 glow-primary" onClick={handleShare}>
                      <Share2 className="h-4 w-4" /> Divulgar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-4">
            <Card className="border-border bg-emerald-500/5 backdrop-blur-xl group hover:border-emerald-500/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-emerald-500 opacity-50" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Saldo Total</p>
                <h3 className="text-2xl font-black mt-1">R$ {totalEarnings.toFixed(2)}</h3>
              </CardContent>
            </Card>

            <Card className="border-border bg-amber-500/5 backdrop-blur-xl group hover:border-amber-500/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                    <PieChart className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Pendente</p>
                <h3 className="text-2xl font-black mt-1">R$ {pendingEarnings.toFixed(2)}</h3>
              </CardContent>
            </Card>

            <Card className="border-border bg-blue-500/5 backdrop-blur-xl group hover:border-blue-500/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <MousePointer2 className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Cliques Totais</p>
                <h3 className="text-2xl font-black mt-1">{data.totalClicks}</h3>
              </CardContent>
            </Card>

            <Card className="border-border bg-primary/5 backdrop-blur-xl group hover:border-primary/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Taxa de Conv.</p>
                <h3 className="text-2xl font-black mt-1">
                  {data.totalClicks > 0 ? ((data.commissions.length / data.totalClicks) * 100).toFixed(1) : 0}%
                </h3>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Acessos nos últimos 7 dias
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last7Days}>
                    <defs>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(var(--primary-rgb))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="rgb(var(--primary-rgb))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="var(--primary)" 
                      fillOpacity={1} 
                      fill="url(#colorClicks)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-primary" />
                  Ganhos por Campanha
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 pt-4">
                  {/* Group commissions by campaign */}
                  {Array.from(new Set(data.commissions.map(c => c.campaign_id))).map(campId => {
                    const campaignComm = data.commissions.filter(c => c.campaign_id === campId);
                    const amount = campaignComm.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
                    const title = campaignComm[0]?.campaigns?.title || "Geral / Outros";
                    
                    return (
                      <div key={campId || 'other'} className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/50 hover:border-primary/30 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground truncate max-w-[150px]">{title}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-black">{campaignComm.length} vendas</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-500">R$ {amount.toFixed(2)}</span>
                      </div>
                    );
                  })}
                  {data.commissions.length === 0 && (
                    <div className="text-center py-10 opacity-30 italic text-sm">Nenhuma venda registrada.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Vendas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.commissions.length > 0 ? data.commissions.slice(0, 5).map((comm: any) => (
                  <div key={comm.id} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/20 border border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Venda #{comm.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">{comm.campaigns?.title || 'Campanha'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-500">+ R$ {Number(comm.amount).toFixed(2)}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">{format(new Date(comm.created_at), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-10 opacity-30 italic text-sm">Nenhuma venda para exibir.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
