import { useEffect, useRef, type ReactNode, type PointerEvent, type KeyboardEvent } from 'react';
import type { Win } from './windowManager';
import type { AppDef } from './apps';

interface Props {
  win: Win; app: AppDef; focused: boolean; mobile: boolean; children: ReactNode;
  onFocus: () => void; onClose: () => void; onMinimize: () => void; onMove: (x: number, y: number) => void; onSettled: () => void;
}
export function WindowFrame({ win, app, focused, mobile, children, onFocus, onClose, onMinimize, onMove, onSettled }: Props) {
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  // Move keyboard focus into a window when it becomes the focused one.
  useEffect(() => { // do not steal focus from a control inside the window (e.g. the terminal input)
    const el = ref.current; if (focused && !win.minimized && el && !el.contains(document.activeElement)) el.focus({ preventScroll: true }); }, [focused, win.minimized]);

  const down = (e: PointerEvent) => {
    if (mobile || (e.target as HTMLElement).closest('button')) return;
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => { if (drag.current) onMove(e.clientX - drag.current.dx, e.clientY - drag.current.dy); };
  const up = () => { drag.current = null; };
  const key = (e: KeyboardEvent) => { // title bar is focusable; arrows nudge the window so dragging is not mouse-only
    const step = e.shiftKey ? 48 : 16, d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const v = d[e.key]; if (v && !mobile) { e.preventDefault(); e.stopPropagation(); onMove(win.x + v[0], win.y + v[1]); }
  };

  return (
    <section
      ref={ref} tabIndex={-1} role="dialog" aria-label={app.title} aria-hidden={win.minimized}
      className={`win${focused ? ' is-focused' : ''}${win.minimized ? ' is-min' : ''}${win.opening ? ' is-opening' : ''}`}
      style={{ left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }}
      onPointerDownCapture={onFocus} onAnimationEnd={e => { if (e.animationName === 'win-in') onSettled(); }}
    >
      <header className="win-bar" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <span className="win-glyph" aria-hidden="true">{app.glyph}</span>
        <h2 className="win-title" tabIndex={0} onKeyDown={key} aria-label={`${app.title}. Arrow keys move the window.`}>{app.file}</h2>
        <span className="win-coord" aria-hidden="true">x{Math.round(win.x)} y{Math.round(win.y)}</span>
        <button className="win-btn" onClick={onMinimize} aria-label={`Minimize ${app.title}`}>–</button>
        <button className="win-btn win-close" onClick={onClose} aria-label={`Close ${app.title}`}>×</button>
      </header>
      <div className="win-body">{children}</div>
    </section>
  );
}
