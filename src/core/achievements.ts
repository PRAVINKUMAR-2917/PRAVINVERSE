export const ACH = [
  { id: 'first-contact', name: 'FIRST CONTACT', how: 'Open the terminal.', xp: 50, rarity: 'COMMON' },
  { id: 'tactical-mind', name: 'TACTICAL MIND', how: 'Solve a chess puzzle.', xp: 150, rarity: 'RARE' },
  { id: 'checkmate', name: 'CHECKMATE', how: 'Beat the computer by checkmate.', xp: 175, rarity: 'RARE' },
  { id: 'logic-master', name: 'LOGIC MASTER', how: 'Complete a Sudoku puzzle.', xp: 150, rarity: 'RARE' },
  { id: 'pattern-hunter', name: 'PATTERN HUNTER', how: 'Solve the data anomaly mission.', xp: 100, rarity: 'COMMON' },
  { id: 'code-breaker', name: 'CODE BREAKER', how: 'Solve the cipher mission.', xp: 100, rarity: 'COMMON' },
  { id: 'explorer', name: 'EXPLORER', how: 'Open every main module.', xp: 125, rarity: 'RARE' },
  { id: 'grandmaster-protocol', name: 'GRANDMASTER PROTOCOL', how: 'Solve all five terminal missions.', xp: 250, rarity: 'LEGENDARY' },
  { id: 'signal-tracer', name: 'SIGNAL TRACER', how: 'Uncover the hidden signal after your first mission.', xp: 75, rarity: 'SECRET' },
  { id: 'neon-key', name: 'NEON KEY', how: 'Decode the secret signal after completing Mission 1.', xp: 125, rarity: 'SECRET' },
  { id: 'shadow-root', name: 'SHADOW ROOT', how: 'Finish all five missions and unlock the final protocol.', xp: 300, rarity: 'LEGENDARY' },
] as const;
export type AchId = (typeof ACH)[number]['id'];
export const MISSION_IDS = ['cipher', 'sequence', 'chess', 'sudoku', 'anomaly'] as const;
const MISSION_REWARD: Record<string, AchId | undefined> = { cipher: 'code-breaker', chess: 'tactical-mind', anomaly: 'pattern-hunter' };
export interface AchState { unlocked: Partial<Record<AchId, number>>; missions: string[] }
export const emptyAch = (): AchState => ({ unlocked: {}, missions: [] });
const KEY = 'gos.achievements.v1'; // DO NOT change: upgrading must preserve progress.
const isId = (x: string): x is AchId => ACH.some(a => a.id === x);

/** Validate untrusted stored data; preserve historical v1 unlocks and missions. */
export function parseAch(raw: unknown): AchState {
  const out = emptyAch();
  if (typeof raw !== 'object' || raw === null) return out;
  const o = raw as { unlocked?: unknown; missions?: unknown };
  if (typeof o.unlocked === 'object' && o.unlocked !== null)
    for (const [k, v] of Object.entries(o.unlocked)) if (isId(k) && typeof v === 'number' && Number.isFinite(v) && v > 0) out.unlocked[k] = v;
  if (Array.isArray(o.missions)) out.missions = Array.from(new Set(o.missions.filter((m): m is string => (MISSION_IDS as readonly string[]).includes(m as string))));
  return out;
}
export function loadAch(): AchState { try { const s = localStorage.getItem(KEY); return s ? parseAch(JSON.parse(s)) : emptyAch(); } catch { return emptyAch(); } }
export function saveAch(s: AchState): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } }
export function unlock(s: AchState, id: AchId, now = Date.now()): { state: AchState; newly: AchId[] } {
  return s.unlocked[id] ? { state: s, newly: [] } : { state: { ...s, unlocked: { ...s.unlocked, [id]: now } }, newly: [id] };
}
export function solveMission(s: AchState, mission: string, now = Date.now()): { state: AchState; newly: AchId[] } {
  if (!(MISSION_IDS as readonly string[]).includes(mission)) return { state: s, newly: [] };
  let state = s.missions.includes(mission) ? s : { ...s, missions: [...s.missions, mission] };
  const newly: AchId[] = [];
  const add = (id: AchId | undefined) => { if (!id) return; const r = unlock(state, id, now); state = r.state; newly.push(...r.newly); };
  add(MISSION_REWARD[mission]);
  if (MISSION_IDS.every(m => state.missions.includes(m))) add('grandmaster-protocol');
  return { state, newly };
}

// Derive XP from unique achievements and missions. No spendable points or grinding.
export const getXP = (s: AchState): number =>
  ACH.reduce((xp, a) => xp + (s.unlocked[a.id] ? a.xp : 0), 0) + new Set(s.missions.filter(m => (MISSION_IDS as readonly string[]).includes(m))).size * 30;
export const RANKS = [
  { title: 'ROOKIE', min: 0 }, { title: 'OPERATOR', min: 150 }, { title: 'SPECIALIST', min: 400 },
  { title: 'ARCHITECT', min: 750 }, { title: 'GRANDMASTER', min: 1250 },
] as const;
export function getRank(s: AchState) {
  const xp = getXP(s);
  const index = RANKS.reduce((result, rank, i) => xp >= rank.min ? i : result, 0);
  const next = RANKS[index + 1];
  return { xp, level: index + 1, title: RANKS[index].title, floor: RANKS[index].min, next: next?.min ?? null };
}

/** Three hidden, sequential puzzles. Invalid codes never cause changes. */
export function secretStep(s: AchState, command: 'trace' | 'unlock', arg = '', now = Date.now()): { state: AchState; newly: AchId[]; message: string; success: boolean } {
  const deny = (message: string) => ({ state: s, newly: [] as AchId[], message, success: false });
  if (command === 'trace') {
    if (!s.missions.length) return deny('ACCESS LOCKED. Complete any terminal mission first.');
    const result = unlock(s, 'signal-tracer', now);
    return { ...result, success: true, message: 'HIDDEN TRACE FOUND: 4E 45 4F 4E (hexadecimal ASCII). Decode this and enter: unlock <word>.' };
  }
  const answer = arg.trim().toLowerCase();
  if (answer === 'neon') {
    if (!s.unlocked['signal-tracer'] || !s.missions.includes('cipher')) return deny('ACCESS LOCKED. Follow the trace and solve the cipher mission first.');
    const result = unlock(s, 'neon-key', now);
    return { ...result, success: true, message: 'NEON KEY ACCEPTED. Final clue: after all five missions, unlock the system with its highest rank name.' };
  }
  if (answer === 'grandmaster') {
    if (!s.unlocked['neon-key'] || !MISSION_IDS.every(id => s.missions.includes(id))) return deny('ACCESS LOCKED. You need NEON KEY and all five missions solved.');
    const result = unlock(s, 'shadow-root', now);
    return { ...result, success: true, message: 'SHADOW ROOT ACCESS GRANTED. The secret protocol is complete.' };
  }
  return deny('Invalid secret code. Try: secrets');
}
