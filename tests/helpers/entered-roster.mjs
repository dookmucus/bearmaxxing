import {emptyProfile} from '../../src/profile.mjs';
import {defaultHeroes} from '../../src/data/roster.mjs';
import {defaultIncluded} from '../../src/hero-effects.mjs';

// Explicit legacy player roster for tests of existing profiles/calculations.
// Fresh-profile tests must use the real emptyProfile instead.
export function enteredRosterProfile(){
 return {...emptyProfile(),heroes:defaultHeroes().map(h=>({...h,owned:h.name!=='Amadeus',included:defaultIncluded(h.name)}))};
}
