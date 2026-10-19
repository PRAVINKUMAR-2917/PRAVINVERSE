import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { APPS, appById } from './apps';
import { initialWM, wmReducer, type AppId } from './windowManager';
import { loadSettings, prefersReducedMotion, saveSettings, type Settings } from '../core/settings';
import { WindowFrame } from './Window';
import { MatrixRain } from './MatrixRain';
import { Circuits } from './Circuits';
import { SettingsApp } from './SettingsApp';
import { Boot } from './Boot';
import { TerminalApp, type ShownLine } from './TerminalApp';
import { ChessApp } from '../apps/chess/ChessApp';
import { SudokuApp } from '../apps/sudoku/SudokuApp';
import { AnalyticsApp } from '../apps/analytics/AnalyticsApp';
import { AchievementsApp, ProfileApp, ProjectsApp, SystemMapApp } from '../apps/protocol/ProtocolApps';
import { Toasts, type Toast } from './Toasts';
import { execute, type Effect, type Line } from '../terminal/engine';
import { ACH, getRank, loadAch, saveAch, solveMission, unlock, type AchId, type AchState } from '../core/achievements';

const MOBILE_MAX = 720;
const BANNER: Line[] = [{ kind: 'sys', text: 'PRAVINVERSE terminal' }, { kind: 'dim', text: 'Type help for commands. Try: mission' }];
const useViewport = () => {
  const [vp, setVp] = useState({ w: innerWidth, h: innerHeight });
  useEffect(() => { const f = () => setVp({ w: innerWidth, h: innerHeight }); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  return vp;
};
const useClock = () => {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 30_000); return () => clearInterval(i); }, []);
  return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function Desktop() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [wm, dispatch] = useReducer(wmReducer, initialWM);
  const vp = useViewport(); const clock = useClock();
  const mobile = vp.w <= MOBILE_MAX;
  const rootRef = useRef<HTMLDivElement>(null);

  // Play the name animation on every page load, even if a previous version saved introSeen.
  // Keep the old setting for backwards compatibility; intensity Off still disables the intro.
  // The terminal `boot` command can also replay it at any time.
  const [boot, setBoot] = useState<number | null>(() => (settings.intensity !== 'off' ? 1 : null));
  const [rainOn, setRainOn] = useState(true);
  const [ach, setAch] = useState<AchState>(loadAch); const achRef = useRef(ach);
  const [toasts, setToasts] = useState<Toast[]>([]); const toastKey = useRef(0);
  const [mission, setMission] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [lines, setLines] = useState<ShownLine[]>(() => BANNER.map((l, i) => ({ ...l, i })));

  const change = useCallback((p: Partial<Settings>) => setSettings(s => ({ ...s, ...p })), []);
  useEffect(() => { saveSettings(settings); }, [settings]);

  const open = useCallback((id: AppId) => dispatch({ type: 'open', id, vp, size: appById(id).size }), [vp]);

  // Cursor-reactive light + 2.5D parallax. Writes CSS variables from one rAF, never touches React state.
  useEffect(() => {
    const el = rootRef.current; if (!el || settings.intensity === 'off') return;
    let raf = 0, px = 0, py = 0;
    const flush = () => { raf = 0; el.style.setProperty('--mx', `${px}px`); el.style.setProperty('--my', `${py}px`);
      el.style.setProperty('--tx', String((px / innerWidth - .5).toFixed(3))); el.style.setProperty('--ty', String((py / innerHeight - .5).toFixed(3))); };
    const move = (e: PointerEvent) => { if (e.pointerType === 'touch') return; px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(flush); };
    addEventListener('pointermove', move);
    return () => { removeEventListener('pointermove', move); if (raf) cancelAnimationFrame(raf); };
  }, [settings.intensity]);

  // Global keyboard shortcuts. Alt+Tab belongs to the OS, so we use Alt+Arrow keys instead.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'cycle', dir: e.key === 'ArrowRight' ? 1 : -1 }); }
      else if (wm.focused && e.key.toLowerCase() === 'w') { e.preventDefault(); dispatch({ type: 'close', id: wm.focused }); }
      else if (wm.focused && e.key.toLowerCase() === 'm') { e.preventDefault(); dispatch({ type: 'minimize', id: wm.focused }); }
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [wm.focused]);

  const grant = useCallback((fn: (a: AchState) => { state: AchState; newly: AchId[] }) => {
    const r = fn(achRef.current); if (!r.newly.length) return;
    achRef.current = r.state; setAch(r.state);
    setToasts(t => [...t, ...r.newly.map(id => ({ key: ++toastKey.current, title: ACH.find(a => a.id === id)!.name, how: ACH.find(a => a.id === id)!.how }))]);
  }, []);
  useEffect(() => { saveAch(ach); }, [ach]);
  useEffect(() => {
    if (wm.opened.includes('terminal')) grant(a => unlock(a, 'first-contact'));
    if (APPS.filter(a => a.id !== 'settings').every(a => wm.opened.includes(a.id))) grant(a => unlock(a, 'explorer'));
  }, [wm.opened, grant]);
  const dismissToast = useCallback((k: number) => setToasts(t => t.filter(x => x.key !== k)), []);

  const runCommand = useCallback((raw: string) => {
    const res = execute(raw, { mission, ach, rainOn, animated: settings.intensity !== 'off' });
    if (raw.trim()) setHistory(h => [...h, raw].slice(-50));
    if (res.mission !== undefined) setMission(res.mission);
    let extra: Line[] = []; let cleared = false;
    res.effects.forEach((e: Effect) => {
      if (e.type === 'open') open(e.id);
      else if (e.type === 'matrix') setRainOn(v => !v);
      else if (e.type === 'theme') change({ theme: e.theme });
      else if (e.type === 'clear') cleared = true;
      else if (e.type === 'exit') dispatch({ type: 'close', id: 'terminal' });
      else if (e.type === 'boot') setBoot(k => (k ?? 0) + 1);
      else if (e.type === 'secret') {
        grant(a => unlock(a, e.id));
      }
      else if (e.type === 'solve') {
        const before = achRef.current; const r = solveMission(before, e.mission); grant(() => r);
        if (!r.newly.length) { achRef.current = r.state; setAch(r.state); }
        extra = extra.concat(r.newly.map(id => ({ kind: 'ok' as const, text: `ACHIEVEMENT UNLOCKED: ${ACH.find(a => a.id === id)!.name}` })));
      }
    });
    setLines(prev => (cleared ? [] : [...prev, ...[...res.lines, ...extra].map((l, i) => ({ ...l, i }))]).slice(-400));
  }, [mission, ach, rainOn, open, change, settings.intensity, grant]);

  const running = useMemo(() => wm.wins.map(w => w.id), [wm.wins]);

  return (
    <div ref={rootRef} className="os" data-theme={settings.theme} data-intensity={settings.intensity}>
      <a className="skip" href="#desktop-icons">Skip to apps</a>
      <div className="wall" aria-hidden="true">
        <div className="wall-grid" />
        <MatrixRain intensity={rainOn ? settings.intensity : 'off'} />
        <Circuits />
        <div className="wall-vignette" /><div className="wall-glow" />
      </div>

      <main className="desk">
        <nav id="desktop-icons" className="icons" aria-label="Applications">
          {APPS.filter(a => a.id !== 'settings').map(a => (
            <button key={a.id} className="icon" onClick={() => open(a.id)} aria-label={`Open ${a.title}`}>
              <span className="icon-glyph" aria-hidden="true">{a.glyph}</span>
              <span className="icon-file">{a.file}</span>
              {a.phase !== null && <span className="icon-tag">Phase {a.phase}</span>}
            </button>))}
        </nav>

        {wm.wins.map(w => {
          const app = appById(w.id);
          return (
            <WindowFrame key={w.id} win={w} app={app} focused={wm.focused === w.id} mobile={mobile}
              onFocus={() => wm.focused !== w.id && dispatch({ type: 'focus', id: w.id })}
              onClose={() => dispatch({ type: 'close', id: w.id })} onMinimize={() => dispatch({ type: 'minimize', id: w.id })}
              onMove={(x, y) => dispatch({ type: 'move', id: w.id, x, y, vp })} onSettled={() => dispatch({ type: 'settled', id: w.id })}>
              {w.id === 'settings'
                ? <SettingsApp settings={settings} reducedByOS={prefersReducedMotion()} onChange={change} />
                : w.id === 'chess'
                ? <ChessApp sound={settings.sound} onSoundChange={sound => change({ sound })} onCheckmate={() => grant(a => unlock(a, 'checkmate'))} />
                : w.id === 'analytics'
                ? <AnalyticsApp />
                : w.id === 'achievements'
                ? <AchievementsApp ach={ach} onOpenTerminal={() => open('terminal')} />
                : w.id === 'projects'
                ? <ProjectsApp />
                : w.id === 'profile'
                ? <ProfileApp />
                : w.id === 'map'
                ? <SystemMapApp onLaunch={open} />
                : w.id === 'sudoku'
                ? <SudokuApp onSolved={() => grant(a => unlock(a, 'logic-master'))} />
                : w.id === 'terminal'
                ? <TerminalApp lines={lines} history={history} onRun={runCommand} />
                : <div className="stack"><h3 className="pending-title">{app.title}</h3><p>{app.blurb}</p>
                    <p className="pending">Not built yet. This window is a placeholder until Phase {app.phase}.</p></div>}
            </WindowFrame>);
        })}
      </main>

      <footer className="taskbar" role="toolbar" aria-label="Taskbar">
        <button className="task-start" onClick={() => open('settings')} aria-label="Open Settings">
          <span aria-hidden="true">⚙</span><span className="task-start-text">PRAVINVERSE</span></button>
        <div className="task-apps">
          {running.map(id => { const w = wm.wins.find(x => x.id === id)!, a = appById(id);
            return <button key={id} className={`task-app${wm.focused === id ? ' is-active' : ''}`} aria-pressed={wm.focused === id && !w.minimized}
              onClick={() => (wm.focused === id && !w.minimized ? dispatch({ type: 'minimize', id }) : open(id))}>
              <span aria-hidden="true">{a.glyph}</span><span className="task-app-text">{a.title}</span></button>; })}
        </div>
        <button className="task-xp" onClick={() => open('achievements')} aria-label="Open Achievements and XP">✦ LVL {getRank(ach).level} · {getRank(ach).xp} XP</button>
        <span className="task-hint" aria-hidden="true">Alt + ← → switch · Alt+W close · Alt+M minimize</span>
        <time className="task-clock">{clock}</time>
      </footer>
      <Toasts items={toasts} onDone={dismissToast} />
      {boot !== null && <Boot key={boot} intensity={settings.intensity} onDone={() => {
        setBoot(null); if (!settings.introSeen) change({ introSeen: true });
        // hand keyboard focus back to the active window's input (e.g. the terminal)
        requestAnimationFrame(() => { const w = rootRef.current?.querySelector<HTMLElement>('.win.is-focused'); (w?.querySelector<HTMLElement>('input, textarea') ?? w)?.focus({ preventScroll: true }); });
      }} />}
      <p className="sr-only" aria-live="polite">{wm.focused ? `${appById(wm.focused).title} focused` : 'Desktop'}</p>
    </div>
  );
}
