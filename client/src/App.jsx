import { Routes, Route } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import AppShell from './components/AppShell';
import DiscoverPage from './pages/DiscoverPage';
import ConnectionsPage from './pages/ConnectionsPage';
import ChatPage from './pages/ChatPage';
import EventsPage from './pages/EventsPage';
import MyEventsPage from './pages/MyEventsPage';
import ProfilePage from './pages/ProfilePage';
import CommunityPage from './pages/CommunityPage';
import FloatingAIBadge from './components/FloatingAIBadge';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-paper flex items-center justify-center"><div className="text-ink-soft">Loading…</div></div>;
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
          <Route index element={<DiscoverPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="connections" element={<ConnectionsPage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:cid" element={<ChatPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="my-events" element={<MyEventsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Landing />} />
      </Routes>
      <FloatingAIBadge />
    </>
  );
}
