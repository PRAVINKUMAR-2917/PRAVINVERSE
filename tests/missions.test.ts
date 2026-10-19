import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { MISSIONS, caesar, CIPHER_TEXT, CIPHER_PLAIN, CIPHER_SHIFT, MATE_FEN, isMatingMove, MINI_PUZZLE, MINI_SOLUTION, miniMissing, ANOMALY_DATA, anomalyDay, ANOMALY_INJECTED_INDEX, SEQUENCE, SEQUENCE_NEXT } from '../src/terminal/missions';
import { MISSION_IDS } from '../src/core/achievements';

describe('missions are deterministic and verifiable', () => {
  it('mission ids match the achievements module', () => expect(MISSIONS.map(m => m.id)).toEqual([...MISSION_IDS]));
  it('caesar round-trips', () => { expect(caesar(CIPHER_TEXT, -CIPHER_SHIFT)).toBe(CIPHER_PLAIN); expect(CIPHER_TEXT).not.toBe(CIPHER_PLAIN); });
  it('cipher accepts the plaintext in any case/spacing, rejects the ciphertext', () => {
    const m = MISSIONS[0]; expect(m.check('pattern hunter')).toBe(true); expect(m.check('PATTERN-HUNTER')).toBe(true); expect(m.check(CIPHER_TEXT)).toBe(false);
  });
  it('sequence follows n(n+1)', () => { SEQUENCE.forEach((v, i) => expect(v).toBe((i + 1) * (i + 2))); expect(MISSIONS[1].check(String(SEQUENCE_NEXT))).toBe(true); expect(SEQUENCE_NEXT).toBe(42); expect(MISSIONS[1].check('41')).toBe(false); });
  it('chess FEN is legal and has exactly one mating move', () => {
    const g = new Chess(MATE_FEN); const mates = g.moves().filter(m => { const c = new Chess(MATE_FEN); c.move(m); return c.isCheckmate(); });
    expect(mates).toEqual(['Ra8#']);
  });
  it('chess check accepts mating notation variants and rejects others', () => {
    for (const a of ['Ra8#', 'Ra8', 'ra8+', 'Ra1a8']) expect(isMatingMove(MATE_FEN, a)).toBe(true);
    for (const a of ['Rb1', 'Kf1', 'zzz', 'Ra9']) expect(isMatingMove(MATE_FEN, a)).toBe(false);
  });
  it('mini sudoku has exactly one solution and it matches the stored answer', () => {
    const grid = MINI_PUZZLE.map(r => [...r].map(c => (c === '.' ? 0 : Number(c)))); let count = 0; let found = '';
    const ok = (g: number[][], r: number, c: number, v: number) => { for (let i = 0; i < 4; i++) if (g[r][i] === v || g[i][c] === v) return false; const br = r - (r % 2), bc = c - (c % 2); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (g[br + i][bc + j] === v) return false; return true; };
    const solve = (g: number[][]) => { for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!g[r][c]) { for (let v = 1; v <= 4; v++) if (ok(g, r, c, v)) { g[r][c] = v; solve(g); g[r][c] = 0; } return; } count++; found = found || g.map(x => x.join('')).join('|'); };
    solve(grid); expect(count).toBe(1); expect(found).toBe(MINI_SOLUTION.join('|'));
    expect(MISSIONS[3].check(miniMissing())).toBe(true); expect(miniMissing()).toHaveLength(7); expect(MISSIONS[3].check('1111111')).toBe(false);
  });
  it('anomaly answer is derived from the data and is a real outlier', () => {
    expect(anomalyDay(ANOMALY_DATA)).toBe(ANOMALY_INJECTED_INDEX + 1);
    const mean = ANOMALY_DATA.reduce((a, b) => a + b, 0) / ANOMALY_DATA.length; const sd = Math.sqrt(ANOMALY_DATA.reduce((a, b) => a + (b - mean) ** 2, 0) / ANOMALY_DATA.length);
    expect(Math.abs(ANOMALY_DATA[ANOMALY_INJECTED_INDEX] - mean) / sd).toBeGreaterThan(3);
    expect(MISSIONS[4].check('day 9')).toBe(true); expect(MISSIONS[4].check('3')).toBe(false);
  });
});
