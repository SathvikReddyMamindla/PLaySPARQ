import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { api } from '../lib/api';

function Field({ label, icon: Icon, ...props }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-soft uppercase tracking-wide">{label}</span>
      <div className="relative mt-1.5">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
        <input {...props} className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-line bg-white focus:outline-none focus:ring-2 focus:ring-volt" />
      </div>
    </label>
  );
}

export function JoinModal({ open, onClose, onToast }) {
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const { login, register, demo } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      if (mode === 'signup') await register(form.email, form.password, form.displayName || 'Player');
      else await login(form.email, form.password);
      onToast(`Welcome ${form.displayName || 'athlete'}! Let's build your profile.`);
      onClose();
      navigate('/app');
    } catch (e2) {
      setErr(e2.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const doDemo = async () => {
    setLoading(true); setErr('');
    try { await demo(); onToast('Signed in as Demo Player'); onClose(); navigate('/app'); }
    catch (e2) { setErr(e2.message); } finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 16 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-pitch overflow-hidden">
            <div className="bg-ink px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-volt text-volt-ink"><Sparkles className="w-5 h-5" /></div>
                <div>
                  <p className="font-display font-bold text-lg leading-tight">Join SportSphere</p>
                  <p className="text-white/60 text-xs">AI-powered athlete network</p>
                </div>
              </div>
              <button onClick={onClose} className="text-white/60 hover:text-white p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-paper border border-line mb-5">
                {[['signup', 'Sign up'], ['login', 'Log in']].map(([k, l]) => (
                  <button key={k} onClick={() => setMode(k)} className={`rounded-lg py-2 text-sm font-semibold transition-colors ${mode === k ? 'bg-ink text-white shadow' : 'text-ink-soft'}`}>{l}</button>
                ))}
              </div>

              <form onSubmit={submit} className="space-y-3">
                {mode === 'signup' && <Field label="Name" icon={User} type="text" placeholder="Ananya Deshmukh" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />}
                <Field label="Email" icon={Mail} type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <Field label="Password" icon={Lock} type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                {err && <p className="text-sm text-ember">{err}</p>}
                <Button type="submit" variant="volt" size="md" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'signup' ? 'Create account' : 'Log in'}
                </Button>
              </form>

              <div className="my-4 flex items-center gap-3 text-xs text-ink-faint"><span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" /></div>
              <Button variant="ember" size="md" className="w-full" onClick={doDemo} disabled={loading}>
                <Sparkles className="w-4 h-4" /> Continue as Demo Player
              </Button>
              <p className="mt-3 text-center text-xs text-ink-faint">Demo mode explores the app without creating anything.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function EventsModal({ open, onClose, onToast }) {
  const [form, setForm] = useState({ title: '', sport_id: 'football', starts_at: '', venue: '', capacity: 10 });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createEvent({ ...form, title: form.title || 'Pickup Game', capacity: Number(form.capacity) || 10, description: 'Created from the landing page.' });
      onToast('Event created 🎉'); onClose();
    } catch (e2) { onToast('Could not create event yet — log in first.'); onClose(); }
    finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-pitch overflow-hidden">
            <div className="bg-ink px-6 py-5 flex items-center justify-between text-white">
              <p className="font-display font-bold text-lg">Create an event</p>
              <button onClick={onClose} className="text-white/60 hover:text-white p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-3">
              <Field2 label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Friday 7v7 Turf" />
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Sport</span>
                  <select value={form.sport_id} onChange={(e) => setForm({ ...form, sport_id: e.target.value })} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-line bg-white focus:ring-2 focus:ring-volt">
                    {['football','cricket','badminton','basketball','swimming','tennis','athletics','chess'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block"><span className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Capacity</span>
                  <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-line bg-white focus:ring-2 focus:ring-volt" />
                </label>
              </div>
              <Field2 label="When" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} placeholder="Saturday 6:30 PM" />
              <Field2 label="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="AstroPark, Madhapur" />
              <Button type="submit" variant="volt" className="w-full" disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create event'}</Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field2({ label, ...props }) {
  return <label className="block"><span className="text-xs font-semibold text-ink-soft uppercase tracking-wide">{label}</span>
    <input {...props} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-line bg-white focus:outline-none focus:ring-2 focus:ring-volt" /></label>;
}

export function Toast({ message, onClose }) {
  useEffect(() => { if (message) { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); } }, [message, onClose]);
  return (
    <AnimatePresence>
      {message && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 bg-ink text-white px-4 py-3 rounded-2xl shadow-pitch">
          <CheckCircle2 className="w-5 h-5 text-volt" /> <span className="text-sm font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Re-export for convenience
export { Field };
