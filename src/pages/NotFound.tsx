import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <SEO title="Página não encontrada" description="A página que você procura não existe ou foi movida." />
      
      <div className="text-center space-y-6 max-w-md">
        <div className="relative">
          <h1 className="text-9xl font-black opacity-10 select-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 bg-primary/20 blur-3xl rounded-full" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">Ops! Página perdida</h2>
          <p className="text-muted-foreground font-medium">
            Parece que você tentou acessar um endereço que não existe mais ou nunca existiu.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button asChild variant="outline" className="rounded-xl h-12 font-bold flex-1">
            <Link to={-1 as any} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
          </Button>
          <Button asChild className="rounded-xl h-12 font-bold flex-1 shadow-lg shadow-primary/20">
            <Link to="/" className="gap-2">
              <Home className="h-4 w-4" /> Ir para Início
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
