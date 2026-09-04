import { useState, useCallback } from 'react';

// Browser geolocation helper — returns { lat, lng } or an error.
export function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(false);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported by this browser.');
      return;
    }
    setFetching(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setFetching(false);
      },
      (err) => {
        setError(err.message || 'Unable to get your location.');
        setFetching(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  return { coords, error, fetching, request };
}

export const HYDERABAD_CENTER = { lat: 17.4401, lng: 78.3489 };
