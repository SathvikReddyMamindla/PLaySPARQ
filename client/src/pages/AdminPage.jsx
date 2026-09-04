import { useEffect, useState } from 'react';
import {
  ShieldAlert, Trophy, Tag, CreditCard, Flag, Megaphone,
  Plus, Check, X, RotateCcw, Loader2, Users, AlertCircle
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const adminTabs = [
  { key: 'tournaments', label: 'Tournaments', icon: Trophy },
  { key: 'discounts', label: 'Discount Campaigns', icon: Tag },
  { key: 'payments', label: 'Payments & Refunds', icon: CreditCard },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'reports', label: 'Safety & Reports', icon: Flag },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('tournaments');
  const [tournaments, setTournaments] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  // Modals & forms
  const [tournModal, setTournModal] = useState(false);
  const [tournForm, setTournForm] = useState({
    title: '', sport_id: 'football', venue: '', starts_at: '', ends_at: '',
    registration_deadline: '', max_participants: 16, entry_fee: 400, description: ''
  });

  const [discModal, setDiscModal] = useState(false);
  const [discForm, setDiscForm] = useState({
    code: '', discount_type: 'fixed', discount_value: 50, min_order_value: 200, max_discount: 50
  });

  const [annModal, setAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({
    tournamentId: '', title: '', message: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'tournaments') {
        const r = await api.tournaments();
        if (r?.success) setTournaments(r.data);
      } else if (tab === 'discounts') {
        const r = await api.availableDiscounts();
        if (r?.success) setDiscounts(r.data);
      } else if (tab === 'payments') {
        const r = await api.adminPayments();
        if (r?.success) setPayments(r.data);
      } else if (tab === 'reports') {
        const r = await api.adminReports();
        if (r?.success) setReports(r.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tab]);

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    try {
      await api.adminCreateTournament(tournForm);
      setTournModal(false);
      setActionMsg('Tournament created successfully!');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateDiscount = async (e) => {
    e.preventDefault();
    try {
      await api.adminCreateDiscount(discForm);
      setDiscModal(false);
      setActionMsg('Discount campaign created!');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleDiscount = async (id) => {
    try {
      await api.adminToggleDiscount(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRefund = async (paymentId) => {
    if (!confirm('Are you sure you want to process a full refund for this payment?')) return;
    try {
      await api.adminRefund(paymentId, 'User requested refund');
      setActionMsg(`Payment ${paymentId} refunded successfully.`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await api.adminAnnouncement(annForm);
      setAnnModal(false);
      setActionMsg('Announcement broadcasted to athletes.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResolveReport = async (rid) => {
    try {
      await api.adminResolveReport(rid);
      setActionMsg('Report marked as resolved.');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="px-4 sm:px-6 space-y-6 pb-12 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-ember" /> Admin Control Center
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Manage tournaments, discount campaigns, platform payments, refunds, and community safety.
          </p>
        </div>
      </div>

      {actionMsg && (
        <div className="rounded-xl bg-pitch/10 border border-pitch/20 p-3 text-xs font-semibold text-pitch flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg('')} className="text-pitch p-1">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {adminTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border transition-colors ${
                tab === t.key ? 'bg-ink text-paper border-ink shadow' : 'bg-white text-ink-soft border-line hover:border-ink/30'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="py-16 text-center text-ink-soft flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-pitch" /> Loading admin records…
        </div>
      ) : (
        <div>
          {/* 1. Tournaments Tab */}
          {tab === 'tournaments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-bold text-lg text-ink">Active Tournaments ({tournaments.length})</h3>
                <Button variant="volt" size="sm" onClick={() => setTournModal(true)}>
                  <Plus className="w-4 h-4" /> Add Tournament
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {tournaments.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge tone="volt">{t.sport_id}</Badge>
                        <h4 className="font-display font-bold text-base text-ink mt-2">{t.title}</h4>
                        <p className="text-xs text-ink-soft">{t.venue} · {t.city}</p>
                      </div>
                      <span className="font-display font-bold text-lg text-pitch">₹{t.entry_fee}</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-line flex justify-between items-center text-xs text-ink-soft">
                      <span>{t.current_participants}/{t.max_participants} Teams Registered</span>
                      <span className="font-semibold text-pitch uppercase">{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Discounts Tab */}
          {tab === 'discounts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-bold text-lg text-ink">Promotional Discount Campaigns ({discounts.length})</h3>
                <Button variant="volt" size="sm" onClick={() => setDiscModal(true)}>
                  <Plus className="w-4 h-4" /> Create Coupon
                </Button>
              </div>

              <div className="divide-y divide-line rounded-2xl border border-line bg-white shadow-card overflow-hidden">
                {discounts.map((d) => (
                  <div key={d.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-mono font-bold text-base text-pitch bg-pitch/10 px-2.5 py-1 rounded-lg">
                        {d.code}
                      </span>
                      <p className="text-xs text-ink-soft mt-1.5">
                        {d.discount_type === 'percentage' ? `${d.discount_value}% off` : `₹${d.discount_value} flat off`} · Min order: ₹{d.min_order_value}
                      </p>
                      <p className="text-[11px] text-ink-faint">Redeemed: {d.used_count}/{d.usage_limit} times</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={d.active ? 'pitch' : 'neutral'}>{d.active ? 'Active' : 'Disabled'}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleDiscount(d.id)}>
                        {d.active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Payments & Refunds Tab */}
          {tab === 'payments' && (
            <div className="space-y-4">
              <h3 className="font-display font-bold text-lg text-ink">Platform Payments ({payments.length})</h3>
              <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
                <table className="w-full text-xs text-left">
                  <thead className="bg-paper border-b border-line text-ink-soft uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Order / Payment ID</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Fee Breakdown</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-paper/50">
                        <td className="p-3 font-mono">
                          <p className="font-semibold text-ink">{p.order_id}</p>
                          <p className="text-ink-faint text-[10px]">{p.payment_id || '—'}</p>
                        </td>
                        <td className="p-3 text-ink-soft">{p.user_id}</td>
                        <td className="p-3 text-ink-soft">
                          ₹{p.tournament_fee} - ₹{p.discount_amount} + ₹{p.convenience_fee} + ₹{p.tax_amount} tax
                        </td>
                        <td className="p-3 font-bold text-pitch">₹{p.total_amount}</td>
                        <td className="p-3">
                          <Badge tone={p.status === 'successful' ? 'pitch' : p.status === 'refunded' ? 'ember' : 'neutral'}>
                            {p.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {p.status === 'successful' && (
                            <Button variant="ghost" size="sm" onClick={() => handleRefund(p.id)}>
                              <RotateCcw className="w-3 h-3" /> Refund
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Announcements Tab */}
          {tab === 'announcements' && (
            <div className="space-y-4 max-w-xl">
              <h3 className="font-display font-bold text-lg text-ink">Broadcast Tournament Announcement</h3>
              <p className="text-xs text-ink-soft">
                Sends a priority notification to athletes matching the tournament's sport and location.
              </p>
              <form onSubmit={handleSendAnnouncement} className="rounded-2xl border border-line bg-white p-5 shadow-card space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-ink-soft uppercase block mb-1">Target Tournament ID</label>
                  <input
                    type="text"
                    value={annForm.tournamentId}
                    onChange={(e) => setAnnForm({ ...annForm, tournamentId: e.target.value })}
                    placeholder="e.g. tourn-1"
                    className="w-full px-3 py-2 rounded-xl border border-line bg-paper text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink-soft uppercase block mb-1">Notification Title</label>
                  <input
                    type="text"
                    value={annForm.title}
                    onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                    placeholder="🏆 Registration Closing Tomorrow!"
                    className="w-full px-3 py-2 rounded-xl border border-line bg-paper text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink-soft uppercase block mb-1">Announcement Body</label>
                  <textarea
                    rows={3}
                    value={annForm.message}
                    onChange={(e) => setAnnForm({ ...annForm, message: e.target.value })}
                    placeholder="Only 4 spots remaining for the Hyderabad 7v7 Tournament..."
                    className="w-full px-3 py-2 rounded-xl border border-line bg-paper text-xs"
                    required
                  />
                </div>
                <Button type="submit" variant="volt" className="w-full">
                  <Megaphone className="w-4 h-4" /> Broadcast Announcement
                </Button>
              </form>
            </div>
          )}

          {/* 5. Reports Tab */}
          {tab === 'reports' && (
            <div className="space-y-4">
              <h3 className="font-display font-bold text-lg text-ink">Safety & Reported Content ({reports.length})</h3>
              {reports.length === 0 ? (
                <div className="text-center py-12 text-ink-soft">No pending reports! Community is running safely.</div>
              ) : (
                <div className="space-y-3">
                  {reports.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-line bg-white p-4 shadow-card flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge tone="ember">{r.target_type.toUpperCase()} REPORT</Badge>
                          <span className="text-xs text-ink-faint">Reported by {r.reporter_id}</span>
                        </div>
                        <p className="font-bold text-sm text-ink mt-1">Reason: {r.reason}</p>
                        {r.details && <p className="text-xs text-ink-soft mt-0.5">“{r.details}”</p>}
                        <p className="text-[10px] text-ink-faint mt-1">Target ID: {r.reported_id}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.status === 'pending' ? (
                          <Button variant="volt" size="sm" onClick={() => handleResolveReport(r.id)}>
                            <Check className="w-3.5 h-3.5" /> Resolve
                          </Button>
                        ) : (
                          <Badge tone="neutral">Resolved</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tournament Modal */}
      {tournModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
          <form onSubmit={handleCreateTournament} className="relative w-full max-w-lg bg-white rounded-3xl p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-xl text-ink">Create New Tournament</h3>
            <input
              placeholder="Tournament Title"
              value={tournForm.title}
              onChange={(e) => setTournForm({ ...tournForm, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-line text-xs"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={tournForm.sport_id}
                onChange={(e) => setTournForm({ ...tournForm, sport_id: e.target.value })}
                className="px-3 py-2 rounded-xl border border-line text-xs"
              >
                {['football', 'cricket', 'badminton', 'chess', 'athletics'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                type="number"
                placeholder="Entry Fee (₹)"
                value={tournForm.entry_fee}
                onChange={(e) => setTournForm({ ...tournForm, entry_fee: Number(e.target.value) })}
                className="px-3 py-2 rounded-xl border border-line text-xs"
                required
              />
            </div>
            <input
              placeholder="Venue"
              value={tournForm.venue}
              onChange={(e) => setTournForm({ ...tournForm, venue: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-line text-xs"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Starts At (e.g. Saturday 9 AM)"
                value={tournForm.starts_at}
                onChange={(e) => setTournForm({ ...tournForm, starts_at: e.target.value })}
                className="px-3 py-2 rounded-xl border border-line text-xs"
                required
              />
              <input
                placeholder="Deadline (e.g. Friday 6 PM)"
                value={tournForm.registration_deadline}
                onChange={(e) => setTournForm({ ...tournForm, registration_deadline: e.target.value })}
                className="px-3 py-2 rounded-xl border border-line text-xs"
                required
              />
            </div>
            <textarea
              placeholder="Tournament description"
              value={tournForm.description}
              onChange={(e) => setTournForm({ ...tournForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-line text-xs"
              rows={3}
            />
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setTournModal(false)}>Cancel</Button>
              <Button type="submit" variant="volt" className="flex-1">Create Tournament</Button>
            </div>
          </form>
        </div>
      )}

      {/* Discount Modal */}
      {discModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
          <form onSubmit={handleCreateDiscount} className="relative w-full max-w-md bg-white rounded-3xl p-6 space-y-3">
            <h3 className="font-display font-bold text-xl text-ink">Create Discount Code</h3>
            <input
              placeholder="COUPON CODE (e.g. FESTIVAL100)"
              value={discForm.code}
              onChange={(e) => setDiscForm({ ...discForm, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 rounded-xl border border-line font-mono text-xs uppercase"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={discForm.discount_type}
                onChange={(e) => setDiscForm({ ...discForm, discount_type: e.target.value })}
                className="px-3 py-2 rounded-xl border border-line text-xs"
              >
                <option value="fixed">Fixed (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
              <input
                type="number"
                placeholder="Value"
                value={discForm.discount_value}
                onChange={(e) => setDiscForm({ ...discForm, discount_value: Number(e.target.value) })}
                className="px-3 py-2 rounded-xl border border-line text-xs"
                required
              />
            </div>
            <input
              type="number"
              placeholder="Minimum Order Value (₹)"
              value={discForm.min_order_value}
              onChange={(e) => setDiscForm({ ...discForm, min_order_value: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-line text-xs"
            />
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setDiscModal(false)}>Cancel</Button>
              <Button type="submit" variant="volt" className="flex-1">Save Campaign</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
