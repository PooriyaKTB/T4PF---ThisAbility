import { userProfile } from '../state.js';
import { showToast } from '../ui.js';

const runGuardianSim = (type) => {
  if (!document.getElementById('guardian-toggle').classList.contains('on')) {
    showToast('Guardian is paused. Re-enable it to run simulations.');
    return;
  }

  const resultEl = document.getElementById('guardian-sim-result');
  resultEl.innerHTML = '';
  const contact = userProfile.guardian || 'your emergency contact';

  const scenarios = {
    fall: {
      color: 'var(--danger)',
      steps: [
        { delay: 0,    icon: 'fa-circle-exclamation', msg: 'Sudden impact detected by gyroscope — possible fall or tip-over.' },
        { delay: 1400, icon: 'fa-map-pin',            msg: 'Compiling GPS location, current route, and access profile…' },
        { delay: 2800, icon: 'fa-user-shield',        msg: `Alerting ${contact} — 30-second cancel window active.` },
        { delay: 4200, icon: 'fa-check-circle',       msg: 'Fall alert chain complete. Responder has route context.' },
      ],
    },
    anxiety: {
      color: 'var(--warning)',
      steps: [
        { delay: 0,    icon: 'fa-brain',        msg: 'Sensory overload pattern detected — repeated distress gesture recognised.' },
        { delay: 1400, icon: 'fa-route',        msg: 'Identifying quieter route alternative with lower sensory load…' },
        { delay: 2800, icon: 'fa-user-shield',  msg: `Low-key alert sent to ${contact} — no alarm, soft check-in.` },
        { delay: 4200, icon: 'fa-check-circle', msg: 'Anxiety alert complete. Quiet support chain notified.' },
      ],
    },
    panic: {
      color: '#7c3aed',
      steps: [
        { delay: 0,    icon: 'fa-heart-pulse',  msg: 'Medical episode / SOS triggered by user.' },
        { delay: 1400, icon: 'fa-shield',       msg: 'Sending encrypted medical note and location to emergency services…' },
        { delay: 2800, icon: 'fa-user-shield',  msg: `${contact} and emergency services receiving your access and allergy profile.` },
        { delay: 4200, icon: 'fa-check-circle', msg: 'SOS chain complete. Responders have full context.' },
      ],
    },
  };

  const { steps, color } = scenarios[type];
  steps.forEach(({ delay, icon, msg }) => {
    setTimeout(() => {
      showToast(msg);
      const item = document.createElement('div');
      item.className = 'scan-alert-item';
      item.style.borderLeft = `3px solid ${color}`;
      item.innerHTML = `<i class="fas ${icon}" style="color:${color};margin-right:6px;" aria-hidden="true"></i>${msg}`;
      resultEl.appendChild(item);
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, delay);
  });
  setTimeout(() => { document.getElementById('route-state').textContent = 'SOS ready'; }, 4200);
};

export const init = () => {
  const guardianState = document.getElementById('guardian-state');

  document.getElementById('guardian-toggle').addEventListener('click', () => {
    const isOn = document.getElementById('guardian-toggle').classList.contains('on');
    guardianState.textContent = isOn ? 'Armed' : 'Paused';
    showToast(isOn
      ? 'Guardian armed. Fall detection is active.'
      : 'Guardian paused. Re-enable for continuous safety monitoring.');
  });

  document.getElementById('fall-test').addEventListener('click',    () => runGuardianSim('fall'));
  document.getElementById('anxiety-test').addEventListener('click', () => runGuardianSim('anxiety'));
  document.getElementById('panic-test').addEventListener('click',   () => runGuardianSim('panic'));
};
