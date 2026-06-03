import { userProfile } from '../state.js';
import { showToast } from '../ui.js';

export const init = () => {
  const bleOrb  = document.getElementById('ble-orb');
  const bleTitle = document.getElementById('ble-title');

  document.getElementById('ble-toggle').addEventListener('click', () => {
    const isOn = document.getElementById('ble-toggle').classList.contains('on');
    bleOrb.classList.toggle('paused', !isOn);
    bleTitle.textContent = isOn ? 'CapAble ID Broadcasting' : 'CapAble ID Paused';
    showToast(isOn
      ? 'CapAble ID broadcasting to nearby venues.'
      : 'CapAble ID paused — venues cannot detect your profile.');
  });

  document.getElementById('simulate-venue').addEventListener('click', () => {
    const broadcasting = document.getElementById('ble-toggle').classList.contains('on');
    const resultEl = document.getElementById('venue-scan-result');
    resultEl.innerHTML = '';

    if (!broadcasting) {
      resultEl.innerHTML = `<div class="card" style="border-left:3px solid var(--danger);padding:12px;margin-top:8px;animation:screenFadeIn 0.22s ease;">
        <p style="color:var(--danger);font-size:0.8rem;font-weight:800;"><i class="fas fa-ban" style="margin-right:6px;"></i>Venue scan blocked</p>
        <p class="muted" style="margin-top:4px;">BLE broadcasting is paused. Enable it to allow venues to read your access hints.</p>
      </div>`;
      showToast('Venue scan blocked — BLE broadcasting is paused.');
      return;
    }

    const btn = document.getElementById('simulate-venue');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Scanning…';
    setTimeout(() => showToast('Venue BLE reader detected your CapAble ID…'), 0);
    setTimeout(() => showToast('Verifying profile consent settings…'), 1000);

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-building" aria-hidden="true"></i> Simulate venue scan';
      const allergyRow = userProfile.allergyShareVenue && userProfile.allergyCategory
        ? `<div style="display:flex;justify-content:space-between;"><span class="muted">Allergy</span><strong>${userProfile.allergyCategory}${userProfile.allergyDescription ? ' — ' + userProfile.allergyDescription : ''}</strong></div>`
        : '';
      const notShared = userProfile.allergyShareVenue
        ? 'Medical record, name, ID, and location — locked on-device.'
        : 'Medical record, name, ID, location, and health notes — locked on-device.';
      resultEl.innerHTML = `<div class="card" style="border-left:3px solid var(--success);padding:12px;margin-top:8px;animation:screenFadeIn 0.22s ease;">
        <p style="color:var(--success);font-weight:800;font-size:0.8rem;margin-bottom:8px;"><i class="fas fa-check-circle" style="margin-right:6px;"></i>Venue received your access hints</p>
        <div style="display:grid;gap:6px;font-size:0.78rem;">
          <div style="display:flex;justify-content:space-between;"><span class="muted">Access need</span><strong>${userProfile.disability || 'Mobility'}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span class="muted">Mobility</span><strong>${userProfile.mobility} access</strong></div>
          <div style="display:flex;justify-content:space-between;"><span class="muted">Sensory</span><strong>${userProfile.sensory} guidance</strong></div>
          <div style="display:flex;justify-content:space-between;"><span class="muted">Alerts</span><strong>${userProfile.alert}</strong></div>
          ${allergyRow}
        </div>
        <div style="margin-top:8px;padding:8px;background:#fee2e2;border-radius:8px;font-size:0.72rem;color:var(--danger);">
          <i class="fas fa-lock" style="margin-right:4px;"></i><strong>Not shared:</strong> ${notShared}
        </div>
      </div>`;
      showToast('Venue received your access hints. Sensitive data protected.');
      setTimeout(() => resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }, 2000);
  });
};
