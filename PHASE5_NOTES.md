# Phase 5 — Data Command (offline Data Analyst workspace)

## What changed
- Added `src/apps/analytics/data.ts`: deterministic data engine, synthetic sample records, CSV/TSV parser, data profiling, filtering, aggregations, safe CSV exports and rule-based observations.
- Added `src/apps/analytics/xlsx.ts`: read-only local XLSX first-worksheet reader using browser ZIP decompression. Supports ordinary XLSX workbooks in modern browsers; unusual/very large workbooks can be exported as CSV instead. No macros are executed and formulas use cached workbook values, not evaluation.
- Added `src/apps/analytics/AnalyticsApp.tsx` and `analytics.css`: local file import, four KPI tiles, filters, visual builder, bar/line/donut charts, data quality, raw preview, summary/export and responsive layout.
- Wired the app in `src/os/Desktop.tsx` and `src/os/apps.ts`, preserving terminal, boot, chess, sudoku, achievements, themes and existing saves.
- Merged the separately uploaded corrected `sudoku(1).css` verbatim into `src/apps/sudoku/sudoku.css`.
- `src/data/profile.ts` already uses the requested `Data Analyst` role; retained unchanged.
- Added `tests/analytics.test.ts` with 7 data-engine regression tests.

## Privacy and limitations
- Browser-only: no service, analytics, external provider or API key. Imported file rows live only in app state until page refresh.
- Demo data is SYNTHETIC, not internal workplace data.
- CSV/TSV/XLSX only, up to 5 MiB, 15,000 data rows, 50 columns.
- XLSX reads the **first sheet** only, numeric/date formatting can be approximate (raw Excel date serials unless stored as strings), formulas aren't calculated. If the browser can't read deflate-raw ZIP archives, export CSV instead.
- Date chart groups by month for ISO-style dates. Blank and duplicate stats respect active filters. Smart observations are rule-based, not AI-generated.
- KPI names infer revenue/cost by column labels; validate business definitions. Revenue minus cost is labelled gross difference, not net profit.
- Downloaded CSV values that could be formulas are prefixed with an apostrophe to reduce spreadsheet formula injection risk.

## How to run
1. Extract the ZIP into a new folder.
2. Run `npm install`, then `npm run dev` within `grandmaster-os`.
3. Open `ANALYTICS.EXE`; test demo data, upload a CSV or Excel file, select filters and download filtered CSV.
4. Then verify chess, sudoku and the animated boot still work.

## Verification disclosure
- TypeScript `data.ts` and `xlsx.ts` passed strict standalone checking; new TypeScript sources passed syntax checks; the analytics engine passed standalone behavior checks. A sample XLSX exported by OpenPyXL was successfully parsed in headless Chromium. Full React/Vite build and integrated UI browser tests require project dependencies from `npm install` on the user's machine; installation is unavailable in this offline environment. Do not treat Phase 5 as production-approved before local `npm run build` and interactive testing.
