import { describe, expect, it } from 'vitest';
import { ACH, emptyAch, getRank, getXP, parseAch, secretStep, solveMission, unlock } from '../src/core/achievements';
import { execute, type Ctx } from '../src/terminal/engine';
const ctx = (ach = emptyAch()): Ctx => ({ ach, mission: null, rainOn: true, animated: true });
const output = (cmd: string, ach = emptyAch()) => execute(cmd, ctx(ach));

describe('Phase 6 progression and secrets', () => {
  it('preserves all original achievements, counts and storage shape', () => {
    expect(ACH.slice(0, 8).map(a => a.id)).toEqual([
      'first-contact', 'tactical-mind', 'checkmate', 'logic-master',
      'pattern-hunter', 'code-breaker', 'explorer', 'grandmaster-protocol',
    ]);
    const old = { unlocked: { 'code-breaker': 123, explorer: 456 }, missions: ['cipher'] };
    expect(parseAch(old)).toEqual(old);
  });
  it('XP is derived and replaying a completed mission does not duplicate reward', () => {
    const first = solveMission(emptyAch(), 'cipher', 10);
    const xp = getXP(first.state);
    expect(xp).toBe(130);
    expect(getRank(first.state).title).toBe('ROOKIE');
    const again = solveMission(first.state, 'cipher', 20);
    expect(getXP(again.state)).toBe(xp);
    expect(again.newly).toEqual([]);
  });
  it('unlocks the tactical-mind badge for the chess puzzle mission', () => {
    expect(solveMission(emptyAch(), 'chess').newly).toContain('tactical-mind');
  });
  it('secrets remain locked until each prerequisite is completed', () => {
    const blocked = secretStep(emptyAch(), 'trace');
    expect(blocked.success).toBe(false);
    const cipher = solveMission(emptyAch(), 'cipher', 11).state;
    const trace = secretStep(cipher, 'trace', '', 12);
    expect(trace.newly).toEqual(['signal-tracer']);
    expect(secretStep(trace.state, 'unlock', 'wrong').newly).toEqual([]);
    const neon = secretStep(trace.state, 'unlock', 'NEON', 13);
    expect(neon.newly).toEqual(['neon-key']);
    expect(secretStep(neon.state, 'unlock', 'grandmaster').success).toBe(false);
    let all = neon.state;
    for (const id of ['sequence', 'chess', 'sudoku', 'anomaly']) all = solveMission(all, id).state;
    const last = secretStep(all, 'unlock', 'grandmaster', 14);
    expect(last.newly).toEqual(['shadow-root']);
    expect(secretStep(last.state, 'unlock', 'grandmaster').newly).toEqual([]);
    expect(getXP(last.state)).toBeGreaterThanOrEqual(1250);
    expect(getRank(last.state).title).toBe('GRANDMASTER');
  });
  it('trace and unlock terminal commands emit only intended unlock effects', () => {
    expect(output('trace').effects).toEqual([]);
    const ach = solveMission(emptyAch(), 'cipher').state;
    expect(output('trace', ach).effects).toEqual([{ type: 'secret', id: 'signal-tracer' }]);
    const traced = unlock(ach, 'signal-tracer').state;
    expect(output('unlock neon', traced).effects).toEqual([{ type: 'secret', id: 'neon-key' }]);
    expect(output('unlock wrong', traced).effects).toEqual([]);
    const t = output('rank', traced).lines.map(l => l.text).join(' ');
    expect(t).toContain('XP');
    expect(output('secrets', traced).lines.some(l => l.text.includes('HIDDEN PROTOCOL'))).toBe(true);
  });
});
