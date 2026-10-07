# Saved-profile upgrade efficiency — 6 October 2026

**Immediate forgehammer priority: Archer boots Mastery 4 → 5.** This corrects benefit-only selection of helmet Mastery 11 → 12. The estimated gains are 0.4531% and 0.4848% respectively, but boots cost 50 hammers and helmet costs 120 hammers **plus two Mythic gear pieces**. Boots offer **2.243× the gain per hammer** without the additional spare gear.

The [JSON replay](replay.json) includes all twelve active pieces, immediate rankings, complete milestone costs and current displayed actions. [Replay script](replay.mjs) uses the existing saved version-4 profile reconstruction, verifies the snapshot remains unchanged, and evaluates full legal re-optimization for each hypothesis. No maximum progression or material inventory is substituted.

## How efficiency is ranked

Use estimated change in hosting damage divided by the verified incremental **primary resource** cost, within one resource path only. Keep all additional required materials explicit. Hammers, XP, Mythic pieces and Mithril are a cost vector; they are not converted into invented equivalents. A hammer-normalized rank involving spare Mythic gear is conditional on that extra gear being available, not a complete scalar ROI.

Costs come from the published [forgehammer table](https://kingshotoptimizer.com/hero-gear/references/forgehammer-costs/), [XP table](https://kingshotoptimizer.com/hero-gear/references/xp-costs/) and [imbuement table](https://kingshotoptimizer.com/hero-gear/references/imbuement-costs/). Mastery costs target level × 10 hammers; above 10 it additionally consumes target level − 10 Mythic gear. Gold→Red ascension consumes two Mythic gear; milestone costs and required Mastery are included once. These are community reference costs, not an independent in-game confirmation for this account.

The benefit is the corrected central hosting objective for the entered formation, using the documented assumed baselines where provenance is absent. It is an estimated model gain, not predicted Bear damage. Separate upgrade hypotheses all start from the current profile; their gains must not simply be added as a budget plan.

## Immediate forgehammer ranking

| Upgrade | Estimated hosting gain | Verified incremental cost | Primary-resource efficiency |
|---|---:|---|---:|
| archer boots 4 → 5 | 0.4531% | 50 hammers | 0.009062% per hammer |
| archer helmet 11 → 12 | 0.4848% | 120 hammers, 2 Mythic gear | 0.004040% per hammer |
| cavalry helmet 4 → 5 | 0.0766% | 50 hammers | 0.001532% per hammer |
| cavalry boots 5 → 6 | 0.0766% | 60 hammers | 0.001277% per hammer |
| infantry boots 4 → 5 | 0.0202% | 50 hammers | 0.000404% per hammer |
| infantry helmet 4 → 5 | 0.0202% | 50 hammers | 0.000404% per hammer |

Infantry helmet and boots are effect/cost ties, not alphabetically ranked as stronger. Cavalry helmet and boots add equal offense, but the helmet’s next step costs fewer hammers. The Archer helmet’s slightly greater total increment does not make it the best immediate hammer use.

## Immediate XP path

Archer helmet +7 → +8: **0.0952% estimated hosting gain for 2,800 Enhancement XP**, with no additional hammer, Mythic or Mithril cost at this step. This is the only currently supported immediate offensive enhancement step among the active pieces. Archer gloves +6 → +7 are Health only; the gold pieces are at enhancement 100. None of those Health-only immediate steps are recommended for Bear offense.

## Every active piece

| Active piece | Immediate offensive evaluation |
|---|---|
| Infantry helmet | Master infantry helmet 4 → 5: 0.0202% for 50 hammers |
| Infantry gloves | No immediate Bear-offensive increment (Health only / enhancement cap) |
| Infantry armor | No immediate Bear-offensive increment (Health only / enhancement cap) |
| Infantry boots | Master infantry boots 4 → 5: 0.0202% for 50 hammers |
| Cavalry helmet | Master cavalry helmet 4 → 5: 0.0766% for 50 hammers |
| Cavalry gloves | No immediate Bear-offensive increment (Health only / enhancement cap) |
| Cavalry armor | No immediate Bear-offensive increment (Health only / enhancement cap) |
| Cavalry boots | Master cavalry boots 5 → 6: 0.0766% for 60 hammers |
| Archer helmet | Master archer helmet 11 → 12: 0.4848% for 120 hammers, 2 Mythic gear; Enhance archer helmet +7 → +8: 0.0952% for 2,800 XP |
| Archer gloves | No immediate Bear-offensive increment (Health only / enhancement cap) |
| Archer armor | No immediate Bear-offensive increment (Health only / enhancement cap) |
| Archer boots | Master archer boots 4 → 5: 0.4531% for 50 hammers |

All six Health pieces were checked; their Mastery or ordinary enhancement increment has no Bear offense. Their future class Attack milestones remain separate paths below. Archer boots explicitly provide Lethality, so their Mastery 4 → 5 is included.

## Larger paths: evaluate separately before saving

These are whole paths from the actual entered piece, not just the final milestone’s price. Costs include required Mastery, ascension where needed, all intervening XP and imbuements. The +100 Attack milestone is excluded because replacement/addition versus +20 is unresolved.

| Whole path | Estimated hosting gain | Complete verified cost vector |
|---|---:|---|
| Infantry helmet → +20 | 0.296% | 560 hammers, 52,650 XP, 6 Mythic gear, 10 Mithril |
| Infantry gloves → +60 | 0.098% | 810 hammers, 219,850 XP, 21 Mythic gear, 60 Mithril |
| Infantry armor → +20 | 0.065% | 560 hammers, 52,650 XP, 6 Mythic gear, 10 Mithril |
| Infantry boots → +60 | 0.572% | 810 hammers, 219,850 XP, 21 Mythic gear, 60 Mithril |
| Cavalry helmet → +20 | 1.112% | 560 hammers, 52,650 XP, 6 Mythic gear, 10 Mithril |
| Cavalry gloves → +60 | 0.359% | 810 hammers, 219,850 XP, 21 Mythic gear, 60 Mithril |
| Cavalry armor → +20 | 0.239% | 560 hammers, 52,650 XP, 6 Mythic gear, 10 Mithril |
| Cavalry boots → +60 | 2.073% | 760 hammers, 219,850 XP, 21 Mythic gear, 60 Mithril |
| Archer helmet → +20 | 2.726% | 36,900 XP, 3 Mythic gear, 10 Mithril |
| Archer gloves → +60 | 2.200% | 250 hammers, 206,850 XP, 18 Mythic gear, 60 Mithril |
| Archer armor → +20 | 1.467% | 600 hammers, 52,650 XP, 6 Mythic gear, 10 Mithril |
| Archer boots → +60 | 12.805% | 810 hammers, 219,850 XP, 21 Mythic gear, 60 Mithril |
| Archer boots → Mastery 10 | 2.719% | 450 hammers |

**Archer helmet +7 → +20 is the clearest near-term saving target for XP/Mithril/spare-gear planning.** It adds 13.65pp Archer Lethality and the documented 20pp Archer Attack milestone, giving about 2.726% estimated hosting gain. Current Mastery 11 already meets the gate. It requires 36,900 XP, 10 Mithril and three spare Mythic pieces. The immediate +8 enhancement is part of this path, not a competing use of XP. If this is the chosen goal, preserve the three Mythic pieces rather than spending two on helmet Mastery 12, which is not required to reach +20.

**Boots Mastery 4 → 10** gives about 2.719% estimated gain for 450 hammers and no additional Mythic gear/Mithril/XP. It can be taken incrementally; there is no requirement to bank all 450 before receiving benefits. The next step, 4 → 5, remains the more efficient immediate hammer action.

**Archer boots → Red +60** has a larger 12.805% estimated benefit but requires 810 hammers, 219,850 XP, 21 Mythic pieces and 60 Mithril. That is a separate long-term mixed-resource goal, not a cheaper substitute for the 50-hammer step. Do not save for it solely because its total benefit is larger.

**Health pieces reaching offensive milestones** are useful only as complete paths, not reasons to buy their ordinary Health increments now. For example, Archer chest +20 gives about 1.467% estimated gain but needs 600 hammers, 52,650 XP, six Mythic pieces and 10 Mithril from current Mastery 3. Gloves need +60; current Archer gloves require 250 hammers, 206,850 XP, 18 Mythic pieces and 60 Mithril for about 2.200% estimated gain.

The profile has no material backpack counts or spending budget. Thus this establishes costs and useful saving targets, not affordability or an optimal schedule across materials. Unlocking the +20 milestone may justify preserving its scarce Mithril/Mythic pieces when it is feasible; it does not justify foregoing every cheap independent upgrade.

## Five useful paths retained

1. **Forge hammers:** Archer boots Mastery 4 → 5; +5pp Archer Lethality, 50 hammers.
2. **Enhancement XP:** Archer helmet +7 → +8, working toward +20; +1.05pp Archer Lethality immediately, 2,800 XP.
3. **Widget materials:** Petra widget 3 → 4; +7pp Cavalry Lethality **and +2.5pp shared hosting Attack (5% → 7.5%)**. Useful while Petra hosts. No verified widget-material efficiency is claimed.
4. **Pet advancement:** Alpha Black Panther at level 60; +1.76pp passive Attack. No verified advancement-cost efficiency is claimed.
5. **Hero shards, conditional:** Yang stars 3.3 → 3.4; +17.42pp inherent Archer Attack **while Yang hosts**. No verified shard-cost efficiency or unconditional hero investment priority is claimed.

These paths are not ordered by cross-resource ROI. The existing Results list stays compact and retains its layout; the detailed cost audit is here and in development diagnostics. Petra’s visible explanation now includes shared hosting Attack, and Yang’s explanation states that the investment is conditional.

## Host uncertainty remains

The current provisional host is Zoe / Petra / Yang. Rosa remains the closest ranked competitor: 68,760,232 versus Yang’s 69,669,897 central model units, a **1.32%** Yang advantage. Rosa still wins narrowly under some lower assumed baselines. The shared Archer gear transfers between them. Vivian’s exact attack sequence, Alcar’s operation families and other omissions still prevent a verified overall best-host claim; the cost-ranking correction does not resolve those mechanics.

## Verification

Focused upgrade selection, cost, copy, hosting-objective and diagnostics checks: **23/23 passed**. Build passed with Node v22.23.3. Replay confirms twelve active gear pieces were evaluated and the saved snapshot/reconstructed inputs were unchanged. No full suite, layout change, push or deployment.
