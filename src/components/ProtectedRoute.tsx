import { ReactNode, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin, useRole } from "@/hooks/useAdmin";
import { Loader2, ShieldAlert } from "lucide-react";
import { logAuthEvent } from "@/lib/audit";

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
  masterOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false, masterOnly = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const { data: role, isLoading: userRoleLoading } = useRole();
  const location = useLocation();
  const loggedRef = useRef<string | null>(null);

  useEffect(() => {
    // Only log once per route+user combination, never in a loop
    if (!user || !adminOnly || roleLoading) return;
    
    const logKey = `${user.id}-${location.pathname}`;
    if (loggedRef.current === logKey) return;
    loggedRef.current = logKey;

    logAuthEvent({
      event: isAdmin ? 'admin_access' : 'unauthorized_attempt',
      resource: location.pathname,
      status: isAdmin ? 'success' : 'failure',
      userId: user.id,
      details: { path: location.pathname }
    });
  }, [location.pathname, adminOnly, user?.id, isAdmin, roleLoading]);

  if (authLoading || (adminOnly && roleLoading) || (masterOnly && userRoleLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">
            Verificando permissões...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/entrar" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    console.warn(`Unauthorized access attempt to ${location.pathname} by user ${user.id}`);
    return <Navigate to="/" replace />;
  }

  if (masterOnly && role !== 'master') {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border border-border p-8 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="h-20 w-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto animate-bounce">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Acesso Restrito</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Esta página é exclusiva para usuários com privilégios **MASTER**. 
              Seu nível de acesso atual não permite visualizar este conteúdo.
            </p>
          </div>
          <Navigate to="/admin" replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
