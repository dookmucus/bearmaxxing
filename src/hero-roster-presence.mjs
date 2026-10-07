import {defaultHeroes} from './data/roster.mjs';
import {heroReferenceName,heroAvailableInPlanner} from './hero-identity.mjs';
import {applySkillDefaults} from './hero-skill-unlocks.mjs';

export function setHeroRosterPresence(hero,present){
  return present
    ? applySkillDefaults({...hero,owned:true,included:true,marchAvailable:true,provenance:{...hero.provenance,owned:'user-confirmed',marchAvailable:'user-confirmed',included:'user-confirmed'}})
    : {...hero,included:false,marchAvailable:false,provenance:{...hero.provenance,marchAvailable:'user-confirmed',included:'user-confirmed'}};
}

// Catalogue options are never copied into player data until explicitly added.
export function heroCatalogueOptions(profile){
 const present=new Set(profile.heroes.map(heroReferenceName));
 return [...profile.heroes,...defaultHeroes().filter(h=>!present.has(heroReferenceName(h)))].filter(heroAvailableInPlanner);
}
export function setProfileHeroPresence(profile,id,present){
 const existing=profile.heroes.find(h=>h.id===id);
 const hero=existing??heroCatalogueOptions(profile).find(h=>h.id===id);
 if(!hero||present&&!heroAvailableInPlanner(hero)||!existing&&!present)return profile;
 return {...profile,heroes:existing?profile.heroes.map(h=>h.id===id?setHeroRosterPresence(h,present):h):[...profile.heroes,setHeroRosterPresence(hero,true)]};
}
