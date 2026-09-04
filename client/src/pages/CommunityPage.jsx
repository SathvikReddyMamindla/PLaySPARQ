import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Heart, MessageSquare, MapPin, Sparkles, Loader2, X, Send, Image as ImageIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const SPORTS = [
  { id: 'football', name: 'Football', emoji: '⚽' },
  { id: 'cricket', name: 'Cricket', emoji: '🏏' },
  { id: 'badminton', name: 'Badminton', emoji: '🏸' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'athletics', name: 'Athletics & Running', emoji: '🏃' },
  { id: 'swimming', name: 'Swimming', emoji: '🏊' },
  { id: 'tennis', name: 'Tennis', emoji: '🎾' },
  { id: 'chess', name: 'Chess', emoji: '♟️' },
];

export default function CommunityPage() {
  const { profile, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [sport, setSport] = useState('football');
  const [location, setLocation] = useState('');
  const [postImage, setPostImage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [likedPosts, setLikedPosts] = useState({});

  const loadPosts = async () => {
    try {
      const res = await api.communityPosts();
      setPosts(res?.data || []);
    } catch (e) {
      console.error('Failed to load community posts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    // Poll community every 6 seconds so live posts from other devices sync
    const interval = setInterval(loadPosts, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const sportObj = SPORTS.find((s) => s.id === sport) || SPORTS[0];
      const payload = {
        content: content.trim(),
        sport: sportObj.name,
        location: location.trim() || profile?.neighborhood || profile?.city || 'Hyderabad',
        postImage: postImage.trim() || undefined,
        badge: 'Community Update',
      };
      const res = await api.createCommunityPost(payload);
      if (res?.data) {
        setPosts((prev) => [res.data, ...prev]);
        setContent('');
        setLocation('');
        setPostImage('');
        setModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to publish post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId) => {
    if (likedPosts[postId]) return;
    setLikedPosts((prev) => ({ ...prev, [postId]: true }));
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likesCount: (p.likesCount || 0) + 1 } : p))
    );
    try {
      await api.likeCommunityPost(postId);
    } catch (e) {}
  };

  const filteredPosts = posts.filter((p) => {
    if (activeFilter === 'all') return true;
    return (p.sport || '').toLowerCase().includes(activeFilter.toLowerCase());
  });

  return (
    <div className="px-4 sm:px-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-ink">Community Feed</h1>
          <p className="text-sm text-ink-soft mt-1">
            Connect, share game highlights, and recruit teammates across the city.
          </p>
        </div>
        <Button variant="volt" onClick={() => setModalOpen(true)} className="shadow-card">
          <Plus className="w-4 h-4" /> Add Post
        </Button>
      </div>

      {/* Sport Category Pills */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveFilter('all')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition-colors shrink-0 ${
            activeFilter === 'all'
              ? 'bg-ink text-paper border-ink'
              : 'bg-white text-ink-soft border-line hover:border-ink/40'
          }`}
        >
          ✨ All Sports
        </button>
        {SPORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveFilter(s.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors shrink-0 ${
              activeFilter === s.id
                ? 'bg-ink text-paper border-ink'
                : 'bg-white text-ink-soft border-line hover:border-ink/40'
            }`}
          >
            {s.emoji} {s.name}
          </button>
        ))}
      </div>

      {/* Feed List */}
      <div className="mt-6 space-y-5">
        {loading && (
          <div className="flex items-center justify-center py-16 text-ink-soft gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-pitch" /> Loading community posts…
          </div>
        )}

        {!loading && filteredPosts.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-line p-8 shadow-card">
            <Sparkles className="w-10 h-10 text-volt mx-auto mb-3" />
            <h3 className="font-display font-bold text-lg text-ink">No posts yet</h3>
            <p className="text-sm text-ink-soft mt-1">
              Be the first athlete to share a game highlight or recruit players!
            </p>
            <Button variant="volt" size="sm" onClick={() => setModalOpen(true)} className="mt-4">
              <Plus className="w-4 h-4" /> Create First Post
            </Button>
          </div>
        )}

        {filteredPosts.map((post) => (
          <article
            key={post.id}
            className="rounded-3xl border border-line bg-white p-5 md:p-6 shadow-card hover-lift transition-all"
          >
            {/* Author row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={post.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                  alt={post.author}
                  className="w-12 h-12 rounded-2xl object-cover border border-line"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base text-ink">{post.author}</h3>
                    {post.badge && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-volt/30 text-pitch px-2 py-0.5 rounded-full">
                        {post.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-faint">
                    {post.handle} · {post.timestamp}
                  </p>
                </div>
              </div>
              <Badge tone="volt" size="sm">
                {post.sportEmoji || '🎯'} {post.sport}
              </Badge>
            </div>

            {/* Content body */}
            <p className="mt-4 text-ink text-sm md:text-base leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>

            {/* Optional image */}
            {post.postImage && (
              <div className="mt-4 rounded-2xl overflow-hidden border border-line max-h-96">
                <img src={post.postImage} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Location & engagement footer */}
            <div className="mt-5 pt-4 border-t border-line flex items-center justify-between text-xs text-ink-soft">
              <div className="flex items-center gap-1.5 text-ink-faint">
                <MapPin className="w-3.5 h-3.5 text-ember" />
                <span>{post.location}</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1.5 transition-colors font-medium ${
                    likedPosts[post.id] ? 'text-ember' : 'hover:text-ember'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${likedPosts[post.id] ? 'fill-ember text-ember' : ''}`}
                  />
                  <span>{post.likesCount || 0}</span>
                </button>
                <div className="flex items-center gap-1.5 text-ink-faint">
                  <MessageSquare className="w-4 h-4" />
                  <span>{post.commentsCount || 0}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Add Post Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-line shadow-2xl max-w-lg w-full p-6 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-xl text-ink flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-ember" /> Create Community Post
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-full text-ink-soft hover:bg-paper"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase tracking-wider">
                    Select Sport
                  </label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-volt"
                  >
                    {SPORTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.emoji} {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase tracking-wider">
                    What's happening?
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    placeholder="Recruiting players for Friday night turf? Looking for a badminton sparring buddy? Share here..."
                    className="w-full rounded-2xl border border-line bg-paper p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-volt placeholder:text-ink-faint resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase tracking-wider">
                    Location / Venue (Optional)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. AstroPark Arena, Madhapur"
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-volt"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase tracking-wider">
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={postImage}
                    onChange={(e) => setPostImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-volt text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="volt" type="submit" disabled={submitting || !content.trim()}>
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Publish Post
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
