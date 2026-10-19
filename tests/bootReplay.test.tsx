// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Desktop } from '../src/os/Desktop';

const seed = (s: object) => localStorage.setItem('gos.settings.v1', JSON.stringify({ theme: 'matrix', intensity: 'full', sound: false, introSeen: true, ...s }));
beforeEach(() => {
  localStorage.clear();
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof matchMedia;
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
  Element.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);
const bootDlg = () => screen.queryByRole('dialog', { name: 'System boot' });
const startReplay = async () => {
  seed({}); const u = userEvent.setup(); render(<Desktop />);
  await u.click(screen.getByRole('button', { name: 'Open Terminal' }));
  await u.type(screen.getByLabelText('Terminal command'), 'boot{Enter}');
  return u;
};

describe('boot replay regressions', () => {
  it('a stray Enter / Space / Escape right after the command does not dismiss the replay', async () => {
    await startReplay(); expect(bootDlg()).toBeTruthy();
    for (const key of ['Enter', ' ', 'Escape']) fireEvent.keyDown(window, { key });
    expect(bootDlg()).toBeTruthy();
  });
  it('held-down (auto-repeat) keys never skip, even after the grace period', async () => {
    await startReplay(); await new Promise(r => setTimeout(r, 600));
    fireEvent.keyDown(window, { key: 'Enter', repeat: true }); expect(bootDlg()).toBeTruthy();
  });
  it('a click on Skip right after the command is ignored', async () => {
    await startReplay(); fireEvent.click(screen.getByRole('button', { name: 'Skip intro' })); expect(bootDlg()).toBeTruthy();
  });
  it('after the grace period Escape and the Skip button both work', async () => {
    await startReplay(); await new Promise(r => setTimeout(r, 600));
    fireEvent.keyDown(window, { key: 'Escape' }); expect(bootDlg()).toBeNull();
    const u = userEvent.setup(); await u.type(screen.getByLabelText('Terminal command'), 'boot{Enter}'); expect(bootDlg()).toBeTruthy();
    await new Promise(r => setTimeout(r, 600)); fireEvent.click(screen.getByRole('button', { name: 'Skip intro' })); expect(bootDlg()).toBeNull();
  });
  it('replaying twice in a row works each time', async () => {
    const u = await startReplay(); await new Promise(r => setTimeout(r, 600)); fireEvent.keyDown(window, { key: 'Escape' });
    for (let i = 0; i < 2; i++) { await u.type(screen.getByLabelText('Terminal command'), 'boot{Enter}'); expect(bootDlg()).toBeTruthy(); await new Promise(r => setTimeout(r, 600)); fireEvent.keyDown(window, { key: 'Escape' }); expect(bootDlg()).toBeNull(); }
  });
  it('keyboard focus returns to the terminal input after the boot ends', async () => {
    await startReplay(); await new Promise(r => setTimeout(r, 600)); fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Terminal command')));
  });
  it('with intensity Off the command says so and does NOT claim to replay', async () => {
    seed({ intensity: 'off' }); const u = userEvent.setup(); render(<Desktop />);
    await u.click(screen.getByRole('button', { name: 'Open Terminal' })); await u.type(screen.getByLabelText('Terminal command'), 'boot{Enter}');
    expect(bootDlg()).toBeNull(); expect(screen.queryByText(/Replaying boot sequence/)).toBeNull(); expect(screen.getByText(/Animation intensity is Off/)).toBeTruthy();
  });
});
