import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Check, X, MessageSquare, Loader2, Inbox, UserCheck, Users } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { api } from '../lib/api';

const SPORT = { football: '⚽', cricket: '🏏', badminton: '🏸', basketball: '🏀', swimming: '🏊', tennis: '🎾', athletics: '🏃', chess: '♟️' };
const skillLabel = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');

export default function ConnectionsPage() {
  const navigate = useNavigate();
  const [cons, setCons] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('friends');

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.connections();
      setCons(res?.data?.connections || []);
      setFriends(res?.data?.friends || []);
    } catch (e) {} finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    load(true);
    const interval = setInterval(() => {
      load(false);
    }, 3000);
    return () => clearInterval(interval);
  }, []);


  const respond = async (cid, accept) => {
    try {
      await api.respondConnection(cid, accept);
      await load();
      if (accept) {
        setTab('friends');
      }
    } catch (e) {
      console.error('Failed to respond to connection:', e);
    }
  };

  const pending = cons.filter((c) => c.status === 'pending');

  return (
    <div className="px-4 sm:px-6">
      <h1 className="font-display font-bold text-2xl md:text-3xl text-ink">Connections</h1>
      <p className="text-sm text-ink-soft mt-1">Your friends (established connections) and incoming requests.</p>

      <div className="mt-5 flex gap-2">
        <button onClick={() => setTab('friends')} className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${tab === 'friends' ? 'bg-ink text-paper border-ink' : 'bg-white text-ink-soft border-line hover:border-ink/40'}`}>
          Friends ({friends.length})
        </button>
        <button onClick={() => setTab('requests')} className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${tab === 'requests' ? 'bg-ink text-paper border-ink' : 'bg-white text-ink-soft border-line hover:border-ink/40'}`}>
          Requests ({pending.length})
        </button>
      </div>

      <div className="mt-5">
        {loading && <div className="flex items-center gap-2 text-ink-soft"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

        {tab === 'friends' && (
          <div className="grid md:grid-cols-2 gap-4">
            {!loading && friends.length === 0 && (
              <div className="text-center py-16 text-ink-soft md:col-span-2"><Users className="mx-auto w-10 h-10 mb-3 text-ink-faint" />No friends yet. Connect with athletes from Discover — once accepted, they will appear right here!</div>
            )}
            {friends.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-card hover-lift">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={f.avatar} alt={f.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{f.name}</p>
                    <p className="text-xs text-ink-faint">{SPORT[f.sport] || '🎯'} {f.sport} · {skillLabel(f.skill_level)} · {f.neighborhood || f.city}</p>
                  </div>
                </div>
                <Button variant="volt" size="sm" onClick={() => navigate(f.conversation_id ? `/app/chat/${f.conversation_id}` : '/app/chat')}>
                  <MessageSquare className="w-4 h-4" /> Chat
                </Button>
              </div>
            ))}
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-3">
            {!loading && pending.length === 0 && (
              <div className="text-center py-16 text-ink-soft"><Inbox className="mx-auto w-10 h-10 mb-3 text-ink-faint" />No pending requests.</div>
            )}
            {pending.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-card hover-lift">
                <div className="flex items-center gap-3 min-w-0">
                  {c.other_avatar ? (
                    <img src={c.other_avatar} alt={c.other_name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="flex items-center justify-center w-11 h-11 rounded-full bg-pitch text-volt shrink-0"><UserCheck className="w-5 h-5" /></div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{c.other_name || 'Athlete'}</p>
                    <p className="text-xs text-ink-faint">{SPORT[c.sport_id] || '🎯'} {c.sport_id} · {c.is_incoming ? 'Sent you a connection request' : 'Connection request'}</p>
                    {c.message && <p className="text-xs text-ink-soft truncate mt-0.5">“{c.message}”</p>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="volt" size="sm" onClick={() => respond(c.id, true)}>
                    <Check className="w-4 h-4" /> Accept
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => respond(c.id, false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
