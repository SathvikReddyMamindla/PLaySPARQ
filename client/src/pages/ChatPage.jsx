import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send, MessageSquare, Loader2, ArrowLeft, MoreVertical,
  ShieldAlert, Ban, Flag, Check, CheckCheck, Lock, AlertCircle
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import Button from '../components/ui/Button';

export default function ChatPage() {
  const { cid } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [convs, setConvs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or inappropriate behavior');
  const [reportDetails, setReportDetails] = useState('');
  const [toast, setToast] = useState('');
  const [fallbackOtherUser, setFallbackOtherUser] = useState(null);
  const bottomRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!cid) {
      setFallbackOtherUser(null);
      return;
    }
    const found = convs.find((c) => c.id === cid);
    if (!found && cid.includes('::')) {
      const otherId = cid.split('::').find((id) => id !== profile?.id);
      if (otherId) {
        api.athlete(otherId).then((res) => {
          if (res?.success && res.data) {
            setFallbackOtherUser({
              id: cid,
              with_id: otherId,
              with_name: res.data.name,
              with_avatar: res.data.avatar,
              is_connected: res.data.is_connected,
              is_blocked: res.data.is_blocked,
            });
          }
        }).catch(() => {});
      }
    } else {
      setFallbackOtherUser(null);
    }
  }, [cid, convs, profile?.id]);

  const activeConv = convs.find((c) => c.id === cid) || fallbackOtherUser;

  const loadConvs = async () => {
    try {
      const r = await api.conversations();
      setConvs(r?.data || []);
    } catch (e) {}
  };

  const loadMsgs = async (id) => {
    try {
      const r = await api.messages(id);
      setMessages(r?.messages || []);
      // Mark read
      await api.markRead(id);
      loadConvs();
    } catch (e) {
      setMessages([]);
    }
  };

  useEffect(() => {
    loadConvs();
  }, []);

  useEffect(() => {
    if (cid) {
      loadMsgs(cid);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [cid]);

  // Real-time WebSocket connection with fallback polling
  useEffect(() => {
    if (!profile?.id) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // When proxied by Vite dev server, route to backend directly on 8000 if in dev
    const host = window.location.port === '5173' ? `${window.location.hostname}:8000` : window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/ws/chat/${profile.id}`;

    let socket;
    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'chat_message') {
            const newMsg = payload.data;
            if (cid && newMsg.conversation_id === cid) {
              setMessages((prev) => [...prev, newMsg]);
              api.markRead(cid);
            }
            loadConvs();
          } else if (payload.type === 'messages_read' && payload.conversation_id === cid) {
            setMessages((prev) => prev.map((m) => ({ ...m, is_read: 1 })));
          }
        } catch (e) {}
      };
    } catch (err) {
      console.warn('WebSocket init failed, using REST fallback:', err);
    }

    // Background interval fallback polling every 6 seconds
    const interval = setInterval(() => {
      if (cid) loadMsgs(cid);
      loadConvs();
    }, 6000);

    return () => {
      clearInterval(interval);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [profile?.id, cid]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const send = async () => {
    if (!draft.trim() || !cid || sending) return;
    setSending(true);
    try {
      const r = await api.sendMessage(cid, draft.trim());
      setMessages((m) => [...m, r.message]);
      setDraft('');
      loadConvs();
    } catch (e) {
      alert(e.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const handleBlockUser = async () => {
    if (!activeConv) return;
    if (!confirm(`Are you sure you want to block ${activeConv.with_name}? You will no longer be able to message each other.`)) return;
    try {
      await api.blockUser(activeConv.with_id);
      setToast(`${activeConv.with_name} blocked.`);
      setMenuOpen(false);
      loadConvs();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleReportUser = async (e) => {
    e.preventDefault();
    if (!activeConv) return;
    try {
      await api.reportUser(activeConv.with_id, reportReason, reportDetails);
      setReportModal(false);
      setReportDetails('');
      setMenuOpen(false);
      setToast('Report submitted. Our safety team will review it.');
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="px-4 sm:px-6 grid gap-6 lg:grid-cols-[280px_1fr] h-[calc(100vh-140px)]">
      {/* Conversation List */}
      <div className="hidden lg:flex flex-col border-r border-line pr-4 overflow-y-auto">
        <h1 className="font-display font-bold text-xl text-ink mb-4">Messages</h1>
        {loading && (
          <div className="flex items-center gap-2 text-ink-soft py-4">
            <Loader2 className="w-4 h-4 animate-spin text-pitch" /> Loading chats…
          </div>
        )}
        {!loading && convs.length === 0 && (
          <div className="rounded-2xl border border-line bg-paper p-4 text-xs text-ink-soft leading-relaxed">
            <MessageSquare className="w-6 h-6 text-ink-faint mb-2" />
            No conversations yet. Connect with athletes from the Discover or Connect tab to start chatting!
          </div>
        )}
        <div className="space-y-1">
          {convs.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/app/chat/${c.id}`)}
              className={`w-full flex items-center justify-between rounded-2xl px-3.5 py-3 text-left transition-colors ${
                cid === c.id ? 'bg-ink text-paper shadow-card' : 'hover:bg-white text-ink'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <img src={c.with_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-pitch border-2 border-white"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-sm truncate ${cid === c.id ? 'text-white' : 'text-ink'}`}>
                    {c.with_name}
                  </p>
                  <p className={`text-xs truncate mt-0.5 ${cid === c.id ? 'text-white/70' : 'text-ink-faint'}`}>
                    {c.last_message || 'Connected · Send a message'}
                  </p>
                </div>
              </div>
              {c.unread > 0 && (
                <span className="ml-2 flex items-center justify-center w-5 h-5 rounded-full bg-ember text-white text-[10px] font-bold shrink-0">
                  {c.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Message Thread View */}
      <div className="flex flex-col rounded-3xl border border-line bg-white shadow-card overflow-hidden">
        {!cid ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-3xl bg-volt/20 text-pitch mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="font-display font-bold text-xl text-ink">Select a conversation</h2>
            <p className="text-xs text-ink-soft mt-1.5 max-w-xs leading-relaxed">
              Message requests are strictly connection-based. Only accepted athlete connections appear in your chat inbox.
            </p>
          </div>
        ) : (
          <>
            {/* Conversation Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-white">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/app/chat')} className="lg:hidden text-ink-soft hover:text-ink">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <img
                    src={activeConv?.with_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-pitch border border-white"></span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-ink">{activeConv?.with_name || 'Athlete'}</p>
                  <p className="text-[11px] text-ink-faint flex items-center gap-1">
                    <span className="text-pitch font-medium">● Connected</span> · End-to-end verified
                  </p>
                </div>
              </div>

              {/* Action Menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="text-ink-soft hover:text-ink p-1.5 rounded-xl hover:bg-paper"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-1 w-44 rounded-2xl bg-white border border-line shadow-pitch p-1 z-20 text-xs">
                    <button
                      onClick={handleBlockUser}
                      className="w-full flex items-center gap-2 px-3 py-2 text-ember hover:bg-ember/10 rounded-xl transition-colors text-left font-medium"
                    >
                      <Ban className="w-4 h-4" /> Block Athlete
                    </button>
                    <button
                      onClick={() => { setReportModal(true); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-ink-soft hover:bg-paper rounded-xl transition-colors text-left"
                    >
                      <Flag className="w-4 h-4" /> Report Content
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-paper/60">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-xs text-ink-faint">
                  Connection established! Say hello to {activeConv?.with_name || 'your partner'} 👋
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === profile?.id || m.sender_id === 'ath-current-user';
                  const timeStr = m.created_at
                    ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                        isMine ? 'bg-ink text-paper rounded-br-none' : 'bg-white text-ink border border-line rounded-bl-none'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                        <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                          isMine ? 'text-white/60' : 'text-ink-faint'
                        }`}>
                          <span>{timeStr}</span>
                          {isMine && (
                            m.is_read ? <CheckCheck className="w-3 h-3 text-volt" /> : <Check className="w-3 h-3 text-white/50" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Message Input or Block/Rule banner */}
            {activeConv?.is_blocked ? (
              <div className="p-4 bg-ember/10 border-t border-ember/20 text-xs text-ember flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" /> You have blocked this user. Unblock from Safety settings to resume chat.
              </div>
            ) : activeConv && !activeConv.is_connected ? (
              <div className="p-4 bg-paper border-t border-line text-xs text-ink-soft flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-ink-faint" /> Messaging is enabled only after connection request acceptance.
              </div>
            ) : (
              <div className="p-3 sm:p-4 border-t border-line bg-white flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Type a message…"
                  className="flex-1 rounded-2xl border border-line bg-paper px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-volt"
                />
                <Button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  variant="volt"
                  className="rounded-2xl h-11 px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
          <form onSubmit={handleReportUser} className="relative w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-pitch animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-ember" />
              <h3 className="font-display font-bold text-lg text-ink">Report User or Content</h3>
            </div>
            <p className="text-xs text-ink-soft">
              Help us keep SportSphere respectful and safe. All reports are immediately sent to moderation.
            </p>
            <div>
              <label className="text-xs font-semibold text-ink-soft block mb-1">Reason</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-line text-xs bg-paper"
              >
                <option value="Spam or inappropriate behavior">Spam or advertising</option>
                <option value="Harassment or rude messages">Harassment or abusive language</option>
                <option value="Match no-show without notice">Repeated match no-show</option>
                <option value="Impersonation or fake athlete profile">Fake profile / Impersonation</option>
                <option value="Other safety violation">Other safety violation</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft block mb-1">Details (Optional)</label>
              <textarea
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe what occurred…"
                className="w-full px-3 py-2 rounded-xl border border-line text-xs bg-paper"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setReportModal(false)}>Cancel</Button>
              <Button type="submit" variant="volt" className="flex-1">Submit Report</Button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white px-4 py-2.5 rounded-2xl shadow-pitch text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-volt" /> {toast}
        </div>
      )}
    </div>
  );
}
