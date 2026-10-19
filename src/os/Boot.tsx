import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { bootFrame, BOOT_TOTAL } from '../core/bootTimeline';

// The keypress that launches the boot (Enter in the terminal) is still in flight when this mounts, and a held key auto-repeats.
// Ignore skip input briefly so that stray key/click cannot dismiss the animation the instant it starts.
const GRACE_MS = 450;
import type { Intensity } from '../core/settings';
import { MatrixRain } from './MatrixRain';

/** Cinematic boot. Time -> frame is the pure bootFrame(); this component only schedules it (30 fps state updates) and paints it. */
export function Boot({ intensity, onDone }: { intensity: Intensity; onDone: () => void }) {
  const speed = intensity === 'full' ? 1 : 1.7; // Low: same story, told faster, without static or glitch
  const [f, setF] = useState(() => bootFrame(0));
  const noise = useRef<HTMLCanvasElement>(null);
  const finished = useRef(false);
  const mountedAt = useRef(performance.now());
  const skipBtn = useRef<HTMLButtonElement>(null);
  const finish = () => { if (!finished.current) { finished.current = true; onDone(); } };
  const skip = () => { if (performance.now() - mountedAt.current >= GRACE_MS) finish(); };

  useEffect(() => {
    let raf = 0, last = 0; const t0 = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 33) return; last = now;
      const frame = bootFrame(Math.min(BOOT_TOTAL, (now - t0) * speed)); setF(frame);
      const c = noise.current, ctx = c?.getContext('2d');
      if (c && ctx && frame.noise && intensity === 'full') {
        const img = ctx.createImageData(c.width, c.height);
        for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        ctx.putImageData(img, 0, 0);
      }
      if (frame.done) { cancelAnimationFrame(raf); finish(); }
    };
    raf = requestAnimationFrame(tick);
    const key = (e: KeyboardEvent) => { if (['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); if (!e.repeat) skip(); } };
    addEventListener('keydown', key);
    const focusTimer = setTimeout(() => skipBtn.current?.focus(), GRACE_MS + 50); // modal dialog: move focus in, but only once the launching key is done
    return () => { cancelAnimationFrame(raf); removeEventListener('keydown', key); clearTimeout(focusTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typing = f.lines.length < 7 || !f.lines[6]?.ok;
  return (
    <div className="boot" role="dialog" aria-modal="true" aria-label="System boot" style={{ '--r': `${f.iris * 78}vmax` } as CSSProperties}>
      {f.reveal > 0 && <div className="boot-rain" style={{ opacity: f.reveal }}><MatrixRain intensity="low" /></div>}
      <canvas ref={noise} className="boot-noise" width={160} height={90} style={{ opacity: f.noise && intensity === 'full' ? .55 : 0 }} aria-hidden="true" />
      <div className="boot-log" style={{ opacity: 1 - f.reveal }} aria-hidden="true">
        {f.lines.map((l, i) => (
          <div key={i} className="boot-line"><span className="boot-prompt">&gt;</span> {l.text}{l.ok && <span className="boot-ok"> [ OK ]</span>}</div>))}
        {typing && <span className="boot-cursor" />}
      </div>
      <div className="boot-ident" style={{ opacity: f.reveal, transform: `scale(${1.06 - f.reveal * .06})` }} aria-hidden={f.reveal === 0}>
        <h1 className={`boot-name${f.glitch && intensity === 'full' ? ' is-glitch' : ''}`} data-text="PRAVINKUMAR M">PRAVINKUMAR M</h1>
        <p className="boot-role" style={{ letterSpacing: `${.7 - f.reveal * .4}em` }}>DATA ANALYST // STRATEGIC THINKER</p>
        <div className="boot-bar" style={{ transform: `scaleX(${f.reveal})` }} />
      </div>
      <svg className="boot-ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" className="ring-bg" />
        <circle cx="22" cy="22" r="18" className="ring-fg" strokeDasharray={113} strokeDashoffset={113 * (1 - Math.max(f.progress, f.reveal))} /></svg>
      {f.iris > 0 && f.iris < 1 && <div className="boot-iris" style={{ width: `calc(var(--r) * 2)`, height: `calc(var(--r) * 2)` }} aria-hidden="true" />}
      <button ref={skipBtn} className="boot-skip" onClick={skip}>Skip intro</button>
      <p className="sr-only" aria-live="polite">Booting Pravin OS. Press Escape or Skip intro to continue.</p>
    </div>
  );
}
