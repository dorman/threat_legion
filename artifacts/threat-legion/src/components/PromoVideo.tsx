import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldCheck, Search, Code, Terminal, Bug } from 'lucide-react';

const SCENE_DURATION = 4000;
const TOTAL_SCENES = 3;

export function PromoVideo() {
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScene((prev) => (prev + 1) % TOTAL_SCENES);
    }, SCENE_DURATION);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto aspect-video bg-[#050505] rounded-xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#00ff6a1a_1px,transparent_1px),linear-gradient(to_bottom,#00ff6a1a_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Persistent UI frame */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20 text-xs font-mono text-[#00ff6a]/70">
        <div className="flex items-center gap-2">
          <Terminal size={14} />
          <span>THREAT_LEGION_SYS // ACTIVE</span>
        </div>
        <div className="flex gap-1">
          <span className="animate-pulse">●</span> REC
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentScene === 0 && (
          <motion.div
            key="scene-1"
            className="absolute inset-0 flex flex-col items-center justify-center z-10"
            initial={{ opacity: 0, filter: 'blur(10px)', scale: 1.1 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.9 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 20 }}
              className="bg-red-500/10 p-6 rounded-2xl mb-6 border border-red-500/20"
            >
              <AlertTriangle size={64} className="text-red-500" />
            </motion.div>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-3xl md:text-5xl font-bold text-white mb-4 text-center font-display"
            >
              Code ships with <span className="text-red-500">hidden threats</span>
            </motion.h2>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-muted-foreground text-lg font-mono"
            >
              Vulnerabilities slip through code reviews.
            </motion.p>
            
            {/* Floating bug particles */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-red-500/30"
                initial={{ 
                  x: (Math.random() - 0.5) * 400, 
                  y: (Math.random() - 0.5) * 400,
                  opacity: 0
                }}
                animate={{ 
                  y: [null, (Math.random() - 0.5) * 400],
                  opacity: [0, 1, 0]
                }}
                transition={{ duration: 2, delay: 1 + i * 0.2, repeat: Infinity }}
              >
                <Bug size={24} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {currentScene === 1 && (
          <motion.div
            key="scene-2"
            className="absolute inset-0 flex flex-col items-center justify-center z-10"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-8 border border-[#00ff6a]/30 rounded-full border-dashed"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-12 border-2 border-[#00ff6a]/10 rounded-full border-dotted"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="bg-[#00ff6a]/10 p-6 rounded-2xl mb-8 border border-[#00ff6a]/30 relative z-10"
              >
                <Search size={64} className="text-[#00ff6a]" />
              </motion.div>
            </div>
            
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-3xl md:text-5xl font-bold text-white mb-4 text-center font-display"
            >
              <span className="text-[#00ff6a] text-glow">Multi-Agent</span> Scanning
            </motion.h2>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground text-lg font-mono"
            >
              Autonomous AI reads and understands your repository.
            </motion.p>
          </motion.div>
        )}

        {currentScene === 2 && (
          <motion.div
            key="scene-3"
            className="absolute inset-0 flex flex-col items-center justify-center z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-[#00ff6a]/10 p-6 rounded-2xl mb-6 border border-[#00ff6a]/30 shadow-[0_0_30px_rgba(0,255,106,0.2)]"
            >
              <ShieldCheck size={64} className="text-[#00ff6a]" />
            </motion.div>
            
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-3xl md:text-5xl font-bold text-white mb-4 text-center font-display"
            >
              Real-time <span className="text-[#00ff6a]">Remediation</span>
            </motion.h2>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex gap-4 mt-4"
            >
              <div className="bg-card/50 backdrop-blur-sm border border-white/10 p-4 rounded-lg font-mono text-sm flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Critical SQLi Found</span>
              </div>
              <div className="bg-card/50 backdrop-blur-sm border border-[#00ff6a]/30 p-4 rounded-lg font-mono text-sm flex items-center gap-3 text-[#00ff6a]">
                <Code size={16} />
                <span>Patch Generated</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-[#00ff6a]/20 w-full z-20">
        <motion.div
          key={`progress-${currentScene}`}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: SCENE_DURATION / 1000, ease: "linear" }}
          className="h-full bg-[#00ff6a] shadow-[0_0_10px_rgba(0,255,106,0.8)]"
        />
      </div>
    </div>
  );
}
