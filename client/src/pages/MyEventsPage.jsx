import { useEffect, useState } from 'react';
import { Wallet, Calendar, Loader2, MapPin, Users, CheckCircle2 } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { api } from '../lib/api';

const sportEmoji = { football: '⚽', cricket: '🏏', badminton: '🏸', basketball: '🏀', swimming: '🏊', tennis: '🎾', athletics: '🏃', chess: '♟️' };

export default function MyEventsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const r = await api.myEvents(); setData(r?.data || {}); } catch (e) {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="px-6 flex items-center gap-2 text-ink-soft"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;

  const events = data?.events || [];
  const spent = data?.money_spent || 0;
  const payments = data?.payments || [];

  return (
    <div className="px-4 sm:px-6">
      <h1 className="font-display font-bold text-2xl md:text-3xl text-ink">My Events</h1>
      <p className="text-sm text-ink-soft mt-1">Everything you've joined — upcoming & attended, plus your spend.</p>

      {/* summary cards */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-pitch text-volt"><Calendar className="w-5 h-5" /></div>
          <p className="mt-3 font-display font-bold text-3xl text-ink">{events.length}</p>
          <p className="text-xs text-ink-faint">Events joined</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ember text-white"><Wallet className="w-5 h-5" /></div>
          <p className="mt-3 font-display font-bold text-3xl text-ink">₹{spent.toLocaleString('en-IN')}</p>
          <p className="text-xs text-ink-faint">Money spent</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card col-span-2 md:col-span-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-volt text-volt-ink"><CheckCircle2 className="w-5 h-5" /></div>
          <p className="mt-3 font-display font-bold text-3xl text-ink">{payments.length}</p>
          <p className="text-xs text-ink-faint">Payments made</p>
        </div>
      </div>

      {/* payment history */}
      {payments.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display font-bold text-lg text-ink mb-3">Payment history</h2>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <Badge tone="volt"><CheckCircle2 className="w-3 h-3" /> Success</Badge>
                  <span className="text-sm text-ink">{p.method} · {new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                <span className="font-display font-bold text-ink">₹{p.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* joined events */}
      <div className="mt-6">
        <h2 className="font-display font-bold text-lg text-ink mb-3">Your events</h2>
        {events.length === 0 && <div className="text-center py-12 text-ink-soft">You haven't joined any events yet.</div>}
        <div className="grid md:grid-cols-2 gap-4">
          {events.map((e) => (
            <article key={e.id} className="rounded-2xl border border-line bg-white p-5 shadow-card hover-lift">
              <div className="flex items-center justify-between">
                <Badge tone="volt">{sportEmoji[e.sport_id] || ''} {e.sport_id}</Badge>
                <Badge tone="pitch"><Users className="w-3 h-3" /> {e.joined}/{e.capacity}</Badge>
              </div>
              <h3 className="mt-3 font-display font-bold text-lg text-ink">{e.title}</h3>
              <div className="mt-2 space-y-1 text-sm text-ink-soft">
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-ember" /> {e.venue}</p>
                <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-ember" /> {e.starts_at}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
