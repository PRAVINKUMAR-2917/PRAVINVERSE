export type AppId = 'chess' | 'sudoku' | 'terminal' | 'analytics' | 'projects' | 'profile' | 'achievements' | 'map' | 'settings';
export interface Win { id: AppId; x: number; y: number; w: number; h: number; z: number; minimized: boolean; opening: boolean }
export interface WMState { wins: Win[]; focused: AppId | null; zTop: number; opened: AppId[] }
export type Viewport = { w: number; h: number };

export const initialWM: WMState = { wins: [], focused: null, zTop: 10, opened: [] };
const TASKBAR = 56;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export type WMAction =
  | { type: 'open'; id: AppId; vp: Viewport; size?: { w: number; h: number } }
  | { type: 'close'; id: AppId }
  | { type: 'minimize'; id: AppId }
  | { type: 'focus'; id: AppId }
  | { type: 'move'; id: AppId; x: number; y: number; vp: Viewport }
  | { type: 'cycle'; dir: 1 | -1 }
  | { type: 'settled'; id: AppId };

const visible = (s: WMState) => s.wins.filter(w => !w.minimized);
const bump = (s: WMState, id: AppId): WMState => {
  const z = s.zTop + 1;
  return { ...s, zTop: z, focused: id, wins: s.wins.map(w => (w.id === id ? { ...w, z, minimized: false } : w)) };
};
const nextFocus = (wins: Win[]): AppId | null =>
  wins.filter(w => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id ?? null;

export function wmReducer(s: WMState, a: WMAction): WMState {
  switch (a.type) {
    case 'open': {
      const existing = s.wins.find(w => w.id === a.id);
      if (existing) return bump(s, a.id); // opening an open app restores and focuses it
      const w = Math.min(a.size?.w ?? 720, a.vp.w - 16), h = Math.min(a.size?.h ?? 480, a.vp.h - TASKBAR - 16);
      const n = s.wins.length; // cascade so new windows never stack exactly
      const win: Win = {
        id: a.id, w, h, z: s.zTop + 1, minimized: false, opening: true,
        x: clamp(80 + n * 32, 8, a.vp.w - w - 8), y: clamp(48 + n * 28, 8, a.vp.h - TASKBAR - h - 8),
      };
      return { wins: [...s.wins, win], focused: a.id, zTop: s.zTop + 1, opened: s.opened.includes(a.id) ? s.opened : [...s.opened, a.id] };
    }
    case 'close': {
      const wins = s.wins.filter(w => w.id !== a.id);
      return { ...s, wins, focused: s.focused === a.id ? nextFocus(wins) : s.focused };
    }
    case 'minimize': {
      const wins = s.wins.map(w => (w.id === a.id ? { ...w, minimized: true } : w));
      return { ...s, wins, focused: s.focused === a.id ? nextFocus(wins) : s.focused };
    }
    case 'focus': return s.wins.some(w => w.id === a.id) ? bump(s, a.id) : s;
    case 'move': // keep the title bar reachable: never fully off-screen
      return { ...s, wins: s.wins.map(w => w.id !== a.id ? w : {
        ...w, x: clamp(a.x, 8 - w.w + 120, a.vp.w - 120), y: clamp(a.y, 0, a.vp.h - TASKBAR - 40) }) };
    case 'cycle': {
      const order = [...s.wins].sort((p, q) => p.z - q.z).map(w => w.id); // by z: bottom -> top
      if (order.length < 2) return s;
      const cur = s.focused ? order.indexOf(s.focused) : order.length - 1;
      const target = order[(cur + a.dir + order.length) % order.length];
      return bump(s, target);
    }
    case 'settled': return { ...s, wins: s.wins.map(w => (w.id === a.id ? { ...w, opening: false } : w)) };
  }
}
export const isOpen = (s: WMState, id: AppId) => s.wins.some(w => w.id === id);
export const visibleCount = (s: WMState) => visible(s).length;
