import {heroReferenceName} from './hero-identity.mjs';
import {effectiveSkillLevel,skillUnlock,starSkillLimit} from './hero-skill-unlocks.mjs';
import {heroReference,heroSkillName,heroContributions} from './hero-effects.mjs';
import skillNames from './data/hero-skill-names.json' with {type:'json'};

export function expeditionSlots(name,hero){
  return [...new Set([...(heroReference(hero??name)?.effects??[]).map(effect=>effect.skill),...Array.from({length:skillNames[heroReferenceName(hero??name)]?.length??0},(_,i)=>i+1),...Object.keys(hero?.skillLevels??{}).map(Number)])].filter(Number.isInteger).sort((a,b)=>a-b);
}
export function commonSkillValue(hero){
  const slots=expeditionSlots(hero.name,hero);
  if(!slots.length){
    const max=starSkillLimit(hero.starStep),saved=hero.commonSkillLevel;
    if(saved!=null&&max!=null&&saved>max)return 'custom';
    return String(saved??max??'unmapped');
  }
  const effective=slots.map(slot=>effectiveSkillLevel(hero,slot));
  if(effective.some(item=>item.conflict))return 'custom';
  if(effective.some(item=>item.unlock.max===null)){
    // Unknown unlock formulas must not hide the user's editable saved entry.
    // Effective contributions still remain unknown until the unlock is mapped.
    const entered=slots.map(slot=>hero.skillLevels?.[slot]);
    if(slots.every(slot=>hero.skillLevelSource?.[slot]!=='assumed')&&entered.every(value=>value!=null&&value!==''&&Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<=5)&&entered.every(value=>Number(value)===Number(entered[0])))return String(Number(entered[0]));
    return 'unmapped';
  }
  const values=effective.map(item=>item.level);
  if(values.every(value=>value===0)&&effective.every(item=>item.unlock.max===0))return 'locked';
  if(values.every(value=>value===values[0]))return String(values[0]);
  return effective.every(item=>item.source==='assumed')?'auto':'custom';
}
export function setCommonSkillLevel(hero,requested){
  if(!Number.isInteger(requested)||requested<0||requested>5)return hero;
  const skillLevels={...hero.skillLevels},skillLevelSource={...hero.skillLevelSource};
  for(const slot of expeditionSlots(hero.name,hero)){
    const max=skillUnlock(hero,slot,hero.starStep).max;
    skillLevels[slot]=max==null?requested:Math.min(requested,max);
    skillLevelSource[slot]='user-confirmed';
  }
  const max=starSkillLimit(hero.starStep);
  return {...hero,skillLevels,skillLevelSource,commonSkillLevel:max==null?requested:Math.min(requested,max)};
}
export function commonSkillInfo(hero,detail){
  const slots=expeditionSlots(hero.name,hero);
  if(!slots.length)return `The app has no verified skill effect values for ${hero.name} at the entered progression. Skill effects are excluded from comparison.`;
  const coverage=heroContributions(hero);
  const lines=slots.filter(slot=>!['irrelevant','not_upgraded'].includes(coverage.effectStatuses.find(e=>e.id===`skill-${slot}`)?.status)).map(slot=>{
    const name=heroSkillName(hero,slot),item=effectiveSkillLevel(hero,slot);
    const status=item.conflict?`saved level ${item.conflict.value} exceeds cap ${item.conflict.max}; excluded`:item.unlock.max===null?`${hero.skillLevels?.[slot]!=null&&hero.skillLevelSource?.[slot]!=='assumed'?`entered level ${hero.skillLevels[slot]}; `:''}the app has no verified unlock limit at the entered stars; excluded`:item.unlock.max===0?'Locked':`level ${item.level}${item.source==='assumed'?' (assumed)':''}`;
    const explanation=detail(hero,slot);
    return explanation||`${name}: ${status}.`;
  });
  return lines.join(' ');
}
