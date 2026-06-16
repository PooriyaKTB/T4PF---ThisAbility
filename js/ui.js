import { userProfile, state, screenCopy } from './state.js';
import { refreshMap } from './map.js';

const phoneFrame = document.getElementById('phone-frame');
const toast      = document.getElementById('toast');
const toastMsg   = document.getElementById('toast-message');
const content    = document.getElementById('content');

export const firstName        = () => userProfile.name.trim().split(/\s+/)[0] || 'Sarah';
export const guardianFirstName = () => userProfile.guardian.trim().split(/\s+/)[0] || 'Maya';
export const getGreeting      = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
};
export const profileImpactText = () =>
  `${userProfile.mobility} routes, ${userProfile.sensory.toLowerCase()} guidance, ${userProfile.alert.toLowerCase()} alerts.`;

export const showToast = (message) => {
  toastMsg.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2600);
};

export const syncModeButtons = () => {
  document.querySelectorAll('.mode-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.mode === state.selectedMode);
  });
};

export const updateProfileUi = () => {
  document.getElementById('user-chip-name').textContent          = firstName();
  document.getElementById('profile-display-name').textContent    = userProfile.name;
  document.getElementById('profile-display-location').textContent = userProfile.location;
  document.getElementById('profile-name').value                  = userProfile.name;
  document.getElementById('profile-location').value              = userProfile.location;
  document.getElementById('mobility-pref').value                 = userProfile.mobility;
  document.getElementById('sensory-pref').value                  = userProfile.sensory;
  document.getElementById('alert-pref').value                    = userProfile.alert;
  document.getElementById('text-pref').value                     = userProfile.text;
  document.getElementById('contrast-pref').value                 = userProfile.contrast;

  const allergyCatEl   = document.getElementById('allergy-category');
  const allergyDescEl  = document.getElementById('allergy-description');
  const allergyShareEl = document.getElementById('allergy-share-toggle');
  if (allergyCatEl)   allergyCatEl.value = userProfile.allergyCategory || '';
  if (allergyDescEl)  allergyDescEl.value = userProfile.allergyDescription || '';
  if (allergyShareEl) {
    allergyShareEl.classList.toggle('on', userProfile.allergyShareVenue);
    allergyShareEl.setAttribute('aria-pressed', String(userProfile.allergyShareVenue));
  }

  document.getElementById('profile-needs').textContent = profileImpactText();
  document.getElementById('passport-mobility').textContent =
    userProfile.mobility === 'Fastest'
      ? 'Fastest route preferred, with access risk warnings still visible.'
      : `${userProfile.disability || userProfile.mobility} profile — ${userProfile.mobility} access, ramp preferred, seated waiting areas.`;
  document.getElementById('passport-sensory').textContent =
    `${userProfile.sensory} guidance, ${userProfile.alert.toLowerCase()} alerts.`;

  const gcDisplay     = document.getElementById('guardian-contact-display');
  const guardianNameEl = document.getElementById('guardian-name-display');
  if (gcDisplay)      gcDisplay.textContent     = guardianFirstName();
  if (guardianNameEl) guardianNameEl.textContent = userProfile.guardian;

  phoneFrame.classList.toggle('large-text',   userProfile.text === 'large');
  phoneFrame.classList.toggle('high-contrast', userProfile.contrast === 'high');
  phoneFrame.classList.toggle('calm-ui',       userProfile.contrast === 'calm');

  state.selectedMode = userProfile.mobility;
  syncModeButtons();

  if (state.currentScreen === 'explore') {
    document.getElementById('screen-heading').textContent = `${getGreeting()}, ${firstName()}!`;
  }
  if (state.currentScreen === 'settings') {
    document.getElementById('screen-heading').textContent = `${firstName()}'s Profile`;
  }
  document.getElementById('profile-open').setAttribute('aria-label', `Open ${firstName()}'s profile`);
};

export const setScreen = (screenName) => {
  state.currentScreen = screenName;
  document.querySelectorAll('.screen').forEach((s) => {
    s.classList.toggle('active', s.dataset.screen === screenName);
  });
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.screenTarget === screenName);
  });
  document.getElementById('screen-heading').textContent =
    screenName === 'explore'
      ? `${getGreeting()}, ${firstName()}!`
      : screenName === 'settings'
        ? `${firstName()}'s Profile`
        : screenCopy[screenName].heading;
  document.getElementById('screen-subtitle').textContent = screenCopy[screenName].subtitle;
  content.scrollTop = 0;
  if (screenName === 'explore') refreshMap();
};

export const unlockDemo = (message) => {
  phoneFrame.classList.remove('demo-locked');
  setScreen('explore');
  updateProfileUi();
  showToast(message);
  refreshMap();
};

export const silentUnlock = () => {
  phoneFrame.classList.remove('demo-locked');
  setScreen('explore');
  updateProfileUi();
  refreshMap();
};
