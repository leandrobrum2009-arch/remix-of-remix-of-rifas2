import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, ShieldCheck, Video, Scale, AlertTriangle, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useData";

const Terms = () => {
  const { data: siteSettings } = useSiteSettings();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container pt-28 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-2">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-animate-gradient">
              Termos de Uso
            </h1>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
              {siteSettings?.site_name || "Nossa Empresa"} • Última atualização: Maio 2026
            </p>
          </div>

          <div className="bg-card border border-border rounded-[40px] p-8 md:p-12 shadow-sm space-y-12">
            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <p className="text-lg font-bold text-foreground leading-relaxed italic border-l-4 border-primary pl-6 py-2 bg-primary/5 rounded-r-2xl">
                Ao participar de qualquer ação realizada pelo site {siteSettings?.site_name || "nossa plataforma"}, o cliente declara estar ciente e de acordo com os termos abaixo:
              </p>

              <Separator className="my-10" />

              <div className="grid gap-12">
                {/* Seção 1 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Scale className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-black uppercase italic tracking-tight m-0">1. FUNCIONAMENTO DO SISTEMA DE PORCENTAGEM (%)</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed pl-13">
                    <p>
                      O sistema de porcentagem apresentado no site tem como finalidade informar, de forma aproximada, o andamento da venda das cotas da ação vigente.
                    </p>
                    <p>
                      Por questões técnicas e operacionais, essa porcentagem pode sofrer oscilações, especialmente em períodos de grande volume de acessos ou quando houver elevado número de cotas reservadas e ainda não pagas.
                    </p>
                    <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive flex gap-3 items-start">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <p className="text-xs font-bold uppercase tracking-wide m-0">
                        <span className="font-black">Importante:</span> Reservas de cotas realizadas por outros usuários impactam temporariamente a contagem e podem fazer com que a porcentagem exibida não reflita, com exatidão, a quantidade real de cotas disponíveis naquele momento.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Seção 2 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-black uppercase italic tracking-tight m-0">2. COMPRAS DE ALTO VALOR</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed pl-13">
                    <p>
                      A {siteSettings?.site_name || "nossa empresa"} não recomenda a tentativa de aquisição de grandes volumes de cotas (por exemplo, acima de 100.000 unidades) com o objetivo de “encerrar a ação” ou “comprar o restante das cotas”.
                    </p>
                    <p>Isso ocorre porque:</p>
                    <ul className="list-disc pl-5 space-y-2 text-sm font-medium">
                      <li>O sistema não é projetado para operações em lote único de grande escala;</li>
                      <li>A porcentagem exibida pode não aumentar de forma proporcional ou imediata;</li>
                      <li>As cotas reservadas por terceiros interferem diretamente na visualização do progresso no momento da compra.</li>
                    </ul>
                  </div>
                </section>

                {/* Seção 3 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-black uppercase italic tracking-tight m-0">3. ENVIO DE VÍDEO PARA RESGATE DE PRÊMIOS</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed pl-13">
                    <p>
                      Ao ser contemplado em qualquer premiação promovida pela {siteSettings?.site_name || "nossa plataforma"} — incluindo, mas não se limitando a prêmio principal, prêmios instantâneos, cotas premiadas, roletas, raspadinhas, caixinhas, presentes ou quaisquer outras dinâmicas promocionais — o ganhador obriga-se a enviar um vídeo de depoimento, conforme orientações fornecidas pela equipe da {siteSettings?.site_name || "nossa equipe"}.
                    </p>
                    <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 text-foreground">
                      <p className="text-sm font-black uppercase tracking-widest text-primary mb-2">📌 Condição Obrigatória</p>
                      <p className="text-sm font-medium leading-relaxed">
                        O envio do vídeo é condição obrigatória e indispensável para a validação e liberação do prêmio, independentemente do valor ou do tipo da premiação.
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive flex gap-3 items-start">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <p className="text-xs font-bold leading-relaxed m-0 italic">
                        A não realização do envio do vídeo, o envio fora do prazo estipulado ou em desacordo com as orientações fornecidas poderá resultar na perda do direito ao resgate do prêmio.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Seção 4 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-black uppercase italic tracking-tight m-0">4. POLÍTICA DE RESPONSABILIDADE</h2>
                  </div>
                  <div className="space-y-4 text-muted-foreground leading-relaxed pl-13">
                    <p>
                      A {siteSettings?.site_name || "nossa empresa"} não se responsabiliza por interpretações equivocadas relacionadas ao percentual exibido no site, tampouco garante que compras de alto valor resultarão no encerramento da ação ou em aumento imediato da porcentagem apresentada.
                    </p>
                    <div className="p-4 rounded-2xl bg-secondary/50 border border-border text-foreground flex gap-3 items-center">
                      <UserCheck className="h-5 w-5 text-primary" />
                      <p className="text-xs font-bold uppercase tracking-widest m-0">
                        Não realizamos reembolsos baseados em suposições ou expectativas pessoais do cliente.
                      </p>
                    </div>
                  </div>
                </section>

                <Separator className="my-6" />

                {/* Legal Info */}
                <section className="bg-secondary/30 rounded-3xl p-6 md:p-8 border border-border space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary">Autorização Legal</h3>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase leading-loose space-y-1">
                        <p>Este título de loteria está autorizado com base na Portaria/Termo de Autorização Nº 01157/2026</p>
                        <p>LTP-PRC-2026/01702</p>
                        <p>Registrado por: {siteSettings?.company_name || "Sua Razão Social"}</p>
                        <p>CNPJ: {siteSettings?.company_cnpj || "00.000.000/0001-00"}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary">Regras Gerais</h3>
                      <ul className="text-[10px] font-black text-muted-foreground uppercase leading-loose list-none space-y-1">
                        <li>🔞 Venda proibida para menores de 18 anos.</li>
                        <li>📅 Sorteios conforme critérios do regulamento.</li>
                        <li>🔄 Participação em múltiplos sorteios permitida.</li>
                        <li>📸 Autorização de uso de imagem automática ao adquirir.</li>
                      </ul>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;