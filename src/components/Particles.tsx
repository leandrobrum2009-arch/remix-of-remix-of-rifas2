import React, { useMemo } from "react";
import { motion } from "framer-motion";

const Particles = ({ count = 30 }) => {
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const particleCount = isMobile ? Math.min(count, 12) : count;

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      initialX: Math.random() * 100,
      initialY: Math.random() * 100,
      duration: Math.random() * 15 + 15,
      delay: Math.random() * 5,
      moveX: Math.random() * 60 - 30,
      moveY: Math.random() * 60 - 30,
    }));
  }, [particleCount]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ 
            x: `${p.initialX}%`, 
            y: `${p.initialY}%`, 
            opacity: 0 
          }}
          animate={{ 
            x: [`${p.initialX}%`, `${p.initialX + p.moveX}%`, `${p.initialX}%`], 
            y: [`${p.initialY}%`, `${p.initialY + p.moveY}%`, `${p.initialY}%`],
            opacity: [0, 0.4, 0]
          }}
          transition={{ 
            duration: p.duration, 
            repeat: Infinity, 
            delay: p.delay,
            ease: "easeInOut"
          }}
          className="absolute rounded-full bg-primary/40 blur-[2px] will-change-transform"
          style={{ 
            width: p.size, 
            height: p.size,
          }}
        />
      ))}
    </div>
  );
};

export default Particles;
