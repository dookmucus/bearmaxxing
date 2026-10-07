import {petOwned,petAdvancementStage} from './pet-inputs.mjs';
import levels from './data/pet-levels.json' with {type:'json'};
import catalog from './data/bear-catalog.json' with {type:'json'};

export const PET_ACTIVE_NAMES={
  'Giant Rhino':'Wild Charge','Alpha Black Panther':'Deadly Bite',
  'Mighty Bison':'Fearless Roar','Great Moose':'Antler Impact'
};
export const petCollectsProgression=pet=>Object.hasOwn(PET_ACTIVE_NAMES,pet.name);
export const PET_ACTIVE_CATALOG=catalog.pets.filter(p=>Object.hasOwn(PET_ACTIVE_NAMES,p.name));
export const PET_MAX_LEVEL=Object.fromEntries(Object.entries(levels.pets).map(([name,entry])=>[name,Math.max(...Object.keys(entry.attackByLevel).map(Number))]));
const valid=n=>n!==null&&n!==undefined&&n!==''&&typeof n!=='boolean'&&Number.isFinite(Number(n))&&Number(n)>=0;
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
  const {checkpoint,rank}=petAdvancementStage(pet);
  const attack=values[0];
  return {attack,rank,checkpoint,issue:null,source:entry.source};
}

export function petActiveEffect(pet){
  const ref=PET_ACTIVE_CATALOG.find(p=>p.name===pet.name);
  if(!ref)return null;
  const passive=petLevelEffect(pet),rank=passive.rank;
  return {name:PET_ACTIVE_NAMES[pet.name],kind:ref.kind,rank,value:rank>0?ref.stages[rank-1]??null:null,issue:passive.issue};
}

// Migrate before editable defaults are filled. Existing totals (including zero)
// always win, regardless of the archived entry mode or individual ownership.
export function normalizeCombinedPetStats(profile){
 const totals={...profile.combinedPetRefinement},sources={...profile.combinedPetRefinementSources};
 for(const stat of ['attack','infantry','cavalry','archer']){
  if((totals[stat]!=null&&totals[stat]!=='')||(profile.petStatsVersion===1&&Object.hasOwn(totals,stat))){
   sources[stat]??={source:profile.petRefinementSource??'saved combined total'};
   continue;
  }
  const contributions=(profile.pets??[]).filter(petOwned).map(pet=>{
   const effect=stat==='attack'?petLevelEffect(pet):null;
   const raw=stat==='attack'?effect.attack:pet.refinement?.[stat];
   const absent=raw==null||raw==='';
   return {petId:pet.id,value:stat==='attack'?raw:absent?0:valid(raw)?Number(raw):null,
    source:stat==='attack'?effect.source??'unknown passive lookup':profile.assumedInputs?.[`pets.${pet.id}.refinement.${stat}`]??pet.provenance?.refinement??(absent?'assumed zero':'saved refinement'),
    levelSource:pet.levelSource??'saved',advancementSource:'derived from level'};
  });
  totals[stat]=contributions.some(c=>c.value===null)?null:Number(contributions.reduce((sum,c)=>sum+c.value,0).toFixed(10));
  sources[stat]={source:totals[stat]===null?'unknown saved contribution':contributions.length?'derived from saved pet calculations':'assumed zero',contributions};
 }
 return {...profile,petStatsVersion:1,combinedPetRefinement:totals,combinedPetRefinementSources:sources};
}
export function combinedPetStats(profile){
 const totals=normalizeCombinedPetStats(profile).combinedPetRefinement;
 return Object.fromEntries(['attack','infantry','cavalry','archer'].map(stat=>[stat,valid(totals[stat])?Number(totals[stat]):null]));
}
export function petRefinementEffect(profile){
 const {attack,...totals}=combinedPetStats(profile);return totals;
}
export function setCombinedPetStat(profile,stat,value){
 const next=normalizeCombinedPetStats(profile);
 return {...next,combinedPetRefinement:{...next.combinedPetRefinement,[stat]:value},combinedPetRefinementSources:{...next.combinedPetRefinementSources,[stat]:{source:'user-confirmed'}}};
}
export function petUpgradeProfile(profile,pet,candidate){
 if(!petCollectsProgression(pet))return null;
 const before=petLevelEffect(pet),after=petLevelEffect(candidate),stats=combinedPetStats(profile);
 if(stats.attack===null||before.attack===null||after.attack===null)return null;
 const delta=Number((after.attack-before.attack).toFixed(10)),next=normalizeCombinedPetStats(profile);
 return {...next,pets:profile.pets.map(p=>p.id===pet.id?candidate:p),combinedPetRefinement:{...next.combinedPetRefinement,attack:Number((stats.attack+delta).toFixed(10))},combinedPetRefinementSources:{...next.combinedPetRefinementSources,attack:{source:'documented upgrade delta',delta,previous:next.combinedPetRefinementSources.attack,reference:after.source}}};
}

// A checkpoint advancement is a documented next action, not a saved input or
// an extra level. Keep its isolated delta separate from level-derived totals.
export function petAdvancementUpgrade(pet){
 const before=petLevelEffect(pet);
 if(!petCollectsProgression(pet)||!before.checkpoint||before.attack===null)return null;
 const attack=levels.pets[pet.name].attackByLevel[Number(pet.level)][1];
 const ref=PET_ACTIVE_CATALOG.find(p=>p.name===pet.name);
 const activeBefore=petActiveEffect(pet),activeAfter=ref.stages[before.rank]??null;
 return {attackDelta:Number((attack-before.attack).toFixed(10)),activeKind:ref.kind,
  activeDelta:activeAfter===null?null:activeAfter-(activeBefore.value??0)};
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
