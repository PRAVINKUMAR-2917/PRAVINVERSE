# Phase 6 — Progression, Secret Hacker Challenges and Real Desktop Apps

## What changed

- ACHIEVEMENTS.EXE now shows a scrollable, responsive badge collection, progress bar, rank and XP. Rank starts at Rookie and progresses to Grandmaster. Points are deterministic (unique badges and solved missions), not grindable.
- Secret terminal challenges: `secrets` gives hints; `trace` appears once any original mission has been completed; `unlock <code>` accepts a decoded message after the cipher mission, and a final code after all five missions.
- PROJECTS.EXE, PROFILE.EXE, SYSTEM_MAP.EXE are now functioning screens, replacing placeholders. PROFILE.EXE says **Data Analyst**, and no email or telephone is displayed.
- Small clickable XP indicator in the taskbar opens ACHIEVEMENTS.EXE.
- The original browser save key `gos.achievements.v1` is unchanged. Old saves remain compatible.
- Completing the original chess *terminal mission* now correctly awards TACTICAL MIND, which was previously unreachable.

## Preserved

Chess, Sudoku, CSV/Excel Analytics, Terminal, Matrix, Boot replay, themes, app windows, existing saved progress, and the corrected `src/apps/sudoku/sudoku.css` remain in the project. No new dependencies, internet services or payment APIs have been introduced.

## Testing

Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build` on your computer. Check the terminal commands `secrets`, `rank`, `trace` after Mission 1, then the interactive ACHIEVEMENTS.EXE. There are new regression tests in `tests/protocol.test.ts`.

## Limitations

Browser visual and Windows build checks have not been completed in this environment. Full Phase 3 chess Stockfish integration remains outstanding; Phase 6 does not claim to add Stockfish.
