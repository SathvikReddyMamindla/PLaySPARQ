import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Trophy, Users, ArrowRight, UserPlus, Check, Calendar,
  MapPin, Clock, Tag, ShieldCheck, Activity, Copy, CheckCircle2
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const sportEmoji = {
  football: '⚽', cricket: '🏏', badminton: '🏸', basketball: '🏀',
  swimming: '🏊', tennis: '🎾', athletics: '🏃', chess: '♟️'
};

export default function HomePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState({});
  const [copiedCode, setCopiedCode] = useState('');

  const loadFeed = async () => {
    setLoading(true);
    try {
      const res = await api.personalizedHome();
      if (res?.success) setFeed(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleConnect = async (candId, sport) => {
    setConnecting((c) => ({ ...c, [candId]: 'sending' }));
    try {
      await api.sendConnection({
        recipientId: candId,
        sportId: sport || 'football',
        type: 'match_invite',
        message: "Hey, saw our high compatibility on SportSphere! Let's connect.",
      });
      setConnecting((c) => ({ ...c, [candId]: 'sent' }));
    } catch (e) {
      setConnecting((c) => ({ ...c, [candId]: 'error' }));
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-12 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 border-4 border-pitch border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm text-ink-soft">Curating your personalized sports dashboard…</p>
      </div>
    );
  }

  const players = feed?.recommended_players || [];
  const tournaments = feed?.tournaments || [];
  const upcoming = feed?.upcoming_tournaments || [];
  const activities = feed?.recent_activities || [];
  const offers = feed?.special_offers || [];

  return (
    <div className="px-4 sm:px-6 space-y-8 pb-12 max-w-6xl">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-ink via-pitch to-ink text-white p-6 sm:p-8 shadow-pitch">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-volt text-volt-ink text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Personalized for you
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-4xl text-paper">
            {feed?.greeting || `Welcome, ${profile?.name || 'Athlete'} 👋`}
          </h1>
          <p className="mt-2 text-white/80 text-sm sm:text-base leading-relaxed">
            Your daily matchmaking briefing: high-compatibility partners near you, upcoming tournaments, and exclusive entry promotions.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="volt" onClick={() => navigate('/app/tournaments')}>
              <Trophy className="w-4 h-4" /> Explore Tournaments
            </Button>
            <Button variant="ghost" className="text-white border-white/20 hover:bg-white/10" onClick={() => navigate('/app/discover')}>
              <Users className="w-4 h-4" /> Find Sparring Partners
            </Button>
          </div>
        </div>
      </div>

      {/* Special Offers Banner if available */}
      {offers.length > 0 && (
        <div className="rounded-2xl border border-volt/30 bg-volt/10 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ink text-volt shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-ink">Special Offers for You</p>
              <p className="text-xs text-ink-soft">
                Get up to ₹{offers[0]?.max_discount || 100} off your next tournament entry with code{' '}
                <span className="font-mono font-bold text-pitch">{offers[0]?.code}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => copyCode(offers[0]?.code)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-ink text-volt text-xs font-semibold hover:bg-pitch transition-colors shrink-0"
          >
            {copiedCode === offers[0]?.code ? <><CheckCircle2 className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy {offers[0]?.code}</>}
          </button>
        </div>
      )}

      {/* Upcoming Tournaments / Registrations */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl text-ink flex items-center gap-2">
              <Calendar className="w-5 h-5 text-ember" /> Your Upcoming Tournaments
            </h2>
            <span className="text-xs font-medium text-pitch bg-pitch/10 rounded-full px-2.5 py-1">{upcoming.length} Active</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {upcoming.map((u) => (
              <div key={u.registration_id} className="rounded-2xl border border-line bg-white p-5 shadow-card hover-lift flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <Badge tone="pitch">{sportEmoji[u.tournament.sport_id] || '🏆'} {u.tournament.sport_id}</Badge>
                    <span className="text-xs font-semibold text-pitch">Registered</span>
                  </div>
                  <h3 className="mt-2 font-display font-bold text-lg text-ink">{u.tournament.title}</h3>
                  <p className="text-xs text-ink-soft mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-ember" /> {u.tournament.venue} · {u.tournament.starts_at}
                  </p>
                  {u.team_name && <p className="text-xs font-medium text-ink-faint mt-2">Squad: {u.team_name}</p>}
                </div>
                <div className="mt-4 pt-3 border-t border-line flex justify-end">
                  <button onClick={() => navigate('/app/tournaments')} className="text-xs font-bold text-pitch hover:underline flex items-center gap-1">
                    View Tournament Details <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 1: Players you may want to connect with */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-ink flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-volt-ink bg-volt p-0.5 rounded-md" /> Players you may want to connect with
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">Scored by your sports, skill tier, and location proximity</p>
          </div>
          <button onClick={() => navigate('/app/discover')} className="text-xs font-semibold text-pitch hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((p) => {
            const status = connecting[p.id];
            return (
              <div key={p.id} className="rounded-2xl border border-line bg-white p-5 shadow-card hover-lift flex flex-col justify-between volt-glow">
                <div>
                  <div
                    className="flex items-start gap-3 cursor-pointer group"
                    onClick={() => navigate(`/app/profile/${p.id}`)}
                    title="View full athlete profile"
                  >
                    <img src={p.avatar} alt={p.name} className="w-14 h-14 rounded-2xl object-cover shrink-0 group-hover:opacity-90 transition-opacity" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-bold text-base text-ink truncate group-hover:text-pitch transition-colors">{p.name}</h3>
                        <span className="font-display font-bold text-lg text-ember">{p.compatibility_score}%</span>
                      </div>
                      <p className="text-xs text-ink-faint truncate">{p.handle} · {p.neighborhood}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge tone="volt">{sportEmoji[p.matched_sport] || ''} {p.skill_level}</Badge>
                        <Badge tone="neutral">{p.distance_km} km</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Why you are seeing this player */}
                  <div className="mt-3.5 rounded-xl bg-paper border border-line p-3 text-xs space-y-1">
                    <p className="font-semibold text-ink-soft uppercase text-[10px] tracking-wider">Why you're matched</p>
                    {p.reasons?.slice(0, 3).map((r, idx) => (
                      <p key={idx} className="flex items-center gap-1.5 text-ink leading-snug">
                        <Check className="w-3.5 h-3.5 text-pitch shrink-0" /> {r}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/app/profile/${p.id}`)}
                    className="text-xs font-semibold text-pitch hover:underline"
                  >
                    View Profile
                  </button>
                  <Button
                    variant={status === 'sent' ? 'ghost' : 'volt'}
                    size="sm"
                    disabled={status === 'sent' || status === 'sending'}
                    onClick={() => handleConnect(p.id, p.matched_sport)}
                  >
                    {status === 'sent' ? <><Check className="w-3.5 h-3.5" /> Request Sent</> : <><UserPlus className="w-3.5 h-3.5" /> Connect</>}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Tournaments for you */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-ink flex items-center gap-2">
              <Trophy className="w-5 h-5 text-ember" /> Tournaments for you
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">Upcoming open tournaments matching your preferred sports</p>
          </div>
          <button onClick={() => navigate('/app/tournaments')} className="text-xs font-semibold text-pitch hover:underline flex items-center gap-1">
            Browse all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {tournaments.slice(0, 4).map((t) => (
            <div key={t.id} className="rounded-2xl border border-line bg-white p-5 shadow-card hover-lift flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <Badge tone="volt">{sportEmoji[t.sport_id] || '🏆'} {t.sport_id}</Badge>
                  <span className="text-xs font-bold text-ink">
                    ₹{t.entry_fee} <span className="text-[10px] text-ink-faint font-normal">+ ₹20 fee</span>
                  </span>
                </div>
                <h3 className="mt-3 font-display font-bold text-lg text-ink">{t.title}</h3>
                <p className="text-xs text-ink-soft mt-1.5 line-clamp-2">{t.description}</p>
                <div className="mt-3 space-y-1 text-xs text-ink-soft">
                  <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-ember" /> {t.venue}</p>
                  <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-ember" /> {t.starts_at}</p>
                  <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-ember" /> Deadline: {t.registration_deadline}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                <span className="text-xs text-ink-faint">{t.current_participants}/{t.max_participants} registered</span>
                <Button
                  variant={t.is_registered ? 'ghost' : 'pitch'}
                  size="sm"
                  onClick={() => navigate('/app/tournaments')}
                >
                  {t.is_registered ? <><Check className="w-3.5 h-3.5" /> Registered</> : 'Register & Pay'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Recent Activity */}
      {activities.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-pitch" /> Your Recent Activity
          </h2>
          <div className="divide-y divide-line">
            {activities.map((act) => (
              <div key={act.id} className="py-3 flex items-start justify-between text-xs">
                <div>
                  <p className="font-semibold text-ink">{act.description}</p>
                  <p className="text-ink-faint mt-0.5">{act.activity_type.replace(/_/g, ' ')}</p>
                </div>
                <span className="text-ink-faint shrink-0">Recent</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
