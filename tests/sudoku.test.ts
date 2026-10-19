import { describe, expect, it } from 'vitest';
import { candidates, complete, conflicts, createPuzzle, formatTime, peers, solve, start, validGrid, validSave } from '../src/apps/sudoku/sudoku';

describe('Sudoku Phase 4', () => {
  it.each(['easy','medium','hard','expert'] as const)('%s puzzle has a unique legal solution', difficulty => {
    const puzzle = createPuzzle(difficulty);
    expect(validGrid(puzzle.givens)).toBe(true);
    expect(validGrid(puzzle.solution)).toBe(true);
    expect(puzzle.givens.filter(Boolean).length).toBeGreaterThanOrEqual(25);
    expect(solve(puzzle.givens, 2)).toEqual([puzzle.solution]);
  });
  it('prevents invalid Sudoku solutions', () => {
    const puzzle = createPuzzle('easy');
    const bad = [...puzzle.givens]; bad[0] = 1; bad[1] = 1;
    expect(validGrid(bad)).toBe(false);
    expect(solve(bad)).toHaveLength(0);
  });
  it('identifies valid candidates, duplicates, and solved games', () => {
    const g = start('easy');
    const i = g.givens.findIndex(n => n === 0);
    expect(candidates(g.entries, i)).toContain(g.solution[i]);
    const duplicate = [...g.entries];
    const peer = g.givens.findIndex((n, j) => n !== 0 && peers(i, j));
    expect(peer).toBeGreaterThanOrEqual(0);
    duplicate[i] = g.givens[peer];
    expect(conflicts(duplicate, i)).toBe(true);
    expect(complete(g)).toBe(false);
    expect(complete({ ...g, entries: [...g.solution] })).toBe(true);
  });
  it('rejects damaged saves and preserves proper state', () => {
    const g = start('medium');
    expect(validSave(g)).toBe(true);
    expect(validSave({ ...g, solution: Array(81).fill(1) })).toBe(false);
    expect(validSave({ ...g, givens: [1] })).toBe(false);
    expect(validSave({ ...g, seconds: -1 })).toBe(false);
    expect(formatTime(65)).toBe('01:05');
  });
});
