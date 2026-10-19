import { describe, it, expect } from 'vitest';
import { initialWM, wmReducer, WMState, AppId, isOpen } from '../src/os/windowManager';
const vp = { w: 1280, h: 800 };
const open = (s: WMState, id: AppId) => wmReducer(s, { type: 'open', id, vp });

describe('window manager', () => {
  it('opens, focuses and cascades windows', () => {
    let s = open(initialWM, 'chess'); s = open(s, 'sudoku');
    expect(s.focused).toBe('sudoku');
    expect(s.wins[1].x).toBeGreaterThan(s.wins[0].x);
    expect(s.wins[1].z).toBeGreaterThan(s.wins[0].z);
  });
  it('re-opening an open app focuses it instead of duplicating', () => {
    let s = open(open(initialWM, 'chess'), 'sudoku'); s = open(s, 'chess');
    expect(s.wins).toHaveLength(2); expect(s.focused).toBe('chess');
  });
  it('minimize moves focus to the next visible window; open restores', () => {
    let s = open(open(initialWM, 'chess'), 'sudoku');
    s = wmReducer(s, { type: 'minimize', id: 'sudoku' });
    expect(s.focused).toBe('chess');
    s = open(s, 'sudoku');
    expect(s.wins.find(w => w.id === 'sudoku')!.minimized).toBe(false); expect(s.focused).toBe('sudoku');
  });
  it('close removes the window and refocuses', () => {
    let s = open(open(initialWM, 'chess'), 'sudoku');
    s = wmReducer(s, { type: 'close', id: 'sudoku' });
    expect(isOpen(s, 'sudoku')).toBe(false); expect(s.focused).toBe('chess');
    s = wmReducer(s, { type: 'close', id: 'chess' }); expect(s.focused).toBeNull();
  });
  it('move keeps the title bar on screen', () => {
    let s = open(initialWM, 'chess');
    s = wmReducer(s, { type: 'move', id: 'chess', x: -9999, y: -9999, vp });
    const w = s.wins[0]; expect(w.x + w.w).toBeGreaterThanOrEqual(120); expect(w.y).toBe(0);
    s = wmReducer(s, { type: 'move', id: 'chess', x: 99999, y: 99999, vp });
    expect(s.wins[0].x).toBeLessThanOrEqual(vp.w - 120);
  });
  it('windows are clamped to small viewports', () => {
    const s = wmReducer(initialWM, { type: 'open', id: 'chess', vp: { w: 390, h: 700 } });
    expect(s.wins[0].w).toBeLessThanOrEqual(390 - 16);
  });
  it('cycle visits every window and wraps', () => {
    let s = open(open(open(initialWM, 'chess'), 'sudoku'), 'terminal');
    const seen = new Set<AppId>();
    for (let i = 0; i < 3; i++) { s = wmReducer(s, { type: 'cycle', dir: 1 }); seen.add(s.focused!); }
    expect(seen.size).toBe(3);
  });
  it('tracks which apps were ever opened (for the EXPLORER achievement later)', () => {
    let s = open(open(initialWM, 'chess'), 'sudoku'); s = wmReducer(s, { type: 'close', id: 'chess' });
    expect(s.opened).toEqual(['chess', 'sudoku']);
  });
});
