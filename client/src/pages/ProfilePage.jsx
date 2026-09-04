import { useEffect, useState } from 'react';
import { MapPin, Star, Clock, Loader2, Sparkles, ShieldCheck, TrendingUp } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const statLabel = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');
const slotLabel = (s) => ({ weekday_morning: 'Weekday AM', weekday_evening: 'Weekday PM', weekday_afternoon: 'Weekday noon', friday_night: 'Friday night', saturday_morning: 'Sat AM', sunday_morning: 'Sun AM', weekend_morning: 'Weekend AM', weekend_evening: 'Weekend PM' }[s] || s);

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const [trust, setTrust] = useState(null);
  const [summaries, setSummaries] = useState({});
  const [aiOn, setAiOn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const status = await api.aiStatus();
        setAiOn(status?.ai_enabled);
        if (profile?.id) {
          const t = await api.trustNote({ profileId: profile.id });
          setTrust(t);
          for (const sport of ['football', 'athletics', 'badminton']) {
            try { const p = await api.performanceSummary(sport, profile.id); setSummaries((x) => ({ ...x, [sport]: p })); } catch (e) {}
          }
        }
      } catch (e) {} finally { setLoading(false); }
    })();
  }, [profile]);

  const name = profile?.name || user?.user?.display_name || 'Player';
  const sports = profile?.sports || [];

  return (
    <div className="px-4 sm:px-6 max-w-3xl">
      <h1 className="font-display font-bold text-2xl md:text-3xl text-ink">Your profile</h1>
      <p className="text-sm text-ink-soft mt-1">Your unified athlete identity across every sport.</p>

      <div className="mt-5 rounded-2xl border border-line bg-white p-6 shadow-card volt-glow">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-ink text-volt font-display font-bold text-2xl">{name.charAt(0)}</div>
          <div>
            <h2 className="font-display font-bold text-2xl text-ink">{name}</h2>
            <p className="text-sm text-ink-soft">{profile?.city || 'Hyderabad'} · {profile?.neighborhood || ''}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge tone="pitch"><TrendingUp className="w-3 h-3" /> {statLabel(profile?.skill_level || 'intermediate')}</Badge>
              {profile?.rating && <Badge tone="neutral"><Star className="w-3 h-3 text-ember" /> {profile.rating}</Badge>}
            </div>
          </div>
        </div>

        {/* trust */}
        <div className="mt-5 rounded-2xl bg-paper border border-line p-4 flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-pitch text-volt font-display font-bold text-xl">{trust?.score ?? '—'}</div>
          <div>
            <p className="flex items-center gap-2 font-semibold text-ink"><ShieldCheck className="w-4 h-4 text-pitch" /> Trust note{aiOn && ' · AI'}</p>
            <p className="text-sm text-ink-soft mt-0.5">{trust?.note || 'Checking…'}</p>
          </div>
        </div>

        {/* sports */}
        <div className="mt-5">
          <p className="text-xs text-ink-faint mb-2">Sports matrix</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {(sports.length ? sports : [{ sport: profile?.primary_sport || 'football', skill_level: 'intermediate' }]).map((s, i) => (
              <div key={i} className="rounded-xl border border-line bg-paper p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink capitalize">{s.sport}</p>
                  <Badge tone="volt">{statLabel(s.skill_level)}</Badge>
                </div>
                {s.role && <p className="text-xs text-ink-soft mt-1">{s.role}</p>}
              </div>
            ))}
          </div>
        </div>

        {profile?.availability?.length > 0 && (
          <div className="mt-5">
            <p className="text-xs text-ink-faint mb-2">Availability</p>
            <div className="flex flex-wrap gap-2">{profile.availability.map((s) => <Badge key={s} tone="pitch">{slotLabel(s)}</Badge>)}</div>
          </div>
        )}

        {profile?.bio && (
          <div className="mt-5 rounded-xl bg-paper border border-line p-4">
            <p className="text-xs text-ink-faint mb-1">Bio</p>
            <p className="text-sm text-ink-soft">“{profile.bio}”</p>
          </div>
        )}
      </div>

      {/* Performance summaries */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-ember" />
          <h3 className="font-display font-bold text-lg text-ink">AI performance summaries</h3>
          {!aiOn && <span className="text-[11px] text-ink-faint">(heuristic — set key for live AI)</span>}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {Object.entries(summaries).map(([sport, p]) => (
            <div key={sport} className="rounded-2xl border border-line bg-white p-4 shadow-card hover-lift">
              <p className="eyebrow text-pitch">{sport}</p>
              <p className="mt-2 font-display font-bold text-lg text-ink">{p.headline}</p>
              <p className="text-sm text-ink-soft mt-1">{p.insight}</p>
            </div>
          ))}
        </div>
        {loading && <div className="text-ink-soft text-sm"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading…</div>}
      </div>
    </div>
  );
}
