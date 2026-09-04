import { useEffect, useState } from 'react';
import { LocateFixed, Loader2, Sparkles } from 'lucide-react';
import Reveal from './ui/Reveal';
import Badge from './ui/Badge';
import AthleteMap from './AthleteMap';
import { api } from '../lib/api';
import { useGeolocation, HYDERABAD_CENTER } from '../lib/geo';

export default function MapSection() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { coords, request, error, fetching } = useGeolocation();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.players({ lat: 17.4401, lng: 78.3489, radiusKm: 40, sportId: 'all', limit: 20 });
        setPlayers(res?.data?.players || []);
      } catch (e) {} finally { setLoading(false); }
    })();
  }, []);

  return (
    <section id="map" className="py-20 md:py-28 bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-8 items-center">
          <Reveal>
            <span className="eyebrow text-ember">Find them on a map</span>
            <h2 className="mt-3 font-display font-bold text-4xl md:text-5xl text-ink tracking-tight">
              See athletes <span className="text-pitch">around you</span>
            </h2>
            <p className="mt-4 text-ink-soft text-lg">
              Every member drops a pin at their location — sport emoji included. Tap a pin to see
              their profile, skill tier, and compatibility score, and connect right from the map.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-ink-soft">
              {[
                'Live interactive map (Leaflet + OpenStreetMap, no API key)',
                'Browser geolocation pins you to your own spot',
                'Click a pin to view a profile and send a connect',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ember" /> {t}</li>
              ))}
            </ul>
            <div className="mt-6 flex items-center gap-3">
              <Badge tone="volt"><Sparkles className="w-3 h-3" /> {players.length} athletes mapped</Badge>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-pitch" />}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="relative">
              <div className="absolute top-3 left-3 z-[500]">
                <button onClick={request} disabled={fetching} className="inline-flex items-center gap-2 rounded-xl bg-white border border-line px-3 py-2 text-sm font-medium shadow-card hover:border-ink/30">
                  <LocateFixed className="w-4 h-4 text-pitch" /> {fetching ? 'Locating…' : 'Center on me'}
                </button>
                {error && <p className="mt-1 text-[11px] text-ember bg-white/90 rounded px-2 py-1">{error}</p>}
              </div>
              <AthleteMap
                athletes={players}
                center={HYDERABAD_CENTER}
                focus={coords || null}
                height="460px"
                className="shadow-card"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
