import { motion } from 'framer-motion';
import { Shield, Footprints, Zap, Waves, ArrowRight, Activity, Sparkles, MapPin, CheckCircle2, Target, Layers, Star, Radio } from 'lucide-react';
import Reveal from './ui/Reveal';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { FRAGMENTATION_PROBLEMS } from '../data/sportsData';
import { CORE_PROFILE_SCHEMA, SPORT_ADAPTERS } from '../data/architectureData';
import { COMMUNITY_POSTS } from '../data/communityData';

const problemIcons = { Shield, Footprints, Zap, Waves };

export function ProblemSection() {
  return (
    <section className="py-20 md:py-28 bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <span className="eyebrow text-ember">The problem</span>
          <h2 className="mt-3 font-display font-bold text-4xl md:text-5xl text-ink tracking-tight">
            Great players, <span className="text-pitch">no way to find each other.</span>
          </h2>
          <p className="mt-4 text-ink-soft text-lg">
            Your sport is probably thriving around you. The 7v7 turf you want, the 5:30-pace run buddy,
            the chess club — it's all 3 km away, buried in a WhatsApp group you're not in.
          </p>
        </Reveal>
        <div className="mt-12 grid md:grid-cols-2 gap-5">
          {FRAGMENTATION_PROBLEMS.map((p, i) => {
            const Icon = problemIcons[p.icon] || Activity;
            return (
              <Reveal key={p.title} delay={i * 0.1}>
                <div className={`rounded-2xl border bg-white p-6 h-full shadow-card hover-lift ${p.accent.split(' ')[0]}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-11 h-11 rounded-xl border bg-ink text-volt`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-ink-faint">{p.emoji} {p.sport}</p>
                      <h3 className="font-display font-bold text-lg text-ink">{p.title}</h3>
                    </div>
                  </div>
                  <p className="mt-3 text-ink-soft leading-relaxed">{p.problem}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const solutionSteps = [
  { icon: Sparkles, title: 'Describe yourself', text: 'Type how you play in plain words — the AI parses it into a structured profile in seconds.' },
  { icon: Layers, title: 'Normalized skill', text: 'Cricket "intermediate", chess 1200 and a 25-min 5K all map to one comparable skill scale.' },
  { icon: Target, title: 'AI-ranked matches', text: 'A ranked list with a one-line "why this match" narrative for every recommendation.' },
  { icon: MapPin, title: 'Meet & play', text: 'Connect, chat, and join or create games near you.' },
];

export function SolutionSection({ onOpenJoinModal }) {
  return (
    <section className="py-20 md:py-28 bg-ink text-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <span className="eyebrow text-volt">The solution</span>
          <h2 className="mt-3 font-display font-bold text-4xl md:text-5xl text-white tracking-tight">
            Where AI turns a directory into a <span className="text-volt">discovery engine</span>
          </h2>
        </Reveal>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {solutionSteps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1}>
              <div className="h-full rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-volt text-volt-ink">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <span className="font-display text-4xl font-bold text-white/15">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-display font-bold text-lg text-white">{s.title}</h3>
                <p className="mt-2 text-white/70 text-sm leading-relaxed">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const howSteps = [
  { n: '01', title: 'Tell us about you', text: 'One sentence in your own words. No long form to fill.', color: 'bg-volt text-volt-ink' },
  { n: '02', title: 'AI builds your profile', text: 'Sport, skill tier, role, availability, tags — extracted & editable.', color: 'bg-pitch text-paper' },
  { n: '03', title: 'Discover matches', text: 'Ranked athletes & games near you, each explained in plain language.', color: 'bg-ember text-white' },
  { n: '04', title: 'Connect & play', text: 'Send invites, message, and join or create local events.', color: 'bg-ink text-paper' },
];

export function HowItWorks({ onOpenJoinModal }) {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <span className="eyebrow text-pitch">How it works</span>
          <h2 className="mt-3 font-display font-bold text-4xl md:text-5xl text-ink tracking-tight">From vague to game day in minutes</h2>
        </Reveal>
        <div className="mt-12 grid md:grid-cols-4 gap-5 relative">
          {howSteps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="relative h-full">
                {i < howSteps.length - 1 && <div aria-hidden className="hidden md:block absolute top-8 right-0 translate-x-1/2 w-10 h-px bg-line" />}
                <div className="h-full rounded-2xl border border-line bg-white p-6 shadow-card hover-lift">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl font-display font-bold text-2xl ${s.color}`}>{s.n}</div>
                  <h3 className="mt-4 font-display font-bold text-lg text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm text-ink-soft leading-relaxed">{s.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MultiSportSection() {
  return (
    <section id="architecture" className="py-20 md:py-28 bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <span className="eyebrow text-ember">Unified architecture</span>
          <h2 className="mt-3 font-display font-bold text-4xl md:text-5xl text-ink tracking-tight">
            One athlete identity, <span className="text-pitch">every sport's language.</span>
          </h2>
          <p className="mt-4 text-ink-soft text-lg">
            A polymorphic schema means a bowler, a chess player, and a marathoner all live on the same
            profile — just with different sport-specific telemetry.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-12 grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-line bg-white p-6 shadow-card">
              <span className="eyebrow text-pitch">{CORE_PROFILE_SCHEMA.title}</span>
              <p className="mt-2 text-sm text-ink-soft">{CORE_PROFILE_SCHEMA.subtitle}</p>
              <div className="mt-4 space-y-2">
                {CORE_PROFILE_SCHEMA.fields.map((f) => (
                  <div key={f.key} className="flex items-center justify-between rounded-xl bg-paper px-3 py-2 border border-line">
                    <span className="text-sm font-semibold text-ink">{f.label}</span>
                    <span className="text-xs text-ink-faint">{f.type}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
              {SPORT_ADAPTERS.map((a) => (
                <div key={a.id} className={`rounded-2xl border ${a.borderColor} bg-white p-5 shadow-card hover-lift`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{a.emoji}</span>
                    <div>
                      <span className="eyebrow" style={{ color: a.accentColor }}>{a.sport}</span>
                      <p className="text-xs text-ink-faint">{a.tagline}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {a.fields.map((f) => (
                      <div key={f.key} className="rounded-lg bg-paper px-3 py-2">
                        <p className="text-[11px] text-ink-faint uppercase tracking-wide">{f.label}</p>
                        <p className="text-sm font-medium text-ink truncate">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function TrustSection() {
  const items = [
    { icon: Star, title: 'Trust-scored profile', text: 'Every bio passes an AI trust check that flags spam, copy-paste and contradictions — with a plain-language note.' },
    { icon: CheckCircle2, title: 'Reliability record', text: 'Show-rate and sportsmanship are weighted into compatibility, so reliable athletes rise to the top.' },
    { icon: Shield, title: 'Safe by design', text: 'Your API key and auth live server-side. Judge and explore anonymously with the demo mode.' },
  ];
  return (
    <section className="py-20 md:py-28 bg-ink text-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <span className="eyebrow text-volt">Trust & safety</span>
          <h2 className="mt-3 font-display font-bold text-4xl md:text-5xl text-white tracking-tight">Trust you can see, not a black box</h2>
        </Reveal>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.1}>
              <div className="h-full rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-volt text-volt-ink">
                  <it.icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 font-display font-bold text-lg text-white">{it.title}</h3>
                <p className="mt-2 text-white/70 text-sm leading-relaxed">{it.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CommunitySection({ onOpenJoinModal }) {
  return (
    <section id="community" className="py-20 md:py-28 bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <span className="eyebrow text-pitch">Community</span>
          <h2 className="mt-3 font-display font-bold text-4xl md:text-5xl text-ink tracking-tight">Driven by the people in it</h2>
        </Reveal>
        <div className="mt-12 grid lg:grid-cols-2 gap-5">
          {COMMUNITY_POSTS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <article className="h-full rounded-2xl border border-line bg-white p-5 shadow-card hover-lift">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={p.avatar} alt={p.author} className="w-11 h-11 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-ink">{p.author}</p>
                      <p className="text-xs text-ink-faint">{p.handle} · {p.timestamp}</p>
                    </div>
                  </div>
                  <Badge tone="volt">{p.sportEmoji} {p.sport}</Badge>
                </div>
                {p.hasImage && (
                  <img src={p.postImage} alt="" className="mt-4 w-full h-44 object-cover rounded-xl" />
                )}
                <p className="mt-4 text-sm text-ink-soft leading-relaxed">{p.content}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-ink-faint">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {p.location}</span>
                  <span className="inline-flex items-center gap-2">
                    <span>♥ {p.likesCount}</span><span>· {p.commentsCount} 💬</span>
                  </span>
                </div>
                <div className="mt-3"><Badge tone="paper">{p.badge}</Badge></div>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10 text-center">
          <Button variant="outline" size="lg" onClick={onOpenJoinModal}>Join the community <ArrowRight className="w-4 h-4" /></Button>
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCTA({ onOpenJoinModal }) {
  return (
    <section className="py-20 md:py-28 bg-ink relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-volt">
            <Radio className="w-3.5 h-3.5" /> It's live — try the AI onboarding
          </span>
          <h2 className="mt-5 font-display font-bold text-4xl md:text-6xl text-white tracking-tight">
            Ready to find <span className="text-volt">your people</span>?
          </h2>
          <p className="mt-5 max-w-xl mx-auto text-white/70 text-lg">
            Describe how you play in one sentence and watch Sparq build your profile, rank your
            matches, and explain why each one fits.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button variant="volt" size="lg" onClick={onOpenJoinModal}><Sparkles className="w-5 h-5" /> Create my profile</Button>
            <Button variant="outline" size="lg" className="text-white border-white/30 hover:bg-white/10" onClick={onOpenJoinModal}>Take the tour</Button>
          </div>
        </Reveal>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-paper to-transparent" />
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-paper border-t border-line py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-ink text-volt"><Activity className="w-5 h-5" /></div>
            <span className="font-display font-bold text-xl text-ink">Spar<span className="text-ember">q</span></span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-ink-soft">The AI-powered multi-sport athlete discovery platform. Every sport. Every athlete. One community.</p>
          <p className="mt-4 text-xs font-semibold text-pitch inline-flex items-center gap-1.5 bg-volt/25 px-2.5 py-1 rounded-lg">
            <Sparkles className="w-3.5 h-3.5" /> Powered By featherless.ai
          </p>
        </div>
        <div>
          <h4 className="eyebrow text-pitch">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li><a href="#discovery" className="hover:text-ink">Discovery</a></li>
            <li><a href="#sports" className="hover:text-ink">Sports</a></li>
            <li><a href="#how-it-works" className="hover:text-ink">How it works</a></li>
            <li><a href="#architecture" className="hover:text-ink">Architecture</a></li>
          </ul>
        </div>
        <div>
          <h4 className="eyebrow text-pitch">Community</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li>Hyderabad · India</li>
            <li>Cricket, Football, Badminton…</li>
            <li><a href="https://featherless.ai" target="_blank" rel="noreferrer" className="hover:text-ink font-semibold text-pitch inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> Powered By featherless.ai</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-ink-faint">© {new Date().getFullYear()} Sparq. Hackathon MVP.</p>
        <p className="text-xs font-semibold text-pitch inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Powered By featherless.ai
        </p>
        <p className="text-xs text-ink-faint">Made with <span className="text-ember">♥</span> for athletes.</p>
      </div>
    </footer>
  );
}
