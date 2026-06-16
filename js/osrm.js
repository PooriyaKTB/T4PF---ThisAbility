/* OSRM public demo server — pedestrian routing.
   Free, no key required. Coordinates must be [lng, lat] (GeoJSON order).
   ToS: demo server only; swap for a self-hosted instance in production. */

const BASE = 'https://router.project-osrm.org/route/v1/foot';

/* Returns { latlngs, distanceM, durationS } where latlngs is Leaflet-ready [[lat,lng]…]
   Throws on network error or when OSRM returns no route. */
export const routeOSRM = async (start, end) => {
  const waypoints = `${start[1]},${start[0]};${end[1]},${end[0]}`;
  const res = await fetch(
    `${BASE}/${waypoints}?overview=full&geometries=geojson`,
    { signal: AbortSignal.timeout(12000) }
  );
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route');

  const route = data.routes[0];
  // GeoJSON is [lng, lat] — swap to Leaflet's [lat, lng]
  const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return { latlngs, distanceM: route.distance, durationS: route.duration };
};

export const fmtDistance = (m) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

export const fmtDuration = (s) => {
  const mins = Math.round(s / 60);
  return mins < 60 ? `${mins} min walk` : `${Math.floor(mins / 60)} hr ${mins % 60} min walk`;
};
