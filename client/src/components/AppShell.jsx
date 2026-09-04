import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Compass, Trophy, Users, MessageSquare, Bell, User,
  LogOut, Sparkles, Activity, ShieldAlert
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Toast } from './Modals';

export default function AppShell() {
  const { user, profile, logout } = useAuth();
  const [toast, setToast] = useState('');
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();

  const fetchBadges = async () => {
    try {
      const res = await api.me();
      if (res?.success) {
        setUnreadMsgs(res.unread_messages || 0);
        setUnreadNotifs(res.unread_notifications || 0);
        if (res.user?.is_admin || res.user?.email === 'admin@sportsphere.dev') {
          setShowAdmin(true);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 8000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { to: '/app', end: true, label: 'Home', icon: Home },
    { to: '/app/discover', label: 'Discover', icon: Compass },
    { to: '/app/tournaments', label: 'Tournaments', icon: Trophy },
    { to: '/app/connections', label: 'Connect', icon: Users },
    { to: '/app/chat', label: 'Messages', icon: MessageSquare, badge: unreadMsgs },
    { to: '/app/notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
    { to: '/app/profile', label: 'Profile', icon: User },
  ];

  if (showAdmin || user?.user?.is_admin) {
    tabs.push({ to: '/app/admin', label: 'Admin', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-xl border-b border-line">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/app')}>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-ink text-volt shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg hidden sm:block">
              Sport<span className="text-pitch">Sphere</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-ink-faint hidden md:block">
              {profile?.name || user?.display_name || 'Player'}
            </span>

            {/* Notifications Shortcut */}
            <button
              onClick={() => navigate('/app/notifications')}
              className="relative p-2 text-ink-soft hover:text-ink transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-ember text-white text-[9px] font-bold">
                  {unreadNotifs}
                </span>
              )}
            </button>

            {/* AI Active Indicator */}
            <button
              onClick={() => navigate('/app')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-pitch bg-volt/20 rounded-full px-3 py-1.5 hover:bg-volt/30 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-volt-ink" /> AI Active
            </button>

            {/* Demo Admin Switcher for evaluation */}
            {!showAdmin && (
              <button
                onClick={() => setShowAdmin(true)}
                className="hidden lg:inline-flex text-[11px] text-ink-faint hover:text-pitch font-medium border border-line rounded-lg px-2 py-1"
                title="Toggle Admin View"
              >
                Enable Admin
              </button>
            )}

            {/* Logout */}
            <button
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="text-ink-soft hover:text-ink p-2 transition-colors"
              title="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <nav className="md:hidden flex justify-around border-t border-line overflow-x-auto py-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 py-1.5 px-2.5 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-pitch' : 'text-ink-faint'
                }`
              }
            >
              <t.icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.badge > 0 && (
                <span className="absolute top-0.5 right-1.5 w-3.5 h-3.5 rounded-full bg-ember text-white text-[8px] flex items-center justify-center font-bold">
                  {t.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      <div className="max-w-6xl mx-auto flex">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:block w-60 shrink-0 py-6 pr-6">
          <nav className="space-y-1.5 sticky top-20">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-medium transition-colors ${
                    isActive ? 'bg-ink text-paper shadow-card' : 'text-ink-soft hover:bg-white hover:text-ink'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <t.icon className="w-5 h-5" />
                  <span>{t.label}</span>
                </div>
                {t.badge > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-ember text-white text-[10px] font-bold">
                    {t.badge}
                  </span>
                )}
              </NavLink>
            ))}

            <div className="pt-5 mt-5 border-t border-line text-xs space-y-2">
              <p className="font-semibold text-ink uppercase tracking-wider text-[10px]">Transparent Sports Tech</p>
              <p className="text-ink-soft leading-relaxed">
                Hyperlocal matchmaking, verified tournaments, ₹20 convenience fees, and AI match explanations.
              </p>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 py-6">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
