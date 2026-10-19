import { describe, it, expect } from 'vitest';
import { execute, complete, COMMANDS, type Ctx } from '../src/terminal/engine';
import { emptyAch, parseAch, solveMission, unlock, MISSION_IDS } from '../src/core/achievements';
import { PROJECTS, SKILLS } from '../src/data/profile';
const ctx = (o: Partial<Ctx> = {}): Ctx => ({ mission: null, ach: emptyAch(), rainOn: true, animated: true, ...o });
const text = (r: ReturnType<typeof execute>) => r.lines.map(l => l.text).join('\n');

describe('terminal commands', () => {
  it('documents every command in help', () => { const t = text(execute('help', ctx())); for (const k of Object.keys(COMMANDS)) expect(t).toContain(k); });
  it('spec commands exist', () => { for (const k of ['help', 'whoami', 'skills', 'projects', 'chess', 'sudoku', 'analytics', 'matrix', 'theme', 'clear', 'mission', 'achievements', 'exit']) expect(COMMANDS[k]).toBeTruthy(); });
  it('unknown command reports an error, empty input does nothing', () => { expect(execute('hack', ctx()).lines.at(-1)!.kind).toBe('err'); expect(execute('   ', ctx()).lines).toHaveLength(0); });
  it('is case-insensitive for commands', () => expect(execute('HELP', ctx()).lines.length).toBeGreaterThan(3));
  it('launchers emit open effects and chess is no longer a placeholder', () => {
    const r = execute('chess', ctx()); expect(r.effects).toEqual([{ type: 'open', id: 'chess' }]); expect(text(r)).not.toContain('not built yet');
  });
  it('boot is honest when animations are off', () => { const r = execute('boot', ctx({ animated: false })); expect(r.effects).toEqual([]); expect(text(r)).toContain('Off'); expect(text(r)).not.toContain('Replaying'); });
  it('matrix, clear, exit, boot emit effects', () => {
    expect(execute('matrix', ctx()).effects).toEqual([{ type: 'matrix' }]); expect(execute('clear', ctx()).effects).toEqual([{ type: 'clear' }]);
    expect(execute('exit', ctx()).effects).toEqual([{ type: 'exit' }]); expect(execute('boot', ctx()).effects).toEqual([{ type: 'boot' }]);
  });
  it('theme validates its argument', () => {
    expect(execute('theme violet', ctx()).effects).toEqual([{ type: 'theme', theme: 'violet' }]);
    const bad = execute('theme neon', ctx()); expect(bad.effects).toEqual([]); expect(bad.lines.at(-1)!.kind).toBe('err');
  });
  it('whoami/skills/projects only show verified data', () => {
    expect(text(execute('whoami', ctx()))).toContain('Pravinkumar M');
    const sk = text(execute('skills', ctx())); for (const g of SKILLS) for (const i of g.items) expect(sk).toContain(i);
    const pr = text(execute('projects', ctx())); for (const p of PROJECTS) expect(pr).toContain(p.name);
    expect(pr).toContain('Circular_Economy_Coders_ (fork)'); expect(PROJECTS.filter(p => p.fork)).toHaveLength(1);
  });
  it('tab completion', () => { expect(complete('mi')).toEqual(['mission']); expect(complete('a').sort()).toEqual(['achievements', 'analytics', 'answer']); expect(complete('zz')).toEqual([]); });
});

describe('mission flow', () => {
  it('answer without an active mission is an error', () => expect(execute('answer 42', ctx()).lines.at(-1)!.kind).toBe('err'));
  it('start, wrong answer, hint, right answer', () => {
    const s = execute('mission 2', ctx()); expect(s.mission).toBe('sequence');
    const c = ctx({ mission: 'sequence' });
    const wrong = execute('answer 41', c); expect(wrong.effects).toEqual([]); expect(wrong.mission).toBeUndefined();
    expect(text(execute('hint', c))).toContain('Hint');
    const right = execute('answer 42', c); expect(right.effects).toEqual([{ type: 'solve', mission: 'sequence' }]); expect(right.mission).toBeNull();
  });
  it('rejects bad mission numbers', () => { expect(execute('mission 9', ctx()).lines.at(-1)!.kind).toBe('err'); expect(execute('mission x', ctx()).lines.at(-1)!.kind).toBe('err'); });
  it('chess mission accepts a real mating move only', () => { const c = ctx({ mission: 'chess' }); expect(execute('answer Ra8#', c).effects).toHaveLength(1); expect(execute('answer Kf1', c).effects).toHaveLength(0); });
});

describe('achievements', () => {
  it('solving cipher unlocks CODE BREAKER once', () => {
    const a = solveMission(emptyAch(), 'cipher', 1); expect(a.newly).toEqual(['code-breaker']);
    expect(solveMission(a.state, 'cipher', 2).newly).toEqual([]);
  });
  it('solving all five missions unlocks GRANDMASTER PROTOCOL', () => {
    let s = emptyAch(); let all: string[] = [];
    for (const m of MISSION_IDS) { const r = solveMission(s, m, 1); s = r.state; all = all.concat(r.newly); }
    expect(all).toContain('grandmaster-protocol'); expect(all).toContain('pattern-hunter');
  });
  it('unlock is idempotent', () => { const a = unlock(emptyAch(), 'explorer', 5); expect(unlock(a.state, 'explorer', 9).state.unlocked.explorer).toBe(5); });
  it('parseAch drops unknown ids, bad values and junk', () => {
    const s = parseAch({ unlocked: { explorer: 3, hacker: 1, checkmate: 'x' }, missions: ['cipher', 'nope', 7] });
    expect(s).toEqual({ unlocked: { explorer: 3 }, missions: ['cipher'] });
    for (const v of [null, 5, 'x', []]) expect(parseAch(v)).toEqual(emptyAch());
  });
  it('achievements command reflects state', () => {
    const t = text(execute('achievements', ctx({ ach: unlock(emptyAch(), 'first-contact', 1).state })));
    expect(t).toContain('[x] FIRST CONTACT'); expect(t).toContain('[ ] CHECKMATE'); expect(t).toContain('1/11');
  });
});
