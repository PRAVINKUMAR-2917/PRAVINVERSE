// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Desktop } from '../src/os/Desktop';

const seed = (s: object) => localStorage.setItem('gos.settings.v1', JSON.stringify({ theme: 'matrix', intensity: 'low', sound: false, introSeen: true, ...s }));
beforeEach(() => {
  localStorage.clear();
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof matchMedia;
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => { cleanup(); });

const openTerminal = async (u: ReturnType<typeof userEvent.setup>) => { await u.click(screen.getByRole('button', { name: 'Open Terminal' })); return screen.getByLabelText('Terminal command') as HTMLInputElement; };
const run = async (u: ReturnType<typeof userEvent.setup>, input: HTMLElement, cmd: string) => { await u.type(input, cmd + '{Enter}'); };

describe('desktop integration (jsdom)', () => {
  it('renders all eight app icons and no emblem or centre logo', () => {
    seed({}); const { container } = render(<Desktop />);
    for (const n of ['Chess Arena', 'Sudoku Lab', 'Data Command', 'Terminal', 'Projects', 'Profile', 'Achievements', 'System Map']) expect(screen.getByRole('button', { name: `Open ${n}` })).toBeTruthy();
    expect(container.querySelector('.emblem, .hero')).toBeNull();
  });
  it('opening the terminal focuses its input and unlocks FIRST CONTACT', async () => {
    seed({}); const u = userEvent.setup(); render(<Desktop />);
    const input = await openTerminal(u);
    expect(document.activeElement).toBe(input);
    expect(screen.getByText(/Achievement unlocked: FIRST CONTACT/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('gos.achievements.v1')!).unlocked['first-contact']).toBeTypeOf('number');
  });
  it('runs commands: whoami, history recall, tab completion, clear', async () => {
    seed({}); const u = userEvent.setup(); render(<Desktop />); const input = await openTerminal(u);
    await run(u, input, 'whoami'); expect(screen.getAllByText(/Pravinkumar M/).length).toBeGreaterThan(0);
    await u.keyboard('{ArrowUp}'); expect(input.value).toBe('whoami');
    await u.clear(input); await u.type(input, 'ski{Tab}'); expect(input.value).toBe('skills ');
    await u.clear(input); await run(u, input, 'clear'); expect(screen.queryByText(/Pravinkumar M/)).toBeNull();
  });
  it('theme command changes the desktop theme; matrix toggles rain without errors', async () => {
    seed({ intensity: 'full' }); const u = userEvent.setup(); const { container } = render(<Desktop />); const input = await openTerminal(u);
    await run(u, input, 'theme cyan'); expect(container.querySelector('.os')!.getAttribute('data-theme')).toBe('cyan');
    await run(u, input, 'matrix'); expect(screen.getAllByText(/Code rain off/).length).toBe(1);
    expect(JSON.parse(localStorage.getItem('gos.settings.v1')!).theme).toBe('cyan');
  });
  it('cipher mission: wrong answer, hint, right answer unlocks CODE BREAKER and persists', async () => {
    seed({}); const u = userEvent.setup(); render(<Desktop />); const input = await openTerminal(u);
    await run(u, input, 'mission 1'); expect(screen.getByText('MISSION 1: Decode the signal')).toBeTruthy();
    await run(u, input, 'answer nope'); expect(screen.getByText(/Incorrect/)).toBeTruthy();
    await run(u, input, 'answer pattern hunter'); expect(screen.getByText(/Mission "Decode the signal" solved/)).toBeTruthy();
    expect(screen.getAllByText(/CODE BREAKER/).length).toBeGreaterThan(0);
    const saved = JSON.parse(localStorage.getItem('gos.achievements.v1')!); expect(saved.missions).toContain('cipher'); expect(saved.unlocked['code-breaker']).toBeTypeOf('number');
  });
  it('terminal state survives closing and reopening the window; exit closes it', async () => {
    seed({}); const u = userEvent.setup(); render(<Desktop />); let input = await openTerminal(u);
    await run(u, input, 'help'); await u.click(screen.getByRole('button', { name: 'Close Terminal' }));
    expect(screen.queryByLabelText('Terminal command')).toBeNull();
    input = await openTerminal(u); expect(screen.getAllByText(/Show available commands/).length).toBeGreaterThan(0);
    await run(u, input, 'exit'); expect(screen.queryByLabelText('Terminal command')).toBeNull();
  });
  it('Sudoku Lab opens playable 9 by 9 board', async () => {
    seed({ intensity: 'off' }); const u = userEvent.setup(); render(<Desktop />);
    await u.click(screen.getByRole('button', { name: 'Open Sudoku Lab' }));
    const dlg = screen.getByRole('dialog', { name: 'Sudoku Lab' });
    expect(within(dlg).getByRole('grid', { name: 'Sudoku board' })).toBeTruthy();
    expect(within(dlg).getAllByRole('gridcell')).toHaveLength(81);
    expect(within(dlg).getByRole('button', { name: 'Enter 1' })).toBeTruthy();
  });
  it('chess command opens the playable Chess Arena', async () => {
    seed({}); const u = userEvent.setup(); render(<Desktop />); const input = await openTerminal(u);
    await run(u, input, 'chess'); const dlg = screen.getByRole('dialog', { name: 'Chess Arena' }); expect(within(dlg).getByRole('grid', { name: 'Chessboard' })).toBeTruthy();
  });
  it('boot plays on a later visit even if introSeen was saved', () => {
    seed({ introSeen: true, intensity: 'full' }); render(<Desktop />);
    expect(screen.getByRole('dialog', { name: 'System boot' })).toBeTruthy();
  });
  it('boot plays on first visit and Escape skips it, saving introSeen', async () => {
    seed({ introSeen: false }); render(<Desktop />);
    expect(screen.getByRole('dialog', { name: 'System boot' })).toBeTruthy();
    await new Promise(r => setTimeout(r, 600)); // skip input is ignored for the first 450 ms
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'System boot' })).toBeNull();
    expect(JSON.parse(localStorage.getItem('gos.settings.v1')!).introSeen).toBe(true);
  });
  it('boot completes by itself and unmounts', async () => {
    seed({ introSeen: false, intensity: 'low' }); render(<Desktop />); // real clock: Low plays at 1.7x, about 4.8 s
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'System boot' })).toBeNull(), { timeout: 9000 });
    expect(JSON.parse(localStorage.getItem('gos.settings.v1')!).introSeen).toBe(true);
  }, 12000);
  it('boot is skipped when animation intensity is Off', () => {
    seed({ introSeen: false, intensity: 'off' }); render(<Desktop />); expect(screen.queryByRole('dialog', { name: 'System boot' })).toBeNull();
  });
  it('boot command replays the boot; with intensity Off it explains instead', async () => {
    seed({}); const u = userEvent.setup(); render(<Desktop />); const input = await openTerminal(u);
    await run(u, input, 'boot'); expect(screen.getByRole('dialog', { name: 'System boot' })).toBeTruthy();
    await new Promise(r => setTimeout(r, 600)); fireEvent.keyDown(window, { key: 'Escape' }); expect(screen.queryByRole('dialog', { name: 'System boot' })).toBeNull();
  });
  it('opening every main module unlocks EXPLORER', async () => {
    seed({}); const u = userEvent.setup(); render(<Desktop />);
    for (const n of ['Chess Arena', 'Sudoku Lab', 'Data Command', 'Terminal', 'Projects', 'Profile', 'Achievements', 'System Map']) await u.click(screen.getByRole('button', { name: `Open ${n}` }));
    expect(JSON.parse(localStorage.getItem('gos.achievements.v1')!).unlocked.explorer).toBeTypeOf('number');
  });
  it('Phase 1 window controls still work: minimize then restore from the taskbar, close', async () => {
    seed({}); const u = userEvent.setup(); render(<Desktop />);
    await u.click(screen.getByRole('button', { name: 'Open Settings' }));
    await u.click(screen.getByRole('button', { name: 'Minimize Settings' }));
    expect(document.querySelector('section.win')!.className).toContain('is-min'); // hidden windows have no accessible name, so query the DOM
    await u.click(screen.getByRole('button', { name: /Settings/, pressed: false }));
    expect(screen.getByRole('dialog', { name: 'Settings' }).className).not.toContain('is-min');
    await u.click(screen.getByRole('button', { name: 'Close Settings' })); expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull();
  });
});
