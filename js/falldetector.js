/* Two-phase fall detector using DeviceMotion API.
   Phase 1 — free fall:  total acceleration < FREEFALL_G  (near weightlessness)
   Phase 2 — impact:     total acceleration > IMPACT_G    (within WINDOW_MS of phase 1)
   Uses accelerationIncludingGravity so it works on devices that zero-out
   the gravity component inconsistently. */

const FREEFALL_G  = 3;    // m/s² — below this = likely airborne
const IMPACT_G    = 22;   // m/s² — above this after free fall = impact
const WINDOW_MS   = 2000; // max gap between free-fall start and impact
const DEBOUNCE_MS = 8000; // ignore re-triggers for this long after a fall

let _handler    = null;
let _freeFallAt = null;
let _lastFall   = 0;

const _mag = (ev) => {
  const a = ev.accelerationIncludingGravity || ev.acceleration || {};
  const x = a.x ?? 0, y = a.y ?? 0, z = a.z ?? 0;
  return Math.sqrt(x * x + y * y + z * z);
};

/* Returns false on desktop / unsupported devices. */
export const isSupported = () =>
  typeof DeviceMotionEvent !== 'undefined' && 'ontouchstart' in window;

/* Must be called from a direct user-gesture on iOS 13+.
   No-op (resolves immediately) on Android and desktop. */
export const requestPermission = async () => {
  if (typeof DeviceMotionEvent?.requestPermission === 'function') {
    const result = await DeviceMotionEvent.requestPermission();
    if (result !== 'granted') throw new Error('denied');
  }
};

/* Attaches the devicemotion listener. Calls onFall() when a fall is detected.
   Safe to call multiple times — second call is a no-op. */
export const startDetector = (onFall) => {
  if (_handler) return;
  _freeFallAt = null;
  _handler = (ev) => {
    const now = Date.now();
    if (now - _lastFall < DEBOUNCE_MS) return;
    const m = _mag(ev);
    if (m < FREEFALL_G) {
      _freeFallAt = now;
    } else if (m > IMPACT_G && _freeFallAt && (now - _freeFallAt) < WINDOW_MS) {
      _freeFallAt = null;
      _lastFall   = now;
      onFall();
    } else if (m > IMPACT_G) {
      // High-G event without prior free fall — reset
      _freeFallAt = null;
    }
  };
  window.addEventListener('devicemotion', _handler, { passive: true });
};

/* Removes the listener. Safe to call when not running. */
export const stopDetector = () => {
  if (_handler) {
    window.removeEventListener('devicemotion', _handler);
    _handler = null;
  }
  _freeFallAt = null;
};
