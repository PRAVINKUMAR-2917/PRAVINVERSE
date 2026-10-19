import { Chess, type Square } from 'chess.js';

export type Mode = 'human' | 'computer';
export type Side = 'w' | 'b';
export type StoredGame = {
  moves: string[]; mode: Mode; side: Side; level: number;
  flipped: boolean; resigned: boolean;
};
export const CHESS_KEY = 'gos.chess.v1';
export const newGame = (): StoredGame => ({ moves: [], mode: 'computer', side: 'w', level: 1, flipped: false, resigned: false });
/** Replay SAN to validate persistence. Never trust browser storage. */
export function readGame(raw: unknown): StoredGame {
  const start = newGame();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return start;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.moves) || r.moves.length > 500 || !r.moves.every(x => typeof x === 'string' && x.length > 0 && x.length <= 12)) return start;
  const replay = new Chess();
  try { for (const m of r.moves as string[]) replay.move(m); } catch { return start; }
  return {
    moves: r.moves as string[], mode: r.mode === 'human' ? 'human' : 'computer', side: r.side === 'b' ? 'b' : 'w',
    level: [1, 2, 3, 4].includes(Number(r.level)) ? Number(r.level) : 1,
    flipped: r.flipped === true, resigned: r.resigned === true,
  };
}
export function loadGame(): StoredGame {
  try { return readGame(JSON.parse(localStorage.getItem(CHESS_KEY) || 'null')); } catch { return newGame(); }
}
export function fromMoves(moves: string[], count = moves.length): Chess {
  const g = new Chess(); for (const m of moves.slice(0, count)) g.move(m); return g;
}
export function legalDestinations(g: Chess, square: Square | null): Square[] {
  return square ? g.moves({ square, verbose: true }).map(m => m.to) : [];
}
export function gameStatus(g: Chess, resigned = false): string {
  if (resigned) return 'Game resigned';
  if (g.isCheckmate()) return `Checkmate — ${g.turn() === 'w' ? 'Black' : 'White'} wins`;
  if (g.isStalemate()) return 'Draw — stalemate';
  if (g.isThreefoldRepetition()) return 'Draw — repetition';
  if (g.isInsufficientMaterial()) return 'Draw — insufficient material';
  if (g.isDraw()) return 'Game drawn';
  return `${g.turn() === 'w' ? 'White' : 'Black'} to move${g.isCheck() ? ' — CHECK!' : ''}`;
}
export function captureCount(g: Chess): { white: string[]; black: string[] } {
  const initial: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const remaining: Record<string, Record<string, number>> = { w: { ...initial }, b: { ...initial } };
  for (const rank of g.board()) for (const p of rank) if (p && p.type !== 'k') remaining[p.color][p.type]--;
  const taken = (side: 'w' | 'b') => Object.entries(remaining[side]).flatMap(([piece, n]) => Array.from({ length: Math.max(0, n) }, () => piece));
  return { white: taken('b'), black: taken('w') };
}
