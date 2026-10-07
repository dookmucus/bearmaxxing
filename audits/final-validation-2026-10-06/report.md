# Final sequential release validation — 6 October 2026

Completed in the requested order: one isolated browser check, complete browser closure, final regression with concurrency 2, then one production build. No push or deployment.

## Browser acceptance

The in-app Browser runtime reported no available browser. One isolated Chromium instance checked the existing current-source preview at http://127.0.0.1:8888/. It used the complete audit snapshot; the player's actual browser storage was unavailable and was not changed. Desktop 1440px and mobile 375px were checked in the same instance.

- Initial hosting plan: 3.049s; all upgrades ready: 9.362s.
- Navigation during calculation: 139ms. Three rapid gear edits: 105ms. Largest sampled UI heartbeat gap: 91.9ms.
- Observed both existing loading stages, followed by completed recommendations. Editors remained usable.
- 6 worker starts across the recorded edit batches; maximum concurrent live workers **1**, remaining workers **0** at completion. Rapid intermediate edits coalesced, in-progress generations terminated, and no queue accumulated.
- No stale displayed upgrade targets. A deliberately delayed completed-worker response was rejected by the actual old handler after input changes. The newest plan/recommendations prevailed.
- Gear and pet edit/restore cycles reproduced final expected host, three joining squads, all five action titles and the 12 assigned gear images. Completed pet advancement was not recommended again.
- Saved values and explicit edit provenance survived reload. No page errors or horizontal overflow; desktop/mobile screenshots are retained in this folder.
- The browser closed in `finally`; the check process exited before regression started. No browser task ran alongside tests/build.

The first browser attempt failed a test-only equality assertion: touching and restoring gear Mastery correctly changes its provenance from assumed to user-confirmed. The test was corrected to expect that confirmation and the analogous pet advancement confirmation; all numeric progression and unrelated fields remain checked. No production change was made to bypass this assertion.

## Final checks

- Full regression: **331/331 passed**, no failures, skips or cancellations; concurrency limited to 2, about 164.5s. Log: `regression.log`.
- One production build: **passed**, Node **v22.23.3**. Log: `build.log`. Vite retains the large entry-chunk warning; no build error. The current-source browser was checked before build, in the requested order; no new browser was launched afterward.
- Protected hashes match for `.env`, Netlify configuration, lockfile, UI and style files, and Git HEAD/config. Credentials remain ignored and untracked and absent from publish output. Audits/research are outside `dist`.
- Netlify remains `publish = "dist"`, `functions = "netlify/functions"`, with `/api/player/:id` routed before SPA fallback. No authenticated upstream request, remote policy operation or release action occurred.

## Reference corrections included

The release includes the reviewed inherent progression and ordinary widget tables with primary full-star endpoints taking precedence. Conflicting Gordon/Fahd/Chenko partial curves remain unmapped rather than rescaled. Marlin's Dynamo and Gordon's static shared Attack are modeled; Helga's owned account talent applies once even when absent while her entered zero Expedition skills remain zero. Hilde's replacement-hit total damage is distinguished from Margot's extra-attack packet. Ordinary widget stats remain separate from rally widget skill activation; unsupported unlock stages are not inferred.

Existing TG6 Howling Wind uses player-reported 30% chance/50% extra Archer damage. Unconfirmed legacy stat zeros retain finite comparison assumptions without writing over inputs; explicit confirmed zeros remain zero. No combined battle-report stat is added atop its components. Canonical aliases and sixth-step progression remain compatible.

The performance changes retain complete candidate evaluation/re-optimization, cost vectors, ordering and uncertainty. They reuse strictly identical scoped hosting work, bounded finite baseline/key tables, roster indexes and compact incoming maxima; diagnostic signatures are lazy. Full details and before/after measurement are in `../calculation-integration-2026-10-06/computation-reuse-report.md`.

## Recommendation and release limits

Host remains **Zoe / Petra / Yang**, with Infantry/Cavalry/Archer gear respectively. Joining squads remain **Chenko / Alcar / Diana**, **Amane / Eric / Edwin**, and **Vivian / Forrest / Gordon**, leader first and without overlap.

Five paths remain Archer boots Mastery 4→5, Archer helmet +7→+8, Petra widget 3→4, Yang stars 3.3→3.4, and Panther level-60 advancement if incomplete. Hero investments remain conditional; unverified material costs are not ROI. Rosa remains a supported comparison, and Zoe/Petra/Vivian is the closest central competitor.

**No demonstrated functional release blocker remains in these checks.** Recommendation confidence still depends on permanent class bonuses, Volley/Howling Wind interactions, Vivian counter/collision phases, Golden Rhythm and damage-operation stacking, and rally widget interactions. Some candidates' partial stats/unlocks/packet mechanics remain incomplete. These limitations are documented once in `docs/first-release-assumptions.md`; no new research cycle was started.

The Node peak RSS measurement remained about 621 MiB despite faster calculations and smaller completion heap. Browser tests establish responsiveness and terminated-worker behavior, not an all-device memory guarantee. Non-English translations remain community drafts requiring native terminology review. Authenticated player import for ID 100111478 was not called in this task.

## Post-deployment checklist

1. Player import works for ID **100111478**.
2. Saved inputs survive reload.
3. Hosting, three joining squads and upgrades render.
4. Language switching and tooltips work on mobile.
