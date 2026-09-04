export default function Badge({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'bg-ink/5 text-ink-soft border-ink/10',
    volt: 'bg-volt/15 text-pitch border-volt/40',
    ember: 'bg-ember/10 text-ember-dark border-ember/30',
    pitch: 'bg-pitch/10 text-pitch border-pitch/30',
    ink: 'bg-ink text-paper border-ink',
    white: 'bg-white/90 text-ink border-ink/10',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
