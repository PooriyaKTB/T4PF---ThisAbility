/* ═══════════════════════════════════════════════════
   map.js — Leaflet map module
   Exposes initMap, refreshMap, and marker/route helpers
   used progressively by Steps 2–6.
   ═══════════════════════════════════════════════════ */

const LONDON = [51.5074, -0.1278];

let _map         = null;
let _startMarker = null;
let _endMarker   = null;
let _routeLine   = null;
let _faultLayer  = null;

/* ── Tile layer ──────────────────────────────────── */
const OSM_TILE   = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_CREDIT = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

/* ── Circle marker styles ────────────────────────── */
const START_STYLE = { radius: 9, fillColor: '#2563eb', color: '#fff', weight: 2.5, fillOpacity: 1 };
const END_STYLE   = { radius: 9, fillColor: '#0f766e', color: '#fff', weight: 2.5, fillOpacity: 1 };
const FAULT_STYLE = { radius: 7, fillColor: '#ef4444', color: '#fff', weight: 2,   fillOpacity: 0.9 };

/* ── Init ────────────────────────────────────────── */
export const initMap = () => {
  if (_map) return _map;

  _map = L.map('leaflet-map', {
    center: LONDON,
    zoom: 13,
    zoomControl: false,       // too large for phone frame; pinch/scroll still works
    attributionControl: true,
  });

  L.tileLayer(OSM_TILE, {
    attribution: OSM_CREDIT,
    maxZoom: 19,
  }).addTo(_map);

  _faultLayer = L.layerGroup().addTo(_map);

  return _map;
};

export const getMap    = () => _map;
export const refreshMap = () => { if (_map) setTimeout(() => _map.invalidateSize(), 60); };

/* ── Start / end markers ─────────────────────────── */
export const setStartMarker = (latlng, label = 'Start') => {
  if (_startMarker) _startMarker.remove();
  _startMarker = L.circleMarker(latlng, START_STYLE)
    .bindPopup(`<strong>Start</strong><br>${label}`)
    .addTo(_map);
};

export const setEndMarker = (latlng, label = 'Destination') => {
  if (_endMarker) _endMarker.remove();
  _endMarker = L.circleMarker(latlng, END_STYLE)
    .bindPopup(`<strong>Destination</strong><br>${label}`)
    .addTo(_map);
};

/* ── Route polyline ──────────────────────────────── */
export const drawRoute = (latlngs, colour = '#2563eb') => {
  if (_routeLine) _routeLine.remove();
  _routeLine = L.polyline(latlngs, {
    color: colour, weight: 5, opacity: 0.85, lineJoin: 'round',
  }).addTo(_map);
  _map.fitBounds(_routeLine.getBounds(), { padding: [24, 24] });
};

export const clearRoute = () => {
  if (_routeLine)   { _routeLine.remove();   _routeLine   = null; }
  if (_startMarker) { _startMarker.remove(); _startMarker = null; }
  if (_endMarker)   { _endMarker.remove();   _endMarker   = null; }
};

/* ── Fault markers (TfL — Step 4) ───────────────── */
export const clearFaults = () => { if (_faultLayer) _faultLayer.clearLayers(); };

export const addFaultMarker = (latlng, name, severity = 'red') => {
  if (!_faultLayer) return;
  L.circleMarker(latlng, FAULT_STYLE)
    .bindPopup(`<strong>⚠ Lift / escalator fault</strong><br>${name}`)
    .addTo(_faultLayer);
};

/* ── Centre map ──────────────────────────────────── */
export const centreOn = (latlng, zoom = 15) => {
  if (_map) _map.setView(latlng, zoom);
};
