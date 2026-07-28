import { motion } from "framer-motion";
import { 
  Zap, Trophy, Gift, Star, Ticket, Activity, ShieldCheck, Award, Heart, 
  MessageCircle, Instagram, Youtube, Phone, Mail, Box, Crown, Package,
  LayoutDashboard, ShoppingCart, Bell, Settings, LogOut, ArrowLeft, Menu
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import CampaignCard from "@/components/CampaignCard";
import WinnerCard from "@/components/WinnerCard";
import MysteryBox from "@/components/MysteryBox";
import Roulette from "@/components/Roulette";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { runContrastAudit } from "@/lib/accessibility";

const mockCampaign = {
  id: "preview-id",
  title: "Sorteio de Exemplo",
  subtitle: "Este é um subtítulo de exemplo para o preview",
  image_url: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=1000&auto=format&fit=crop",
  ticket_price: 0.99,
  total_tickets: 100000,
  sold_tickets: 45000,
  urgency_tag: "Em destaque",
  status: "active",
  featured: true
};

const mockWinner = {
  id: "w1",
  winner_name: "Carlos Alberto",
  prize_description: "iPhone 15 Pro Max",
  ticket_number: "0492",
  campaigns: { title: "Ação Premium Apple" },
  avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&auto=format&fit=crop"
};

const PreviewPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-32 space-y-16">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-black uppercase tracking-tighter italic">Preview do Sistema</h1>
              <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Utilize esta página para auditar cores, contrastes e componentes.</p>
            </div>
            <div className="h-1 w-20 bg-primary rounded-full" />
          </div>
          
          <Button 
            onClick={() => runContrastAudit(true)}
            variant="outline" 
            className="h-12 px-6 rounded-2xl gap-2 font-black uppercase italic tracking-widest text-[10px] border-primary/30 hover:bg-primary/5"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            Executar Auditoria de Contraste
          </Button>
        </section>

        <Tabs defaultValue="components" className="w-full">
          <TabsList className="bg-card border h-14 p-1 rounded-2xl w-full justify-start mb-8 overflow-x-auto">
            <TabsTrigger value="components" className="rounded-xl px-8 font-black uppercase italic tracking-widest text-[10px]">Componentes</TabsTrigger>
            <TabsTrigger value="typography" className="rounded-xl px-8 font-black uppercase italic tracking-widest text-[10px]">Tipografia</TabsTrigger>
            <TabsTrigger value="colors" className="rounded-xl px-8 font-black uppercase italic tracking-widest text-[10px]">Cores</TabsTrigger>
            <TabsTrigger value="buttons" className="rounded-xl px-8 font-black uppercase italic tracking-widest text-[10px]">Botões</TabsTrigger>
          </TabsList>

          <TabsContent value="components" className="space-y-16">
            <section className="space-y-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter border-l-4 border-primary pl-4">Cartões de Campanha</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                <CampaignCard campaign={mockCampaign as any} index={0} />
                <CampaignCard campaign={{ ...mockCampaign, featured: false, urgency_tag: "Últimas Cotas" } as any} index={1} />
                <CampaignCard campaign={{ ...mockCampaign, sold_tickets: 95000, status: "drawn", urgency_tag: "Finalizado" } as any} index={2} />
              </div>
            </section>

            <section className="space-y-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter border-l-4 border-primary pl-4">Ganhadores</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <WinnerCard winner={mockWinner as any} index={0} />
                <WinnerCard winner={mockWinner as any} index={1} />
                <WinnerCard winner={mockWinner as any} index={2} />
                <WinnerCard winner={mockWinner as any} index={3} />
              </div>
            </section>

            <section className="space-y-8">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter border-l-4 border-primary pl-4">Badges</h2>
              <div className="flex flex-wrap gap-4 p-8 bg-card rounded-3xl border border-border shadow-sm">
                <Badge variant="default">Default Badge</Badge>
                <Badge variant="secondary">Secondary Badge</Badge>
                <Badge variant="outline">Outline Badge</Badge>
                <Badge variant="destructive">Destructive Badge</Badge>
                <Badge className="bg-primary text-primary-foreground font-black italic uppercase tracking-widest">Custom Primary</Badge>
                <Badge className="bg-amber-500 text-white font-black italic uppercase tracking-widest">Premium Gold</Badge>
                <Badge className="bg-rose-500 text-white animate-pulse font-black italic uppercase tracking-widest">Live Now</Badge>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="typography" className="space-y-12">
            <Card className="rounded-3xl border-border shadow-sm">
              <CardContent className="p-12 space-y-10">
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Heading 1</p>
                  <h1 className="text-6xl font-black uppercase tracking-tighter italic">TITULO DE EXEMPLO H1</h1>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Heading 2</p>
                  <h2 className="text-4xl font-black uppercase tracking-tighter italic">TITULO DE EXEMPLO H2</h2>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Heading 3</p>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">TITULO DE EXEMPLO H3</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Body Regular</p>
                  <p className="text-base text-foreground leading-relaxed">Este é um exemplo de texto corrido para testar a legibilidade da fonte Inter em tamanhos normais sobre o fundo atual.</p>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Body Muted</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">Este texto utiliza a cor muted-foreground, ideal para descrições secundárias e informações menos importantes.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="colors" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              { name: "Primary", class: "bg-primary", text: "text-primary-foreground" },
              { name: "Secondary", class: "bg-secondary", text: "text-secondary-foreground" },
              { name: "Background", class: "bg-background", text: "text-foreground", border: "border" },
              { name: "Card", class: "bg-card", text: "text-card-foreground", border: "border" },
              { name: "Muted", class: "bg-muted", text: "text-muted-foreground" },
              { name: "Accent", class: "bg-accent", text: "text-accent-foreground" },
              { name: "Destructive", class: "bg-destructive", text: "text-destructive-foreground" },
              { name: "Success", class: "bg-success", text: "text-white" },
              { name: "Warning", class: "bg-warning", text: "text-white" },
              { name: "Info", class: "bg-info", text: "text-white" },
            ].map((color) => (
              <div key={color.name} className="space-y-2">
                <div className={`h-24 w-full rounded-2xl ${color.class} ${color.border || ''} shadow-sm flex items-center justify-center p-2 text-center`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${color.text}`}>{color.name}</span>
                </div>
                <p className="text-[10px] font-bold text-center uppercase tracking-widest text-muted-foreground">{color.name}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="buttons" className="space-y-12">
            <Card className="rounded-3xl border-border shadow-sm">
              <CardContent className="p-12 space-y-12">
                <div className="space-y-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Variantes</p>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="default">Default Button</Button>
                    <Button variant="secondary">Secondary Button</Button>
                    <Button variant="outline">Outline Button</Button>
                    <Button variant="ghost">Ghost Button</Button>
                    <Button variant="destructive">Destructive Button</Button>
                    <Button variant="link">Link Button</Button>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Tamanhos</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large Button</Button>
                    <Button size="icon"><Zap className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Custom Styles</p>
                  <div className="flex flex-wrap gap-6">
                    <Button className="h-14 px-8 rounded-2xl font-black uppercase italic tracking-widest bg-gradient-to-r from-primary to-purple-600 shadow-xl shadow-primary/20">
                      Glow Primary <Zap className="ml-2 h-4 w-4 fill-current" />
                    </Button>
                    <Button className="h-14 px-8 rounded-full font-black uppercase italic tracking-widest bg-zinc-900 text-white border-2 border-primary/50 shadow-2xl">
                      Neon Border <Crown className="ml-2 h-4 w-4 text-primary" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default PreviewPage;
