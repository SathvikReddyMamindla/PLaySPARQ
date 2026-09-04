export const CORE_PROFILE_SCHEMA = {
  title: 'CORE ATHLETE IDENTITY',
  subtitle: 'Universal data layer shared across all sports & interactions',
  fields: [
    { key: 'athlete_id', label: 'Unique Athlete ID', type: 'UUID', example: 'ath_8f92e' },
    { key: 'full_name', label: 'Full Name', type: 'String', example: 'Rahul Sharma' },
    { key: 'geo_location', label: 'City & Coordinates', type: 'GeoJSON', example: 'Hyderabad (17.44°N, 78.38°E)' },
    { key: 'sports_matrix', label: 'Sports Array', type: 'Array<Sport>', example: '["Football", "Cricket", "Badminton"]' },
    { key: 'trust_score', label: 'Community Reliability', type: 'Float / Verified', example: '4.9 ★ (99% Show Rate)' },
    { key: 'availability', label: 'General Schedule', type: 'Matrix', example: 'Weekdays 6-8 AM, Weekends' },
  ],
};

export const SPORT_ADAPTERS = [
  { id: 'cricket', sport: 'CRICKET', emoji: '🏏', tagline: 'Team & Role-Centric Adapter',
    color: 'ember', borderColor: 'border-ember/40', accentColor: '#FF6A3D',
    fields: [
      { key: 'batting', label: 'Batting Style', value: 'Right-hand Top Order (SR: 138.2)' },
      { key: 'bowling', label: 'Bowling Style', value: 'Right-arm Fast Medium (120 km/h)' },
      { key: 'matches', label: 'Matches Played', value: '84 Matches (Club & Box)' },
      { key: 'format', label: 'Preferred Formats', value: 'T20, Leather Ball, Turf Box' },
    ] },
  { id: 'swimming', sport: 'SWIMMING', emoji: '🏊', tagline: 'Metric & Lap-Centric Adapter',
    color: 'pitch', borderColor: 'border-pitch/40', accentColor: '#17473C',
    fields: [
      { key: 'stroke', label: 'Primary Stroke', value: 'Freestyle & Butterfly' },
      { key: 'lap_time', label: '50m Lap Pace', value: '28.4s (SCM) / 1:04 (100m)' },
      { key: 'pb', label: 'Personal Best', value: '400m Free: 4m 58s' },
      { key: 'volume', label: 'Weekly Volume', value: '12.5 km (4 Sessions)' },
    ] },
  { id: 'chess', sport: 'CHESS', emoji: '♟️', tagline: 'Rating & Analytical Adapter',
    color: 'ink', borderColor: 'border-ink/30', accentColor: '#0F1417',
    fields: [
      { key: 'rating', label: 'Rating (FIDE / Platform)', value: '1840 FIDE / 2020 Rapid' },
      { key: 'time_control', label: 'Preferred Time', value: '10+0 Rapid & 3+2 Blitz' },
      { key: 'history', label: 'Tournament History', value: '14 OTB State & Open Events' },
      { key: 'openings', label: 'Fav Opening Systems', value: 'Sicilian Najdorf, Queen\'s Gambit' },
    ] },
  { id: 'athletics', sport: 'ATHLETICS', emoji: '🏃', tagline: 'Pace & Endurance Adapter',
    color: 'ember', borderColor: 'border-ember/40', accentColor: '#D9572E',
    fields: [
      { key: 'event', label: 'Primary Event', value: '10K & Half Marathon' },
      { key: 'target_pace', label: 'Training Pace', value: '4:45 min/km' },
      { key: 'personal_best', label: 'Personal Best', value: '10K: 44m 12s | HM: 1h 42m' },
      { key: 'mileage', label: 'Weekly Mileage', value: '45 km / Week' },
    ] },
];
