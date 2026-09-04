import { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import MapSection from '../components/MapSection';
import { ProblemSection, SolutionSection, HowItWorks, MultiSportSection, TrustSection, CommunitySection, FinalCTA, Footer } from '../components/Sections';
import DiscoverySection, { DiscoveryCategories, AthleteProfileSection } from '../components/DiscoverySection';
import { JoinModal, EventsModal, Toast } from '../components/Modals';

export default function Landing() {
  const [joinOpen, setJoinOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [toast, setToast] = useState('');

  return (
    <div className="min-h-screen bg-paper text-ink font-sans relative overflow-x-hidden">
      <Navbar onOpenJoinModal={() => setJoinOpen(true)} />
      <main>
        <Hero onOpenJoinModal={() => setJoinOpen(true)} />
        <ProblemSection />
        <SolutionSection onOpenJoinModal={() => setJoinOpen(true)} />
        <AthleteProfileSection />
        <DiscoverySection onOpenJoinModal={() => setJoinOpen(true)} />
        <MapSection />
        <DiscoveryCategories onOpenJoinModal={() => setJoinOpen(true)} onOpenEventsModal={() => setEventsOpen(true)} />
        <HowItWorks onOpenJoinModal={() => setJoinOpen(true)} />
        <TrustSection />
        <CommunitySection onOpenJoinModal={() => setJoinOpen(true)} />
        <MultiSportSection />
        <FinalCTA onOpenJoinModal={() => setJoinOpen(true)} />
      </main>
      <Footer />
      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} onToast={setToast} />
      <EventsModal open={eventsOpen} onClose={() => setEventsOpen(false)} onToast={setToast} />
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
