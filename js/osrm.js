const OSRM_FOOT  = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';
const OSRM_DRIVE = 'https://router.project-osrm.org/route/v1/driving';

const _osrm = async (base, start, end) => {
  const waypoints = `${start[1]},${start[0]};${end[1]},${end[0]}`;
  const res = await fetch(
    `${base}/${waypoints}?overview=full&geometries=geojson`,
    { signal: AbortSignal.timeout(12000) }
  );
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route');
  const route = data.routes[0];
  const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return { latlngs, distanceM: route.distance, durationS: route.duration };
};

export const routeOSRMFoot  = (start, end) => _osrm(OSRM_FOOT,  start, end);
export const routeOSRMDrive = (start, end) => _osrm(OSRM_DRIVE, start, end);

export const fmtDistance = (m) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

export const fmtDuration = (s, mode = 'walk') => {
  const mins = Math.round(s / 60);
  const label = mode === 'drive' ? 'drive' : 'walk';
  return mins < 60
    ? `${mins} min ${label}`
    : `${Math.floor(mins / 60)} hr ${mins % 60} min ${label}`;
};
