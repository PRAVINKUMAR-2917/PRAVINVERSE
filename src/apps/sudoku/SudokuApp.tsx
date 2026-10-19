import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { candidates, col, complete, conflicts, formatTime, loadGame, peers, row, saveGame, start, type Difficulty, type SudokuSave } from './sudoku';
import './sudoku.css';

interface Props { onSolved?: () => void; }
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export function SudokuApp({ onSolved }: Props) {
  const [game, setGame] = useState<SudokuSave>(loadGame);
  const [selected, setSelected] = useState(0);
  const [pencil, setPencil] = useState(false);
  const [showErrors, setShowErrors] = useState(true);
  const [notice, setNotice] = useState('Choose a cell, then enter a digit.');
  const [help, setHelp] = useState(false);
  const board = useRef<(HTMLButtonElement | null)[]>([]);
  const awarded = useRef(false);

  useEffect(() => { saveGame(game); }, [game]);
  useEffect(() => {
    if (game.ended || game.paused) return;
    const ticker = setInterval(() => setGame(g => g.paused || g.ended ? g : { ...g, seconds: g.seconds + 1 }), 1000);
    return () => clearInterval(ticker);
  }, [game.paused, game.ended]);
  useEffect(() => {
    if (!game.ended || !complete(game) || game.assisted || awarded.current) return;
    awarded.current = true;
    onSolved?.();
  }, [game, onSolved]);

  const choose = (i: number) => { setSelected(i); board.current[i]?.focus(); };
  const enter = (n: number) => {
    if (game.paused || game.ended || game.givens[selected]) return;
    if (pencil && n !== 0) {
      setGame(g => {
        const notes = g.notes.map(a => [...a]);
        notes[selected] = notes[selected].includes(n) ? notes[selected].filter(a => a !== n) : [...notes[selected], n].sort();
        return { ...g, notes };
      });
      return;
    }
    setGame(g => {
      if (g.ended || g.paused || g.givens[selected]) return g;
      const entries = [...g.entries]; entries[selected] = n;
      const notes = g.notes.map(a => [...a]); notes[selected] = [];
      if (n) for (let i = 0; i < 81; i++) if (peers(i, selected)) notes[i] = notes[i].filter(x => x !== n);
      const solved = entries.every((v, i) => v === g.solution[i]);
      return { ...g, entries, notes,
        mistakes: g.mistakes + (n !== 0 && n !== g.solution[selected] ? 1 : 0), ended: solved };
    });
    setNotice(n === 0 ? 'Cell cleared.' : 'Digit entered.');
  };
  const hint = () => {
    if (game.ended || game.paused) return;
    const at = game.givens[selected] === 0 && game.entries[selected] !== game.solution[selected]
      ? selected : game.entries.findIndex((n, i) => n !== game.solution[i]);
    if (at < 0) return;
    setSelected(at);
    setGame(g => {
      const entries = [...g.entries]; entries[at] = g.solution[at];
      const notes = g.notes.map(a => [...a]); notes[at] = [];
      return { ...g, entries, notes, hints: g.hints + 1, assisted: true, ended: entries.every((v, i) => v === g.solution[i]) };
    });
    setNotice(`Hint: row ${row(at) + 1}, column ${col(at) + 1} is ${game.solution[at]}.`);
  };
  const newGame = (difficulty: Difficulty) => {
    if (!game.ended && game.entries.some((n, i) => n !== game.givens[i]) && !window.confirm('Start a new puzzle? Your current progress will be replaced.')) return;
    awarded.current = false;
    setGame(start(difficulty)); setSelected(0); setPencil(false); setNotice('New unique-solution puzzle ready.');
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('select, input')) return;
    const move: Record<string, number> = { ArrowLeft: selected % 9 ? selected - 1 : selected, ArrowRight: selected % 9 < 8 ? selected + 1 : selected,
      ArrowUp: selected >= 9 ? selected - 9 : selected, ArrowDown: selected < 72 ? selected + 9 : selected };
    if (e.key in move) { e.preventDefault(); e.stopPropagation(); choose(move[e.key]); }
    else if (/^[1-9]$/.test(e.key)) { e.preventDefault(); enter(Number(e.key)); }
    else if (['Backspace', 'Delete', '0'].includes(e.key)) { e.preventDefault(); enter(0); }
    else if (e.key.toLowerCase() === 'n') { e.preventDefault(); setPencil(p => !p); }
  };
  const solveAll = () => {
    if (game.ended || !window.confirm('Reveal the full solution? This puzzle will not earn the LOGIC MASTER achievement.')) return;
    setGame(g => ({ ...g, entries: [...g.solution], notes: g.notes.map(() => []), assisted: true, ended: true }));
    setNotice('Solution revealed — no achievement awarded.');
  };
  const progress = game.entries.filter((n, i) => n !== 0 && n === game.solution[i]).length;
  return (
    <div className="sudoku-app" onKeyDown={key}>
      <div className="sudoku-top">
        <div><h3>SUDOKU<span>_LAB</span></h3><p>OFFLINE LOGIC ENGINE · UNIQUE SOLUTION</p></div>
        <label>LEVEL <select aria-label="Sudoku difficulty" value={game.difficulty} onChange={e => newGame(e.target.value as Difficulty)}>
          <option value="easy">BEGINNER</option><option value="medium">INTERMEDIATE</option><option value="hard">HARD</option><option value="expert">EXPERT</option>
        </select></label>
      </div>
      <div className="sudoku-layout">
        <div className="sudoku-left">
          <div className="sudoku-stats" aria-label="Sudoku stats">
            <span>⏱ {formatTime(game.seconds)}</span><span>ERRORS {game.mistakes}</span><span>HINTS {game.hints}</span>
          </div>
          <div className="sudoku-grid" role="grid" aria-label="Sudoku board" aria-readonly="false">
            {Array.from({ length: 9 }, (_, r) => <div className="sudoku-row" role="row" key={r}>
              {NUMBERS.map((_, c) => {
                const i = r * 9 + c; const n = game.entries[i]; const given = !!game.givens[i];
                const wrong = n !== 0 && !given && n !== game.solution[i];
                const related = i !== selected && peers(i, selected);
                const matching = n !== 0 && n === game.entries[selected];
                const candidate = candidates(game.entries, i);
                return <button key={i} ref={el => { board.current[i] = el; }} role="gridcell" type="button"
                  aria-selected={i === selected} aria-label={`Row ${r + 1} column ${c + 1}, ${n ? words[n - 1] : 'empty'}${given ? ', fixed' : ''}${wrong && showErrors ? ', incorrect' : ''}`}
                  title={`R${r + 1} C${c + 1}`}
                  className={`sudoku-cell${given ? ' fixed' : ''}${i === selected ? ' active' : ''}${related ? ' peer' : ''}${matching ? ' match' : ''}${(wrong || conflicts(game.entries, i)) && showErrors ? ' error' : ''}${r % 3 === 2 ? ' box-bottom' : ''}${c % 3 === 2 ? ' box-right' : ''}`}
                  onClick={() => choose(i)} disabled={game.paused}>
                  {n || (game.notes[i].length ? <span className="sudoku-notes">{NUMBERS.map(x => <span key={x}>{game.notes[i].includes(x) ? x : ''}</span>)}</span> : null)}
                  {!n && i === selected && !game.notes[i].length && !game.paused && <span className="sudoku-candidate" aria-hidden="true">{candidate.length === 1 ? '·' : ''}</span>}
                </button>;
              })}
            </div>)}
            {game.paused && <div className="sudoku-curtain"><strong>PAUSED</strong><button onClick={() => setGame(g => ({ ...g, paused: false }))}>RESUME</button></div>}
            {game.ended && <div className="sudoku-finished"><strong>{game.assisted ? 'PUZZLE REVEALED' : 'PUZZLE COMPLETE!'}</strong><span>{formatTime(game.seconds)} · {game.mistakes} mistakes</span><button onClick={() => newGame(game.difficulty)}>NEXT PUZZLE</button></div>}
          </div>
          <div className="sudoku-numpad" aria-label="Enter a number">{NUMBERS.map(n => <button key={n} onClick={() => enter(n)} disabled={game.paused || game.ended} aria-label={`Enter ${n}`}>{n}</button>)}</div>
          <div className="sudoku-progress"><span>GRID COMPLETE</span><span>{progress}/81</span><div><span style={{ width: `${progress / 81 * 100}%` }} /></div></div>
        </div>
        <aside className="sudoku-sidebar">
          <div className="sudoku-banner" role="status" aria-live="polite">{notice}</div>
          <div className="sudoku-actions">
            <button onClick={() => setPencil(p => !p)} className={pencil ? 'on' : ''} aria-pressed={pencil}>✎ NOTES {pencil ? 'ON' : 'OFF'}</button>
            <button onClick={() => enter(0)} disabled={game.paused || game.ended}>⌫ ERASE</button>
            <button onClick={hint} disabled={game.paused || game.ended}>◇ HINT</button>
            <button onClick={() => setGame(g => ({ ...g, paused: !g.paused }))} disabled={game.ended}>{game.paused ? '▶ RESUME' : 'Ⅱ PAUSE'}</button>
            <button onClick={() => newGame(game.difficulty)}>↻ NEW GAME</button>
            <button onClick={solveAll} disabled={game.ended}>⚙ SOLVE</button>
          </div>
          <label className="sudoku-error-toggle"><input type="checkbox" checked={showErrors} onChange={e => setShowErrors(e.target.checked)} /> HIGHLIGHT ERRORS</label>
          <button className="sudoku-help-btn" onClick={() => setHelp(p => !p)} aria-expanded={help}>? HOW TO PLAY</button>
          {help && <div className="sudoku-help">Fill every row, column, and 3×3 box with digits 1–9 without repeating. Select a square and click a number, or type on your keyboard. Arrow keys move between cells; N toggles notes; Backspace erases. Hints or solving forfeit the achievement.</div>}
          <div className="sudoku-info">Auto-saved locally · No internet needed<br/>A unique answer is verified for each puzzle.<br/>Complete without hints to unlock LOGIC MASTER.</div>
        </aside>
      </div>
    </div>
  );
}
