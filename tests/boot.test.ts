import { describe, it, expect } from 'vitest';
import { bootFrame, BOOT_LINES, BOOT_TOTAL, T } from '../src/core/bootTimeline';
describe('boot timeline', () => {
  it('starts black: no lines, no noise, not done', () => { const f = bootFrame(0); expect(f.lines).toHaveLength(0); expect(f.noise).toBe(false); expect(f.done).toBe(false); });
  it('shows static only inside its window', () => { expect(bootFrame(T.noiseA + 1).noise).toBe(true); expect(bootFrame(T.noiseB + 1).noise).toBe(false); });
  it('types lines progressively, in order', () => {
    const f = bootFrame(T.logA + T.perLine + 100);
    expect(f.lines).toHaveLength(2); expect(f.lines[0].text).toBe(BOOT_LINES[0]); expect(f.lines[0].ok).toBe(true);
    expect(f.lines[1].text.length).toBeGreaterThan(0); expect(f.lines[1].text.length).toBeLessThan(BOOT_LINES[1].length);
  });
  it('all lines complete before the identity reveal', () => {
    const f = bootFrame(T.identA - 1); expect(f.lines.map(l => l.text)).toEqual(BOOT_LINES); expect(f.lines.every(l => l.ok)).toBe(true);
  });
  it('progress, reveal and iris are monotonic and within 0..1', () => {
    let prev = { p: 0, r: 0, i: 0 };
    for (let t = 0; t <= BOOT_TOTAL + 100; t += 50) {
      const f = bootFrame(t);
      for (const v of [f.progress, f.reveal, f.iris]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      expect(f.progress).toBeGreaterThanOrEqual(prev.p); expect(f.reveal).toBeGreaterThanOrEqual(prev.r); expect(f.iris).toBeGreaterThanOrEqual(prev.i);
      prev = { p: f.progress, r: f.reveal, i: f.iris };
    }
  });
  it('finishes exactly at the total duration', () => { expect(bootFrame(BOOT_TOTAL - 1).done).toBe(false); expect(bootFrame(BOOT_TOTAL).done).toBe(true); expect(bootFrame(BOOT_TOTAL).iris).toBe(1); });
});
