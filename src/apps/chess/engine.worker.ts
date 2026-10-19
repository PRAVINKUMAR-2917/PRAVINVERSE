/** Offline depth-limited chess AI. Runs outside the UI thread. Not Stockfish. */
import { Chess, type Move } from 'chess.js';

type Request = { id: number; fen: string; level: number };
type Reply = { id: number; move: string | null; error?: string };
const value: Record<string, number> = { p: 100, n: 320, b: 335, r: 510, q: 900, k: 0 };
function score(g: Chess): number {
  if (g.isCheckmate()) return g.turn() === 'w' ? -100_000 : 100_000;
  if (g.isDraw()) return 0;
  let s = 0;
  for (const rank of g.board()) for (const p of rank) if (p) {
    s += (p.color === 'w' ? 1 : -1) * (value[p.type] + (p.type === 'p' ? (p.color === 'w' ? 6 - Number(p.square[1]) : Number(p.square[1]) - 3) * -3 : 0));
  }
  return s;
}
const order = (moves: Move[]) => moves.sort((a, b) => (Number(!!b.captured) * 10 + Number(b.promotion === 'q') * 9) - (Number(!!a.captured) * 10 + Number(a.promotion === 'q') * 9));
function search(g: Chess, depth: number, alpha: number, beta: number): number {
  if (depth <= 0 || g.isGameOver()) return score(g);
  const max = g.turn() === 'w'; let best = max ? -Infinity : Infinity;
  for (const m of order(g.moves({ verbose: true }))) {
    g.move(m); const s = search(g, depth - 1, alpha, beta); g.undo();
    best = max ? Math.max(best, s) : Math.min(best, s);
    if (max) alpha = Math.max(alpha, best); else beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}
function find(g: Chess, level: number): string | null {
  const opts = order(g.moves({ verbose: true })); if (!opts.length) return null;
  if (level === 1) return opts[Math.floor(Math.random() * opts.length)].san;
  const depth = level === 2 ? 1 : level === 3 ? 2 : 3;
  const maximize = g.turn() === 'w'; let best = maximize ? -Infinity : Infinity;
  let winners: string[] = [];
  for (const m of opts) {
    g.move(m); const s = search(g, depth - 1, -Infinity, Infinity); g.undo();
    if ((maximize && s > best) || (!maximize && s < best)) { best = s; winners = [m.san]; }
    else if (s === best) winners.push(m.san);
  }
  return winners[Math.floor(Math.random() * winners.length)] ?? opts[0].san;
}
self.onmessage = (ev: MessageEvent<Request>) => {
  const { id, fen, level } = ev.data;
  try {
    const g = new Chess(fen); const reply: Reply = { id, move: find(g, level) }; self.postMessage(reply);
  } catch (e) { const reply: Reply = { id, move: null, error: e instanceof Error ? e.message : 'Engine unavailable' }; self.postMessage(reply); }
};
