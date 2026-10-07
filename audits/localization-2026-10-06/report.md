# Localization preparation

English is the only shipped locale. Player-facing labels, navigation, wizard copy, validation, tooltips, entity-name fallbacks and generated recommendation/upgrade explanations have an English catalog. A small dependency-free helper supports named parameters, plural categories, English fallback, localized numbers/percentages, canonical display identities and complete-message rendering. Developer tools, technical logs and exhaustive comparison adapters stay English.

The existing header contains a compact language select using the same dark form styling. Only registered translation files appear. Explicit choices use `bearmaxxing:language:v1`, separate from profile storage; first visits negotiate supported browser languages. The document language, title and description follow the selection. Numeric input/option values, parsing, star-step notation and reference identities remain unchanged.

Calculation/validation builders still produce their original English messages through catalog-backed `englishMessage`; the renderer adapts those messages. Direct presentation explanations use the current locale. Training recommendations carry their already-calculated march count/shortages as display metadata for plurals. No recommendation formula, numeric effect, ranking or input was changed.

## Checks

- Focused existing copy/navigation/import and localization checks passed. Localization tests cover missing/malformed translations, named parameters, plurals, browser matching, explicit preference persistence, blocked storage, numeric/percent formatting, canonical names, nested messages and star notation in Results/tooltips. Static translation references resolve.
- Complete audit snapshot replay matches the previous host (Zoe / Petra / Yang), all three joining squads, 24 hosting-context results, all 8,352 sensitivity outcomes/winning sets, five upgrade IDs, measured deltas and known costs. Inputs are unchanged.
- At 1440px and 375px, English and a temporary expanded-text locale passed every editor and Results with no document overflow. Language switching updates current Results/tooltips, preserves progression and does not start another worker. Explicit English selection survives reload. Tooltip keyboard interaction passed.
- Initial expanded mobile labels overflowed; translated labels now wrap inside the existing columns. English spacing, styling and editor layout are preserved. Temporary expanded strings were injected only into isolated browser memory; no extra locale file is shipped.
- Node v22.23.3 production build recorded in `build.log`. Vite reports its existing non-fatal large-entry warning (the inline worker and catalog are included). No additional runtime dependency, push or deployment.

Actual user browser storage was inaccessible; browser checks used the existing complete audit snapshot in isolated storage. Environment files, API routes and Netlify/Git configuration were not changed. The language guide is `docs/localization.md`.
