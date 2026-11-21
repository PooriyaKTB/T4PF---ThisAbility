/* Notification helper — tries SW persistent notifications first,
   falls back to basic Notification API, then silently no-ops. */

const ICON  = 'assets/logo-icon.png';
const BADGE = 'assets/logo-icon.png';

export const isSupported = () => 'Notification' in window;

export const getPermission = () =>
  isSupported() ? Notification.permission : 'denied';

export const requestPermission = async () => {
  if (!isSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
};

/* Shows a persistent notification via the active Service Worker.
   Falls back to basic Notification if SW isn't ready. */
export const showNotification = async (title, body, opts = {}) => {
  if (!isSupported() || Notification.permission !== 'granted') return;

  const payload = {
    body,
    icon:              ICON,
    badge:             BADGE,
    tag:               opts.tag              ?? 'ta-alert',
    requireInteraction: opts.requireInteraction ?? true,
    actions:           opts.actions          ?? [],
    data:              opts.data             ?? {},
    silent:            false,
  };

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, payload);
      return;
    } catch (_) { /* SW not active — fall through */ }
  }

  // Basic fallback (no requireInteraction / no actions in some browsers)
  new Notification(title, { body, icon: ICON, tag: payload.tag });
};
