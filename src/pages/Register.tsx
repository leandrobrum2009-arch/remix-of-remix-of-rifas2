import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, User, Ticket, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { compressImage } from "@/lib/image-upload";
import { useSiteSettings } from "@/hooks/useData";
import { SEO } from "@/components/SEO";
import { maskCPF, maskPhone, validateCPF, validatePhone } from "@/lib/validations";
import { cn } from "@/lib/utils";

const Register = () => {
  const { data: siteSettings } = useSiteSettings();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isCpfValid, setIsCpfValid] = useState(true);
  const [isPhoneValid, setIsPhoneValid] = useState(true);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (cpf) setIsCpfValid(validateCPF(cpf));
  }, [cpf]);

  useEffect(() => {
    if (phone) setIsPhoneValid(validatePhone(phone));
  }, [phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear validation before re-checking
    setIsCpfValid(true);
    setIsPhoneValid(true);

    if (!name || !email || !password || !cpf || !phone) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    if (cpf && !validateCPF(cpf)) {
      setIsCpfValid(false);
      toast({ title: "CPF inválido", description: "Por favor, verifique o número digitado.", variant: "destructive" });
      return;
    }

    if (phone && !validatePhone(phone)) {
      setIsPhoneValid(false);
      toast({ title: "Telefone inválido", description: "Por favor, insira um número com DDD.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password, name, cpf, phone);
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Handle Avatar Upload
        if (avatar) {
          const processedFile = await compressImage(avatar);
          const fileExt = processedFile.name.split('.').pop();
          const filePath = `${user.id}/${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, processedFile);
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);
            await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
          }
        }

        const referredBy = localStorage.getItem('referred_by');
        if (referredBy) {
          await supabase.from("profiles").update({ referred_by_code: referredBy }).eq("user_id", user.id);
          localStorage.removeItem('referred_by');
        }
      }
    }

    setIsLoading(false);
    if (error) {
      toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conta criada com sucesso!" });
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Cadastrar" description="Crie sua conta para participar dos sorteios." />
      <Header />
      <div className="container flex justify-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="text-center space-y-4 pt-12">
            <h1 className="font-display text-2xl font-bold italic uppercase tracking-widest text-animate-gradient">Criar Conta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre-se para participar dos sorteios
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <div className="space-y-2 flex flex-col items-center">
              <Label>Foto de Perfil (Opcional)</Label>
              <div className="relative group mt-2">
                <div className="h-20 w-20 rounded-full border-2 border-border/50 overflow-hidden bg-muted flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatar(file);
                      setAvatarPreview(URL.createObjectURL(file));
                    }
                  }} />
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Clique para selecionar imagem ou GIF</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF (Obrigatório)</Label>
              <div className="relative">
                <Input 
                  id="cpf" 
                  value={cpf} 
                  onChange={(e) => setCpf(maskCPF(e.target.value))} 
                  placeholder="000.000.000-00" 
                  className={cn(
                    "transition-colors",
                    cpf.length > 0 && (isCpfValid ? "border-emerald-500/50" : "border-rose-500/50")
                  )}
                  required
                />
                {cpf.length > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCpfValid ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-rose-500" />}
                  </div>
                )}
                {cpf.length > 0 && !isCpfValid && (
                  <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-1 ml-1 mt-1">Número de CPF inválido</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (Obrigatório)</Label>
              <div className="relative">
                <Input 
                  id="phone" 
                  value={phone} 
                  onChange={(e) => setPhone(maskPhone(e.target.value))} 
                  placeholder="(00) 00000-0000" 
                  className={cn(
                    "transition-colors",
                    phone.length > 0 && (isPhoneValid ? "border-emerald-500/50" : "border-rose-500/50")
                  )}
                  required
                />
                {phone.length > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isPhoneValid ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-rose-500" />}
                  </div>
                )}
                {phone.length > 0 && !isPhoneValid && (
                  <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-1 ml-1 mt-1">Número de WhatsApp inválido</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crie uma senha (min. 6 caracteres)" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full font-semibold" size="lg" type="submit" disabled={isLoading}>
              {isLoading ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/entrar" className="font-semibold text-primary hover:underline">Entrar</Link>
          </p>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Register;
