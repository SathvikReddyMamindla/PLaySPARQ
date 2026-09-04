import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Clock, Loader2, Sparkles, ShieldCheck, TrendingUp,
  Award, Trophy, Target, Activity, Settings, Edit3, CheckCircle2, Lock,
  UserPlus, MessageSquare, Check, Ban, Flag, Users, ArrowLeft, Calendar
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const statLabel = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');
const slotLabel = (s) =>
  ({
    weekday_morning: 'Weekday AM', weekday_evening: 'Weekday PM', weekday_afternoon: 'Weekday noon',
    friday_night: 'Friday night', saturday_morning: 'Sat AM', sunday_morning: 'Sun AM',
    weekend_morning: 'Weekend AM', weekend_evening: 'Weekend PM',
  }[s] || s);

export default function ProfilePage() {
  const { pid } = useParams();
  const navigate = useNavigate();
  const { profile: myProfile, user, updateProfile } = useAuth();

  const isOwnProfile = !pid || pid === myProfile?.id;

  const [viewedProfile, setViewedProfile] = useState(null);
  const [trust, setTrust] = useState(null);
  const [summaries, setSummaries] = useState({});
  const [aiOn, setAiOn] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit / Privacy Modal state (own profile)
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [privacyForm, setPrivacyForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Interaction states (other profile)
  const [connecting, setConnecting] = useState(false);
  const [connSent, setConnSent] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate content or spam');
  const [reportDetails, setReportDetails] = useState('');
  const [toast, setToast] = useState('');

  const achievementsRef = useRef(null);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const status = await api.aiStatus();
      setAiOn(status?.ai_enabled);

      if (isOwnProfile) {
        if (myProfile?.id) {
          const t = await api.trustNote({ profileId: myProfile.id });
          setTrust(t);
          for (const sport of ['football', 'athletics', 'badminton']) {
            try {
              const p = await api.performanceSummary(sport, myProfile.id);
              setSummaries((x) => ({ ...x, [sport]: p }));
            } catch (e) {}
          }
        }
        setViewedProfile(null);
      } else {
        const res = await api.athlete(pid);
        if (res?.success) {
          setViewedProfile(res.data);
          if (res.data.id) {
            const t = await api.trustNote({ profileId: res.data.id });
            setTrust(t);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [pid, myProfile?.id]);

  const p = isOwnProfile ? myProfile : viewedProfile;

  const openEdit = () => {
    setEditForm({
      name: myProfile?.name || user?.display_name || '',
      handle: myProfile?.handle || '',
      city: myProfile?.city || 'Hyderabad',
      neighborhood: myProfile?.neighborhood || '',
      primary_sport: myProfile?.primary_sport || 'Football',
      skill_level: myProfile?.skill_level || 'intermediate',
      role: myProfile?.role || '',
      bio: myProfile?.bio || '',
      preferred_match_type: myProfile?.preferred_match_type || 'Casual & Competitive',
      playing_style: myProfile?.playing_style || '',
    });
    setPrivacyForm({
      discovery_enabled: myProfile?.discovery_enabled !== false,
      show_activity: myProfile?.show_activity !== false,
      show_stats: myProfile?.show_stats !== false,
    });
    setEditModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateProfile(myProfile.id, {
        ...editForm,
        ...privacyForm,
      });
      if (res?.success) {
        updateProfile(res.data);
        setEditModal(false);
        setToast('Profile and privacy settings updated!');
        setTimeout(() => setToast(''), 3000);
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    if (!p) return;
    setConnecting(true);
    try {
      await api.sendConnection({
        recipientId: p.id,
        sportId: p.primary_sport || 'football',
        type: 'match_invite',
        message: `Hey ${p.name}, saw your profile on SportSphere! Let's connect.`,
      });
      setConnSent(true);
      setToast('Connection request sent! Chat will unlock once accepted.');
      setTimeout(() => setToast(''), 4000);
    } catch (e) {
      alert(e.message || 'Could not send connection request');
    } finally {
      setConnecting(false);
    }
  };

  const handleBlockUser = async () => {
    if (!p) return;
    if (!confirm(`Are you sure you want to block ${p.name}? You will no longer be matched.`)) return;
    try {
      await api.blockUser(p.id);
      setToast(`${p.name} has been blocked.`);
      setTimeout(() => navigate('/app/discover'), 1200);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleReportUser = async (e) => {
    e.preventDefault();
    if (!p) return;
    try {
      await api.reportUser(p.id, reportReason, reportDetails);
      setReportModal(false);
      setReportDetails('');
      setToast('Report submitted for safety review.');
      setTimeout(() => setToast(''), 3500);
    } catch (e) {
      alert(e.message);
    }
  };

  const name = p?.name || (isOwnProfile ? user?.display_name : 'Athlete');
  const sports = p?.sports || [];
  const wins = p?.wins ?? 28;
  const losses = p?.losses ?? 14;
  const matches = p?.matches_played || (wins + losses);
  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
  const badges = p?.badges?.length ? p.badges : ['Verified Athlete', 'Fair Play Champion', 'Top Sparring Partner'];
  const goals = p?.goals?.length ? p.goals : ['Compete in Hyderabad 7v7 League', 'Break 50-minute 10K mark'];
  const achievements = p?.achievements?.length ? p.achievements : ['Runners Up - Hitec City Cup 2025', 'AstroPark Summer League MVP'];
  const history = p?.tournament_history || [];
  const activities = p?.recent_activity || [];
  const cid = myProfile && p ? [myProfile.id, p.id].sort().join('::') : '';

  return (
    <div className="px-4 sm:px-6 max-w-4xl space-y-6 pb-12">
      {/* Back button & quick safety actions if viewing other profile */}
      {!isOwnProfile && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Athletes
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportModal(true)}
              title="Report athlete"
              className="text-ink-faint hover:text-ember p-1.5 rounded-lg hover:bg-white text-xs inline-flex items-center gap-1"
            >
              <Flag className="w-3.5 h-3.5" /> Report
            </button>
            <button
              onClick={handleBlockUser}
              title="Block athlete"
              className="text-ink-faint hover:text-ember p-1.5 rounded-lg hover:bg-white text-xs inline-flex items-center gap-1"
            >
              <Ban className="w-3.5 h-3.5" /> Block
            </button>
          </div>
        </div>
      )}

      {/* Header Profile Card */}
      <div className="rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-card volt-glow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <img
              src={p?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
              alt={name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover shadow-md border-2 border-white"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink">{name}</h2>
                <Badge tone="pitch">{p?.role || 'Athlete'}</Badge>
              </div>
              <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
                {p?.handle || '@athlete'} · {p?.neighborhood ? `${p.neighborhood}, ` : ''}{p?.city || 'Hyderabad'}
              </p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <Badge tone="volt"><TrendingUp className="w-3 h-3" /> {statLabel(p?.skill_level || 'intermediate')}</Badge>
                {p?.rating && <Badge tone="neutral"><Star className="w-3 h-3 text-ember" /> {p.rating} Rating</Badge>}
                <Badge tone="pitch"><ShieldCheck className="w-3 h-3" /> {p?.reliability_rate || 98}% Reliable</Badge>
                <Badge tone="neutral"><Users className="w-3 h-3 text-pitch" /> {p?.connection_count ?? 12} Connections</Badge>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isOwnProfile ? (
              <Button variant="ghost" size="sm" onClick={openEdit}>
                <Edit3 className="w-4 h-4" /> Edit Profile & Privacy
              </Button>
            ) : (
              <>
                {/* Chat (ONLY when connected per Requirement 1 & 4) */}
                {p?.is_connected ? (
                  <Button variant="volt" size="sm" onClick={() => navigate(`/app/chat/${cid}`)}>
                    <MessageSquare className="w-4 h-4" /> Chat
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-paper border border-line text-ink-faint text-xs">
                    <Lock className="w-3.5 h-3.5" /> Chat locked
                  </div>
                )}

                {/* Connect Action */}
                {p?.is_connected ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-pitch bg-pitch/10 px-3 py-1.5 rounded-xl">
                    <Check className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : p?.connection_status === 'pending' || connSent ? (
                  <Button variant="ghost" size="sm" disabled className="text-ink-soft">
                    <Check className="w-4 h-4 text-pitch" /> Request Pending
                  </Button>
                ) : (
                  <Button variant="volt" size="sm" onClick={handleConnect} disabled={connecting}>
                    {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Connect</>}
                  </Button>
                )}

                {/* View Tournaments */}
                <Button variant="ghost" size="sm" onClick={() => navigate('/app/tournaments')}>
                  <Trophy className="w-4 h-4 text-ember" /> Tournaments
                </Button>

                {/* View Achievements */}
                <Button variant="ghost" size="sm" onClick={() => achievementsRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                  <Award className="w-4 h-4 text-pitch" /> Achievements
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        {p?.bio && (
          <div className="mt-5 rounded-2xl bg-paper border border-line p-4 text-xs text-ink leading-relaxed">
            “{p.bio}”
          </div>
        )}

        {/* Playing Style & Preferences */}
        {(p?.preferred_match_type || p?.playing_style) && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {p?.preferred_match_type && (
              <span className="px-3 py-1 rounded-xl bg-paper border border-line text-ink-soft">
                🎯 Mode: <strong className="text-ink">{p.preferred_match_type}</strong>
              </span>
            )}
            {p?.playing_style && (
              <span className="px-3 py-1 rounded-xl bg-paper border border-line text-ink-soft">
                ⚡ Style: <strong className="text-ink">{p.playing_style}</strong>
              </span>
            )}
          </div>
        )}

        {/* Match Record / Statistics Box */}
        {p?.show_stats !== false && (
          <div className="mt-6 pt-5 border-t border-line grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-2xl bg-paper p-3 border border-line">
              <p className="font-display font-bold text-2xl text-ink">{matches}</p>
              <p className="text-[11px] text-ink-faint font-medium mt-0.5 uppercase tracking-wider">Matches Played</p>
            </div>
            <div className="rounded-2xl bg-paper p-3 border border-line">
              <p className="font-display font-bold text-2xl text-pitch">{wins}</p>
              <p className="text-[11px] text-ink-faint font-medium mt-0.5 uppercase tracking-wider">Wins</p>
            </div>
            <div className="rounded-2xl bg-paper p-3 border border-line">
              <p className="font-display font-bold text-2xl text-ember">{losses}</p>
              <p className="text-[11px] text-ink-faint font-medium mt-0.5 uppercase tracking-wider">Losses</p>
            </div>
            <div className="rounded-2xl bg-paper p-3 border border-line">
              <p className="font-display font-bold text-2xl text-ink">{winRate}%</p>
              <p className="text-[11px] text-ink-faint font-medium mt-0.5 uppercase tracking-wider">Win Rate</p>
            </div>
          </div>
        )}
      </div>

      {/* Badges & Accolades */}
      <section ref={achievementsRef} id="achievements-section" className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2 mb-3">
          <Award className="w-5 h-5 text-ember" /> Badges & Credentials
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {badges.map((b, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-volt/20 text-pitch font-semibold text-xs border border-volt/30">
              <ShieldCheck className="w-4 h-4 text-pitch" /> {b}
            </span>
          ))}
        </div>
      </section>

      {/* Tournament Accolades & Goals */}
      <div className="grid sm:grid-cols-2 gap-5">
        <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
          <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-ember" /> Tournament Accolades
          </h3>
          <ul className="space-y-2 text-xs">
            {achievements.map((ach, i) => (
              <li key={i} className="flex items-center gap-2 p-2 rounded-xl bg-paper border border-line">
                <Trophy className="w-4 h-4 text-ember shrink-0" />
                <span className="font-medium text-ink">{ach}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
          <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-pitch" /> Athletic Goals
          </h3>
          <ul className="space-y-2 text-xs">
            {goals.map((g, i) => (
              <li key={i} className="flex items-center gap-2 p-2 rounded-xl bg-paper border border-line">
                <CheckCircle2 className="w-4 h-4 text-pitch shrink-0" />
                <span className="font-medium text-ink">{g}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Multi-Sport Matrix */}
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <h3 className="font-display font-bold text-lg text-ink mb-3">Multi-Sport Matrix</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {(sports.length ? sports : [{ sport: p?.primary_sport || 'football', skill_level: p?.skill_level || 'intermediate' }]).map((s, i) => (
            <div key={i} className="rounded-2xl border border-line bg-paper p-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-ink capitalize">{s.sport}</p>
                <Badge tone="volt">{statLabel(s.skill_level)}</Badge>
              </div>
              {s.role && <p className="text-xs text-ink-soft mt-1">Role / Position: {s.role}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Tournament History if available */}
      {history.length > 0 && (
        <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
          <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-ember" /> Tournament Participation History
          </h3>
          <div className="space-y-2.5">
            {history.map((h, i) => (
              <div key={h.id || i} className="rounded-2xl border border-line bg-paper p-3.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-ink text-sm">Tournament #{h.tournament_id}</p>
                  {h.team_name && <p className="text-ink-soft mt-0.5">Squad: {h.team_name}</p>}
                  <p className="text-ink-faint mt-0.5">Registered: {new Date(h.registered_at).toLocaleDateString()}</p>
                </div>
                <Badge tone="pitch">{h.status?.toUpperCase() || 'CONFIRMED'}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity stream if privacy allows */}
      {p?.show_activity !== false && activities.length > 0 && (
        <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
          <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-pitch" /> Recent Community Activity
          </h3>
          <div className="space-y-2">
            {activities.map((act, i) => (
              <div key={act.id || i} className="p-3 rounded-xl bg-paper border border-line flex items-center justify-between text-xs">
                <span className="text-ink font-medium">{act.description}</span>
                <span className="text-ink-faint">{new Date(act.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI Performance summaries (own profile) */}
      {isOwnProfile && Object.keys(summaries).length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-ember" />
            <h3 className="font-display font-bold text-lg text-ink">AI Performance Summaries</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(summaries).map(([sport, p]) => (
              <div key={sport} className="rounded-2xl border border-line bg-white p-4 shadow-card hover-lift">
                <p className="eyebrow text-pitch">{sport}</p>
                <p className="mt-2 font-display font-bold text-base text-ink">{p.headline}</p>
                <p className="text-xs text-ink-soft mt-1 leading-relaxed">{p.insight}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
          <form onSubmit={handleReportUser} className="relative w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-pitch animate-in fade-in zoom-in-95">
            <h3 className="font-display font-bold text-xl text-ink flex items-center gap-2">
              <Flag className="w-5 h-5 text-ember" /> Report Athlete
            </h3>
            <p className="text-xs text-ink-soft">
              Help keep the PLAYSync community safe. Submissions are reviewed confidentially by platform moderators.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-ink-soft block mb-1">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-line bg-paper"
                >
                  <option value="Inappropriate content or spam">Inappropriate content or spam</option>
                  <option value="Harassment or offensive behavior">Harassment or offensive behavior</option>
                  <option value="Fake or misleading athlete profile">Fake or misleading athlete profile</option>
                  <option value="Unsportsmanlike conduct">Unsportsmanlike conduct</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-ink-soft block mb-1">Details (optional)</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide additional details..."
                  className="w-full px-3 py-2 rounded-xl border border-line bg-paper"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setReportModal(false)}>Cancel</Button>
              <Button type="submit" variant="ember" className="flex-1">Submit Report</Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
          <form onSubmit={handleSaveProfile} className="relative w-full max-w-lg bg-white rounded-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-pitch animate-in fade-in zoom-in-95">
            <h3 className="font-display font-bold text-xl text-ink">Edit Athlete Profile</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-ink-soft uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-line bg-paper"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-ink-soft uppercase block mb-1">Neighborhood / Area</label>
                  <input
                    type="text"
                    value={editForm.neighborhood}
                    onChange={(e) => setEditForm({ ...editForm, neighborhood: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-line bg-paper"
                    placeholder="e.g. Kondapur"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink-soft uppercase block mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-line bg-paper"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-ink-soft uppercase block mb-1">Primary Sport</label>
                  <select
                    value={editForm.primary_sport}
                    onChange={(e) => setEditForm({ ...editForm, primary_sport: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-line bg-paper"
                  >
                    {['Football', 'Cricket', 'Badminton', 'Basketball', 'Swimming', 'Tennis', 'Athletics & Running', 'Chess'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-ink-soft uppercase block mb-1">Skill Tier</label>
                  <select
                    value={editForm.skill_level}
                    onChange={(e) => setEditForm({ ...editForm, skill_level: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-line bg-paper"
                  >
                    {['beginner', 'intermediate', 'advanced', 'pro', 'elite'].map((s) => (
                      <option key={s} value={s}>{statLabel(s)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-ink-soft uppercase block mb-1">Bio</label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-line bg-paper"
                />
              </div>

              {/* Privacy Controls Section */}
              <div className="pt-3 border-t border-line space-y-2">
                <p className="font-bold text-ink uppercase text-[11px] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-pitch" /> Privacy & Visibility Controls
                </p>
                <label className="flex items-center justify-between p-2 rounded-xl bg-paper border border-line cursor-pointer">
                  <span>Enable Athlete Discovery (visible in matchmaking)</span>
                  <input
                    type="checkbox"
                    checked={privacyForm.discovery_enabled}
                    onChange={(e) => setPrivacyForm({ ...privacyForm, discovery_enabled: e.target.checked })}
                    className="h-4 w-4 rounded text-pitch"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded-xl bg-paper border border-line cursor-pointer">
                  <span>Display match statistics publicly</span>
                  <input
                    type="checkbox"
                    checked={privacyForm.show_stats}
                    onChange={(e) => setPrivacyForm({ ...privacyForm, show_stats: e.target.checked })}
                    className="h-4 w-4 rounded text-pitch"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded-xl bg-paper border border-line cursor-pointer">
                  <span>Show recent activities to matches</span>
                  <input
                    type="checkbox"
                    checked={privacyForm.show_activity}
                    onChange={(e) => setPrivacyForm({ ...privacyForm, show_activity: e.target.checked })}
                    className="h-4 w-4 rounded text-pitch"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setEditModal(false)}>Cancel</Button>
              <Button type="submit" variant="volt" className="flex-1" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white px-4 py-2.5 rounded-2xl shadow-pitch text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-volt" /> {toast}
        </div>
      )}
    </div>
  );
}
