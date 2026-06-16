const PROFILE_KEY = 'ta_profile_v1';

export const saveProfile = () => {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(userProfile)); } catch (_) {}
};

export const loadProfile = () => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return false;
    Object.assign(userProfile, JSON.parse(raw));
    return true;
  } catch (_) { return false; }
};

export const clearProfile = () => {
  try { localStorage.removeItem(PROFILE_KEY); } catch (_) {}
};

export const userProfile = {
  name: '',
  email: '',
  location: 'London',
  disability: '',
  guardian: '',
  allergyCategory: '',
  allergyDescription: '',
  allergyShareVenue: false,
  mobility: 'Step-free',
  sensory: 'Quiet',
  alert: 'Haptic first',
  text: 'standard',
  contrast: 'standard',
};

export const state = {
  selectedMode: 'Step-free',
  verifiedReports: 3,
  barriersLogged: 18,
  toastTimer: null,
  currentScreen: 'explore',
  initialProfile: null,
  routeStart: null,  // [lat, lng] — set by GPS button or autocomplete selection
  routeEnd:   null,  // [lat, lng] — set by autocomplete selection
};

export const screenCopy = {
  explore: {
    heading: '',
    subtitle: 'Plan a safer journey with live accessibility intelligence.',
  },
  passport: {
    heading: 'CapAble ID',
    subtitle: 'Share your access needs with venues — without saying a word.',
  },
  guardian: {
    heading: 'Active Guardian',
    subtitle: '24/7 safety monitoring linked to your route and access profile.',
  },
  settings: {
    heading: '',
    subtitle: 'Manage your access needs, privacy consent, and app preferences.',
  },
};

export const moduleContent = {
  map: {
    title: 'Dynamic Map',
    copy: 'Routes combine live TfL data, community-verified obstacles, and your access profile before proposing a journey — updated in real time.',
  },
  alerts: {
    title: 'Surround Alerts',
    copy: 'Receive proactive warnings for micro-obstacles, crowd surges, steep kerb drops, and sensory load — before you reach them on your route.',
  },
  passport: {
    title: 'CapAble ID',
    copy: "Your BLE access profile lets trusted venues understand your needs without any verbal explanation. Sensitive health data never leaves your device.",
  },
  guardian: {
    title: 'Active Guardian',
    copy: 'Continuous monitoring for falls, tip-overs, sensory overload, and medical episodes — with automatic alerts to your emergency contact and contextual data for responders.',
  },
};
