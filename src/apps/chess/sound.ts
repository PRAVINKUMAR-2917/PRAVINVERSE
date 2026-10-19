/** Short synthesized sounds; no files, tracking or remote requests. */
let context: AudioContext | undefined;
export function beep(enabled: boolean, kind: 'move' | 'capture' | 'end' = 'move') {
  if (!enabled) return;
  try {
    const AC = window.AudioContext; if (!AC) return;
    context ??= new AC();
    if (context.state === 'suspended') void context.resume();
    const osc = context.createOscillator(); const volume = context.createGain();
    osc.type = 'sine'; osc.frequency.value = kind === 'move' ? 430 : kind === 'capture' ? 280 : 650;
    volume.gain.setValueAtTime(0.0001, context.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.105);
    osc.connect(volume); volume.connect(context.destination);
    osc.start(); osc.stop(context.currentTime + 0.12);
  } catch { /* audio never blocks chess */ }
}
