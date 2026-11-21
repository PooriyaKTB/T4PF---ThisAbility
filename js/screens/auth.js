import { userProfile, state, saveProfile } from '../state.js';
import { unlockDemo, firstName } from '../ui.js';

export const init = () => {
  const authForm = document.getElementById('auth-form');
  const authName  = document.getElementById('auth-name');

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Both auth-name and auth-guardian are required; browser validates before this runs.
    userProfile.name     = authName.value.trim();
    userProfile.guardian = document.getElementById('auth-guardian').value.trim();
    const disabilityEl   = document.getElementById('auth-disability');
    if (disabilityEl?.value) userProfile.disability = disabilityEl.value;
    state.initialProfile = { ...userProfile };
    saveProfile();
    unlockDemo(`Welcome, ${firstName()}!`);
  });
};
