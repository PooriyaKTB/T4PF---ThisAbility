import { userProfile, state, screenCopy } from './state.js';
import { initMap } from './map.js';

const phoneFrame = document.getElementById('phone-frame');
const toast      = document.getElementById('toast');
const toastMsg   = document.getElementById('toast-message');
const content    = document.getElementById('content');
const header     = document.querySelector('header');

// Collapse on scroll-down past threshold.
// Expand only when user intentionally forces past the top:
//   desktop → wheel up while already at scrollTop 0
//   mobile  → touch-drag down ≥36px while already at scrollTop 0
let _collapsed = false;
let _touchY0 = null;

content.addEventListener('scroll', () => {
  if (!_collapsed && content.scrollTop > 40) {
    header.classList.add('collapsed');
    _collapsed = true;
  }
  // Reset touch anchor each time we land at the top
  if (content.scrollTop === 0) _touchY0 = null;
}, { passive: true });

// Desktop: wheel-up past top
content.addEventListener('wheel', (e) => {
  if (_collapsed && content.scrollTop === 0 && e.deltaY < 0) {
    header.classList.remove('collapsed');
    _collapsed = false;
  }
}, { passive: true });

// Mobile: pull-down past top
content.addEventListener('touchstart', (e) => {
  if (_collapsed && content.scrollTop === 0) _touchY0 = e.touches[0].clientY;
}, { passive: true });

content.addEventListener('touchmove', (e) => {
  if (_collapsed && content.scrollTop === 0 && _touchY0 !== null) {
    if (e.touches[0].clientY - _touchY0 > 36) {
      header.classList.remove('collapsed');
      _collapsed = false;
      _touchY0 = null;
    }
  }
}, { passive: true });

content.addEventListener('touchend', () => { _touchY0 = null; }, { passive: true });

/* ── Swipe left/right to change screens ── */
const SCREENS = ['explore', 'passport', 'guardian', 'settings'];
let _swipeX0 = null;
let _swipeY0 = null;

content.addEventListener('touchstart', (e) => {
  _swipeX0 = e.touches[0].clientX;
  _swipeY0 = e.touches[0].clientY;
}, { passive: true });

content.addEventListener('touchend', (e) => {
  if (_swipeX0 === null) return;
  const dx = e.changedTouches[0].clientX - _swipeX0;
  const dy = e.changedTouches[0].clientY - _swipeY0;
  _swipeX0 = null;
  _swipeY0 = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
  const idx = SCREENS.indexOf(state.currentScreen);
  if (idx === -1) return;
  const next = dx < 0 ? SCREENS[idx + 1] : SCREENS[idx - 1];
  if (next) setScreen(next);
}, { passive: true });

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
  if (screenName === 'explore') {
    initMap(); // double-rAF: first frame commits layout, second frame has stable dimensions
  }
};

export const unlockDemo = (message) => {
  phoneFrame.classList.remove('demo-locked');
  setScreen('explore'); // setScreen calls initMap() with double-rAF
  updateProfileUi();
  showToast(message);
};

export const silentUnlock = () => {
  phoneFrame.classList.remove('demo-locked');
  setScreen('explore');
  updateProfileUi();
};
