import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Settings, Save, Percent, DollarSign, MessageSquare, Layout, Globe, Image as ImageIcon, Zap, Sparkles, MousePointer2, Palette, Sliders, CreditCard, Upload, Trash2, Check, Smartphone, CheckCircle2, Database, Search, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/hooks/useAdmin";
import { buildSettingsMutations, verifySiteSettingsSchema } from "@/lib/settings-mutations";

const SITE_ASSETS_BUCKET = 'site-assets';
const FALLBACK_IMAGE_BUCKET = 'campaigns';
const HOME_GAME_SETTING_KEYS = [
  'home_show_game_roleta',
  'home_show_game_raspadinha',
  'home_show_game_caixa',
  'home_show_game_ranking',
  'home_show_game_afiliados',
  'home_show_how_it_works',
  'home_show_faq',
  'home_show_trust_badges',
  'home_show_cta',
];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<any[]>([]);
  const [initialSettings, setInitialSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: userRole } = useRole();
  const isUserMaster = userRole === 'master';

  const settingNames: Record<string, string> = {
    hero_transition_speed: "Velocidade do Slide (ms)",
    button_glow_speed: "Velocidade do Brilho do Botão",
    title_shimmer_speed: "Velocidade do Brilho do Título",
    button_hover_effect: "Efeito Hover nos Botões",
    border_shimmer_opacity: "Opacidade da Borda",
    animation_easing: "Curva de Animação",
    button_glow_intensity: "Intensidade do Brilho",
    primary_color: "Cor Primária do Sistema",
    title_shimmer_primary: "Cor de Destaque do Título",
    title_shimmer_secondary: "Cor Secundária (Dark)",
    title_shimmer_secondary_light: "Cor Secundária (Light)",
    home_hero_style: "Estilo do Carrossel Principal",
    hero_transition_type: "Tipo de Transição",
    site_name: "Nome da Plataforma",
    site_logo_url: "Logotipo Principal",
    site_logo_height: "Altura do Logo (Desktop)",
    site_logo_height_mobile: "Altura do Logo (Mobile)",
    site_favicon_url: "Ícone da Aba (Favicon)",
    site_title: "Título do Navegador (SEO)",
    facebook_pixel_id: "ID do Pixel do Facebook",
    google_analytics_id: "ID do Google Analytics (GA4)",
    google_tag_manager_id: "ID do Google Tag Manager",
    custom_header_scripts: "Scripts Personalizados (Header)",
    custom_body_scripts: "Scripts Personalizados (Body)",
    enable_download_app: "Habilitar Botão 'Baixar App'",
    app_download_link: "Link para Baixar App (Direto ou APK)",
    
    support_whatsapp: "WhatsApp de Atendimento",
    cashback_percent: "% de Cashback por Compra",
    affiliate_commission_percent: "% de Comissão de Afiliados",
    min_withdrawal_amount: "Valor Mínimo de Saque (R$)",
    deposit_bonus_tiers: "Bônus por Depósito (JSON de faixas)",
    company_name: "Nome Fantasia / Razão Social",
    company_cnpj: "CNPJ",
    company_address: "Endereço Completo",
    company_phone: "Telefone de Contato",
    company_email: "E-mail de Contato",
    home_marquee_enabled: "Habilitar Faixa de Texto",
    home_marquee_text: "Texto da Faixa Corrida",
    mercadopago_access_token: "Mercado Pago: Access Token",
    mercadopago_public_key: "Mercado Pago: Public Key",
    manual_payment_enabled: "Pagamento Manual (PIX)",
    manual_payment_pix_key: "Chave PIX Manual",
    manual_payment_pix_name: "Nome do Titular PIX",
    paggue_client_key: "Paggue: Client Key",
    paggue_client_secret: "Paggue: Client Secret",
    active_payment_provider: "Provedor de Pagamento Ativo",
    site_keywords: "Palavras-chave (SEO)",
    site_description: "Descrição Meta (SEO)",
    supabase_url: "Supabase URL (Configuração do Sistema)",
    supabase_service_role_key: "Supabase Service Role Key (Configuração do Sistema)",
    show_sales_page: "Habilitar Página de Vendas",
    sales_page_keywords: "Palavras-chave da Venda",
    sales_page_type: "Tipo da Plataforma",
    sales_page_whatsapp: "WhatsApp de Vendas",
    pay2m_client_key: "Pay2m: Client Key",
    pay2m_client_secret: "Pay2m: Client Secret",
    pay2m_enabled: "Habilitar Pay2m",
    layout_mode: "Modelo de Layout das Campanhas",
    inline_testimonials_count: "Qtd. de Depoimentos (Em Linha)",
    inline_show_finished_raffles: "Listar Ações Finalizadas (Em Linha)",
    site_theme: "Tema do Site (Claro/Escuro)",
    home_show_testimonials: "Exibir Depoimentos na Home",
    home_show_hall_fame: "Exibir Hall da Fama na Home",
    home_show_live_activity: "Exibir Atividade em Tempo Real (Flutuante)",
    home_testimonials_json: "Depoimentos Personalizados (JSON)",
    home_hall_fame_json: "Hall da Fama Personalizado (JSON)",
    home_show_games_combo: "Exibir Combo de Jogos (mestre liga/desliga toda a seção)",
    home_show_game_roleta: "Bloco: Roleta Premiada",
    home_show_game_raspadinha: "Bloco: Raspadinha",
    home_show_game_caixa: "Bloco: Caixa Misteriosa",
    home_show_game_ranking: "Bloco: Ranking Top",
    home_show_game_afiliados: "Bloco: Afiliados",
    home_show_how_it_works: "Bloco: Como Participar",
    home_show_faq: "Bloco: Perguntas Frequentes (FAQ)",
    home_show_trust_badges: "Bloco: Selos de Confiança",
    home_show_cta: "Bloco: Chamada Final (CTA)",
    whatsapp_group_link: "Link do Grupo do WhatsApp (botão flutuante)",
    whatsapp_group_enabled: "Exibir botão flutuante do Grupo do WhatsApp",
    menu_campanhas_enabled: "Menu: Campanhas",
    menu_ganhadores_enabled: "Menu: Ganhadores",
    menu_federal_enabled: "Menu: Federal (Resultados)",
    menu_comunicados_enabled: "Menu: Comunicados",
    menu_suporte_enabled: "Menu: Suporte",
    menu_minha_conta_enabled: "Menu: Minha Conta"
    ,
    header_register_button_enabled: "Botão 'Cadastre-se' destacado no header"
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("site_settings").select("*");
    if (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações: " + error.message);
      setLoading(false);
      return;
    }
    const verified = verifySiteSettingsSchema(data ?? []);
    if (verified.ok === false) {
      console.error("site_settings schema mismatch:", verified.error, verified.issues);
      toast.error(`${verified.error}: ${verified.issues[0] ?? "formato inesperado"}`);
      setLoading(false);
      return;
    }
    setSettings(verified.rows);
    setInitialSettings(JSON.parse(JSON.stringify(verified.rows)));
    setLoading(false);
  };

  const handleUpdate = (key: string, value: string) => {
    setSettings(prev => {
      const exists = prev.some(s => s.key === key);
      if (exists) return prev.map(s => s.key === key ? { ...s, value } : s);
      // Keep new settings aligned with the real table shape: only key/value.
      return [...prev, { key, value }];
    });
  };

  const getSetting = (key: string, fallbackValue = 'true') =>
    settings.find(s => s.key === key) || { key, value: fallbackValue };

  const handleUpload = async (key: string, file: File) => {
    setUploading(key);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${key}-${crypto.randomUUID()}.${fileExt}`;
      const filePath = `settings/${fileName}`;

      const uploadToBucket = async (bucket: string) => {
        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, { upsert: true });

        return { bucket, error };
      };

      let { bucket: uploadedBucket, error: uploadError } = await uploadToBucket(SITE_ASSETS_BUCKET);

      const uploadErrorText = JSON.stringify(uploadError || {}).toLowerCase();
      const isBucketMissing = uploadErrorText.includes('bucket') && uploadErrorText.includes('not found');
      if (isBucketMissing) {
        const fallbackResult = await uploadToBucket(FALLBACK_IMAGE_BUCKET);
        uploadedBucket = fallbackResult.bucket;
        uploadError = fallbackResult.error;
      }

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(uploadedBucket)
        .getPublicUrl(filePath);

      handleUpdate(key, publicUrl);
      toast.success("Imagem enviada com sucesso! Lembre-se de clicar em Salvar Tudo para confirmar.");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setUploading(null);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    const toastId = toast.loading("Salvando configurações...");
    try {
      const errors: string[] = [];
      const mutations = buildSettingsMutations(settings, initialSettings);
      for (const m of mutations) {
        if (m.op === "upsert") {
          const { error } = await supabase
            .from("site_settings")
            .upsert({ key: m.key, value: m.value } as any, { onConflict: "key" });
          if (error) errors.push(`${m.key}: ${error.message}`);
        } else {
          const { error } = await supabase
            .from("site_settings")
            .update({ value: m.value })
            .eq("key", m.key);
          if (error) errors.push(`${m.key}: ${error.message}`);
        }
      }
      if (errors.length) {
        console.error("Settings save errors:", errors);
        toast.error(`Falha ao salvar: ${errors[0]}`, { id: toastId });
      } else {
        toast.success("Todas as configurações foram atualizadas!", { id: toastId });
      }
      await fetchSettings();
      await queryClient.invalidateQueries({
        queryKey: ["site-settings"],
        refetchType: "all",
      });
    } catch (error: any) {
      toast.error("Erro ao salvar algumas configurações: " + (error?.message || ""), { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const getIcon = (key: string) => {
    if (key.includes('cashback') || key.includes('percent')) return <Percent className="h-4 w-4" />;
    if (key.includes('amount') || key.includes('withdrawal')) return <DollarSign className="h-4 w-4" />;
    if (key.includes('whatsapp') || key.includes('support') || key.includes('phone')) return <MessageSquare className="h-4 w-4" />;
    if (key.includes('hero_style') || key.includes('marquee')) return <Layout className="h-4 w-4" />;
    if (key.includes('site_name') || key.includes('company_name') || key.includes('site_title')) return <Globe className="h-4 w-4" />;
    if (key.includes('logo') || key.includes('favicon')) return <ImageIcon className="h-4 w-4" />;
    if (key.includes('pixel') || key.includes('analytics') || key.includes('tag_manager') || key.includes('scripts')) return <TrendingUp className="h-4 w-4" />;
    if (key.includes('app')) return <Smartphone className="h-4 w-4" />;
    if (key.includes('transition') || key.includes('speed')) return <Zap className="h-4 w-4" />;
    if (key.includes('shimmer') || key.includes('glow')) return <Sparkles className="h-4 w-4" />;
    if (key.includes('hover')) return <MousePointer2 className="h-4 w-4" />;
    if (key.includes('color')) return <Palette className="h-4 w-4" />;
    if (key.includes('opacity') || key.includes('easing')) return <Sliders className="h-4 w-4" />;
    if (key.includes('mercadopago') || key.includes('manual_payment') || key.includes('paggue') || key.includes('payment_provider')) return <CreditCard className="h-4 w-4" />;
    return <Settings className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Painel de Configurações</h1>
          <p className="text-muted-foreground text-sm font-medium">Personalize a identidade visual e as regras do seu sistema.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={saving} className="rounded-xl font-bold border-2">
            Descartar
          </Button>
          <Button onClick={saveSettings} disabled={saving || !hasChanges} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 rounded-xl px-8 h-11 border-b-4 border-primary/40 active:border-b-0 active:translate-y-1 transition-all">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Tudo
          </Button>
        </div>
      </div>

      <Tabs defaultValue="visual" className="space-y-6">
        <TabsList className="bg-secondary/50 p-1.5 rounded-2xl h-auto flex flex-wrap lg:flex-nowrap w-full justify-start border border-border/50 no-scrollbar gap-1.5 overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="visual" className="rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold text-[10px] md:text-sm flex-1 md:flex-none">Visual & Logo</TabsTrigger>
          <TabsTrigger value="sales" className="rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold text-[10px] md:text-sm flex-1 md:flex-none">Página de Venda</TabsTrigger>
          <TabsTrigger value="pwa" className="rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold text-[10px] md:text-sm flex-1 md:flex-none">Aplicativo (PWA)</TabsTrigger>
          <TabsTrigger value="seo" className="rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold text-[10px] md:text-sm flex-1 md:flex-none">SEO & Favicon</TabsTrigger>
          <TabsTrigger value="tracking" className="rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold text-[10px] md:text-sm flex-1 md:flex-none">Pixels & Analytics</TabsTrigger>
          <TabsTrigger value="payment" className="rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold text-[10px] md:text-sm flex-1 md:flex-none">Pagamentos</TabsTrigger>
          <TabsTrigger value="finance" className="rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold text-[10px] md:text-sm flex-1 md:flex-none">Financeiro</TabsTrigger>
          <TabsTrigger value="company" className="rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold text-[10px] md:text-sm flex-1 md:flex-none">Empresa</TabsTrigger>
          <TabsTrigger value="menu" className="rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold text-[10px] md:text-sm flex-1 md:flex-none">Menu</TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="space-y-8 outline-none">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm border-2 hover:border-primary/20 transition-all duration-300 rounded-3xl overflow-hidden shadow-sm">
              <CardHeader className="pb-4 bg-primary/5">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-sm">
                    <Globe className="h-5 w-5" />
                  </div>
                  Identidade do Site
                </CardTitle>
                <CardDescription className="font-medium">Nome e Logotipo principal da sua plataforma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <SettingField 
                  s={settings.find(s => s.key === 'site_name')} 
                  onUpdate={handleUpdate} 
                  label={settingNames['site_name']}
                  getIcon={getIcon}
                />
                <div className="pt-2">
                  <SettingField 
                    s={settings.find(s => s.key === 'site_logo_url')} 
                    onUpdate={handleUpdate} 
                    label={settingNames['site_logo_url']}
                    getIcon={getIcon}
                    onUpload={handleUpload}
                    uploading={uploading === 'site_logo_url'}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <SettingField 
                    s={settings.find(s => s.key === 'site_logo_height')} 
                    onUpdate={handleUpdate} 
                    label={settingNames['site_logo_height']}
                    getIcon={getIcon}
                    type="number"
                  />
                  <SettingField 
                    s={settings.find(s => s.key === 'site_logo_height_mobile')} 
                    onUpdate={handleUpdate} 
                    label={settingNames['site_logo_height_mobile']}
                    getIcon={getIcon}
                    type="number"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-primary">Favicon e Título SEO</h4>
                    <p className="text-[10px] text-muted-foreground font-medium">Agora configurados na aba <strong>SEO & Google</strong> para melhor organização.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const seoTrigger = document.querySelector('[value="seo"]') as HTMLElement;
                    seoTrigger?.click();
                  }} className="text-xs font-bold border-primary/20 hover:bg-primary/10 transition-colors h-8">
                    Ir para SEO
                  </Button>
                </div>

                <Separator className="my-4 bg-primary/10" />

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-primary">Configurar Aplicativo (PWA)</h4>
                    <p className="text-[10px] text-muted-foreground font-medium">Ative o banner de download e o ícone de instalação mobile.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const pwaTrigger = document.querySelector('[value="pwa"]') as HTMLElement;
                    pwaTrigger?.click();
                  }} className="text-xs font-bold border-primary/20 hover:bg-primary/10 transition-colors h-8">
                    Ir para App
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm md:col-span-2 border-2 hover:border-primary/20 transition-all duration-300 rounded-3xl overflow-hidden shadow-sm">
              <CardHeader className="pb-4 bg-primary/5">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-sm">
                    <Palette className="h-5 w-5" />
                  </div>
                  Personalização de Cores
                </CardTitle>
                <CardDescription className="font-medium">Defina a paleta de cores predominante</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <SettingField 
                  s={settings.find(s => s.key === 'primary_color')} 
                  onUpdate={handleUpdate} 
                  label={settingNames['primary_color']}
                  getIcon={getIcon}
                />
                <div className="grid grid-cols-2 gap-4">
                  <SettingField 
                    s={settings.find(s => s.key === 'title_shimmer_primary')} 
                    onUpdate={handleUpdate} 
                    label={settingNames['title_shimmer_primary']}
                    getIcon={getIcon}
                  />
                  <SettingField 
                    s={settings.find(s => s.key === 'title_shimmer_secondary')} 
                    onUpdate={handleUpdate} 
                    label={settingNames['title_shimmer_secondary']}
                    getIcon={getIcon}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm md:col-span-2 border-2 hover:border-primary/20 transition-all duration-300 rounded-3xl overflow-hidden shadow-sm">
              <CardHeader className="pb-4 bg-primary/5">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-sm">
                    <Layout className="h-5 w-5" />
                  </div>
                  Experiência da Home (Landing Page)
                </CardTitle>
                <CardDescription className="font-medium">Configure como seus clientes veem a página inicial</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-8 md:grid-cols-3">
                  <SettingField 
                    s={settings.find(s => s.key === 'layout_mode')} 
                    onUpdate={handleUpdate} 
                    label={settingNames['layout_mode']}
                    getIcon={getIcon}
                    type="select"
                    options={[
                      { label: "Padrão (Hero + Cards)", value: "default" },
                      { label: "Em Linha (Compacto Mobile)", value: "inline" }
                    ]}
                  />
                  <SettingField 
                    s={settings.find(s => s.key === 'site_theme')} 
                    onUpdate={handleUpdate} 
                    label={settingNames['site_theme']}
                    getIcon={getIcon}
                    type="select"
                    options={[
                      { label: "Escuro (Dark)", value: "dark" },
                      { label: "Claro (Light)", value: "light" },
                      { label: "Automático (Sistema)", value: "system" }
                    ]}
                  />
                  <SettingField 
                    s={settings.find(s => s.key === 'inline_testimonials_count')} 
                    onUpdate={handleUpdate} 
                    label={settingNames['inline_testimonials_count']}
                    getIcon={getIcon}
                    type="number"
                    placeholder="3"
                  />
                  <SettingField 
                    s={settings.find(s => s.key === 'inline_show_finished_raffles')} 
                    onUpdate={handleUpdate} 
                    label={settingNames['inline_show_finished_raffles']}
                    getIcon={getIcon}
                  />
                  <SettingField 
                    s={settings.find(s => s.key === 'home_hero_style')} 
                    onUpdate={handleUpdate} 
                    label={settingNames['home_hero_style']}
                    getIcon={getIcon}
                    type="select"
                    options={[
                      { label: "Estilo Moderno (Grid)", value: "1" },
                      { label: "Estilo Clássico (Full)", value: "2" },
                      { label: "Estilo Minimalista", value: "3" }
                    ]}
                  />
                  <SettingField 
                    s={settings.find(s => s.key === 'hero_transition_type')} 
                    onUpdate={handleUpdate} 
                    label={settingNames['hero_transition_type']}
                    getIcon={getIcon}
                    type="select"
                    options={[
                      { label: "Deslizar (Slide)", value: "slide" },
                      { label: "Esmaecer (Fade)", value: "fade" },
                      { label: "Zoom", value: "zoom" }
                    ]}
                  />
                  <SettingField 
                    s={settings.find(s => s.key === 'hero_transition_speed')} 
                    onUpdate={handleUpdate} 
                    label={settingNames['hero_transition_speed']}
                    getIcon={getIcon}
                  />
                  
                  <div className="md:col-span-1">
                    <SettingField 
                      s={settings.find(s => s.key === 'home_marquee_enabled')} 
                      onUpdate={handleUpdate} 
                      label={settingNames['home_marquee_enabled']}
                      getIcon={getIcon}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <SettingField 
                      s={settings.find(s => s.key === 'home_marquee_text')} 
                      onUpdate={handleUpdate} 
                      label={settingNames['home_marquee_text']}
                      getIcon={getIcon}
                    />
                  </div>

                  <div className="md:col-span-3 grid gap-6 md:grid-cols-3 pt-2 border-t border-border/50">
                    <SettingField 
                      s={settings.find(s => s.key === 'home_show_testimonials')} 
                      onUpdate={handleUpdate} 
                      label={settingNames['home_show_testimonials']}
                      getIcon={getIcon}
                    />
                    <SettingField 
                      s={settings.find(s => s.key === 'home_show_hall_fame')} 
                      onUpdate={handleUpdate} 
                      label={settingNames['home_show_hall_fame']}
                      getIcon={getIcon}
                    />
                    <SettingField 
                      s={settings.find(s => s.key === 'home_show_live_activity')} 
                      onUpdate={handleUpdate} 
                      label={settingNames['home_show_live_activity']}
                      getIcon={getIcon}
                    />
                    <SettingField 
                      s={getSetting('home_show_games_combo')} 
                      onUpdate={handleUpdate} 
                      label={settingNames['home_show_games_combo']}
                      getIcon={getIcon}
                    />
                    {HOME_GAME_SETTING_KEYS.map((k) => (
                      <SettingField
                        key={k}
                        s={getSetting(k)}
                        onUpdate={handleUpdate}
                        label={(settingNames as any)[k]}
                        getIcon={getIcon}
                      />
                    ))}
                  </div>

                  <div className="md:col-span-3">
                    <SettingField 
                      s={settings.find(s => s.key === 'home_testimonials_json')} 
                      onUpdate={handleUpdate} 
                      label={settingNames['home_testimonials_json']}
                      getIcon={getIcon}
                      type="textarea"
                      placeholder='[{"id":1,"name":"João","date":"hoje","rating":5,"text":"Excelente!","avatar":"https://...","verified":true}]'
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 px-1">Deixe vazio para usar os depoimentos padrão. Formato: array JSON com id, name, date, rating, text, avatar, verified.</p>
                  </div>

                  <div className="md:col-span-3">
                    <SettingField 
                      s={settings.find(s => s.key === 'home_hall_fame_json')} 
                      onUpdate={handleUpdate} 
                      label={settingNames['home_hall_fame_json']}
                      getIcon={getIcon}
                      type="textarea"
                      placeholder='[{"id":"1","winner_name":"Maria","prize_description":"iPhone 15","ticket_number":"1234","campaigns":{"title":"Ação"},"avatar_url":"https://...","winner_type":"raffle","draw_date":"2025-01-01"}]'
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 px-1">Deixe vazio para usar os ganhadores reais do banco. Aceita JSON com os mesmos campos.</p>
                  </div>
                  
                  <div className="md:col-span-1">
                     <SettingField 
                      s={settings.find(s => s.key === 'animation_easing')} 
                      onUpdate={handleUpdate} 
                      label={settingNames['animation_easing']}
                      getIcon={getIcon}
                      type="select"
                      options={[
                        { label: "Suave (Ease-in-out)", value: "cubic-bezier(0.4, 0, 0.2, 1)" },
                        { label: "Linear", value: "linear" },
                        { label: "Rebote (Bounce)", value: "cubic-bezier(0.68, -0.55, 0.27, 1.55)" }
                      ]}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="pwa" className="space-y-6 outline-none">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm border-2 hover:border-primary/20 transition-all duration-300 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="pb-4 bg-primary/5">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-sm">
                  <Smartphone className="h-5 w-5" />
                </div>
                Aplicativo Mobile (PWA)
              </CardTitle>
              <CardDescription className="font-medium">Habilite a função de baixar aplicativo e o banner flutuante</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6">
                <SettingField 
                  s={settings.find(s => s.key === 'enable_download_app')} 
                  onUpdate={handleUpdate} 
                  label="Habilitar Banner de Download do App"
                  getIcon={getIcon}
                  type="select"
                  options={[
                    { label: "Sim, mostrar banner e botão", value: "true" },
                    { label: "Não, ocultar função de app", value: "false" }
                  ]}
                />
                <SettingField 
                  s={settings.find(s => s.key === 'app_download_link')} 
                  onUpdate={handleUpdate} 
                  label="Link Direto para o App (Opcional)"
                  getIcon={getIcon}
                  placeholder="Ex: link do seu .apk ou página de download"
                />
              </div>
              
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  <strong>Nota:</strong> Quando habilitado, um banner flutuante aparecerá para os usuários sugerindo a instalação do aplicativo em seus telefones. No Android, o navegador pedirá a instalação direta. No iOS, o banner mostrará instruções de como adicionar à tela de início.
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] font-bold rounded-lg h-8"
                    onClick={() => {
                      localStorage.removeItem("pwa-banner-dismissed");
                      toast.info("O banner de instalação aparecerá na página inicial em alguns segundos.");
                    }}
                  >
                    Resetar Banner (Para Testes)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6 outline-none">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm border-2 hover:border-primary/20 transition-all duration-300 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="pb-4 bg-primary/5">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-sm">
                  <Globe className="h-5 w-5" />
                </div>
                SEO & Favicon
              </CardTitle>
              <CardDescription className="font-medium">Configure como seu site aparece no Google e nas abas do navegador</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6">
                <SettingField 
                  s={settings.find(s => s.key === 'site_title')} 
                  onUpdate={handleUpdate} 
                  label="Título da Página (Aparece na aba do navegador)"
                  getIcon={getIcon}
                />
                <SettingField 
                  s={settings.find(s => s.key === 'site_favicon_url')} 
                  onUpdate={handleUpdate} 
                  label="Favicon (Ícone da Aba - 32x32 ou 64x64)"
                  getIcon={getIcon}
                  onUpload={handleUpload}
                  uploading={uploading === 'site_favicon_url'}
                />
                <SettingField 
                  s={settings.find(s => s.key === 'site_keywords')} 
                  onUpdate={handleUpdate} 
                  label="Palavras-chave (SEO)"
                  getIcon={() => <Search className="h-4 w-4" />}
                />
                <SettingField 
                  s={settings.find(s => s.key === 'site_description')} 
                  onUpdate={handleUpdate} 
                  label="Descrição para o Google"
                  getIcon={() => <FileText className="h-4 w-4" />}
                  type="textarea"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6 outline-none">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm border-2 hover:border-primary/20 transition-all duration-300 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="pb-4 bg-primary/5">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-sm">
                  <TrendingUp className="h-5 w-5" />
                </div>
                Pixels & Rastreamento
              </CardTitle>
              <CardDescription className="font-medium">Conecte sua conta do Facebook e Google para acompanhar métricas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6">
                <SettingField 
                  s={settings.find(s => s.key === 'facebook_pixel_id')} 
                  onUpdate={handleUpdate} 
                  label="Facebook Pixel ID"
                  getIcon={getIcon}
                  placeholder="Apenas os números do ID"
                />
                <SettingField 
                  s={settings.find(s => s.key === 'google_analytics_id')} 
                  onUpdate={handleUpdate} 
                  label="Google Analytics ID (GA4)"
                  getIcon={getIcon}
                  placeholder="Ex: G-XXXXXXXX"
                />
                <SettingField 
                  s={settings.find(s => s.key === 'google_tag_manager_id')} 
                  onUpdate={handleUpdate} 
                  label="Google Tag Manager ID (GTM)"
                  getIcon={getIcon}
                  placeholder="Ex: GTM-XXXXXXX"
                />
                
                <Separator className="my-2" />
                
                <SettingField 
                  s={settings.find(s => s.key === 'custom_header_scripts')} 
                  onUpdate={handleUpdate} 
                  label="Scripts Adicionais no Header (<head>)"
                  getIcon={getIcon}
                  type="textarea"
                />
                <SettingField 
                  s={settings.find(s => s.key === 'custom_body_scripts')} 
                  onUpdate={handleUpdate} 
                  label="Scripts Adicionais no Body (Final do <body>)"
                  getIcon={getIcon}
                  type="textarea"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="payment" className="space-y-6 outline-none">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden border-2 border-primary/20 rounded-3xl shadow-sm">
             <div className="bg-primary/5 p-6 border-b border-primary/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold tracking-tight">Método de Pagamento Ativo</h3>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Defina como seus clientes irão pagar pelas cotas</p>
                    </div>
                  </div>
                  <div className="w-full md:w-80">
                     <SettingField 
                      s={settings.find(s => s.key === 'active_payment_provider')} 
                      onUpdate={handleUpdate} 
                      label=""
                      getIcon={() => null}
                      type="select"
                       options={[
                        { label: "Mercado Pago (Oficial / Automático)", value: "mercadopago" },
                        { label: "Paggue (PIX Automático)", value: "paggue" },
                        { label: "Pay2m (PIX Automático)", value: "pay2m" },
                        { label: "Manual (Envio de Comprovante)", value: "manual" }
                      ]}
                    />
                  </div>
                </div>
             </div>
             
             <div className="p-8">
                <div className="grid gap-8 lg:grid-cols-3">
                  {/* Mercado Pago */}
                  <div className={`space-y-5 p-6 rounded-3xl transition-all duration-300 border-2 ${
                    settings.find(s => s.key === 'active_payment_provider')?.value === 'mercadopago' 
                    ? 'bg-primary/5 border-primary shadow-xl shadow-primary/5' 
                    : 'bg-secondary/20 border-border/50 opacity-60 grayscale-[0.5]'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-[#009EE3] flex items-center justify-center text-white shadow-lg">
                          <span className="font-black text-lg">MP</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-base">Mercado Pago</h4>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Automático</p>
                          </div>
                        </div>
                      </div>
                      {settings.find(s => s.key === 'active_payment_provider')?.value === 'mercadopago' && (
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                          <Check className="h-5 w-5 stroke-[3px]" />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4 pt-2">
                      <SettingField 
                        s={settings.find(s => s.key === 'mercadopago_public_key')} 
                        onUpdate={handleUpdate} 
                        label="Public Key (APP_USR-...)"
                        getIcon={getIcon}
                      />
                      <SettingField 
                        s={settings.find(s => s.key === 'mercadopago_access_token')} 
                        onUpdate={handleUpdate} 
                        label="Access Token (TEST-... ou APP_USR-...)"
                        getIcon={getIcon}
                        type="password"
                      />
                    </div>
                  </div>

                  {/* Paggue */}
                  <div className={`space-y-5 p-6 rounded-3xl transition-all duration-300 border-2 ${
                    settings.find(s => s.key === 'active_payment_provider')?.value === 'paggue' 
                    ? 'bg-primary/5 border-primary shadow-xl shadow-primary/5' 
                    : 'bg-secondary/20 border-border/50 opacity-60 grayscale-[0.5]'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                          <span className="font-black text-lg">PG</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-base">Paggue</h4>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">PIX Direto</p>
                          </div>
                        </div>
                      </div>
                      {settings.find(s => s.key === 'active_payment_provider')?.value === 'paggue' && (
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                          <Check className="h-5 w-5 stroke-[3px]" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 pt-2">
                      <SettingField 
                        s={settings.find(s => s.key === 'paggue_client_key')} 
                        onUpdate={handleUpdate} 
                        label="Client Key"
                        getIcon={getIcon}
                      />
                      <SettingField 
                        s={settings.find(s => s.key === 'paggue_client_secret')} 
                        onUpdate={handleUpdate} 
                        label="Client Secret"
                        getIcon={getIcon}
                        type="password"
                      />
                    </div>
                  </div>

                  {/* Pay2m */}
                  <div className={`space-y-5 p-6 rounded-3xl transition-all duration-300 border-2 ${
                    settings.find(s => s.key === 'active_payment_provider')?.value === 'pay2m' 
                    ? 'bg-primary/5 border-primary shadow-xl shadow-primary/5' 
                    : 'bg-secondary/20 border-border/50 opacity-60 grayscale-[0.5]'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                          <span className="font-black text-lg">P2</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-base">Pay2m</h4>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">API PIX</p>
                          </div>
                        </div>
                      </div>
                      {settings.find(s => s.key === 'active_payment_provider')?.value === 'pay2m' && (
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                          <Check className="h-5 w-5 stroke-[3px]" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 pt-2">
                      <SettingField 
                        s={settings.find(s => s.key === 'pay2m_client_key')} 
                        onUpdate={handleUpdate} 
                        label="Client Key"
                        getIcon={getIcon}
                      />
                      <SettingField 
                        s={settings.find(s => s.key === 'pay2m_client_secret')} 
                        onUpdate={handleUpdate} 
                        label="Client Secret"
                        getIcon={getIcon}
                        type="password"
                      />
                    </div>
                  </div>

                  {/* Manual */}
                  <div className={`space-y-5 p-6 rounded-3xl transition-all duration-300 border-2 ${
                    settings.find(s => s.key === 'active_payment_provider')?.value === 'manual' 
                    ? 'bg-primary/5 border-primary shadow-xl shadow-primary/5' 
                    : 'bg-secondary/20 border-border/50 opacity-60 grayscale-[0.5]'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg">
                          <Smartphone className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base">PIX Manual</h4>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Comprovante</p>
                          </div>
                        </div>
                      </div>
                      {settings.find(s => s.key === 'active_payment_provider')?.value === 'manual' && (
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                          <Check className="h-5 w-5 stroke-[3px]" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 pt-2">
                      <SettingField 
                        s={settings.find(s => s.key === 'manual_payment_pix_key')} 
                        onUpdate={handleUpdate} 
                        label="Chave PIX para Recebimento"
                        getIcon={getIcon}
                      />
                      <SettingField 
                        s={settings.find(s => s.key === 'manual_payment_pix_name')} 
                        onUpdate={handleUpdate} 
                        label="Nome do Titular da Conta"
                        getIcon={getIcon}
                      />
                      <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                        <p className="text-[10px] text-amber-700 leading-tight font-medium">
                          Neste modo, o cliente precisa enviar o comprovante via WhatsApp para confirmação manual.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* System/Supabase for queue */}
                  {isUserMaster && (
                    <div className="space-y-5 p-6 rounded-3xl bg-secondary/10 border-2 border-border/50 col-span-1 md:col-span-3">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-lg">
                          <Database className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base">Configurações do Sistema</h4>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Automático / Fila de Retentativas</p>
                        </div>
                      </div>
                      
                      <div className="grid gap-6 md:grid-cols-2">
                        <SettingField 
                          s={settings.find(s => s.key === 'supabase_url')} 
                          onUpdate={handleUpdate} 
                          label="Supabase URL"
                          getIcon={getIcon}
                        />
                        <SettingField 
                          s={settings.find(s => s.key === 'supabase_service_role_key')} 
                          onUpdate={handleUpdate} 
                          label="Service Role Key"
                          getIcon={getIcon}
                          type="password"
                        />
                      </div>
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-[10px] text-primary font-bold uppercase leading-relaxed">
                          Estas chaves são necessárias para o funcionamento da **Fila de Retentativas** e webhooks automáticos.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
             </div>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-6 outline-none">
           <Card className="border-border/50 bg-card/50 backdrop-blur-sm rounded-3xl p-6 shadow-sm border-2">
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {['cashback_percent', 'affiliate_commission_percent', 'min_withdrawal_amount', 'support_whatsapp'].map(key => (
                   <div key={key} className="bg-secondary/30 p-4 rounded-2xl border border-border/50 hover:border-primary/20 transition-colors">
                      <SettingField 
                        s={settings.find(s => s.key === key)} 
                        onUpdate={handleUpdate} 
                        label={settingNames[key]}
                        getIcon={getIcon}
                      />
                   </div>
                ))}
                {['whatsapp_group_link', 'whatsapp_group_enabled'].map(key => (
                  <div key={key} className="bg-secondary/30 p-4 rounded-2xl border border-border/50 hover:border-primary/20 transition-colors md:col-span-2">
                    <SettingField
                      s={getSetting(key, 'true')}
                      onUpdate={handleUpdate}
                      label={settingNames[key]}
                      getIcon={getIcon}
                    />
                  </div>
                ))}
             </div>
           </Card>

           <Card className="border-emerald-500/40 bg-emerald-500/5 backdrop-blur-sm rounded-3xl overflow-hidden border-2 shadow-sm">
             <CardHeader className="bg-emerald-500/10">
               <CardTitle className="text-xl flex items-center gap-2">
                 <DollarSign className="h-5 w-5 text-emerald-500" />
                 Bônus por Depósito
               </CardTitle>
               <CardDescription className="font-medium">
                 Configure faixas de bônus creditadas automaticamente no saldo do usuário quando ele confirmar um depósito PIX. Formato: <code className="text-[11px] bg-background/60 px-1.5 py-0.5 rounded">[{'{'}"min":200,"bonus":25{'}'}]</code>. Ex.: depositando R$ 200 → ganha +R$ 25 no saldo.
               </CardDescription>
             </CardHeader>
             <CardContent className="pt-6 space-y-3">
               <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                 Faixas (JSON)
               </Label>
               <textarea
                 value={getSetting('deposit_bonus_tiers', '[]').value}
                 onChange={(e) => handleUpdate('deposit_bonus_tiers', e.target.value)}
                 rows={6}
                 spellCheck={false}
                 className="w-full rounded-2xl bg-background/60 border border-border p-3 font-mono text-xs focus:border-emerald-500/50 focus:outline-none"
                 placeholder='[{"min":50,"bonus":5},{"min":100,"bonus":15},{"min":200,"bonus":40}]'
               />
               <p className="text-[10px] text-muted-foreground italic">
                 A faixa aplicada será a de maior <strong>min</strong> igual ou menor que o valor depositado. Deixe como <code>[]</code> para desativar o bônus.
               </p>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6 outline-none">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-xl">Itens do Menu (Header)</CardTitle>
              <CardDescription className="font-medium">
                Ative ou desative os links do menu principal do site (ex: Federal, Ganhadores, Comunicados). Desabilitar oculta o item em todos os layouts.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {['menu_campanhas_enabled','menu_ganhadores_enabled','menu_federal_enabled','menu_comunicados_enabled','menu_suporte_enabled','menu_minha_conta_enabled','header_register_button_enabled'].map(key => (
                  <div key={key} className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                    <SettingField
                      s={settings.find(s => s.key === key)}
                      onUpdate={handleUpdate}
                      label={settingNames[key]}
                      getIcon={getIcon}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6 outline-none">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-xl">Informações Legais & Contato</CardTitle>
              <CardDescription className="font-medium">Estes dados aparecem no rodapé e nos termos do site para transparência</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 pt-8">
              {settings.filter(s => s.key.includes('company_')).map(s => (
                 <SettingField 
                  key={s.id}
                  s={s} 
                  onUpdate={handleUpdate} 
                  label={settingNames[s.key]}
                  getIcon={getIcon}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6 outline-none">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm border-2 hover:border-primary/20 transition-all duration-300 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="pb-4 bg-primary/5">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-sm">
                  <TrendingUp className="h-5 w-5" />
                </div>
                Configurações da Página de Vendas
              </CardTitle>
              <CardDescription className="font-medium">Transforme seu site em uma vitrine para vender a plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/50 border border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">Ativar Página de Vendas</Label>
                    <p className="text-sm text-muted-foreground">Quando ativo, a home será substituída pela página de vendas da plataforma.</p>
                  </div>
                  <Switch 
                    checked={settings.find(s => s.key === 'show_sales_page')?.value === 'true'}
                    onCheckedChange={(checked) => handleUpdate('show_sales_page', checked ? 'true' : 'false')}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SettingField 
                    s={settings.find(s => s.key === 'sales_page_type')} 
                    onUpdate={handleUpdate} 
                    label="Tipo da Plataforma (ex: ações, leilões)"
                    getIcon={getIcon}
                  />
                  <SettingField 
                    s={settings.find(s => s.key === 'sales_page_whatsapp')} 
                    onUpdate={handleUpdate} 
                    label="WhatsApp de Vendas (Opcional)"
                    getIcon={getIcon}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Palavras-chave SEO da Página de Vendas
                  </Label>
                  <Input 
                    value={settings.find(s => s.key === 'sales_page_keywords')?.value || ''}
                    onChange={(e) => handleUpdate('sales_page_keywords', e.target.value)}
                    placeholder="Ex: sistema para ações online, script para ações online..."
                    className="rounded-xl border-2 h-12"
                  />
                  <p className="text-xs text-muted-foreground">Separe por vírgulas. A primeira será o título principal da página.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

export function SettingField({ 
  s, 
  onUpdate, 
  getIcon, 
  label, 
  type = "text", 
  options = [],
  onUpload,
  uploading,
  placeholder
}: { 
  s: any, 
  onUpdate: any, 
  getIcon: any, 
  label: string,
  type?: "text" | "password" | "select" | "boolean" | "color" | "number" | "textarea",
  options?: { label: string, value: string }[],
  onUpload?: (key: string, file: File) => void,
  uploading?: boolean,
  placeholder?: string
}) {
  if (!s) return null;

  const isBoolean = s.value === 'true' || s.value === 'false' || s.key.includes('enable');
  const isColor = s.key.includes('color') || s.key.includes('shimmer_primary') || s.key.includes('shimmer_secondary');
  const isImage = (s.key.includes('logo') && s.key.includes('url')) || s.key.includes('favicon') || s.key.includes('image_url');

  const renderInput = () => {
    if (isBoolean) {
      return (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/40 border border-border/50 shadow-inner">
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{s.value === 'true' ? 'Ativado' : 'Desativado'}</span>
          <Switch 
            checked={s.value === 'true'} 
            onCheckedChange={(checked) => onUpdate(s.key, checked.toString())} 
            className="data-[state=checked]:bg-primary"
          />
        </div>
      );
    }

    if (type === "textarea") {
      return (
        <textarea 
          value={s.value} 
          onChange={(e) => onUpdate(s.key, e.target.value)} 
          className="w-full bg-secondary/40 border-border/50 min-h-[100px] p-3 rounded-xl font-medium text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      );
    }

    if (type === "select") {

      return (
        <Select value={s.value} onValueChange={(val) => onUpdate(s.key, val)}>
          <SelectTrigger className="w-full bg-secondary/40 border-border/50 h-11 rounded-xl font-bold shadow-inner">
            <SelectValue placeholder="Selecione uma opção" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border rounded-xl">
            {options.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="rounded-lg">{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (isColor) {
      return (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input 
              value={s.value} 
              onChange={(e) => onUpdate(s.key, e.target.value)} 
              className="pl-12 bg-secondary/40 border-border/50 h-11 rounded-xl font-mono text-xs uppercase font-bold shadow-inner" 
            />
            <div 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg border border-border shadow-md pointer-events-none"
              style={{ backgroundColor: s.value }}
            />
          </div>
          <div className="relative overflow-hidden w-12 h-11 rounded-xl border border-border/50 bg-secondary/40">
            <Input 
              type="color" 
              value={s.value} 
              onChange={(e) => onUpdate(s.key, e.target.value)}
              className="absolute inset-[-10px] w-[200%] h-[200%] cursor-pointer border-none"
            />
          </div>
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="space-y-4">
           {s.value && (
             <div className="relative group aspect-video md:aspect-[4/1] rounded-2xl border-2 border-dashed border-primary/20 flex items-center justify-center overflow-hidden bg-primary/5 shadow-inner">
                <img src={s.value} alt="Preview" className="max-h-full max-w-full object-contain p-4 drop-shadow-md" />
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="rounded-xl font-bold shadow-lg"
                    onClick={() => onUpdate(s.key, "")}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remover
                  </Button>
                </div>
             </div>
           )}
            <div className="flex flex-col sm:flex-row gap-2">
               <Input 
                 value={s.value} 
                 placeholder="Cole a URL ou suba um arquivo..."
                 onChange={(e) => onUpdate(s.key, e.target.value)} 
                 className="flex-1 bg-secondary/40 border-border/50 h-11 rounded-xl shadow-inner font-medium text-xs" 
               />
               <div className="relative">
                 <Input 
                   type="file" 
                   accept="image/*"
                   onChange={(e) => e.target.files?.[0] && onUpload?.(s.key, e.target.files[0])}
                   className="absolute inset-0 opacity-0 cursor-pointer z-10"
                   disabled={uploading}
                 />
                 <Button variant="secondary" className="h-11 w-full sm:w-auto rounded-xl px-4 font-bold border-2 hover:bg-secondary transition-colors" disabled={uploading}>
                   {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                   {uploading ? "Subindo..." : "Upload"}
                 </Button>
               </div>
            </div>
        </div>
      );
    }

    return (
      <Input 
        type={type}
        value={s.value} 
        placeholder={placeholder}
        onChange={(e) => onUpdate(s.key, e.target.value)} 
        className="bg-secondary/40 border-border/50 h-11 rounded-xl shadow-inner font-bold" 
      />
    );
  };

  if (!s) {
    return (
      <div className="space-y-3 p-4 rounded-xl border border-dashed border-muted-foreground/20 bg-muted/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-muted/10 text-muted-foreground"><Settings className="h-4 w-4" /></div>
          <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">{label || "Configuração Ausente"}</Label>
        </div>
        <p className="text-xs text-muted-foreground italic">Chave não encontrada no banco de dados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-primary/5 text-primary ring-1 ring-primary/10 shadow-sm">{getIcon(s.key)}</div>
        <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/80">{label || s.key}</Label>
      </div>
      {renderInput()}
    </div>
  );
}
