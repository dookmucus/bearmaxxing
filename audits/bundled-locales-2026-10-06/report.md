# Bundled language acceptance — October 6, 2026

BearMaxxing now bundles English, Español, Français, Deutsch, Türkçe, 한국어, 简体中文 and 繁體中文. Each catalog contains the same 741 keys, including labels, navigation, tooltips, validation, wizard steps, and generated team/upgrade explanations. Hero, pet, Master and skill proper names remain English pending verified official names. Generic class/slot gear names are translated.

The existing native-name header dropdown updates the interface and current Results immediately, remembers explicit selection in the separate language storage entry, and updates document language/title/description. Chinese negotiation distinguishes Simplified and Traditional scripts, with explicit script taking priority over region. Local Korean and Chinese font fallbacks require no font downloads. The dropdown was widened slightly to fit native language names; all other layouts and styling remain intact.

No translation service, API, backend, account or dependency was added. Numeric calculations, parsing, stored progression, API routes, environment and Netlify configuration were not changed. Star progression remains `3.3`, and localized percentages/counts use Intl at presentation only. Calculation output and developer diagnostics remain English. No push or deployment.

## Checks

- Focused localization checks: 11 passed, including exact catalog keys, plural forms, placeholder occurrences and numeric literals; malformed/missing translation fallback; regional/script negotiation; blocked storage; persistence and document language; localized numbers; canonical proper names; raw English calculation messages and ambiguous star-step prevention.
- Three existing Results-copy checks passed for alternatives, rally capacity and upgrade effects/targets. No full legacy suite.
- Browser acceptance: eight languages × desktop 1440px and mobile 375px × all six pages. No horizontal page overflow or browser exceptions. Current host and five improvements remain present; changing language does not restart the calculator worker. Profile progression remains identical through language changes, navigation and reload. Preference survives reload. Hosting tooltips open by keyboard on desktop and tap on mobile, fit the viewport and close with Escape.
- Visual review covered longer German/Turkish Results, Korean mobile, Traditional Chinese desktop, and mobile Heroes/Masters/Pets. A previously uncatalogued plural “Archers” label was corrected and checked in every language. Numeric form input representations remain unchanged intentionally.
- Production build passed under Node v22.23.3. Vite retains its non-fatal large-chunk warning: the bundled catalogs and inline calculation worker produce a 1.63 MB entry (~427 KB gzip). No large dependency was introduced.

Browser checks use the existing complete incoming-hosting audit profile in isolated browser storage, because the actual player browser session is not accessible. They never replace the player's saved profile. See `browser-checks.json`, screenshots, `focused-tests.log`, `localization-tests.log`, and `build.log` in this directory.

## Translation review

All seven non-English catalogs are generated community drafts, not official Kingshot translations. Native speakers should review Attack/Lethality, damage dealt/enemy damage taken, rally launching/joining, widget/exclusive gear, Mastery/imbuement, pet refinement/advancement, Masters/affinity, and grammatical agreement around dynamic names and values. These concepts have distinct catalog terms; no effect family is merged in calculation or copy generation. The guide at `docs/localization.md` describes registration, fallback, placeholders and the terminology review scope.

No functional release blocker was found. Native-speaker terminology review remains outstanding before describing these catalogs as reviewed game translations.
