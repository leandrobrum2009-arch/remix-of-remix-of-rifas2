import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logAuthEvent } from "@/lib/audit";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, cpf?: string, phone?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: refreshedSession }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      setSession(refreshedSession);
      setUser(refreshedSession?.user ?? null);
    } catch (error) {
      console.error("Error refreshing session:", error);
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial session fetch
    refreshSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (_event === 'SIGNED_IN' && session?.user) {
        logAuthEvent({
          event: 'login',
          status: 'success',
          userId: session.user.id,
          details: { method: 'automatic' }
        });
      }

      if (_event === 'SIGNED_OUT') {
        logAuthEvent({
          event: 'logout',
          status: 'success',
          details: { reason: 'manual' }
        });
        setSession(null);
        setUser(null);
      }
    });

    // Auto-revalidate session every 5 minutes and on window focus
    const revalidate = () => {
      if (supabase.auth.getSession()) {
        supabase.auth.getUser(); 
      }
    };

    const interval = setInterval(revalidate, 1000 * 60 * 5);
    window.addEventListener('focus', revalidate);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
      window.removeEventListener('focus', revalidate);
    };
  }, [refreshSession]);

  const signUp = async (email: string, password: string, name: string, cpf?: string, phone?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, cpf, phone } },
    });
    
    if (!error && (cpf || phone)) {
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        await supabase.from("profiles").update({ cpf, phone }).eq("user_id", newUser.id);
      }
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      logAuthEvent({
        event: 'login',
        status: 'failure',
        details: { email, error: error.message }
      });
    } else if (data?.user) {
      logAuthEvent({
        event: 'login',
        status: 'success',
        userId: data.user.id,
        details: { method: 'password' }
      });
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};
