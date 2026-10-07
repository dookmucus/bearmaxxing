# Calculation review — 6 October 2026

## What was reviewed

The supplied `report(3).md`, `report(4).md`, and `replay(2).json` were reviewed locally. The current Mac app/source was not available here. Public reference pages were inspected on 6 October 2026, with preference for Century Games' official wiki and help center. Community progression tables were crosschecked against primary maximum stats, not treated as fully game-verified curves.

The latest replay recommends Zoe / Petra / Yang provisionally. This review does not independently rerun that production engine or establish a replacement winner. Its purpose is to resolve concrete reference gaps before a final current-profile replay.

## Most consequential findings

1. **Reference coverage is incomplete beyond the six main contenders.** The supplied upgrade audit contains 30 eligible hero records; 19 have null inherent Attack despite `comparisonReady: true`. Eligibility is not evidence that complete offensive comparisons are possible. The missing names include Jabel, Hilde, Marlin, Margot and Thrud, which have documented offensive Expedition effects. Defensive and resource heroes still have inherent class stats, but their non-offensive skills should not receive fabricated damage contributions.
2. **Marlin's third Expedition skill is omitted by one fan database.** The official wiki lists Dynamo: a 50% chance of additional damage, progressing 10/20/30/40/50%. Wild Card separately has an 8/16/24/32/40% chance of 50% additional damage. Rumhead is defensive. These facts repair a missing skill catalogue; they do not establish joint roll correlation or how its packet stacks with other bonuses.
3. **Gordon's second Expedition skill is a static shared Attack bonus.** Trash Talk gives 5/10/15/20/25%; it is not an Attack proc. His first Expedition skill adds Health, so this second skill is a hosting contribution, not a joining-leader contribution.
4. **Some maximum Attack references conflict materially.** The official wiki reports 140.11% for Gordon, Fahd and Chenko. The inspected fan curves report 200.16% for Gordon and Fahd; the supplied model's Chenko maximum also uses 200.16%. Use the primary maximum for full-five-star derived stats. Do not proportionally rescale a conflicting partial curve: Fahd's entered partial stage remains unresolved.
5. **Different descriptions require different damage operations.** Hilde's 25% proc replaces a hit with 120–200% total damage. Margot's 25% proc creates an extra Cavalry attack dealing 120–200% damage. At the maximum level, isolated no-overlap means are 1.25 and 1.50 respectively; neither is a fully validated multi-hero Bear multiplier. Triton's skill-damage bonus must apply only to eligible skill packets, not every normal hit. Sophia's Terror activation against Bear is unresolved; an offensive description is not proof it activates on this target.

Primary references: [Marlin](https://kingshotwiki.com/heroes/kingshot_wiki_hero_name_50018_kingshot_end/), [Gordon](https://kingshotwiki.com/heroes/kingshot_wiki_hero_name_50005_kingshot_end/). Each supplementary JSON hero record supplies its exact primary URL.

## Reference files and confidence

`hero-progression-review.json` contains 20 reviewed hero records: the 19 missing from the supplied inherent-stat audit, plus Chenko's correction. It provides 17 complete community Attack curves over indices 1–31, ten ordinary widget Lethality tables, primary maximum values, source URLs, and the snapshot's entered progression. The Gordon/Fahd partial curves are withheld; Chenko receives only the primary maximum here because a reliable partial table was not compiled in this review.

Partial-step tables retain a **community-table, endpoint-crosschecked** designation. Matching a published maximum does not verify all intermediate rows. Minor maximum rounding differences for Diana, Margot and Thrud use the primary value at step 31 without rescaling the partial rows.

The fan table header describes 31 “stars”; these are progression indices, not 31 full stars. This profile uses `sixth-step-index-v1`: 7 = 1.0, 13 = 2.0, 19 = 3.0, 25 = 4.0, 31 = 5.0. Yang's 3.3 is index 22. No saved level, star or skill was changed. Reference stat tables are indexed by star progression; no unverified hero-level scaling is added. Entered hero level remains relevant to capacity and other existing supported calculations.

`supplementary-hero-effects.json` records the Expedition slots in primary-source order, numeric magnitude vectors, damage operation wording, offensive exclusions and unresolved mechanics. It is supplementary, not a replacement for the six existing contender formulae or Alcar's mappings. Its first-skill offensive entries also identify additional joining candidates such as Margot, Hilde, Marlin and Thrud; selection still depends on actual progression and receiving-rally effects.

Quinn's slot names differ between the fan page and official wiki. The primary first slot is defensive Precision Shot; the primary second slot is offensive Burst Fire. Match canonical slot plus effect, and retain alternate names as aliases. Name-only matching could swap these roles.

Ordinary widget stat magnitudes and rally widget skill activation are separate. A table with widget Lethality values does not fill a missing widget-skill unlock map. The primary pages document five rally skill magnitudes for Marlin and Thrud; this package does not claim their complete level-to-skill maps are primary-verified.

## Account-wide passive check

Helga's Power of the Deer applies Attack/Defense even when she is absent from the march. Its full-star increments are documented as 2/4/6/8/10%. Verify it is counted once in account ordinary stats when owned, rather than attached only to a selected host. The supplied snapshot owns Helga at one full star but explicitly sets her three Expedition skills to zero; those explicit zero values must survive. The talent is separate from those three skills. Amadeus is not owned in this snapshot and must not receive an assumed account bonus.

Sources: [official Helga](https://kingshotwiki.com/heroes/kingshot_wiki_hero_name_50009_kingshot_end/) confirms an absent-hero talent; [Optimizer Helga](https://kingshotoptimizer.com/heroes/helga/) links its progression to stars. This is an integration check, not a claim that the current engine definitely omits the talent.

## Permanent stats: how to anchor without double counting

The replay's stored permanent-stat zeros are unconfirmed. It uses assumed baselines instead. Those assumptions can affect close Yang/Rosa/Vivian comparisons. The current personal winner therefore cannot become “verified” merely because catalogue coverage improves.

The [official Combat FAQ](https://centurygames.helpshift.com/hc/en/140-kingshot/faq/9125-combat-faq-1783436100/) distinguishes Expedition skills from displayed battle-report stats, and describes captain skills separately from selected joining first skills. Do not add those skills a second time through a reported stat anchor.

Six captured class Attack/Lethality percentages may help, without collecting every building or charm. They require the matching captain trio, gear/widgets, active account buffs, and known special-stat decomposition. A town overview, joiner's report, or a different offensive lineup is not automatically interchangeable.

The following is **conditional reconciliation algebra**, not a newly verified Kingshot stat-family formula. If independently established ordinary and special layers satisfy:

```text
reportedFactor = (1 + ordinaryBaseline + knownOrdinaryReference / 100)
                 × specialReferenceFactor
```

then:

```text
ordinaryBaseline = (1 + reportedPercentage / 100) / specialReferenceFactor
                   - 1 - knownOrdinaryReference / 100

candidateFactor = (1 + ordinaryBaseline + knownOrdinaryCandidate / 100)
                  × specialCandidateFactor
```

For a synthetic example, a 200% ordinary baseline, 240% known ordinary contribution and 1.10 special factor produce a displayed 494%. Recovery yields the original 200%, rather than adding 494% to gear/heroes again. Changing the known ordinary contribution to 260% yields factor 6.16.

If special-layer magnitude or source allocation is unknown, six merged totals cannot uniquely recover the underlying baseline. Reject that decomposition, retain assumptions visibly scoped, and do not silently set the special factor to one. Negative recovered baselines also indicate incompatible inputs or duplicate accounting. No new permanent-stat UI fields are requested by this handoff.

## Truegold and upgrade efficiency

The supplied audit has Infantry TG5→6 and Cavalry TG6→7 paths but no Archer TG6→7 path. It does not establish that the missing Archer path is worse. Neither already-displayed gain becomes verified merely because a cost table exists.

The player's in-game T10/TG6 Archer Howling Wind text remains 30% chance of 50% extra damage. An isolated expectation is +15%, but application to additional attacks and overlap with hero bonuses remain separate questions. Do not extrapolate its probability to TG5/TG7/TG8, or use a generic Volley probability as a verified TG6 value.

The [official Range page](https://kingshotwiki.com/buildings/kingshot_wiki_builddes_name_323_kingshot_end/) inspected here covers ordinary levels through 30, not the needed TG6→7 troop coefficients. A [community Range table](https://kingshotdata.kr/en/buildings/range.html) explicitly labels its Truegold tables unverified. Another community simulator publishes troop coefficients only through T10/TG5 and T11; that does not justify extrapolating TG6/TG7. No verified new Archer TG6→7 damage coefficient or efficiency is supplied in this package.

For every numeric upgrade suggestion, retain damage delta, all material costs, prerequisites and evidence status. Boots Mastery 4→5 vs helmet 11→12 is a valid hammer comparison only when both costs are known; the helmet's additional Mythic pieces remain a real cost. Separate resource paths are useful, but a hammer cannot be numerically compared to Truegold without the actual reward exchange and supported upgrade delta. Partial building progress affects remaining cost; it is not automatically a fractional troop damage coefficient.

Pet refinement is random and cannot be assigned a guaranteed next-stat delta without roll mechanics. Pet advancement can use a fixed documented delta only when the saved advancement state and stage are known. Masters' personal Bear-point bonuses are separate from shared rally damage and must not secretly change the hosting objective.

## What must still be validated in the current app

1. Integrate or reconcile these catalogue entries, preserve saved inputs, and rerun the full current profile. Recheck joining leader candidates and all active gear upgrade paths. Inherent stats being present is not sufficient when a relevant offensive proc remains unmodeled.
2. Verify no-overlap assignments, class-based formation weighting, captain permutation invariance where no position-sensitive mechanic is documented, transferable gear assignment, first-skill-only joining scope, and independent receiving rallies. The official FAQ supports captain trio skills; hero ordering must not accidentally change class weights in code.
3. Keep scope precise: the latest estimates model the captain's entered formation. That is not an observed forecast for the entire rally's actual troop composition or the user's full Hunt score. Real incoming skills and accepted troops vary. Do not solve that by adding burdensome per-rally capacity inputs.
4. Re-optimize legal teams after each upgrade. For a conditional Yang improvement, explain that it depends on Yang remaining selected. Include other resource paths only when supported, rather than filling five slots with speculative advice.
5. Run one final production regression suite and build. Older reports had full-suite failures; later focused passes do not establish that those failures were resolved. Confirm actual latest status. Perform local saved-profile reload, wizard completion/navigation, language fallback, numeric input handling and Netlify route checks without spending another production deployment.

Observed matched battle reports are the remaining way to validate unresolved timing/stacking assumptions. The existing offline report-validation script can reject mismatched troop/skill/buff contexts. No matched real-game reports were supplied here, so this review does not claim observed damage validation or a numerical personal baseline.

## Completed checks and stopping point

`reference-checks.mjs` passes 20 independent checks, covering table completeness, official endpoints, conflict withholding, progression indices, explicit zeros, slot identity, proc operation distinctions, baseline reconciliation guards and full resource vectors. They test this research package; they do not test the current app.

A first alliance release can be a useful progression advisor after these integration checks. It should offer a provisional best current team and supported upgrade paths with concise reasons. Exact predicted Bear score, universal joining superiority, precise cross-resource ROI and a player percentile remain unsupported. More styling, translations or random sensitivity sweeps will not resolve those mechanical uncertainties.

## Current-progression reference summary

These are reference lookups at the supplied snapshot progression, not a new team replay.

| Hero | Entered star step | Reference Attack | Evidence |
| --- | --- | --- | --- |
| Jabel | 31 | 200.16% | primary-max |
| Saul | 19 | 94.92% | community-star-table |
| Howard | 31 | 140.11% | primary-max |
| Gordon | 31 | 140.11% | primary-max |
| Quinn | 31 | 140.11% | primary-max |
| Diana | 31 | 110.08% | primary-max |
| Fahd | 30 | Unresolved | conflicting-unresolved |
| Forrest | 31 | 90.07% | primary-max |
| Seth | 31 | 90.07% | primary-max |
| Edwin | 31 | 90.07% | primary-max |
| Olive | 31 | 90.07% | primary-max |
| Hilde | 24 | 152.59% | community-star-table |
| Marlin | 24 | 152.59% | community-star-table |
| Eric | 21 | 156.32% | community-star-table |
| Jaeger | 23 | 175.03% | community-star-table |
| Margot | 18 | 160.27% | community-star-table |
| Thrud | 10 | 113.44% | community-star-table |
| Triton | 16 | 209.03% | community-star-table |
| Sophia | 24 | 343.33% | community-star-table |
| Chenko | 31 | 140.11% | primary-max |
