import {applySkillDefaults} from './hero-skill-unlocks.mjs';

export function setHeroRosterPresence(hero,present){
  return present
    ? applySkillDefaults({...hero,owned:true,included:true,marchAvailable:true,provenance:{...hero.provenance,owned:'user-confirmed',marchAvailable:'user-confirmed',included:'user-confirmed'}})
    : {...hero,included:false,marchAvailable:false,provenance:{...hero.provenance,marchAvailable:'user-confirmed',included:'user-confirmed'}};
}
