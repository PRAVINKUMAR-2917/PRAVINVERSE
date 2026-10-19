import { useEffect, useRef } from 'react';
import type { Intensity } from '../core/settings';
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺ0123456789ABCDEF<>/\\|+=';
/** Canvas code rain. One rAF loop, throttled by intensity, paused while the tab is hidden, fully cleaned up on unmount. */
export function MatrixRain({ intensity }: { intensity: Intensity }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c || intensity === 'off') return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const fps = intensity === 'full' ? 24 : 12, size = intensity === 'full' ? 16 : 22;
    let drops: number[] = [], raf = 0, last = 0, w = 0, h = 0;
    const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00ff88';
    const resize = () => {
      w = c.width = c.offsetWidth; h = c.height = c.offsetHeight;
      drops = Array.from({ length: Math.ceil(w / size) }, () => Math.random() * -40);
    };
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || t - last < 1000 / fps) return;
      last = t;
      ctx.fillStyle = 'rgba(3,7,18,.16)'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = accent(); ctx.font = `${size}px monospace`;
      drops.forEach((y, i) => {
        ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * size, y * size);
        drops[i] = y * size > h && Math.random() > .975 ? 0 : y + 1;
      });
    };
    resize(); addEventListener('resize', resize); raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  }, [intensity]);
  return intensity === 'off' ? null : <canvas ref={ref} className="rain" aria-hidden="true" />;
}
