import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShoppingCart, Trophy, X, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type NotificationType = 'purchase' | 'winner';

interface LiveNotification {
  id: string;
  type: NotificationType;
  userName: string;
  avatarUrl: string | null;
  message: string;
  campaignTitle: string;
  timestamp: Date;
}

const LiveNotifications = () => {
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [queue, setQueue] = useState<Omit<LiveNotification, 'id' | 'timestamp'>[]>([]);
  const [isShowing, setIsShowing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Initial delay of 20 seconds as requested by the user
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 20000);
    return () => clearTimeout(timer);
  }, []);

  const addToQueue = (notif: Omit<LiveNotification, 'id' | 'timestamp'>) => {
    setQueue(prev => [...prev, notif]);
  };

  // Process queue
  useEffect(() => {
    if (!isReady || isShowing || queue.length === 0) return;

    const showNext = () => {
      setIsShowing(true);
      const nextNotif = queue[0];
      setQueue(prev => prev.slice(1));
      
      const id = Math.random().toString(36).substr(2, 9);
      const newNotif = { ...nextNotif, id, timestamp: new Date() };
      
      setNotifications([newNotif]); // Only one at a time

      // Hide after 6 seconds
      setTimeout(() => {
        setNotifications([]);
        // Wait another 15-30 seconds before allowing the next one (sporadic)
        const delay = 15000 + Math.random() * 15000;
        setTimeout(() => {
          setIsShowing(false);
        }, delay);
      }, 6000);
    };

    showNext();
  }, [queue, isShowing, isReady]);

  const fetchInitialData = async () => {
    // Get last 3 paid orders
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*, profiles!user_id(name, avatar_url), campaigns(title)')
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(3);

    // Get last 2 winners
    const { data: recentWinners } = await supabase
      .from('winners')
      .select('*, profiles!user_id(name, avatar_url), campaigns(title)')
      .order('created_at', { ascending: false })
      .limit(2);

    const allRecent = [
      ...(recentOrders?.map(o => ({ ...o, type: 'purchase' as const })) || []),
      ...(recentWinners?.map(w => ({ ...w, type: 'winner' as const })) || [])
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    allRecent.forEach((item) => {
      addToQueue({
        type: item.type,
        userName: (item as any).profiles?.name || 'Alguém',
        avatarUrl: (item as any).profiles?.avatar_url,
        message: item.type === 'purchase' 
          ? `acabou de comprar ${(item as any).quantity} cotas` 
          : `ganhou ${(item as any).prize_description} na cota ${(item as any).ticket_number}`,
        campaignTitle: (item as any).campaigns?.title,
      });
    });
  };

  useEffect(() => {
    fetchInitialData();

    // Subscribe to new orders (purchases)
    const ordersChannel = supabase
      .channel(`live-orders-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: 'payment_status=eq.paid' },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('user_id', payload.new.user_id)
            .single();
          
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('title')
            .eq('id', payload.new.campaign_id)
            .single();

          if (profile && campaign) {
            addToQueue({
              type: 'purchase',
              userName: profile.name || 'Alguém',
              avatarUrl: profile.avatar_url,
              message: `acabou de comprar ${payload.new.quantity} cotas`,
              campaignTitle: campaign.title,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to new winners
    const winnersChannel = supabase
      .channel(`live-winners-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'winners' },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('user_id', payload.new.user_id)
            .single();
          
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('title')
            .eq('id', payload.new.campaign_id)
            .single();

          if (profile && campaign) {
            addToQueue({
              type: 'winner',
              userName: profile.name || 'Alguém',
              avatarUrl: profile.avatar_url,
              message: `ganhou ${payload.new.prize_description} na cota ${payload.new.ticket_number}`,
              campaignTitle: campaign.title,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(winnersChannel);
    };
  }, []);

  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: -100, scale: 0.5, rotate: -5 }}
            animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, x: -100, scale: 0.5, rotate: 5 }}
            transition={{ type: "spring", damping: 15, stiffness: 100 }}
            className="pointer-events-auto flex items-center gap-3 p-3 rounded-2xl bg-card/95 backdrop-blur-xl border-2 border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.2)] min-w-[260px] md:min-w-[300px] max-w-[calc(100vw-32px)] md:max-w-sm ring-2 ring-primary/10"
          >
            <div className={`relative h-12 w-12 rounded-full shrink-0 p-0.5 ${notif.type === 'winner' ? 'bg-gradient-to-tr from-amber-500 to-yellow-300' : 'bg-gradient-to-tr from-primary to-primary/50'}`}>
              <Avatar className="h-full w-full border-2 border-background">
                <AvatarImage src={notif.avatarUrl || ""} />
                <AvatarFallback className="bg-secondary text-primary font-black text-xs">
                  {notif.userName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center text-white ${notif.type === 'winner' ? 'bg-amber-500' : 'bg-primary'}`}>
                {notif.type === 'winner' ? <Trophy className="h-2.5 w-2.5" /> : <ShoppingCart className="h-2.5 w-2.5" />}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black text-foreground leading-tight">
                <span className="text-primary uppercase">{notif.userName}</span>
              </p>
              <p className="text-[11px] font-bold text-foreground/90 leading-tight">
                {notif.message}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 font-black uppercase tracking-tighter bg-primary/5 text-primary border-primary/10">
                  {notif.type === 'winner' ? 'Ganhador' : 'Nova Compra'}
                </Badge>
                <span className="text-[9px] text-muted-foreground truncate italic">
                  {format(notif.timestamp, "HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>

            <button 
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LiveNotifications;
