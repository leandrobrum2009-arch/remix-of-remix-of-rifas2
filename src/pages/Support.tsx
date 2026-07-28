import { motion } from "framer-motion";
import { MessageCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSiteSettings } from "@/hooks/useData";
import { SEO } from "@/components/SEO";

const Support = () => {
  const { data: siteSettings } = useSiteSettings();
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Suporte" description="Precisa de ajuda? Entre em contato com nossa equipe de suporte." />
      <Header />
      <div className="container py-8 pt-[calc(var(--header-height,100px)+2rem)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-2"
        >
          <MessageCircle className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold">Suporte</h1>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border/50 bg-card p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold">Envie uma mensagem</h2>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input id="subject" placeholder="Sobre o que precisa de ajuda?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea id="message" placeholder="Descreva sua dúvida..." rows={4} />
            </div>
            <Button className="w-full font-semibold">Enviar Mensagem</Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">Atendimento rápido via WhatsApp</p>
                </div>
              </div>
              <Button variant="outline" className="mt-3 w-full">
                Abrir WhatsApp
              </Button>
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">E-mail</h3>
                  <p className="text-sm text-muted-foreground">{siteSettings?.company_email || "contato@empresa.com"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Telefone</h3>
                  <p className="text-sm text-muted-foreground">{siteSettings?.company_phone || siteSettings?.support_whatsapp || "(00) 0000-0000"}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Support;
