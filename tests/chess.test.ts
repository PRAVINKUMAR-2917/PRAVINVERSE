import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { captureCount, fromMoves, gameStatus, legalDestinations, newGame, readGame } from '../src/apps/chess/game';

describe('Chess Arena rules (chess.js)', () => {
  it('loads starting position and legal pawn moves', () => {
    const game = new Chess();
    expect(game.moves().length).toBe(20);
    expect(legalDestinations(game, 'e2').sort()).toEqual(['e3', 'e4']);
  });
  it('detects fool\'s mate', () => {
    const g = fromMoves(['f3', 'e5', 'g4', 'Qh4#']);
    expect(g.isCheckmate()).toBe(true);
    expect(gameStatus(g)).toContain('Black wins');
  });
  it('handles en passant', () => {
    const g = fromMoves(['e4', 'a6', 'e5', 'd5', 'exd6']);
    expect(g.get('d5')).toBeUndefined();
    expect(g.get('d6')?.type).toBe('p');
  });
  it('allows legal castling and blocks it through attacked squares', () => {
    const g = fromMoves(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);
    expect(g.moves({ square: 'e1' })).toContain('O-O');
    const illegal = new Chess('4kr2/8/8/8/8/8/8/4K2R w K - 0 1');
    expect(illegal.moves({ square: 'e1' })).not.toContain('O-O');
  });
  it('supports underpromotion as well as queen promotion', () => {
    const start = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';
    for (const p of ['q', 'r', 'b', 'n'] as const) {
      const g = new Chess(start);
      g.move({ from: 'a7', to: 'a8', promotion: p });
      expect(g.get('a8')?.type).toBe(p);
    }
  });
  it('detects insufficient material and stalemate', () => {
    expect(new Chess('k7/8/1K6/8/8/8/8/8 w - - 0 1').isInsufficientMaterial()).toBe(true);
    const g = new Chess('k7/2Q5/2K5/8/8/8/8/8 b - - 0 1');
    expect(g.isStalemate()).toBe(true);
  });
  it('detects repetition', () => {
    const g = fromMoves(['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']);
    expect(g.isThreefoldRepetition()).toBe(true);
  });
  it('replays SAN, and supports undo', () => {
    const g = fromMoves(['e4', 'e5', 'Nf3']);
    expect(g.history()).toEqual(['e4', 'e5', 'Nf3']);
    g.undo(); expect(g.history()).toEqual(['e4', 'e5']);
  });
  it('tracks captures', () => {
    const g = fromMoves(['e4', 'd5', 'exd5']);
    expect(captureCount(g).white).toContain('p');
  });
  it('rejects illegal or untrusted saved game data', () => {
    expect(readGame({ moves: ['e4', 'illegal'], mode: 'computer' })).toEqual(newGame());
    expect(readGame({ moves: Array(501).fill('e4') })).toEqual(newGame());
    expect(readGame({ moves: ['e4'], level: 900, mode: 'bad' }).level).toBe(1);
    expect(readGame({ moves: ['e4'], level: 900, mode: 'bad' }).mode).toBe('computer');
  });
});
