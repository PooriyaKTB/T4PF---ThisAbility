import { userProfile, state } from './state.js';
import { showToast } from './ui.js';

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

export const buildRoute = (destination, mode) => {
  const dest  = destination.trim() || 'Waterloo';
  const from  = document.getElementById('current-location')?.value.trim() || 'London Bridge';
  const isAI  = mode === 'AI Agent';
  const mins  = isAI ? 24 : mode === 'Fastest' ? 21 : mode === 'Quiet' ? 29 : 26;
  const conf  = dest.toLowerCase().includes('waterloo') ? 'High confidence' : 'Medium confidence';
  const via   = dest.toLowerCase().includes('waterloo') ? 'Southwark' : 'a verified step-free stop';
  const alert = userProfile.alert === 'Audio + visual'
    ? 'Audio and visual alerts enabled'
    : `${userProfile.alert} alerts enabled`;

  updateMapStart(from);
  updateMapAlert(mode, dest);
  updateMapEnd(dest);

  document.getElementById('route-title').textContent = isAI
    ? `AI-optimised route to ${dest}`
    : `${mode} route to ${dest}`;

  document.getElementById('route-summary').textContent = isAI
    ? `${mins} min journey. AI Agent analysed your ${userProfile.disability || 'mobility'} profile, live TfL data, and crowd telemetry. ${conf}. ${alert}.`
    : `${mins} min journey. ${conf}: ${userProfile.mobility.toLowerCase()} preference applied, ${userProfile.sensory.toLowerCase()} guidance active, and crowd reports checked.`;

  const steps = isAI
    ? [
        ['fa-robot',          `AI Agent: Barrier-free path identified from ${from} using live sensor data.`],
        ['fa-train',          `Take Jubilee Line toward ${via} (step-free, 68% crowd forecast: low).`],
        ['fa-brain',          `Sensory load alert pre-queued for Waterloo concourse — ${userProfile.sensory} mode.`],
        ['fa-id-card',        `CapAble ID ready to broadcast ${userProfile.disability || 'access'} hints to venue.`],
        ['fa-flag-checkered', `Arrive at ${dest}. Guardian monitoring active.`],
      ]
    : [
        ['fa-train',          `Take Jubilee Line toward ${via}.`],
        ['fa-wheelchair',     'Use step-free interchange; avoid the reported Waterloo lift.'],
        ['fa-bell',           `${alert} before the station concourse.`],
        ['fa-flag-checkered', `Arrive at ${dest} with CapAble ID ready.`],
      ];

  document.getElementById('route-steps').innerHTML = steps
    .map(([icon, text]) => `<li>
      <span class="step-icon"><i class="fas ${icon}" aria-hidden="true"></i></span>
      <span>${text}</span>
    </li>`)
    .join('');

  document.getElementById('route-result').classList.add('visible');
  document.getElementById('route-state').textContent = 'Route set';
  showToast(isAI
    ? 'AI Agent route ready — personalised to your profile.'
    : 'Safe route prepared with barrier-aware routing.');
};
