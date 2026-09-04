import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { UserPlus, Check } from 'lucide-react';

const SPORT_EMOJI = {
  football: '⚽', cricket: '🏏', badminton: '🏸', basketball: '🏀',
  swimming: '🏊', tennis: '🎾', athletics: '🏃', chess: '♟️',
};
const skillLabel = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');
const sportName = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Player');

/**
 * Interactive Leaflet + OpenStreetMap map of athletes.
 * Renders one emoji pin per athlete, with a click-to-view profile popup.
 */
export default function AthleteMap({
  athletes = [],
  center = { lat: 17.4401, lng: 78.3489 },
  zoom = 12,
  height = '100%',
  className = '',
  onConnect,       // (athlete) => void
  connectedIds = new Set(),
  focus = null,    // when set to {lat,lng}, the map flies to it
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const initCenter = useRef(center);
  const initZoom = useRef(zoom);

  // Initialise the map exactly once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: true,
      attributionControl: true,
    }).setView([initCenter.current.lat, initCenter.current.lng], initZoom.current);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      className: 'leaflet-tile-pane',
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Re-draw markers whenever the athlete list changes.
  useEffect(() => {
    const group = layerGroupRef.current;
    const map = mapRef.current;
    if (!group || !map) return;

    group.clearLayers();

    athletes.forEach((a) => {
      const lat = parseFloat(a.lat);
      const lng = parseFloat(a.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      if (lat === 0 && lng === 0) return;

      const emoji = SPORT_EMOJI[a.matched_sport] || SPORT_EMOJI[a.primarySport] || '🎯';
      const isConnected = connectedIds.has(a.id);

      const icon = L.divIcon({
        className: '',
        html: `<div class="ath-pin ${isConnected ? 'ath-pin--connected' : ''}" style="background:${isConnected ? '#123B33' : '#FF6A3D'}">
                 <span>${emoji}</span>
               </div>`,
        iconSize: [34, 38],
        iconAnchor: [17, 36],
        popupAnchor: [0, -34],
      });

      const marker = L.marker([lat, lng], { icon, title: a.name }).addTo(group);
      const btnLabel = isConnected ? 'Connected ✓' : 'Connect';
      const btnClass = isConnected ? 'ath-pop__btn ath-pop__btn--done' : 'ath-pop__btn';
      const buttonHtml = typeof onConnect === 'function'
        ? `<button class="${btnClass}" data-athlete-id="${a.id}" ${isConnected ? 'disabled' : ''}>${btnLabel}</button>`
        : '';
      marker.bindPopup(
        `<div class="ath-pop">
           <div class="ath-pop__head">
             <div class="ath-pop__avatar" style="background-image:url('${a.avatar || ''}')"></div>
             <div>
               <strong>${a.name}</strong>
               <div class="ath-pop__sub">${sportName(a.matched_sport || a.primarySport)} · ${skillLabel(a.skillLevel)}</div>
             </div>
             <div class="ath-pop__score">${a.compatibilityScore ?? ''}<small>match</small></div>
           </div>
           <div class="ath-pop__meta">
             <span>📍 ${a.distanceKm != null ? a.distanceKm + ' km' : (a.location?.neighborhood || '')}</span>
             <span>★ ${a.rating ?? '—'}</span>
             <span>👌 ${a.reliability_rate ?? a.reliabilityRate ?? '—'}%</span>
           </div>
           <p class="ath-pop__bio">${a.explanation || a.bio || ''}</p>
           ${buttonHtml}
           <a href="/app/profile/${a.id}" style="display:block; text-align:center; font-size:11px; font-weight:600; color:#123B33; text-decoration:underline; margin-top:8px;">View Full Profile</a>
         </div>`,
        { minWidth: 230 }
      );

      // Wire up the Connect button once the popup opens. React handlers can't be
      // embedded in raw HTML, so we attach a DOM listener on popupopen.
      marker.on('popupopen', (e) => {
        const el = e.popup.getElement();
        const btn = el && el.querySelector(`[data-athlete-id="${a.id}"]`);
        if (btn && !btn.dataset.bound) {
          btn.dataset.bound = '1';
          btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            if (typeof onConnect === 'function') onConnect(a);
          });
        }
      });
    });

    return () => group.clearLayers();
  }, [athletes, connectedIds, onConnect]);

  // Fly to a focused coordinate when one is provided (e.g. browser geolocation).
  useEffect(() => {
    const map = mapRef.current;
    if (map && focus && typeof focus.lat === 'number' && typeof focus.lng === 'number') {
      map.flyTo([focus.lat, focus.lng], Math.max(12, map.getZoom()));
    }
  }, [focus]);

  return <div ref={containerRef} className={`rounded-2xl overflow-hidden ${className}`} style={{ height, width: '100%', zIndex: 0 }} />;
}
