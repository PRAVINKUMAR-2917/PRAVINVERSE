import { PROFILE, SKILLS, PROJECTS } from '../data/profile';
import { ACH, MISSION_IDS, getRank, secretStep, type AchId, type AchState } from '../core/achievements';
import { MISSIONS, missionById } from './missions';
import { APPS } from '../os/apps';
import type { AppId } from '../os/windowManager';
import type { Theme } from '../core/settings';

export type Line = { kind: 'in' | 'out' | 'ok' | 'err' | 'sys' | 'dim'; text: string };
export type Effect =
  | { type: 'open'; id: AppId } | { type: 'matrix' } | { type: 'theme'; theme: Theme }
  | { type: 'clear' } | { type: 'exit' } | { type: 'boot' } | { type: 'solve'; mission: string }
  | { type: 'secret'; id: AchId };
export interface Ctx { mission: string | null; ach: AchState; rainOn: boolean; animated: boolean }
export interface Result { lines: Line[]; effects: Effect[]; mission?: string | null }

const THEMES: Theme[] = ['matrix', 'cyan', 'violet'];
const out = (text: string): Line => ({ kind: 'out', text });
const dim = (text: string): Line => ({ kind: 'dim', text });
const err = (text: string): Line => ({ kind: 'err', text });

export const COMMANDS: Record<string, string> = {
  help: 'Show available commands', whoami: 'Show the profile', skills: 'List verified skills', projects: 'List GitHub repositories',
  chess: 'Open Chess Arena', sudoku: 'Open Sudoku Lab', analytics: 'Open Data Command', matrix: 'Toggle the code rain',
  theme: 'Show or change the theme: theme <matrix|cyan|violet>', clear: 'Clear the screen', mission: 'List missions, or start one: mission <1-5>',
  answer: 'Submit an answer to the active mission: answer <text>', hint: 'Get a hint for the active mission',
  achievements: 'List badges and XP', rank: 'Show current XP, level and next rank',
  secrets: 'Find the hidden hacker challenges', boot: 'Replay the boot sequence', exit: 'Close the terminal',
};
export const complete = (prefix: string): string[] => Object.keys(COMMANDS).filter(c => c.startsWith(prefix.toLowerCase()));

const launch = (id: string): Result => {
  const app = APPS.find(a => a.id === id)!;
  return { lines: [{ kind: 'ok', text: `Opening ${app.file}` }, ...(app.phase !== null ? [dim(`${app.title} is not built yet; the window is a placeholder until Phase ${app.phase}.`)] : [])], effects: [{ type: 'open', id: app.id }] };
};

export function execute(raw: string, ctx: Ctx): Result {
  const input = raw.trim();
  if (!input) return { lines: [], effects: [] };
  const [cmd, ...rest] = input.split(/\s+/); const arg = rest.join(' '); const c = cmd.toLowerCase();
  const echo: Line = { kind: 'in', text: input };
  const r = (lines: Line[], effects: Effect[] = [], mission?: string | null): Result => ({ lines: [echo, ...lines], effects, mission });

  switch (c) {
    case 'help': return r([out('Commands:'), ...Object.entries(COMMANDS).map(([k, v]) => out(`  ${k.padEnd(13)}${v}`)), dim('Tab completes a command. Up/Down recalls history.')]);
    case 'whoami': return r([out(PROFILE.name), out(PROFILE.role), out(`github   ${PROFILE.github}`), out(`linkedin ${PROFILE.linkedin}`), out(`interests ${PROFILE.interests.join(', ')}`)]);
    case 'skills': return r(SKILLS.flatMap(g => [out(`${g.group}:`), out(`  ${g.items.join(', ')}`)]));
    case 'projects': return r(PROJECTS.flatMap((p, i) => [out(`[${String(i + 1).padStart(2, '0')}] ${p.name}${p.fork ? ' (fork)' : ''}`), out(`     ${p.summary}`), dim(`     ${p.stack.join(' / ')}`)]));
    case 'chess': case 'sudoku': case 'analytics': case 'profile': case 'projects': case 'map': case 'achievements-app': {
      const x = launch(c === 'achievements-app' ? 'achievements' : c); return r(x.lines, x.effects); }
    case 'matrix': return r([{ kind: 'ok', text: `Code rain ${ctx.rainOn ? 'off' : 'on'}. (Animation intensity in Settings still applies.)` }], [{ type: 'matrix' }]);
    case 'theme': {
      if (!arg) return r([out(`Themes: ${THEMES.join(', ')}`), dim('Usage: theme <name>')]);
      const t = arg.toLowerCase() as Theme;
      return THEMES.includes(t) ? r([{ kind: 'ok', text: `Theme set to ${t}` }], [{ type: 'theme', theme: t }]) : r([err(`Unknown theme "${arg}". Choose: ${THEMES.join(', ')}`)]);
    }
    case 'clear': return { lines: [], effects: [{ type: 'clear' }] };
    case 'boot': return ctx.animated
      ? r([{ kind: 'ok', text: 'Replaying boot sequence' }], [{ type: 'boot' }])
      : r([dim('Animation intensity is Off, so the boot sequence is skipped. Raise it in Settings to watch it.')]);
    case 'exit': return r([dim('Closing terminal')], [{ type: 'exit' }]);
    case 'achievements': { const rank = getRank(ctx.ach); return r([...ACH.map(a => out(`${ctx.ach.unlocked[a.id] ? '[x]' : '[ ]'} ${a.name.padEnd(22)}${a.how}`)), dim(`${Object.keys(ctx.ach.unlocked).length}/${ACH.length} unlocked · ${rank.xp} XP · LEVEL ${rank.level} ${rank.title}. Saved in this browser only.`)]); }
    case 'rank': { const rank = getRank(ctx.ach); return r([{ kind: 'ok', text: `LEVEL ${rank.level} · ${rank.title} · ${rank.xp} XP` }, dim(rank.next === null ? 'MAXIMUM RANK ACHIEVED.' : `${rank.next - rank.xp} XP to the next rank. Earn XP by completing unique missions and achievements.`)]); }
    case 'secrets': return r([out('HIDDEN PROTOCOL — 3 SECRET BADGES'), dim(`1. SIGNAL TRACER  ${ctx.ach.unlocked['signal-tracer'] ? '[UNLOCKED]' : '[LOCKED]'}  Complete a mission, then follow the trace.`), dim(`2. NEON KEY       ${ctx.ach.unlocked['neon-key'] ? '[UNLOCKED]' : '[LOCKED]'}  Decode the trace; first solve the cipher mission.`), dim(`3. SHADOW ROOT    ${ctx.ach.unlocked['shadow-root'] ? '[UNLOCKED]' : '[LOCKED]'}  Finish all five missions and find the final key.`)]);
    case 'trace': case 'unlock': {
      const x = secretStep(ctx.ach, c === 'trace' ? 'trace' : 'unlock', arg);
      return r([{ kind: x.success ? 'ok' : 'err', text: x.message }, ...x.newly.map(id => out(`SECRET BADGE FOUND: ${ACH.find(a => a.id === id)!.name}`))], x.newly.map(id => ({ type: 'secret' as const, id })));
    }
    case 'mission': {
      if (!arg) return r([...MISSIONS.map((m, i) => out(`  ${i + 1}. ${m.title.padEnd(20)}${ctx.ach.missions.includes(m.id) ? '[solved]' : ''}`)), dim('Start one with: mission <number>')]);
      const m = MISSIONS[Number(arg) - 1];
      return m ? r([{ kind: 'sys', text: `MISSION ${arg}: ${m.title}` }, ...m.briefing.map(out), dim('Reply with: answer <your answer>   (or: hint)')], [], m.id) : r([err(`No mission "${arg}". Choose 1-${MISSION_IDS.length}.`)]);
    }
    case 'hint': { const m = ctx.mission ? missionById(ctx.mission) : null; return r([m ? dim(`Hint: ${m.hint}`) : err('No active mission. Try: mission')]); }
    case 'answer': {
      const m = ctx.mission ? missionById(ctx.mission) : null;
      if (!m) return r([err('No active mission. Try: mission')]);
      if (!arg) return r([err('Usage: answer <your answer>')]);
      return m.check(arg)
        ? r([{ kind: 'ok', text: `ACCESS GRANTED. Mission "${m.title}" solved.` }], [{ type: 'solve', mission: m.id }], null)
        : r([err('Incorrect. Type hint for a nudge, or try again.')]);
    }
    default: return r([err(`command not found: ${cmd}. Type help.`)]);
  }
}
