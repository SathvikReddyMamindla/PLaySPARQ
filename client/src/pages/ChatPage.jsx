import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, MessageSquare, Loader2, ArrowLeft, Check, CheckCheck, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

function formatTime(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const { cid } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [convs, setConvs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadConvs = useCallback(async () => {
    try {
      const r = await api.conversations();
      setConvs(r?.data || []);
    } catch (e) {}
  }, []);

  const loadMsgs = useCallback(async (id) => {
    if (!id) return;
    try {
      const r = await api.messages(id);
      setMessages(r?.messages || []);
      // Mark as read
      await api.markConversationRead(id);
    } catch (e) {
      setMessages([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadConvs().finally(() => setLoading(false));
  }, [loadConvs]);

  // When selected conversation changes
  useEffect(() => {
    if (cid) {
      loadMsgs(cid);
    } else {
      setMessages([]);
    }
  }, [cid, loadMsgs]);

  // Real-time polling every 2 seconds for live chatting across devices
  useEffect(() => {
    const interval = setInterval(() => {
      loadConvs();
      if (cid) {
        loadMsgs(cid);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [cid, loadConvs, loadMsgs]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const send = async () => {
    if (!draft.trim() || !cid) return;
    const text = draft.trim();
    setDraft('');
    setSending(true);
    try {
      const r = await api.sendMessage(cid, text);
      if (r?.message) {
        setMessages((prev) => [...prev, r.message]);
      }
      loadConvs();
    } catch (e) {
      console.error('Send message failed:', e);
    } finally {
      setSending(false);
    }
  };

  const activeConv = convs.find((c) => c.id === cid);
  const myId = profile?.id;

  return (
    <div className="px-4 sm:px-6 grid gap-6 lg:grid-cols-[280px_1fr] h-[calc(100vh-140px)]">
      {/* Conversation List: visible on desktop, or on mobile when no chat is selected */}
      <div className={`${cid ? 'hidden lg:block' : 'block'} border-r border-line pr-4 overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display font-bold text-xl text-ink">Direct Messages</h1>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-pitch" />}
        </div>

        {convs.length === 0 && !loading && (
          <div className="bg-white rounded-2xl border border-line p-5 text-center shadow-card">
            <MessageSquare className="w-8 h-8 text-ink-faint mx-auto mb-2" />
            <p className="text-sm font-semibold text-ink">No chats yet</p>
            <p className="text-xs text-ink-soft mt-1">
              Connect with athletes in Discover or accept pending requests to start chatting.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          {convs.map((c) => {
            const isSelected = cid === c.id;
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/app/chat/${c.id}`)}
                className={`w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-all ${
                  isSelected
                    ? 'bg-ink text-paper shadow-card'
                    : 'bg-white hover:bg-paper text-ink border border-line hover:border-ink/30'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={c.with_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                    alt={c.with_name}
                    className="w-11 h-11 rounded-full object-cover border border-line"
                  />
                  {c.unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-ember text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                      {c.unread}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`font-semibold text-sm truncate ${isSelected ? 'text-white' : 'text-ink'}`}>
                      {c.with_name}
                    </p>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-white/70' : 'text-ink-soft'}`}>
                    {c.last_message || 'Start chatting…'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Thread: visible on desktop, or on mobile when cid is active */}
      <div className={`${!cid ? 'hidden lg:flex' : 'flex'} flex-col rounded-3xl border border-line bg-white shadow-card overflow-hidden h-full`}>
        {!cid ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-volt/30 text-pitch flex items-center justify-center mb-3">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h2 className="font-display font-bold text-xl text-ink">Select an Athlete</h2>
            <p className="text-sm text-ink-soft mt-1 max-w-xs">
              Choose a conversation from the left to coordinate games, discuss tactics, and plan practice.
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-white shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/app/chat')}
                  className="lg:hidden p-1.5 rounded-xl hover:bg-paper text-ink transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <img
                  src={activeConv?.with_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-line"
                />
                <div>
                  <p className="font-semibold text-ink text-sm md:text-base">
                    {activeConv?.with_name || 'Athlete'}
                  </p>
                  <p className="text-[11px] text-pitch flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-volt inline-block"></span> Connected partner
                  </p>
                </div>
              </div>
            </div>

            {/* Message scroll area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-paper bg-paper-mesh">
              {messages.length === 0 && (
                <div className="text-center py-12 text-ink-soft text-sm">
                  <Sparkles className="w-6 h-6 text-ember mx-auto mb-1.5" />
                  Say hi to {activeConv?.with_name?.split(' ')[0] || 'your teammate'}! Break the ice and arrange your game.
                </div>
              )}

              {messages.map((m) => {
                // Correctly identify current user's messages
                const isMine = myId
                  ? m.sender_id === myId
                  : m.sender_id === 'ath-current-user';

                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMine && (
                      <img
                        src={activeConv?.with_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover mb-1 shrink-0"
                      />
                    )}
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                        isMine
                          ? 'bg-ink text-white rounded-br-none'
                          : 'bg-white text-ink border border-line rounded-bl-none'
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                      <div
                        className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                          isMine ? 'text-white/60' : 'text-ink-faint'
                        }`}
                      >
                        <span>{formatTime(m.created_at)}</span>
                        {isMine && <CheckCheck className="w-3 h-3 text-volt" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="p-3 md:p-4 border-t border-line bg-white flex items-center gap-2 shrink-0">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Type a message… (e.g. 'Are you free for badminton this Sunday?')"
                className="flex-1 rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-volt placeholder:text-ink-faint"
              />
              <button
                onClick={send}
                disabled={sending || !draft.trim()}
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-ink text-volt hover:bg-pitch hover:text-white transition-colors disabled:opacity-40 shadow-card shrink-0"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
