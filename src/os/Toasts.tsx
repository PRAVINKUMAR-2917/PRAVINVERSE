import { useEffect } from 'react';
export interface Toast { key: number; title: string; how: string }
function Item({ t, onDone }: { t: Toast; onDone: (k: number) => void }) {
  useEffect(() => { const id = setTimeout(() => onDone(t.key), 4500); return () => clearTimeout(id); }, [t.key, onDone]);
  return <div className="toast"><span className="toast-star" aria-hidden="true">✦</span><div><strong>Achievement unlocked: {t.title}</strong><small>{t.how}</small></div></div>;
}
export function Toasts({ items, onDone }: { items: Toast[]; onDone: (k: number) => void }) {
  return <div className="toasts" role="status" aria-live="polite">{items.map(t => <Item key={t.key} t={t} onDone={onDone} />)}</div>;
}
