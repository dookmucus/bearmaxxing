import {entityName} from './i18n.mjs';
import {canonicalHeroId,heroReferenceName} from './hero-identity.mjs';
import {canonicalPetId} from './pet-identity.mjs';
// Display identity is independent of saved instance IDs and entered progression.
export const heroDisplayName=hero=>entityName('heroes',hero.canonicalHeroId??canonicalHeroId(heroReferenceName(hero)),hero.name);
export const petDisplayName=pet=>entityName('pets',canonicalPetId(pet),pet.name);
export const canonicalMasterId=master=>master.canonicalMasterId??`master-${master.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;
export const masterDisplayName=master=>entityName('masters',canonicalMasterId(master),master.name);
export const heroSkillDisplayName=(hero,slot,name)=>entityName('skills',`${canonicalHeroId(heroReferenceName(hero))}-expedition-${slot}`,name);
export const masterSkillDisplayName=(master,slot,name)=>entityName('skills',`${canonicalMasterId(master)}-skill-${slot}`,name);
