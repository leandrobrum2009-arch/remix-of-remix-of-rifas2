import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, DollarSign, Share2, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

export default function Affiliates() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Programa de Afiliados"
        description="Indique amigos, divulgue campanhas e ganhe comissões em cada compra realizada por meio do seu link exclusivo de afiliado."
      />
      <Header />
      <main className="container pt-32 pb-20">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-black uppercase italic leading-none tracking-tighter">
              Programa de <span className="text-primary neon-text-primary">Afiliados</span>
            </h1>
            <p className="text-muted-foreground uppercase font-bold tracking-widest text-sm">
              Indique amigos e ganhe 10% de comissão em cada compra!
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Share2, title: "Indique", desc: "Compartilhe seu link exclusivo com amigos." },
              { icon: DollarSign, title: "Ganhe", desc: "Receba 10% de comissão em todas as vendas." },
              { icon: TrendingUp, title: "Cresça", desc: "Acompanhe seus ganhos em tempo real." },
            ].map((item, i) => (
              <Card key={i} className="border-white/5 bg-card/40 backdrop-blur-md">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tighter">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent overflow-hidden">
            <CardContent className="p-12 text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Comece a faturar agora</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Nosso programa de afiliados é aberto para todos. Basta criar sua conta e acessar seu painel para obter seu link.
                </p>
              </div>
              
              {user ? (
                <Link to="/conta">
                  <Button size="lg" className="h-16 rounded-2xl px-12 font-black uppercase italic tracking-widest glow-primary text-lg">
                    Ir para meu Painel
                  </Button>
                </Link>
              ) : (
                <Link to="/cadastrar">
                  <Button size="lg" className="h-16 rounded-2xl px-12 font-black uppercase italic tracking-widest glow-primary text-lg">
                    Criar Conta Grátis
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
