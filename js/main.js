import { setScreen, showToast } from './ui.js';
import { init as initAuth }     from './screens/auth.js';
import { init as initExplore }  from './screens/explore.js';
import { init as initPassport } from './screens/passport.js';
import { init as initGuardian } from './screens/guardian.js';
import { init as initSettings } from './screens/settings.js';

// Global switch handler must be registered first so managed switches
// (ble-toggle, guardian-toggle) have their class toggled before
// the screen-specific handlers read the new state.
document.querySelectorAll('.switch').forEach((sw) => {
  sw.addEventListener('click', () => {
    const isOn = !sw.classList.contains('on');
    sw.classList.toggle('on', isOn);
    sw.setAttribute('aria-pressed', String(isOn));
    if (!sw.dataset.managed) showToast(isOn ? 'Setting enabled.' : 'Setting paused.');
  });
});

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => setScreen(item.dataset.screenTarget));
});

document.getElementById('profile-open').addEventListener('click', () => {
  setScreen('settings');
  showToast('Profile opened.');
});

// Screen inits run after global listeners so their handlers fire second.
initAuth();
initExplore();
initPassport();
initGuardian();
initSettings();

// On mobile, briefly make the document scrollable to trigger the browser
// toolbar to retract, then restore. position:fixed on .phone-frame means
// there is no document overflow after this settles.
if (window.innerWidth <= 520) {
  const html = document.documentElement;
  html.style.height = `${window.innerHeight + 1}px`;
  window.scrollTo(0, 1);
  setTimeout(() => { html.style.height = ''; }, 400);
}
