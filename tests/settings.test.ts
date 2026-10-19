import { describe, it, expect } from 'vitest';
import { parseSettings, defaultSettings } from '../src/core/settings';
describe('settings', () => {
  it('defaults to intensity off under reduced motion', () => expect(defaultSettings(true).intensity).toBe('off'));
  it('accepts valid stored data', () =>
    expect(parseSettings({ theme: 'violet', intensity: 'low', sound: true, introSeen: true })).toEqual({ theme: 'violet', intensity: 'low', sound: true, introSeen: true }));
  it('rejects tampered or malformed values field by field', () => {
    const s = parseSettings({ theme: '<script>', intensity: 9, sound: 'yes', introSeen: 1 });
    expect(s).toEqual(defaultSettings());
  });
  it('survives non-objects', () => { for (const v of [null, 42, 'x', undefined]) expect(parseSettings(v)).toEqual(defaultSettings()); });
  it('keeps valid fields when others are bad', () => expect(parseSettings({ theme: 'cyan', sound: 'x' }).theme).toBe('cyan'));
});
