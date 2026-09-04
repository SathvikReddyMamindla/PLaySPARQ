import { Sparkles } from 'lucide-react';

export default function FloatingAIBadge() {
  return (
    <aside aria-label="AI Provider" className="fixed bottom-16 md:bottom-5 right-4 z-50 pointer-events-auto">
      <a
        href="https://featherless.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-ink/90 hover:bg-ink text-paper text-xs font-medium shadow-2xl backdrop-blur-md border border-white/15 hover:border-volt/70 transition-all duration-200 group hover:scale-105 active:scale-95"
        title="AI Inference Powered by Featherless.ai"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-volt opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-volt"></span>
        </span>
        <Sparkles className="w-3.5 h-3.5 text-volt transition-transform group-hover:rotate-12" />
        <span className="text-paper/85 tracking-tight group-hover:text-paper transition-colors">
          Powered By <strong className="text-volt font-bold">featherless.ai</strong>
        </span>
      </a>
    </aside>
  );
}
