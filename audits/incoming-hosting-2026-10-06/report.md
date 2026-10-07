# Incoming joining skills: saved-profile replay

Zoe / Petra / Yang remains the one provisional hosting recommendation. It leads across all eight incoming contexts at the central baseline and timing assumptions. The closest central competitor is Zoe / Petra / Vivian (1.226% behind Yang); Rosa remains explicitly compared (7.197% Yang advantage). These are estimates, not observed Bear damage or attendance probabilities.

## What changed

Four **selected** primary skills from other players enter the hosting attack calculation. Same-family contributions add; distinct families multiply. Chenko/Yeonwoo share family 101; Amane uses 102. Vivian's enemy-damage-taken family stays separate; her duplicate/replacement overlap is explicitly unverified. Only primary skills enter: incoming inherent stats, other skills and widgets do not. Your own three outgoing joining squads never become incoming host effects. No saved values, UI layout, configuration or exclusions were changed.

Central incoming mix: Chenko, Yeonwoo, Amane, Amane, each skill level 5. This representative mix contains the alliance's usual three leaders plus another supported Attack skill; it is a documented mixed-family scenario, not a claim about actual participation. Level 4 and uneven-family cases use documented magnitudes. The selected-skill list is distinct from offered leaders; no claim is made that every offered leader contributes.

| Selected incoming context | Zoe/Petra/Yang | Zoe/Petra/Rosa | Zoe/Petra/Vivian |
|---|---:|---:|---:|
| 2 Lethality + 2 Attack (central) | 145.033 | 135.297 | 143.276 |
| 3 Lethality + 1 Attack | 145.033 | 133.023 | 143.276 |
| 1 Lethality + 3 Attack | 138.127 | 131.886 | 136.454 |
| 4 Lethality | 138.127 | 125.064 | 136.454 |
| 4 Attack | 124.314 | 122.790 | 122.808 |
| 2 Lethality + 2 Attack, level 4 | 127.629 | 120.062 | 126.083 |
| 2 Lethality + 1 Attack + Vivian; additive overlap assumption | 155.393 | 144.961 | 147.751 |
| Same Vivian mix; strongest-only overlap assumption | 155.393 | 144.961 | 124.713 |

Values are millions of community-model captain-march damage units, with identical entered formation and transferable gear. They are not aggregate damage from all rally participants.

## This correction versus other unresolved mechanics

With incoming skills disabled as an explicit audit control, the same progression gives Yang 69.064M, Rosa 68.217M and Vivian 68.227M. The central incoming mix multiplies Yang and Vivian by 2.100 and Rosa by 1.9833. Rosa's Chaos family already contributes expected 20% to family 101; adding 50% incoming Lethality increases that factor from 1.20 to 1.70, not 1.20 × 1.50. Zoe's 25% family-102 Attack similarly combines with incoming Attack. Thus common incoming leaders cannot simply be cancelled from comparisons. Yang's lead over Rosa increases from 1.241% to 7.197%; Yang/Vivian's central relative gap is unchanged in this particular mix, as a calculated result rather than a blanket cancellation rule.

Incoming mix changes alone do not reverse the central winner. Crossed finite permanent-stat assumptions, Volley applicability, Vivian counters and proc/stacking hypotheses still produce reversals. The 8352 crossed cases are sensitivity checks, never probabilities. In particular, Rosa's Golden Rhythm family, Vivian's counter starting phase/Trap and weaker damage-taken replacement, Petra/Zoe damage-taken overlap, Alcar's offensive stacking and widget layering remain distinct from this correction. Incoming Vivian overlap is additionally unresolved; additive versus strongest-only is a stress bracket, not proof that those are the only possible activation behaviors. No new game observation resolved those mechanics.

## Simultaneous joining squads

1. **Chenko / Alcar / Diana** — 25% Lethality when its primary skill is selected in its receiving rally. The other two heroes complete classes; equivalent-capacity fillers are interchangeable.
2. **Amane / Eric / Edwin** — 25% Attack when its primary skill is selected in its receiving rally. The other two heroes complete classes; equivalent-capacity fillers are interchangeable.
3. **Vivian / Forrest / Gordon** — 25% enemy damage taken when its primary skill is selected in its receiving rally. The other two heroes complete classes; equivalent-capacity fillers are interchangeable.

These enter three separate rallies. They do not supply the hosting incoming contexts and their bonuses are never pooled. Entered maximum march size already contains personal capacity; no extra filler capacity is added.

## Next improvements

- **Archer boots: Mastery 4 → 5** — Adds 5 percentage points of Archer Lethality. Estimated central hosting gain 0.458%. Transferable gear/account upgrade or separate joining contribution.
- **Archer helmet: Level +7 → +8** — Adds 1.05 percentage points of Archer Lethality. Estimated central hosting gain 0.096%. Transferable gear/account upgrade or separate joining contribution.
- **Petra: Widget 3 → 4** — Adds 7.00 percentage points of widget Lethality and 2.5 percentage points of shared hosting Attack. Estimated central hosting gain 2.487%. Hero-specific; depends on the selected hosting role.
- **Yang: Stars 3.3 → 3.4** — Adds 17.42 percentage points of inherent Attack while Yang hosts; conditional. Estimated central hosting gain 1.291%. Hero-specific; depends on the selected hosting role. Keep conditional: incoming mixes alone support Yang, but unresolved host mechanics still can change the choice.
- **Alpha Black Panther: advance at level 60** — Adds 1.76 percentage points of passive Attack. Estimated central hosting gain 0.266%. Transferable gear/account upgrade or separate joining contribution. Only if the entered level-60 advancement has not already been completed; its confirmation remains absent.

The five actions remain useful across the central incoming contexts; per-context re-optimized gains are exported in JSON. Gear transfers with the class and does not depend on investing in Yang. Petra's widget adds both class-local Cavalry Lethality and shared hosting Attack. Hero investment remains conditional on role/mechanics, not a new proven crossover. Resource paths remain distinct: boots Mastery uses forge hammers; helmet enhancement uses XP/materials; widgets, hero shards and pet advancement have separate materials. No cross-resource ROI is claimed. Archer boots 4→5 still beats helmet Mastery 11→12 on verified gain per hammer; the latter additionally needs Mythic gear.

## Evidence and limitations

- [Official Combat FAQ](https://centurygames.helpshift.com/hc/en/140-kingshot/faq/9125-combat-faq-1783436100/) establishes captain skills plus four selected member primary skills, not operation IDs or exact proc interactions.
- [Daryl's controlled account tests](https://kingshotguides.com/guide/joiner-hero-mechanics-no-one-told-you-about/) support additive 101/102 families and multiplicative distinct families. Published tests are PvP; applying those families to Bear remains a stated transfer assumption.
- [Chenko](https://kingshotdata.com/heroes/chenko/), [Amane](https://kingshotdata.com/heroes/amane/) and [Yeonwoo](https://kingshotdata.com/heroes/yeonwoo/) document primary-skill progression 5/10/15/20/25%.
- [Vivian analysis](https://kingshotoptimizer.com/heroes/vivian/) documents Crouching Tiger's 5/10/15/20/25% progression and rare-family behavior versus Attack/Lethality. It does not resolve duplicate Vivian or overlap with other damage-taken skills. This is community research; shared-source agreement is not independent confirmation.

## Reproduction and preservation

Run `node audits/incoming-hosting-2026-10-06/replay.mjs`. Read [replay.json](./replay.json) for exact profile, selected contexts, gains and sensitivity. Profile SHA-256: `d842a33ccd4da8ae1b5a4d01fa796942fe131c47797188c3eb05297e6895bf53`, identical to the prior complete profile. Existing unconfirmed zero permanent-stat defaults remain unset assumptions; explicit confirmed zeros remain preserved. Derived skill defaults and explicit progression are retained. The original downloaded file is no longer present; this replay uses its preserved complete profile from the latest handoff artifact, not maximum progression.

The offline battle-report validator now replays recorded supported incoming skills separately for each host; unmapped primary skills withhold model ratios. Effective report stats are never added to the component model. Whole-rally scores remain outside captain-march validation.

Focused checks and one Node v22.23.3 production build are recorded in checks.json. No push, deployment, policy/network writes, .env, API or Netlify changes.
