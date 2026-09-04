import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Compass, Users, MessageSquare, Calendar, User, LogOut, Sparkles, Activity, Wallet, Globe, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Toast } from './Modals';

const tabs = [
  { to: '/app/discover', label: 'Discover', icon: Compass },
  { to: '/app/connections', label: 'Connect', icon: Users, badgeKey: 'connect' },
  { to: '/app/community', label: 'Community', icon: Globe },
  { to: '/app/chat', label: 'Chat', icon: MessageSquare, badgeKey: 'chat' },
  { to: '/app/events', label: 'Events', icon: Calendar },
  { to: '/app/my-events', label: 'My Events', icon: Wallet },
  { to: '/app/profile', label: 'Profile', icon: User },
];

export default function AppShell() {
  const { user, profile, logout } = useAuth();
  const [toast, setToast] = useState('');
  const [unreadChat, setUnreadChat] = useState(0);
  const [pendingReqs, setPendingReqs] = useState(0);
  const [seenMsgIds, setSeenMsgIds] = useState(new Set());
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await api.notifications();
        if (!active || !res?.data) return;
        const { unread_messages = [], pending_requests = [] } = res.data;
        setUnreadChat(unread_messages.length);
        setPendingReqs(pending_requests.length);

        if (unread_messages.length > 0) {
          const newest = unread_messages[0];
          setSeenMsgIds((prev) => {
            if (!prev.has(newest.id)) {
              if (!loc.pathname.includes(newest.conversation_id)) {
                setToast(`💬 ${newest.sender_name}: "${newest.body.slice(0, 45)}"`);
              }
              const next = new Set(prev);
              next.add(newest.id);
              return next;
            }
            return prev;
          });
        }
      } catch (e) {}
    };

    poll();
    const timer = setInterval(poll, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [loc.pathname]);

  const getBadgeCount = (key) => {
    if (key === 'chat') return unreadChat;
    if (key === 'connect') return pendingReqs;
    return 0;
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      {/* top bar */}
      <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-xl border-b border-line">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-ink text-volt"><Activity className="w-5 h-5" /></div>
            <span className="font-display font-bold text-lg hidden sm:block">Spar<span className="text-ember">q</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-ink-faint hidden md:block">{user?.user?.display_name || profile?.name || 'Player'}</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-pitch bg-volt/20 rounded-full px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Powered By featherless.ai
            </span>
            <button onClick={async () => { await logout(); navigate('/'); }} className="text-ink-soft hover:text-ink p-2" title="Log out"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
        {/* mobile top tabs */}
        <nav className="md:hidden flex justify-around border-t border-line overflow-x-auto">
          {tabs.map((t) => {
            const count = getBadgeCount(t.badgeKey);
            return (
              <NavLink key={t.to} to={t.to} className={({ isActive }) => `relative flex flex-col items-center gap-0.5 py-2 px-2.5 text-[10px] font-medium shrink-0 ${isActive ? 'text-pitch font-bold' : 'text-ink-faint'}`}>
                <div className="relative">
                  <t.icon className="w-5 h-5" />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-2 bg-ember text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                      {count}
                    </span>
                  )}
                </div>
                {t.label}
              </NavLink>
            );
          })}
        </nav>
      </header>

      <div className="max-w-6xl mx-auto flex">
        {/* desktop sidebar */}
        <aside className="hidden md:block w-56 shrink-0 py-6 pr-6">
          <nav className="space-y-1 sticky top-20">
            {tabs.map((t) => {
              const count = getBadgeCount(t.badgeKey);
              return (
                <NavLink key={t.to} to={t.to} className={({ isActive }) => `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-ink text-paper shadow-card' : 'text-ink-soft hover:bg-white hover:text-ink'}`}>
                  <div className="flex items-center gap-3">
                    <t.icon className="w-5 h-5" />
                    <span>{t.label}</span>
                  </div>
                  {count > 0 && (
                    <span className="bg-ember text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </NavLink>
              );
            })}
            <div className="pt-4 mt-4 border-t border-line">
              <p className="text-xs text-ink-faint mb-2">Why this matters</p>
              <p className="text-xs text-ink-soft leading-relaxed">Every match is ranked by a real scoring engine, then explained in plain language by the AI layer.</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-pitch bg-volt/25 rounded-lg px-2.5 py-1">
                <Sparkles className="w-3 h-3 text-pitch" /> Powered By featherless.ai
              </div>
            </div>
          </nav>
        </aside>

        <main className="flex-1 min-w-0 py-6 pb-20 md:pb-6">
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-line flex justify-around py-1.5 shadow-2xl">
        {tabs.map((t) => {
          const count = getBadgeCount(t.badgeKey);
          return (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => `relative flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${isActive ? 'text-pitch font-bold' : 'text-ink-faint'}`}>
              <div className="relative">
                <t.icon className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-2 bg-ember text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </div>
              {t.label}
            </NavLink>
          );
        })}
      </nav>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
