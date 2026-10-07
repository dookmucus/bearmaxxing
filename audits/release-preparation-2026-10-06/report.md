# First live Netlify release preparation — 2026-10-06

No push or deployment was performed. The interface, saved-profile schema, calculation arithmetic, player import routes, environment files, Netlify configuration, and Git metadata were preserved.

## Cleanup

- Removed the unused duplicate `v2/` application, obsolete generated single-file preview and generator, unused `public/bear.svg`, obsolete merge instructions, and Finder metadata.
- Removed the redundant calculation-review ZIP only after checking that its contents exactly matched the retained extracted files.
- Moved six research handoff artifacts into `audits/calculation-handoff-source-2026-10-06/`. Calculation references, source provenance, useful audit/replay scripts, and all translations remain available.
- Removed the obsolete package-preview command and corrected README preview instructions.
- Development tools are hidden by default. Local development may explicitly enable them with command-scoped `VITE_DEVELOPMENT_TOOLS=true`; production never displays the link or Copy diagnostics.
- Separated the unchanged English calculation-message helper from the registered translation catalogs and restricted worker diagnostics to development. No numerical formulas or profile values changed.
- Updated stale test expectations for previously approved copy, dynamic joining leaders, finite comparison baselines, and default provenance. A synthetic calculation fixture now contains enough known heroes for a legal simultaneous plan; it does not remap any player profile.

## Production acceptance

One production build passed with Node v22.23.3. Vite reports a large bundle warning (1.625 MB JavaScript, 428 KB gzip); this does not prevent the tested interface from functioning. No extra framework or translation service was added.

The production build was checked at 1440px and 375px in isolated Chromium storage using the complete incoming-hosting audit snapshot. The actual user browser's localStorage was not accessible. This fixture check did not change the user's saved profile.

- One host: Zoe / Petra / Yang.
- Three simultaneous joining squads, leader first: Chenko / Alcar / Diana; Amane / Eric / Edwin; Vivian / Forrest / Gordon. All twelve heroes are distinct.
- All twelve assigned active gear images loaded; five upgrade actions rendered.
- Eight languages updated Results immediately without restarting calculations or changing progression. All six pages fit both widths. Hosting tooltips worked with keyboard activation/Escape and mobile tap.
- Language selection survived reload. Profile values survived navigation and reload; an explicitly edited pet advancement value also persisted.
- Development tools were absent. No browser runtime errors occurred.

All affected focused checks passed, including the final render/persistence fixtures and 19 planner checks. See `browser-checks.json`, screenshots, and focused test logs in this directory. The earlier full baseline test run recorded stale expectations; only the affected checks were rerun after those updates, avoiding repeated full legacy runs.

## Publishing and credentials

`netlify.toml` remains unchanged: build `npm run build`, publish `dist`, functions `netlify/functions`. `/api/player/:id` routes to the player function before the SPA fallback. A plain Vite preview does not emulate that function, so authenticated import is a post-deployment check.

`.env` is ignored and untracked. Configured credentials were not found in tracked files or published text. Environment files, Netlify configuration, lockfile, Git HEAD, and Git configuration retain their original checksums. Only public application assets are in `dist`; audits, docs, research bundles, and environment files are excluded. See `security-publish-checks.json`.

## Remaining limitations

No demonstrated functional release blocker from production browser acceptance. Keep the existing recommendation uncertainty tooltip: assumptions are documented once in `docs/first-release-assumptions.md`. Translation terminology requires native-speaker review and is not claimed to be official Kingshot localization. Authenticated player import was not called during this read-only release check.

## Post-deployment checklist

1. Player import works for ID **100111478**.
2. Saved inputs survive reload.
3. Hosting, joining squads, and upgrade recommendations render.
4. Language switching and tooltips work on mobile.
