import { useEffect, useState } from 'react';
import { Plus, MapPin, Calendar, Users, Loader2, Sparkles, Check, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { api } from '../lib/api';

const sportEmoji = { football: '⚽', cricket: '🏏', badminton: '🏸', basketball: '🏀', swimming: '🏊', tennis: '🎾', athletics: '🏃', chess: '♟️' };

// Simulated payment gateway form (mock). Shows real UPI/card card flow; replace with a
// real gateway (Razorpay/Stripe) by swapping `payJoinEvent` for a server-side intent.
function PaymentModal({ event, onClose, onPaid }) {
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [method, setMethod] = useState('UPI');
  const price = event?.price || 'Free';

  const pay = async () => {
    setProcessing(true);
    // Simulate network/payment latency.
    await new Promise((r) => setTimeout(r, 1200));
    try {
      const res = await api.payJoinEvent(event.id);
      setDone(true);
      setTimeout(() => { onPaid(res); onClose(); }, 900);
    } catch (e) {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-pitch overflow-hidden">
        <div className="bg-ink px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold text-lg">Secure checkout</p>
            <ShieldCheck className="w-5 h-5 text-volt" />
          </div>
          <p className="text-white/60 text-xs mt-1">Demo payment · No real charge</p>
        </div>
        <div className="p-6">
          <div className="rounded-2xl bg-paper border border-line p-4 text-center">
            <p className="text-2xl">{sportEmoji[event?.sport_id] || '🎯'}</p>
            <p className="font-semibold text-ink">{event?.title}</p>
            <p className="text-sm text-ink-soft">{event?.starts_at} · {event?.venue}</p>
            <p className="mt-2 font-display font-bold text-2xl text-ember">{price}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {['UPI', 'Card', 'NetBanking'].map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${method === m ? 'bg-pitch text-paper border-pitch' : 'border-line text-ink-soft'}`}>{m}</button>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-line p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink"><CreditCard className="w-4 h-4 text-pitch" /> {method === 'UPI' ? 'yourname@upi' : '4444 4444 4444 4444'}</p>
            <p className="text-xs text-ink-faint mt-1">Basic demo checkout — no real payment processed.</p>
          </div>

          <Button variant="ember" className="w-full mt-4" onClick={pay} disabled={processing || done}>
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <><Check className="w-4 h-4" /> Paid</> : <><Lock className="w-4 h-4" /> Pay {price}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState({});
  const [paying, setPaying] = useState(null); // event object being paid
  const [form, setForm] = useState({ title: '', sport_id: 'football', starts_at: '', venue: '', capacity: 10 });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await api.allEvents(); setEvents(r?.data || []); } catch (e) {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const isFree = (e) => {
    const p = (e?.price || '').toString().toLowerCase();
    return !p || p === 'free' || p === '0' || p === '' || p === 'rs.0';
  };

  const join = async (e) => {
    if (isFree(e)) {
      try { await api.joinEvent(e.id); setJoined((x) => ({ ...x, [e.id]: true })); load(); } catch (err) {}
    } else {
      setPaying(e);
    }
  };

  const onPaid = (res) => {
    if (res?.event) setJoined((x) => ({ ...x, [res.event.id]: true }));
    load();
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
          <p className="text-sm text-ink-soft mt-1">Pickup games, sessions and tournaments — newest first.</p>
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
                <Badge tone={isFree(e) ? 'pitch' : 'ember'}>{isFree(e) ? 'FREE' : e.price}</Badge>
              </div>
              <h3 className="mt-3 font-display font-bold text-xl text-ink">{e.title}</h3>
              <div className="mt-3 space-y-1.5 text-sm text-ink-soft">
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-ember" /> {e.venue} · {e.neighborhood}</p>
                <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-ember" /> {e.starts_at}</p>
                <p className="flex items-center gap-2"><Users className="w-4 h-4 text-ember" /> {e.joined}/{e.capacity} joined</p>
              </div>
              {e.description && <p className="mt-3 text-sm text-ink-soft">{e.description}</p>}
              <div className="mt-4">
                <Button variant={isJoined ? 'ghost' : 'volt'} size="sm" onClick={() => join(e)} disabled={isJoined}>
                  {isJoined ? <><Check className="w-4 h-4" /> Joined</> : isFree(e) ? <><Sparkles className="w-4 h-4" /> Join (free)</> : <><CreditCard className="w-4 h-4" /> Join · {e.price}</>}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {paying && <PaymentModal event={paying} onClose={() => setPaying(null)} onPaid={onPaid} />}
    </div>
  );
}
