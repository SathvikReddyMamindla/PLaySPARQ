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

  // profiles
  athletes: () => request('/athletes'),
  athlete: (id) => request(`/athletes/${id}`),
  createProfile: (d) => request('/athletes', { method: 'POST', body: d }),

  // discovery
  players: (params) => request('/discovery/players', { params }),
  teams: (params) => request('/discovery/teams', { params }),
  events: (params) => request('/discovery/events', { params }),

  // connections
  connections: () => request('/connections'),
  sendConnection: (d) => request('/connections/request', { method: 'POST', body: d }),
  connectionStatus: (recipientId) => request(`/connections/status/${recipientId}`),
  respondConnection: (connectionId, accept) => request('/connections/respond', { method: 'POST', body: { connectionId, accept } }),
  friends: async () => {
    const r = await request('/connections');
    return r?.data?.friends || [];
  },

  // chat
  conversations: () => request('/chat/conversations'),
  messages: (cid) => request(`/chat/conversations/${cid}/messages`),
  sendMessage: (cid, body) => request(`/chat/conversations/${cid}/messages`, { method: 'POST', body: { body } }),
  markConversationRead: (cid) => request(`/chat/conversations/${cid}/read`, { method: 'POST' }),

  // community
  communityPosts: () => request('/community/posts'),
  createCommunityPost: (d) => request('/community/posts', { method: 'POST', body: d }),
  likeCommunityPost: (pid) => request(`/community/posts/${pid}/like`, { method: 'POST' }),

  // notifications
  notifications: () => request('/notifications'),

  // events
  allEvents: () => request('/events'),
  createEvent: (d) => request('/events', { method: 'POST', body: d }),
  joinEvent: (id) => request(`/events/${id}/join`, { method: 'POST' }),
  payJoinEvent: (id) => request(`/events/${id}/pay`, { method: 'POST' }),
  leaveEvent: (id) => request(`/events/${id}/leave`, { method: 'POST' }),
  myEvents: () => request('/me/events'),

  // sports
  sports: () => request('/sports'),
};

// Trim a string to a number or null.
export const num = (v, fallback = 0) => (isNaN(parseFloat(v)) ? fallback : parseFloat(v));
