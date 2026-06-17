import { userProfile, state, moduleContent, saveState } from '../state.js';
import { showToast, syncModeButtons } from '../ui.js';
import { buildRoute, updateMapAlert, updateMapStart, updateMapEnd } from '../routing.js';
import { setStartMarker, clearStartMarker, setEndMarker, clearEndMarker, centreOn, setLiveMarker, clearRouteLine, enablePickMode, disablePickMode, markAllAvoided, markAllVerified, saveLastPos } from '../map.js';
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

  const _clearRouteResult = () => {
    clearRouteLine();
    document.getElementById('route-result').classList.remove('visible');
    document.getElementById('route-steps').innerHTML = '';
    routeState.textContent = 'Ready';
  };

  /* ── Shared GPS auto-locate helper ──────────────────────────────────────────
     quiet : no spinner / no toast  (init, after clear)
     force : always update From field even if it already has a value
             (explicit GPS-button tap — user deliberately wants current location) */
  const _autoLocate = (quiet = false, force = false) => {
    if (!navigator.geolocation) {
      if (!quiet) showToast('Geolocation is not supported by your browser.');
      return;
    }

    const gpsBtn = document.getElementById('gps-btn');
    const orig   = gpsBtn.innerHTML;

    if (!quiet) {
      gpsBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i>';
      gpsBtn.disabled  = true;
    }

    const _resetBtn = () => { gpsBtn.innerHTML = orig; gpsBtn.disabled = false; };

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        // Always show live position dot, centre map, and cache position for next load
        setLiveMarker([lat, lng]);
        centreOn([lat, lng], 16);
        saveLastPos([lat, lng]);

        // Fill From only if: field is empty, or it was already showing live GPS location.
        // Never overwrite a manually typed address (even when GPS button is tapped).
        const shouldFill = state.fromIsLive || !locationInput.value.trim();
        if (shouldFill) {
          state.routeStart = [lat, lng];
          state.fromIsLive = true;
          clearStartMarker();

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
        }

        if (!quiet) {
          showToast(shouldFill ? 'Current location set.' : 'Jumped to your location.');
          _resetBtn();
        }
      },
      (err) => {
        if (!quiet) {
          const msgs = {
            1: 'Location access denied — enable it in your browser settings.',
            2: 'Location unavailable. Check your connection and try again.',
            3: 'Location request timed out. Try again.',
          };
          showToast(msgs[err.code] || 'Could not get your location.');
          _resetBtn();
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  /* Clear From → wipe route, re-detect current location */
  clearFromBtn.addEventListener('click', () => {
    locationInput.value = '';
    state.routeStart = null;
    state.fromIsLive = false;
    updateMapStart('');
    clearStartMarker();
    _clearRouteResult();
    _syncClearFrom();
    _autoLocate(false, false);
  });

  clearToBtn.addEventListener('click', () => {
    destinationInput.value = '';
    state.routeEnd = null;
    updateMapEnd('');
    updateMapAlert(state.selectedMode, '');
    clearEndMarker();
    _clearRouteResult();
    _syncClearTo();
    destinationInput.focus();
  });

  /* GPS button: force=true so it always jumps + fills From, even if field has a value */
  document.getElementById('gps-btn').addEventListener('click', () => _autoLocate(false, true));

  /* Swap From ↔ To */
  document.getElementById('swap-btn').addEventListener('click', async () => {
    const fromVal = locationInput.value;
    const toVal   = destinationInput.value;
    if (!fromVal && !toVal) return;

    // Swap field text
    locationInput.value    = toVal;
    destinationInput.value = fromVal;

    // Swap coordinates
    const prevStart = state.routeStart;
    const prevEnd   = state.routeEnd;
    state.routeStart = prevEnd;
    state.routeEnd   = prevStart;

    // If old From was live GPS it's now the destination — reset flag, clear stale start marker
    if (state.fromIsLive) {
      state.fromIsLive = false;
      clearStartMarker();
    }

    // Markers are placed only by routing.js when a route is drawn — clear them here
    clearStartMarker();
    clearEndMarker();

    updateMapStart(toVal);
    updateMapEnd(fromVal);
    updateMapAlert(state.selectedMode, fromVal);
    _syncClearFrom();
    _syncClearTo();

    // Recalculate route if one was already shown
    if (document.getElementById('route-result').classList.contains('visible') && state.routeStart && state.routeEnd) {
      _clearRouteResult();
      await buildRoute(fromVal, state.selectedMode);
      disablePickMode();
      pickBar.hidden = true;
    }
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
    disablePickMode();
    pickBar.hidden = true;
    btn.disabled = false;
    btn.innerHTML = orig;
  });

  document.getElementById('avoid-all-btn').addEventListener('click', () => {
    markAllAvoided();
    state.selectedMode = userProfile.mobility;
    syncModeButtons();
    buildRoute(destinationInput.value, state.selectedMode);
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

  document.querySelector('.modules-disclosure').addEventListener('toggle', (e) => {
    if (e.target.open) {
      setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
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
      const revealedEl = isAlerts ? surroundCard : moduleDetail;
      if (revealedEl) setTimeout(() => revealedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    });
  });

  /* ── Address autocomplete (Nominatim) ───────────── */
  createAutocomplete(
    locationInput,
    (label, lat, lng) => {
      state.routeStart = [lat, lng];
      state.fromIsLive = false;
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
      centreOn([lat, lng], 15);
      _syncClearTo();
    }
  );

  /* ── Tap-on-map pick mode (destination only — From is always typed or GPS) ── */
  const pickBar      = document.getElementById('map-pick-bar');
  const pickToBtn    = document.getElementById('pick-to-btn');
  const pickCloseBtn = document.getElementById('pick-close-btn');

  const _onMapPick = async (mode, lat, lng) => {
    const toEl  = document.getElementById('destination');
    const label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { 'Accept-Language': 'en-GB' } });
      const data = await res.json();
      const a    = data.address || {};
      const nice = [a.road, a.suburb || a.neighbourhood || a.city_district].filter(Boolean).join(', ') || data.display_name.split(',')[0];
      toEl.value = nice; state.routeEnd = [lat, lng]; updateMapEnd(nice); setEndMarker([lat, lng], nice);
    } catch {
      toEl.value = label; state.routeEnd = [lat, lng];
    }
    _syncClearTo();
    pickBar.hidden = true;
    showToast('Destination set.');
  };

  // Map tap → show pick bar and arm destination pick mode (disabled while a route is active)
  document.getElementById('leaflet-map').addEventListener('click', () => {
    if (document.getElementById('route-result').classList.contains('visible')) {
      showToast('Clear the destination to set a new one on the map.');
      return;
    }
    if (pickBar.hidden) { pickBar.hidden = false; enablePickMode('to', _onMapPick); }
  }, { capture: false });

  pickToBtn.addEventListener('click',    () => enablePickMode('to', _onMapPick));
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
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        showToast(`${label} — ${text.split('—')[0].trim()}`);
      }, (i + 1) * 1000);
    });

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-wifi" aria-hidden="true"></i> Rescan area';
      showToast('Scan complete. 3 proximity alerts detected on your route.');
    }, (surroundAlertsData.length + 1) * 1000);
  });

  /* Auto-detect current location on load (silent — no spinner/toast) */
  _autoLocate(true);
};
