# Adding a language

BearMaxxing bundles English, Spanish, French, German, Turkish, Korean, Simplified Chinese and Traditional Chinese. The seven non-English catalogs are generated community drafts, not official Kingshot translations; they need native-speaker terminology review. Player-facing copy is in `src/locales/en.json`; keys are flat, descriptive names scoped to the screen or explanation. Keep a key stable when its English wording changes. Developer diagnostics and technical comparison exports remain English.

1. Add a UTF-8 JSON file in `src/locales`, such as `fr.json`. Copy the relevant keys from `en.json` and translate the complete messages. A partial file is supported: missing keys fall back to English. Do not invent official game names. Keep unverified entity names in English.
2. Import the file in `src/locales/registry.mjs`, then add its entry to `languages`:

   ```js
   import fr from './fr.json' with {type:'json'};
   export const languages = {
     en: {name:'English', messages:en},
     fr: {name:'Français', messages:fr},
   };
   ```

   Use a valid language tag supported by `Intl`. The selector automatically lists registered files. The first visit chooses the first supported browser language (including regional base-language matches and Chinese script/region negotiation); otherwise it uses English. Explicit selections live in the separate `bearmaxxing:language:v1` localStorage entry. They never enter a profile. Blocked storage does not prevent using the selector. The document's `lang` changes with the selection.
3. Keep named placeholders exactly as written. For example, `results.upgrade.heroWidget` contains `{hero}`, `{current}`, and `{target}`. Translators can reorder them; interpolation treats them as plain text, never HTML. A translation that omits a required placeholder falls back to the English message. Plural messages use an object with `one`, `other`, and any additional `Intl.PluralRules` categories needed by the language.
4. Use canonical display keys for game entities: `entities.heroes.roster-petra`, `entities.pets.pet-alpha-black-panther`, `entities.masters.master-valora`, `entities.gear.set-archer-boots`, and `entities.skills.roster-petra-expedition-1`. The English reference names remain the lookup/calculation identities and fallback displays. Saved instance IDs, imported names, asset filenames and progression stay unchanged. Keep its English entry until an official localized name is verified.
5. Run `node --test tests/localization.test.mjs` and `npm run build`. Check Results, every editor, keyboard/tap tooltips, and a 375px viewport with realistic longer text. Do not register temporary expansion-test locales in production.

## Writing new copy

Use `t(key, {namedValues})` at render time for complete sentences. New placeholders should describe their values (`hero`, `currentLevel`, `targetLevel`, `percentage`, `capacity`) rather than their position. Use a complete plural message instead of appending an English suffix. Use `entity-display.mjs` for names and `formatList` for lists of localized effects/names.

`formatNumber` and `formatPercent` use the selected locale. Percentages in the calculator are percentage points: `formatPercent(25)` displays 25%, not 2,500%. Numeric placeholders followed by `%` use the same formatter. Pass raw numbers for display; avoid parsing a localized display string back into a number. Native numeric input values and select option values remain unchanged, so input parsing and saved progression keep their existing behavior.

Star notation deliberately remains `3.3` (three stars, step three), not a locale-dependent decimal such as `3,3`. Whole-star symbols remain unchanged. Hero-star recommendation placeholders use that notation; it is not a damage quantity.

Existing calculation/validation builders use `englishMessage` to return the original English message without depending on the selected language. `localizeText` adapts those catalog sentences at the presentation boundary. This keeps calculation output, English parsing rules, diagnostics and saved data independent of language. New presentation explanations should prefer a direct `t` call and raw numerical parameters over adding another English-text adapter pattern. Switching languages rerenders current Results; it does not rerun or modify the optimizer.

English is the authoritative fallback. Missing translations stay English; missing reference data stays unknown. Localization must never imply a newly verified game effect.

## Terminology review before calling translations final

All seven additional catalogs need native-speaker review. In particular, confirm the community terms for Attack versus Lethality, damage dealt versus enemy damage taken, launching versus joining a rally, troop classes, widgets (exclusive gear), Mastery, imbuement, pet refinement/advancement, and Masters/affinity. Turkish uses Saldırı / Öldürücülük; Korean uses 공격력 / 살상력; Chinese uses 攻击力 / 杀伤力 and 攻擊力 / 殺傷力 respectively. These are distinct draft labels, not a claim about the official game client. Spanish uses Ataque / Letalidad, French Attaque / Létalité, and German Angriff / Tödlichkeit.

Review full sentences with live placeholders, especially grammatical case in German/Turkish and particles in Korean. Hero, pet, Master and skill names stay in English pending verified official names. Generic gear class/slot names are translated. English remains the authoritative fallback. No external translation service or font downloads are used. Korean and Chinese receive local operating-system font fallbacks.

Run the focused localization checks whenever a catalog changes. They compare every key, plural form, placeholder occurrence and numeric literal against English, and preserve canonical entity names. The browser acceptance script in `audits/bundled-locales-2026-10-06/browser-check.mjs` checks all six pages in every bundled language at desktop and 375px mobile widths, including Results, tooltips, persisted preferences and unchanged profile data.
