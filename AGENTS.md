# BearMaxxing working agreement

Goal: identify a player's best Bear Hunt hosting team and simultaneous joining marches from available heroes, transferable gear, and troops; identify gaps and recommend the next useful investments.

Stack: React + Vite; versioned JSON reference data; browser calculations; Netlify Function for keyed imports. No database or player auth. Do not add automatic storage, analytics, or account flows without the user's request. Keep API secrets server-only.

Alliance defaults: 10/10/80, one hosting march plus three joins, joining leaders Amane / Yeonwoo / Chenko. These are configurable alliance constraints, not universal combat truths.

Do not turn community theories into exact game facts. Track sources and uncertainty. Never assign arbitrary scores based on power, stars, rarity, enhancement, or forging level and claim they predict damage. Missing data must stay unknown. Avoid double counting effective report stats and their component sources.

Validate changes with npm test and npm run build. Preserve integer capacities and inventory conservation. Never assign the same hero or equipment instance twice across simultaneous marches. Keep mixed tiers and unknown imports explicit.

Next priorities:
1. Test an authenticated MightPulse response with permission and a server-side key; verify ID 100111478 and adapter shape without exposing the secret.
2. Assemble sourced gear progression/cost and hero Expedition-skill tables, with license and in-game verification. Add automatic effects for known heroes instead of asking users to estimate multipliers.
3. Implement complete rally skill selection, shared/cross-type hero effects, troop tier/TG coefficients, and battle-report calibration before absolute score forecasts.
4. Support tier-by-tier inventory, active pets, city/research unlock paths, and budget-aware upgrade planning.
5. Add screenshot extraction only after evaluating accuracy on representative screens; require review of extracted values.

The README lists current model boundaries. Update it when those boundaries change. Do not deploy or push unless requested.
