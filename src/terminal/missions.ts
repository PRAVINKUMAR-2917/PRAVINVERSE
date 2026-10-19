import { Chess } from 'chess.js';

export interface Mission { id: string; title: string; briefing: string[]; hint: string; check: (answer: string) => boolean }
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

// 1. Caesar cipher: ciphertext is computed from the plaintext, so it can never drift out of sync with the check.
export const caesar = (text: string, shift: number) =>
  text.replace(/[A-Z]/gi, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + shift + 26) % 26) + b); });
export const CIPHER_PLAIN = 'PATTERN HUNTER', CIPHER_SHIFT = 7;
export const CIPHER_TEXT = caesar(CIPHER_PLAIN, CIPHER_SHIFT);

// 2. Number sequence n*(n+1)
export const SEQUENCE = [2, 6, 12, 20, 30];
export const SEQUENCE_NEXT = (SEQUENCE.length + 1) * (SEQUENCE.length + 2);

// 3. Mate in one: any legal move that checkmates counts, validated by chess.js
export const MATE_FEN = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
export function isMatingMove(fen: string, move: string): boolean {
  const g = new Chess(fen);
  // Players often type piece letters in lower case (ra8). 'b' is left alone because it is also a file.
  const san = move.trim().replace(/^[rnqk](?=[a-h1-8x])/, c => c.toUpperCase());
  try { g.move(san, { strict: false }); } catch { return false; }
  return g.isCheckmate();
}

// 4. Mini Sudoku (4x4). Answer = the 7 missing digits in reading order.
export const MINI_PUZZLE = ['12.4', '.41.', '.14.', '4..1'];
export const MINI_SOLUTION = ['1234', '3412', '2143', '4321'];
export const miniMissing = () => MINI_PUZZLE.flatMap((r, i) => [...r].flatMap((c, j) => (c === '.' ? [MINI_SOLUTION[i][j]] : []))).join('');

// 5. Anomaly: deterministic synthetic daily orders; the answer is derived from the data (largest |z-score|).
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const ANOMALY_DAYS = 14, ANOMALY_INJECTED_INDEX = 8;
export const ANOMALY_DATA: number[] = (() => { const r = mulberry32(2917); const d = Array.from({ length: ANOMALY_DAYS }, () => Math.round(100 + (r() - .5) * 14)); d[ANOMALY_INJECTED_INDEX] = 163; return d; })();
export function anomalyDay(data: number[]): number {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const sd = Math.sqrt(data.reduce((a, b) => a + (b - mean) ** 2, 0) / data.length);
  let best = 0; data.forEach((v, i) => { if (Math.abs(v - mean) / sd > Math.abs(data[best] - mean) / sd) best = i; });
  return best + 1;
}

export const MISSIONS: Mission[] = [
  { id: 'cipher', title: 'Decode the signal', hint: 'Every letter was moved the same number of steps along the alphabet. E is the most common letter in English; try that idea.',
    briefing: ['A caesar-shifted message was intercepted:', `  ${CIPHER_TEXT}`, 'Decode it.'], check: a => norm(a) === norm(CIPHER_PLAIN) },
  { id: 'sequence', title: 'Next in sequence', hint: 'Look at the gaps between neighbours: 4, 6, 8, 10. What gap comes next?',
    briefing: [`  ${SEQUENCE.join(', ')}, ?`, 'What number comes next?'], check: a => a.trim() === String(SEQUENCE_NEXT) },
  { id: 'chess', title: 'Hidden chess move', hint: 'The black king is boxed in by its own pawns. Which file does your rook need to reach, and on which rank?',
    briefing: ['White to move. Mate in one.', '  8  . . . . . . k .', '  7  . . . . . p p p', '  6  . . . . . . . .', '  5  . . . . . . . .', '  4  . . . . . . . .', '  3  . . . . . . . .', '  2  . . . . . P P P', '  1  R . . . . . K .', '     a b c d e f g h', 'Answer with the move, e.g. Qd4.'],
    check: a => isMatingMove(MATE_FEN, a) },
  { id: 'sudoku', title: 'Mini Sudoku', hint: 'Start with the top-left box: it holds 1, 2 and 4, so the empty cell there must be 3. Rows, columns and 2x2 boxes each hold 1 to 4 once.',
    briefing: ['Fill every dot so each row, column and 2x2 box holds 1-4 once.', ...MINI_PUZZLE.map(r => '  ' + [...r].join(' ')), 'Answer with the 7 missing digits in reading order (left to right, top to bottom).'],
    check: a => a.replace(/[^0-9]/g, '') === miniMissing() },
  { id: 'anomaly', title: 'Find the anomaly', hint: 'Compute the average first, then find the day that sits furthest from it. Synthetic data, one planted outlier.',
    briefing: ['Daily orders, last 14 days (synthetic demo data):', ...ANOMALY_DATA.map((v, i) => `  day ${String(i + 1).padStart(2)}: ${v}`), 'Which day is the anomaly?'],
    check: a => a.replace(/[^0-9]/g, '') === String(anomalyDay(ANOMALY_DATA)) },
];
export const missionById = (id: string) => MISSIONS.find(m => m.id === id);
