import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, MapPin, Shield, Users, Activity } from 'lucide-react';
import Button from './ui/Button';

const heroSports = [
  { name: 'Football', emoji: '⚽', tag: '7v7 & 11v11' },
  { name: 'Cricket', emoji: '🏏', tag: 'Leather & Box' },
  { name: 'Badminton', emoji: '🏸', tag: 'Singles & Doubles' },
  { name: 'Basketball', emoji: '🏀', tag: '3v3 & 5v5' },
  { name: 'Swimming', emoji: '🏊', tag: 'Lap Sparring' },
  { name: 'Tennis', emoji: '🎾', tag: 'Clay & Hard' },
  { name: 'Athletics', emoji: '🏃', tag: '5K/10K Runs' },
  { name: 'Chess', emoji: '♟️', tag: 'OTB & Rapid' },
];

const stats = [
  { label: 'Sports covered', value: '8', suffix: '+' },
  { label: 'Active athletes', value: '121', suffix: 'k' },
  { label: 'Matches discovered', value: '428', suffix: '' },
  { label: 'Avg. match score', value: '92', suffix: '%' },
];

function CountUp({ value, suffix }) {
  return (
    <span className="font-display font-bold text-3xl md:text-4xl text-ink">
      <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        {value}
      </motion.span>
      {suffix && <span className="text-ember">{suffix}</span>}
    </span>
  );
}

export default function Hero({ onOpenJoinModal }) {
  const [tab, setTab] = useState(0);

  return (
    <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden bg-paper bg-paper-mesh">
      {/* floating pitch orbs */}
      <motion.div aria-hidden className="absolute -right-16 top-24 w-72 h-72 rounded-full bg-volt/20 blur-3xl animate-float" />
      <motion.div aria-hidden className="absolute -left-20 bottom-0 w-80 h-80 rounded-full bg-ember/10 blur-3xl animate-float-delayed" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left copy */}
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-pitch">
                <Sparkles className="w-3.5 h-3.5 text-ember" /> AI-matched. Hyperlocal. Multi-sport.
              </span>
            </motion.div>

            <div className="mt-6">
              {['Every sport.', 'Every athlete.', 'One community.'].map((line, i) => (
                <motion.h1 key={line} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 + i * 0.12 }} className="font-display font-bold leading-[1.02] text-5xl md:text-6xl lg:text-[4.4rem] tracking-tight">
                  {i === 2 ? <span className="text-pitch">{line}</span> : <span className="text-ink">{line}</span>}
                </motion.h1>
              ))}
            </div>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }} className="mt-6 max-w-xl text-lg text-ink-soft">
              Athletes are scattered across disconnected apps and WhatsApp groups. Sparq's AI reads
              how you play, normalizes your skill across sports, and matches you with the right people and
              games near you — in plain language.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }} className="mt-8 flex flex-wrap items-center gap-4">
              <Button variant="ember" size="lg" onClick={onOpenJoinModal}>
                <Sparkles className="w-5 h-5" /> Join Free <ArrowRight className="w-4 h-4" />
              </Button>
              <a href="#discovery" className="text-ink-soft hover:text-ink font-medium inline-flex items-center gap-2">
                Try the live demo <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>

            {/* stat strip */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.85 }} className="mt-10 grid grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <CountUp value={s.value} suffix={s.suffix} />
                  <p className="text-xs text-ink-faint mt-1">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: sport tab card */}
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.35 }} className="relative">
            <div className="relative bg-ink rounded-3xl p-6 shadow-pitch volt-glow">
              <div className="flex justify-between items-center mb-5">
                <span className="eyebrow text-volt">Pick a sport</span>
                <span className="text-xs text-white/50">AI ranks your matches</span>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-6">
                {heroSports.map((s, i) => (
                  <button key={s.name} onClick={() => setTab(i)} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center transition-all ${tab === i ? 'bg-volt text-volt-ink shadow-volt' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="text-[11px] font-semibold leading-tight">{s.name}</span>
                  </button>
                ))}
              </div>

              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-sm font-medium text-white">{heroSports[tab].emoji} <span className="font-semibold text-volt">{heroSports[tab].name}</span> · {heroSports[tab].tag}</p>
                <div className="mt-3 space-y-2">
                  {['3 matches found', 'Best: 2.3 km away', 'Similar skill, weekend slots'].map((t, i) => (
                    <motion.div key={t} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.15 }} className="flex items-center gap-2 text-sm text-white/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-volt" /> {t}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-white/50">
                <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Kondapur · Hyderabad</span>
                <span className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Trust-scored</span>
              </div>
            </div>
            <motion.div aria-hidden className="absolute -bottom-6 -left-6 hidden lg:flex items-center gap-2 bg-white rounded-2xl border border-line shadow-card px-3 py-2.5" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
              <Users className="w-4 h-4 text-pitch" />
              <span className="text-sm font-semibold text-ink">+12 joined today</span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* marquee */}
      <div className="mt-16 py-4 border-y border-line bg-white/40 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee gap-10">
          {[...heroSports, ...heroSports].map((s, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-ink-soft font-medium">
              {s.emoji} {s.name} <span className="text-volt">·</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
