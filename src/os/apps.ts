import type { AppId } from './windowManager';
export interface AppDef { id: AppId; file: string; title: string; glyph: string; phase: number | null; size?: { w: number; h: number }; blurb: string }
// phase = the build phase in which the real app ships; null = built now.
export const APPS: AppDef[] = [
  { id: 'chess', file: 'CHESS.EXE', title: 'Chess Arena', glyph: '♞', phase: null, size: { w: 1000, h: 720 }, blurb: 'Playable chess with a real engine, puzzles and mate challenges.' },
  { id: 'sudoku', file: 'SUDOKU.EXE', title: 'Sudoku Lab', glyph: '▦', phase: null, size: { w: 940, h: 780 }, blurb: 'Unique-solution puzzles, pencil marks and logical hints.' },
  { id: 'analytics', file: 'ANALYTICS.EXE', title: 'Data Command', glyph: '◭', phase: null, size: { w: 1150, h: 790 }, blurb: 'Offline Data Analyst dashboard for local CSV and XLSX files.' },
  { id: 'terminal', file: 'TERMINAL.EXE', title: 'Terminal', glyph: '>_', phase: null, size: { w: 720, h: 500 }, blurb: 'A safe, fictional terminal with commands and puzzle missions.' },
  { id: 'projects', file: 'PROJECTS.EXE', title: 'Projects', glyph: '◈', phase: null, size: { w: 840, h: 700 }, blurb: 'Your real GitHub repositories, verified from their READMEs.' },
  { id: 'profile', file: 'PROFILE.EXE', title: 'Profile', glyph: '◉', phase: null, size: { w: 760, h: 680 }, blurb: 'Skills and background taken from your GitHub README.' },
  { id: 'achievements', file: 'ACHIEVEMENTS.EXE', title: 'Achievements', glyph: '✦', phase: null, size: { w: 880, h: 740 }, blurb: 'Local-only achievements saved in this browser.' },
  { id: 'map', file: 'SYSTEM_MAP.EXE', title: 'System Map', glyph: '⌬', phase: null, size: { w: 840, h: 680 }, blurb: 'A map of every module and how they connect.' },
  { id: 'settings', file: 'SETTINGS.EXE', title: 'Settings', glyph: '⚙', phase: null, size: { w: 440, h: 420 }, blurb: 'Theme, animation intensity and sound.' },
];
export const appById = (id: AppId) => APPS.find(a => a.id === id)!;
