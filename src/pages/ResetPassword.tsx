import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "Use pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      toast({ title: "Não foi possível alterar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Senha alterada!", description: "Entre com a sua nova senha." });
    navigate("/entrar");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Redefinir senha" description="Crie uma nova senha para a sua conta." />
      <Header />
      <div className="container flex justify-center py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 pt-12 text-center">
            <h1 className="font-display text-2xl font-bold italic uppercase tracking-widest text-animate-gradient">
              Nova senha
            </h1>
            <p className="text-sm text-muted-foreground">
              {ready
                ? "Escolha a nova senha da sua conta"
                : "Abra esta página pelo link enviado no seu e-mail para redefinir a senha."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/50 bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                required
              />
            </div>
            <Button className="w-full font-semibold" size="lg" type="submit" disabled={isLoading || !ready}>
              {isLoading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ResetPassword;
