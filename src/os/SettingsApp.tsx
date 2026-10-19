import type { Settings, Theme, Intensity } from '../core/settings';
const THEMES: { id: Theme; label: string; swatch: string }[] = [
  { id: 'matrix', label: 'Matrix', swatch: '#00ff88' }, { id: 'cyan', label: 'Cyan', swatch: '#00e5ff' }, { id: 'violet', label: 'Violet', swatch: '#a855f7' },
];
const LEVELS: { id: Intensity; hint: string }[] = [
  { id: 'off', hint: 'No ambient motion. Still frames only.' }, { id: 'low', hint: 'Slow rain, light cursor glow.' }, { id: 'full', hint: 'All effects: rain, parallax, cursor glow.' },
];
interface Props { settings: Settings; reducedByOS: boolean; onChange: (p: Partial<Settings>) => void }
export function SettingsApp({ settings, reducedByOS, onChange }: Props) {
  return (
    <div className="stack">
      <fieldset className="field"><legend>Theme</legend>
        <div className="seg" role="radiogroup" aria-label="Theme">
          {THEMES.map(t => (
            <button key={t.id} role="radio" aria-checked={settings.theme === t.id} className="seg-btn" onClick={() => onChange({ theme: t.id })}>
              <i className="dot" style={{ background: t.swatch }} />{t.label}
            </button>))}
        </div>
      </fieldset>
      <fieldset className="field"><legend>Animation intensity</legend>
        <div className="seg" role="radiogroup" aria-label="Animation intensity">
          {LEVELS.map(l => (
            <button key={l.id} role="radio" aria-checked={settings.intensity === l.id} className="seg-btn" onClick={() => onChange({ intensity: l.id })}>{l.id}</button>))}
        </div>
        <p className="hint">{LEVELS.find(l => l.id === settings.intensity)!.hint}</p>
        {reducedByOS && <p className="hint">Your system asks for reduced motion, so the default is Off. You can still raise it.</p>}
      </fieldset>
      <label className="field row">
        <input type="checkbox" checked={settings.sound} onChange={e => onChange({ sound: e.target.checked })} />
        <span>Sound effects <small>(off by default; no sounds exist yet, this saves your choice for later phases)</small></span>
      </label>
    </div>
  );
}
