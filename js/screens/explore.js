import { userProfile, state, moduleContent } from '../state.js';
import { showToast, syncModeButtons } from '../ui.js';
import { buildRoute, updateMapAlert, updateMapStart, updateMapEnd } from '../routing.js';
import { initMap } from '../map.js';

const surroundAlertsData = [
  { icon: 'fa-arrow-down', color: 'var(--warning)', label: 'Kerb drop',      text: 'Steep kerb drop in 14m — haptic alert queued for your profile.' },
  { icon: 'fa-users',      color: 'var(--primary)', label: 'Crowd density',  text: 'High crowd density ahead (68%) — quiet alternative available in 30m.' },
  { icon: 'fa-compress',   color: 'var(--warning)', label: 'Narrow passage', text: 'Narrow passage confirmed on route — wheelchair clearance 0.9m.' },
];

export const init = () => {
  initMap();

  const destinationInput = document.getElementById('destination');
  const routeState       = document.getElementById('route-state');
  const alertStatus      = document.getElementById('alert-status');
  const crowdCount       = document.getElementById('crowd-count');

  document.getElementById('gps-btn').addEventListener('click', () => {
    const loc = 'London, Pancras Square';
    document.getElementById('current-location').value = loc;
    updateMapStart(loc);
    showToast('Location set to London, Pancras Square.');
  });

  document.getElementById('current-location').addEventListener('input', (e) => {
    updateMapStart(e.target.value);
  });

  destinationInput.addEventListener('input', (e) => {
    updateMapEnd(e.target.value);
    updateMapAlert(state.selectedMode, e.target.value);
  });

  document.querySelectorAll('.mode-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.selectedMode = chip.dataset.mode;
      syncModeButtons();
      updateMapAlert(state.selectedMode, destinationInput.value);
      showToast(`${state.selectedMode} preference selected.`);
    });
  });

  document.getElementById('route-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button[type=submit]');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = state.selectedMode === 'AI Agent'
      ? '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> AI agent analysing profile &amp; live conditions…'
      : '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Calculating route…';
    routeState.textContent = 'Routing…';
    setTimeout(() => {
      buildRoute(destinationInput.value, state.selectedMode);
      btn.disabled = false;
      btn.innerHTML = orig;
    }, 2000);
  });

  document.getElementById('reroute-btn').addEventListener('click', () => {
    state.selectedMode = userProfile.mobility;
    syncModeButtons();
    buildRoute(destinationInput.value || 'Waterloo', state.selectedMode);
    alertStatus.textContent = 'Rerouted';
    alertStatus.classList.replace('warning', 'info');
  });

  document.getElementById('verify-btn').addEventListener('click', () => {
    state.verifiedReports += 1;
    crowdCount.textContent = state.verifiedReports;
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
      const surroundCard = document.getElementById('surround-scan-card');
      const isAlerts = btn.dataset.module === 'alerts';
      surroundCard.style.display = isAlerts ? 'block' : 'none';
      if (!isAlerts) document.getElementById('surround-alerts-list').innerHTML = '';
      showToast(`${module.title} selected.`);
    });
  });

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
