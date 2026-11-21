import { GRAPHHOPPER_API_KEY } from './config.js';

const GH_BASE = 'https://graphhopper.com/api/1/route';

export const routeGraphHopper = async (start, end, vehicle = 'foot') => {
  const url = `${GH_BASE}?point=${start[0]},${start[1]}&point=${end[0]},${end[1]}&vehicle=${vehicle}&key=${GRAPHHOPPER_API_KEY}&type=json&points_encoded=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (res.status === 429 || res.status === 402) throw new Error('GH_QUOTA');
  if (!res.ok) throw new Error(`GH HTTP ${res.status}`);
  const data = await res.json();
  if (!data.paths?.length) throw new Error('No GH route');
  const path = data.paths[0];
  const latlngs = path.points.coordinates.map(([lng, lat]) => [lat, lng]);
  return { latlngs, distanceM: path.distance, durationS: path.time / 1000 };
};
