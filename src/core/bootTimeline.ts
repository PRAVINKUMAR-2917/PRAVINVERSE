export const BOOT_LINES = ['BOOTING PRAVINVERSE', 'INITIALIZING NEURAL INTERFACE', 'LOADING CHESS ENGINE', 'LOADING SUDOKU INTELLIGENCE', 'CONNECTING DATA PIPELINES', 'ANALYTICAL CORE ONLINE', 'SYSTEM ACCESS GRANTED'];
// All times in ms on one timeline: black+cursor, static, log, identity reveal, iris wipe into the desktop.
export const T = { noiseA: 650, noiseB: 1150, logA: 1250, perLine: 520, typeMs: 380, identA: 5000, identB: 7000, irisA: 7000, irisB: 8200 } as const;
export const BOOT_TOTAL = T.irisB;
export interface BootFrame {
  lines: { text: string; ok: boolean }[]; progress: number; noise: boolean; glitch: boolean; reveal: number; iris: number; done: boolean;
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Pure function of time, so the whole cinematic can be tested without a browser. */
export function bootFrame(t: number): BootFrame {
  const lines = BOOT_LINES.flatMap((full, i) => {
    const start = T.logA + i * T.perLine; if (t < start) return [];
    const n = Math.ceil(full.length * clamp01((t - start) / T.typeMs));
    return [{ text: full.slice(0, n), ok: t >= start + T.typeMs + 80 }];
  });
  return {
    lines, progress: clamp01((t - T.logA) / (BOOT_LINES.length * T.perLine)),
    noise: t >= T.noiseA && t < T.noiseB, glitch: t >= T.identA && t < T.identA + 800,
    reveal: clamp01((t - T.identA) / 700), iris: clamp01((t - T.irisA) / (T.irisB - T.irisA)), done: t >= BOOT_TOTAL,
  };
}
