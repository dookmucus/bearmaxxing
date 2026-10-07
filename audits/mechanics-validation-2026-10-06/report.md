# Remaining-host-mechanics validation — 6 October 2026

**Keep Zoe / Petra / Yang provisionally. No new observed result supports switching.** The saved central estimate remains Yang 69.064M, Vivian 68.227M and Rosa 68.217M community-model units. These are not calibrated Bear points. This audit uses the complete preserved version-4 profile and latest handoff replay; no player values, production calculation, interface or configuration changed.

## What actually changes the comparison

One-factor checks hold each baseline case fixed before changing a mechanic. They distinguish a genuine mechanic reversal from a different baseline already favoring another hero. Compound operation merges are not evidence for one particular effect.

| Priority | Finding at entered progression | Interpretation |
| --- | --- | --- |
| High | At the central baseline, hypothetical Volley 5% gives Vivian 66.387M versus Yang 66.372M; 7.5% gives Yang 67.718M versus Vivian 67.306M. Generic 10% gives Yang a 1.226% advantage. | Confirm the exact TG6 skill and packet interaction. Neither 5% nor 7.5% is a new troop mapping. Extreme 0%/100% cases were stress cases, not likely outcomes. |
| High | Existing `trap-phase-3` gives Vivian 69.221M versus Yang 69.064M, a 0.227% advantage. | This case preloads the Archer counter so Trap fires on ordinary attacks 1/5/9. **No inspected game evidence establishes that initial preload.** Do not present it as an observed or equally likely phase. The source's fourth-versus-next-fifth wording still needs a reset/first-activation trace; the existing phase sweep is not a complete treatment of that question. |
| High | With central mechanics but lower assumed permanent stats, Rosa or Vivian can win. Example: 200pp for every class/stat gives Rosa 34.424M versus Yang 33.994M (+1.266%). | Stored unconfirmed zeros are not confirmed zero stats. The report Attack/Lethality capture is essential to anchor these comparisons; do not add permanent-stat fields or assume maximum values. |
| Medium | Golden Rhythm shared with the 102 Attack family reduces central Rosa from 68.217M to 65.532M. Yang remains first. It changes two baseline cases from Rosa to Yang. | This family choice can remove Rosa's advantage in low-baseline contexts; it does not justify switching the central recommendation **to** Rosa. Chaos Gambit's tested family does not prove Golden Rhythm's family. |
| Medium | Adding Focus and Trap extra damage rather than multiplying reduces central Vivian to 65.525M. Eight fixed-baseline winners change; central Yang remains first. | Resolving simultaneous damage stacking matters for Vivian's viability. This is separate from which debuff write wins. |
| Lower for these teams | Trap-vs-Focus **debuff precedence alone** changes central Vivian by only about 7,868 units and changes no winning team across the 29 fixed baselines. Yang's 4/8 versus 5/9 pulses and Petra's current-hit versus forward-round case also change no winning team in these isolated tests. | Do not prioritize these as though they already explain a host reversal. This is limited to the tested cases, not proof that all correlations are irrelevant. |
| Outside these three | Alcar additive-versus-separate components do not change these three host totals because Alcar is not their captain hero. | Important to the larger roster audit, but not this Archer decision. |

The common-Howling-factor algebra also narrows scope. Keeping event behavior fixed, multiplying the entire Archer contribution by the same factor between 1 and 1.5 does not reverse either Yang comparison at the central baseline. Yang/Rosa would tie only near factor 10; Yang/Vivian near 0.536. **This is not general cancellation:** Archer coefficients differ. It does not resolve correlations, selective packet applicability or counter changes.

## Observations versus assumptions

- **Observed by the player:** T10/TG6 Howling Wind text specifies Archer scope, 30% chance and +50% extra damage. This supports those numbers, not independence from Volley or hero counters.
- **Published firsthand game-testing claims:** [Rosa's analysis](https://kingshotoptimizer.com/heroes/rosa/) reports Chaos Gambit's LetUp family and describes controlled T6/non-Truegold testing. It does not expose an isolated Golden Rhythm/Charisma result. [Daryl's controlled joining test](https://kingshotguides.com/guide/joiner-hero-mechanics-no-one-told-you-about/) supports same/different tested joining families in PvP; it does not establish the requested TG6 mechanics.
- **Generic transcription:** [Range reference](https://kingshotdata.kr/en/buildings/range.html) documents Volley at the T7 unlock with a generic 10% double-attack chance. It declares partial verification. No exposed exact T10/TG6 paired report settles its applicability or interaction with Howling Wind.
- **Vivian community research:** the supplied [Gen-5 transcript handoff](https://www.youtube.com/watch?v=tamg6W2DSGA), 22:59–26:56, narrows Focus to a shared fourth-event counter including Volley, next-hit replacement, and retained Trap damage with an ordinary-Archer counter. The [related summary](https://kingshotoptimizer.com/heroes/vivian/) uses ambiguous turn wording and describes Trap as neutralized against Bear, conflicting with the detailed handoff. The video could not be retrieved here; no new raw-game trace independently confirms initial phase, fourth/next-fifth activation or simultaneous writes. The disagreement is retained rather than resolved by choosing a preferred hero.
- **Widget theory:** the handoff's [Frakinator](https://frakinator.streamlit.app/) 234.6%→259.695% example is a stat-factor fixture, not an independently inspected before/after game experiment. The live page was inaccessible. Daryl distinguishes widget stats from Expedition skill modifiers. Calculator agreement on shared research is not independent confirmation.

**Multiple same-stat rally-widget stacking is not active in these trios.** Petra supplies 5% rally Attack; Rosa supplies 7.5% rally Lethality or Yang 5%; Vivian supplies no offensive rally skill. There is only one contributing widget for each stat. A deliberately unsupported cross-stat single-pool stress calculation does not reverse Yang; treating rally widgets as mere additive percentage points *does* favor Vivian. The latter contradicts the supplied theory fixture and is diagnostic stress, not a newly supported alternative. Capture effective report stats before/after to resolve real stat layering; ordinary widget Lethality stays separate from rally skill bonuses.

An additional real limitation: the [official FAQ](https://centurygames.helpshift.com/hc/en/140-kingshot/faq/9125-combat-faq-1783436100/) includes four selected member primary skills alongside the host's nine Expedition skills. The exported hosting estimate does not include the **actual incoming** four skills. The player's three separate joining squads are not those incoming selections. Even identical incoming skills cannot generally cancel between different host skills, so no precise benchmark against ordinary rally reports is asserted yet.

## Local battle-report tool

[Validation script](../../scripts/bear-report-validation.mjs) is outside the player interface:

```sh
node scripts/bear-report-validation.mjs --init /tmp/bear-reports.json
node scripts/bear-report-validation.mjs --reports /tmp/bear-reports.json --output /tmp/bear-validation.json
```

The existing [blank template](./battle-reports.template.json) contains **expected**, not observed, progression and troop values from the full snapshot. Fill only the report observations/confirmations; missing fields are not replaced by saved defaults. Pseudonymous participant IDs are sufficient.

The tool requires matched captain, event/rules, captured progression and actual skills, transferred gear, accepted class/tier/TG troops, participants, selected joining skill order/levels, active buffs, score bonuses and metric scope. Unknown/mismatched controls produce flags and **no attributed comparison**. Effective report stats are evidence only, never added to component stats. Reused comparison blocks or duplicate report IDs cannot inflate repeated evidence.

Matched reports produce observed ratios and descriptive repeated-block summaries, not automatic winners. Conditional snapshot model ratios are supplied only for captain-scope results **without incoming selected skills**. Whole-rally damage is not benchmarked as captain-march damage. Incoming skills withhold the model ratio even when identical, while preserving a matched observational comparison. No arbitrary acceptance threshold or fitted calibration factor is used. A nearest scenario is not evidence for its assumed mechanic. Totals alone cannot identify an exact packet sequence.

No new player Bear reports were available, so actual model-vs-game accuracy is **not established**. Synthetic tests and the rejected blank template are explicitly not game observations.

## Recommendation and next Hunt

No evidence-backed reason to replace the provisional host or change the three joining squads. Keep Archer boots Mastery 4→5 and helmet +7→+8 as transferable gear improvements; Petra widget 3→4 helps all three contenders, including +2.5pp shared hosting Attack. Panther advancement remains useful **only if still incomplete**. Keep Yang shard investment conditional; do not spend further on Vivian solely to exploit a favorable assumed phase. Prefer validating before hero-specific investment. No new exact crossover or cross-resource ROI is claimed.

[Practical next-Hunt plan](./test-plan.md): repeat rotated Yang/Rosa/Vivian blocks with Zoe/Petra and the same gear/receiving conditions, capturing actual accepted troops, selected skills and buffs. Aim initially for 6–10 comparable blocks across Hunts, continuing if variation exceeds the roughly 1% difference; that number is not a statistical sufficiency guarantee. Optional proc detail can narrow mechanics, while repeated matched totals can assess net performance.

## Checks and artifacts

Eight focused offline validation/audit tests passed: missing controls, mismatches, incoming-skill noncancellation, metric scope, duplicate/reused blocks, repeated summaries, profile preservation and restored local scenario state. The sensitivity script reproduces production per-class totals before stress checks. Blank-template replay correctly yields zero matched comparisons.

Only local scripts, their tests and these audit documents were added. No production changes, build, full suite, saved-input/UI/.env/API/Git/Netlify changes, push or deployment.

- [Sensitivity JSON](./sensitivity.json), [evidence classifications](./evidence.json), [template rejection output](./template-validation.json).
- [Reproducible sensitivity script](../../scripts/audit-host-mechanics.mjs): `node scripts/audit-host-mechanics.mjs`.
- [Focused checks](../../tests/bear-report-validation.test.mjs): `node --test tests/bear-report-validation.test.mjs`.
