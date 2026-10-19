/** Self-contained Sudoku model. Puzzles are generated offline and solution uniqueness is checked. */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type Cell = number; // 0 = empty; 1..9 = entry
export interface Puzzle { givens: Cell[]; solution: Cell[]; difficulty: Difficulty }
export interface SudokuSave extends Puzzle {
  entries: Cell[]; notes: number[][]; mistakes: number; hints: number;
  seconds: number; paused: boolean; ended: boolean; assisted: boolean;
}
export const SAVE_KEY = 'gos.sudoku.v1';
export const LEVELS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const CLUES: Record<Difficulty, number> = { easy: 42, medium: 36, hard: 30, expert: 26 };
export const row = (i: number) => Math.floor(i / 9);
export const col = (i: number) => i % 9;
export const box = (i: number) => Math.floor(row(i) / 3) * 3 + Math.floor(col(i) / 3);
export const peers = (i: number, j: number) => row(i) === row(j) || col(i) === col(j) || box(i) === box(j);
const shuffled = <T,>(xs: readonly T[]): T[] => {
  const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a;
};
const pattern = (r: number, c: number) => (r * 3 + Math.floor(r / 3) + c) % 9;
const randomSolution = (): number[] => {
  const rows = shuffled([0, 1, 2]).flatMap(b => shuffled([0, 1, 2]).map(r => b * 3 + r));
  const cols = shuffled([0, 1, 2]).flatMap(b => shuffled([0, 1, 2]).map(c => b * 3 + c));
  const digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const transpose = Math.random() < .5;
  return Array.from({ length: 81 }, (_, i) => digits[pattern(transpose ? cols[col(i)] : rows[row(i)], transpose ? rows[row(i)] : cols[col(i)])]);
};
export const validGrid = (grid: readonly number[]): boolean => {
  if (grid.length !== 81 || grid.some(n => !Number.isInteger(n) || n < 0 || n > 9)) return false;
  for (let i = 0; i < 81; i++) if (grid[i] && grid.some((n, j) => i !== j && n === grid[i] && peers(i, j))) return false;
  return true;
};
/** Search at most limit solutions; MRV drastically reduces search cost. */
export function solve(grid: readonly number[], limit = 1): number[][] {
  if (!validGrid(grid) || !Number.isInteger(limit) || limit < 1) return [];
  const data = [...grid], results: number[][] = [];
  const go = () => {
    if (results.length >= limit) return;
    let target = -1, opts: number[] = [];
    for (let i = 0; i < 81; i++) {
      if (data[i]) continue;
      const used = new Set<number>();
      for (let j = 0; j < 81; j++) if (data[j] && peers(i, j)) used.add(data[j]);
      const choices = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !used.has(n));
      if (!choices.length) return;
      if (target < 0 || choices.length < opts.length) { target = i; opts = choices; }
      if (choices.length === 1) break;
    }
    if (target === -1) { results.push([...data]); return; }
    for (const n of opts) { data[target] = n; go(); data[target] = 0; if (results.length >= limit) break; }
  };
  go(); return results;
}
/** Randomize completed boards and remove clues only when exactly one solution remains. */
export function createPuzzle(difficulty: Difficulty): Puzzle {
  const solution = randomSolution(); const givens = [...solution];
  let left = 81, target = CLUES[difficulty];
  // Multiple passes let previously blocked squares become removable after changing other squares.
  for (let pass = 0; pass < 3 && left > target; pass++) {
    let changed = false;
    for (const idx of shuffled(Array.from({ length: 81 }, (_, i) => i))) {
      if (!givens[idx] || left <= target) continue;
      const old = givens[idx]; givens[idx] = 0;
      if (solve(givens, 2).length !== 1) givens[idx] = old;
      else { left--; changed = true; }
    }
    if (!changed) break;
  }
  return { givens, solution, difficulty };
}
export function start(difficulty: Difficulty = 'easy'): SudokuSave {
  const puzzle = createPuzzle(difficulty);
  return { ...puzzle, entries: [...puzzle.givens], notes: Array.from({ length: 81 }, () => []),
    mistakes: 0, hints: 0, seconds: 0, paused: false, ended: false, assisted: false };
}
export function conflicts(entries: readonly number[], at: number): boolean {
  return !!entries[at] && entries.some((n, j) => j !== at && n === entries[at] && peers(at, j));
}
export function complete(game: SudokuSave): boolean {
  return game.entries.every((n, i) => n === game.solution[i]);
}
export function validSave(raw: unknown): raw is SudokuSave {
  if (!raw || typeof raw !== 'object') return false;
  const v = raw as Partial<SudokuSave>;
  if (!v.difficulty || !LEVELS.includes(v.difficulty)) return false;
  const isCells = (a: unknown): a is number[] => Array.isArray(a) && a.length === 81 && a.every(n => Number.isInteger(n) && n >= 0 && n <= 9);
  if (!isCells(v.givens) || !isCells(v.solution) || !isCells(v.entries) || !validGrid(v.givens) || !validGrid(v.solution)) return false;
  if (v.solution.some(n => n === 0) || v.givens.some((n, i) => n !== 0 && n !== v.solution![i]) || v.entries.some((n, i) => v.givens![i] !== 0 && n !== v.givens![i])) return false;
  if (!Array.isArray(v.notes) || v.notes.length !== 81 || !v.notes.every(a => Array.isArray(a) && a.length <= 9 && a.every(n => Number.isInteger(n) && n >= 1 && n <= 9))) return false;
  if (![v.mistakes, v.hints, v.seconds].every(n => Number.isSafeInteger(n) && (n as number) >= 0) || typeof v.paused !== 'boolean' || typeof v.ended !== 'boolean' || typeof v.assisted !== 'boolean') return false;
  // Reject corruption or forged grid/solution, and restore a fresh puzzle instead.
  return solve(v.givens, 2).length === 1 && solve(v.givens, 1)[0].every((n, i) => n === v.solution![i]);
}
export function loadGame(): SudokuSave {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const data: unknown = JSON.parse(raw); if (validSave(data)) return data; } } catch { /* unavailable */ }
  return start('easy');
}
export function saveGame(game: SudokuSave): void { try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch { /* unavailable */ } }
export function formatTime(seconds: number): string { return `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}:` : ''}${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
export function candidates(entries: readonly number[], i: number): number[] {
  if (entries[i]) return [];
  const used = new Set(entries.filter((n, j) => n && peers(i, j)));
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !used.has(n));
}
