import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, Settings, Trophy, Users,
  MessageSquare, Sparkles, Tag, Calendar, Info, Loader2, ArrowRight
} from 'lucide-react';
import { api } from '../lib/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const categoryIcons = {
  tournaments: Trophy,
  connections: Users,
  messages: MessageSquare,
  recommendations: Sparkles,
  discounts: Tag,
  events: Calendar,
  system: Info,
};

const categoryTabs = [
  { key: 'all', label: 'All' },
  { key: 'tournaments', label: 'Tournaments' },
  { key: 'connections', label: 'Connections' },
  { key: 'messages', label: 'Messages' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'discounts', label: 'Discounts' },
  { key: 'events', label: 'Events' },
  { key: 'system', label: 'System' },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [prefModal, setPrefModal] = useState(false);
  const [preferences, setPreferences] = useState({});
  const [savingPrefs, setSavingPrefs] = useState(false);

  const loadNotifications = async (cat = 'all') => {
    setLoading(true);
    try {
      const res = await api.notifications(cat === 'all' ? null : cat);
      if (res?.success) setNotifications(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const res = await api.notificationPreferences();
      if (res?.success) setPreferences(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadNotifications(activeTab);
  }, [activeTab]);

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (e) {}
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (e) {}
  };

  const savePreferences = async () => {
    setSavingPrefs(true);
    try {
      await api.updateNotificationPreferences(preferences);
      setPrefModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPrefs(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="px-4 sm:px-6 space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink flex items-center gap-2">
            <Bell className="w-7 h-7 text-pitch" /> Notification Center
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Stay on top of connection requests, matches, tournament reminders, and discounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4" /> Mark all read
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => { loadPreferences(); setPrefModal(true); }}>
            <Settings className="w-4 h-4" /> Preferences
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {categoryTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition-colors ${
              activeTab === t.key ? 'bg-ink text-paper border-ink' : 'bg-white text-ink-soft border-line hover:border-ink/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="py-16 text-center text-ink-soft flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-pitch" /> Loading notifications…
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-ink-soft">
          <Bell className="mx-auto w-10 h-10 mb-3 text-ink-faint" />
          No notifications in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const IconComponent = categoryIcons[n.category] || Info;
            return (
              <div
                key={n.id}
                className={`rounded-2xl border transition-colors p-4.5 sm:p-5 flex items-start justify-between gap-4 ${
                  n.is_read ? 'bg-white border-line' : 'bg-volt/10 border-volt/30 shadow-card'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                    n.is_read ? 'bg-paper text-ink-soft' : 'bg-ink text-volt'
                  }`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold text-sm truncate ${n.is_read ? 'text-ink' : 'text-ink font-bold'}`}>
                        {n.title}
                      </h3>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-ember shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">{n.message}</p>
                    {n.action_url && (
                      <button
                        onClick={() => { markRead(n.id); navigate(n.action_url); }}
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-pitch hover:underline"
                      >
                        View details <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => markRead(n.id)}
                    title="Mark as read"
                    className="text-ink-faint hover:text-pitch p-1 shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Preferences Modal */}
      {prefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-pitch overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-pitch" />
                <h3 className="font-display font-bold text-lg text-ink">Notification Preferences</h3>
              </div>
              <button onClick={() => setPrefModal(false)} className="text-ink-soft hover:text-ink">✕</button>
            </div>

            <p className="text-xs text-ink-soft">
              Customize which notifications you receive. We respect your attention and never spam.
            </p>

            <div className="space-y-3 divide-y divide-line text-xs">
              {[
                { key: 'tournament_alerts', label: 'Tournament Alerts', desc: 'New tournaments, deadline reminders, and bracket changes' },
                { key: 'connection_alerts', label: 'Connection Requests', desc: 'When athletes invite you to play or accept requests' },
                { key: 'recommendation_alerts', label: 'Match Recommendations', desc: 'High-compatibility player recommendations nearby' },
                { key: 'discount_alerts', label: 'Discounts & Promotions', desc: 'Exclusive tournament vouchers and entry fee campaigns' },
                { key: 'in_app_notifications', label: 'In-App Alerts', desc: 'Real-time banners inside the app' },
              ].map((pref) => (
                <label key={pref.key} className="pt-2.5 flex items-start justify-between cursor-pointer">
                  <div className="pr-4">
                    <p className="font-semibold text-ink">{pref.label}</p>
                    <p className="text-ink-soft mt-0.5">{pref.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!preferences[pref.key]}
                    onChange={(e) => setPreferences({ ...preferences, [pref.key]: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-line text-pitch focus:ring-volt"
                  />
                </label>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setPrefModal(false)}>Cancel</Button>
              <Button variant="volt" className="flex-1" onClick={savePreferences} disabled={savingPrefs}>
                {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
