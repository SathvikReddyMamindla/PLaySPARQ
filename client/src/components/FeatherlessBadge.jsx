import React, { useState, useEffect } from 'react';
import { Sparkles, ExternalLink, ChevronUp, ChevronDown, CheckCircle2, ShieldCheck, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

export default function FeatherlessBadge() {
  const [status, setStatus] = useState({ ai_enabled: true, model: 'Qwen/Qwen2.5-7B-Instruct', base_url: 'https://api.featherless.ai/v1' });
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.aiStatus()
      .then((res) => {
        if (isMounted && res) {
          setStatus(res);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  if (isDismissed) {
    return (
      <button
        onClick={() => setIsDismissed(false)}
        className="fixed bottom-3 right-3 z-50 p-2 bg-ink/90 hover:bg-ink text-volt rounded-full shadow-lg border border-white/15 transition-transform hover:scale-110"
        title="Show Featherless AI status"
        aria-label="Featherless AI status"
      >
        <Sparkles className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 select-none font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="mb-2 w-80 rounded-2xl bg-ink/95 backdrop-blur-xl border border-white/15 p-4 text-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-volt/20 flex items-center justify-center text-volt">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm tracking-wide text-white">Featherless AI</h4>
                  <p className="text-[10px] text-white/60">OpenAI-Compatible Inference</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status & Model info */}
            <div className="py-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-white/70 text-[11px]">System Status</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-volt">
                  <span className="w-2 h-2 rounded-full bg-volt animate-pulse" />
                  {status.ai_enabled ? 'Active & Connected' : 'Heuristic Mode'}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/70">Model</span>
                  <span className="font-mono text-volt text-[11px]">{status.model || 'Qwen 2.5 7B'}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/70">Gateway</span>
                  <span className="text-white/90 text-[10px] truncate max-w-[150px]">api.featherless.ai</span>
                </div>
              </div>

              {/* Active Capabilities */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Active Capabilities</p>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-white/80">
                  <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/5">
                    <Zap className="w-3 h-3 text-volt shrink-0" />
                    <span className="truncate">Profile Parser</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/5">
                    <Sparkles className="w-3 h-3 text-volt shrink-0" />
                    <span className="truncate">Match Reasoning</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/5">
                    <ShieldCheck className="w-3 h-3 text-volt shrink-0" />
                    <span className="truncate">Trust & Safety</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/5">
                    <CheckCircle2 className="w-3 h-3 text-volt shrink-0" />
                    <span className="truncate">Performance AI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer link */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
              <a
                href="https://featherless.ai"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-volt hover:text-white transition-colors font-medium"
              >
                Learn more at Featherless.ai <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => { setIsOpen(false); setIsDismissed(true); }}
                className="text-[10px] text-white/50 hover:text-white transition-colors"
              >
                Hide badge
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Netlify-style Badge Button */}
      <div className="flex items-center gap-1.5 bg-ink/90 hover:bg-ink backdrop-blur-xl border border-white/15 text-white rounded-full pl-2 pr-3 py-1.5 shadow-xl transition-all duration-200 hover:shadow-volt/20 hover:border-volt/40 group">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-left"
          title="Featherless AI status"
        >
          <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-volt/20 text-volt group-hover:bg-volt group-hover:text-ink transition-colors">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-volt ring-2 ring-ink animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-white/60 font-semibold leading-none">Powered by</span>
            <span className="text-xs font-bold text-white group-hover:text-volt transition-colors leading-tight">Featherless AI</span>
          </div>
          <div className="ml-1 text-white/50 group-hover:text-white transition-colors">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </div>
        </button>
      </div>
    </div>
  );
}
