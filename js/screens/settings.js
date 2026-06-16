import { userProfile, state, saveProfile, clearProfile } from '../state.js';
import { showToast, setScreen, updateProfileUi, syncModeButtons, firstName } from '../ui.js';

export const init = () => {
  const profileCompleteness = document.getElementById('profile-completeness');
  const barrierCount        = document.getElementById('barrier-count');

  document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    userProfile.name     = document.getElementById('profile-name').value.trim() || userProfile.name;
    userProfile.location = document.getElementById('profile-location').value.trim() || userProfile.location;
    userProfile.mobility = document.getElementById('mobility-pref').value;
    userProfile.sensory  = document.getElementById('sensory-pref').value;
    userProfile.alert    = document.getElementById('alert-pref').value;
    userProfile.text     = document.getElementById('text-pref').value;
    userProfile.contrast = document.getElementById('contrast-pref').value;

    const allergyCatEl   = document.getElementById('allergy-category');
    const allergyDescEl  = document.getElementById('allergy-description');
    const allergyShareEl = document.getElementById('allergy-share-toggle');
    if (allergyCatEl)   userProfile.allergyCategory    = allergyCatEl.value;
    if (allergyDescEl)  userProfile.allergyDescription = allergyDescEl.value.trim();
    if (allergyShareEl) userProfile.allergyShareVenue  = allergyShareEl.classList.contains('on');

    profileCompleteness.textContent = '100';
    // Keep routing mode in sync with the saved mobility preference
    state.selectedMode = userProfile.mobility;
    saveProfile();
    updateProfileUi();
    syncModeButtons();
    showToast('Profile saved. The app now follows these preferences.');
  });

  document.getElementById('profile-passport').addEventListener('click', () => {
    setScreen('passport');
    showToast(`CapAble ID opened from ${firstName()}'s profile.`);
  });

  document.getElementById('guardian-shortcut').addEventListener('click', () => {
    setScreen('guardian');
    showToast('Guardian settings opened.');
  });

  document.getElementById('profile-demo-reset').addEventListener('click', () => {
    if (state.initialProfile) {
      Object.assign(userProfile, { ...state.initialProfile });
      saveProfile();
    } else {
      clearProfile();
      location.reload();
      return;
    }
    profileCompleteness.textContent = '86';
    updateProfileUi();
    showToast(`Profile reset to your original settings, ${firstName()}.`);
  });

  document.querySelectorAll('.setting-list .switch').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.feature === 'crowd-telemetry') {
        const isNowOn = btn.classList.contains('on');
        state.barriersLogged = Math.max(0, state.barriersLogged + (isNowOn ? 1 : -1));
        barrierCount.textContent = state.barriersLogged;
      }
    });
  });
};
