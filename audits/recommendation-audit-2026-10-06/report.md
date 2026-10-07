# BearMaxxing recommendation audit — 6 October 2026

**Provisional current host: Zoe / Petra / Yang. A verified overall best host is not established.** Rosa is close, while Vivian’s attack sequence and Alcar’s offensive operation families prevent their definitive comparison. Other eligible heroes also have missing mappings; they are unranked, not weaker.

The [replay JSON](replay.json) contains exact inputs used in the reconstruction, candidate effects/statuses, damage sensitivity cases, all hypothetical Vivian traces, joining contexts and displayed upgrade actions. [Replay script](replay.mjs) reconstructs the supplied snapshot without applying maximum defaults. Its assertions verify that the supplied file and reconstructed inputs remain unchanged and that hosting/joining Masters and Pets effects match the snapshot exactly.

## Snapshot and comparison scope

Source snapshot: `/Users/timebomb/Downloads/bearmaxxing-diagnostics-v4.json`. Formation 10/10/80; 156,710 troops: 15,671 Infantry T10/TG5, 15,671 Cavalry T10/TG6, 125,368 Archers T10/TG6. All three compared Archer candidates receive the same active Archer gear instances. Ordinary widget stats are included once; hosting widget skill multipliers are separate. Joining heroes receive neither hosting stats nor widget multipliers.

The six exported permanent Attack/Lethality zeros have no confirmation provenance. Their origin cannot be proved from this export. The calculator preserves those stored zeros, treats them as unclassified, and evaluates documented finite assumptions of 200/500/1,000 percentage points instead of claiming they are confirmed combat stats. The central assumption is 500pp. Explicitly confirmed zero values are still respected. Identical sensitivity cases are deduplicated.

Archer TG6 Howling Wind uses the player’s reported 30% chance of 50% extra damage. Its expected isolated multiplier is 1.15; interactions with Volley, other extra damage and attack counters remain uncertain. No TG5/TG7/TG8 magnitude is inferred. Community tier coefficients and target scaling remain estimates. These totals are community-model units, **not calibrated predictions of the player’s Bear damage or score**.

## Rosa / Vivian / Yang, with Zoe and Petra held fixed

| Archer hero | Entered progression | Central estimated total | Status |
|---|---|---:|---|
| Yang | Star step 22, widget 2, derived skill levels 4 | 69,669,897 | Provisional modeled leader |
| Rosa | Star step 31, widget 5, derived skill levels 5 | 68,760,232 | Closest ranked competitor |
| Vivian | Star step 25, widget 4, derived skill levels 5 | Unknown | Individual attack sequence unresolved |

These derived skill levels are the existing player planning assumption, not newly substituted maximum progression. Explicit entered skills are preserved.

Yang’s central advantage over Rosa is **1.32%**. Rosa has 370.30% inherent Archer Attack versus Yang’s 308.50%, 46.25% ordinary widget Lethality versus 26.70%, and 7.5% hosting widget Lethality versus 5%. Rosa’s Chaos Gambit contributes an expected 20% in the tested Lethality family; Golden Rhythm gives a known 30% Archer-only Attack effect, whose operation-family overlap remains unresolved. [Rosa research](https://kingshotoptimizer.com/heroes/rosa/).

At Yang’s entered skill level 4, Avalanche gives 80% periodic extra damage, Ice Zone has a 40% chance of 80% extra Archer damage, and Ambush has a 32% chance of 50% extra squad damage. The source reports Avalanche and Ice Zone add within one family, with Ambush multiplying separately. The central ten-round assumption has two Avalanche activations. [Yang research](https://kingshotoptimizer.com/heroes/yang/).

Zoe and Petra are common to these comparisons: Zoe supplies 25% shared Attack and Infinite Arsenal’s conditional damage-taken effect. Petra supplies Evil Eye, The Favor, and 5% hosting widget Attack. Their debuff overlap and within-turn proc timing remain assumptions, not verified independent multipliers. [Zoe research](https://kingshotoptimizer.com/heroes/zoe/), [Petra research](https://kingshotoptimizer.com/heroes/petra/).

### Sensitivity and the previous Vivian/Yang reversal

The old implementation treated crossing a four-attack counter as permission to boost **every class attack for a whole round**, then weakened Crouching Tiger for **every attack in the next round**. With three active classes, this produced seven boosted rounds and inflated Vivian’s central estimate to 83,126,701. The slower counter case boosted far fewer rounds. Those were bundled assumptions, not two observed game outcomes.

That round broadcast is removed from production comparison. Vivian hosting damage is now unknown rather than a subtotal ranked against fully modeled teams. Audit-only sequences applying the bonus to individual attacks give central estimates of **59,967,709–64,831,326** across shared/class-local counters, fourth/following-attack activation and six class-action orders. None of these assumptions is established as the game’s sequence. Across the existing finite/family/proc sensitivity grid, these hypotheses are 2.11%–21.42% below the matching Yang estimate. This is not a confidence interval and does not exclude other untested mechanics.

Rosa can narrowly overtake Yang with lower assumed Cavalry/Archer baselines: her stronger ordinary stats matter more when the unknown permanent bonuses are smaller. The largest tested Rosa advantage is about 1.16%; the all-500pp central case favors Yang. Family-overlap cases merge several unresolved effects together, so they cannot identify one real stacking rule. Scenario counts are not probabilities.

## Vivian: evidence and attack-by-attack trace

The researchers report faster Focus Fire counter advancement with three troop classes, a weaker 15% effect replacing Crouching Tiger’s 25%, and no Trap of Greed damage against the infantry-only Bear. The page does not establish a complete attack sequence. Exact counter ownership, activation phase, replacement consumption, and additional-attack handling remain unresolved. [Vivian research](https://kingshotoptimizer.com/heroes/vivian/).

**The following trace is a hypothesis, not an in-game test.** It assumes a shared counter, activation on each fourth normal attack, one weaker debuff consumed by the next received attack, and I/C/A internal action order. This is troop-action order, not hero portrait order. Counters shown are cumulative. No random Volley or other extra attack is fabricated. Trap of Greed adds no separate damage here; whether it still writes/clears a debuff is not established.

| Round | Attack | Class | Counter | Focus Fire extra damage | Enemy damage taken |
|---:|---:|---|---|---:|---:|
| 1 | 1 | Infantry | 0 → 1 | 0% | 25% |
| 1 | 2 | Cavalry | 1 → 2 | 0% | 25% |
| 1 | 3 | Archer | 2 → 3 | 0% | 25% |
| 2 | 4 | Infantry | 3 → 4 | 100% | 25% |
| 2 | 5 | Cavalry | 4 → 5 | 0% | 15% |
| 2 | 6 | Archer | 5 → 6 | 0% | 25% |
| 3 | 7 | Infantry | 6 → 7 | 0% | 25% |
| 3 | 8 | Cavalry | 7 → 8 | 100% | 25% |
| 3 | 9 | Archer | 8 → 9 | 0% | 15% |
| 4 | 10 | Infantry | 9 → 10 | 0% | 25% |
| 4 | 11 | Cavalry | 10 → 11 | 0% | 25% |
| 4 | 12 | Archer | 11 → 12 | 100% | 25% |
| 5 | 13 | Infantry | 12 → 13 | 0% | 15% |
| 5 | 14 | Cavalry | 13 → 14 | 0% | 25% |
| 5 | 15 | Archer | 14 → 15 | 0% | 25% |
| 6 | 16 | Infantry | 15 → 16 | 100% | 25% |
| 6 | 17 | Cavalry | 16 → 17 | 0% | 15% |
| 6 | 18 | Archer | 17 → 18 | 0% | 25% |
| 7 | 19 | Infantry | 18 → 19 | 0% | 25% |
| 7 | 20 | Cavalry | 19 → 20 | 100% | 25% |
| 7 | 21 | Archer | 20 → 21 | 0% | 15% |
| 8 | 22 | Infantry | 21 → 22 | 0% | 25% |
| 8 | 23 | Cavalry | 22 → 23 | 0% | 25% |
| 8 | 24 | Archer | 23 → 24 | 100% | 25% |
| 9 | 25 | Infantry | 24 → 25 | 0% | 15% |
| 9 | 26 | Cavalry | 25 → 26 | 0% | 25% |
| 9 | 27 | Archer | 26 → 27 | 0% | 25% |
| 10 | 28 | Infantry | 27 → 28 | 100% | 25% |
| 10 | 29 | Cavalry | 28 → 29 | 0% | 15% |
| 10 | 30 | Archer | 29 → 30 | 0% | 25% |

At attack 4 only Infantry receives the assumed Focus Fire bonus. Attack 5 receives the weaker debuff; attack 6 returns to 25%. That illustrates the defect in broadcasting either effect across whole rounds. All 24 alternative hypothesis traces are in the JSON. Their tests validate implementation arithmetic, not the game’s behavior.

## Alcar and other omissions

Alcar’s entered star step 20 maps to 187.53% inherent Attack. At his derived skill level 4, Praetorian Will supplies known 80% Infantry damage and 8% Cavalry/Archer damage; Carpe Diem supplies 48% Infantry extra damage and a 20% target damage-taken effect for one turn. These values and scopes are now recorded. Their operation families, application order and debuff expiry are unresolved, so an Alcar hosting total is withheld. Rescuing Hands and defender Health are not Bear offense. [Alcar research](https://kingshotoptimizer.com/heroes/alcar/).

Comparable omissions also include Marlin’s Wild Card/Dynamo, Jaeger’s Tempest, Thrud’s Battle Hunger and delayed counter skills, and Sophia’s Terror interactions. Their missing entered-stat/effect mappings preclude a numerical dismissal; generic guide rankings are not substitutes for this player’s progression. [Marlin](https://kingshotoptimizer.com/heroes/marlin/), [Jaeger](https://kingshotoptimizer.com/heroes/jaeger/), [Thrud](https://kingshotoptimizer.com/heroes/thrud/), [Sophia](https://kingshotoptimizer.com/heroes/sophia/).

The complete eligible-candidate omissions inventory is below. A mapping gap does not establish that an effect is offensive or irrelevant; unresolved cases remain unranked. Helga’s explicit zero skills are now respected even though her intermediate unlock cap is unknown; her known stats can be compared without inventing an unlocked skill value.

| Eligible hero | Entered star step | App limitation |
|---|---:|---|
| Jabel | 31 | Missing inherent Attack mapping; Jabel: Expedition offensive effects and Bear operation families are unmapped |
| Saul | 19 | Missing inherent Attack mapping; Saul: Expedition offensive effects and Bear operation families are unmapped |
| Howard | 31 | Missing inherent Attack mapping; Howard: Expedition offensive effects and Bear operation families are unmapped |
| Gordon | 31 | Missing inherent Attack mapping; Gordon: Expedition skill 2 (all) Bear operation family is unmapped |
| Quinn | 31 | Missing inherent Attack mapping; Quinn: Expedition offensive effects and Bear operation families are unmapped |
| Diana | 31 | Missing inherent Attack mapping; Diana: Expedition offensive effects and Bear operation families are unmapped |
| Fahd | 30 | Missing inherent Attack mapping; Fahd: Expedition offensive effects and Bear operation families are unmapped |
| Forrest | 31 | Missing inherent Attack mapping; Forrest: Expedition offensive effects and Bear operation families are unmapped |
| Seth | 31 | Missing inherent Attack mapping; Seth: Expedition offensive effects and Bear operation families are unmapped |
| Edwin | 31 | Missing inherent Attack mapping; Edwin: Expedition offensive effects and Bear operation families are unmapped |
| Olive | 31 | Missing inherent Attack mapping; Olive: Expedition offensive effects and Bear operation families are unmapped |
| Hilde | 24 | Missing inherent Attack mapping; Hilde: Expedition offensive effects and Bear operation families are unmapped |
| Marlin | 24 | Missing inherent Attack mapping; Marlin: Expedition offensive effects and Bear operation families are unmapped |
| Eric | 21 | Missing inherent Attack mapping; Eric: Expedition offensive effects and Bear operation families are unmapped |
| Jaeger | 23 | Missing inherent Attack mapping; Jaeger: Expedition offensive effects and Bear operation families are unmapped |
| Alcar | 20 | Alcar: Praetorian Will (infantry) Bear operation family is unmapped; Alcar: Praetorian Will (cavalry) Bear operation family is unmapped; Alcar: Praetorian Will (archer) Bear operation family is unmapped; Alcar: Carpe Diem (infantry) Bear operation family is unmapped; Alcar: Carpe Diem target debuff (all) Bear operation family is unmapped |
| Thrud | 10 | Missing inherent Attack mapping; Thrud: Expedition offensive effects and Bear operation families are unmapped |
| Vivian | 25 | Vivian: Focus Fire attack counter, activation and replacement sequence are not verified |
| Triton | 16 | Missing inherent Attack mapping; Triton: Expedition offensive effects and Bear operation families are unmapped |
| Sophia | 24 | Missing inherent Attack mapping; Sophia: Expedition offensive effects and Bear operation families are unmapped |

## Three joining squads for the provisional Yang host

Leaders are first. These are three **separate rallies**, not one combined skill pool.

| Squad | Short reason |
|---|---|
| Chenko / Alcar / Diana | Chenko’s selected level-5 primary skill adds 25% joining Lethality. |
| Amane / Eric / Edwin | Amane’s selected level-5 primary skill adds 25% joining Attack. |
| Vivian / Forrest / Gordon | Vivian’s selected level-5 Crouching Tiger adds 25% enemy damage taken; her later skills do not transfer. |

Chenko and Yeonwoo have equivalent mapped joining offers at this progression; the stable identifier chooses Chenko as a display representative, not a stronger hero. Attack, Lethality and enemy damage taken remain distinct families. Duplicate Vivian stacking and overlap with captain damage-taken skills remain uncertain. All nine joining heroes and the hosting trio are unique.

Fillers complete the troop classes and are tied level-80 capacity choices. Their hosting stats and extra skills are excluded. The entered 156,710 maximum already includes personal capacity; no filler capacity is added again. Different tied fillers are interchangeable, subject to no overlap.

### Yang versus Yeonwoo as joining leader

The official rule activates four selected member primary skills; Yang’s Avalanche is his primary skill, and no verified Yang-specific exclusion was found. This supports general activation when selected, **not an independently tested ten-round timing rule**. [Official Combat FAQ](https://centurygames.helpshift.com/hc/en/140-kingshot/faq/9125-combat-faq-1783436100/).

| Hypothetical receiving context | Yang level 4 marginal factor | Yeonwoo level 5 marginal factor |
|---|---:|---:|
| No overlapping family | 1.1600 | 1.2500 |
| Three other 25% Lethality-family offers | 1.1600 | 1.1429 |
| Three other 25% Attack-family offers | 1.1600 | 1.2500 |
| 50% Lethality-family and 25% Attack-family | 1.1600 | 1.1667 |
| Same-phase level-5 Avalanche family already present | 1.1333 | 1.2500 |
| Member skill not selected | 1.0000 | 1.0000 |

The Avalanche-overlap row isolates one receiving-captain family; it is not a full captain build or a forecast for a randomly assigned rally. It assumes additive same-family behavior and two synchronized pulses. Unknown duplicate suppression, phase, captain class-specific skills and other joiners can change the comparison. No context frequencies or captain stats are invented. Thus Yang does not universally beat Yeonwoo. In this provisional plan Yang is hosting; Vivian’s joining skill avoids Focus Fire’s hosting sequence.

## Next supported improvements

These are useful paths, not a cross-resource ROI ranking. Gear transfers to whichever Archer ultimately hosts.

1. **Archer helmet Mastery 11 → 12:** +5.35 percentage points of Archer Lethality.
2. **Archer helmet enhancement +7 → +8:** +1.05 percentage points of Archer Lethality; a different material path from Mastery.
3. **Alpha Black Panther: complete level-60 advancement:** +1.76 percentage points of passive Attack. This account improvement does not depend on selecting Yang.
4. **Petra widget 3 → 4:** +7pp Cavalry Lethality and hosting widget Attack 5% → 7.5%. Useful while Petra hosts; overall role selection remains provisional.
5. **Yang star step 22 → 23 (3.3 → 3.4):** +17.42pp inherent Archer Attack. **Conditional on retaining Yang as host.** Do not treat this as a proven investment priority over Rosa or Alcar.

The actual displayed actions and modeled upgrade effects are exported in `replay.json`. Their central estimated gains are respectively 0.485%, 0.095%, 0.266%, 2.491%, and 1.278%; these are model comparisons, not predicted Bear damage. No further Vivian investment is recommended. Rosa replacement advice that improved only the central case has been removed; no supported exact crossover is established.

## Research access and verification

Kingshot Optimizer attributes its findings to Zebrave, Strat Game Sloth and Frak. Its pages, their videos and Frakinator are one connected research lineage, not independent replication. Frakinator’s public URL returned errors/redirect loops and no interactive browser was available, so **no matching Frakinator benchmark was completed**. Do not read this report as benchmark agreement.

The [requested Bear leader video](https://www.youtube.com/watch?v=Dl6OkiyEr6E) was reachable as page metadata, but its caption request returned no transcript. The linked [Vivian video](https://www.youtube.com/watch?v=tamg6W2DSGA&t=1122s) identifies the Vivian chapter at 18:42; a complete transcript was likewise unavailable. No attack timing claim is attributed to unseen video content. A real benchmark would need matched rally counts/tier/TG, total class stats, entered skills/widgets and all selected rally skills. This snapshot lacks confirmed permanent stat baselines and actual receiving-rally builds. When total battle-report stats already include widgets, those widgets must not be added again.

Corrections are limited to calculation/reference/status files: quarantine unsupported Vivian round effects; record Alcar’s missing offensive values/scopes; compute periodic receiving-family contexts round by round; retain unknown candidate status and explicit zero skills; require all compared damage scenarios for hosting replacement advice; label hero investments conditional in diagnostics. UI, saved values, API/environment/Netlify configuration and Git settings are preserved. No push, deployment or remote writes.

Focused calculation checks passed: 41/41 across attack mechanics, optimizer, diagnostics and skill progression; final attack/status checks passed 6/6. The build passed with Node v22.23.3. No full test suite or styling changes.
