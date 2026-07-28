import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  CheckCircle2, MessageSquare, Shield, Zap, TrendingUp, Users, Smartphone, 
  Globe, ArrowRight, Play, Palette, Sparkles, Star, Lock, CreditCard, 
  BarChart3, ChevronRight, Gift, Trophy, Gamepad2, Layout, Video, 
  Share2, Headphones, Layers, Eye, Target, MousePointer2, Database,
  Settings, Terminal, Bell, Mail, Search, Award
} from "lucide-react";
import { useSiteSettings } from "@/hooks/useData";
import { SEO } from "@/components/SEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import GoogleReviews from "@/components/GoogleReviews";

const faqs = [
  { q: "Preciso de conhecimento técnico para usar o sistema?", a: "Absolutamente não. Nosso painel é extremamente intuitivo, permitindo que qualquer pessoa gerencie ações, banners e financeiro com poucos cliques." },
  { q: "Como funciona a integração de pagamentos?", a: "Integramos automaticamente com os principais gateways de pagamento (Mercado Pago, Paggue, etc.). O sistema confirma o pagamento instantaneamente e libera os números para o cliente." },
  { q: "O sistema é responsivo para celular?", a: "Sim! Nosso design é 100% mobile-first, garantindo uma experiência fluida para seus clientes comprarem ações pelo celular ou computador." },
  { q: "Posso personalizar as cores e logotipo?", a: "Com certeza. Você tem controle total da identidade visual através do painel administrativo, sem precisar editar código." },
  { q: "Existe suporte técnico?", a: "Sim, todos os nossos planos contam com suporte dedicado. Além disso, oferecemos treinamento e tutoriais em vídeo para você começar com o pé direito." },
  { q: "Como funciona o sistema de afiliados?", a: "Você pode ativar um programa de afiliados onde seus vendedores ganham comissões por vendas realizadas, aumentando exponencialmente sua divulgação." },
  { q: "O sistema é seguro contra fraudes?", a: "Sim, contamos com proteção contra bots, bloqueio de números falsos e auditoria completa de cada transação." },
  { q: "Posso ter domínios próprios?", a: "Sim, você pode conectar seu próprio domínio (ex: www.suarifaprofissional.com.br) na plataforma." },
  { q: "O sistema emite números aleatórios automaticamente?", a: "Sim, o sistema gerencia automaticamente a numeração e reserva, evitando qualquer conflito de números repetidos." },
  { q: "Qual o prazo para ativação após a compra?", a: "A ativação é extremamente rápida, geralmente em poucas horas sua plataforma já está pronta para receber os primeiros acessos." }
];

export default function SalesPage() {
  const navigate = useNavigate();
  const { data: settings } = useSiteSettings();
  const siteName = settings?.site_name || "Plataforma de Ações";
  const mainKeyword = settings?.sales_page_keywords?.split(",")?.[0]?.trim() || "sistema para ações online";
  const supportWhatsapp = settings?.sales_page_whatsapp || settings?.support_whatsapp || "";

  const handleWhatsApp = () => {
    if (supportWhatsapp) {
      window.open(`https://wa.me/${supportWhatsapp.replace(/\D/g, '')}?text=Olá! Gostaria de saber mais sobre os planos do ${mainKeyword}.`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans antialiased overflow-x-hidden selection:bg-emerald-500 selection:text-white relative">
      {/* Animated Background Orbs for entire page */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.4, 1],
            opacity: [0.1, 0.3, 0.1],
            x: [0, 200, 0],
            y: [0, 100, 0],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/20 rounded-full blur-[180px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.3, 1, 1.3],
            opacity: [0.05, 0.2, 0.05],
            x: [0, -200, 0],
            y: [0, -100, 0],
            rotate: [0, -90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[180px]" 
        />
        <motion.div 
          animate={{ 
            opacity: [0, 0.15, 0],
            scale: [0.8, 1.1, 0.8]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-cyan-500/5 rounded-full blur-[200px]" 
        />
      </div>

      <SEO 
        title={`O Melhor ${mainKeyword} - Lucrativo e Completo`}
        description={`Tenha agora o seu próprio ${mainKeyword}. Script completo com painel administrativo, integração de pagamentos e sistema de afiliados.`}
        keywords={settings?.sales_page_keywords}
      />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Zap className="h-6 w-6 text-black fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight">{siteName}</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#funcionalidades" className="text-sm font-medium hover:text-emerald-400 transition-colors">Funcionalidades</a>
            <a href="#manual" className="text-sm font-medium hover:text-emerald-400 transition-colors">Manual do Sistema</a>
            <a href="#depoimentos" className="text-sm font-medium hover:text-emerald-400 transition-colors">Depoimentos</a>
            <Button variant="ghost" className="text-sm font-medium" onClick={() => navigate("/campanhas")}>Demonstração</Button>
            <Button onClick={handleWhatsApp} className="rounded-full px-6 bg-emerald-500 hover:bg-emerald-600 text-black font-bold">Começar Agora</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#0A0A0A] to-[#0A0A0A]" />
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-8"
          >
            <Star className="w-4 h-4 fill-emerald-400" />
            <span className="text-sm font-semibold">Tecnologia de elite para ações profissionais</span>
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[1.1]">
            O Mais Completo <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              {mainKeyword}
            </span>
          </h1>
          <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto">
            A única plataforma que une sorteios, gamificação e um CRM potente em um só lugar. Venda mais com Roleta, Raspadinha e Sorteios da Federal automáticos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={handleWhatsApp} className="h-14 px-8 text-lg rounded-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold shadow-2xl shadow-emerald-500/20 hover:scale-105 transition-all">
              Quero minha plataforma agora
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/campanhas")} className="h-14 px-8 text-lg rounded-full border-zinc-800 hover:bg-zinc-800 backdrop-blur-sm transition-all">
              Ver demonstração <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          
          {/* Trust Badges */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all">
            <div className="flex items-center gap-2"><Lock className="w-5 h-5" /> SSL Seguro</div>
            <div className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> PIX Automático</div>
            <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Painel BI</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Suporte VIP</div>
          </div>
        </div>
      </section>

      {/* Manual & Features Detail Section */}
      <section id="manual" className="py-24 px-6 bg-[#0F0F0F]">
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6 italic">Manual de <span className="text-emerald-500">Funcionalidades</span></h2>
            <p className="text-zinc-500 max-w-2xl mx-auto text-lg uppercase tracking-widest font-bold">Tudo o que você precisa para dominar o mercado</p>
          </div>

          <div className="space-y-32">
            {/* Gamificação */}
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <div className="flex items-center gap-3 text-emerald-500 mb-6">
                  <Gamepad2 className="w-8 h-8" />
                  <span className="text-sm font-black uppercase tracking-[0.3em]">Super Gamificação</span>
                </div>
                <h3 className="text-4xl font-black mb-8 leading-tight italic">Mais do que ações: Uma <span className="text-emerald-400">experiência de jogo</span></h3>
                <div className="space-y-6 text-zinc-400">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5 text-emerald-500" /></div>
                    <div>
                      <h4 className="text-white font-bold text-xl mb-2">Raspadinha Digital</h4>
                      <p>O cliente raspa na tela e ganha na hora. Aumenta absurdamente a retenção e o desejo de compra.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><Gift className="w-5 h-5 text-emerald-500" /></div>
                    <div>
                      <h4 className="text-white font-bold text-xl mb-2">Caixa Premiada</h4>
                      <p>Sistema de loot boxes onde o usuário abre caixas misteriosas em busca de prêmios exclusivos.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><MousePointer2 className="w-5 h-5 text-emerald-500" /></div>
                    <div>
                      <h4 className="text-white font-bold text-xl mb-2">Roleta da Sorte</h4>
                      <p>Gire para ganhar descontos, números extras ou prêmios instantâneos. Totalmente configurável.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
              <div className="relative group">
                <div className="absolute inset-0 bg-emerald-500/20 blur-[120px] rounded-full group-hover:bg-emerald-500/30 transition-all" />
                <div className="relative bg-[#1A1A1A] border border-white/10 rounded-[3rem] p-8 shadow-2xl">
                  {/* Mockup do Game */}
                  <div className="aspect-[4/3] bg-zinc-900 rounded-2xl p-6 flex flex-col items-center justify-center border border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1024')] bg-cover" />
                    <Trophy className="w-16 h-16 text-emerald-500 mb-4" />
                    <p className="text-2xl font-black italic mb-2 uppercase">Raspadinha Premiada</p>
                    <div className="w-full h-24 bg-zinc-800 rounded-xl border-2 border-dashed border-emerald-500/50 flex items-center justify-center">
                      <p className="text-xs text-emerald-500/50 font-black uppercase tracking-widest">Raspe aqui para ver o prêmio</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sorteios e Transparência */}
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="order-2 md:order-1 relative group">
                <div className="absolute inset-0 bg-cyan-500/20 blur-[120px] rounded-full group-hover:bg-cyan-500/30 transition-all" />
                <div className="relative bg-[#1A1A1A] border border-white/10 rounded-[3rem] p-8 shadow-2xl">
                  {/* Mockup do Painel de Sorteio */}
                  <div className="aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 relative flex items-center justify-center">
                     <Play className="w-12 h-12 text-cyan-500 absolute z-10 animate-pulse" />
                     <div className="absolute bottom-0 inset-x-0 p-4 bg-black/60 backdrop-blur-md">
                        <div className="flex justify-center gap-2">
                           {[5, 2, 8, 9, 3].map((n, i) => (
                             <div key={i} className="w-8 h-10 bg-cyan-500 rounded flex items-center justify-center font-black text-black">{n}</div>
                           ))}
                        </div>
                     </div>
                     <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1024" className="w-full h-full object-cover opacity-40" alt="Painel de transmissão ao vivo do sorteio com números premiados destacados" />
                  </div>
                </div>
              </div>
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-1 md:order-2">
                <div className="flex items-center gap-3 text-cyan-400 mb-6">
                  <Star className="w-8 h-8" />
                  <span className="text-sm font-black uppercase tracking-[0.3em]">Sorteios Automáticos</span>
                </div>
                <h3 className="text-4xl font-black mb-8 leading-tight italic">Transparência total com a <span className="text-cyan-400">Loteria Federal</span></h3>
                <div className="space-y-6 text-zinc-400">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0"><Database className="w-5 h-5 text-cyan-500" /></div>
                    <div>
                      <h4 className="text-white font-bold text-xl mb-2">Integração Federal</h4>
                      <p>O sistema puxa automaticamente os resultados da Caixa. Sem intervenção humana, 100% de confiança.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0"><Video className="w-5 h-5 text-cyan-500" /></div>
                    <div>
                      <h4 className="text-white font-bold text-xl mb-2">Painel para Live</h4>
                      <p>Um painel exclusivo com contagem regressiva e efeitos visuais para você transmitir seu sorteio ao vivo.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0"><Target className="w-5 h-5 text-cyan-500" /></div>
                    <div>
                      <h4 className="text-white font-bold text-xl mb-2">Maior e Menor Cota</h4>
                      <p>Premie quem mais compra (Maior Cota) e até o comprador da menor cota, incentivando todos os perfis.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* CRM e Gestão */}
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                <div className="flex items-center gap-3 text-purple-500 mb-6">
                  <Users className="w-8 h-8" />
                  <span className="text-sm font-black uppercase tracking-[0.3em]">CRM & Growth</span>
                </div>
                <h3 className="text-4xl font-black mb-8 leading-tight italic">Um ecossistema de <span className="text-purple-400">crescimento automático</span></h3>
                <div className="space-y-6 text-zinc-400">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0"><MessageSquare className="w-5 h-5 text-purple-500" /></div>
                    <div>
                      <h4 className="text-white font-bold text-xl mb-2">Cadastro Inteligente (CRM)</h4>
                      <p>Histórico completo de cada cliente: o que comprou, quanto gastou e quais campanhas mais gosta.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0"><Share2 className="w-5 h-5 text-purple-500" /></div>
                    <div>
                      <h4 className="text-white font-bold text-xl mb-2">Automação de Grupos</h4>
                      <p>Ao finalizar o cadastro ou compra, o cliente é direcionado automaticamente para seu WhatsApp ou Telegram VIP.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0"><BarChart3 className="w-5 h-5 text-purple-500" /></div>
                    <div>
                      <h4 className="text-white font-bold text-xl mb-2">Ranking de Compradores</h4>
                      <p>Gere disputa saudável entre seus clientes com um ranking público em tempo real dos maiores compradores.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
              <div className="relative group">
                <div className="absolute inset-0 bg-purple-500/20 blur-[120px] rounded-full group-hover:bg-purple-500/30 transition-all" />
                <div className="relative bg-[#1A1A1A] border border-white/10 rounded-[3rem] p-8 shadow-2xl">
                  {/* Mockup do CRM */}
                  <div className="bg-zinc-900 rounded-2xl p-6 border border-white/5">
                     <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500 font-bold">JD</div>
                        <div>
                           <p className="text-white font-bold">João das Ações</p>
                           <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Cliente Platinum</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-zinc-800 rounded-xl"><p className="text-[9px] text-zinc-500 mb-1">TOTAL COMPRADO</p><p className="text-emerald-500 font-black">R$ 12.450</p></div>
                        <div className="p-4 bg-zinc-800 rounded-xl"><p className="text-[9px] text-zinc-500 mb-1">TICKETS</p><p className="text-white font-black">1.250 un</p></div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customization & Support */}
      <section className="py-24 px-6 bg-[#0A0A0A]">
        <div className="container mx-auto max-w-6xl">
           <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/5 rounded-[4rem] p-12 md:p-20 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500" />
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 text-zinc-400 border border-white/10 mb-8">
                <Headphones className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-widest">Desenvolvimento Sob Demanda</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black mb-8 italic">Seu sistema, <span className="text-white underline decoration-emerald-500">suas regras</span></h2>
              <p className="text-zinc-400 text-lg md:text-xl mb-12 max-w-3xl mx-auto leading-relaxed">
                Além de todas as funcionalidades inclusas, nossa equipe de engenharia está pronta para criar <span className="text-white font-bold">funcionalidades exclusivas</span> para o seu projeto. Personalização de template, novas artes para redes sociais e suporte técnico dedicado garantido.
              </p>
              <div className="grid md:grid-cols-3 gap-8 text-left mb-16">
                 {[
                   { icon: Layout, title: "Design Custom", desc: "Artes e layout adaptados 100% à sua identidade visual." },
                   { icon: Layers, title: "Novos Módulos", desc: "Ideias novas? Nós transformamos em código para sua plataforma." },
                   { icon: Headphones, title: "Treinamento VIP", desc: "Consultoria para você aprender a extrair o máximo de lucro." }
                 ].map((item, i) => (
                   <div key={i} className="p-6 bg-white/5 rounded-3xl border border-white/5">
                      <item.icon className="w-8 h-8 text-emerald-500 mb-4" />
                      <h4 className="text-white font-bold text-lg mb-2">{item.title}</h4>
                      <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
                   </div>
                 ))}
              </div>
              <Button size="lg" onClick={handleWhatsApp} className="h-16 px-12 text-xl font-bold rounded-full bg-emerald-500 text-black hover:bg-emerald-600 shadow-2xl shadow-emerald-500/50 hover:scale-105 transition-all animate-pulse">
                Solicitar projeto personalizado
              </Button>
           </div>
        </div>
      </section>

      {/* Advanced Details Section */}
      <section className="py-24 px-6 bg-[#0A0A0A]">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">
                Infraestrutura de <br />
                <span className="text-emerald-400">Alta Performance.</span>
              </h2>
              <div className="space-y-6">
                {[
                  { title: "Escalabilidade Sem Travamentos", desc: "Infraestrutura pronta para suportar ações de 100 mil até 10 milhões de números com fluidez total." },
                  { title: "Vídeos e Sliders", desc: "Personalize sua página de venda com vídeos do YouTube/Vimeo e sliders de imagens em alta definição." },
                  { title: "Baixa Automática PIX", desc: "O sistema detecta o pagamento via QR Code e envia os números no WhatsApp do cliente em segundos." },
                  { title: "Recuperação de Carrinho & Utmify", desc: "Ferramentas automáticas para entrar em contato com clientes que não finalizaram a compra e rastreio avançado de UTM." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-1">{item.title}</h4>
                      <p className="text-zinc-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
              <div className="relative bg-[#1A1A1A] border border-white/10 p-4 rounded-[2rem] shadow-2xl overflow-hidden aspect-video flex items-center justify-center">
                 <div className="text-center">
                    <Smartphone className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-bounce" />
                    <p className="font-bold text-xl">Interface Mobile Premiada</p>
                    <p className="text-zinc-500 text-sm">Otimizada para máxima conversão no celular</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Multimedia & Customization Section */}
      <section className="py-24 px-6 bg-[#0F0F0F] border-t border-white/5">
        <div className="container mx-auto max-w-6xl">
           <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="relative order-2 md:order-1">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                       <div className="aspect-[3/4] bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center relative">
                          <img src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1024" className="absolute inset-0 w-full h-full object-cover opacity-30" alt="Video" />
                          <Video className="w-8 h-8 text-white relative z-10" />
                       </div>
                       <div className="aspect-square bg-emerald-500/10 rounded-3xl border border-emerald-500/20 flex items-center justify-center">
                          <Layout className="w-8 h-8 text-emerald-500" />
                       </div>
                    </div>
                    <div className="space-y-4 pt-12">
                       <div className="aspect-square bg-cyan-500/10 rounded-3xl border border-cyan-500/20 flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-cyan-500" />
                       </div>
                       <div className="aspect-[3/4] bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center relative">
                          <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1024" className="absolute inset-0 w-full h-full object-cover opacity-30" alt="Stats" />
                          <BarChart3 className="w-8 h-8 text-white relative z-10" />
                       </div>
                    </div>
                 </div>
              </div>
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-1 md:order-2">
                <div className="flex items-center gap-3 text-emerald-500 mb-6">
                  <Video className="w-8 h-8" />
                  <span className="text-sm font-black uppercase tracking-[0.3em]">Multimídia Avançada</span>
                </div>
                <h3 className="text-4xl font-black mb-8 leading-tight italic">Impacto visual que <span className="text-emerald-400">gera vendas</span></h3>
                <div className="space-y-6 text-zinc-400">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><Play className="w-5 h-5 text-emerald-500" /></div>
                    <div>
                      <h4 className="text-white font-bold text-xl mb-2">Vídeos de Demonstração</h4>
                      <p>Insira vídeos do YouTube ou Vimeo diretamente na página da ação para explicar o prêmio e gerar desejo imediato.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><Layers className="w-5 h-5 text-emerald-500" /></div>
                    <div>
                      <h4 className="text-white font-bold text-xl mb-2">Slide de Imagens</h4>
                      <p>Galeria inteligente que organiza suas fotos automaticamente, otimizada para carregamento ultra-rápido.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><Layout className="w-5 h-5 text-emerald-500" /></div>
                    <div>
                      <h4 className="text-white font-bold text-xl mb-2">Customização de Seções</h4>
                      <p>Arraste e solte para mudar a ordem das seções na página: descrição, galeria, compras, ranking e muito mais.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
           </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-[#0A0A0A] border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Vendas hoje", value: "R$ 15.280", prefix: "+" },
              { label: "Números suportados", value: "10 Milhões", prefix: "Até" },
              { label: "Clientes ativos", value: "1.500", prefix: "+" },
              { label: "Segurança", value: "100%", prefix: "" }
            ].map((s, i) => (
              <div key={i}>
                <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest mb-2">{s.label}</p>
                <p className="text-3xl md:text-4xl font-black text-emerald-400">{s.prefix} {s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid - Everything you need */}
      <section id="funcionalidades" className="py-24 px-6 bg-[#0F0F0F]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 italic">Funcionalidades</h2>
            <p className="text-emerald-500 font-bold uppercase tracking-widest">Tudo o que você precisa</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Database, title: "Até 10 milhões de números", desc: "Suporte para sorteios massivos com alta performance." },
              { icon: TrendingUp, title: "Desconto progressivo", desc: "Incentive compras maiores com descontos automáticos conforme o cliente compra mais números." },
              { icon: Trophy, title: "Cotas premiadas", desc: "Defina números específicos que dão prêmios instantâneos." },
              { icon: BarChart3, title: "Relatórios completos", desc: "Acompanhe vendas, acessos e lucros em tempo real." },
              { icon: Users, title: "Programa de afiliados", desc: "Permita que usuários divulguem suas ações e ganhem comissão automaticamente por cada venda gerada." },
              { icon: Smartphone, title: "Aplicativo web (PWA)", desc: "Seu sistema instalado no celular do cliente como um App." },
              { icon: Star, title: "Ranking de clientes", desc: "Gere competição e aumente as vendas com ranking público." },
              { icon: Gift, title: "Caixas surpresas", desc: "Engajamento extra com abertura de prêmios misteriosos." },
              { icon: Sparkles, title: "Raspadinhas premiadas", desc: "Sorteios instantâneos com visual de raspadinha digital." },
              { icon: Gamepad2, title: "Roletas premiadas", desc: "Gire a sorte para ganhar descontos ou prêmios." },
              { icon: Target, title: "Integração com Meta Ads", desc: "Pixel e API de conversão configurados para tráfego pago." },
              { icon: Globe, title: "Google Analytics", desc: "Análise profunda do comportamento dos seus visitantes." },
              { icon: Layers, title: "Google Tag Manager", desc: "Gestão fácil de todas as suas tags de marketing." },
              { icon: MessageSquare, title: "Integração com WhatsApp", desc: "Envio de comprovantes e suporte via WhatsApp." },
              { icon: Zap, title: "Integração com OneSignal", desc: "Notificações push diretamente no navegador/celular." },
              { icon: MessageSquare, title: "Emails personalizáveis", desc: "Configure o layout dos emails enviados aos clientes." },
              { icon: Play, title: "Sorteador automático", desc: "Realize sorteios rápidos e seguros dentro da plataforma." },
              { icon: Trophy, title: "Maior e menor cota", desc: "Premiações especiais para o maior e menor comprador." },
              { icon: CreditCard, title: "Múltiplos Gateways", desc: "Mercado Pago, Paggue, Pix e outros integrados." },
              { icon: Star, title: "Sorteios exclusivos", desc: "Crie campanhas fechadas para grupos específicos." },
              { icon: Shield, title: "Painel de revendedor", desc: "Controle total para quem vende suas cotas no físico." },
              { icon: Palette, title: "Customização CSS e JS", desc: "Liberdade total para alterar o visual e scripts extras." },
              { icon: Star, title: "Sistema de avaliações", desc: "Deixe seus clientes avaliarem e passarem confiança." },
              { icon: MousePointer2, title: "Integração com Utmify", desc: "Rastreamento avançado de UTMs para suas vendas." }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-6 bg-[#1A1A1A] border border-white/5 rounded-3xl hover:border-emerald-500/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-emerald-500" />
                </div>
                <h4 className="text-white font-bold text-lg mb-2">{feature.title}</h4>
                <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Badges */}
      <section className="py-24 px-6 bg-[#0A0A0A] relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-emerald-500/10 blur-[150px] pointer-events-none" />
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-12">Gateways & Confiança</p>
          <div className="flex flex-wrap justify-center gap-10 md:gap-16 items-center">
             <div className="group relative">
               <div className="absolute inset-0 bg-blue-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
               <img src="https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo.png" alt="Mercado Pago" className="h-10 md:h-14 w-auto object-contain brightness-0 invert group-hover:brightness-100 group-hover:invert-0 transition-all duration-500" />
             </div>
             <div className="group relative">
               <div className="absolute inset-0 bg-emerald-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
               <img src="https://paggue.io/wp-content/uploads/2023/11/logo-paggue-1.png" alt="Paggue" className="h-10 md:h-14 w-auto object-contain brightness-0 invert group-hover:brightness-100 group-hover:invert-0 transition-all duration-500" />
             </div>
             <div className="group relative">
               <div className="absolute inset-0 bg-cyan-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
               <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_Pix.png/1200px-Logo_Pix.png" alt="PIX" className="h-10 md:h-14 w-auto object-contain brightness-0 invert group-hover:brightness-100 group-hover:invert-0 transition-all duration-500" />
             </div>
             <div className="group relative">
               <div className="absolute inset-0 bg-white/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
               <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google" className="h-10 md:h-14 w-auto object-contain brightness-0 invert group-hover:brightness-100 group-hover:invert-0 transition-all duration-500" />
             </div>
          </div>
        </div>
      </section>


      {/* Testimonials */}
      <section id="depoimentos" className="py-24 px-6 bg-[#0A0A0A]">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-4xl font-black mb-12">O que nossos parceiros dizem</h2>
          <GoogleReviews />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-[#0F0F0F]">

        <div className="container mx-auto max-w-3xl">
          <h2 className="text-4xl font-black text-center mb-12">Dúvidas Frequentes</h2>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="bg-[#1A1A1A] border-none px-6 rounded-2xl">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-zinc-400 leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="py-24 px-6">
        <div className="container mx-auto max-w-5xl bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <Zap className="w-64 h-64" />
          </div>
          <h2 className="text-4xl md:text-6xl font-black mb-8 text-white relative z-10">Sua jornada começa aqui</h2>
          <p className="text-emerald-100 text-xl mb-12 max-w-xl mx-auto relative z-10">Escalabilidade, segurança e lucro. Tenha a melhor plataforma de ações do Brasil hoje mesmo.</p>
          <Button size="lg" onClick={handleWhatsApp} className="h-16 px-12 text-xl font-bold rounded-full bg-white text-emerald-900 hover:bg-emerald-50 relative z-10 shadow-2xl">
            Ativar minha plataforma AGORA
          </Button>
          <div className="mt-16 pt-8 border-t border-white/20 flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 text-sm">
            <p>© 2025 {siteName}. Todos os direitos reservados.</p>
            <a href="https://ncbrasil.com.br" target="_blank" rel="noopener noreferrer" className="hover:underline">
              Desenvolvido por NC Brasil
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

