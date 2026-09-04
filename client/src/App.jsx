import { Routes, Route } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import AppShell from './components/AppShell';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import TournamentsPage from './pages/TournamentsPage';
import ConnectionsPage from './pages/ConnectionsPage';
import ChatPage from './pages/ChatPage';
import NotificationsPage from './pages/NotificationsPage';
import EventsPage from './pages/EventsPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

import FeatherlessBadge from './components/FeatherlessBadge';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-ink-soft text-sm">Loading SportSphere…</div>
      </div>
    );
  }
  if (!user) return <Onboarding mode="gate" />;
  return children;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<HomePage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="tournaments" element={<TournamentsPage />} />
          <Route path="connections" element={<ConnectionsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:cid" element={<ChatPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/:pid" element={<ProfilePage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Landing />} />
      </Routes>
      <FeatherlessBadge />
    </>
  );
}

