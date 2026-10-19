import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Chess, type Square } from 'chess.js';
import { beep } from './sound';
import { CHESS_KEY, captureCount, fromMoves, gameStatus, legalDestinations, loadGame, type Mode, type Side, type StoredGame } from './game';
import './chess.css';

const glyphs: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};
const names: Record<string, string> = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const pieceScore: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const levelNames = ['Beginner', 'Casual', 'Advanced', 'Expert'];
const sameMoves = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

interface Props { onCheckmate: () => void; sound: boolean; onSoundChange: (enabled: boolean) => void }
export function ChessApp({ onCheckmate, sound, onSoundChange }: Props) {
  const [saved, setSaved] = useState<StoredGame>(loadGame);
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [engineError, setEngineError] = useState(false);
  const [review, setReview] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const awarded = useRef<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const game = useMemo(() => fromMoves(saved.moves), [saved.moves]);
  const viewed = useMemo(() => review === null ? game : fromMoves(saved.moves, review), [game, saved.moves, review]);
  const captured = useMemo(() => captureCount(viewed), [viewed]);
  const isHumanTurn = saved.mode === 'human' || game.turn() === saved.side;
  const locked = thinking || review !== null || saved.resigned || game.isGameOver() || !isHumanTurn;
  const legal = useMemo(() => legalDestinations(game, selected), [game, selected]);
  const last = viewed.history({ verbose: true }).at(-1);
  const files = saved.flipped ? 'hgfedcba' : 'abcdefgh';
  const ranks = saved.flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];

  useEffect(() => { try { localStorage.setItem(CHESS_KEY, JSON.stringify(saved)); } catch { /* browser storage denied */ } }, [saved]);
  // Only award a computer win. Persisted checkmates may re-open; unlocking is idempotent in Desktop.
  useEffect(() => {
    if (saved.mode === 'computer' && game.isCheckmate() && game.turn() !== saved.side && !saved.resigned) {
      const key = saved.moves.join('|');
      if (awarded.current !== key) { awarded.current = key; onCheckmate(); }
    }
  }, [game, saved.mode, saved.side, saved.moves, saved.resigned, onCheckmate]);

  // All computer search runs in a bundled offline Web Worker so the OS remains responsive.
  useEffect(() => {
    if (saved.mode !== 'computer' || game.turn() === saved.side || game.isGameOver() || saved.resigned || review !== null) {
      setThinking(false); return;
    }
    let cancelled = false;
    let settled = false;
    let worker: Worker | undefined;
    let timer: number | undefined;
    const snapshot = saved.moves;
    setThinking(true); setEngineError(false);
    const fallback = () => {
      if (cancelled || settled) return;
      settled = true;
      worker?.terminate();
      setEngineError(true);
      const legalNow = game.moves();
      const move = legalNow[0];
      if (move) setSaved(s => sameMoves(s.moves, snapshot) && s.mode === 'computer' && !s.resigned ? { ...s, moves: [...s.moves, move] } : s);
      setThinking(false);
    };
    timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (ev: MessageEvent<{ id: number; move: string | null; error?: string }>) => {
          if (cancelled || settled || ev.data.id !== 1) return;
          if (ev.data.error || !ev.data.move) { fallback(); return; }
          // A worker result is untrusted: validate the move against the original board.
          try {
            const checked = new Chess(game.fen()); checked.move(ev.data.move);
            settled = true;
            const next = ev.data.move;
            setSaved(s => sameMoves(s.moves, snapshot) && s.mode === 'computer' && !s.resigned ? { ...s, moves: [...s.moves, next] } : s);
            beep(sound, checked.isGameOver() ? 'end' : 'move');
          } catch { fallback(); return; }
          setThinking(false);
        };
        worker.onerror = () => fallback();
        worker.postMessage({ id: 1, fen: game.fen(), level: saved.level });
      } catch { fallback(); }
    }, 250);
    return () => { cancelled = true; if (timer !== undefined) clearTimeout(timer); worker?.terminate(); };
  }, [game, saved.moves, saved.mode, saved.side, saved.level, saved.resigned, review, sound]);

  const play = (from: Square, to: Square, piece: 'q' | 'r' | 'b' | 'n' = 'q') => {
    if (locked) return;
    try {
      const copy = new Chess(game.fen());
      const m = copy.move({ from, to, promotion: piece });
      if (!m) return;
      setSaved(s => ({ ...s, moves: [...s.moves, m.san], resigned: false }));
      beep(sound, copy.isGameOver() ? 'end' : m.captured ? 'capture' : 'move');
      setAnnouncement(`${m.color === 'w' ? 'White' : 'Black'} played ${m.san}. ${gameStatus(copy)}`);
      setSelected(null); setPromotion(null); setReview(null);
    } catch { setSelected(null); }
  };
  const pick = (sq: Square) => {
    if (locked || promotion) return;
    const p = game.get(sq);
    if (selected && legal.includes(sq)) {
      const mover = game.get(selected);
      if (mover?.type === 'p' && (sq[1] === '1' || sq[1] === '8')) {
        setPromotion({ from: selected, to: sq }); return;
      }
      play(selected, sq); return;
    }
    setSelected(p?.color === game.turn() ? sq : null);
  };
  const reset = (changes: Partial<StoredGame> = {}) => {
    setSaved(s => ({ ...s, moves: [], resigned: false, ...changes }));
    setSelected(null); setPromotion(null); setReview(null); setThinking(false); setEngineError(false); awarded.current = null;
  };
  const restart = () => { if (window.confirm('Start a new game?')) reset(); };
  const undo = () => {
    if (thinking || !saved.moves.length || saved.resigned) return;
    // Vs computer: return to the last position where it is the player's turn.
    const moves = saved.moves.slice();
    if (saved.mode === 'human') moves.pop();
    else {
      do { moves.pop(); } while (moves.length && fromMoves(moves).turn() !== saved.side);
    }
    setSaved(s => ({ ...s, moves, resigned: false }));
    setSelected(null); setPromotion(null); setReview(null);
  };
  const onArrow = (e: ReactKeyboardEvent<HTMLButtonElement>, r: number, c: number) => {
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };
    const delta = deltas[e.key]; if (!delta) return;
    e.preventDefault();
    const nr = Math.max(0, Math.min(7, r + delta[0]));
    const nc = Math.max(0, Math.min(7, c + delta[1]));
    const next = `${files[nc]}${ranks[nr]}`;
    boardRef.current?.querySelector<HTMLButtonElement>(`button[data-square="${next}"]`)?.focus();
  };
  const material = (list: string[]) => list.reduce((sum, p) => sum + pieceScore[p], 0);
  return <div className="chess-app">
    <div className="chess-board-wrap"><div ref={boardRef} className="chess-board" role="grid" aria-label="Chessboard">
      {ranks.flatMap((r, row) => [...files].map((f, c) => {
        const sq = `${f}${r}` as Square; const p = viewed.get(sq);
        // a1 must be dark; reversing the view does not change a square's color.
        const dark = (f.charCodeAt(0) - 97 + r) % 2 === 1;
        return <button type="button" role="gridcell" key={sq} data-square={sq} onKeyDown={e => onArrow(e, row, c)}
          aria-label={`${sq}${p ? ` ${p.color === 'w' ? 'white' : 'black'} ${names[p.type]}` : ' empty'}`}
          aria-selected={selected === sq} disabled={false}
          className={`chess-square ${dark ? 'dark' : 'light'} ${selected === sq ? 'selected' : ''} ${review === null && legal.includes(sq) ? 'legal' : ''} ${last && (last.from === sq || last.to === sq) ? 'last' : ''} ${p?.type === 'k' && p.color === viewed.turn() && viewed.isCheck() ? 'checked' : ''}`}
          onClick={() => pick(sq)} draggable={!locked && !!p && p.color === game.turn()}
          onDragStart={e => { if (locked) { e.preventDefault(); return; } e.dataTransfer.setData('text/plain', sq); }}
          onDragOver={e => { if (!locked) e.preventDefault(); }}
          onDrop={e => {
            e.preventDefault(); if (locked) return;
            const from = e.dataTransfer.getData('text/plain') as Square;
            if (!from || !game.get(from) || game.get(from)?.color !== game.turn()) return;
            if (!game.moves({ square: from, verbose: true }).some(m => m.to === sq)) return;
            if (game.get(from)?.type === 'p' && (r === 1 || r === 8)) setPromotion({ from, to: sq });
            else play(from, sq);
          }}>
          {p && <span className={`chess-piece ${p.color === 'w' ? 'white' : 'black'}`} aria-hidden="true">{glyphs[p.color + p.type]}</span>}
          {review === null && legal.includes(sq) && !p && <span className="chess-dot" aria-hidden="true" />}
          {c === 0 && <small className="rank" aria-hidden="true">{r}</small>}
          {row === 7 && <small className="file" aria-hidden="true">{f}</small>}
        </button>;
      }))}
    </div><span className="sr-only" aria-live="polite">{announcement}</span></div>
    <aside className="chess-panel"><h3>♞ CHESS ARENA</h3>
      <div className="chess-status" role="status">{thinking ? 'Computer thinking…' : gameStatus(game, saved.resigned)}{review !== null ? ' · Viewing history' : ''}</div>
      <label>Mode <select aria-label="Game mode" value={saved.mode} onChange={e => {
        if (saved.moves.length && !window.confirm('Switch mode and restart?')) return;
        reset({ mode: e.target.value as Mode });
      }}><option value="computer">Vs Computer</option><option value="human">Two players</option></select></label>
      {saved.mode === 'computer' && <>
        <label>Your pieces <select aria-label="Your pieces" value={saved.side} onChange={e => {
          if (saved.moves.length && !window.confirm('Change sides and restart?')) return;
          const side = e.target.value as Side | 'random'; const actual = side === 'random' ? (Math.random() < .5 ? 'w' : 'b') : side;
          reset({ side: actual, flipped: actual === 'b' });
        }}><option value="w">White</option><option value="b">Black</option><option value="random">Random (new game)</option></select></label>
        <label>AI strength <select aria-label="AI strength" value={saved.level} onChange={e => setSaved(s => ({ ...s, level: Number(e.target.value) }))}>
          {levelNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
        </select></label>
        <p className="chess-engine-note">{engineError ? 'Engine worker unavailable; using a legal-move fallback.' : 'Offline built-in engine (depth-limited, not Stockfish)'}</p>
      </>}
      <label>Sound <input aria-label="Chess sounds" type="checkbox" checked={sound} onChange={e => onSoundChange(e.target.checked)} /></label>
      <div className="chess-actions">
        <button onClick={undo} disabled={!saved.moves.length || thinking || saved.resigned}>↶ Undo</button>
        <button onClick={() => setSaved(s => ({ ...s, flipped: !s.flipped }))}>⇅ Flip</button>
        <button onClick={restart}>↻ Restart</button>
        <button disabled={saved.resigned || game.isGameOver()} onClick={() => { if (window.confirm('Resign this game?')) { setSaved(s => ({ ...s, resigned: true })); setThinking(false); } }}>Resign</button>
      </div>
      <div className="chess-captures"><span>White captured: {captured.white.map(p => glyphs['b' + p]).join(' ') || '—'} ({material(captured.white)})</span>
        <span>Black captured: {captured.black.map(p => glyphs['w' + p]).join(' ') || '—'} ({material(captured.black)})</span></div>
      <h4>MOVE HISTORY</h4>
      <div className="chess-history" aria-label="Move history">
        <button onClick={() => setReview(null)} className={review === null ? 'active' : ''} aria-label="Return to current position">● Live</button>
        {saved.moves.map((m, i) => <button key={i} className={review === i + 1 ? 'active' : ''} onClick={() => { setSelected(null); setReview(i + 1); }}>{i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''}{m}</button>)}
      </div>
      <div className="chess-footer">Legal moves: chess.js · Saved in this browser · No paid API</div>
    </aside>
    {promotion && <div className="chess-promotion" role="dialog" aria-modal="true" aria-label="Choose promotion">
      <strong>Promote pawn</strong>{(['q', 'r', 'b', 'n'] as const).map(p => <button key={p} aria-label={`Promote to ${names[p]}`} onClick={() => play(promotion.from, promotion.to, p)}>{glyphs[game.turn() + p]}</button>)}
      <button onClick={() => { setPromotion(null); setSelected(null); }}>Cancel</button>
    </div>}
  </div>;
}
