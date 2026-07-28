import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
   User, LogOut, Trophy, History, Coins, Activity, Camera,
   Wallet, Bell, TrendingUp, CreditCard, Star, Gift,
   Zap, Ticket, ArrowUpRight, ArrowDownLeft, ChevronRight, RotateCw, Crown,
    Package, ShoppingBag, Users, CheckCircle2, Lock, ChevronLeft, Copy, Share2
} from "lucide-react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { compressImage } from "@/lib/image-upload";

import { useAuth } from "@/contexts/AuthContext";
 import { 
   useUserOrders, 
   useUserWalletTransactions, 
   useUserAchievements, 
   useUserRewards,
   useRanking,
    useUserNotifications,
    useUserSpins,
    useUserMysteryBoxWins,
    markNotificationsAsRead,
    useUserReferrals,
    useAffiliateCommissions,
    useSiteSettings,
    useUserPrizesByCampaign
 } from "@/hooks/useData";
 import { useIsAdmin } from "@/hooks/useAdmin";
 import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UserRanking from "@/components/UserRanking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { maskCPF, maskPhone, validateCPF, validatePhone } from "@/lib/validations";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";
import { DepositModal } from "@/components/DepositModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { PaymentModal } from "@/components/PaymentModal";

 export default function Account() {
   const { user, signOut } = useAuth();
   const { data: orders } = useUserOrders(user?.id || "");
   const { data: spins } = useUserSpins(user?.id || "");
   const { data: boxWins } = useUserMysteryBoxWins(user?.id || "");
   const { data: txs } = useUserWalletTransactions(user?.id || "");
   const { data: achievements } = useUserAchievements(user?.id || "");
   const { data: ranking } = useRanking(10);
   const { data: notifications } = useUserNotifications(user?.id || "");
    const { data: rewards } = useUserRewards(user?.id || "");

   const [spinsPage, setSpinsPage] = useState(1);
   const [boxesPage, setBoxesPage] = useState(1);
   const [ordersPage, setOrdersPage] = useState(1);
   const [txsPage, setTxsPage] = useState(1);
   const [commissionsPage, setCommissionsPage] = useState(1);
   const ITEMS_PER_PAGE = 5;
 
   const [profile, setProfile] = useState<any>(null);
   const [affiliate, setAffiliate] = useState<any>(null);
    const { data: referrals } = useUserReferrals(affiliate?.referral_code || "");
    const { data: commissions } = useAffiliateCommissions(affiliate?.id || "");
    const { data: siteSettings } = useSiteSettings();

   const [isLoading, setIsLoading] = useState(true);
   const [isDepositOpen, setIsDepositOpen] = useState(false);
   const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
   const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [isCpfValid, setIsCpfValid] = useState(true);
  const [isPhoneValid, setIsPhoneValid] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

   const [activeTab, setActiveTab] = useState(() => {
     const hash = window.location.hash.replace('#', '');
     const validTabs = ["overview", "tickets", "notifications", "finance", "ranking", "achievements", "games", "affiliate", "premios"];
     return validTabs.includes(hash) ? hash : "overview";
   });
 
   useEffect(() => {
     const handleHashChange = () => {
       const hash = window.location.hash.replace('#', '');
      const validTabs = ["overview", "tickets", "notifications", "finance", "ranking", "achievements", "games", "affiliate", "premios"];
       if (validTabs.includes(hash)) {
         setActiveTab(hash);
       }
     };
     window.addEventListener('hashchange', handleHashChange);
     return () => window.removeEventListener('hashchange', handleHashChange);
   }, []);
 
   useEffect(() => {
     if (user) {
       const fetchData = async () => {
          const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
          setProfile(p);
          if (p?.cpf) setIsCpfValid(validateCPF(p.cpf));
          if (p?.phone) setIsPhoneValid(validatePhone(p.phone));
          const { data: a } = await supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
         setAffiliate(a);
         setIsLoading(false);
       };
       fetchData();
     }
   }, [user]);
 

  const progressPercent = ((profile?.xp || 0) % 1000) / 10;
  const chartData = (txs || []).slice(0, 10).reverse().map((t: any) => ({
    name: format(new Date(t.created_at), "dd/MM"),
    amount: Number(t.amount)
  }));

  const ALL_ACHIEVEMENTS = [
    { key: 'first_deposit', title: 'Primeiro Passo', description: 'Realize seu primeiro depósito na plataforma', icon: Wallet, points: 100, category: 'Financeiro' },
    { key: 'referral_1', title: 'Embaixador', description: 'Convide 1 amigo que realize um depósito', icon: Users, points: 500, category: 'Social' },
    { key: 'spin_10', title: 'Mestre da Roleta', description: 'Realize 10 giros na roleta', icon: RotateCw, points: 200, category: 'Jogos' },
    { key: 'box_5', title: 'Caçador de Tesouros', description: 'Abra 5 caixas misteriosas', icon: Package, points: 300, category: 'Jogos' },
    { key: 'lucky_win', title: 'Pé Quente', description: 'Ganhe seu primeiro prêmio em uma ação', icon: Trophy, points: 1000, category: 'Ações' },
    { key: 'vip_silver', title: 'Membro Prata', description: 'Alcance o nível 5 VIP', icon: Star, points: 2000, category: 'Nível' },
  ];

  const queryClient = useQueryClient();

  const copyReferral = () => {
    if (affiliate?.referral_code) {
      const link = `${window.location.origin}/?ref=${affiliate.referral_code}`;
      navigator.clipboard.writeText(link);
      toast.success("Link de indicação copiado!");
    } else {
      toast.error("Você ainda não possui um código de indicação.");
    }
  };

  const handleShareReferral = async () => {
    if (!affiliate?.referral_code) return;
    const link = `${window.location.origin}/?ref=${affiliate.referral_code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${siteSettings?.site_name || 'Nossa Empresa'} - Indique e Ganhe!`,
          text: 'Participe dos melhores sorteios com prêmios incríveis!',
          url: link,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      copyReferral();
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markNotificationsAsRead(user.id);
      toast.success("Notificações marcadas como lidas");
      queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
    } catch (error) {
      toast.error("Erro ao marcar notificações como lidas");
    }
  };

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;
    
    if (profile.cpf && !validateCPF(profile.cpf)) {
      toast.error("CPF inválido");
      setIsCpfValid(false);
      return;
    }

    if (profile.phone && !validatePhone(profile.phone)) {
      toast.error("Telefone inválido");
      setIsPhoneValid(false);
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          cpf: profile.cpf,
          phone: profile.phone
        })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (error: any) {
      toast.error("Erro ao atualizar perfil: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    try {
      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("O arquivo não é uma imagem válida (JPG, PNG, WebP ou GIF).");
      }

      const processedFile = await compressImage(file);

      // Validate size
      if (processedFile.size > MAX_FILE_SIZE) {
        throw new Error("O arquivo é muito grande mesmo após compressão. O tamanho máximo permitido é 5MB.");
      }

      const fileExt = processedFile.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, processedFile, { upsert: true });


      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success("Avatar atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (error: any) {
      toast.error("Erro ao fazer upload do avatar: " + error.message);
    } finally {
      // Reset input value
      e.target.value = '';
    }
  };

  const handleActivateAffiliate = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();
      const baseCode = (profile?.name || user.email?.split('@')[0] || "user").toLowerCase().replace(/[^a-z0-9]/g, '');
      const referralCode = `${baseCode}${Math.floor(Math.random() * 1000)}`;

      const { data: newAff, error } = await supabase
        .from("affiliates")
        .insert({
          user_id: user.id,
          referral_code: referralCode,
          type: 'common',
          commission_rate: Number(siteSettings?.affiliate_commission_percent || 10) / 100
        })
        .select()
        .single();

      if (error) throw error;
      setAffiliate(newAff);
      toast.success("Conta de afiliado ativada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao ativar conta: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      <div className="absolute inset-0 z-0 opacity-20 dark:opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <SEO title="Minha Conta" description="Gerencie seus bilhetes, saldo e perfil." />
      <Header />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container relative z-10 py-10 pt-[calc(var(--header-height,100px)+2rem)]"
      >
        <div className="grid gap-8 lg:grid-cols-12">
          <aside className="lg:col-span-3 space-y-6">
            <Card className="bg-card border-border backdrop-blur-xl">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative group">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="h-24 w-24 rounded-full bg-gradient-to-tr from-primary to-purple-500 p-1 mb-4 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] cursor-pointer overflow-hidden"
                    >
                      <div className="h-full w-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-10 w-10 text-foreground" />
                        )}
                      </div>
                    </motion.div>
                    <label className="absolute bottom-4 right-0 h-8 w-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-background hover:scale-110 transition-transform">
                      <Camera className="h-4 w-4 text-white" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </label>
                  </div>
                  <h2 className="text-lg font-bold flex items-center justify-center gap-2">
                    {profile?.name || user.user_metadata?.name || user?.email?.split('@')[0] || "Usuário"}
                    {affiliate?.type === 'influencer' && (
                      <Crown className="h-4 w-4 text-primary fill-primary animate-pulse" />
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">{user?.email}</p>
                  {affiliate?.type === 'influencer' && (
                    <Badge className="mb-4 bg-primary/20 text-primary border-primary/30 font-black italic text-[9px]">INFLUENCIADOR</Badge>
                  )}
                  <div className="w-full bg-secondary/50 p-4 rounded-xl border border-border">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-2">
                      <span>Nível {profile?.vip_level || 1} VIP</span>
                      <span>{profile?.xp || 0} XP</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>

                  <div className="w-full space-y-3 mt-6 text-left">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</Label>
                      <Input 
                        value={profile?.name || ""} 
                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                        className="h-10 rounded-xl bg-secondary/30 border-border focus:border-primary/50 font-bold text-xs"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CPF</Label>
                      <div className="relative">
                        <Input 
                          value={profile?.cpf || ""} 
                          onChange={(e) => {
                            const masked = maskCPF(e.target.value);
                            setProfile({...profile, cpf: masked});
                            setIsCpfValid(validateCPF(masked));
                          }}
                          placeholder="000.000.000-00"
                          className={cn(
                            "h-10 rounded-xl bg-secondary/30 border-border focus:border-primary/50 font-bold text-xs transition-colors",
                            profile?.cpf?.length > 0 && (isCpfValid ? "border-emerald-500/50" : "border-rose-500/50")
                          )}
                        />
                        {profile?.cpf?.length > 0 && !isCpfValid && (
                          <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-1 ml-1 mt-1">CPF inválido</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp</Label>
                      <div className="relative">
                        <Input 
                          value={profile?.phone || ""} 
                          onChange={(e) => {
                            const masked = maskPhone(e.target.value);
                            setProfile({...profile, phone: masked});
                            setIsPhoneValid(validatePhone(masked));
                          }}
                          placeholder="(00) 00000-0000"
                          className={cn(
                            "h-10 rounded-xl bg-secondary/30 border-border focus:border-primary/50 font-bold text-xs transition-colors",
                            profile?.phone?.length > 0 && (isPhoneValid ? "border-emerald-500/50" : "border-rose-500/50")
                          )}
                        />
                        {profile?.phone?.length > 0 && !isPhoneValid && (
                          <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-1 ml-1 mt-1">WhatsApp inválido</p>
                        )}
                      </div>
                    </div>

                    <Button 
                      onClick={handleUpdateProfile} 
                      disabled={isUpdating}
                      className="w-full h-10 rounded-xl font-bold uppercase italic text-[10px] tracking-widest mt-2"
                    >
                      {isUpdating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <nav className="space-y-2">
              {[
                { label: "Painel Geral", id: "overview", icon: Activity },
                { label: "Meus Títulos", id: "tickets", icon: Ticket },
                { label: "Meus Prêmios", id: "premios", icon: Trophy },
                { label: "Notificações", id: "notifications", icon: Bell },
                { label: "Carteira & PIX", id: "finance", icon: Wallet },
                { label: "Ranking Global", id: "ranking", icon: Trophy },
                { label: "Conquistas", id: "achievements", icon: Star },
                { label: "Programa de Afiliados", id: "affiliate", icon: Users },
                { label: "Giros & Caixas", id: "games", icon: ShoppingBag },
              ].map((item) => (
                <Button 
                    key={item.id} 
                    variant="ghost" 
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                        "w-full justify-start gap-3 rounded-xl transition-all duration-300",
                        activeTab === item.id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                >
                  <item.icon className="h-4 w-4" /> {item.label}
                </Button>
              ))}
              <Separator className="bg-border my-4" />
              <Button variant="ghost" className="w-full justify-start gap-3 text-rose-400 hover:text-rose-300 rounded-xl hover:bg-rose-500/10" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </nav>
          </aside>

          <main className="lg:col-span-9 space-y-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
              {[
                { label: "Saldo", val: `R$ ${Number(profile?.balance || 0).toFixed(2)}`, icon: Wallet, color: "text-emerald-400" },
                { label: "Títulos Ativos", val: orders?.filter((o:any) => o.payment_status === 'paid').length || 0, icon: Ticket, color: "text-primary", hint: "Cotas pagas em campanhas" },
                { label: "Giros Disponíveis", val: `${spins?.filter((s:any) => !s.used).length || 0}`, icon: RotateCw, color: "text-amber-400", hint: "Roletas para girar" },
                { label: "Prêmios Ganhos", val: (spins?.filter((s:any)=>s.prize_value>0).length || 0) + (boxWins?.length || 0), icon: Trophy, color: "text-purple-400", hint: "Em jogos e ações" },
              ].map((stat: any, i) => (
                <Card key={i} className="bg-card border-border p-3 sm:p-4 group hover:bg-secondary/50 transition-all duration-300">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-secondary/50 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                       <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color} filter drop-shadow-[0_0_5px_currentColor]`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] sm:text-[9px] uppercase font-bold text-muted-foreground truncate">{stat.label}</p>
                      <p className="font-bold text-sm sm:text-lg truncate">{stat.val}</p>
                      {stat.hint && <p className="text-[8px] text-muted-foreground/70 truncate hidden sm:block">{stat.hint}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsContent value="overview" className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Button onClick={() => setIsDepositOpen(true)} className="h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase italic tracking-widest hover:brightness-110 gap-2">
                    <ArrowUpRight className="h-4 w-4" /> Depositar via PIX
                  </Button>
                  <Button onClick={() => setIsWithdrawOpen(true)} className="h-14 rounded-2xl bg-emerald-500 text-white font-black uppercase italic tracking-widest hover:bg-emerald-600 gap-2">
                    <ArrowDownLeft className="h-4 w-4" /> Solicitar Saque
                  </Button>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="bg-card/50 border-border p-6 backdrop-blur-xl">
                    <CardHeader className="p-0 mb-6">
                      <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" /> Performance Financeira
                      </CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Movimentações da sua carteira</CardDescription>
                    </CardHeader>
                    {chartData.length > 0 ? (
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))', 
                              borderRadius: '12px',
                              color: 'hsl(var(--foreground))'
                            }}
                            itemStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    ) : (
                      <div className="h-[200px] flex flex-col items-center justify-center text-center gap-3">
                        <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sem movimentações ainda</p>
                        <Button size="sm" variant="outline" onClick={() => setIsDepositOpen(true)} className="text-[10px] font-black uppercase">Fazer 1º depósito</Button>
                      </div>
                    )}
                  </Card>

                  <Card className="bg-card/50 border-border p-6 backdrop-blur-xl">
                    <CardHeader className="p-0 mb-6">
                      <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-400" /> Suas Conquistas
                      </CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">{achievements?.length || 0} de {ALL_ACHIEVEMENTS.length} desbloqueadas</CardDescription>
                    </CardHeader>
                    <div className="space-y-3 max-h-[200px] overflow-auto pr-2 custom-scrollbar">
                      {achievements?.length ? achievements.slice(0,4).map((a: any) => (
                        <div key={a.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border hover:border-amber-500/30 transition-all">
                          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Star className="h-5 w-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight">{a.title}</p>
                            <p className="text-[9px] text-muted-foreground">{a.description}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-6 space-y-3">
                          <Star className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Participe de ações e jogos para desbloquear conquistas</p>
                          <Button size="sm" variant="outline" onClick={() => setActiveTab("achievements")} className="text-[10px] font-black uppercase">Ver conquistas</Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {affiliate && (
                  <Card className="bg-primary/5 border-primary/20 p-6 backdrop-blur-xl group hover:border-primary/40 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                          <Share2 className="h-4 w-4 text-primary" /> Seu Link de {affiliate.type === 'influencer' ? 'Influenciador' : 'Afiliado'}
                        </h4>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Compartilhe e ganhe comissões em tempo real</p>
                      </div>
                      <div className="flex items-center gap-2 bg-black/20 p-1 rounded-xl border border-white/5 w-full md:w-auto">
                        <code className="px-3 text-[10px] font-mono font-bold text-primary truncate max-w-[200px]">
                          {window.location.origin}/?ref={affiliate.referral_code}
                        </code>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-primary/20" onClick={copyReferral}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="bg-card border-border p-6 backdrop-blur-xl">
                  <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" /> Participações Recentes
                      </CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Últimos pedidos realizados</CardDescription>
                    </div>
                    <Button variant="link" size="sm" className="text-primary text-[10px] font-black uppercase tracking-widest" onClick={() => setActiveTab("tickets")}>Ver Todos</Button>
                  </CardHeader>
                  <div className="space-y-3">
                    {orders?.length ? [...orders].sort((a:any, b:any) => {
                      if (a.payment_status === 'paid' && b.payment_status !== 'paid') return -1;
                      if (a.payment_status !== 'paid' && b.payment_status === 'paid') return 1;
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    }).slice(0, 5).map((o: any) => (
                      <div key={o.id} className="flex items-center justify-between p-4 bg-secondary rounded-2xl border border-border group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <img src={o.campaigns?.image_url || "/placeholder.svg"} className="h-12 w-12 rounded-xl object-cover" />
                          <div>
                            <p className="text-sm font-black uppercase tracking-tighter">{o.campaigns?.title}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{format(new Date(o.created_at), "dd/MM/yyyy")}</p>
                          </div>
                        </div>
                        <Badge className={cn(
                          "text-[10px] font-black italic uppercase px-3",
                          o.payment_status === 'paid' ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"
                        )}>
                          {o.payment_status === 'paid' ? 'APROVADO' : 'PENDENTE'}
                        </Badge>
                      </div>
                    )) : (
                      <div className="text-center py-10 opacity-40">
                        <p className="text-xs font-black uppercase tracking-widest italic">Nenhuma ação participada</p>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="tickets" className="space-y-6">
                 <Card className="bg-card border-border p-6 backdrop-blur-xl">
                    <CardHeader className="p-0 mb-8">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Ticket className="h-4 w-4 text-primary" /> Meus Títulos de Capitalização
                        </CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Consulte aqui todos os seus números da sorte</CardDescription>
                    </CardHeader>
                    
                    <div className="space-y-4">
                      {orders?.length ? orders.map((o: any) => {
                        const isCampaignFinished = ['completed', 'finished', 'drawn'].includes(o.campaigns?.status);
                        const hasWinner = o.tickets?.some((t: any) => o.campaigns?.draw_number === t.number);
                        const drawDate = o.campaigns?.draw_date ? format(new Date(o.campaigns.draw_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : null;
                        
                        return (
                        <div key={o.id} className={cn(
                          "bg-secondary/20 border border-border rounded-[24px] overflow-hidden group hover:border-primary/20 transition-all",
                          hasWinner && "border-amber-500/50 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/30"
                        )}>
                          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <img src={o.campaigns?.image_url || "/placeholder.svg"} className="h-16 w-16 rounded-2xl object-cover shadow-2xl" />
                                {hasWinner && (
                                  <div className="absolute -top-2 -right-2 h-8 w-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-background animate-bounce z-10">
                                    <Trophy className="h-4 w-4 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <p className="text-sm font-black uppercase tracking-tight text-foreground truncate max-w-[200px] md:max-w-md">{o.campaigns?.title}</p>
                                  {isCampaignFinished ? (
                                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 border-blue-500/20">
                                      {o.campaigns?.status === 'drawn' ? 'Sorteado' : 'Encerrada'}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                      {o.campaigns?.status === 'active' ? 'Ativa' : o.campaigns?.status === 'paused' ? 'Pausada' : 'Aguardando'}
                                    </Badge>
                                  )}
                                  {hasWinner && (
                                    <Badge className="bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest border-none px-2 animate-pulse">
                                      GANHADOR!
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="text-[8px] font-bold border-border text-muted-foreground">PEDIDO #{o.id.slice(0, 8)}</Badge>
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{format(new Date(o.created_at), "dd/MM/yyyy")}</p>
                                  </div>
                                  {drawDate && (
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-primary uppercase tracking-widest">
                                      <History className="h-3 w-3" />
                                      Sorteio: {drawDate}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 justify-between md:justify-end">
                              <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Qtd.</p>
                                <p className="text-lg font-black italic text-foreground">{o.quantity}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge className={cn(
                                    "text-[10px] font-black italic uppercase px-4 h-8 rounded-full",
                                    o.payment_status === 'paid' ? "bg-emerald-500 text-white glow-emerald border-none" : "bg-amber-500 text-white glow-amber border-none"
                                )}>
                                    {o.payment_status === 'paid' ? 'APROVADO' : 'PENDENTE'}
                                </Badge>
                                {isCampaignFinished && (
                                  <Link to={`/campanha/${o.campaigns?.slug}`} className="text-[9px] font-bold text-primary hover:underline uppercase tracking-widest mt-1">
                                    Ver Resultado
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>

                          {o.payment_status === 'paid' && (
                           <div className="bg-secondary/40 p-6 border-t border-border">
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                  <Zap className="h-3 w-3 fill-current" /> Seus Números da Sorte
                                </p>
                                <div className="flex flex-col md:flex-row md:items-center gap-2">
                                  <p className="text-[9px] font-bold text-muted-foreground italic">Números atribuídos via sorteio {o.campaigns?.ticket_generation_type === 'auto' ? 'aleatório' : 'manual'}</p>
                                  {o.campaigns?.status === 'drawn' && o.campaigns?.draw_number && (
                                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-black uppercase italic animate-pulse">
                                      Número Ganhador: {o.campaigns.draw_number}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {o.tickets?.map((t: any) => {
                                  const isWinner = o.campaigns?.draw_number === t.number;
                                  return (
                                    <div 
                                      key={t.id} 
                                      className={cn(
                                        "h-10 px-4 flex items-center justify-center rounded-xl font-mono font-bold text-sm transition-all hover:scale-110 cursor-default shadow-lg",
                                        isWinner 
                                        ? "bg-amber-500 text-white ring-4 ring-amber-500/50 shadow-amber-500/40 scale-110 z-10 animate-bounce"
                                        : t.is_lucky 
                                        ? "bg-amber-500/80 text-white ring-2 ring-amber-500/30"
                                        : "bg-secondary text-foreground hover:bg-primary hover:text-white"
                                      )}
                                    >
                                      {t.number}
                                      {isWinner && <Trophy className="ml-2 h-3 w-3" />}
                                    </div>
                                  );
                                })}
                                {!o.tickets?.length && (
                                  <p className="text-[10px] text-muted-foreground font-bold uppercase italic py-2">Gerando números... Recarregue em instantes.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      }) : (
                        <div className="text-center py-24 opacity-30">
                            <Ticket className="h-16 w-16 mx-auto mb-4 text-foreground" />
                            <p className="text-xs font-black uppercase tracking-widest italic">Você ainda não participou de nenhum sorteio</p>
                            <Button onClick={() => window.location.href='/'} variant="link" className="text-primary mt-2">Explorar Ações Ativas</Button>
                        </div>
                      )}
                    </div>
                 </Card>
               </TabsContent>

              <TabsContent value="premios" className="space-y-6">
                <PrizesByCampaignPanel userId={user?.id || ""} />
              </TabsContent>

              <TabsContent value="finance" className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                     <Card className="bg-gradient-to-br from-primary/20 to-zinc-900/50 border-primary/20 p-8 rounded-[32px] overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
                            <ArrowUpRight className="h-32 w-32" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter">Depositar via PIX</h3>
                            <p className="text-sm text-foreground/60 font-medium">Crédito instantâneo na sua carteira.</p>
                            <Button onClick={() => setIsDepositOpen(true)} className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-black uppercase italic tracking-widest hover:brightness-110 active:scale-95 transition-all">Depositar Agora</Button>
                        </div>
                     </Card>

                     <Card className="bg-gradient-to-br from-emerald-500/20 to-zinc-900/50 border-emerald-500/20 p-8 rounded-[32px] overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
                            <ArrowDownLeft className="h-32 w-32" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter">Solicitar Saque</h3>
                            <p className="text-sm text-foreground/60 font-medium">Resgate seu saldo para seu banco.</p>
                            <Button onClick={() => setIsWithdrawOpen(true)} className="h-12 px-6 rounded-xl bg-emerald-500 text-white font-black uppercase italic tracking-widest hover:bg-emerald-600 glow-emerald active:scale-95 transition-all">Efetuar Saque</Button>
                        </div>
                     </Card>
                  </div>

                  <Card className="bg-card border-border p-6 backdrop-blur-xl">
                     <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <History className="h-4 w-4 text-primary" /> Extrato Detalhado
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              disabled={txsPage === 1}
                              onClick={() => setTxsPage(p => p - 1)}
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                             <span className="text-[10px] font-bold text-muted-foreground">{txsPage}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              disabled={!txs || txs.length <= txsPage * ITEMS_PER_PAGE}
                              onClick={() => setTxsPage(p => p + 1)}
                            >
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                         </div>
                     </CardHeader>
                     <div className="space-y-2">
                        {txs?.length ? txs.slice((txsPage - 1) * ITEMS_PER_PAGE, txsPage * ITEMS_PER_PAGE).map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/40 rounded-2xl border border-border transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center",
                                        t.type === 'deposit' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                    )}>
                                        {t.type === 'deposit' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">{t.description || t.type.toUpperCase()}</p>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{format(new Date(t.created_at), "dd/MM/yyyy HH:mm")}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={cn(
                                        "text-sm font-black italic",
                                        t.type === 'deposit' ? "text-emerald-500" : "text-rose-500"
                                    )}>
                                        {t.type === 'deposit' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                                    </p>
                                    <Badge className="text-[8px] font-black uppercase tracking-tighter py-0 h-4">{t.status}</Badge>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-20 opacity-30">
                                <p className="text-[10px] font-black uppercase tracking-widest italic">Nenhuma transação registrada</p>
                            </div>
                        )}
                     </div>
                  </Card>
               </TabsContent>

                <TabsContent value="achievements" className="space-y-6">
                   <div className="grid gap-4 md:grid-cols-3">
                     <Card className="bg-primary/5 border-primary/20 p-4">
                       <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Total de Pontos</p>
                       <p className="text-2xl font-black italic">{profile?.points || 0} PTS</p>
                     </Card>
                      <Card className="bg-secondary border-border p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Conquistas Desbloqueadas</p>
                       <p className="text-2xl font-black italic">{achievements?.length || 0} / {ALL_ACHIEVEMENTS.length}</p>
                     </Card>
                      <Card className="bg-secondary border-border p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Nível de Prestígio</p>
                       <p className="text-2xl font-black italic">{profile?.vip_level || 1} VIP</p>
                     </Card>
                   </div>

                    <Card className="bg-card border-border p-6 backdrop-blur-xl">
                      <CardHeader className="p-0 mb-8">
                         <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                             <Star className="h-4 w-4 text-amber-400" /> Galeria de Conquistas
                         </CardTitle>
                          <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Acompanhe seu progresso e ganhe recompensas exclusivas</CardDescription>
                      </CardHeader>
                      
                      <div className="space-y-8">
                        {['Jogos', 'Financeiro', 'Social', 'Ações', 'Nível'].map((cat) => {
                          const catAchievements = ALL_ACHIEVEMENTS.filter(a => a.category === cat);
                          if (catAchievements.length === 0) return null;
                          
                          return (
                            <div key={cat} className="space-y-4">
                              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                                 <div className="h-px w-8 bg-border" /> {cat}
                              </h3>
                              <div className="grid gap-4 sm:grid-cols-2">
                                {catAchievements.map((achievement) => {
                                  const isUnlocked = achievements?.some(a => a.achievement_key === achievement.key);
                                  const unlockedData = achievements?.find(a => a.achievement_key === achievement.key);
                                  const Icon = achievement.icon;
                                  
                                  return (
                                    <div 
                                      key={achievement.key} 
                                      className={cn(
                                        "relative overflow-hidden flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 group",
                                        isUnlocked 
                                           ? "bg-primary/5 border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]"
                                           : "bg-secondary/20 border-border opacity-60 grayscale"
                                      )}
                                    >
                                      {isUnlocked && (
                                        <div className="absolute top-0 right-0 p-2">
                                          <CheckCircle2 className="h-4 w-4 text-primary" />
                                        </div>
                                      )}
                                      <div className={cn(
                                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                                         isUnlocked ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                                      )}>
                                        <Icon className="h-7 w-7" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-black uppercase tracking-tight">{achievement.title}</p>
                                          {!isUnlocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-medium leading-tight mb-2">{achievement.description}</p>
                                        <div className="flex items-center justify-between">
                                          <Badge variant="outline" className={cn(
                                            "text-[8px] font-black px-2 py-0 h-4 uppercase",
                                            isUnlocked ? "border-primary/50 text-primary" : "border-white/10 text-muted-foreground"
                                          )}>
                                            +{achievement.points} PTS
                                          </Badge>
                                          {isUnlocked && unlockedData && (
                                            <span className="text-[8px] text-muted-foreground font-bold uppercase">
                                              {format(new Date(unlockedData.created_at), "dd/MM/yy")}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                   </Card>

                   {/* Rewards Section */}
                   <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-border p-6 backdrop-blur-xl">
                      <CardHeader className="p-0 mb-6">
                         <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                             <Gift className="h-4 w-4 text-primary" /> Loja de Recompensas
                         </CardTitle>
                         <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Troque seus pontos por vantagens reais</CardDescription>
                      </CardHeader>
                      
                      <div className="grid gap-4 sm:grid-cols-3">
                        {[
                          { title: 'Bônus de R$ 10', cost: 1000, icon: Coins, color: 'text-emerald-400' },
                          { title: 'Giro de Elite', cost: 500, icon: RotateCw, color: 'text-primary' },
                          { title: 'Sorte em Dobro', cost: 2000, icon: Zap, color: 'text-amber-400' },
                        ].map((reward, i) => (
                          <div key={i} className="bg-secondary/30 border border-border rounded-2xl p-4 space-y-4 hover:border-primary/30 transition-all group">
                            <div className="h-12 w-12 rounded-xl bg-secondary/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <reward.icon className={cn("h-6 w-6", reward.color)} />
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase tracking-tight">{reward.title}</p>
                              <p className="text-[10px] text-primary font-black">{reward.cost} PONTOS</p>
                            </div>
                            <Button size="sm" className="w-full h-8 text-[10px] font-black uppercase tracking-widest bg-secondary/50 hover:bg-secondary text-foreground border-border" disabled={(profile?.points || 0) < reward.cost}>
                              Resgatar
                            </Button>
                          </div>
                        ))}
                      </div>
                   </Card>
                </TabsContent>

                <TabsContent value="games" className="space-y-6">
                   <div className="grid gap-4 sm:grid-cols-3">
                      <Card className="bg-secondary/30 border-border p-4">
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Giros Totais</p>
                         <p className="text-2xl font-black italic">{spins?.length || 0}</p>
                      </Card>
                      <Card className="bg-secondary/30 border-border p-4">
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Caixas Abertas</p>
                         <p className="text-2xl font-black italic">{boxWins?.length || 0}</p>
                      </Card>
                      <Card className="bg-primary/5 border-primary/20 p-4">
                         <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Total Ganho (Jogos)</p>
                         <p className="text-2xl font-black italic">R$ {(
                            (spins?.reduce((acc: number, s: any) => acc + (Number(s.prize_value) || 0), 0) || 0) +
                            (boxWins?.reduce((acc: number, bw: any) => acc + (Number(bw.prize_value) || 0), 0) || 0)
                         ).toFixed(2)}</p>
                      </Card>
                   </div>

                   <div className="grid lg:grid-cols-2 gap-6">
                      <Card className="bg-card/50 border-border p-6 backdrop-blur-xl">
                         <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                             <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                 <RotateCw className="h-4 w-4 text-primary" /> Últimos Giros
                             </CardTitle>
                             <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6" 
                                  disabled={spinsPage === 1}
                                  onClick={() => setSpinsPage(p => p - 1)}
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <span className="text-[10px] font-bold text-muted-foreground">{spinsPage}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6" 
                                  disabled={!spins || spins.length <= spinsPage * ITEMS_PER_PAGE}
                                  onClick={() => setSpinsPage(p => p + 1)}
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                             </div>
                         </CardHeader>
                         <div className="space-y-3">
                            {spins?.length ? spins.slice((spinsPage - 1) * ITEMS_PER_PAGE, spinsPage * ITEMS_PER_PAGE).map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">{s.prize_label}</p>
                                        <p className="text-[9px] text-muted-foreground font-bold uppercase">{s.campaigns?.title}</p>
                                    </div>
                                    <p className="text-xs font-bold text-primary">R$ {Number(s.prize_value).toFixed(2)}</p>
                                </div>
                            )) : <p className="text-center py-10 text-[10px] text-muted-foreground font-black uppercase italic">Sem giros registrados</p>}
                         </div>
                      </Card>

                      <Card className="bg-card/50 border-border p-6 backdrop-blur-xl">
                         <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                             <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                 <Package className="h-4 w-4 text-orange-400" /> Caixas Abertas
                             </CardTitle>
                             <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6" 
                                  disabled={boxesPage === 1}
                                  onClick={() => setBoxesPage(p => p - 1)}
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <span className="text-[10px] font-bold text-muted-foreground">{boxesPage}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6" 
                                  disabled={!boxWins || boxWins.length <= boxesPage * ITEMS_PER_PAGE}
                                  onClick={() => setBoxesPage(p => p + 1)}
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                             </div>
                         </CardHeader>
                         <div className="space-y-3">
                            {boxWins?.length ? boxWins.slice((boxesPage - 1) * ITEMS_PER_PAGE, boxesPage * ITEMS_PER_PAGE).map((bw: any) => (
                                <div key={bw.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">{bw.prize_title}</p>
                                        <p className="text-[9px] text-muted-foreground font-bold uppercase">{format(new Date(bw.created_at), 'dd/MM HH:mm')}</p>
                                    </div>
                                    <p className="text-xs font-bold text-orange-400">R$ {Number(bw.prize_value).toFixed(2)}</p>
                                </div>
                            )) : <p className="text-center py-10 text-[10px] text-muted-foreground font-black uppercase italic">Sem vitórias em caixas</p>}
                         </div>
                      </Card>
                   </div>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                   <Card className="bg-card/50 border-border p-6 backdrop-blur-xl">
                      <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                         <div>
                             <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                 <Bell className="h-4 w-4 text-primary" /> Central de Notificações
                             </CardTitle>
                             <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Fique por dentro de tudo</CardDescription>
                         </div>
                         {notifications && notifications.some(n => !n.is_read) && (
                             <div className="flex gap-2">
                                 <Button 
                                     variant="outline" 
                                     size="sm" 
                                     onClick={() => {
                                         if ('Notification' in window) {
                                             Notification.requestPermission().then(permission => {
                                                 if (permission === 'granted') {
                                                     toast.success("Notificações do navegador ativadas!");
                                                 } else {
                                                     toast.error("Permissão negada para notificações");
                                                 }
                                             });
                                         } else {
                                           toast.error("Seu navegador não suporta notificações");
                                         }
                                     }}
                                     className="text-[10px] font-black uppercase tracking-widest border-border hover:bg-secondary/50"
                                 >
                                     Ativar Push
                                 </Button>
                                 <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80">
                                     Marcar todas como lidas
                                 </Button>
                             </div>
                         )}
                      </CardHeader>
                      <div className="space-y-3">
                         {notifications?.length ? notifications.map((n: any) => (
                             <div key={n.id} className={cn(
                                 "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                 n.is_read ? "bg-secondary/20 border-border" : "bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
                             )}>
                                 <div className="flex items-center gap-4">
                                     <div className={cn(
                                         "h-10 w-10 rounded-xl flex items-center justify-center",
                                         n.type === 'win' ? "bg-emerald-500/10 text-emerald-500" : 
                                         n.type === 'bonus' ? "bg-amber-500/10 text-amber-500" :
                                         "bg-primary/10 text-primary"
                                     )}>
                                         {n.type === 'win' ? <Trophy className="h-5 w-5" /> : 
                                          n.type === 'bonus' ? <Gift className="h-5 w-5" /> : 
                                          <Bell className="h-5 w-5" />}
                                     </div>
                                     <div>
                                         <p className="text-xs font-black uppercase tracking-tight">{n.title}</p>
                                         <p className="text-[10px] text-muted-foreground font-medium">{n.message}</p>
                                         <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{format(new Date(n.created_at), "dd/MM HH:mm")}</p>
                                     </div>
                                 </div>
                                 {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                             </div>
                         )) : (
                             <div className="text-center py-20 opacity-30">
                                 <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                 <p className="text-xs font-black uppercase tracking-widest italic">Nenhuma notificação</p>
                             </div>
                         )}
                      </div>
                   </Card>
                </TabsContent>

               <TabsContent value="affiliate" className="space-y-6">
                 <Card className="bg-card border-border p-8 backdrop-blur-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Users className="h-40 w-40" />
                   </div>
                   
                   {!affiliate ? (
                     <div className="relative z-10 text-center space-y-6 py-8">
                       <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
                         <TrendingUp className="h-10 w-10" />
                       </div>
                       <div className="space-y-2">
                         <h2 className="text-2xl font-black uppercase italic tracking-tighter">Programa de Afiliados</h2>
                         <p className="text-muted-foreground max-w-md mx-auto">Indique amigos e ganhe uma comissão sobre todas as vendas realizadas através do seu link exclusivo!</p>
                       </div>
                       <Button onClick={handleActivateAffiliate} className="h-14 px-10 rounded-2xl font-black uppercase italic tracking-widest glow-primary shadow-xl">Ativar minha conta agora</Button>
                     </div>
                   ) : (
                     <div className="relative z-10 space-y-8">
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                           <div className="space-y-1">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                              Seu Painel de <span className="text-primary">{affiliate?.type === 'influencer' ? 'Influenciador' : 'Afiliado'}</span>
                            </h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                              {affiliate?.type === 'influencer' ? (
                                <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30 font-black italic text-[9px]">NÍVEL INFLUENCIADOR</Badge>
                              ) : (
                                <><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Conta Ativa & Verificada</>
                              )}
                            </p>
                          </div>
                         <div className="flex items-center gap-2">
                            <Link to="/painel-afiliado">
                              <Button className="rounded-xl font-bold uppercase italic gap-2 bg-primary/20 text-primary border border-primary/20 hover:bg-primary/30 h-12 px-6">
                                <TrendingUp className="h-4 w-4" /> Painel Detalhado
                              </Button>
                            </Link>
                         </div>
                       </div>

                       <div className="grid gap-4 sm:grid-cols-3">
                          <div className="p-6 rounded-3xl bg-secondary/30 border border-border">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ganhos Totais</p>
                            <p className="text-2xl font-black text-emerald-500">R$ {commissions?.reduce((acc:any, c:any) => acc + (Number(c.amount) || 0), 0).toFixed(2)}</p>
                          </div>
                          <div className="p-6 rounded-3xl bg-secondary/30 border border-border">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Indicações</p>
                            <p className="text-2xl font-black text-foreground">{referrals?.length || 0}</p>
                          </div>
                          <div className="p-6 rounded-3xl bg-secondary/30 border border-border">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Sua Comissão</p>
                            <p className="text-2xl font-black text-primary">{Number(affiliate.commission_rate * 100).toFixed(0)}%</p>
                          </div>
                       </div>

                       <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 space-y-4">
                         <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Seu Link de Indicação</Label>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Compartilhe e Ganhe</span>
                         </div>
                         <div className="flex gap-2">
                            <Input 
                              readOnly 
                              value={`${window.location.origin}/?ref=${affiliate.referral_code}`}
                              className="h-12 bg-card border-border font-mono text-xs font-bold rounded-xl"
                            />
                            <Button onClick={copyReferral} size="icon" variant="outline" className="h-12 w-12 rounded-xl border-border shrink-0">
                               <Copy className="h-4 w-4" />
                            </Button>
                            <Button onClick={handleShareReferral} size="icon" variant="outline" className="h-12 w-12 rounded-xl border-border shrink-0">
                               <Share2 className="h-4 w-4" />
                            </Button>
                         </div>
                       </div>
                     </div>
                   )}
                 </Card>
               </TabsContent>

                <TabsContent value="ranking" className="space-y-6">
                   <div className="bg-card/50 border border-border rounded-[40px] p-6 md:p-10 backdrop-blur-2xl">
                     <UserRanking />
                   </div>
                </TabsContent>
             </Tabs>
           </main>
         </div>
      </motion.div>

      <DepositModal 
        isOpen={isDepositOpen} 
        onOpenChange={setIsDepositOpen}
        onSuccess={(orderId) => {
          setPendingOrderId(orderId);
          setIsPaymentOpen(true);
        }}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onOpenChange={setIsWithdrawOpen}
        userBalance={Number(profile?.balance || 0)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] })}
      />

      <PaymentModal
        orderId={pendingOrderId}
        isOpen={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        onPaymentSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
          queryClient.invalidateQueries({ queryKey: ["user-wallet-transactions", user?.id] });
        }}
      />

      <Footer />
    </div>
  );
}

function PrizesByCampaignPanel({ userId }: { userId: string }) {
  const { data: groups, isLoading } = useUserPrizesByCampaign(userId);

  if (!userId || isLoading) {
    return (
      <Card className="bg-card/50 border-border p-10 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Carregando seus prêmios...</p>
      </Card>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <Card className="bg-card/50 border-border p-10 text-center">
        <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Você ainda não ganhou prêmios.</p>
        <p className="text-[10px] text-muted-foreground mt-2">Participe de uma campanha, gire a roleta, abra caixas ou raspe raspadinhas para ver seus prêmios aqui.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {(groups as any[]).map((g) => (
        <Card key={g.campaign.id} className="bg-card border-border overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-secondary/30">
            <img src={g.campaign.image_url || "/placeholder.svg"} className="h-12 w-12 rounded-xl object-cover" />
            <div className="flex-1 min-w-0">
              <Link to={`/campanha/${g.campaign.slug || g.campaign.id}`} className="text-sm font-black uppercase tracking-tight hover:text-primary truncate block">
                {g.campaign.title}
              </Link>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                {g.mainPrize ? `Sorteio: nº ${g.mainPrize.number}` : g.campaign.draw_number ? `Nº oficial: ${g.campaign.draw_number}` : "Sorteio pendente"}
              </p>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-black uppercase">
              R$ {Number(g.total).toFixed(2)}
            </Badge>
          </div>

          <div className="p-4 space-y-3">
            {g.mainPrize && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-xs font-black uppercase">Prêmio Principal da Ação</p>
                    <p className="text-[10px] text-muted-foreground font-bold">Número premiado: {g.mainPrize.number}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const msg = encodeURIComponent(`Olá! Quero reivindicar o prêmio principal da campanha "${g.campaign.title}" (número ${g.mainPrize.number}).`);
                    const wa = (typeof window !== "undefined" && (window as any).__siteSupportWhatsapp) || "";
                    if (wa) window.open(`https://wa.me/${wa}?text=${msg}`, "_blank");
                    else { navigator.clipboard.writeText(decodeURIComponent(msg)); toast.success("Mensagem copiada! Envie ao suporte para reivindicar."); }
                  }}
                  className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase"
                >
                  Reivindicar
                </Button>
              </div>
            )}

            {g.spins.length > 0 && (
              <PrizeGroupList icon={<RotateCw className="h-3.5 w-3.5 text-primary" />} title={`Roleta (${g.spins.length})`} items={g.spins.map((s: any) => ({ label: s.prize_label, value: s.prize_value, date: s.created_at, type: s.prize_type }))} accent="text-primary" />
            )}
            {g.scratches.length > 0 && (
              <PrizeGroupList icon={<Zap className="h-3.5 w-3.5 text-sky-400" />} title={`Raspadinhas (${g.scratches.length})`} items={g.scratches.map((s: any) => ({ label: s.prize_label, value: s.prize_value, date: s.created_at, type: s.prize_type }))} accent="text-sky-400" />
            )}
            {g.boxes.length > 0 && (
              <PrizeGroupList icon={<Package className="h-3.5 w-3.5 text-orange-400" />} title={`Caixas Surpresas (${g.boxes.length})`} items={g.boxes.map((b: any) => ({ label: `${b.box_name ? b.box_name + " · " : ""}${b.prize_title}`, value: b.prize_value, date: b.created_at }))} accent="text-orange-400" />
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function PrizeGroupList({ icon, title, items, accent }: { icon: React.ReactNode; title: string; items: { label: string; value: number; date: string; type?: string }[]; accent: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</h4>
      </div>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 border border-border">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-tight truncate">{it.label}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase">{format(new Date(it.date), "dd/MM/yy HH:mm")}</p>
            </div>
            <div className="text-right">
              <p className={cn("text-xs font-black", accent)}>R$ {Number(it.value || 0).toFixed(2)}</p>
              {it.type && it.type !== "balance" && (
                <p className="text-[9px] text-muted-foreground font-bold uppercase">{it.type}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
