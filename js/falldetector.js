/* Two-phase fall detector using DeviceMotion API.
   Phase 1 — free fall:  total acceleration < FREEFALL_G  (near weightlessness)
   Phase 2 — impact:     total acceleration > IMPACT_G    (within WINDOW_MS of phase 1)
   Uses accelerationIncludingGravity so it works on devices that zero-out
   the gravity component inconsistently. */

const FREEFALL_G  = 3;    // m/s² — below this = likely airborne
const IMPACT_G    = 22;   // m/s² — above this after free fall = impact
const WINDOW_MS   = 2000; // max gap between free-fall start and impact
const SHAKE_G     = 35;   // m/s² (~3.5G) — threshold for a single "snap" of vigorous shaking
const SHAKE_N     = 3;    // consecutive high-G snaps needed to call it a shake
const SHAKE_MS    = 1500; // window within which SHAKE_N snaps must occur
const DEBOUNCE_MS = 8000; // ignore re-triggers for this long after a fall

let _handler    = null;
let _freeFallAt = null;
let _lastFall   = 0;
let _shakeSnaps = [];     // timestamps of recent high-G events (shake accumulator)

const _mag = (ev) => {
  const a = ev.accelerationIncludingGravity || ev.acceleration || {};
  const x = a.x ?? 0, y = a.y ?? 0, z = a.z ?? 0;
  return Math.sqrt(x * x + y * y + z * z);
};

/* Returns false on desktop / unsupported devices.
   Uses maxTouchPoints instead of ontouchstart — more reliable on iOS 16+ and modern Android. */
export const isSupported = () =>
  typeof DeviceMotionEvent !== 'undefined' &&
  ((navigator.maxTouchPoints ?? 0) > 0 || (navigator.msMaxTouchPoints ?? 0) > 0 ||
   typeof DeviceMotionEvent.requestPermission === 'function');

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
  _shakeSnaps = [];
  _handler = (ev) => {
    const now = Date.now();
    if (now - _lastFall < DEBOUNCE_MS) return;
    const m = _mag(ev);

    if (m < FREEFALL_G) {
      // Phase 1: free-fall (near weightlessness — device is airborne)
      _freeFallAt = now;
      _shakeSnaps = [];
    } else if (m > IMPACT_G && _freeFallAt && (now - _freeFallAt) < WINDOW_MS) {
      // Phase 2: hard impact after free-fall → real drop detected
      _freeFallAt = null;
      _shakeSnaps = [];
      _lastFall   = now;
      onFall();
    } else if (m > SHAKE_G) {
      // Shake detection: count rapid high-G spikes (vigorous shaking without a drop)
      _freeFallAt = null;
      _shakeSnaps.push(now);
      _shakeSnaps = _shakeSnaps.filter((t) => now - t < SHAKE_MS);
      if (_shakeSnaps.length >= SHAKE_N) {
        _shakeSnaps = [];
        _lastFall   = now;
        onFall();
      }
    } else {
      // Medium G — reset free-fall window (shake accumulator keeps going)
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
  _shakeSnaps = [];
};
