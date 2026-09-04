import { useEffect, useState } from 'react';
import { Search, MapPin, Coins, Users, Trophy, Sparkles, Activity, Loader2 } from 'lucide-react';
import Reveal from './ui/Reveal';
import Badge from './ui/Badge';
import { api } from '../lib/api';

const skillLabel = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');
const sportMap = { football: '⚽', cricket: '🏏', badminton: '🏸', basketball: '🏀', swimming: '🏊', tennis: '🎾', athletics: '🏃', chess: '♟️' };

export default function DiscoverySection({ onOpenJoinModal, selectable = true, compact = false }) {
  const [sport, setSport] = useState('all');
  const [skill, setSkill] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState([]);
  const [meta, setMeta] = useState({});

  const load = async (over = {}) => {
    setLoading(true);
    try {
      const res = await api.players({
        lat: 17.4401, lng: 78.3489, radiusKm: 12,
        sportId: over.sport ?? sport, skillLevel: over.skill ?? skill, search: over.search ?? search,
        limit: 12, profile_id: 'ath-current-user',
      });
      setPlayers(res?.data?.players || []);
      setMeta(res?.data?.meta || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <section id="discovery" className="py-20 md:py-28 bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <span className="eyebrow text-ember">Live demo</span>
          <h2 className="mt-3 font-display font-bold text-4xl md:text-5xl text-ink tracking-tight">
            Watch the AI <span className="text-pitch">rank your matches</span>
          </h2>
          <p className="mt-4 text-ink-soft text-lg">Every card below is scored by the compatibility engine and narrated by the AI layer. Filter to see the explain-what-it-found magic.</p>
        </Reveal>

        {/* filters */}
        <Reveal delay={0.1}>
          <div className="mt-10 grid lg:grid-cols-[1fr_auto] gap-3 items-stretch">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load({ search })}
                placeholder="Search name, area, keyword…" className="w-full pl-11 pr-4 py-3 rounded-2xl border border-line bg-white focus:outline-none focus:ring-2 focus:ring-volt" />
            </div>
            <button onClick={() => load()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink text-paper px-5 py-3 font-semibold hover:bg-pitch transition-colors">
              <Search className="w-4 h-4" /> Refine
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <p className="text-xs text-ink-faint mb-1.5">Sport</p>
              <div className="flex flex-wrap gap-2">
                {[{ id: 'all', name: 'All', emoji: '✨' }, { id: 'football', name: 'Football', emoji: '⚽' }, { id: 'cricket', name: 'Cricket', emoji: '🏏' }, { id: 'badminton', name: 'Badminton', emoji: '🏸' }, { id: 'athletics', name: 'Running', emoji: '🏃' }, { id: 'chess', name: 'Chess', emoji: '♟️' }, { id: 'swimming', name: 'Swimming', emoji: '🏊' }].map((s) => (
                  <button key={s.id} onClick={() => { setSport(s.id); load({ sport: s.id }); }} className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${sport === s.id ? 'bg-ink text-paper border-ink' : 'bg-white text-ink-soft border-line hover:border-ink/40'}`}>
                    {s.emoji} {s.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-ink-faint mb-1.5">Skill</p>
              <div className="flex flex-wrap gap-2">
                {['all', 'beginner', 'intermediate', 'advanced', 'pro'].map((lv) => (
                  <button key={lv} onClick={() => { setSkill(lv); load({ skill: lv }); }} className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${skill === lv ? 'bg-pitch text-paper border-pitch' : 'bg-white text-ink-soft border-line hover:border-ink/40'}`}>
                    {lv === 'all' ? 'Any level' : skillLabel(lv)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* results */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-pitch" /> : <Activity className="w-4 h-4 text-pitch" />}
              {loading ? 'Ranking…' : `${players.length} athletes ranked`}
              {meta.ai_enabled && <Badge tone="volt"><Sparkles className="w-3 h-3" /> AI narration</Badge>}
            </span>
            {!meta.ai_enabled && <span className="text-[11px] text-ink-faint">Running on heuristic fallback (no Featherless key) — still ranked</span>}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {players.map((p, i) => (
              <article key={p.id} className="rounded-2xl border border-line bg-white p-5 shadow-card hover-lift volt-glow">
                <div className="flex items-start gap-3">
                  <img src={p.avatar} alt={p.name} className="w-14 h-14 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-lg text-ink truncate">{p.name}</h3>
                      <span className="text-[11px] font-bold text-pitch">{sportMap[p.matched_sport] || p.matched_sport}</span>
                    </div>
                    <p className="text-xs text-ink-faint">{p.handle} · {p.subLocation}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone="volt">{skillLabel(p.skillLevel)}</Badge>
                      <Badge tone="neutral"><MapPin className="w-3 h-3" /> {p.distanceKm} km</Badge>
                    </div>
                  </div>
                  <div className="text-center shrink-0">
                    <div className="font-display font-bold text-2xl text-ember">{p.compatibilityScore}</div>
                    <div className="text-[10px] text-ink-faint">match</div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-paper p-3 border border-line">
                  <p className="text-sm font-medium text-ink leading-snug">“{p.explanation || `${p.name} matches your ${p.matched_sport} interests.`}”</p>
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {p.reasonTags?.slice(0, 3).map((t) => <span key={t} className="text-[11px] text-ink-soft bg-ink/5 rounded-full px-2 py-0.5">{t}</span>)}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-ink/5 py-1.5"><p className="text-xs font-semibold text-ink">{p.reliability_rate ?? p.reliabilityRate ?? '—'}</p><p className="text-[10px] text-ink-faint">Reliability</p></div>
                  <div className="rounded-lg bg-ink/5 py-1.5"><p className="text-xs font-semibold text-ink">{p.breakdown?.skillCalibrationScore}</p><p className="text-[10px] text-ink-faint">Skill</p></div>
                  <div className="rounded-lg bg-ink/5 py-1.5"><p className="text-xs font-semibold text-ink">{p.breakdown?.scheduleOverlapScore}</p><p className="text-[10px] text-ink-faint">Schedule</p></div>
                </div>
              </article>
            ))}
          </div>
          {!loading && players.length === 0 && (
            <div className="text-center py-12 text-ink-soft">No athletes match those filters. Try widening search or skill level.</div>
          )}
        </div>
      </div>
    </section>
  );
}

// Static pillar cards (athletes / teams / events) — re-theme of DiscoveryCategories.
export function DiscoveryCategories({ onOpenJoinModal, onOpenEventsModal }) {
  const pillars = [
    { icon: Users, title: 'Find athletes', text: 'Compatible players, ranked & explained.', accent: 'bg-pitch text-paper' },
    { icon: Trophy, title: 'Join a team', text: 'Open roster spots with skill & schedule fit.', accent: 'bg-volt text-volt-ink' },
    { icon: CalendarIcon, title: 'Play & host events', text: 'Pickup games, sessions, tournaments.', accent: 'bg-ember text-white' },
  ];
  return (
    <section className="py-16 bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-5">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.1}>
              <button onClick={i === 2 ? onOpenEventsModal : onOpenJoinModal} className="w-full text-left h-full rounded-2xl border border-line bg-white p-6 shadow-card hover-lift">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${p.accent}`}><p.icon className="w-5 h-5" /></div>
                <h3 className="mt-4 font-display font-bold text-xl text-ink">{p.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{p.text}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-pitch">Explore <Coins className="w-3.5 h-3.5" /></span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CalendarIcon(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}

export function AthleteProfileSection() {
  return (
    <section className="py-16 bg-ink text-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <span className="eyebrow text-volt">Unified profile</span>
          <h2 className="mt-3 font-display font-bold text-4xl md:text-5xl text-white tracking-tight">A profile that speaks every sport</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-10 rounded-3xl bg-white text-ink p-8 grid md:grid-cols-[auto_1fr] gap-6 shadow-card volt-glow">
            <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80" alt="athlete" className="w-28 h-28 rounded-2xl object-cover" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold text-2xl">Ananya Deshmukh</span>
                <Badge tone="volt">Advanced</Badge>
                <Badge tone="neutral"><MapPin className="w-3 h-3" /> Hitec City, Hyderabad</Badge>
              </div>
              <p className="mt-2 text-sm text-ink-soft">State-level badminton · tennis intermediate · trust score 96/100</p>
              <div className="mt-4 grid sm:grid-cols-3 gap-3">
                {[['Badminton', '🏸', 'Singles / Mixed Doubles', '82% win rate'], ['Tennis', '🎾', 'NTRP 3.5 basiliner', 'Right-handed'], ['Trust', '🛡️', '100% show-rate', 'Verified bio']].map(([s, e, a, b]) => (
                  <div key={s} className="rounded-xl bg-paper border border-line p-3">
                    <p className="text-xs text-ink-faint">{e} {s}</p>
                    <p className="text-sm font-semibold text-ink">{a}</p>
                    <p className="text-xs text-ink-soft">{b}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
