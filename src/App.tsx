import { useEffect } from "react";
import { runContrastAudit, initContrastShortcut } from "@/lib/accessibility";
import LiveNotifications from "./components/LiveNotifications";
import PWAInstallBanner from "./components/PWAInstallBanner";
import FloatingActions from "./components/FloatingActions";
import WhatsAppGroupInviteDialog from "./components/WhatsAppGroupInviteDialog";
import { AffiliateTracker } from "./components/AffiliateTracker";
import { SiteSettingsInjector } from "./components/SiteSettingsInjector";
import ScrollToTop from "./components/ScrollToTop";
import Roulette from "./pages/Roulette";
import ScratchCard from "./pages/ScratchCard";
import MysteryBox from "./pages/MysteryBox";
import Ranking from "./pages/Ranking";
import Affiliates from "./pages/Affiliates";
import FederalResults from "./pages/FederalResults";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import AdminFederal from "./pages/admin/Federal";
import AdminUsers from "./pages/admin/Users";
import AdminAffiliates from "./pages/admin/Affiliates";
import AdminRoulette from "./pages/admin/Roulette";
import AdminMysteryBoxes from "./pages/admin/MysteryBoxes";
import AdminBanners from "./pages/admin/Banners";
import AdminCoupons from "./pages/admin/Coupons";
import AdminNotifications from "./pages/admin/Notifications";
import AdminSettings from "./pages/admin/Settings";
import AdminDiagnostics from "./pages/admin/Diagnostics";
import AdminScratchCards from "./pages/admin/ScratchCards";
import AdminPaymentLogs from "./pages/admin/PaymentLogs";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminTransactions from "./pages/admin/Transactions";
import AdminVersions from "./pages/admin/Versions";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import AccountInline from "./pages/AccountInline";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { QueryCache } from "@tanstack/react-query";
import { initPerfMonitor, logPerf } from "@/lib/perf";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { useSiteSettings } from "@/hooks/useData";

import { ThemeProvider } from "./components/ThemeProvider";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import IndexInline from "./pages/IndexInline";
import SalesPage from "./pages/SalesPage";
import CampaignDetail from "./pages/CampaignDetail";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Winners from "./pages/Winners";
import Preview from "./pages/Preview";
import Announcements from "./pages/Announcements";
import Support from "./pages/Support";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCampaigns from "./pages/admin/Campaigns";
import AdminCampaignEdit from "./pages/admin/CampaignEdit";
import AdminOrders from "./pages/admin/Orders";
import AdminWinners from "./pages/admin/Winners";
import { supabase } from "@/integrations/supabase/client";

const queryStartTimes = new Map<string, number>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onSuccess: (_data, query) => {
      const key = JSON.stringify(query.queryKey);
      const started = queryStartTimes.get(key);
      if (started) {
        logPerf("query", key, performance.now() - started, { status: "ok" });
        queryStartTimes.delete(key);
      }
    },
    onError: (error, query) => {
      const key = JSON.stringify(query.queryKey);
      const started = queryStartTimes.get(key);
      if (started) {
        logPerf("query", key, performance.now() - started, {
          status: "error",
          error: (error as Error)?.message,
        });
        queryStartTimes.delete(key);
      }
    },
  }),
});

// Track query start times via fetch observer.
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "fetch") {
    queryStartTimes.set(JSON.stringify(event.query.queryKey), performance.now());
  }
});

initPerfMonitor();

const CampaignRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/campanha/${id}`} replace />;
};

const RouteExtras = () => {
  const { pathname } = useLocation();
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    const start = performance.now();
    return () => logPerf("route", pathname, performance.now() - start);
  }, [pathname]);

  if (pathname.startsWith("/admin")) return null;

  const showLiveActivity = String(settings?.home_show_live_activity) === "true";

  return (
    <>
      {showLiveActivity && <LiveNotifications />}
      <FloatingActions />
      <WhatsAppGroupInviteDialog />
      <PWAInstallBanner />
    </>
  );
};

const AppContent = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const showSalesPage = String(settings?.show_sales_page) === "true";
  const isInline = settings?.layout_mode === "inline";

  useEffect(() => {
    runContrastAudit();
    initContrastShortcut();

    const timeout = setTimeout(runContrastAudit, 2000);
    return () => clearTimeout(timeout);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-800 border-t-primary" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 animate-pulse italic">
            Carregando...
          </p>
        </div>
      </div>
    );
  }



  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <RouteExtras />
        <AffiliateTracker />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={showSalesPage ? <SalesPage /> : (isInline ? <IndexInline /> : <Index />)} />
          <Route path="/demonstracao" element={isInline ? <IndexInline /> : <Index />} />
          <Route path="/campanhas" element={<Navigate to={showSalesPage ? "/demonstracao" : "/"} replace />} />
          <Route path="/campanha/:id" element={<CampaignDetail />} />
          <Route path="/ação/:id" element={<CampaignRedirect />} />
          <Route path="/ações/:id" element={<CampaignRedirect />} />
          <Route path="/cadastrar" element={<Register />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/ganhadores" element={<Winners />} />
          <Route path="/resultado-federal" element={<FederalResults />} />
          <Route path="/federal" element={<Navigate to="/resultado-federal" replace />} />
          <Route path="/comunicados" element={<Announcements />} />
          <Route path="/contato" element={<Support />} />
          <Route path="/preview" element={<Preview />} />
          <Route path="/roleta-premiada" element={<Roulette />} />
          <Route path="/roleta" element={<Navigate to="/roleta-premiada" replace />} />
          <Route path="/caixa-misteriosa-de-premios" element={<MysteryBox />} />
          <Route path="/caixa-misteriosa" element={<Navigate to="/caixa-misteriosa-de-premios" replace />} />
          <Route path="/raspadinha-da-sorte" element={<ScratchCard />} />
          <Route path="/raspadinha" element={<Navigate to="/raspadinha-da-sorte" replace />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/afiliados" element={<Affiliates />} />
          <Route path="/painel-afiliado" element={<ProtectedRoute><AffiliateDashboard /></ProtectedRoute>} />
          <Route path="/termos-de-uso" element={<Terms />} />
          <Route path="/checkout/:orderId" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          
          {/* Protected Routes */}
          <Route path="/minha-conta" element={<ProtectedRoute>{isInline ? <AccountInline /> : <Account />}</ProtectedRoute>} />
          <Route path="/conta" element={<Navigate to="/minha-conta" replace />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/campanhas" element={<ProtectedRoute adminOnly><AdminCampaigns /></ProtectedRoute>} />
          <Route path="/admin/campanhas/nova" element={<ProtectedRoute adminOnly><AdminCampaignEdit /></ProtectedRoute>} />
          <Route path="/admin/campanhas/editar/:id" element={<ProtectedRoute adminOnly><AdminCampaignEdit /></ProtectedRoute>} />
          <Route path="/admin/pedidos" element={<ProtectedRoute adminOnly><AdminOrders /></ProtectedRoute>} />
          <Route path="/admin/ganhadores" element={<ProtectedRoute adminOnly><AdminWinners /></ProtectedRoute>} />
          <Route path="/admin/federal" element={<ProtectedRoute adminOnly><AdminFederal /></ProtectedRoute>} />
          <Route path="/admin/usuarios" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/afiliados" element={<ProtectedRoute adminOnly><AdminAffiliates /></ProtectedRoute>} />
          <Route path="/admin/roletas" element={<ProtectedRoute adminOnly><AdminRoulette /></ProtectedRoute>} />
          <Route path="/admin/raspadinhas" element={<ProtectedRoute adminOnly><AdminScratchCards /></ProtectedRoute>} />
          <Route path="/admin/caixas" element={<ProtectedRoute adminOnly><AdminMysteryBoxes /></ProtectedRoute>} />
          <Route path="/admin/banners" element={<ProtectedRoute adminOnly><AdminBanners /></ProtectedRoute>} />
          <Route path="/admin/cupons" element={<ProtectedRoute adminOnly><AdminCoupons /></ProtectedRoute>} />
          <Route path="/admin/notificacoes" element={<ProtectedRoute adminOnly><AdminNotifications /></ProtectedRoute>} />
          <Route path="/admin/configuracoes" element={<ProtectedRoute masterOnly><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/diagnostico" element={<ProtectedRoute masterOnly><AdminDiagnostics /></ProtectedRoute>} />
          <Route path="/admin/pagamentos/logs" element={<ProtectedRoute masterOnly><AdminPaymentLogs /></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedRoute masterOnly><AdminAuditLogs /></ProtectedRoute>} />
          <Route path="/admin/transacoes" element={<ProtectedRoute masterOnly><AdminTransactions /></ProtectedRoute>} />
          <Route path="/admin/versoes" element={<ProtectedRoute adminOnly><AdminVersions /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider defaultTheme="dark" storageKey="platform-theme">
          <TooltipProvider>
            <TenantProvider>
              <SiteSettingsInjector />
              <Toaster />
              <Sonner />
              <AppContent />
            </TenantProvider>
          </TooltipProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
