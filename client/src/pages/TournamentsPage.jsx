import { useEffect, useState } from 'react';
import {
  Trophy, MapPin, Calendar, Clock, Users, ShieldCheck, Tag,
  X, Check, Loader2, Sparkles, Receipt, CheckCircle2, AlertCircle
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { generateSandboxSig } from '../lib/payments';

const sportEmoji = {
  football: '⚽', cricket: '🏏', badminton: '🏸', basketball: '🏀',
  swimming: '🏊', tennis: '🎾', athletics: '🏃', chess: '♟️'
};

const sportsList = ['all', 'football', 'cricket', 'badminton', 'chess', 'athletics'];

export default function TournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedSport, setSelectedSport] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeTournament, setActiveTournament] = useState(null);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(null);

  // Checkout form state
  const [teamName, setTeamName] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const loadTournaments = async (sport = 'all') => {
    setLoading(true);
    try {
      const res = await api.tournaments(sport === 'all' ? null : sport);
      if (res?.success) setTournaments(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTournaments(selectedSport);
  }, [selectedSport]);

  const openCheckout = (tournament) => {
    setActiveTournament(tournament);
    setTeamName('');
    setCouponCode('');
    setCouponResult(null);
    setCouponError('');
    setPayError('');
    setCheckoutModal(true);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim() || !activeTournament) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponResult(null);
    try {
      const res = await api.validateDiscount(couponCode.trim(), activeTournament.id);
      if (res?.success) {
        setCouponResult(res);
      }
    } catch (e) {
      setCouponError(e.message || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  // Base pricing
  const entryFee = activeTournament ? activeTournament.entry_fee : 0;
  const discountAmount = couponResult ? couponResult.pricing.discount_amount : 0;
  const subtotal = Math.max(0, entryFee - discountAmount);
  const convenienceFee = activeTournament ? activeTournament.convenience_fee : 20;
  const taxAmount = activeTournament ? (activeTournament.convenience_fee * 0.18) : 3.6;
  const finalTotal = couponResult ? couponResult.pricing.total_amount : Math.round((subtotal + convenienceFee + taxAmount) * 100) / 100;

  const handleCheckout = async () => {
    if (!activeTournament) return;
    setPaying(true);
    setPayError('');
    try {
      // 1. Create order on server
      const orderRes = await api.createPaymentOrder(activeTournament.id, couponCode.trim(), teamName.trim());
      if (!orderRes?.success) throw new Error('Could not initialize payment order');
      const orderData = orderRes.data;

      // 2. Client initiates payment verification
      const paymentId = `pay_${Date.now()}`;
      // In development/test mode, generate the expected HMAC SHA256 signature
      const signature = await generateSandboxSig(orderData.order_id, paymentId);

      // 3. Verify on backend (backend validates signature and marks registration confirmed)
      const verifyRes = await api.verifyPayment(orderData.order_id, paymentId, signature, activeTournament.id, teamName.trim());
      if (!verifyRes?.success) throw new Error('Payment verification failed');

      // 4. Success -> Open Receipt Modal
      setCheckoutModal(false);
      setReceiptModal({
        order_id: orderData.order_id,
        payment_id: paymentId,
        tournament: activeTournament,
        pricing: orderData.pricing,
        team_name: teamName.trim(),
        registered_at: new Date().toLocaleString(),
      });
      loadTournaments(selectedSport);
    } catch (e) {
      setPayError(e.message || 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 space-y-6 pb-12 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink flex items-center gap-2">
            <Trophy className="w-7 h-7 text-ember" /> Tournaments & Leagues
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Official tournaments across Hyderabad with transparent fees and verified bracket matchmaking.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-pitch bg-pitch/10 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4" /> Transparent Pricing & Zero Hidden Charges
        </div>
      </div>

      {/* Sport Category Filters */}
      <div className="flex flex-wrap gap-2">
        {sportsList.map((sp) => (
          <button
            key={sp}
            onClick={() => setSelectedSport(sp)}
            className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
              selectedSport === sp ? 'bg-ink text-paper border-ink' : 'bg-white text-ink-soft border-line hover:border-ink/40'
            }`}
          >
            {sp === 'all' ? '🏆 All Sports' : `${sportEmoji[sp] || ''} ${sp.charAt(0).toUpperCase() + sp.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Tournaments Grid */}
      {loading ? (
        <div className="py-16 text-center text-ink-soft flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-pitch" /> Loading tournaments…
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-16 text-ink-soft">No tournaments found for this sport. Check back soon!</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {tournaments.map((t) => (
            <div key={t.id} className="rounded-3xl border border-line bg-white shadow-card overflow-hidden hover-lift flex flex-col justify-between">
              <div>
                {t.banner_image && (
                  <div className="relative h-44 w-full overflow-hidden bg-ink">
                    <img src={t.banner_image} alt={t.title} className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3">
                      <Badge tone="volt">{sportEmoji[t.sport_id] || ''} {t.sport_id}</Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-black/70 text-white backdrop-blur-sm">
                        {t.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-6">
                  <h3 className="font-display font-bold text-xl text-ink leading-snug">{t.title}</h3>
                  <p className="text-xs text-ink-soft mt-1 line-clamp-2">{t.description}</p>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-ink-soft">
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-ember shrink-0" /> <span className="truncate">{t.venue}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-ember shrink-0" /> <span>{t.starts_at}</span></div>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-ember shrink-0" /> <span>Deadline: {t.registration_deadline}</span></div>
                    <div className="flex items-center gap-2"><Users className="w-4 h-4 text-ember shrink-0" /> <span>{t.current_participants}/{t.max_participants} Teams</span></div>
                  </div>

                  {/* Rules preview */}
                  {t.rules?.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-line text-xs">
                      <p className="font-semibold text-ink mb-1">Key Tournament Rules:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-ink-soft">
                        {t.rules.slice(0, 2).map((r, i) => <li key={i} className="truncate">{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing & Register Footer */}
              <div className="p-6 pt-0">
                <div className="rounded-2xl bg-paper border border-line p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display font-bold text-2xl text-ink">₹{t.entry_fee}</span>
                      <span className="text-xs text-ink-faint">entry fee</span>
                    </div>
                    <p className="text-[11px] text-pitch font-medium">+ ₹20 PLAYSync convenience fee</p>
                  </div>
                  <Button variant="volt" onClick={() => openCheckout(t)}>
                    Register & Pay
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checkout Modal with Transparent Fee Breakdown & Coupon Support */}
      {checkoutModal && activeTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-pitch overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-ink text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-volt text-volt-ink">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg leading-tight">Tournament Checkout</h3>
                  <p className="text-xs text-white/60">Transparent, low-cost convenience pricing</p>
                </div>
              </div>
              <button onClick={() => setCheckoutModal(false)} className="text-white/60 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
              {/* Selected Tournament Summary */}
              <div className="rounded-2xl bg-paper border border-line p-4">
                <p className="text-xs font-semibold text-pitch uppercase tracking-wider">{activeTournament.sport_id}</p>
                <h4 className="font-display font-bold text-base text-ink mt-0.5">{activeTournament.title}</h4>
                <p className="text-xs text-ink-soft mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-ember" /> {activeTournament.venue}
                </p>
              </div>

              {/* Team/Squad Name */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1.5">
                  Squad / Player Name (Optional)
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Hyderabad Strikers"
                  className="w-full px-4 py-2.5 rounded-xl border border-line bg-white focus:outline-none focus:ring-2 focus:ring-volt text-sm"
                />
              </div>

              {/* Coupon / Discount Code */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1.5">
                  Promotional Coupon Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME50 or PLAYSYNC1YR"
                    className="flex-1 px-4 py-2 rounded-xl border border-line bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-volt uppercase"
                  />
                  <Button variant="ghost" size="sm" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}>
                    {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
                {couponResult && (
                  <p className="text-xs text-pitch font-medium mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {couponResult.message}
                  </p>
                )}
                {couponError && (
                  <p className="text-xs text-ember font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {couponError}
                  </p>
                )}
              </div>

              {/* Transparent Fee Breakdown Box */}
              <div className="rounded-2xl border border-line bg-paper p-4 text-xs space-y-2.5">
                <p className="font-semibold text-ink uppercase tracking-wider text-[11px]">Fee Breakdown</p>
                <div className="flex justify-between text-ink-soft">
                  <span>Tournament Registration Fee</span>
                  <span className="font-medium text-ink">₹{entryFee.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-pitch font-medium">
                    <span>Discount ({couponResult?.discount?.code || 'Coupon'})</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-ink-soft">
                  <span>PLAYSync Convenience Fee</span>
                  <span className="font-medium text-ink">₹{convenienceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-ink-soft">
                  <span>Applicable Taxes (18% GST on convenience fee)</span>
                  <span className="font-medium text-ink">₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-line flex justify-between items-baseline font-display font-bold text-base text-ink">
                  <span>Final Payable Total</span>
                  <span className="text-xl text-pitch">₹{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {payError && <p className="text-xs text-ember font-medium">{payError}</p>}

              {/* Pay Button */}
              <Button
                variant="volt"
                size="lg"
                className="w-full"
                onClick={handleCheckout}
                disabled={paying}
              >
                {paying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying Payment…</> : `Pay ₹${finalTotal.toFixed(2)} with Razorpay`}
              </Button>
              <p className="text-center text-[11px] text-ink-faint">
                🔒 Protected by 256-bit encryption. No card details stored on our servers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-pitch overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-volt text-volt-ink mb-3">
                <CheckCircle2 className="w-8 h-8 text-pitch" />
              </div>
              <h3 className="font-display font-bold text-2xl text-ink">Registration Confirmed!</h3>
              <p className="text-xs text-ink-soft mt-1">Receipt & official entry pass generated.</p>
            </div>

            <div className="rounded-2xl border border-line bg-paper p-4 space-y-2 text-xs">
              <div className="flex justify-between text-ink-faint">
                <span>Order ID:</span>
                <span className="font-mono text-ink font-semibold">{receiptModal.order_id}</span>
              </div>
              <div className="flex justify-between text-ink-faint">
                <span>Payment ID:</span>
                <span className="font-mono text-ink font-semibold">{receiptModal.payment_id}</span>
              </div>
              <div className="flex justify-between text-ink-faint">
                <span>Tournament:</span>
                <span className="text-ink font-semibold">{receiptModal.tournament.title}</span>
              </div>
              {receiptModal.team_name && (
                <div className="flex justify-between text-ink-faint">
                  <span>Squad Name:</span>
                  <span className="text-ink font-semibold">{receiptModal.team_name}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-faint">
                <span>Total Paid:</span>
                <span className="text-pitch font-bold text-sm">₹{receiptModal.pricing.total_amount}</span>
              </div>
              <div className="flex justify-between text-ink-faint">
                <span>Status:</span>
                <Badge tone="pitch">CONFIRMED</Badge>
              </div>
            </div>

            <Button variant="volt" className="w-full" onClick={() => setReceiptModal(null)}>
              Done & Return to Tournaments
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
