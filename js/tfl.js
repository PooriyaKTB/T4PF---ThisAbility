/* TfL Unified API — lift & escalator fault fetcher.
   Free tier, no API key required (50 req/min without registration).
   CORS-enabled: returns Access-Control-Allow-Origin: * */

const BASE = 'https://api.tfl.gov.uk';

/* Key interchange / step-free stations in central London.
   NaptanIDs are stable TfL identifiers; coordinates from TfL StopPoint data. */
const HUBS = [
  { id: '940GZZLULBG', name: 'London Bridge',   latlng: [51.5055, -0.0864] },
  { id: '940GZZLUWLO', name: 'Waterloo',         latlng: [51.5036, -0.1143] },
  { id: '940GZZLUVIC', name: 'Victoria',         latlng: [51.4965, -0.1447] },
  { id: '940GZZLUKSX', name: "King's Cross",     latlng: [51.5308, -0.1238] },
  { id: '940GZZLUOXC', name: 'Oxford Circus',    latlng: [51.5152, -0.1417] },
  { id: '940GZZLUGPK', name: 'Green Park',       latlng: [51.5067, -0.1428] },
  { id: '940GZZLUBNK', name: 'Bank',             latlng: [51.5134, -0.0890] },
  { id: '940GZZLULVS', name: 'Liverpool Street', latlng: [51.5178, -0.0823] },
  { id: '940GZZLUEUR', name: 'Euston',           latlng: [51.5282, -0.1337] },
  { id: '940GZZLUSWK', name: 'Southwark',        latlng: [51.5041, -0.1054] },
];

const _check = async ({ id, name, latlng }) => {
  const res = await fetch(`${BASE}/StopPoint/${id}/Equipment`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = await res.json();

  // TfL returns either a flat array or an object with an equipmentList property
  const items = Array.isArray(data)
    ? data
    : data.equipmentList ?? data.equipment ?? [];

  const hasFault = items.some((eq) => {
    const type  = (eq.type ?? eq.equipmentType ?? '').toLowerCase();
    const state = (eq.stateDescription ?? eq.statusDescription ?? 'normal').toLowerCase();
    return type === 'lift' && state !== 'normal';
  });

  return hasFault ? { name, latlng } : null;
};

/* Returns an array of { name, latlng } for stations with at least one
   lift currently out of service or on reduced service. */
export const fetchLiftFaults = async () => {
  const settled = await Promise.allSettled(HUBS.map(_check));
  return settled
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value);
};
