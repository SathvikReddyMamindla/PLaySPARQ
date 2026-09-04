import { useState, useEffect } from 'react';
import { Activity, Menu, X, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Navbar({ onOpenJoinModal }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Discover', href: '#discovery' },
    { label: 'Sports', href: '#sports' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Community', href: '#community' },
    { label: 'Architecture', href: '#architecture' },
  ];

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-paper/85 backdrop-blur-xl border-b border-line shadow-card py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ink text-volt shadow-card group-hover:shadow-volt transition-shadow">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl tracking-tight text-ink">
                Spar<span className="text-ember">q</span>
              </span>
              <span className="text-[10px] text-ink-faint font-medium tracking-widest uppercase -mt-1">
                Find your game
              </span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-1 bg-white/70 backdrop-blur p-1.5 rounded-full border border-line">
            {links.map((l) => (
              <a key={l.label} href={l.href} className="px-4 py-1.5 text-sm font-medium text-ink-soft hover:text-ink hover:bg-volt/20 rounded-full transition-all duration-200">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <button onClick={() => navigate('/app')} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-volt-ink bg-volt hover:bg-volt-soft rounded-full shadow-volt transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Sparkles className="w-4 h-4" /> Open App
              </button>
            ) : (
              <button onClick={onOpenJoinModal} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-volt-ink bg-volt hover:bg-volt-soft rounded-full shadow-volt transition-all hover:scale-[1.02] active:scale-[0.98]">
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            <button onClick={onOpenJoinModal} className="px-3 py-1.5 text-xs font-semibold text-volt-ink bg-volt rounded-full">
              Join
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-ink-soft hover:text-ink rounded-lg bg-white border border-line" aria-label="Toggle Menu">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-paper border-b border-line px-4 pt-3 pb-6 space-y-3 backdrop-blur-2xl">
          <div className="flex flex-col space-y-1">
            {links.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-base font-medium text-ink-soft hover:text-ink hover:bg-volt/10 rounded-lg transition-colors">
                {l.label}
              </a>
            ))}
          </div>
          <div className="pt-2 border-t border-line">
            <button onClick={() => { setMobileOpen(false); user ? navigate('/app') : onOpenJoinModal(); }} className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-volt-ink bg-volt rounded-xl shadow-volt">
              {user ? <Sparkles className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              {user ? 'Open App' : 'Create Athlete Profile'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
