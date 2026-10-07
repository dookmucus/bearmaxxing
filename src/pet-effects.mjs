import {petOwned,petMilestones} from './pet-inputs.mjs';
import levels from './data/pet-levels.json' with {type:'json'};
import catalog from './data/bear-catalog.json' with {type:'json'};

export const PET_ACTIVE_NAMES={
  'Giant Rhino':'Wild Charge','Alpha Black Panther':'Deadly Bite',
  'Mighty Bison':'Fearless Roar','Great Moose':'Antler Impact'
};
export const PET_ACTIVE_CATALOG=catalog.pets.filter(p=>Object.hasOwn(PET_ACTIVE_NAMES,p.name));
export const PET_MAX_LEVEL=Object.fromEntries(Object.entries(levels.pets).map(([name,entry])=>[name,Math.max(...Object.keys(entry.attackByLevel).map(Number))]));
const valid=n=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))&&Number(n)>=0;
export function petHasBearContribution(pet){
  return Boolean(levels.pets[pet.name]?.attackByLevel)
    ||PET_ACTIVE_CATALOG.some(effect=>effect.name===pet.name)
    ||['infantry','cavalry','archer'].some(troop=>valid(pet.refinement?.[troop])&&Number(pet.refinement[troop])>0);
}

export function petLevelEffect(pet){
  if(Number(pet.level)===0&&pet.level!=null)return {attack:0,rank:0,checkpoint:false,issue:null};
  const level=Number(pet.level),entry=levels.pets[pet.name];
  if(!valid(pet.level)||!Number.isInteger(level)||level<1||!entry?.attackByLevel[level])return {attack:null,rank:null,issue:valid(pet.level)?`${pet.name} level ${pet.level} has no verified passive lookup`:null};
  const values=entry.attackByLevel[level];
  const checkpoint=values.length===2;
  const advanced=pet.advancementConfirmed===true;
  const attack=values[checkpoint&&advanced?1:0];
  const milestones=petMilestones(pet.name);
  const rank=milestones.filter(m=>m<level).length+(checkpoint&&advanced?1:0);
  return {attack,rank,checkpoint,issue:null,source:entry.source};
}

export function petActiveEffect(pet){
  const ref=PET_ACTIVE_CATALOG.find(p=>p.name===pet.name);
  if(!ref)return null;
  const passive=petLevelEffect(pet),rank=passive.rank;
  return {name:PET_ACTIVE_NAMES[pet.name],kind:ref.kind,rank,value:rank>0?ref.stages[rank-1]??null:null,issue:passive.issue};
}

export function petRefinementEffect(profile){
  const totals={infantry:0,cavalry:0,archer:0};
  const mode=profile.petRefinementMode==='combined'?'combined':'per-pet';
  if(mode==='combined'&&(profile.pets??[]).some(pet=>!petOwned(pet)))return totals;
  if(mode==='combined')for(const troop of Object.keys(totals)){
    if(valid(profile.combinedPetRefinement?.[troop]))totals[troop]=Number(profile.combinedPetRefinement[troop]);
  }
  else for(const pet of (profile.pets??[]).filter(petOwned))for(const troop of Object.keys(totals)){
    if(valid(pet.refinement?.[troop]))totals[troop]+=Number(pet.refinement[troop]);
  }
  return totals;
}

// Keep the legacy total as the sole source until the player confirms all rolls.
export function replaceCombinedRefinement(profile){
  return {...profile,petRefinementMode:'per-pet',petRefinementSource:'user-confirmed per-pet'};
}

// Temporary combat stats are host-only. Deployment capacity belongs to each
// player's march; rally capacity belongs to the rally they host.
export const PET_BUFF_SCOPE={attack:'hosting',lethality:'hosting',capacity:'deployment',rallyCapacity:'hosting-rally'};
export function petBuffDetails(profile){
  return (profile.pets??[]).flatMap(pet=>{
    const effect=petActiveEffect(pet);
    if(!effect||!petOwned(pet))return [];
    const unlocked=effect.value!==null;
    const included=unlocked;
    const reason=!unlocked?(effect.issue??'Locked: requires level 10 and completed advancement'):null;
    return [{...effect,petId:pet.id,petName:pet.name,level:pet.level,scope:PET_BUFF_SCOPE[effect.kind],included,reason}];
  });
}
export function petBuffEffects(profile,scope='hosting'){
  const out={attack:0,lethality:0,deploy:0,rally:0,unsupported:[]};
  for(const effect of petBuffDetails(profile)){
    if(!effect.included){
      if(effect.issue)out.unsupported.push(`${effect.name}: ${effect.issue}`);
      continue;
    }
    if(effect.kind==='capacity')out.deploy+=effect.value;
    else if(scope==='hosting'&&effect.kind==='attack')out.attack+=effect.value;
    else if(scope==='hosting'&&effect.kind==='lethality')out.lethality+=effect.value;
    else if(scope==='hosting'&&effect.kind==='rallyCapacity')out.rally+=effect.value;
  }
  return out;
}
export function petBuffDescription(effect){
  const label={attack:'Squad Attack',lethality:'Squad Lethality',capacity:'personal deployment capacity',rallyCapacity:'hosting rally capacity'}[effect.kind];
  const value=effect.value===null?effect.reason:`+${effect.value.toLocaleString('en-US',{maximumFractionDigits:2})}${['capacity','rallyCapacity'].includes(effect.kind)?' troops':'%'} ${label}`;
  return `${effect.name}: ${value}${['attack','lethality'].includes(effect.kind)?' for your hosting rally only':''}${effect.value!==null&&effect.reason?` (${effect.reason})`:''}`;
}
