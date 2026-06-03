import { userProfile, state } from '../state.js';
import { unlockDemo, showToast, firstName } from '../ui.js';

export const init = () => {
  const authForm = document.getElementById('auth-form');
  const authName = document.getElementById('auth-name');

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = authName.value.trim();
    if (!name) {
      authName.style.borderColor = 'var(--danger)';
      authName.style.boxShadow   = '0 0 0 3px rgba(220,38,38,0.15)';
      authName.focus();
      showToast('Please enter your name to continue.');
      setTimeout(() => { authName.style.borderColor = ''; authName.style.boxShadow = ''; }, 2200);
      return;
    }
    userProfile.name = name;
    const disabilityEl = document.getElementById('auth-disability');
    const guardianEl   = document.getElementById('auth-guardian');
    if (disabilityEl?.value) userProfile.disability = disabilityEl.value;
    if (guardianEl?.value.trim()) userProfile.guardian = guardianEl.value.trim();
    state.initialProfile = { ...userProfile };
    unlockDemo(`Welcome, ${firstName()}!`);
  });
};
