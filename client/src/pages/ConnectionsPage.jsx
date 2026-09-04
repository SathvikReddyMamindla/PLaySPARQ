import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Check, X, MessageSquare, Loader2, Inbox, UserCheck, Ban } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function ConnectionsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [cons, setCons] = useState([]);
  const [connectedIds, setConnectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('incoming'); // incoming | connected
  const [athletesMap, setAthletesMap] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.connections();
      setCons(res?.data?.connections || []);
      setConnectedIds(res?.data?.connected || []);

      const athRes = await api.athletes();
      if (athRes?.success) {
        const map = {};
        athRes.data.forEach((a) => { map[a.id] = a; });
        setAthletesMap(map);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const respond = async (cid, accept) => {
    await api.respondConnection(cid, accept);
    load();
  };

  const handleBlock = async (uid) => {
    if (!confirm('Block this athlete?')) return;
    await api.blockUser(uid);
    load();
  };

  const pending = cons.filter((c) => c.status === 'pending' && c.recipient_id === profile?.id);
  const connected = cons.filter((c) => c.status === 'accepted');

  return (
    <div className="px-4 sm:px-6 space-y-6 pb-12 max-w-4xl">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">Connections & Network</h1>
        <p className="text-sm text-ink-soft mt-1">
          Chat is unlocked only between confirmed, mutual connections.
        </p>
      </div>

      <div className="flex gap-2 border-b border-line pb-3">
        <button
          onClick={() => setTab('incoming')}
          className={`rounded-full px-4 py-2 text-xs font-semibold border transition-colors ${
            tab === 'incoming' ? 'bg-ink text-paper border-ink' : 'bg-white text-ink-soft border-line hover:border-ink/30'
          }`}
        >
          Incoming Requests ({pending.length})
        </button>
        <button
          onClick={() => setTab('connected')}
          className={`rounded-full px-4 py-2 text-xs font-semibold border transition-colors ${
            tab === 'connected' ? 'bg-ink text-paper border-ink' : 'bg-white text-ink-soft border-line hover:border-ink/30'
          }`}
        >
          Connected Athletes ({connected.length})
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-ink-soft flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-pitch" /> Loading connections…
        </div>
      ) : tab === 'incoming' ? (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="text-center py-16 text-ink-soft">
              <Inbox className="mx-auto w-10 h-10 mb-3 text-ink-faint" />
              No pending connection requests.<br />
              Browse the Discover tab to find athletes and match up!
            </div>
          ) : (
            pending.map((c) => {
              const sender = athletesMap[c.sender_id] || { name: 'Athlete', handle: `@${c.sender_id}` };
              return (
                <div key={c.id} className="rounded-2xl border border-line bg-white p-5 shadow-card flex flex-wrap items-center justify-between gap-4">
                  <div
                    className="flex items-center gap-3.5 min-w-0 cursor-pointer group"
                    onClick={() => navigate(`/app/profile/${c.sender_id}`)}
                    title="View athlete profile"
                  >
                    <img src={sender.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} alt="" className="w-12 h-12 rounded-full object-cover shrink-0 group-hover:opacity-90" />
                    <div className="min-w-0">
                      <p className="font-semibold text-base text-ink truncate group-hover:text-pitch transition-colors">{sender.name}</p>
                      <p className="text-xs text-ink-faint">{sender.handle} · {sender.neighborhood || 'Hyderabad'}</p>
                      {c.message && <p className="text-xs text-ink-soft mt-1 bg-paper px-2.5 py-1 rounded-lg">“{c.message}”</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="volt" size="sm" onClick={() => respond(c.id, true)}>
                      <Check className="w-4 h-4" /> Accept & Enable Chat
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => respond(c.id, false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {connected.length === 0 ? (
            <div className="text-center py-16 text-ink-soft">
              <UserCheck className="mx-auto w-10 h-10 mb-3 text-ink-faint" />
              No connected athletes yet.<br />
              Accept incoming requests or connect with players from Discover.
            </div>
          ) : (
            connected.map((c) => {
              const otherId = c.sender_id === profile?.id ? c.recipient_id : c.sender_id;
              const other = athletesMap[otherId] || { name: 'Athlete', handle: `@${otherId}` };
              const cid = [profile?.id, otherId].sort().join('::');
              return (
                <div key={c.id} className="rounded-2xl border border-line bg-white p-5 shadow-card flex flex-wrap items-center justify-between gap-4 volt-glow">
                  <div
                    className="flex items-center gap-3.5 min-w-0 cursor-pointer group"
                    onClick={() => navigate(`/app/profile/${otherId}`)}
                    title="View athlete profile"
                  >
                    <img src={other.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} alt="" className="w-12 h-12 rounded-full object-cover shrink-0 group-hover:opacity-90" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-base text-ink truncate group-hover:text-pitch transition-colors">{other.name}</p>
                        <Badge tone="pitch">Connected</Badge>
                      </div>
                      <p className="text-xs text-ink-faint">{other.handle} · {other.primary_sport || 'Multi-sport'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="volt" size="sm" onClick={() => navigate(`/app/chat/${cid}`)}>
                      <MessageSquare className="w-4 h-4" /> Message
                    </Button>
                    <button onClick={() => handleBlock(otherId)} title="Block" className="text-ink-faint hover:text-ember p-2">
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
