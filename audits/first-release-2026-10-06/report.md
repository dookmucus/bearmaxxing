# BearMaxxing first-release acceptance

This release pass keeps the existing editor designs, combat model, profile migration and configuration. It uses the complete preserved profile from the latest incoming-hosting audit because no connected browser was available to inspect the player's live saved profile. The isolated test browser uses fresh storage; it does not access or change player browser storage.

## Scoped changes

- Results keeps one estimated hosting trio and its twelve active gear pieces, followed by three simultaneous joining squads with contributing leaders first.
- One brief **Estimated recommendation** indicator replaces the visible uncertainty paragraph and repeated host explanation. Its accessible tooltip retains the deciding limitation; joining cards no longer repeat a provisional label.
- Each of the five supported actions shows current progression, next target, short offensive benefit and resource. Hero investments marked conditional remain conditional. Verified gear material quantities stay in tooltips; unknown costs are explicitly unverified and are never presented as verified ROI.
- The App's existing memoized upgrade suggestions are reused on Results instead of recalculating them a second time. No combat formula, ranking, progression, cost table, ownership rule or layout changed.

## Snapshot plan

Hosting: **Zoe / Petra / Yang**, with Infantry / Cavalry / Archer gear transferred by class. Only the twelve `set-<class>-<slot>` pieces enter assignment; archived gear remains excluded.

Joining squads, leader first:

1. **Chenko / Alcar / Diana** — Chenko offers 25% rally Lethality when selected.
2. **Amane / Eric / Edwin** — Amane offers 25% rally Attack when selected.
3. **Vivian / Forrest / Gordon** — Vivian offers 25% enemy damage taken when selected.

All twelve hero identities are distinct, available and owned. Each squad has one hero of each class. Joining fillers complete classes; entered maximum march capacity is not increased again. These squads enter separate rallies and do not become the host's incoming skills.

## Supported next paths

| Current → next target | Short reason | Resource | Scope |
|---|---|---|---|
| Archer boots Mastery 4 → 5 | +5 percentage points Archer Lethality | Forge hammers | Transfers with Archer gear; 50 hammers verified |
| Archer helmet enhancement +7 → +8 | +1.05 points Archer Lethality | Enhancement materials | Transfers with Archer gear; 2,800 XP verified |
| Petra widget 3 → 4 | +7 points Cavalry Lethality and +2.5 points shared hosting Attack | Widget materials | Hero/hosting dependent; exact cost unverified |
| Yang stars 3.3 → 3.4 | +17.42 points Archer Attack | Hero shards | Conditional on Yang hosting; exact cost unverified |
| Panther level-60 advancement → complete | +1.76 points passive Attack if still incomplete | Pet advancement materials | Completed advancement must not be suggested again; exact cost unverified |

No simulated damage totals, alternative-plan enumeration, player grades or troop readiness appear on Results. Only the stepper provides editor navigation. Copy diagnostics remains development-only.

## Final checks

See [focused checks](checks.json) and [production-browser checks](browser-checks.json). The production check uses the exact complete profile at 1440px and 375px, verifies the host and nine joiners against the incoming audit, twelve gear icons, five upgrades, resource/conditional labels, tooltip hover/focus/tap and Escape, every editor's overflow, and profile preservation through navigation and reload. It also confirms that marking the Panther advancement complete removes that advancement advice in the isolated fixture.

All 17 focused checks passed. Desktop 1440px and mobile 375px production acceptance passed, including completed pet advancement, tooltip interaction and storage preservation. The production build ran once with Node v22.23.3. No full legacy suite, push or deployment. Saved data, `.env`, API routes, Git metadata and Netlify configuration are untouched.

## Remaining boundaries

The host is estimated because existing timing/stacking and permanent-stat assumptions can change the winner; these are documented once in [the release assumptions note](../../docs/first-release-assumptions.md). The saved snapshot's progression is preserved; maximum progression is not substituted. Live-profile verification remains unavailable. The remaining release concern is performance: a complete-profile pet edit exceeded a 30-second action timeout, then passed with the longer acceptance timeout. Cold calculations and edits can block interaction. Reusing the memoized upgrades removes duplicate work but does not redesign or optimize the calculation engine; this performance issue remains before a broadly responsive public release.
