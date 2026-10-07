import {HERO_ROSTER,canonicalHeroId,heroReferenceName,heroAvailableInPlanner} from './hero-identity.mjs';
import {heroRarity} from './hero-rarity.mjs';

const common=HERO_ROSTER.filter(([name])=>heroAvailableInPlanner(name)&&['r','sr'].includes(heroRarity(name)));
export function optionalFillerPool(profile){
 const entered=new Set(profile.heroes.map(heroReferenceName));
 // An existing record, including an explicitly unavailable one, is never
 // replaced by a catalogue suggestion. Suggestions have no progression.
 return common.filter(([name])=>!entered.has(name)).map(([name,troop])=>({
  id:canonicalHeroId(name),canonicalHeroId:canonicalHeroId(name),name,troop,
  owned:false,optionalFiller:true,level:null,starStep:null,widget:null
 }));
}
