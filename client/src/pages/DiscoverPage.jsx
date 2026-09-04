import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Loader2, Sparkles, UserPlus, Check, Star, Clock, LayoutGrid, Map as MapIcon, LocateFixed, MessageSquare } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import AthleteMap from '../components/AthleteMap';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useGeolocation, HYDERABAD_CENTER } from '../lib/geo';

const skillLabel = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');
const sportEmoji = { football: '⚽', cricket: '🏏', badminton: '🏸', basketball: '🏀', swimming: '🏊', tennis: '🎾', athletics: '🏃', chess: '♟️' };
const sports = ['all', 'football', 'cricket', 'badminton', 'basketball', 'swimming', 'tennis', 'athletics', 'chess'];

export default function DiscoverPage() {
  const { profile } = useAuth();
  const [sport, setSport] = useState('all');
  const [skill, setSkill] = useState('all');
  const [search, setSearch] = useState('');
  const [radius, setRadius] = useState(12);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [meta, setMeta] = useState({});
  const [sent, setSent] = useState({});
  const [view, setView] = useState('list'); // list | map
  const [connections, setConnections] = useState([]); // accepted friends (for map)
  const { coords, request, error: geoError } = useGeolocation();
  const navigate = useNavigate();

  const load = useCallback(async (over = {}) => {
    setLoading(true);
    try {
      const res = await api.players({
        lat: 17.4401, lng: 78.3489, radiusKm: over.radius ?? radius,
        sportId: over.sport ?? sport, skillLevel: over.skill ?? skill, search: over.search ?? search,
        limit: 30, profile_id: profile?.id || '',
      });
      const raw = res?.data?.players || [];
      const seen = new Set();
      const unique = raw.filter((pl) => {
        if (!pl?.id || seen.has(pl.id)) return false;
        seen.add(pl.id);
        return true;
      });
      setPlayers(unique);
      setMeta(res?.data?.meta || {});
      // Track who we're already connected to so buttons/map reflect friendship.
      const conn = await api.friends();
      setConnections(conn || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [radius, sport, skill, search, profile]);

  useEffect(() => { load(); }, [load]);

  // Background poll friends so when another device connects or accepts, buttons/map update
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const conn = await api.friends();
        if (conn) setConnections(conn);
      } catch (e) {}
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const connectedIds = new Set(connections.map((c) => c.id));
  const friendsMap = new Map(connections.map((c) => [c.id, c]));


  const connect = async (p) => {
    try {
      const res = await api.sendConnection({
        recipientId: p.id,
        sportId: p.matched_sport || 'football',
        type: 'match_invite',
        message: `Hey ${p.name.split(' ')[0]}, would love to match up!`,
      });
      if (res?.success) {
        setSent((s) => ({ ...s, [p.id]: true }));
        const conn = await api.friends();
        setConnections(conn || []);
      }
    } catch (e) {
      console.error('Connect failed:', e);
    }
  };

  return (
    <div className="px-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-ink">Discover athletes</h1>
          <p className="text-sm text-ink-soft mt-1">Ranked by the compatibility engine, explained by AI.</p>
        </div>
        <Badge tone={meta.ai_enabled ? 'volt' : 'neutral'}>
          {meta.ai_enabled ? <><Sparkles className="w-3 h-3" /> AI narration · Powered By featherless.ai</> : 'Heuristic ranking'}
        </Badge>
      </div>

      {/* filters */}
      <div className="mt-5 grid lg:grid-cols-[1fr_auto_auto] gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search name, area, keyword…" className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-line bg-white focus:outline-none focus:ring-2 focus:ring-volt" />
        </div>
        <select value={radius} onChange={(e) => { setRadius(Number(e.target.value)); load({ radius: Number(e.target.value) }); }} className="rounded-xl border border-line bg-white px-3 py-2.5 focus:ring-2 focus:ring-volt text-sm">
          {[5, 10, 12, 20, 50].map((r) => <option key={r} value={r}>{r} km</option>)}
        </select>
        <button onClick={() => load()} className="inline-flex items-center gap-2 rounded-xl bg-ink text-paper px-5 py-2.5 font-semibold hover:bg-pitch transition-colors"><Search className="w-4 h-4" /> Search</button>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        <div className="flex flex-wrap gap-2">
          {sports.map((s) => (
            <button key={s} onClick={() => { setSport(s); load({ sport: s }); }} className={`rounded-full px-3 py-1.5 text-sm font-medium border ${sport === s ? 'bg-ink text-paper border-ink' : 'bg-white text-ink-soft border-line hover:border-ink/40'}`}>
            {s === 'all' ? '✨ All' : `${sportEmoji[s] || ''} ${s}`}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'beginner', 'intermediate', 'advanced', 'pro'].map((lv) => (
            <button key={lv} onClick={() => { setSkill(lv); load({ skill: lv }); }} className={`rounded-full px-3 py-1.5 text-sm font-medium border ${skill === lv ? 'bg-pitch text-paper border-pitch' : 'bg-white text-ink-soft border-line'}`}>
              {lv === 'all' ? 'Any level' : skillLabel(lv)}
            </button>
          ))}
        </div>
      </div>

      {/* results */}
      <div className="mt-6 flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-pitch" /> : <Sparkles className="w-4 h-4 text-pitch" />}
          {loading ? 'Ranking…' : `${players.length} ranked athletes`}
        </div>
        {/* list / map toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-line">
          <button onClick={() => setView('list')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${view === 'list' ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'}`}>
            <LayoutGrid className="w-4 h-4" /> List
          </button>
          <button onClick={() => setView('map')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${view === 'map' ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'}`}>
            <MapIcon className="w-4 h-4" /> Map
          </button>
        </div>
      </div>

      {view === 'map' ? (
        <div className="relative">
          <div className="absolute top-3 right-3 z-[500] flex flex-col items-end gap-2">
            <button onClick={request} className="inline-flex items-center gap-2 rounded-xl bg-white border border-line px-3 py-2 text-sm font-medium shadow-card hover:border-ink/30">
              <LocateFixed className="w-4 h-4 text-pitch" /> Center on me
            </button>
            {geoError && <p className="text-[11px] text-ember bg-white/90 rounded px-2 py-1">{geoError}</p>}
            {connections.length > 0 && (
              <p className="text-[11px] text-ink-soft bg-white/90 rounded px-2 py-1">● Showing your {connections.length} connected {connections.length === 1 ? 'friend' : 'friends'} — tap a pin to view & chat</p>
            )}
          </div>
          <AthleteMap
            athletes={connections.length ? connections.map((f) => ({ ...f, matched_sport: f.sport, compatibilityScore: null, reliability_rate: null })) : players}
            center={{ lat: 17.4401, lng: 78.3489 }}
            focus={coords || null}
            height="520px"
            connectedIds={connectedIds}
            onConnect={(p) => {
              if (connectedIds.has(p.id)) {
                const friend = friendsMap.get(p.id);
                navigate(friend?.conversation_id ? `/app/chat/${friend.conversation_id}` : '/app/chat');
              } else {
                connect(p);
              }
            }}
          />
        </div>
      ) : (
      <div className="grid md:grid-cols-2 gap-5">
        {players.map((p) => (
          <article key={p.id} className="rounded-2xl border border-line bg-white p-5 shadow-card hover-lift volt-glow">
            <div className="flex items-start gap-3">
              <img src={p.avatar} alt={p.name} className="w-16 h-16 rounded-2xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-lg text-ink truncate">{p.name}</h3>
                  <div className="text-center shrink-0">
                    <div className="font-display font-bold text-2xl text-ember">{p.compatibilityScore}</div>
                    <div className="text-[10px] text-ink-faint">match</div>
                  </div>
                </div>
                <p className="text-xs text-ink-faint">{p.handle} · {p.location?.neighborhood}, {p.location?.city}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="volt">{sportEmoji[p.matched_sport] || ''} {skillLabel(p.skillLevel)}</Badge>
                  <Badge tone="neutral"><MapPin className="w-3 h-3" /> {p.distanceKm} km</Badge>
                  <Badge tone="pitch">{p.matchTier}</Badge>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-paper border border-line p-3">
              <p className="text-sm font-medium text-ink leading-snug">“{p.explanation || `${p.name} matches your ${p.matched_sport} interests.`}”</p>
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {p.reasonTags?.slice(0, 4).map((t) => <span key={t} className="inline-flex items-center gap-1 text-[11px] text-ink-soft bg-ink/5 rounded-full px-2 py-0.5"><Check className="w-3 h-3 text-pitch" /> {t}</span>)}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-ink-soft">
                <Star className="w-3.5 h-3.5 text-ember" /> {p.rating} · <Clock className="w-3.5 h-3.5" /> {p.reliability_rate ?? p.reliabilityRate ?? '—'}% reliable
              </div>
              {connectedIds.has(p.id) || sent[p.id] ? (
                <Button
                  variant="pitch"
                  size="sm"
                  onClick={() => {
                    const friend = friendsMap.get(p.id);
                    navigate(friend?.conversation_id ? `/app/chat/${friend.conversation_id}` : '/app/chat');
                  }}
                >
                  <MessageSquare className="w-4 h-4" /> {connectedIds.has(p.id) ? 'Chat' : 'Friend'}
                </Button>
              ) : (
                <Button variant="volt" size="sm" onClick={() => connect(p)}>
                  <UserPlus className="w-4 h-4" /> Connect
                </Button>
              )}
            </div>
          </article>
        ))}
        </div>
      )}
      {!loading && players.length === 0 && <div className="text-center py-16 text-ink-soft">No athletes match. Widen filters or radius.</div>}
    </div>
  );
}
