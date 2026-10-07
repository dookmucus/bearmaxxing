import {heroReferenceName} from './hero-identity.mjs';
import skillNames from './data/hero-skill-names.json' with {type:'json'};
import catalog from './data/bear-catalog.json' with {type:'json'};
import {starStageParts} from './star-progression.mjs';

// Each entry identifies the Expedition skills on that hero's sourced page.
// Those pages show five levels per named skill. The exact intermediate
// sixth-step unlocks are not published there, so only the full 5★ stage is
// recorded for these skills. Do not interpolate missing steps.
const FULL_STAR_SKILLS={
  Amane:2,Yeonwoo:2,Chenko:2,Amadeus:3,Helga:3,
  'Long Fei':3,Zoe:3,Vivian:3,Petra:3,Rosa:3,Yang:3,Diego:3,Liz:3,Luna:3
};
const heroPage=name=>`https://kingshotdata.com/heroes/${name.toLowerCase().replaceAll(' ','-')}/`;
const fullStarUnlocks=Object.fromEntries(Object.entries(FULL_STAR_SKILLS).map(([name,count])=>[
  name,Object.fromEntries(Array.from({length:count},(_,index)=>[index+1,{limits:{31:5},source:heroPage(name)}]))
]));
// Reviewed primary pages document the named five-level Expedition slots.
// They establish the full-star endpoint, not intermediate sixth-step unlocks.
const reviewedFullStarUnlocks=Object.fromEntries(catalog.heroes.filter(h=>h.reviewedSkillSource).map(h=>[
  h.name,Object.fromEntries((skillNames[h.name]??[]).map((_,index)=>[index+1,{limits:{31:5},source:h.reviewedSkillSource}]))
]));
// The joiner guide additionally gives the full-star first-skill caps for
// these three heroes. It does not locate unlocks within a star's six steps.
const FIRST_SKILL_SOURCE='https://kingshothandbook.com/guides/joiner-rules-guide';
const FIRST_SKILL_LIMITS={7:2,13:3,19:4,25:5,31:5};
export const SKILL_UNLOCKS={
  ...fullStarUnlocks,
  ...reviewedFullStarUnlocks,
  ...Object.fromEntries(['Chenko','Amane','Yeonwoo'].map(name=>[name,{
    ...fullStarUnlocks[name],1:{limits:FIRST_SKILL_LIMITS,source:FIRST_SKILL_SOURCE}
  }]))
};
export const isMissingSkillValue=value=>value===null||value===undefined||value===''||typeof value==='string'&&value.trim().toLowerCase()==='unknown';
// User-provided planning rule; not a sourced per-hero unlock table.
export function starSkillLimit(starStep){
  const stage=starStageParts(starStep);
  return stage?.stars>=4?5:stage?.stars>=3?4:null;
}
export function skillUnlock(name,slot,starStep){
  const record=SKILL_UNLOCKS[heroReferenceName(name)]?.[slot];
  const stage=starStageParts(starStep);
  const assumedMax=starSkillLimit(starStep);
  const planning=()=>assumedMax!==null?{max:assumedMax,reason:null,source:null,assumption:'User-provided star threshold'}:null;
  if(!record&&planning())return planning();
  if(!record)return {max:null,reason:'Per-skill unlock requirements are not verified.',source:null};
  if(!stage)return {max:null,reason:'Exact star progression is needed to check this skill unlock.',source:record.source};
  const checkpoints=Object.keys(record.limits).map(Number).sort((a,b)=>a-b);
  const previous=checkpoints.filter(step=>step<stage.step).at(-1);
  const following=checkpoints.find(step=>step>stage.step);
  // An intermediate cap is known only when both surrounding checkpoints
  // agree. Otherwise an unlock might occur inside that star's six steps.
  const max=record.limits[stage.step]??(previous!=null&&following!=null&&record.limits[previous]===record.limits[following]?record.limits[previous]:null);
  return max==null&&planning()?planning():max==null
    ? {max:null,reason:'Unlock limit at this star progression is not verified.',source:record.source}
    : {max,reason:null,source:record.source};
}
export function effectiveSkillLevel(hero,slot){
  const unlock=skillUnlock(hero,slot,hero.starStep);
  const saved=hero.skillLevels?.[slot];
  const source=hero.skillLevelSource?.[slot];
  // Explicit zero cannot exceed any unlock cap. Keep it even when the cap
  // table is missing; otherwise a confirmed unused skill becomes unknown.
  if(source!=='assumed'&&!isMissingSkillValue(saved)&&Number(saved)===0)return {level:0,source:source??'saved-unclassified',unlock};
  if(unlock.max===null)return {level:null,source,unlock};
  if(source==='assumed'||isMissingSkillValue(saved))return {level:unlock.max,source:'assumed',unlock};
  const level=Number(saved);
  if(!Number.isInteger(level)||level<0||level>unlock.max)return {level:null,source,unlock,conflict:{value:level,max:unlock.max}};
  return {level,source:source??'saved-unclassified',unlock};
}
export function skillConflict(hero,slot){return effectiveSkillLevel(hero,slot).conflict??null;}
export function heroSkillSlots(hero){
  const name=heroReferenceName(hero);
  return [...new Set([...Object.keys(SKILL_UNLOCKS[name]??{}).map(Number),...Array.from({length:skillNames[name]?.length??0},(_,i)=>i+1),...(catalog.heroes.find(h=>h.name===name)?.effects??[]).map(e=>e.skill),...Object.keys(hero.skillLevels??{}).map(Number)])].filter(n=>Number.isInteger(n)&&n>=1&&n<=3).sort((a,b)=>a-b);
}
export function applySkillDefaults(hero,starStep=hero.starStep){
  const skillLevels={...hero.skillLevels};
  const skillLevelSource={...hero.skillLevelSource};
  for(const slot of heroSkillSlots(hero)){
    const value=skillLevels[slot],source=skillLevelSource[slot];
    if(!isMissingSkillValue(value)&&source!=='assumed')continue;
    const max=skillUnlock(hero,slot,starStep).max;
    if(max===null){
      if(source==='assumed'){skillLevels[slot]=null;delete skillLevelSource[slot];}
      continue;
    }
    skillLevels[slot]=max;
    skillLevelSource[slot]='assumed';
  }
  return {...hero,skillLevels,skillLevelSource};
}
