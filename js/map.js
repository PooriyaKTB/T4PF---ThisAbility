import { fetchLiftFaults } from './tfl.js';

const LONDON = [51.5074, -0.1278];

let _map         = null;
let _tileLayer   = null;
let _startMarker = null;
let _endMarker   = null;
let _liveMarker  = null;
let _routeLine   = null;
let _legLines    = [];
let _faultLayer  = null;

const _isDark = () => document.querySelector('.phone-frame')?.classList.contains('dark') ?? false;

const TILE_LIGHT  = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_DARK   = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_CREDIT = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';

const START_STYLE = { radius: 9, fillColor: '#2563eb', color: '#fff', weight: 2.5, fillOpacity: 1 };
const END_STYLE   = { radius: 9, fillColor: '#0f766e', color: '#fff', weight: 2.5, fillOpacity: 1 };
const FAULT_STYLE = { radius: 7, fillColor: '#ef4444', color: '#fff', weight: 2,   fillOpacity: 0.9 };

const _create = () => {
  if (_map) {
    _map.invalidateSize();
    return;
  }
  if (typeof L === 'undefined') return;
  const el = document.getElementById('leaflet-map');
  if (!el || el.offsetHeight === 0) return;

  _map = L.map(el, {
    center: LONDON,
    zoom: 13,
    zoomControl: false,
    attributionControl: true,
  });

  _tileLayer = L.tileLayer(_isDark() ? TILE_DARK : TILE_LIGHT, { attribution: TILE_CREDIT, maxZoom: 19 }).addTo(_map);
  _faultLayer = L.layerGroup().addTo(_map);

  // Swap tile theme whenever dark mode is toggled
  const frame = document.querySelector('.phone-frame');
  if (frame) {
    new MutationObserver(() => {
      if (_tileLayer) _tileLayer.setUrl(_isDark() ? TILE_DARK : TILE_LIGHT);
    }).observe(frame, { attributes: true, attributeFilter: ['class'] });
  }

  // Force tile grid recalculation after the container is fully painted.
  // setView (not just invalidateSize) makes Leaflet recalculate tile coords from scratch.
  setTimeout(() => {
    _map.invalidateSize({ animate: false });
    _map.setView(LONDON, 13, { animate: false });
  }, 150);

  // Non-blocking: fetch live TfL disruptions and update alert card
  _loadFaults();
};

const _loadFaults = () => {
  fetchLiftFaults()
    .then((faults) => {
      clearFaults();
      faults.forEach(({ name, latlng }) => addFaultMarker(latlng, name));

      // Fault badge
      const badge = document.getElementById('fault-badge');
      if (badge) {
        if (faults.length === 0) { badge.hidden = true; }
        else {
          badge.querySelector('[data-count]').textContent = faults.length;
          badge.querySelector('[data-plural]').textContent = faults.length === 1 ? '' : 's';
          badge.removeAttribute('hidden');
        }
      }

      // Live Obstacle Alert card — show network-wide disruptions
      updateAlertCard(faults.map((f) => f.name), false);
    })
    .catch(() => {});
};

/* Module-level mark helpers — exported so explore.js can call markAll* from bulk buttons */
export const markVerifiedBtn = (btn) => {
  btn.textContent = 'Verified ✓';
  btn.classList.add('verified');
  btn.disabled = true;
};
export const markAvoidedBtn = (btn) => {
  btn.textContent = 'Avoided ✓';
  btn.classList.add('avoided');
  btn.disabled = true;
};
export const markAllVerified = () =>
  document.querySelectorAll('#alert-body .disruption-verify-btn:not(:disabled)').forEach(markVerifiedBtn);
export const markAllAvoided = () =>
  document.querySelectorAll('#alert-body .disruption-avoid-btn:not(:disabled)').forEach(markAvoidedBtn);

/* Updates the Live Obstacle Alert card with one verify-able row per disrupted line.
   `lines`   — array of disrupted line names (e.g. ['Jubilee', 'Piccadilly'])
   `onRoute` — true when disruptions come from the user's selected route legs */
export const updateAlertCard = (lines, onRoute = false) => {
  const card       = document.getElementById('alert-card');
  const body       = document.getElementById('alert-body');
  const statusChip = document.getElementById('alert-status');
  if (!body) return;

  if (!lines.length) {
    if (card) card.hidden = true;
    return;
  }

  if (card) card.hidden = false;

  // innerHTML replacement destroys old nodes + listeners — fresh buttons each call
  body.innerHTML = lines.map((name) => `
    <div class="disruption-row" data-line="${name}">
      <span class="disruption-info">
        <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
        <span><strong>${name}</strong> — ${onRoute ? 'on your route' : 'reduced service'}</span>
      </span>
      <span class="disruption-row-actions">
        <button class="disruption-verify-btn" aria-label="Verify ${name} disruption">Verify</button>
        <button class="disruption-avoid-btn"  aria-label="Avoid ${name}">Avoid</button>
      </span>
    </div>`).join('');

  body.querySelectorAll('.disruption-verify-btn').forEach((btn) => btn.addEventListener('click', () => markVerifiedBtn(btn)));
  body.querySelectorAll('.disruption-avoid-btn').forEach((btn)  => btn.addEventListener('click', () => markAvoidedBtn(btn)));

  if (statusChip) {
    statusChip.textContent = `${lines.length} disruption${lines.length === 1 ? '' : 's'}`;
    statusChip.className   = 'chip warning';
  }
};

/* Double-rAF: first frame commits CSS class removal to layout engine,
   second frame has stable computed dimensions — safe for Leaflet to measure. */
export const initMap = () => {
  requestAnimationFrame(() => requestAnimationFrame(_create));
};

export const refreshMap = () => {
  if (!_map) { initMap(); return; }
  requestAnimationFrame(() => _map.invalidateSize());
};

export const getMap = () => _map;

/* ── Start / end markers ─────────────────────────── */
export const setStartMarker = (latlng, label = 'Start') => {
  if (!_map) return;
  if (_startMarker) _startMarker.remove();
  _startMarker = L.circleMarker(latlng, START_STYLE)
    .bindPopup(`<strong>Start</strong><br>${label}`)
    .addTo(_map);
};

export const clearStartMarker = () => {
  if (_startMarker) { _startMarker.remove(); _startMarker = null; }
};

/* ── Live user position (pulsing blue dot, independent of route markers) ── */
export const setLiveMarker = (latlng) => {
  if (!_map) return;
  if (_liveMarker) _liveMarker.remove();
  const icon = L.divIcon({
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: '<span class="live-position-dot"></span>',
  });
  _liveMarker = L.marker(latlng, { icon, zIndexOffset: 900 })
    .bindPopup('<strong>You are here</strong>')
    .addTo(_map);
};

export const clearLiveMarker = () => {
  if (_liveMarker) { _liveMarker.remove(); _liveMarker = null; }
};

export const setEndMarker = (latlng, label = 'Destination') => {
  if (!_map) return;
  if (_endMarker) _endMarker.remove();
  _endMarker = L.circleMarker(latlng, END_STYLE)
    .bindPopup(`<strong>Destination</strong><br>${label}`)
    .addTo(_map);
};

export const clearEndMarker = () => {
  if (_endMarker) { _endMarker.remove(); _endMarker = null; }
};

/* ── Route polyline ──────────────────────────────── */
export const drawRoute = (latlngs, colour = '#2563eb') => {
  if (!_map) return;
  if (_routeLine) _routeLine.remove();
  _routeLine = L.polyline(latlngs, {
    color: colour, weight: 5, opacity: 0.85, lineJoin: 'round',
  }).addTo(_map);
  _map.fitBounds(_routeLine.getBounds(), { padding: [24, 24] });
};

/* Draw multiple coloured legs (TfL Journey Planner output).
   Walking legs are rendered as dashed grey lines; transit legs as solid coloured lines. */
export const drawLegs = (legs) => {
  if (!_map) return;
  _legLines.forEach((l) => l.remove());
  _legLines = [];
  if (_routeLine) { _routeLine.remove(); _routeLine = null; }

  const all = [];
  legs.forEach(({ latlngs, colour, dashed }) => {
    if (!latlngs?.length) return;
    const line = L.polyline(latlngs, {
      color:     colour,
      weight:    dashed ? 3 : 5,
      opacity:   dashed ? 0.65 : 0.90,
      dashArray: dashed ? '8 8' : null,
      lineJoin:  'round',
    }).addTo(_map);
    _legLines.push(line);
    all.push(...latlngs);
  });

  if (all.length > 1) {
    _map.fitBounds(L.latLngBounds(all), { padding: [24, 24] });
    // Re-invalidate after bounds change so tiles load at the new zoom level
    setTimeout(() => _map.invalidateSize({ animate: false }), 100);
  }
};

export const clearRoute = () => {
  _legLines.forEach((l) => l.remove());
  _legLines = [];
  if (_routeLine)   { _routeLine.remove();   _routeLine   = null; }
  if (_startMarker) { _startMarker.remove(); _startMarker = null; }
  if (_endMarker)   { _endMarker.remove();   _endMarker   = null; }
};

/* Clears only the polyline(s), leaving markers in place */
export const clearRouteLine = () => {
  _legLines.forEach((l) => l.remove());
  _legLines = [];
  if (_routeLine) { _routeLine.remove(); _routeLine = null; }
};

/* ── Fault markers ───────────────────────────────── */
export const clearFaults = () => { if (_faultLayer) _faultLayer.clearLayers(); };

export const addFaultMarker = (latlng, name) => {
  if (!_faultLayer) return;
  L.circleMarker(latlng, FAULT_STYLE)
    .bindPopup(`<strong>⚠ Service disruption</strong><br>${name}`)
    .addTo(_faultLayer);
};

/* ── Centre map ──────────────────────────────────── */
export const centreOn = (latlng, zoom = 15) => {
  if (_map) _map.setView(latlng, zoom);
};

/* ── Tap-on-map pick mode ────────────────────────── */
let _pickHandler = null;

export const enablePickMode = (mode, onPick) => {
  if (!_map) return;
  if (_pickHandler) _map.off('click', _pickHandler);
  _map.getContainer().style.cursor = 'crosshair';
  _pickHandler = (e) => {
    const { lat, lng } = e.latlng;
    onPick(mode, lat, lng);
    disablePickMode();
  };
  _map.on('click', _pickHandler);
};

export const disablePickMode = () => {
  if (!_map) return;
  if (_pickHandler) { _map.off('click', _pickHandler); _pickHandler = null; }
  _map.getContainer().style.cursor = '';
};
