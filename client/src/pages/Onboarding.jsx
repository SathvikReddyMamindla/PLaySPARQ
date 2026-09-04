import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, CheckCircle2, MapPin, Pencil, RefreshCw, Save, X, Users, LocateFixed } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useGeolocation } from '../lib/geo';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { JoinModal } from '../components/Modals';

const sportEmoji = { football: '⚽', cricket: '🏏', badminton: '🏸', basketball: '🏀', swimming: '🏊', tennis: '🎾', athletics: '🏃', chess: '♟️', 'athletics & running': '🏃' };
const slots = ['weekday_morning', 'weekday_evening', 'weekday_afternoon', 'friday_night', 'saturday_morning', 'sunday_morning', 'weekend_morning', 'weekend_evening'];
const slotLabel = (s) => ({ weekday_morning: 'Weekday AM', weekday_evening: 'Weekday PM', weekday_afternoon: 'Weekday noon', friday_night: 'Friday night', saturday_morning: 'Sat AM', sunday_morning: 'Sun AM', weekend_morning: 'Weekend AM', weekend_evening: 'Weekend PM' }[s] || s);
const skillLabel = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');

export default function Onboarding({ mode = 'full' }) {
  const [text, setText] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [parsed, setParsed] = useState(null);
  const [source, setSource] = useState('');
  const [saved, setSaved] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [editSport, setEditSport] = useState(null);
  const { coords, request, error: geoError, fetching: geoFetching } = useGeolocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const examples = [
    'I play badminton every weekend, intermediate, based in Kondapur. Also casual chess, ~1200.',
    'Leather-ball club cricketer, 125 km/h fast bowler, weekend nets around Banjara Hills.',
    'Beginner trail runner, targeting a sub-35 min 5K, mornings at Botanical Garden.',
  ];

  const run = async (t = text) => {
    if (!t.trim()) return;
    setState('loading'); setParsed(null); setSaved(false);
    try {
      const res = await api.parseProfile(t);
      setParsed(res.parsed);
      setSource(res.meta?.source || 'heuristic');
      setState('done');
    } catch (e) {
      setState('error');
    }
  };

  const save = async () => {
    if (!parsed) return;
    const primarySport = parsed.sports?.[0]?.sport || 'football';
    const payload = {
      name: user?.profile?.name || user?.user?.display_name || 'Athlete',
      neighborhood: parsed.location?.neighborhood || '',
      city: parsed.location?.city || 'Hyderabad',
      // Browser geolocation pinpoints you on the map; fall back to Hyderabad.
      lat: coords?.lat ?? 17.4401,
      lng: coords?.lng ?? 78.3489,
      primary_sport: primarySport,
      skill_level: parsed.skill_level || parsed.sports?.[0]?.skill_level || 'intermediate',
      role: parsed.sports?.[0]?.role || '',
      bio: parsed.summary || text,
      availability: parsed.availability || [],
      sports: parsed.sports || [{ sport: primarySport, skill_level: 'intermediate', role: null, metrics: {} }],
    };
    try {
      await api.createProfile(payload);
      setSaved(true);
      setTimeout(() => navigate('/app'), 900);
    } catch (e) { /* ignore */ }
  };

  const startOver = () => { setState('idle'); setParsed(null); setText(''); };

  if (mode === 'gate' && !user) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-line shadow-card p-8 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-ink text-volt mx-auto"><Users className="w-7 h-7" /></div>
          <h1 className="mt-4 font-display font-bold text-2xl text-ink">Sign in to continue</h1>
          <p className="mt-2 text-ink-soft">Create a profile or jump in as a demo player to explore SportSphere.</p>
          <div className="mt-6">
            <Button variant="volt" className="w-full" onClick={() => setJoinOpen(true)}>Get started</Button>
            <Link to="/" className="mt-4 block text-sm text-ink-faint hover:text-ink">Back to home</Link>
          </div>
          <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} onToast={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper bg-paper-mesh py-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-sm text-ink-faint hover:text-ink">← Home</Link>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-pitch"><Sparkles className="w-4 h-4 text-ember" /> AI Profile Builder</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display font-bold text-3xl md:text-4xl text-ink tracking-tight">Tell us how you play.</h1>
          <p className="mt-2 text-ink-soft">One sentence in your own words. The AI extracts a structured profile — no dropdowns.</p>
        </motion.div>

        {/* input */}
        <div className="mt-6 bg-white rounded-3xl border border-line shadow-card p-5 volt-glow">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder='Try: "I play badminton every weekend, intermediate, based in Kondapur."'
            className="w-full resize-none text-lg bg-transparent focus:outline-none placeholder:text-ink-faint"
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button key={ex} onClick={() => { setText(ex); run(ex); }} className="text-[11px] text-ink-soft bg-paper border border-line rounded-full px-2.5 py-1 hover:border-ink/30 hover:text-ink transition-colors truncate max-w-[200px]">{ex.slice(0, 32)}…</button>
              ))}
            </div>
            <Button variant="volt" onClick={() => run()} disabled={state === 'loading' || !text.trim()}>
              {state === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Build profile</>}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">Source: {source === 'featherless' ? 'Featherless AI' : source === 'heuristic' ? 'built-in heuristic (set FEATHERLESS_API_KEY for live AI)' : '—'}</p>
        </div>

        {/* result */}
        {(state === 'done' && parsed) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <div className="rounded-3xl border border-line bg-white shadow-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle2 className="w-5 h-5 text-pitch" />
                <h2 className="font-display font-bold text-xl text-ink">Here's what we understood</h2>
                <span className="ml-auto"><Badge tone="volt">Editable</Badge></span>
              </div>

              {/* trust signal */}
              <div className="mb-5 rounded-2xl bg-paper border border-line p-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pitch text-volt font-display font-bold">{parsed.trust_signals?.score || 78}</div>
                <div>
                  <p className="font-semibold text-ink">Trust check passed</p>
                  <p className="text-xs text-ink-soft">{(parsed.trust_signals?.reasons || ['specific details']).join(', ')}</p>
                </div>
              </div>

              {/* sports */}
              <div className="space-y-3">
                {(parsed.sports || []).map((s, i) => (
                  <div key={i} className="rounded-2xl border border-line bg-paper p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{sportEmoji[s.sport] || '🏅'}</span>
                        <div>
                          <p className="font-semibold text-ink capitalize">{s.sport}</p>
                          <p className="text-xs text-ink-faint">{s.role || 'All-Rounder'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="volt">{skillLabel(s.skill_level)}</Badge>
                        <button onClick={() => setEditSport(editSport === i ? null : i)} className="text-ink-faint hover:text-ink"><Pencil className="w-4 h-4" /></button>
                      </div>
                    </div>
                    {editSport === i && (
                      <div className="mt-3">
                        <p className="text-xs text-ink-faint mb-1.5">Adjust skill</p>
                        <div className="flex flex-wrap gap-2">
                          {['beginner', 'intermediate', 'advanced', 'pro', 'elite'].map((lv) => (
                            <button key={lv} onClick={() => { const n = parsed.sports.map((x, j) => j === i ? { ...x, skill_level: lv } : x); setParsed({ ...parsed, sports: n, skill_level: n[0].skill_level }); }} className={`rounded-full px-3 py-1 text-sm border ${s.skill_level === lv ? 'bg-pitch text-paper border-pitch' : 'bg-white text-ink-soft border-line'}`}>{skillLabel(lv)}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* availability */}
              <div className="mt-4">
                <p className="text-xs text-ink-faint mb-2">Availability</p>
                <div className="flex flex-wrap gap-2">
                  {(parsed.availability || []).map((s) => <Badge key={s} tone="pitch">{slotLabel(s)}</Badge>)}
                </div>
              </div>

              {/* location + summary */}
              <div className="mt-4 rounded-2xl border border-line bg-paper p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <MapPin className="w-4 h-4 text-ember" />
                    {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : `${parsed.location?.neighborhood || '—'}, ${parsed.location?.city || 'Hyderabad'}`}
                  </p>
                  <button onClick={request} disabled={geoFetching} className="inline-flex items-center gap-1.5 text-xs font-semibold text-pitch bg-volt/20 hover:bg-volt/30 rounded-full px-3 py-1.5 transition-colors">
                    {geoFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                    {coords ? 'Location set' : 'Use my location'}
                  </button>
                </div>
                {geoError && <p className="mt-1 text-xs text-ember">{geoError}</p>}
                {coords && <p className="mt-1 text-[11px] text-ink-faint">You'll appear as a pin on the Athlete Map.</p>}
                <p className="mt-2 text-sm text-ink-soft">“{parsed.summary}”</p>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button variant="volt" className="flex-1" onClick={save} disabled={saved}>
                  {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save & go to app</>}
                </Button>
                <button onClick={startOver} className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"><RefreshCw className="w-4 h-4" /> Redo</button>
              </div>
            </div>
          </motion.div>
        )}

        {state === 'error' && <p className="mt-6 text-ember">Could not parse. Please try a fuller description.</p>}
        {saved && <div className="mt-4 text-center text-pitch font-semibold">Profile saved — taking you to the app…</div>}
      </div>
    </div>
  );
}
