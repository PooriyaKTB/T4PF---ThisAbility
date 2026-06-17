import { userProfile, state, moduleContent, saveState } from '../state.js';
import { showToast, syncModeButtons } from '../ui.js';
import { buildRoute, updateMapAlert, updateMapStart, updateMapEnd } from '../routing.js';
import { setStartMarker, clearStartMarker, setEndMarker, clearEndMarker, centreOn, enablePickMode, disablePickMode, markAllAvoided, markAllVerified } from '../map.js';
import { createAutocomplete } from '../autocomplete.js';

const surroundAlertsData = [
  { icon: 'fa-arrow-down', color: 'var(--warning)', label: 'Kerb drop',      text: 'Steep kerb drop in 14m — haptic alert queued for your profile.' },
  { icon: 'fa-users',      color: 'var(--primary)', label: 'Crowd density',  text: 'High crowd density ahead (68%) — quiet alternative available in 30m.' },
  { icon: 'fa-compress',   color: 'var(--warning)', label: 'Narrow passage', text: 'Narrow passage confirmed on route — wheelchair clearance 0.9m.' },
];

export const init = () => {
  const destinationInput = document.getElementById('destination');
  const locationInput    = document.getElementById('current-location');
  const routeState       = document.getElementById('route-state');
  const alertStatus      = document.getElementById('alert-status');
  const crowdCount       = document.getElementById('crowd-count');
  const clearFromBtn     = document.getElementById('clear-from-btn');
  const clearToBtn       = document.getElementById('clear-to-btn');

  const _syncClearFrom = () => { clearFromBtn.hidden = !locationInput.value; };
  const _syncClearTo   = () => { clearToBtn.hidden   = !destinationInput.value; };

  clearFromBtn.addEventListener('click', () => {
    locationInput.value = '';
    state.routeStart = null;
    updateMapStart('');
    clearStartMarker();
    _syncClearFrom();
    locationInput.focus();
  });

  clearToBtn.addEventListener('click', () => {
    destinationInput.value = '';
    state.routeEnd = null;
    updateMapEnd('');
    updateMapAlert(state.selectedMode, '');
    clearEndMarker();
    _syncClearTo();
    destinationInput.focus();
  });

  document.getElementById('gps-btn').addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.');
      return;
    }

    const gpsBtn = document.getElementById('gps-btn');
    const orig   = gpsBtn.innerHTML;

    gpsBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i>';
    gpsBtn.disabled  = true;

    const _resetBtn = () => { gpsBtn.innerHTML = orig; gpsBtn.disabled = false; };

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        state.routeStart = [lat, lng];
        centreOn([lat, lng], 16);
        setStartMarker([lat, lng], 'Your location');

        // Reverse-geocode via Nominatim (free, no key required)
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { 'Accept-Language': 'en-GB' } }
          );
          const data = await res.json();
          const a    = data.address || {};
          const label = [a.road, a.suburb || a.neighbourhood || a.city_district]
            .filter(Boolean).join(', ') || data.display_name.split(',')[0];
          locationInput.value = label;
          updateMapStart(label);
        } catch (_) {
          locationInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          updateMapStart(locationInput.value);
        }
        _syncClearFrom();
        showToast('Current location set.');
        _resetBtn();
      },
      (err) => {
        const msgs = {
          1: 'Location access denied — enable it in your browser settings.',
          2: 'Location unavailable. Check your connection and try again.',
          3: 'Location request timed out. Try again.',
        };
        showToast(msgs[err.code] || 'Could not get your location.');
        _resetBtn();
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });

  document.getElementById('swap-btn').addEventListener('click', () => {
    const fromEl = locationInput;
    const toEl   = destinationInput;
    const tmpVal = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value   = tmpVal;
    const tmpCoords  = state.routeStart;
    state.routeStart = state.routeEnd;
    state.routeEnd   = tmpCoords;
    updateMapStart(fromEl.value);
    updateMapEnd(toEl.value);
    _syncClearFrom();
    _syncClearTo();
  });

  locationInput.addEventListener('input', (e) => {
    state.routeStart = null;
    updateMapStart(e.target.value);
    _syncClearFrom();
  });

  destinationInput.addEventListener('input', (e) => {
    state.routeEnd = null;
    updateMapEnd(e.target.value);
    updateMapAlert(state.selectedMode, e.target.value);
    _syncClearTo();
  });

  document.querySelectorAll('.mode-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.selectedMode = chip.dataset.mode;
      syncModeButtons();
      updateMapAlert(state.selectedMode, destinationInput.value);
      showToast(`${state.selectedMode} preference selected.`);
    });
  });

  document.getElementById('route-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button[type=submit]');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = state.selectedMode === 'AI Agent'
      ? '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> AI agent analysing profile &amp; live conditions…'
      : '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Calculating route…';
    routeState.textContent = 'Routing…';
    await buildRoute(destinationInput.value, state.selectedMode);
    btn.disabled = false;
    btn.innerHTML = orig;
  });

  document.getElementById('avoid-all-btn').addEventListener('click', () => {
    markAllAvoided();
    state.selectedMode = userProfile.mobility;
    syncModeButtons();
    buildRoute(destinationInput.value || 'Waterloo', state.selectedMode);
    alertStatus.textContent = 'Rerouted';
    alertStatus.classList.replace('warning', 'info');
  });

  document.getElementById('verify-all-btn').addEventListener('click', () => {
    markAllVerified();
    state.verifiedReports += 1;
    crowdCount.textContent = state.verifiedReports;
    saveState();
    alertStatus.textContent = 'Verified';
    alertStatus.classList.replace('warning', 'info');
    showToast('Thanks. Your anonymous verification improved route confidence.');
  });

  document.querySelectorAll('.module-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const module = moduleContent[btn.dataset.module];
      document.querySelectorAll('.module-btn').forEach((b) => b.classList.toggle('active', b === btn));
      document.getElementById('module-title').textContent = module.title;
      document.getElementById('module-copy').textContent  = module.copy;
      const surroundCard  = document.getElementById('surround-scan-card');
      const moduleDetail  = document.getElementById('module-detail');
      const isAlerts = btn.dataset.module === 'alerts';
      surroundCard.style.display  = isAlerts ? 'block' : 'none';
      if (moduleDetail) moduleDetail.style.display = isAlerts ? 'none' : 'block';
      if (!isAlerts) document.getElementById('surround-alerts-list').innerHTML = '';
      showToast(`${module.title} selected.`);
    });
  });

  /* ── Address autocomplete (Nominatim) ───────────── */
  createAutocomplete(
    locationInput,
    (label, lat, lng) => {
      state.routeStart = [lat, lng];
      updateMapStart(label);
      setStartMarker([lat, lng], label);
      centreOn([lat, lng], 15);
      _syncClearFrom();
    }
  );

  createAutocomplete(
    destinationInput,
    (label, lat, lng) => {
      state.routeEnd = [lat, lng];
      updateMapEnd(label);
      updateMapAlert(state.selectedMode, label);
      setEndMarker([lat, lng], label);
      _syncClearTo();
    }
  );

  /* ── Tap-on-map pick mode ── */
  const pickBar      = document.getElementById('map-pick-bar');
  const pickFromBtn  = document.getElementById('pick-from-btn');
  const pickToBtn    = document.getElementById('pick-to-btn');
  const pickCloseBtn = document.getElementById('pick-close-btn');

  const _setPickActive = (mode) => {
    pickFromBtn.classList.toggle('active', mode === 'from');
    pickToBtn.classList.toggle('active',   mode === 'to');
  };

  const _onMapPick = async (mode, lat, lng) => {
    const fromEl = document.getElementById('current-location');
    const toEl   = document.getElementById('destination');
    const label  = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { 'Accept-Language': 'en-GB' } });
      const data = await res.json();
      const a    = data.address || {};
      const nice = [a.road, a.suburb || a.neighbourhood || a.city_district].filter(Boolean).join(', ') || data.display_name.split(',')[0];
      if (mode === 'from') { fromEl.value = nice; state.routeStart = [lat, lng]; updateMapStart(nice); setStartMarker([lat, lng], nice); }
      else                  { toEl.value   = nice; state.routeEnd   = [lat, lng]; updateMapEnd(nice);   setEndMarker([lat, lng], nice); }
    } catch {
      if (mode === 'from') { fromEl.value = label; state.routeStart = [lat, lng]; }
      else                  { toEl.value   = label; state.routeEnd   = [lat, lng]; }
    }
    _syncClearFrom();
    _syncClearTo();
    _setPickActive(mode === 'from' ? 'to' : null);
    showToast(mode === 'from' ? 'Start set — now tap to set destination.' : 'Destination set.');
    if (mode === 'from') enablePickMode('to', _onMapPick);
    else pickBar.hidden = true;
  };

  // Show pick bar when map area is tapped without pick mode active
  document.getElementById('leaflet-map').addEventListener('click', () => {
    if (pickBar.hidden) { pickBar.hidden = false; _setPickActive('from'); enablePickMode('from', _onMapPick); }
  }, { capture: false });

  pickFromBtn.addEventListener('click', () => { _setPickActive('from'); enablePickMode('from', _onMapPick); });
  pickToBtn.addEventListener('click',   () => { _setPickActive('to');   enablePickMode('to',   _onMapPick); });
  pickCloseBtn.addEventListener('click', () => { pickBar.hidden = true; disablePickMode(); });

  document.getElementById('surround-scan-btn').addEventListener('click', () => {
    const list = document.getElementById('surround-alerts-list');
    const btn  = document.getElementById('surround-scan-btn');
    list.innerHTML = '';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Scanning…';

    surroundAlertsData.forEach(({ icon, color, label, text }, i) => {
      setTimeout(() => {
        const item = document.createElement('div');
        item.className = 'scan-alert-item';
        item.style.borderLeft = `3px solid ${color}`;
        item.innerHTML = `<i class="fas ${icon}" style="color:${color}; margin-right:6px;" aria-hidden="true"></i><strong>${label}:</strong> ${text}`;
        list.appendChild(item);
        showToast(`${label} — ${text.split('—')[0].trim()}`);
      }, (i + 1) * 1000);
    });

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-wifi" aria-hidden="true"></i> Rescan area';
      showToast('Scan complete. 3 proximity alerts detected on your route.');
    }, (surroundAlertsData.length + 1) * 1000);
  });
};
