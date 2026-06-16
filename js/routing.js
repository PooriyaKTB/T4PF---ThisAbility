import { userProfile, state } from './state.js';
import { showToast } from './ui.js';
import { drawLegs, drawRoute, setStartMarker, setEndMarker, updateAlertCard } from './map.js';
import { journeyTfL } from './tfl-journey.js';
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
  if (!data.length) throw new Error(`Not found: ${query}`);
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
};

/* ── Map-alert helpers (used by explore.js mode chips) ── */
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
    if (d.includes('bank') || d.includes('stratford'))
      return { icon: 'fa-circle-check', text: 'fully step-free', color: 'var(--success)' };
    if (d.includes('waterloo') || d.includes('canary') || d.includes('paddington'))
      return { icon: 'fa-triangle-exclamation', text: 'lift outage', color: 'var(--danger)' };
  }
  if (mode === 'Low crowd' && (d.includes('victoria') || d.includes('oxford')))
    return { icon: 'fa-users', text: 'very high crowd', color: 'var(--danger)' };
  return base;
};

export const updateMapAlert = (mode, dest = '') => {
  const el = document.getElementById('map-alert-tag');
  if (!el) return;
  const { icon, text, color } = getMapAlertData(mode, dest);
  el.style.color = color;
  el.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i> ${text}`;
};

export const updateMapStart = (val) => {
  const el = document.getElementById('map-start');
  if (el && val.trim())
    el.textContent = val.trim().length > 18 ? val.trim().slice(0, 17) + '…' : val.trim();
};

export const updateMapEnd = (val) => {
  const el = document.getElementById('map-destination');
  if (el)
    el.textContent = val.trim().length > 14 ? val.trim().slice(0, 13) + '…' : (val.trim() || 'Destination');
};

/* ── Step builders ── */
const LEG_ICONS = {
  walking:          'fa-person-walking',
  tube:             'fa-train-subway',
  dlr:              'fa-train-subway',
  overground:       'fa-train',
  'elizabeth-line': 'fa-train',
  bus:              'fa-bus',
  'national-rail':  'fa-train',
};

const _legSteps = (legs) =>
  legs.map((leg) => {
    const icon = LEG_ICONS[leg.mode] ?? 'fa-route';
    const warn = leg.isDisrupted ? 'Disruption reported' : null;
    if (leg.mode === 'walking') {
      return [icon, `Walk ${leg.duration} min${leg.to ? ` to ${leg.to}` : ''}`, warn];
    }
    const line = leg.lineName && leg.lineName !== leg.mode
      ? `${leg.lineName} line`
      : leg.mode;
    return [icon, `${line} → ${leg.to} (${leg.duration} min)`, warn];
  });

const _modeNote = (mode, hasDisruption) => {
  const notes = {
    'Step-free': 'Step-free routing — lifts prioritised, manual ramps flagged.',
    'Low crowd': 'Fewest interchanges to minimise crowded platforms.',
    'Quiet':     'Minimal walking legs, quieter stations preferred.',
    'Fastest':   'Fastest combination of tube, bus, and walking.',
    'AI Agent':  `AI Agent optimised for your ${userProfile.disability || 'access'} profile with live data.`,
  };
  return (notes[mode] ?? '') + (hasDisruption ? ' ⚠ Disruption on one or more legs.' : '');
};

const _renderResult = (title, summary, steps) => {
  document.getElementById('route-title').textContent     = title;
  document.getElementById('route-summary').textContent   = summary;
  document.getElementById('route-steps').innerHTML       = steps
    .map(([icon, text, warn]) => `<li>
      <span class="step-icon"${warn ? ' style="background:#fef3c7;color:var(--warning)"' : ''}>
        <i class="fas ${icon}" aria-hidden="true"></i>
      </span>
      <span>${text}${warn ? ` <em style="color:var(--warning);font-size:0.7rem"> — ${warn}</em>` : ''}</span>
    </li>`).join('');
  document.getElementById('route-result').classList.add('visible');
  document.getElementById('route-state').textContent     = 'Route set';
};

/* ── Main buildRoute ── */
export const buildRoute = async (destination, mode) => {
  const dest = destination.trim() || 'Waterloo';
  const from = document.getElementById('current-location')?.value.trim() || 'London Bridge';

  updateMapStart(from);
  updateMapAlert(mode, dest);
  updateMapEnd(dest);

  try {
    const startLL = state.routeStart ?? await _geocode(from);
    const endLL   = state.routeEnd   ?? await _geocode(dest);

    // ── Primary: TfL Journey Planner (real multi-modal, mode-aware) ──
    try {
      const { duration, legs } = await journeyTfL(startLL, endLL, mode);

      drawLegs(legs);
      // Place markers at true journey endpoints (TfL snaps to nearest stop)
      const jStart = legs[0]?.latlngs?.[0] ?? startLL;
      const jEnd   = legs[legs.length - 1]?.latlngs?.at(-1) ?? endLL;
      setStartMarker(jStart, from);
      setEndMarker(jEnd, dest);

      const hasDisruption = legs.some((l) => l.isDisrupted);
      _renderResult(
        mode === 'AI Agent' ? `AI-optimised route to ${dest}` : `${mode} route to ${dest}`,
        `${duration} min · ${legs.length} leg${legs.length === 1 ? '' : 's'}. ${_modeNote(mode, hasDisruption)}`,
        _legSteps(legs)
      );

      // Update alert card with route-specific disruptions
      const disruptedLines = legs.filter((l) => l.isDisrupted).map((l) => l.lineName);
      updateAlertCard(disruptedLines, true);

      showToast(`${duration} min · live TfL route drawn.`);

    } catch (tflErr) {
      // ── Fallback 1: OSRM walking (no public transport, but real geometry) ──
      console.warn('TfL Journey Planner failed:', tflErr.message);
      showToast(`TfL unavailable — trying walking route…`);
      const { latlngs, distanceM, durationS } = await routeOSRM(startLL, endLL);
      drawRoute(latlngs);
      setStartMarker(startLL, from);
      setEndMarker(endLL, dest);
      _renderResult(
        `Walking route to ${dest}`,
        `${fmtDuration(durationS)} · ${fmtDistance(distanceM)}. Live TfL routing unavailable.`,
        [['fa-person-walking', `Walk to ${dest}`]]
      );
      showToast(`${fmtDuration(durationS)} walking — TfL data unavailable.`);
    }

  } catch (err) {
    // ── Fallback 2: static narrative ──
    console.warn('Routing failed entirely:', err.message);
    _staticFallback(from, dest, mode);
  }
};

const _staticFallback = (from, dest, mode) => {
  const isAI = mode === 'AI Agent';
  const mins = isAI ? 24 : mode === 'Fastest' ? 21 : mode === 'Quiet' ? 29 : 26;
  _renderResult(
    isAI ? `AI-optimised route to ${dest}` : `${mode} route to ${dest}`,
    `~${mins} min estimated journey. Live routing unavailable.`,
    [
      ['fa-train',          `Travel toward ${dest} — ${mode.toLowerCase()} preference applied.`],
      ['fa-wheelchair',     'Step-free interchange prioritised where possible.'],
      ['fa-flag-checkered', `Arrive at ${dest}.`],
    ]
  );
  showToast('Live routing unavailable — showing estimated route.');
};
