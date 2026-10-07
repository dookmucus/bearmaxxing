import {activeGearInventory} from './active-gear.mjs';
import {normalizePetInput} from './pet-inputs.mjs';
import {applySkillDefaults} from './hero-skill-unlocks.mjs';
// Defaults describe editable inputs only. Unverified reference effects stay null.
const missing=value=>value==null||value==='';
// Keep stored values intact. Display defaults are not confirmed combat inputs.
export function combatBaselineInput(profile,troop,stat){
  const value=profile.stats?.[troop]?.[stat],path=`stats.${troop}.${stat}`;
  const source=profile.assumedInputs?.[path]??profile.stats?.[troop]?.provenance?.[stat]??profile.stats?.[troop]?.[`${stat}Source`];
  const valid=!missing(value)&&Number.isFinite(Number(value))&&Number(value)>=0;
  const confirmed=source==='user-confirmed'||source==='imported';
  const unset=!valid||Number(value)===0&&!confirmed;
  return {entered:value??null,value:unset?null:Number(value),source:!valid?'unset':Number(value)===0&&!confirmed?(source==='assumed'?'legacy-default':'unclassified-zero'):source??'saved-value',assumed:unset};
}
export function applyInputDefaults(profile) {
  const assumed={...profile.assumedInputs};
  function fill(object,key,value,path=key){
    if(missing(object[key])){object[key]=value;assumed[path]='assumed';}
  }
  for(const key of ['hostCapacity','joinCapacity','pusherCapacity','accountBaseCapacity'])fill(profile,key,0);
  for(const type of ['infantry','cavalry','archer']){
    for(const section of ['stats','effectiveStats']){
      profile[section]??={};profile[section][type]??={};
      for(const key of ['attack','lethality'])fill(profile[section][type],key,0,`${section}.${type}.${key}`);
    }
    profile.troops??={};profile.troops[type]??={};
    for(const [key,value] of [['count',0],['tier',profile.defaultTroopTier??10],['tg',0]])fill(profile.troops[type],key,value,`troops.${type}.${key}`);
  }
  for(const hero of profile.heroes??[]){
    fill(hero,'level',80,`heroes.${hero.id}.level`);
    if(missing(hero.stars)&&missing(hero.starStep)&&hero.starStepSource==='unknown'){
      fill(hero,'stars',5,`heroes.${hero.id}.stars`);
      fill(hero,'starStep',31,`heroes.${hero.id}.starStep`);
      hero.starStepSource='assumed full 5 stars';
      Object.assign(hero,applySkillDefaults(hero));
    }
  }
  for(const gear of activeGearInventory(profile))for(const key of ['enhancement','forge'])fill(gear,key,0,`gear.${gear.id}.${key}`);
  for(const master of profile.masters??[]){
    for(const [key,value] of [['affinityLevel',1],['squadBonus',0],['talentLevel',0],['specialResearchProgress',0]])fill(master,key,value,`masters.${master.id}.${key}`);
    master.skillLevels??={};for(const slot of [1,2,3,4])fill(master.skillLevels,slot,0,`masters.${master.id}.skillLevels.${slot}`);
  }
  for(const pet of profile.pets??[]){
    fill(pet,'level',0,`pets.${pet.id}.level`);
    Object.assign(pet,normalizePetInput(pet,assumed));
    pet.refinement??={};
    for(const type of ['infantry','cavalry','archer'])fill(pet.refinement,type,0,`pets.${pet.id}.refinement.${type}`);
    pet.active??=false;
  }
  for(const [index,joiner] of (profile.joiners??[]).entries())fill(joiner,'capacity',0,`joiners.${index}.capacity`);
  profile.assumedInputs=assumed;
  return profile;
}
// An absent base displayed as zero must not turn into a derived march capacity.
export function hasAccountBaseCapacity(profile){
  const value=profile.accountBaseCapacity;
  return value!=null&&value!==''&&Number.isInteger(Number(value))&&Number(value)>=0
    &&!(Number(value)===0&&profile.assumedInputs?.accountBaseCapacity==='assumed');
}
