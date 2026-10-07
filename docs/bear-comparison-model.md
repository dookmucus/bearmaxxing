# Bear comparison model — October 6, 2026

Hosting selection now maximizes **total modeled Bear damage for the entered formation**. The previous minimax objective is removed. Sensitivity checks do not reduce damage to reward balanced class factors, and joining bonuses cannot buy a hosting-damage sacrifice. Saved inputs, configuration, migration and the simplified interface remain unchanged.

## Objective and legal roles

All legal host trios and separate joining squads are still enumerated without named reservations, duplicate heroes or shared equipment instances. Select the largest central hosting total among evaluable complete plans. Compare remaining joining offers across the documented rally contexts **only among equal-damage host choices**. Joining context dominance removes inferior offers; incomparable joining outcomes retain tradeoffs. Identity ordering chooses a display representative, never a stronger hero or a fabricated overall score. Three joins are three different rallies, not one summed skill pool.

Incomplete hero magnitudes or troop mechanics are not zero. Where a damage objective cannot be evaluated, retain an unranked arrangement in development diagnostics only and explain the missing dependency. Results must not display that arrangement as a host or joining recommendation. Selection status and the actual displayed improvement actions are exported. There is no fallback to the old ratio-weighted index. The class-keyed index remains development data only; all six hosting permutations are invariant.

## Troop coefficients and skills

[Published community coefficient table](https://strategicnoodle.com/kingshot/database/troops): explicit T1–T11 × TG0–TG8 rows, stored in `src/data/bear-troops.json`. No extrapolation or TG substitution. [Daryl's own table](https://kingshotsimulator.com/) cross-checks TG0–TG5. His provenance describes an adaptation from State of Survival; the Kingshot transfer is an assumption, not publisher verification. T11/TG5 Infantry Attack differs by one point (715 versus 716); the discrepancy is retained in metadata.

[Range reference](https://kingshotdata.kr/en/buildings/range.html): Ranged Strike gives Archers the Infantry matchup bonus; T7 unlocks Volley. Volley is a class-local extra-attack expectation, not shared Attack. Independent versus additive interaction with other troop procs is varied; hero-trigger and counter interactions remain uncertain.

[Community transcription of TG3 tooltips](https://kingshotworld.com/guides/kingshot-castle-battle-guide-formations-points/): Howling Wind is an Archer damage proc; Assault Lance is a Cavalry damage proc. Unyielding Shield reduces incoming damage and is irrelevant to Bear offense. [TG5–TG8 progression reference](https://kingshotguide.org/guide/kingshot-tg5-to-tg8-upgrade-guide) supports the Cavalry TG5 chance upgrade and describes TG8 defensive effects and Archer Truegold Wind. T10/TG6 Howling Wind is mapped from the player’s reported in-game text: 30% chance, 50% extra damage, Archer scope. Its provenance is user-reported, not a publisher table. TG5, TG7, TG8 and other troop tiers remain unmapped; TG8 pure-damage scaling and overlap are unresolved. Only missing magnitudes block a numeric ranking; TG6 now has an estimated total while stacking and extra-attack interactions remain separate uncertainties. Other checkpoints never reuse TG6 or TG3 values. TG8 coefficients are supported even where the full skill model is not.

Cavalry bypass targets enemy Archers and cannot gain that target against the infantry-only Bear. Its ordinary troop Attack still contributes. No defensive-only improvement is offered as Bear offense.

## Hosting formula

[The firsthand Bear example](https://kingshotguides.com/guide/bear-trap-damage-mechanics-and-example-simulation/) supplies count scaling and the ten-round target parameters. A focused regression still reproduces its T6/TG0 example without making T6 the player's formation.

```text
army[class] = sqrt(classCount × min(totalCount, BearCount))
class base offense = tier/TG Attack × tier/TG Lethality / 100
ordinary class factor = (1 + class Attack / 100) × (1 + class Lethality / 100)
family factor = product over operations (1 + sum of applicable bonuses / 100)
class damage = army × class base offense / BearDefense / 100
             × ordinary class factor × widget multipliers
             × family factor × applicable troop-skill factors
hosting total = sum of class damage over the Bear rounds
```

Use the hero's troop class and its entered tier/TG row. With an entered march size, integer class counts follow the existing formation allocation. Available troops remain checked; no inventory or actual capacity is invented. Without a march size, the common square-root count factor cancels between fixed formations: only **formation-relative damage units** can be compared, not an absolute forecast. Mixed-tier aggregation remains unresolved and blocks a damage ranking.

Inherent hero stats, class gear and ordinary widget stats add once to their relevant class. Account effects remain separate from report-inclusive legacy hero values. Shared Expedition skills enter operation families instead of being counted again as ordinary stats. Rally widget skills enter a distinct host-only multiplier layer; no first-portrait widget bonus is inferred. Joining fillers contribute class completion and verified capacity only. Entered actual capacity is not augmented a second time.

## Effect mechanics and sources

The [official Combat FAQ](https://centurygames.helpshift.com/hc/en/140-kingshot/faq/9125-combat-faq-1783436100/) establishes turn-based combat and rally skill participation, not these numeric coefficients or operation IDs. [Daryl's controlled joiner tests](https://kingshotguides.com/guide/joiner-hero-mechanics-no-one-told-you-about/) support same-family addition and cross-family multiplication; transfer of those controlled PvP observations to Bear remains explicit.

Hero-specific scopes and magnitude tables retain their provenance in `hero-offensive-effects.json` and `bear-mechanics.json`:

- [Rosa](https://kingshotoptimizer.com/heroes/rosa/): Chaos Gambit expectation in family 101; Archer-only Golden Rhythm with unresolved operation overlap.
- [Yang](https://kingshotoptimizer.com/heroes/yang/): all-squad Avalanche and Archer-only Ice Zone share a direct-strike family; Ambush is separate. Counter phase varies over ten rounds.
- [Long Fei](https://kingshotoptimizer.com/heroes/long-fei/): Art of War rolls by troop class; extra damage is distinguished from the complete strike.
- [Zoe](https://kingshotoptimizer.com/heroes/zoe/): Sundering Wound is excluded on the author's Bear testing claim. Charisma and Infinite Arsenal retain all-squad scope and overlap limitations.
- [Petra](https://kingshotoptimizer.com/heroes/petra/): Evil Eye is per-attack and duplicate-nonstacking; attack-union versus per-attack timing is varied. The Favor retains its correlation/family uncertainty.
- [Vivian](https://kingshotoptimizer.com/heroes/vivian/): Crouching Tiger remains enemy damage taken, not Attack. Focus Fire varies counter timing and subsequent debuff overwrites. Back-row damage is excluded separately.

The [widget Special Bonuses description](https://kingshotsimulator.com/) is a community layer model. Full interaction with entered Pet/Master special-stat decomposition remains unresolved. No unrelated simulator implementation was copied.

## Finite sensitivity checks

The central calculation preserves each entered permanent baseline. When absent, the central **estimated case** uses 500 percentage points, with finite 200/500/1000 cases; these are declared stress-test assumptions, not player inputs, verified ranges or maximum progression. Each class varies independently: 27 class combinations plus two opposite Attack/Lethality cases. Entered baseline cases vary ±20%, preserving the exact central value. These numbers are not written to the profile or given scenario probabilities.

Stored zero values marked `assumed` are display defaults, not confirmed combat baselines. Explicit `user-confirmed` or imported zero values stay zero. Zeros lacking provenance are labeled unclassified and receive finite comparison assumptions without rewriting the saved value. Identical baseline cases are deduplicated while preserving the exact central case. The diagnostics export entered value, interpreted baseline, and provenance separately.

Every finite case is crossed with four family/counter variants and independent versus additive troop-proc expectations. Diagnostics report which legal hosts win, whether the selected host remains best in every tested case, and the closest central alternative. A reversal keeps the recommendation provisional; stability across tested cases does not establish official mechanics or statistical confidence. The objective remains the **central total damage**, never maximum worst-case regret, a class-factor minimum or an average with joining contexts.

Unknown proc correlations, pure-damage behavior and Special Bonuses can remain outside these cases. No finite scenario is described as exhaustive.

A missing class-specific magnitude cannot generally cancel from a total containing other classes: `D = I + C + unknown × A`. Pairwise comparison is permitted only when the affected Archer contribution and offensive trigger/stacking logic are identical, making that entire common addend cancel from the difference. Diagnostics export the proof and its scope. Changing Archer stats, proc logic or shared effects invalidates it; no absolute total or missing magnitude is inferred.

## Improvements

Each hypothesis copies the supplied live profile, preserves explicit skills, transfers gear by class, and re-optimizes the complete legal plan with the same total-damage objective. Benefits within a resource path are ranked by estimated total hosting-damage gain. Separate joining-context gains and personal-point talents retain their own scope. No cross-resource ROI or guaranteed Bear damage is claimed.

Where the damage objective is unavailable, a directly verified monotonic stat improvement can remain as useful **unranked advice**. Its tooltip says the damage ranking is unavailable; there is no substitute class score. Health-only gear improvements remain excluded. Documented Truegold steps are offered only when both endpoints have supported offensive mechanics. Targets do not imply unentered prerequisites or verified costs. Replacement milestones require a supported total-damage comparison, preserve transferable gear, and remain provisional when mechanics are incomplete.

## Profile and remaining limits

The supplied v1 diagnostics have heroes and gear but no current troop tiers/TG, Masters, Pets, baselines or capacity settings. The browser session was unavailable for this investigation. No defaults or maximum values were used as a purported player replay. The live app continues to calculate from the user's existing profile; no re-entry or migration change is introduced.

Remaining recommendation-reversing uncertainties include TG5+ Archer progression, TG8 pure-damage integration, troop/hero extra-attack and counter interactions, hero operation overlap and correlation, widget/Pet/Master layers, unmapped or mixed-tier data, and unknown accepted joining skills in each captain's rally. Estimated totals use community coefficients whose Kingshot applicability still needs in-game calibration.

## Follow-up: supplied diagnostics replay

Alcar’s published star-step table is now mapped, including **187.53% Infantry Attack at starStep 20**, from [Kingshot Database](https://kingshotdata.com/heroes/alcar/). This inherent stat mapping does not imply that his offensive skills or their operation families are fully integrated. Those remain explicitly missing instead of disappearing as zero effects.

The current request references a version-4 diagnostics attachment, but no version-4 file is exposed in this session’s attachments or repository. The accessible prior attachment is version 1. Consequently no resulting host, joining squads, or closest competitor is asserted for the player. Local fixtures verify the TG6 fix and export behavior; fixtures are not substituted for the player’s profile.

## Research handoff update (supersedes the earlier Vivian exclusion)

`bear-attack-events.mjs` supplies the production finite event expectation. For ten rounds, resolve active classes in canonical Infantry/Cavalry/Archer order. Branch on Archer Volley and merge identical counter/debuff states by probability; no sampling or scenario-frequency confidence claims. Sum each class's event rewards, divide by ten for the existing count/stat formula, and remove Volley from the external troop multiplier so it is counted once. Event-factor caching excludes ordinary stats and gear; those remain in the class-keyed damage objective.

[Supplied Gen-5 transcript](https://www.youtube.com/watch?v=tamg6W2DSGA), 22:59–26:56: Focus Fire uses a shared four-event counter including Volley; its extra damage is attached to the triggering event, and the next event gets the weaker replacement (15% at level 5). Trap of Greed retains its Archer damage against infantry Bear, uses only ordinary Archer attacks, and clears the passive on the following ordinary attack. First phase and Focus/Trap simultaneous damage/debuff precedence remain isolated sensitivity cases. These are community research claims, not independently reproduced game tests. Ordinary widget stats remain included and the defender widget skill excluded.

[Supplied Gen-4 transcript](https://www.youtube.com/watch?v=xNbGnQFhiWs), 7:29–8:13: Alcar's Carpe Diem target damage-taken contribution lasts the full round, affecting Cavalry/Archer too. Known Praetorian Will and Carpe Diem magnitudes participate conditionally in distinct descriptive families or a combined additive family. These labels are model assumptions, not discovered operation IDs. Their stacking with other heroes' effects is unresolved.

Golden Rhythm is tested separately and in the shared 102 Attack family, without inferring a unique multiplier from class scope. Yang uses two finite pulses (4/8 centrally, 5/9 for delayed phase), with entered-level Ice Zone and Ambush magnitudes/chances. Chance correlations and extra-damage interactions remain unknown. Petra's central event case gives successive hit proc probabilities 50%, 75%, 87.5% with no earlier-hit retroactivity, assuming own-hit application and round-end expiry; a current-hit-only case checks persistence. Duplicate Evil Eye remains nonstacking. Expiry, Volley rolling and correlation require further testing.

The range page documents generic Volley 10%, not an isolated T10/TG6 stage measurement. Diagnostics mark that exact-stage applicability unverified; the central number is conditional on this generic reference, with 0%, 20% and 100% sensitivity cases. Those are hypothetical probability inputs, not new troop mappings or player values. Stability under them is not proof of exact stage mechanics. T10/TG6 Howling Wind remains separately user-sourced at 30%/+50%; no other stage is inferred.

The Frakinator widget example establishes `(1 + 234.6/100) × (1 + 7.5/100) - 1 = 259.695%` and ordinary-widget/rally-widget separation. It does not establish multiple-widget combination or special Master/Pet layering. The current profile is a component-derived calculation, not an effective battle-report-stat import; effective report stats must not be added to their components. The exported model retains this layer uncertainty. The synthetic external Yang/Rosa benchmark lacks formation and some skill details, so it cannot establish a matched profile result or progression crossover.
