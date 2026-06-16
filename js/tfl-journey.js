/* TfL Journey Planner API — real multi-modal routing for London.
   Free, no API key required. CORS-enabled.
   Docs: https://api.tfl.gov.uk */

const BASE = 'https://api.tfl.gov.uk';

/* Map each app mode to TfL Journey Planner query parameters.
   These genuinely produce different routes from the API. */
const MODE_PARAMS = {
  'Step-free': {
    mode: 'tube,dlr,overground,elizabeth-line,walking',
    accessibilityPreference: 'stepFreeToVehicle',
    journeyPreference: 'leastInterchange',
    walkingSpeed: 'slow',
  },
  'Low crowd': {
    mode: 'tube,dlr,overground,elizabeth-line,walking',
    journeyPreference: 'leastInterchange',
    walkingSpeed: 'slow',
  },
  'Quiet': {
    mode: 'tube,dlr,overground,elizabeth-line,walking',
    journeyPreference: 'leastWalking',
    walkingSpeed: 'slow',
  },
  'Fastest': {
    mode: 'tube,bus,dlr,overground,elizabeth-line,walking',
    journeyPreference: 'leastTime',
    walkingSpeed: 'fast',
  },
  'AI Agent': {
    mode: 'tube,dlr,overground,elizabeth-line,walking',
    accessibilityPreference: 'stepFreeToVehicle',
    journeyPreference: 'leastTime',
    walkingSpeed: 'average',
  },
};

/* Official TfL line colours */
export const LINE_COLORS = {
  jubilee:              '#A0A5A9',
  central:              '#E32017',
  victoria:             '#0098D4',
  northern:             '#000000',
  bakerloo:             '#B36305',
  piccadilly:           '#003688',
  district:             '#00782A',
  circle:               '#FFD300',
  'hammersmith-city':   '#F3A9BB',
  metropolitan:         '#9B0056',
  'waterloo-city':      '#95CDBA',
  elizabeth:            '#6950A1',
  dlr:                  '#00A4A7',
  overground:           '#EE7C0E',
  bus:                  '#D41A1A',
  walking:              '#6B7280',
};

/* TfL lineString is a JSON-encoded array of [lng, lat] pairs.
   Returns Leaflet-ready [[lat, lng], …] or null on parse failure. */
const _parsePath = (str) => {
  if (!str) return null;
  try {
    const raw = JSON.parse(str);
    if (!Array.isArray(raw) || !raw.length) return null;
    // Each element is [lng, lat] — swap to Leaflet [lat, lng]
    return raw.map((pt) => [pt[1], pt[0]]);
  } catch {
    return null;
  }
};

const _shortName = (name = '') =>
  name.replace(/ Underground Station| Rail Station| Station| DLR/gi, '').trim();

/* Fetch a journey from the TfL Journey Planner.
   Returns { duration, legs } where each leg has:
   { mode, lineName, colour, dashed, latlngs, duration, from, to, isDisrupted } */
export const journeyTfL = async (start, end, appMode) => {
  const params = MODE_PARAMS[appMode] ?? MODE_PARAMS['Step-free'];

  // URLSearchParams encodes commas as %2C; TfL requires literal commas in mode list
  const p  = new URLSearchParams({ ...params, nationalSearch: 'false' });
  const qs = p.toString().replace(/%2C/gi, ',');
  const url = `${BASE}/Journey/JourneyResults/${start[0]},${start[1]}/to/${end[0]},${end[1]}?${qs}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`TfL HTTP ${res.status}`);
  const data = await res.json();
  if (!data.journeys?.length) throw new Error('No journeys returned');

  const journey = data.journeys[0];

  const legs = journey.legs.map((leg) => {
    const modeId  = leg.mode?.id ?? 'walking';
    const lineId  = leg.routeOptions?.[0]?.lineIdentifier?.id ?? modeId;
    const isWalk  = modeId === 'walking';
    const isDisrupted = leg.isDisrupted ?? false;

    const colour = isDisrupted
      ? '#f59e0b'                              // amber for disruptions
      : (LINE_COLORS[lineId] ?? LINE_COLORS[modeId] ?? '#2563eb');

    const pathLL = leg.path?.lineString
      ? _parsePath(leg.path.lineString)
      : null;

    // Fallback to straight line between endpoints if no path returned
    const dPt = leg.departurePoint;
    const aPt = leg.arrivalPoint;
    const latlngs = pathLL ?? [
      [dPt?.lat ?? start[0], dPt?.lon ?? start[1]],
      [aPt?.lat ?? end[0],   aPt?.lon ?? end[1]],
    ];

    return {
      mode:        modeId,
      lineName:    leg.routeOptions?.[0]?.name ?? modeId,
      lineId,
      colour,
      dashed:      isWalk,
      latlngs,
      duration:    leg.duration ?? 0,
      from:        _shortName(dPt?.commonName),
      to:          _shortName(aPt?.commonName),
      isDisrupted,
    };
  });

  return { duration: journey.duration ?? 0, legs };
};
