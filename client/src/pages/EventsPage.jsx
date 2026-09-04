import { useEffect, useState } from 'react';
import { Plus, MapPin, Calendar, Users, Loader2, Sparkles, Check } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const sportEmoji = { football: '⚽', cricket: '🏏', badminton: '🏸', basketball: '🏀', swimming: '🏊', tennis: '🎾', athletics: '🏃', chess: '♟️' };

export default function EventsPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState({});
  const [form, setForm] = useState({ title: '', sport_id: 'football', starts_at: '', venue: '', capacity: 10 });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await api.allEvents(); setEvents(r?.data || []); } catch (e) {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const join = async (id) => {
    try { await api.joinEvent(id); setJoined((x) => ({ ...x, [id]: true })); load(); } catch (e) {}
  };

  const create = async () => {
    setCreating(true);
    try { await api.createEvent({ ...form, description: 'Created from the app.', title: form.title || 'Pickup Game' }); await load(); setForm({ title: '', sport_id: 'football', starts_at: '', venue: '', capacity: 10 }); }
    catch (e) {} finally { setCreating(false); }
  };

  return (
    <div className="px-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-ink">Events</h1>
          <p className="text-sm text-ink-soft mt-1">Pickup games, sessions and tournaments near you.</p>
        </div>
        <Button variant="ember" onClick={create} disabled={creating}><Plus className="w-4 h-4" /> Create event</Button>
      </div>

      <div className="mt-5 grid md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-dashed border-line bg-white p-5">
          <p className="eyebrow text-pitch mb-3">Quick create</p>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 mb-2 focus:ring-2 focus:ring-volt" />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select value={form.sport_id} onChange={(e) => setForm({ ...form, sport_id: e.target.value })} className="rounded-xl border border-line bg-paper px-3 py-2.5 focus:ring-2 focus:ring-volt text-sm">{['football','cricket','badminton','basketball','swimming','tennis','athletics','chess'].map((s) => <option key={s} value={s}>{s}</option>)}</select>
            <input value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} placeholder="Saturday 6:30 PM" className="rounded-xl border border-line bg-paper px-3 py-2.5 focus:ring-2 focus:ring-volt" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Venue" className="rounded-xl border border-line bg-paper px-3 py-2.5 focus:ring-2 focus:ring-volt" />
            <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="Capacity" className="rounded-xl border border-line bg-paper px-3 py-2.5 focus:ring-2 focus:ring-volt" />
          </div>
        </div>

        {loading ? <div className="flex items-center gap-2 text-ink-soft"><Loader2 className="w-4 h-4 animate-spin" /> Loading events…</div> : events.map((e) => {
          const isJoined = !!joined[e.id];
          return (
            <article key={e.id} className="rounded-2xl border border-line bg-white p-5 shadow-card hover-lift volt-glow">
              <div className="flex items-center justify-between">
                <Badge tone="volt">{sportEmoji[e.sport_id] || ''} {e.sport_id}</Badge>
                <Badge tone="neutral">{e.skill_level === 'all' ? 'All levels' : e.skill_level}</Badge>
              </div>
              <h3 className="mt-3 font-display font-bold text-xl text-ink">{e.title}</h3>
              <div className="mt-3 space-y-1.5 text-sm text-ink-soft">
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-ember" /> {e.venue} · {e.neighborhood}</p>
                <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-ember" /> {e.starts_at}</p>
                <p className="flex items-center gap-2"><Users className="w-4 h-4 text-ember" /> {e.joined}/{e.capacity} joined · {e.price}</p>
              </div>
              {e.description && <p className="mt-3 text-sm text-ink-soft">{e.description}</p>}
              <div className="mt-4">
                <Button variant={isJoined ? 'ghost' : 'volt'} size="sm" onClick={() => join(e.id)} disabled={isJoined}>
                  {isJoined ? <><Check className="w-4 h-4" /> Joined</> : <><Sparkles className="w-4 h-4" /> Join event</>}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
