import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, X, Maximize2, ExternalLink, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LiveStreamPlayerProps {
  url?: string;
  enabled?: boolean;
  campaignTitle?: string;
}

const LiveStreamPlayer = ({ url, enabled, campaignTitle }: LiveStreamPlayerProps) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!enabled || !url) return null;

  // Function to transform YouTube or Twitch URL to embed URL if needed
  const getEmbedUrl = (link: string) => {
    // Twitch Support
    if (link.includes("twitch.tv/")) {
      const channel = link.split("twitch.tv/")[1]?.split("/")[0]?.split("?")[0];
      const parent = window.location.hostname;
      return `https://player.twitch.tv/?channel=${channel}&parent=${parent}&autoplay=true&muted=true`;
    }

    // YouTube Support
    if (link.includes("youtube.com/live/")) {
      const id = link.split("/live/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
    }
    if (link.includes("youtube.com/watch?v=")) {
      return link.replace("watch?v=", "embed/") + "?autoplay=1&mute=1";
    }
    if (link.includes("youtu.be/")) {
      const id = link.split("/").pop();
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
    }
    return link;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative w-full overflow-hidden transition-all duration-500 z-40",
        isExpanded ? "fixed inset-0 bg-black/90 p-4 md:p-10 flex items-center justify-center" : "rounded-2xl border border-primary/20 bg-card shadow-2xl mt-0"
      )}
    >
      <div className={cn(
        "relative w-full max-w-5xl mx-auto",
        !isExpanded && "aspect-video"
      )}>
        {/* Header/Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-2">
            <Badge className="bg-destructive text-white animate-pulse px-3 py-1 text-[10px] font-black uppercase italic tracking-widest border-none flex items-center gap-1.5 shadow-lg shadow-destructive/20">
              <div className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              AO VIVO
            </Badge>
            {!isExpanded && (
              <Badge variant="outline" className="bg-black/60 backdrop-blur-md border-white/10 text-white text-[10px] font-bold px-3 py-1">
                Transmissão do Sorteio
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <Button 
              size="icon" 
              variant="secondary" 
              className="h-8 w-8 rounded-full bg-black/40 backdrop-blur-md border-white/10 text-white hover:bg-black/60"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            {isExpanded && (
              <Button 
                size="icon" 
                variant="secondary" 
                className="h-8 w-8 rounded-full bg-black/40 backdrop-blur-md border-white/10 text-white hover:bg-black/60"
                asChild
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Video Frame */}
        <div className={cn(
          "w-full h-full overflow-hidden rounded-xl bg-black border border-white/5 shadow-inner",
          isExpanded ? "aspect-video" : "h-full"
        )}>
          <iframe
            src={embedUrl}
            title={`Live Stream - ${campaignTitle}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Info Overlay (only in small mode) */}
        {!isExpanded && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div className="flex flex-col gap-1">
               <p className="text-[10px] font-black uppercase text-white drop-shadow-md italic tracking-widest flex items-center gap-1">
                 <Video className="h-3 w-3 text-primary" /> Acompanhe o Sorteio
               </p>
               <p className="text-[8px] text-white/60 font-medium uppercase tracking-tighter">
                 Transmissão oficial em tempo real
               </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/30">
               <Zap className="h-4 w-4 text-primary animate-pulse fill-primary" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LiveStreamPlayer;
