# Calculation integration and local release validation — 6 October 2026

## Outcome

Integrated `bearmaxxing-calculation-review/START-HERE.md` and its supplementary research. The recommended host remains **Zoe / Petra / Yang**. The three joining squads and five immediate improvement paths are unchanged. This is an estimated recommendation, not a measured or universally proven damage winner. No push or deployment was performed.

## Profile and preservation

Replayed the complete profile in `audits/incoming-hosting-2026-10-06/replay.json`, including Heroes, the 12 active transferable gear pieces, Masters, Pets, and Troops. The actual player browser storage was unavailable; local browser checks used this complete snapshot in isolated storage. No individual values were requested again. `replay.json` records the untouched profile, its SHA-256, selection status, displayed actions, costs, comparisons and sensitivity. Entered skills—including explicit zero—stars/steps, ordinary widget levels, ownership, availability and exclusions were preserved.

The handoff describes Amadeus as unowned, but this snapshot marks him owned and unavailable/excluded from all marches. The snapshot flags were preserved. No unsourced account talent was inferred from that discrepancy.

The completed cleanup was preserved. `.env`, `netlify.toml`, lockfile, Git HEAD/config, `src/main.jsx` and `src/styles.css` match their pre-integration hashes. Secrets remain server-only, ignored and untracked; no secret values were printed. Research, diagnostics and scripts stay outside `dist`.

## Integrated corrections

- Added the reviewed inherent-stat, ordinary-widget and offensive-skill references, with source confidence kept separate from numeric availability. The primary maximum takes precedence at full stars. Gordon, Fahd and Chenko partial curves that conflict with that endpoint remain unmapped; they were not rescaled.
- Canonicalized the verified Jaegar → Jaeger alias when evaluating identity. Duplicate aliases cannot represent two simultaneous heroes; stored IDs remain unchanged. Sixth-step encoding is retained.
- Added Marlin’s third Expedition skill, Dynamo, alongside Wild Card, and Gordon’s static second-skill shared Attack. Hosting skill slots are separate from joining slot 1. New supported shared Lethality effects participate in their own family.
- Distinguished Hilde’s replacement-hit **total damage** from Margot’s extra-attack packet. A replacement percentage is converted to extra damage only after subtracting the replaced ordinary hit. Packet eligibility and overlap remain explicit assumptions.
- Applied owned Helga’s account talent exactly once, even when she does not march. This profile receives +2 percentage points of account Attack. Her three entered zero Expedition skills were preserved. No hosting or joining skill is substituted for that talent.
- Kept ordinary widget Lethality separate from rally widget skill effects. Marlin/Thrud’s known rally-skill magnitudes do not establish a widget-stage-to-skill-level mapping. Nonzero widgets without that mapping remain unresolved.
- Added an offline conditional report-stat reconciliation utility. It requires matched conditions and identified layers; it does not assume a missing special multiplier equals one. No personal baseline could be recovered from this snapshot, and no combined report stat was added atop its components.
- Prevented newly unresolved offensive operations from silently receiving zero and producing a confident ranking. Explicit skill values take precedence; only unentered skills receive the established assumed cap where a known mapping/planning rule permits it.

### Already correct and retained

- Hosting class weights use `hero.troop`, with all six host permutations producing identical contributions and scores.
- T10/TG6 Howling Wind retains the player-reported 0.30 probability × 0.50 extra damage, scoped to Archers. Other unknown TG stages are not inferred.
- Unclassified legacy stat zeros stay unchanged in saved data and use documented finite comparison assumptions. Explicitly confirmed zeros remain zero. Identical baseline cases are deduplicated.
- Incoming selected rally skills are applied identically across host candidates, with interactions calculated separately. The player’s outgoing joining squads enter separate rallies and never become incoming host bonuses.
- Hosting is selected using total modeled damage for the entered formation, with joining contexts handled separately. No arbitrary combined resource ROI or class-balance objective was introduced.

### Release-blocking implementation defects corrected

The expanded candidate set exposed memory exhaustion in full-profile replay and oversized development diagnostics. Equivalent filler assignments are now materialized only when needed, joining vectors are shared, speculative upgrade caches are released, replacement dominance is checked lazily, and diagnostics factor repeated host/join matrices into keyed records. All legal comparisons remain available in development diagnostics. Capacity-sensitive allocation retains its calculated path.

A safe next-step upgrade rejection bound avoids fully reoptimizing a bench-only stat upgrade when even its unconstrained supported host maximum cannot beat the current legal host. It checks all relevant rankable teams and bypasses the shortcut when new coverage or other role/account effects could change the answer. Focused tests compare it with full optimization. A complete replay, including improvements and gear milestones, succeeded within a 512 MB Node heap in 61.8 seconds. This is audit runtime, not a reported browser load time.

Only two additional complete-sentence tooltip keys were needed to correctly distinguish replacement hits from extra attacks. All eight language catalogs retain matching keys/placeholders; the new translations are drafts for native terminology review. No design or editor controls changed.

## Current legal plan

| Role | Heroes, leader first for joining | Active gear |
|---|---|---|
| Hosting | Zoe / Petra / Yang | Infantry / Cavalry / Archer class sets respectively |
| Join 1 | Chenko / Alcar / Diana | No duplicate active hosting gear |
| Join 2 | Amane / Eric / Edwin | No duplicate active hosting gear |
| Join 3 | Vivian / Forrest / Gordon | No duplicate active hosting gear |

All 12 heroes are distinct. Each squad satisfies one hero per troop class and respects availability/exclusions. Joining leaders contribute their first Expedition skill; fillers provide class completion and only supported capacity benefits. Equivalent fillers are ties, not stronger alphabetical choices. The 12 active gear pieces are assigned once to their compatible hosting classes. Joining skill selection remains receiving-rally dependent.

## Hosting comparison at saved progression

These totals are internal model units, not a forecast of an in-game Bear score. All rows use Zoe/Petra, identical transferable Archer gear, account effects and incoming context.

| Third hero | Central modeled total | Below selected host |
|---|---:|---:|
| Yang | 145,290,236.95 | 0.000% |
| Vivian | 143,530,110.12 | 1.211% |
| Rosa | 135,525,605.38 | 6.721% |
| Marlin | 101,811,680.03 | 29.925% |

The closest supported competitor is **Zoe / Petra / Vivian**; Yang’s central estimate is 1.226% higher. Rosa remains included in the comparison rather than discarded.

| Hero | Entered supported differences |
|---|---|
| Yang | Inherent Archer Attack 308.5%; ordinary widget Lethality 26.7%; skill level 4: Avalanche 80% every four turns, Ice Zone 80% at 40% chance, Ambush 50% at 32% chance; hosting widget skill adds 5% shared Lethality. |
| Vivian | Inherent Archer Attack 308.07%; ordinary widget Lethality 44.4%; level-5 Crouching Tiger 25% enemy damage taken, Focus Fire 100% periodic extra strike with the next-hit 15% replacement debuff, Trap of Greed 60% periodic Archer extra damage. Its ordinary offensive stat remains separate from defensive widget effects. |
| Rosa | Inherent Archer Attack 370.3%; ordinary widget Lethality 46.25%; level-5 Chaos Gambit 50% at 40% chance, Golden Rhythm 30% Archer Attack; hosting widget skill adds 7.5% shared Lethality. |
| Marlin | Inherent Archer Attack 152.59% at entered progression, widget 0; level-4 Wild Card 50% extra damage at 32% chance plus Dynamo 40% at 50% chance. Marlin is a legal Archer alternative; both offensive skills are included in this lower central estimate. |

Conditional proc magnitudes are not equated to unconditional bonuses. Attack, Lethality, damage-taken, extra strikes and ordinary widget stats keep their distinct treatment. The complete candidate/effect records and sources are in `replay.json`.

## Remaining recommendation uncertainty

Yang leads across all eight identical incoming mixes under the central mechanics. Sensitivity checks contain 8,816 finite-baseline/mechanic/context combinations, including 2,982 reversals; these counts are **not probabilities**. Rosa can lead under alternate Attack stacking and lower finite baselines; Vivian can lead under counter/packet hypotheses. Other candidates, including Alcar, can lead under operation-group overlap assumptions. The output retains the specific scenario keys and limitations.

The material unresolved questions remain: Archer Volley staging and its Howling Wind/extra-attack interactions; Vivian’s starting counter phases and simultaneous Focus Fire/Trap precedence; Rosa’s Golden Rhythm Attack family; Alcar/other damage-operation overlap; rally widget interactions; and the actual permanent class bonuses. Existing community calculators/tests may share research and are not independent verification. This integration does not resolve those mechanics or manufacture a personal baseline.

Fahd’s entered partial inherent Attack remains unavailable. Jaeger’s Tempest lifetime/onset, Sophia’s Terror activation and following-turn packets, and some entered lower-star offensive unlock mappings for Triton/Margot/Thrud remain blockers to their complete comparison. Known contributions are retained; incomplete heroes are not declared weaker. Nonzero Marlin/Thrud widget-stage mappings also remain incomplete. No overall “best among every owned hero” claim is made.

## Next useful improvements — before/after priorities unchanged

Benefits below are actual mapped stat deltas, not predicted Bear damage. Hero investments depend on keeping the hosting role. Unknown material costs do not support verified ROI.

| Target | Short reason | Resource / verified cost |
|---|---|---|
| Archer boots Mastery 4 → 5 | +5 percentage points Archer Lethality; transferable | 50 forge hammers |
| Archer helmet Legendary +7 → +8 | +1.05 percentage points Archer Lethality; transferable | 2,800 enhancement XP |
| Petra widget 3 → 4 — conditional hosting investment | +7 points widget Lethality and +2.5 points shared hosting Attack | Widget materials; exact cost unverified |
| Yang stars 3.3 → 3.4 — conditional hosting investment | +17.42 points inherent Archer Attack | Hero shards; exact cost unverified |
| Alpha Black Panther level-60 advancement, if incomplete | +1.76 points passive Attack | Pet advancement materials; exact cost unverified |

Every active piece’s next offensive step and larger supported milestone is evaluated in the replay. Archer helmet Mastery 11 → 12 adds a slightly greater modeled immediate gain than boots (0.4901% versus 0.4580%), but costs 120 hammers **plus 2 Mythic Gear**, versus 50 hammers for boots. Boots offers approximately 2.24× the central modeled gain per hammer and is the immediate hammer-path choice. The additional material requirement is retained; this is not a cross-resource ranking. Larger milestones stay separate and do not silently displace useful immediate steps. No health/Defense-only upgrade is promoted.

Zero-level/unowned pets contribute nothing, completed advancements are excluded, and an unconfirmed level-60 advancement remains conditional rather than assumed incomplete. Saved advancement confirmation survives navigation/reload.

## Validation

- Supplied independent reference checks: **20/20 passed**. These validate structure/arithmetic, not observed combat.
- Corrected integration checks: **76/76 passed**; memory/localization checks **37/37 passed**; final alias/diagnostic checks **18/18 passed**.
- Final complete regression: **327/327 passed**, no failures/skips. Earlier fixtures assuming every account talent was zero were isolated from the newly modeled owned Helga talent; the old “Gordon wholly unmapped” expectation was replaced by checks of his supported static skill and still-missing partial inherent stats. Genuine diagnostic/memory failures were fixed in production code.
- Final production build: passed with Node **v22.23.3**. Vite reports its existing large-chunk warning; no build failure.
- Production desktop **1440px** and mobile **375px**, all eight languages: Results, all six editor/navigation pages, no horizontal overflow, immediate translations without calculation restart, 12 loaded gear images, five improvements, hidden developer tools, keyboard/tap tooltips, language persistence and saved-input reload checks passed.
- Final-build rerun and first-completion wizard acceptance results are recorded in `final-browser-checks.json`.
- Environment/security/protected-file and publish-output checks: passed, see `release-security-checks.json`.
- Netlify paths remain `dist` and `netlify/functions`; `/api/player/:id` redirects to the player function before SPA fallback. Local port 8888 rejects an invalid ID with JSON HTTP 400, verifying routing/validation without an upstream request or secret disclosure.

There is no demonstrated functional release blocker after these checks. Uncertain combat mechanics limit recommendation confidence, and authenticated upstream import for player 100111478 was not invoked in this task. The player interface contains one recommendation and concise guidance, not these totals or exhaustive alternatives.

## Sources and evidence scope

- Supplied `bearmaxxing-calculation-review/REPORT.md`, `hero-progression-review.json`, `supplementary-hero-effects.json`: preserved research provenance and independent structural checks.
- [Official Marlin reference](https://kingshotwiki.com/heroes/kingshot_wiki_hero_name_50018_kingshot_end/): skill magnitudes, scopes and ordinary widget endpoint; no invented widget unlock stage.
- [Official Gordon reference](https://kingshotwiki.com/heroes/kingshot_wiki_hero_name_50005_kingshot_end/): maximum inherent value and static shared Attack skill.
- [Official Helga reference](https://kingshotwiki.com/heroes/kingshot_wiki_hero_name_50009_kingshot_end/) and [community Helga progression](https://kingshotoptimizer.com/heroes/helga/): account applicability versus partial talent increments.
- [Rosa](https://kingshotoptimizer.com/heroes/rosa/), [Yang](https://kingshotoptimizer.com/heroes/yang/), [Vivian](https://kingshotoptimizer.com/heroes/vivian/): community testing claims; remaining model assumptions stay explicit.

## Post-deployment checklist (no deployment performed)

1. Player import works for ID **100111478**.
2. Saved inputs survive reload.
3. Hosting, three joining squads and upgrade recommendations render.
4. Language switching and tooltips work on mobile.
