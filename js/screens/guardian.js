import { userProfile } from '../state.js';
import { showToast } from '../ui.js';
import { isSupported, requestPermission, startDetector, stopDetector } from '../falldetector.js';
import { requestPermission as requestNotifPerm, showNotification } from '../notify.js';

/* source: 'test' (button) | 'sensor' (real DeviceMotion) */
const runGuardianSim = (type, source = 'test') => {
  if (!document.getElementById('guardian-toggle').classList.contains('on')) {
    showToast('Guardian is paused. Re-enable it to run simulations.');
    return;
  }

  const resultEl = document.getElementById('guardian-sim-result');
  resultEl.innerHTML = '';
  const contact = userProfile.guardian || 'your emergency contact';

  if (source === 'sensor') {
    const banner = document.createElement('div');
    banner.className = 'scan-alert-item fall-sensor-banner';
    banner.innerHTML = '<i class="fas fa-circle-exclamation" aria-hidden="true"></i> <strong>REAL FALL DETECTED — sensor triggered</strong>';
    resultEl.appendChild(banner);
  }

  const notifConfig = {
    fall: {
      title:   `⚠ Fall Alert — EquiVerse`,
      body:    `Guardian is alerting ${contact}. Tap to open or cancel.`,
      tag:     'ta-fall',
      actions: [{ action: 'cancel', title: 'Cancel alert' }, { action: 'open', title: 'Open app' }],
    },
    anxiety: {
      title:   `🧠 Sensory Alert — EquiVerse`,
      body:    `Overload pattern detected. Soft check-in sent to ${contact}.`,
      tag:     'ta-anxiety',
      actions: [{ action: 'cancel', title: 'I\'m OK' }, { action: 'open', title: 'Open app' }],
    },
    panic: {
      title:   `🆘 SOS — EquiVerse`,
      body:    `Medical episode triggered. Emergency chain active for ${contact}.`,
      tag:     'ta-panic',
      requireInteraction: true,
      actions: [{ action: 'open', title: 'Open app' }],
    },
  };

  const scenarios = {
    fall: {
      color: 'var(--danger)',
      notifDelay: 2800,
      steps: [
        { delay: 0,    icon: 'fa-circle-exclamation', msg: source === 'sensor'
            ? 'DeviceMotion: impact event confirmed — free-fall + impact sequence detected.'
            : 'Sudden impact detected by gyroscope — possible fall or tip-over.' },
        { delay: 1400, icon: 'fa-map-pin',            msg: 'Compiling GPS location, current route, and access profile…' },
        { delay: 2800, icon: 'fa-user-shield',        msg: `Alerting ${contact} — 30-second cancel window active.` },
        { delay: 4200, icon: 'fa-check-circle',       msg: 'Fall alert chain complete. Responder has full route context.' },
      ],
    },
    anxiety: {
      color: 'var(--warning)',
      notifDelay: 2800,
      steps: [
        { delay: 0,    icon: 'fa-brain',        msg: 'Sensory overload pattern detected — repeated distress gesture recognised.' },
        { delay: 1400, icon: 'fa-route',        msg: 'Identifying quieter route alternative with lower sensory load…' },
        { delay: 2800, icon: 'fa-user-shield',  msg: `Low-key alert sent to ${contact} — no alarm, soft check-in.` },
        { delay: 4200, icon: 'fa-check-circle', msg: 'Anxiety alert complete. Quiet support chain notified.' },
      ],
    },
    panic: {
      color: '#7c3aed',
      notifDelay: 0,
      steps: [
        { delay: 0,    icon: 'fa-heart-pulse',  msg: 'Medical episode / SOS triggered.' },
        { delay: 1400, icon: 'fa-shield',       msg: 'Sending encrypted medical note and location to emergency services…' },
        { delay: 2800, icon: 'fa-user-shield',  msg: `${contact} and emergency services receiving your access and allergy profile.` },
        { delay: 4200, icon: 'fa-check-circle', msg: 'SOS chain complete. Responders have full context.' },
      ],
    },
  };

  const { steps, color, notifDelay } = scenarios[type];

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

  // Fire a system notification at the appropriate point in the chain
  setTimeout(() => {
    const nc = notifConfig[type];
    showNotification(nc.title, nc.body, {
      tag:               nc.tag,
      actions:           nc.actions,
      requireInteraction: nc.requireInteraction ?? (type !== 'anxiety'),
    });
  }, notifDelay);

  setTimeout(() => {
    const routeStateEl = document.getElementById('route-state');
    if (routeStateEl) routeStateEl.textContent = 'SOS ready';
  }, 4200);
};

const _updateSensorChip = (chip, state) => {
  const labels = {
    armed:    { text: 'Sensor armed',    cls: 'sensor-chip sensor-on'  },
    manual:   { text: 'Manual only',     cls: 'sensor-chip sensor-off' },
    inactive: { text: 'Sensor inactive', cls: 'sensor-chip sensor-off' },
    tap:      { text: 'Tap to arm sensor', cls: 'sensor-chip sensor-tap' },
  };
  const { text, cls } = labels[state] || labels.inactive;
  chip.textContent = text;
  chip.className   = cls;
};

export const init = () => {
  const toggleEl  = document.getElementById('guardian-toggle');
  const stateEl   = document.getElementById('guardian-state');

  // Inject a small sensor-status chip into the metrics grid
  const sensorChip = document.createElement('div');
  sensorChip.className = 'sensor-chip sensor-off';
  sensorChip.textContent = 'Sensor inactive';
  sensorChip.setAttribute('aria-live', 'polite');
  const metricsGrid = toggleEl.closest('.card')?.nextElementSibling;
  if (metricsGrid?.classList.contains('metrics-grid')) {
    metricsGrid.appendChild(sensorChip);
  }

  const _onFall = () => runGuardianSim('fall', 'sensor');

  const _armSensor = async (fromGesture = false) => {
    // Request notification permission alongside sensor arming (must be user gesture)
    if (fromGesture) {
      const perm = await requestNotifPerm();
      if (perm === 'granted') {
        showToast('Guardian notifications enabled.');
      }
    }

    if (!isSupported()) {
      _updateSensorChip(sensorChip, 'manual');
      return;
    }
    try {
      if (fromGesture) await requestPermission(); // DeviceMotion permission (iOS)
      startDetector(_onFall);
      _updateSensorChip(sensorChip, 'armed');
      stateEl.textContent = 'Armed + sensing';
    } catch (err) {
      if (err.message === 'denied') {
        showToast('Motion sensor denied — using manual simulation only.');
        _updateSensorChip(sensorChip, 'manual');
      } else {
        // iOS without a user gesture — prompt user to tap toggle
        _updateSensorChip(sensorChip, 'tap');
      }
    }
  };

  const _disarmSensor = () => {
    stopDetector();
    _updateSensorChip(sensorChip, 'inactive');
  };

  /* Guardian toggle — MUST be a user gesture so iOS permission can fire */
  toggleEl.addEventListener('click', async () => {
    const isOn = toggleEl.classList.contains('on');
    if (isOn) {
      await _armSensor(true);
      showToast('Guardian armed. Fall detection active.');
    } else {
      _disarmSensor();
      stateEl.textContent = 'Paused';
      showToast('Guardian paused. Re-enable for continuous safety monitoring.');
    }
  });

  /* Auto-arm on Android/desktop (no permission gate) when guardian starts ON */
  if (toggleEl.classList.contains('on')) {
    _armSensor(false); // will silently no-op / show 'tap' on iOS
  }

  document.getElementById('fall-test').addEventListener('click',    () => runGuardianSim('fall'));
  document.getElementById('anxiety-test').addEventListener('click', () => runGuardianSim('anxiety'));
  document.getElementById('panic-test').addEventListener('click',   () => runGuardianSim('panic'));
};
