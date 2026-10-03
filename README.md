# BearMaxxing

A lightweight Kingshot Bear Hunt planning app built with React, Vite, JSON reference data, and one optional Netlify Function. No database, player authentication, analytics, or automatic storage.

## Start locally

Requires Node 22.12 or newer (Node 22 LTS recommended).

```sh
npm install
npm run dev
```

Open the address printed in the terminal. The app starts with an empty inventory and the requested alliance preset: one hosting march, three joining marches, 10/10/80, and Amane / Yeonwoo / Chenko joining leaders. The example ID is 100111478; no real account data is bundled.

Click **Try an example** to explore fictional data. Download and load a JSON profile to keep your inputs. Refreshing clears the session.

`BearMaxxing-preview.html` is a standalone offline preview you can open directly in a browser. Manual planning works; player API import requires the deployed app or local Netlify runtime. Regenerate the preview after changing source with `npm run build` then `npm run package:preview`.

## Connect your existing GitHub repo

Copy the contents of this project into your BearMaxxing folder. If your clone already contains `.git`, preserve it. Do not copy node_modules or dist. If you have not cloned the empty repo, you can initialize Git in this folder and use the exact URL GitHub supplies:

```sh
git init
git add .
git commit -m "Build initial BearMaxxing planner"
git branch -M main
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

If the remote already has a README or other commits, clone it first and copy the project into that clone; do not force-push.

## Netlify deployment

Import the GitHub repo into Netlify. The supplied netlify.toml sets:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node: 22

No database or login configuration is needed. Manual planning works without API setup.

### Player lookup

1. Visit https://api.mightpulse.com/ and obtain a provider API key using their Discord flow. Verify their access conditions and your permitted usage.
2. Set `MIGHTPULSE_API_KEY` in Netlify environment variables, available to Functions, then redeploy.
3. Open My account and import a numeric Kingshot player ID.

Do not prefix the key with VITE_, commit it, or put it in browser code. The function uses a fixed upstream URL, validates ID input, times out after 20 seconds, avoids response caching, and requests a per-IP/domain limit of 10 requests per minute. Confirm Netlify accepted the rate limit in deployment logs. Provider limits are separate; this does not guarantee protection from aggregate traffic exhausting a provider quota.

The live unauthenticated request for ID 100111478 returned HTTP 401 / missing_api_key on October 3, 2026. An authenticated account import has **not** been tested. The adapter is based on the published provider schema and covered by fixture tests.

The provider documents an Arena-defense team snapshot, equipped hero gear, widget levels, public governor gear, and basic profile. This version imports basic profile, Arena heroes, and standard hero gear. Governor gear remains part of your manually entered combat baseline; widget data is recorded on imported heroes but its effects are not automatically modeled. Troops, full hero/gear collections, research, pets, and resources must be entered manually. Imported heroes with unknown troop types need confirmation. API import does not auto-select heroes with missing offensive stats.

For local API testing:

```sh
cp .env.example .env
# Put the key in .env, then:
npx netlify-cli dev
```

Use the Netlify address, not the plain Vite address. `.env` is ignored by Git. Plain `npm run dev` supports manual input and profile files but does not execute Netlify Functions.

## Working features

- Exact integer troop targets across one optional hosting and up to six joining marches.
- Inventory-constrained allocation with hosting-first priority; never duplicates troops.
- Training shortfalls for every troop type at a configurable ratio and capacity.
- Joining-leader reservations and duplicate-leader warnings.
- Host candidates chosen within troop type using user-provided offensive contributions.
- Gear treated as a transferable collection, selecting one compatible piece per slot by its entered Expedition Lethality.
- Upgrade scenarios ranked by relative offensive benefit, with resource-specific efficiency figures.
- Explicit JSON export/import, session-only inputs, responsive interface, and source/model notes.

## Important model boundaries

This is an initial planning tool, **not a validated Kingshot damage simulator**. Exact troop allocation is independent of the exploratory combat model.

Hosting comparisons use:

```
index = sum across troop types:
  sqrt(troop count) * entered troop coefficient
  * (1 + (baseline Attack + hero Attack) / 100)
  * (1 + (baseline Lethality + hero Lethality + selected gear Lethality) / 100)
  * entered hero expected skill multiplier
```

A hero's effects apply only to their matching troop type in this approximation. Cross-squad and widget effects, randomized turns, joining skill selection/stacking, mixed troop tiers, and hidden mechanics are not simulated. The index is not an absolute Bear score. Hero stars, levels, gear quality, enhancement, forging, troop tier, and Truegold are recorded but do not magically produce offensive stats; enter their actual stat effects. Default troop coefficients of 1 are placeholders, not game values.

The baseline must exclude hero and hero-gear bonuses that are entered separately. Do not paste a full battle-report total and then add those contributions again. Active pet effects can be entered in the baseline; do not assume they always apply.

The suggested ratio maximizes this simplified unconstrained square-root model using the entered coefficients. It is exploratory, ignores inventory limits, and does not replace alliance instructions. Actual allocation still respects inventory.

Upgrade figures compare independent stat or capacity increments at full target capacity. A capacity upgrade may not help until the troops exist. Different resource efficiencies must not be directly compared (forge hammers are not research materials). City unlock paths, automatic hero skill catalogs, gear stat/cost tables, pet progression, and a comprehensive ranked progression route are the next development work, not completed features.

## Validation

```sh
npm test
npm run build
```

Tests cover allocation, inventory exhaustion, reserved heroes, stat-based gear selection, unknown hero handling, partial import/deduplication, independent upgrade calculations, malformed profiles, and API error paths.

## Project structure

- `src/main.jsx` — interface
- `src/styles.css` — responsive styles
- `src/engine.mjs` — planning and relative comparison functions
- `src/profile.mjs` — profile factory, fictional demo, API adapter
- `src/data/catalog.json` — versioned community references and initial joiner metadata
- `netlify/functions/player.mjs` — server-only API proxy
- `tests/planner.test.mjs` — focused engine/import/function tests
- `scripts/preview.mjs` — standalone preview builder

## References

https://api.mightpulse.com/
https://kingshotguides.com/guide/how-your-bear-damage-is-calculated-as-a-joiner/
https://kingshotguides.com/guide/bear-trap-damage-mechanics-and-example-simulation/
https://kingshotguide.org/calculator/bear-trap-calculator
https://docs.netlify.com/build/functions/api/

No third-party game art is bundled. The bear icon is an original SVG. BearMaxxing is an independent community project, not affiliated with Kingshot or Century Games.
