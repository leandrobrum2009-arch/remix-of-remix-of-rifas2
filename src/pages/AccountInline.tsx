import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User, Wallet, Ticket, Trophy, Bell, LogOut, ArrowDownLeft, ArrowUpRight,
  Plus, Minus, ChevronRight, ChevronDown, Home, Gift, Settings, Copy, Share2,
  Loader2, ShieldCheck, Camera, MessageCircle, Sparkles, Award, CheckCircle2,
  XCircle, Pencil, Hash, TrendingUp, Users, DollarSign, Clock, Megaphone, Crown,
  Link as LinkIcon, Info
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useUserOrders, useUserWalletTransactions, useUserNotifications,
  useUserPrizesByCampaign, useSiteSettings, markNotificationsAsRead, useCampaigns,
} from "@/hooks/useData";
import { useAffiliateData } from "@/hooks/useAffiliate";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SEO } from "@/components/SEO";
import HeaderInline from "@/components/HeaderInline";
import FooterInline from "@/components/inline/FooterInline";
import { DepositModal } from "@/components/DepositModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { compressImage } from "@/lib/image-upload";
import { maskCPF, maskPhone } from "@/lib/validations";

type TabKey = "home" | "bilhetes" | "premios" | "afiliado" | "perfil";

const fmtBRL = (n: number | string | null | undefined) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AccountInline() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isAdmin } = useIsAdmin();
  const { data: siteSettings } = useSiteSettings();

  const { data: orders } = useUserOrders(user?.id || "");
  const { data: txs } = useUserWalletTransactions(user?.id || "");
  const { data: notifications } = useUserNotifications(user?.id || "");
  const { data: prizesData } = useUserPrizesByCampaign(user?.id || "");
  const { data: affiliateData } = useAffiliateData();
  const { data: allCampaigns } = useCampaigns();
  const [nextLuckyHour, setNextLuckyHour] = useState<any>(null);

  const [profile, setProfile] = useState<any>(null);
  const [affiliate, setAffiliate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("home");
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [expandedTicketOrder, setExpandedTicketOrder] = useState<string | null>(null);
  const [expandedPrizeCamp, setExpandedPrizeCamp] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      const { data: a } = await supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
      setProfile(p); setAffiliate(a); setLoading(false);
    })();
  }, [user]);

  // Insights: next lucky hour across active campaigns
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("lucky_hours_public")
        .select("*, campaigns(title, slug)")
        .gte("draw_time", new Date().toISOString())
        .order("draw_time", { ascending: true })
        .limit(1);
      setNextLuckyHour(data?.[0] || null);
    })();
  }, []);

  // Real-time: refresh affiliate commissions when new sales happen
  useEffect(() => {
    const affId = affiliateData?.affiliate?.id;
    if (!affId) return;
    const ch = supabase
      .channel(`aff-commissions-${affId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "affiliate_commissions", filter: `affiliate_id=eq.${affId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["affiliate-data", user?.id] });
          toast.success("Nova venda registrada!");
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [affiliateData?.affiliate?.id, user?.id, queryClient]);

  const balance = Number(profile?.balance || 0);
  const unreadCount = (notifications || []).filter((n: any) => !n.read).length;
  const prizes = Array.isArray(prizesData) ? prizesData : [];
  const paidOrders = (orders || []).filter((o: any) => o.payment_status === "paid");

  // Group paid orders by campaign for cleaner ticket list
  const ordersByCampaign = paidOrders.reduce((acc: any[], o: any) => {
    const existing = acc.find((x) => x.campaign_id === o.campaign_id);
    if (existing) {
      existing.orders.push(o);
      existing.totalTickets += (o.tickets || []).length;
      existing.totalSpent += Number(o.total || 0);
    } else {
      acc.push({
        campaign_id: o.campaign_id,
        campaign: o.campaigns,
        orders: [o],
        totalTickets: (o.tickets || []).length,
        totalSpent: Number(o.total || 0),
      });
    }
    return acc;
  }, []);

  const supportWhats = (siteSettings as any)?.support_whatsapp
    ? String((siteSettings as any).support_whatsapp).replace(/\D/g, "")
    : "";

  const claimPrize = (campaignTitle: string, prizeLabel: string) => {
    if (!supportWhats) {
      toast.error("Suporte indisponível. Tente novamente em instantes.");
      return;
    }
    const msg = encodeURIComponent(
      `Olá! Sou ${profile?.name || user?.email}. Quero reivindicar meu prêmio "${prizeLabel}" da campanha "${campaignTitle}".`
    );
    window.open(`https://wa.me/${supportWhats}?text=${msg}`, "_blank");
  };

  const copyReferral = async () => {
    const code = affiliateData?.affiliate?.referral_code || affiliate?.referral_code;
    if (!code) return toast.error("Você ainda não possui código de indicação.");
    const link = `${window.location.origin}/?ref=${code}`;
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const shareReferral = async () => {
    const code = affiliateData?.affiliate?.referral_code || affiliate?.referral_code;
    if (!code) return;
    const link = `${window.location.origin}/?ref=${code}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Participe da ação!", url: link }); }
      catch { copyReferral(); }
    } else copyReferral();
  };

  const isAffiliate = !!affiliateData?.isAffiliate;
  const aff = affiliateData?.affiliate;
  const commissions = affiliateData?.commissions || [];
  const totalEarnings = commissions.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const pendingEarnings = commissions.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const totalClicks = affiliateData?.totalClicks || 0;

  // Upcoming campaigns: active, future draw, soonest first
  const upcomingCampaigns = (allCampaigns || [])
    .filter((c: any) => c.status === "active" && c.draw_date && new Date(c.draw_date) > new Date())
    .sort((a: any, b: any) => new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime())
    .slice(0, 3);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markNotificationsAsRead(user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
    toast.success("Notificações marcadas como lidas");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Minha Conta" description="Painel do usuário" />
      <HeaderInline />

      <main className="pt-[calc(var(--header-height,64px)+0.75rem)] pb-32 px-4 space-y-5">
        {/* USER CARD */}
        <section className="rounded-2xl bg-gradient-to-br from-primary/15 via-card to-card border border-border p-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditOpen(true)}
              className="relative h-14 w-14 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black text-xl shrink-0 overflow-hidden ring-2 ring-primary/30"
              aria-label="Editar perfil"
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                : (profile?.name || user?.email || "U")[0].toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Camera className="h-3 w-3" />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black truncate">{profile?.name || user?.email}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => setEditOpen(true)}
              className="h-9 w-9 rounded-full bg-background/60 border border-border flex items-center justify-center text-muted-foreground hover:text-primary"
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 rounded-xl bg-background/60 border border-border p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Seu saldo</p>
            <p className="text-3xl font-black mt-1">{fmtBRL(balance)}</p>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Button
                onClick={() => setDepositOpen(true)}
                className="h-12 rounded-xl text-sm font-black gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all"
              >
                <Plus className="h-4 w-4" /> Depositar
              </Button>
              <Button
                onClick={() => setWithdrawOpen(true)}
                variant="outline"
                className="h-12 rounded-xl text-sm font-black gap-2"
              >
                <Minus className="h-4 w-4" /> Sacar
              </Button>
            </div>
            <DepositBonusCTA settings={siteSettings} onDeposit={() => setDepositOpen(true)} />
          </div>
        </section>

        {tab === "home" && (
          <>
            {/* AFFILIATE EVIDENCE CARD */}
            {isAffiliate && (
              <section className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <p className="text-sm font-black uppercase tracking-wide flex-1">
                    {aff?.type === "influencer" ? "Painel Influenciador" : "Painel Afiliado"}
                  </p>
                  <Badge className="text-[10px] font-black bg-primary/20 text-primary border-0">
                    {Math.round((aff?.commission_rate || 0) * 100)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Ganhos" value={fmtBRL(totalEarnings)} accent="emerald" />
                  <MiniStat label="Pendente" value={fmtBRL(pendingEarnings)} accent="amber" />
                  <MiniStat label="Cliques" value={String(totalClicks)} accent="primary" />
                </div>
                <div className="rounded-xl bg-background/60 border border-border p-2.5 flex items-center gap-2">
                  <LinkIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <code className="text-[11px] font-mono font-bold truncate flex-1">
                    /?ref={aff?.referral_code}
                  </code>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={shareReferral} className="h-11 rounded-xl text-xs font-black gap-1.5">
                    <Share2 className="h-4 w-4" /> Divulgar
                  </Button>
                  <Button onClick={() => setTab("afiliado")} variant="outline" className="h-11 rounded-xl text-xs font-black gap-1.5">
                    <TrendingUp className="h-4 w-4" /> Ver vendas
                  </Button>
                </div>
              </section>
            )}

            {/* QUICK STATS */}
            <section className="grid grid-cols-3 gap-2.5">
              <StatCard icon={Ticket} label="Bilhetes" value={paidOrders.length} />
              <StatCard icon={Trophy} label="Prêmios" value={prizes.length} />
              <StatCard icon={Bell} label="Avisos" value={unreadCount} highlight={unreadCount > 0} />
            </section>

            {/* INSIGHTS */}
            {(upcomingCampaigns.length > 0 || nextLuckyHour) && (
              <section className="rounded-2xl bg-card border border-border p-4 space-y-2.5">
                <h3 className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Para você
                </h3>
                {nextLuckyHour && (
                  <Link
                    to={`/campanha/${nextLuckyHour.campaigns?.slug || nextLuckyHour.campaign_id}`}
                    className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3"
                  >
                    <div className="h-9 w-9 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-yellow-500">Próxima Hora Premiada</p>
                      <p className="text-xs font-bold truncate">{nextLuckyHour.campaigns?.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(nextLuckyHour.draw_time), "dd MMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                )}
                {upcomingCampaigns.map((c: any) => (
                  <Link
                    key={c.id}
                    to={`/campanha/${c.slug || c.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
                  >
                    {c.image_url && <img src={c.image_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{c.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Sorteio {format(new Date(c.draw_date), "dd MMM", { locale: ptBR })} · {fmtBRL(c.ticket_price)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </section>
            )}

            {/* NOTIFICATIONS */}
            <section className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black uppercase tracking-wide">Notificações</h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-[11px] font-bold text-primary">
                    Marcar todas
                  </button>
                )}
              </div>
              {(notifications || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma notificação.</p>
              ) : (
                <div className="space-y-2">
                  {(notifications || []).slice(0, 4).map((n: any) => (
                    <div key={n.id} className={`rounded-xl p-3 border ${n.read ? "border-border bg-background/40" : "border-primary/30 bg-primary/5"}`}>
                      <p className="text-sm font-bold">{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* RECENT TRANSACTIONS */}
            <section className="rounded-2xl bg-card border border-border p-4">
              <h3 className="text-sm font-black uppercase tracking-wide mb-3">Últimas movimentações</h3>
              {(txs || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sem movimentações ainda.</p>
              ) : (
                <div className="space-y-2">
                  {(txs || []).slice(0, 5).map((t: any) => {
                    const credit = Number(t.amount) >= 0;
                    const isBonus = t.type === "bonus";
                    const Icon = isBonus ? Gift : credit ? ArrowDownLeft : ArrowUpRight;
                    const label = isBonus
                      ? (t.description || "Bônus de depósito")
                      : (t.description || t.type || "Transação");
                    return (
                      <div key={t.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isBonus ? "bg-amber-500/15 text-amber-500 ring-2 ring-amber-500/30" : credit ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold truncate">{label}</p>
                            {isBonus && (
                              <Badge className="text-[9px] font-black bg-amber-500/20 text-amber-500 border-0 px-1.5 py-0 h-4">BÔNUS</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(t.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <p className={`text-sm font-black ${isBonus ? "text-amber-500" : credit ? "text-emerald-500" : "text-rose-500"}`}>
                          {credit ? "+" : ""}{fmtBRL(t.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {tab === "bilhetes" && (
          <section className="rounded-2xl bg-card border border-border p-4">
            <h3 className="text-sm font-black uppercase tracking-wide mb-3">Meus bilhetes</h3>
            {ordersByCampaign.length === 0 ? (
              <EmptyState icon={Ticket} text="Você ainda não tem bilhetes pagos." cta="Ver campanhas" to="/" />
            ) : (
              <div className="space-y-2.5">
                {ordersByCampaign.map((group: any) => {
                  const camp = group.campaign;
                  const isOpen = expandedTicketOrder === group.campaign_id;
                  const allTickets = group.orders.flatMap((o: any) => o.tickets || []);
                  const drawNumber = camp?.draw_number;
                  const drawn = camp?.status === "finished" && drawNumber != null;
                  const winningTicket = drawn ? allTickets.find((t: any) => t.number === drawNumber) : null;
                  const campPrizes = prizes.find((p: any) => p.campaign?.id === group.campaign_id);
                  const extraPrizes = [
                    ...(campPrizes?.spins || []).map((s: any) => ({ kind: "Roleta", label: s.prize_label, value: s.prize_value })),
                    ...(campPrizes?.scratches || []).map((s: any) => ({ kind: "Raspadinha", label: s.prize_label, value: s.prize_value })),
                    ...(campPrizes?.boxes || []).map((b: any) => ({ kind: "Caixa", label: b.prize_title, value: b.prize_value })),
                  ];

                  return (
                    <div key={group.campaign_id} className="rounded-xl border border-border bg-background/40 overflow-hidden">
                      <button
                        onClick={() => setExpandedTicketOrder(isOpen ? null : group.campaign_id)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        {camp?.image_url && (
                          <img src={camp.image_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{camp?.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {group.totalTickets} bilhete(s) · {fmtBRL(group.totalSpent)}
                          </p>
                        </div>
                        {drawn && (
                          <Badge className={`text-[9px] font-black ${winningTicket ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                            {winningTicket ? "GANHOU" : "FINALIZADA"}
                          </Badge>
                        )}
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isOpen && (
                        <div className="border-t border-border p-3 space-y-3 bg-card/40">
                          {/* DRAW RESULT PANEL */}
                          {drawn ? (
                            <div className={`rounded-xl p-3 border ${winningTicket ? "border-emerald-500/50 bg-emerald-500/10" : "border-border bg-background/40"}`}>
                              <div className="flex items-center gap-2 mb-1">
                                {winningTicket
                                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  : <XCircle className="h-4 w-4 text-muted-foreground" />}
                                <p className="text-[11px] font-black uppercase tracking-wider">
                                  {winningTicket ? "Você foi sorteado!" : "Sorteio realizado"}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Número sorteado: <span className="font-black text-foreground text-base ml-1">#{drawNumber}</span>
                              </p>
                              {camp?.draw_date && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {format(new Date(camp.draw_date), "dd 'de' MMM yyyy", { locale: ptBR })}
                                </p>
                              )}
                              {winningTicket && (
                                <Button
                                  onClick={() => claimPrize(camp?.title, `Prêmio principal (nº ${drawNumber})`)}
                                  className="mt-3 w-full h-10 rounded-lg text-xs font-black gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                                >
                                  <MessageCircle className="h-4 w-4" /> Reivindicar prêmio
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-xl p-3 border border-border bg-background/40">
                              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                                Aguardando sorteio
                              </p>
                            </div>
                          )}

                          {/* TICKET NUMBERS */}
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                              <Hash className="h-3 w-3" /> Seus números ({allTickets.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                              {allTickets.map((t: any, i: number) => {
                                const isWin = drawn && t.number === drawNumber;
                                return (
                                  <span
                                    key={`${t.number}-${i}`}
                                    className={`text-[11px] font-black px-2 py-1 rounded-md ${
                                      isWin
                                        ? "bg-emerald-500 text-white"
                                        : t.is_lucky
                                          ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/40"
                                          : "bg-background border border-border"
                                    }`}
                                  >
                                    {String(t.number).padStart(String(camp?.total_tickets || 1000).length, "0")}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* EXTRA PRIZES IN THIS CAMPAIGN */}
                          {extraPrizes.length > 0 && (
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> Prêmios extras nesta ação
                              </p>
                              <div className="space-y-1.5">
                                {extraPrizes.map((p, i) => (
                                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-background/40 p-2">
                                    <Badge variant="outline" className="text-[9px] font-black shrink-0">{p.kind}</Badge>
                                    <p className="text-xs font-bold truncate flex-1">{p.label}</p>
                                    {Number(p.value) > 0 && (
                                      <p className="text-xs font-black text-emerald-500 shrink-0">{fmtBRL(p.value)}</p>
                                    )}
                                    <button
                                      onClick={() => claimPrize(camp?.title, p.label)}
                                      className="text-primary"
                                      aria-label="Reivindicar"
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <Link
                            to={`/campanha/${camp?.slug || group.campaign_id}`}
                            className="block text-center text-[11px] font-black uppercase tracking-wider text-primary py-1"
                          >
                            Ver campanha completa →
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "premios" && (
          <section className="rounded-2xl bg-card border border-border p-4">
            <h3 className="text-sm font-black uppercase tracking-wide mb-3">Meus prêmios</h3>
            {prizes.length === 0 ? (
              <EmptyState icon={Trophy} text="Nenhum prêmio ainda. Boa sorte!" cta="Jogar agora" to="/roleta-premiada" />
            ) : (
              <div className="space-y-2.5">
                {prizes.map((p: any) => {
                  const isOpen = expandedPrizeCamp === p.campaign?.id;
                  const items = [
                    ...(p.mainPrize ? [{ kind: "Sorteio", label: `Número premiado #${p.mainPrize.number}`, value: 0 }] : []),
                    ...(p.spins || []).map((s: any) => ({ kind: "Roleta", label: s.prize_label, value: s.prize_value })),
                    ...(p.scratches || []).map((s: any) => ({ kind: "Raspadinha", label: s.prize_label, value: s.prize_value })),
                    ...(p.boxes || []).map((b: any) => ({ kind: "Caixa", label: b.prize_title, value: b.prize_value })),
                  ];
                  return (
                    <div key={p.campaign?.id} className="rounded-xl border border-border bg-background/40 overflow-hidden">
                      <button
                        onClick={() => setExpandedPrizeCamp(isOpen ? null : p.campaign?.id)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        <Award className="h-5 w-5 text-yellow-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{p.campaign?.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {items.length} prêmio(s) · {fmtBRL(p.total)}
                          </p>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-border p-3 space-y-1.5 bg-card/40">
                          {items.map((it, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-background/40 p-2">
                              <Badge variant="outline" className="text-[9px] font-black shrink-0">{it.kind}</Badge>
                              <p className="text-xs font-bold truncate flex-1">{it.label}</p>
                              {Number(it.value) > 0 && (
                                <p className="text-xs font-black text-emerald-500 shrink-0">{fmtBRL(it.value)}</p>
                              )}
                              <button
                                onClick={() => claimPrize(p.campaign?.title, it.label)}
                                className="text-primary"
                                aria-label="Reivindicar"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          <Button
                            onClick={() => claimPrize(p.campaign?.title, `Todos os prêmios (${items.length})`)}
                            className="mt-2 w-full h-10 rounded-lg text-xs font-black gap-2"
                          >
                            <MessageCircle className="h-4 w-4" /> Falar com suporte
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "afiliado" && isAffiliate && (
          <section className="space-y-3">
            {/* HERO CARD */}
            <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <p className="text-sm font-black uppercase tracking-wide flex-1">Seu link de afiliado</p>
              </div>
              <div className="rounded-xl bg-background/60 border border-border p-3 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary shrink-0" />
                <code className="text-xs font-mono font-bold truncate flex-1">
                  {window.location.origin}/?ref={aff?.referral_code}
                </code>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={shareReferral} className="h-12 rounded-xl text-sm font-black gap-2">
                  <Share2 className="h-4 w-4" /> Divulgar
                </Button>
                <Button onClick={copyReferral} variant="outline" className="h-12 rounded-xl text-sm font-black gap-2">
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <DollarSign className="h-4 w-4 text-emerald-500 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total ganho</p>
                <p className="text-lg font-black text-emerald-500 mt-0.5">{fmtBRL(totalEarnings)}</p>
              </div>
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                <Clock className="h-4 w-4 text-amber-500 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pendente</p>
                <p className="text-lg font-black text-amber-500 mt-0.5">{fmtBRL(pendingEarnings)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <Users className="h-4 w-4 text-primary mb-2" />
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Cliques</p>
                <p className="text-lg font-black mt-0.5">{totalClicks}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <TrendingUp className="h-4 w-4 text-primary mb-2" />
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Vendas</p>
                <p className="text-lg font-black mt-0.5">{commissions.length}</p>
              </div>
            </div>

            {/* SALES LIST */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <h3 className="text-sm font-black uppercase tracking-wide mb-3 flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" /> Vendas em tempo real
              </h3>
              {commissions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Ainda sem vendas. Divulgue seu link!
                </p>
              ) : (
                <div className="space-y-2">
                  {commissions.slice(0, 20).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${c.status === "paid" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{c.campaigns?.title || "Campanha"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(c.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-500">+{fmtBRL(c.amount)}</p>
                        <p className="text-[9px] font-black uppercase text-muted-foreground">{c.status === "paid" ? "Pago" : "Pendente"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RULES */}
            <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
              <h3 className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" /> Regras do programa
              </h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                <li>• Você ganha <span className="font-black text-foreground">{Math.round((aff?.commission_rate || 0) * 100)}%</span> sobre cada venda paga feita pelo seu link.</li>
                <li>• Comissões são liberadas após a confirmação do pagamento PIX do comprador.</li>
                <li>• O saldo de afiliado é creditado em sua carteira e pode ser sacado conforme as regras de saque.</li>
                <li>• Divulgação enganosa, spam ou auto-compras podem suspender sua conta de afiliado.</li>
              </ul>
            </div>
          </section>
        )}

        {tab === "perfil" && (
          <section className="space-y-3">
            <Button
              onClick={() => setEditOpen(true)}
              className="w-full h-12 rounded-xl gap-2 text-sm font-black"
            >
              <Pencil className="h-4 w-4" /> Editar perfil
            </Button>

            <div className="rounded-2xl bg-card border border-border p-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Nome</p>
              <p className="text-sm font-bold">{profile?.name || "—"}</p>
            </div>
            <div className="rounded-2xl bg-card border border-border p-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">E-mail</p>
              <p className="text-sm font-bold break-all">{user?.email}</p>
            </div>
            <div className="rounded-2xl bg-card border border-border p-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">CPF</p>
              <p className="text-sm font-bold">{profile?.cpf || "—"}</p>
            </div>
            <div className="rounded-2xl bg-card border border-border p-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">WhatsApp</p>
              <p className="text-sm font-bold">{profile?.phone || "—"}</p>
            </div>

            {affiliate?.referral_code && (
              <div className="rounded-2xl bg-primary/5 border border-primary/30 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Seu código de indicação</p>
                <p className="text-base font-black mt-1">{affiliate.referral_code}</p>
                <Button onClick={copyReferral} variant="outline" className="mt-3 w-full h-11 rounded-xl gap-2 text-xs font-black">
                  <Copy className="h-4 w-4" /> Copiar link
                </Button>
              </div>
            )}

            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" className="w-full h-12 rounded-xl gap-2 text-sm font-black">
                  <ShieldCheck className="h-4 w-4" /> Painel Admin
                </Button>
              </Link>
            )}

            <Button
              variant="outline"
              className="w-full h-12 rounded-xl gap-2 text-sm font-black text-rose-500 hover:bg-rose-500/10 hover:text-rose-500 border-rose-500/30"
              onClick={async () => { await signOut(); navigate("/"); }}
            >
              <LogOut className="h-4 w-4" /> Sair da conta
            </Button>
          </section>
        )}
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-background/95 backdrop-blur-xl border-t border-border">
        <div className={`grid ${isAffiliate ? "grid-cols-5" : "grid-cols-4"}`}>
          <TabButton icon={Home} label="Início" active={tab === "home"} onClick={() => setTab("home")} />
          <TabButton icon={Ticket} label="Bilhetes" active={tab === "bilhetes"} onClick={() => setTab("bilhetes")} />
          <TabButton icon={Trophy} label="Prêmios" active={tab === "premios"} onClick={() => setTab("premios")} />
          {isAffiliate && (
            <TabButton icon={Crown} label="Afiliado" active={tab === "afiliado"} onClick={() => setTab("afiliado")} />
          )}
          <TabButton icon={User} label="Perfil" active={tab === "perfil"} onClick={() => setTab("perfil")} />
        </div>
      </nav>

      <DepositModal
        isOpen={depositOpen}
        onOpenChange={setDepositOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["user-wallet-transactions", user?.id] })}
      />
      <WithdrawModal
        isOpen={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        userBalance={balance}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["user-wallet-transactions", user?.id] })}
      />

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        userId={user?.id || ""}
        onSaved={(p) => {
          setProfile(p);
          queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
        }}
      />
    </div>
  );
}

function MiniStat({ label, value, accent = "primary" }: { label: string; value: string; accent?: "emerald" | "amber" | "primary" }) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    primary: "text-primary",
  };
  return (
    <div className="rounded-xl bg-background/60 border border-border p-2.5 text-center">
      <p className={`text-sm font-black truncate ${colors[accent]}`}>{value}</p>
      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, highlight }: any) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <Icon className={`h-5 w-5 mx-auto mb-1.5 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
      <p className="text-lg font-black leading-none">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function TabButton({ icon: Icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 py-3 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
    </button>
  );
}

function EmptyState({ icon: Icon, text, cta, to }: any) {
  return (
    <div className="py-8 text-center">
      <Icon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground mb-4">{text}</p>
      <Link to={to}>
        <Button className="h-11 rounded-xl px-6 text-xs font-black uppercase tracking-wider">{cta}</Button>
      </Link>
    </div>
  );
}

function EditProfileDialog({
  open, onOpenChange, profile, userId, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: any;
  userId: string;
  onSaved: (p: any) => void;
}) {
  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [cpf, setCpf] = useState(profile?.cpf || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(profile?.name || "");
      setPhone(profile?.phone || "");
      setCpf(profile?.cpf || "");
      setAvatarUrl(profile?.avatar_url || "");
    }
  }, [open, profile]);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Imagem inválida (JPG, PNG, WebP ou GIF).");
      return;
    }
    setUploading(true);
    try {
      const processed = await compressImage(file);
      if (processed.size > 5 * 1024 * 1024) throw new Error("Imagem maior que 5MB.");
      const ext = processed.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, processed, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(publicUrl);
      toast.success("Foto carregada. Clique em salvar para aplicar.");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          name: name.trim() || null,
          phone: phone.replace(/\D/g, "") || null,
          cpf: cpf.replace(/\D/g, "") || null,
          avatar_url: avatarUrl || null,
        })
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw error;
      onSaved(data);
      toast.success("Perfil atualizado!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">Editar perfil</DialogTitle>
          <DialogDescription className="text-xs">Atualize seus dados pessoais e foto.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-24 w-24 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black text-3xl overflow-hidden ring-2 ring-primary/30">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                : (name || "U")[0]?.toUpperCase()}
              {uploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            <label className="cursor-pointer text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1">
              <Camera className="h-4 w-4" /> Trocar foto
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} disabled={uploading} />
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip-name" className="text-xs font-black uppercase tracking-wider">Nome</Label>
            <Input id="ip-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip-phone" className="text-xs font-black uppercase tracking-wider">WhatsApp</Label>
            <Input
              id="ip-phone"
              value={maskPhone(phone)}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip-cpf" className="text-xs font-black uppercase tracking-wider">CPF</Label>
            <Input
              id="ip-cpf"
              value={maskCPF(cpf)}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11 rounded-xl text-xs font-black">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading} className="h-11 rounded-xl text-xs font-black">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepositBonusCTA({ settings, onDeposit }: { settings: any; onDeposit: () => void }) {
  const raw = settings?.deposit_bonus_tiers;
  let tiers: { min: number; bonus: number }[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      tiers = parsed
        .map((t: any) => ({ min: Number(t.min), bonus: Number(t.bonus) }))
        .filter((t) => !isNaN(t.min) && !isNaN(t.bonus) && t.bonus > 0)
        .sort((a, b) => b.min - a.min);
    }
  } catch {
    tiers = [];
  }
  if (!tiers.length) return null;
  const top = tiers[0];
  return (
    <button
      onClick={onDeposit}
      className="group mt-3 w-full flex items-center gap-3 rounded-xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent p-3 text-left hover:border-emerald-500/80 hover:from-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all"
    >
      <div className="h-9 w-9 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 ring-2 ring-emerald-500/30 group-hover:ring-emerald-500/60 group-hover:scale-110 transition-all">
        <Gift className="h-5 w-5 text-emerald-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
          <Sparkles className="h-3 w-3 animate-pulse" /> Bônus por depósito
        </p>
        <p className="text-xs font-bold text-foreground truncate">
          Recarregue R$ {top.min} e ganhe <span className="text-emerald-500">+R$ {top.bonus}</span> de saldo grátis
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-emerald-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}