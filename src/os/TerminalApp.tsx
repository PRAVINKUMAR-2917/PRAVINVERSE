import { useEffect, useRef, useState, type KeyboardEvent, type CSSProperties } from 'react';
import { complete, type Line } from '../terminal/engine';
export type ShownLine = Line & { i: number };
interface Props { lines: ShownLine[]; history: string[]; onRun: (cmd: string) => void }

export function TerminalApp({ lines, history, onRun }: Props) {
  const [value, setValue] = useState(''); const [cursor, setCursor] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null), end = useRef<HTMLDivElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [lines.length]);

  const submit = () => { onRun(value); setValue(''); setCursor(null); };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); onRun('clear'); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault(); if (!history.length) return;
      const next = e.key === 'ArrowUp' ? Math.max(0, (cursor ?? history.length) - 1) : (cursor ?? history.length) + 1;
      if (next >= history.length) { setCursor(null); setValue(''); } else { setCursor(next); setValue(history[next]); }
    } else if (e.key === 'Tab') {
      e.preventDefault(); const m = complete(value.trim());
      if (value.trim() && !value.includes(' ') && m.length === 1) setValue(m[0] + ' ');
    }
  };
  return (
    <div className="term" onClick={() => { if (!getSelection()?.toString()) input.current?.focus(); }}>
      <div className="term-log" role="log" aria-live="polite" aria-label="Terminal output">
        {lines.map((l, idx) => (
          <div key={idx} className={`t-line t-${l.kind}`} style={{ '--i': Math.min(l.i, 24) } as CSSProperties}>
            {l.kind === 'in' && <span className="t-prompt">pravin@pravinverse:~$ </span>}{l.text || '\u00a0'}
          </div>))}
        <div ref={end} />
      </div>
      <label className="term-input">
        <span className="t-prompt" aria-hidden="true">pravin@pravinverse:~$ </span>
        <input ref={input} value={value} onChange={e => { setValue(e.target.value); setCursor(null); }} onKeyDown={onKey}
          spellCheck={false} autoCapitalize="off" autoComplete="off" autoCorrect="off" aria-label="Terminal command" enterKeyHint="send" />
      </label>
    </div>
  );
}
