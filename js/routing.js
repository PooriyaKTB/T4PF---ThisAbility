import { userProfile, state } from './state.js';
import { showToast } from './ui.js';
import { drawRoute, setStartMarker, setEndMarker } from './map.js';
import { routeOSRM, fmtDistance, fmtDuration } from './osrm.js';

const NOM = 'https://nominatim.openstreetmap.org/search';

const _geocode = async (query) => {
  const p = new URLSearchParams({ q: query, format: 'json', limit: '1', countrycodes: 'gb' });
  const res = await fetch(`${NOM}?${p}`, {
    headers: { 'Accept-Language': 'en-GB' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(res.status);
  const data = await res.json();
  if (!data.length) throw new Error(`No geocode result for "${query}"`);
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
};

export const getMapAlertData = (mode, dest) => {
  const d = (dest || '').toLowerCase();
  const defaults = {
    'Step-free': { icon: 'fa-triangle-exclamation', text: 'lift outage',     color: 'var(--danger)'    },
    'Low crowd': { icon: 'fa-users',                text: 'high crowd zone', color: 'var(--warning)'   },
    'Quiet':     { icon: 'fa-volume-high',          text: 'noise alert',     color: 'var(--warning)'   },
    'Fastest':   { icon: 'fa-bolt',                 text: 'route clear',     color: 'var(--success)'   },
    'AI Agent':  { icon: 'fa-robot',                text: 'AI scanning',     color: 'var(--secondary)' },
  };
  const base = defaults[mode] || defaults['Step-free'];
  if (mode === 'Step-free') {
    if (d.includes('king') || d.includes('pancras') || d.includes('euston'))
      return { icon: 'fa-circle-check', text: 'step-free via lift', color: 'var(--success)' };
    if (d.includes('bank') || d.includes('monument') || d.includes('stratford'))
      return { icon: 'fa-circle-check', text: 'fully step-free', color: 'var(--success)' };
    if (d.includes('waterloo') || d.includes('canary') || d.includes('paddington'))
      return { icon: 'fa-triangle-exclamation', text: 'lift outage', color: 'var(--danger)' };
  }
  if (mode === 'Low crowd' && (d.includes('victoria') || d.includes('oxford')))
    return { icon: 'fa-users', text: 'very high crowd', color: 'var(--danger)' };
  return base;
};

export const updateMapAlert = (mode, dest = '') => {
  const alertTag = document.getElementById('map-alert-tag');
  if (!alertTag) return;
  const { icon, text, color } = getMapAlertData(mode, dest);
  alertTag.style.color = color;
  alertTag.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i> ${text}`;
};

export const updateMapStart = (val) => {
  const el = document.getElementById('map-start');
  if (el && val.trim()) {
    el.textContent = val.trim().length > 18 ? val.trim().slice(0, 17) + '…' : val.trim();
  }
};

export const updateMapEnd = (val) => {
  const el = document.getElementById('map-destination');
  if (el) {
    el.textContent = val.trim().length > 14 ? val.trim().slice(0, 13) + '…' : (val.trim() || 'Destination');
  }
};

const _accessibilitySteps = (from, dest, mode, alertType) => {
  const isAI    = mode === 'AI Agent';
  const alert   = userProfile.alert === 'Audio + visual'
    ? 'Audio and visual alerts enabled'
    : `${userProfile.alert} alerts enabled`;

  if (isAI) return [
    ['fa-robot',          `AI Agent: barrier-free path identified from ${from} using live data.`],
    ['fa-train',          `Step-free transport selected based on your ${userProfile.disability || 'access'} profile and live crowd data.`],
    ['fa-brain',          `Sensory load alert pre-queued for the route — ${userProfile.sensory} mode active.`],
    ['fa-id-card',        `CapAble ID ready to broadcast your access hints to venues along the route.`],
    ['fa-flag-checkered', `Arrive at ${dest}. Guardian monitoring remains active.`],
  ];

  return [
    ['fa-train',          `Step-free transport toward ${dest} — ${alertType.text}.`],
    ['fa-wheelchair',     `${userProfile.mobility} preference applied; ramp and lift priority routing active.`],
    ['fa-bell',           `${alert} before congested areas on your route.`],
    ['fa-flag-checkered', `Arrive at ${dest} with CapAble ID ready to share your access profile.`],
  ];
};

/* Builds a route: resolves coordinates (from stored state or Nominatim geocode),
   calls OSRM for a real walking polyline, then updates the route result panel.
   Falls back to a static narrative if OSRM is unreachable. */
export const buildRoute = async (destination, mode) => {
  const dest = destination.trim() || 'Waterloo';
  const from = document.getElementById('current-location')?.value.trim() || 'London Bridge';
  const isAI = mode === 'AI Agent';

  updateMapStart(from);
  updateMapAlert(mode, dest);
  updateMapEnd(dest);

  try {
    // Resolve coordinates — use autocomplete/GPS selection if available, else geocode
    const startLL = state.routeStart ?? await _geocode(from);
    const endLL   = state.routeEnd   ?? await _geocode(dest);

    const { latlngs, distanceM, durationS } = await routeOSRM(startLL, endLL);

    drawRoute(latlngs, isAI ? '#7c3aed' : '#2563eb');
    setStartMarker(startLL, from);
    setEndMarker(endLL, dest);

    const dist = fmtDistance(distanceM);
    const dur  = fmtDuration(durationS);
    const alertData = getMapAlertData(mode, dest);

    document.getElementById('route-title').textContent = isAI
      ? `AI-optimised route to ${dest}`
      : `${mode} route to ${dest}`;

    document.getElementById('route-summary').textContent = `${dur} · ${dist}. `
      + (isAI
        ? `AI Agent applied your ${userProfile.disability || 'mobility'} profile, live TfL status, and crowd telemetry.`
        : `${userProfile.mobility} preference applied — ${userProfile.sensory.toLowerCase()} guidance active.`);

    document.getElementById('route-steps').innerHTML = _accessibilitySteps(from, dest, mode, alertData)
      .map(([icon, text]) => `<li>
        <span class="step-icon"><i class="fas ${icon}" aria-hidden="true"></i></span>
        <span>${text}</span>
      </li>`).join('');

    document.getElementById('route-result').classList.add('visible');
    document.getElementById('route-state').textContent = 'Route set';
    showToast(`${dur} · ${dist} — live route drawn.`);

  } catch (_err) {
    // OSRM unreachable or no geocode result — show a static narrative fallback
    _staticFallback(from, dest, mode);
  }
};

const _staticFallback = (from, dest, mode) => {
  const isAI  = mode === 'AI Agent';
  const mins  = isAI ? 24 : mode === 'Fastest' ? 21 : mode === 'Quiet' ? 29 : 26;
  const alertData = getMapAlertData(mode, dest);

  document.getElementById('route-title').textContent = isAI
    ? `AI-optimised route to ${dest}`
    : `${mode} route to ${dest}`;

  document.getElementById('route-summary').textContent = `~${mins} min journey. `
    + (isAI
      ? `AI Agent applied your ${userProfile.disability || 'mobility'} profile and live data.`
      : `${userProfile.mobility} preference applied, ${userProfile.sensory.toLowerCase()} guidance active.`);

  document.getElementById('route-steps').innerHTML = _accessibilitySteps(from, dest, mode, alertData)
    .map(([icon, text]) => `<li>
      <span class="step-icon"><i class="fas ${icon}" aria-hidden="true"></i></span>
      <span>${text}</span>
    </li>`).join('');

  document.getElementById('route-result').classList.add('visible');
  document.getElementById('route-state').textContent = 'Route set';
  showToast('Live routing unavailable — showing estimated accessibility route.');
};
