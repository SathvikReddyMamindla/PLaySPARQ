// SportSphere API client — talks to the Python backend via /api/v1 (proxied by Vite).
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

async function request(path, { method = 'GET', body, params } = {}) {
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.detail || json?.message || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, json);
  }
  return json;
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const api = {
  // auth
  register: (d) => request('/auth/register', { method: 'POST', body: d }),
  login: (d) => request('/auth/login', { method: 'POST', body: d }),
  demo: () => request('/auth/demo', { method: 'POST' }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // AI
  aiStatus: () => request('/ai/status'),
  parseProfile: (rawText) => request('/ai/parse-profile', { method: 'POST', body: { rawText } }),
  matchExplanations: (ids) => request('/ai/match-explanation', { method: 'POST', body: { candidateIds: ids } }),
  trustNote: (payload) => request('/ai/trust-note', { method: 'POST', body: payload }),
  performanceSummary: (sportId, profileId) => request('/ai/performance-summary', { method: 'POST', body: { sportId, profileId } }),

  // profiles & privacy
  athletes: () => request('/athletes'),
  athlete: (id) => request(`/athletes/${id}`),
  createProfile: (d) => request('/athletes', { method: 'POST', body: d }),
  updateProfile: (id, d) => request(`/athletes/${id}`, { method: 'PUT', body: d }),
  updatePrivacy: (id, d) => request(`/athletes/${id}/privacy`, { method: 'PUT', body: d }),

  // discovery
  players: (params) => request('/discovery/players', { params }),
  teams: (params) => request('/discovery/teams', { params }),
  events: (params) => request('/discovery/events', { params }),

  // connections
  connections: () => request('/connections'),
  sendConnection: (d) => request('/connections/request', { method: 'POST', body: d }),
  connectionStatus: (recipientId) => request(`/connections/status/${recipientId}`),
  respondConnection: (connectionId, accept) => request('/connections/respond', { method: 'POST', body: { connectionId, accept } }),

  // chat & safety
  conversations: () => request('/chat/conversations'),
  messages: (cid) => request(`/chat/conversations/${cid}/messages`),
  sendMessage: (cid, body) => request(`/chat/conversations/${cid}/messages`, { method: 'POST', body: { body } }),
  markRead: (cid) => request(`/chat/conversations/${cid}/read`, { method: 'POST' }),
  blockUser: (userId) => request(`/users/${userId}/block`, { method: 'POST' }),
  unblockUser: (userId) => request(`/users/${userId}/unblock`, { method: 'POST' }),
  blockedUsers: () => request('/users/blocked'),
  reportUser: (userId, reason, details = '', targetId = null) =>
    request(`/users/${userId}/report`, { method: 'POST', body: { reportedId: userId, reason, details, targetId } }),
  reportMessage: (messageId, reportedId, reason, details = '') =>
    request(`/chat/messages/${messageId}/report`, { method: 'POST', body: { reportedId, reason, details, targetId: messageId } }),

  // personalization & recommendations
  personalizedHome: () => request('/personalization/home'),
  recommendedPlayers: () => request('/recommendations/players'),
  recommendedTournaments: () => request('/recommendations/tournaments'),

  // tournaments
  tournaments: (sportId) => request('/tournaments', { params: sportId ? { sport_id: sportId } : undefined }),
  tournament: (id) => request(`/tournaments/${id}`),
  directRegister: (id, teamName = '') => request(`/tournaments/${id}/register`, { method: 'POST', body: { tournamentId: id, teamName } }),

  // payments & checkout
  createPaymentOrder: (tournamentId, discountCode = '', teamName = '') =>
    request('/payments/create-order', { method: 'POST', body: { tournamentId, discountCode: discountCode || null, teamName } }),
  verifyPayment: (orderId, paymentId, signature, tournamentId, teamName = '') =>
    request('/payments/verify', { method: 'POST', body: { orderId, paymentId, signature, tournamentId, teamName } }),
  receipt: (paymentId) => request(`/payments/receipt/${paymentId}`),

  // discounts
  validateDiscount: (code, tournamentId) => request('/discounts/validate', { method: 'POST', body: { code, tournamentId } }),
  availableDiscounts: () => request('/discounts/available'),

  // notifications
  notifications: (category) => request('/notifications', { params: category ? { category } : undefined }),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/mark-all-read', { method: 'POST' }),
  notificationPreferences: () => request('/notifications/preferences'),
  updateNotificationPreferences: (d) => request('/notifications/preferences', { method: 'PUT', body: d }),

  // admin
  adminCreateTournament: (d) => request('/admin/tournaments', { method: 'POST', body: d }),
  adminUpdateTournament: (id, d) => request(`/admin/tournaments/${id}`, { method: 'PUT', body: d }),
  adminRegistrations: () => request('/admin/registrations'),
  adminCreateDiscount: (d) => request('/admin/discounts', { method: 'POST', body: d }),
  adminToggleDiscount: (id) => request(`/admin/discounts/${id}/toggle`, { method: 'PATCH' }),
  adminPayments: () => request('/admin/payments'),
  adminRefund: (paymentId, reason = '') => request(`/admin/payments/${paymentId}/refund`, { method: 'POST', body: { paymentId, reason } }),
  adminAnnouncement: (d) => request('/admin/announcements', { method: 'POST', body: d }),
  adminReports: (status) => request('/admin/reports', { params: status ? { status } : undefined }),
  adminResolveReport: (id) => request(`/admin/reports/${id}/resolve`, { method: 'POST' }),

  // events
  allEvents: () => request('/events'),
  createEvent: (d) => request('/events', { method: 'POST', body: d }),
  joinEvent: (id) => request(`/events/${id}/join`, { method: 'POST' }),
  leaveEvent: (id) => request(`/events/${id}/leave`, { method: 'POST' }),

  // sports
  sports: () => request('/sports'),
};

export const num = (v, fallback = 0) => (isNaN(parseFloat(v)) ? fallback : parseFloat(v));
