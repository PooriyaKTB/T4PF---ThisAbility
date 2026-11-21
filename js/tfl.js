/* TfL Unified API — line disruption status.
   Replaces the deprecated /StopPoint/{id}/Equipment endpoint.
   Free, no API key required. Returns which lines currently have disruptions. */

const BASE = 'https://api.tfl.gov.uk';
const MODES = 'tube,dlr,overground,elizabeth-line';

/* Severity 10 = Good Service. Anything below means a disruption. */
const DISRUPTED_SEVERITY = 10;

/* Approximate centre coordinates for each line (used as fault marker location) */
const LINE_CENTRES = {
  jubilee:              [51.5014, -0.1419],
  central:              [51.5154, -0.1016],
  victoria:             [51.5036, -0.1143],
  northern:             [51.5033, -0.1195],
  bakerloo:             [51.5225, -0.1492],
  piccadilly:           [51.5101, -0.1343],
  district:             [51.4940, -0.1773],
  circle:               [51.5127, -0.1342],
  'hammersmith-city':   [51.5232, -0.1567],
  metropolitan:         [51.5540, -0.2795],
  'waterloo-city':      [51.5032, -0.1136],
  elizabeth:            [51.5154, -0.0814],
  dlr:                  [51.5090, -0.0134],
  overground:           [51.5650, -0.0750],
};

export const fetchLiftFaults = async () => {
  try {
    const res = await fetch(
      `${BASE}/Line/Mode/${MODES}/Status`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return [];
    const lines = await res.json();

    const disrupted = lines.filter((line) =>
      line.lineStatuses?.some((s) => s.statusSeverity < DISRUPTED_SEVERITY)
    );

    return disrupted.map((line) => ({
      name: line.name,
      latlng: LINE_CENTRES[line.id] ?? [51.5074, -0.1278],
    }));
  } catch {
    return [];
  }
};
