import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, Download, Share, PlusSquare, Menu, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useData";
import { usePWA } from "@/hooks/usePWA";

const PWAInstallBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { data: siteSettings } = useSiteSettings();
  const { isInstallable, installApp } = usePWA();
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    const isEnabled = siteSettings?.enable_download_app === 'true';
    
    if (isEnabled && !dismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000); // Show after 5 seconds
      
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 25000); // Auto-hide after 25 seconds total (20s after showing)

      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, [siteSettings]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa-banner-dismissed", "true");
  };

  const handleInstall = async () => {
    if (siteSettings?.app_download_link) {
      window.open(siteSettings.app_download_link, '_blank');
      handleDismiss();
      return;
    }

    if (isInstallable) {
      const success = await installApp();
      if (success) handleDismiss();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:bottom-4 md:w-80 pointer-events-none">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="pointer-events-auto relative overflow-hidden rounded-2xl bg-card/95 backdrop-blur-xl border border-primary/20 p-4 shadow-2xl"
          >
            {/* Background Decorative Element */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            
            <button 
              onClick={handleDismiss}
              className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Smartphone className="h-6 w-6" />
              </div>
              
              <div className="flex-1 pr-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                  Instalar Aplicativo
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {isIOS 
                    ? "Toque no ícone de compartilhar e depois em 'Adicionar à Tela de Início' para instalar."
                    : isInstallable || siteSettings?.app_download_link
                      ? "Instale nosso aplicativo para uma experiência mais rápida e segura."
                      : "Abra o menu do seu navegador e selecione 'Instalar Aplicativo' ou 'Adicionar à tela inicial'."
                  }
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              {isIOS ? (
                <div className="flex w-full items-center justify-center gap-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 py-2 px-3">
                  <div className="flex flex-col items-center gap-1">
                    <Share className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold text-primary">1. Compartilhar</span>
                  </div>
                  <div className="h-4 w-[1px] bg-primary/20" />
                  <div className="flex flex-col items-center gap-1">
                    <PlusSquare className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold text-primary">2. Add Início</span>
                  </div>
                </div>
              ) : isInstallable || siteSettings?.app_download_link ? (
                <Button 
                  onClick={handleInstall}
                  className="w-full gap-2 rounded-xl glow-primary font-black uppercase tracking-widest text-[10px]"
                >
                  <Download className="h-3.5 w-3.5" />
                  {siteSettings?.app_download_link ? 'Baixar App' : 'Instalar Agora'}
                </Button>
              ) : (
                <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 py-3 px-3">
                   <div className="flex items-center gap-2 text-primary font-bold text-[10px]">
                      <Menu className="h-3.5 w-3.5" />
                      <span>Menu do Navegador</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>Instalar</span>
                   </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PWAInstallBanner;
