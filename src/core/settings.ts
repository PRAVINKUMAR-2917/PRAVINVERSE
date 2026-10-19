export type Theme = 'matrix' | 'cyan' | 'violet';
export type Intensity = 'off' | 'low' | 'full';
export interface Settings { theme: Theme; intensity: Intensity; sound: boolean; introSeen: boolean }

const KEY = 'gos.settings.v1';
const THEMES: Theme[] = ['matrix', 'cyan', 'violet'];
const LEVELS: Intensity[] = ['off', 'low', 'full'];

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const defaultSettings = (reduced = false): Settings => ({
  theme: 'matrix', intensity: reduced ? 'off' : 'full', sound: false, introSeen: false,
});

/** Validate untrusted stored data field by field; anything invalid falls back to the default. */
export function parseSettings(raw: unknown, reduced = false): Settings {
  const base = defaultSettings(reduced);
  if (typeof raw !== 'object' || raw === null) return base;
  const o = raw as Record<string, unknown>;
  return {
    theme: THEMES.includes(o.theme as Theme) ? (o.theme as Theme) : base.theme,
    intensity: LEVELS.includes(o.intensity as Intensity) ? (o.intensity as Intensity) : base.intensity,
    sound: typeof o.sound === 'boolean' ? o.sound : base.sound,
    introSeen: typeof o.introSeen === 'boolean' ? o.introSeen : base.introSeen,
  };
}

export function loadSettings(): Settings {
  const reduced = prefersReducedMotion();
  try {
    const s = localStorage.getItem(KEY);
    return s ? parseSettings(JSON.parse(s), reduced) : defaultSettings(reduced);
  } catch { return defaultSettings(reduced); }
}

export function saveSettings(s: Settings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked or full: settings just won't persist */ }
}
