import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  targetDate: string;
  className?: string;
}

export default function CountdownTimer({ targetDate, className = "" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 shadow-2xl">
        <Clock className="h-3 w-3 text-primary animate-pulse" />
        <div className="flex items-center gap-1 font-mono text-[10px] font-black uppercase tracking-tighter">
          <TimeUnit value={timeLeft.days} label="d" />
          <span className="text-white/20">:</span>
          <TimeUnit value={timeLeft.hours} label="h" />
          <span className="text-white/20">:</span>
          <TimeUnit value={timeLeft.minutes} label="m" />
          <span className="text-white/20">:</span>
          <TimeUnit value={timeLeft.seconds} label="s" />
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-0.5">
      <span className="text-primary neon-text-primary min-w-[14px] text-center tabular-nums">
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-[8px] text-muted-foreground font-black italic">{label}</span>
    </div>
  );
}