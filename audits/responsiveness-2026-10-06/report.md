# Local-preview responsiveness correction

Port 8888 was returning HTTP 200 normally. The browser was blocked by synchronous plan and upgrade evaluation. The complete incoming-hosting audit snapshot previously required approximately 2.3 seconds for the plan plus 76.2 seconds for improvements on the main thread.

## Corrections

- Run browser calculations in a Web Worker; publish the plan before improvements finish. Inputs and navigation remain available throughout.
- Debounce input changes for 180 ms and terminate superseded workers. Results never displays a recommendation from an older profile.
- Terminate completed workers to release calculation memory. Show a recoverable error and retain editor access if a worker fails.
- Compute exhaustive Pareto alternatives, sensitivity exports, and diagnostic matrices lazily. Normal Results evaluates the same central objective, uncertainty indicators, and upgrade rules without eagerly preparing unused exports.
- Send only presentation data back to React. Generate development diagnostics in a separate worker on explicit request.
- Inline the production worker so the existing standalone-preview packaging can still include it without a separate worker asset.

## Verification

The actual signed-in browser's saved storage was not accessible. Checks used the existing complete `incoming-hosting-2026-10-06/replay.json` profile in isolated browser storage; the player's storage was never overwritten.

- 49 focused calculation/render/status checks passed; seven payload, dominance and upgrade checks passed after the final dominance refinement.
- Original replay agrees for all 24 hosting-context values, all 8,352 sensitivity outcomes and winning sets, all three joining squads, five improvement IDs, their measured deltas and verified costs. Source inputs remain identical.
- Host remains Zoe / Petra / Yang. Joining squads remain Chenko / Alcar / Diana, Amane / Eric / Edwin, Vivian / Forrest / Gordon.
- Replay now takes approximately 0.65 seconds for the plan and 4.72 seconds for improvements. Full sensitivity diagnostics remain available on demand.
- Actual port 8888 and the temporary production preview passed at 1440px and 375px: legal teams, 12 active assigned gear pieces, five improvements, editor navigation, no horizontal overflow, accessible tooltips, rapid successive edits, and suppression of outdated results.
- Production browser checks: host approximately 0.94 seconds; improvements approximately 3.74–4.27 seconds; rapid input changes 21–26 ms; longest sampled UI heartbeat gap approximately 79 ms. These are local measurements, not universal performance guarantees.
- Simulated worker-start failure exposes Retry while leaving editors usable. Retry succeeds; a saved pet advancement survives reload and is not recommended again.
- Production build passes with Node v22.23.3. Vite retains a non-fatal bundle-size warning; the inline worker increases the entry bundle but does not block the UI during calculation.

Saved values, recommendation mechanics, design, environment files, API routes and Netlify/Git configuration are preserved. No push or deployment. Existing model uncertainties are unchanged; see `docs/first-release-assumptions.md`.
