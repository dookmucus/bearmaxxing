import {heroRarity} from './hero-rarity.mjs';
import {heroReferenceName} from './hero-identity.mjs';
import {starStageParts} from './star-progression.mjs';
import {progressionInteger} from './hero-progression-inputs.mjs';

// Presentation order only; never changes saved roster order or combat scores.
const rarityOrder={ssr:3,sr:2,r:1,unknown:0};
export function orderHeroes(heroes){
 const rarity=h=>rarityOrder[heroRarity(heroReferenceName(h))]??0;
 const stars=h=>starStageParts(h.starStep)?.step??-1;
 const level=h=>progressionInteger(h.level,0,80)??-1;
 return [...heroes].sort((a,b)=>rarity(b)-rarity(a)||stars(b)-stars(a)||level(b)-level(a));
}
