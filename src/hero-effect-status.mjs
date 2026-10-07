import {heroReferenceName} from './hero-identity.mjs';
import offensive from './data/hero-offensive-effects.json' with {type:'json'};
import names from './data/hero-skill-names.json' with {type:'json'};
import {effectiveSkillLevel,heroSkillSlots,SKILL_UNLOCKS} from './hero-skill-unlocks.mjs';

// Presentation/diagnostics metadata only. Never changes contributions or comparison eligibility.
export function heroEffectStatuses(hero,coverage,{data,ref,specific,hasWidget}){
 const canonical=heroReferenceName(hero),statuses=[];
 const push=(id,name,status,details={})=>statuses.push({id,name,status,comparison:'included',...details});
 for(const slot of heroSkillSlots(hero)){
  const name=names[canonical]?.[slot-1]??`Expedition skill ${slot}`,id=`skill-${slot}`;
  const effective=effectiveSkillLevel(hero,slot),effect=(specific?.effects??ref?.effects??[]).find(e=>e.skill===slot);
  const irrelevant=(specific?.irrelevantDetails??offensive.irrelevantSkillDetails?.[canonical])?.find(e=>e.name===name);
  const base={slot,level:effective.level,enteredLevel:hero.skillLevels?.[slot]??null,assumed:effective.source==='assumed',source:specific?.source??ref?.source??null};
  if(effect?.bearExclusion){push(id,name,'irrelevant',{...base,appliesTo:'targets other than Bear in cited testing',source:effect.bearExclusion.source,evidence:effect.bearExclusion.evidence,comparison:'excluded'});continue;}
  if(irrelevant){push(id,name,'irrelevant',{...base,appliesTo:irrelevant.appliesTo,source:irrelevant.source??base.source,comparison:'excluded'});continue;}
  if(effective.conflict){push(id,name,'invalid_input',{...base,conflict:effective.conflict,comparison:effect?'prevents':'excluded'});continue;}
  if(effective.level===0&&effective.unlock.max!==0){push(id,name,'not_upgraded',{...base,comparison:'excluded'});continue;}
  if(effective.unlock.max===null){push(id,name,'missing_mapping',{...base,stat:'skill unlock limit',progression:'stars',comparison:effect?'prevents':'excluded'});continue;}
  if(effective.unlock.max===0){push(id,name,'locked',{...base,requirement:SKILL_UNLOCKS[canonical]?.[slot]?.unlockAt??null,comparison:'excluded'});continue;}
  if(effective.level===0){push(id,name,'not_upgraded',{...base,comparison:'excluded'});continue;}
  const modeled=coverage.modeledEffects.find(e=>e.name===name);
  if(modeled){push(id,name,'modeled',{...base,stat:modeled.stat,value:modeled.value});continue;}
  const unresolved=coverage.unresolvedOffensive.find(e=>e.name===name);
  if(unresolved?.value!=null){push(id,name,'unresolved_mechanics',{...base,stat:effect?.stat??effect?.kind,value:unresolved.value,mechanics:effect?.unresolvedMechanics??['proc or interaction contribution to Bear damage'],comparison:'excluded'});continue;}
  push(id,name,'missing_mapping',{...base,stat:'skill effect',comparison:'excluded'});
 }
 const fields=[['inherentAttack','Inherent Attack','stars',hero.starStep],...(hasWidget?[
  ['widgetLethality','Widget Lethality','widget level',hero.widget],
  ['widgetRallyLethality',specific?.widget.kind==='sharedLethality'?specific.widget.name:'Widget shared Lethality','widget level',hero.widget],
  ['widgetRallyAttack',specific?.widget.kind==='sharedAttack'?specific.widget.name:'Widget shared Attack','widget level',hero.widget]
 ]:[])];
 for(const [id,name,progression,level] of fields){
  const value=coverage[id],stat=id==='widgetRallyAttack'?'shared Attack':id==='widgetRallyLethality'?'shared Lethality':name;
  if(progression==='widget level'&&Number(hero.widget)===0&&hero.widget!=null&&hero.widget!==''){push(id,name,'not_equipped',{level,value,comparison:'excluded'});continue;}
  if(value===null){push(id,name,level==null||level===''?'missing_input':'missing_mapping',{stat,progression,level,comparison:'prevents'});continue;}
  const requirement=specific?.widget.bonusUnlock;
  if(value===0&&requirement&&((id==='widgetRallyAttack'&&specific.widget.kind==='sharedAttack')||(id==='widgetRallyLethality'&&specific.widget.kind==='sharedLethality'))&&Number(level)<requirement.widgetLevel){push(id,name,'locked',{stat,level,requirement,comparison:'excluded'});continue;}
  push(id,name,'modeled',{stat,level,value,source:id.startsWith('widgetRally')?specific?.widget.progressionSource??specific?.source:data?.source??ref?.source??null});
 }
 if(hasWidget&&Number(hero.widget)>0){
  if(specific?.widget.kind==='irrelevant')push('widgetSkill',specific.widget.name,'irrelevant',{appliesTo:specific.widget.appliesTo,comparison:'excluded'});
  else if(!specific)push('widgetSkill','Widget skill','missing_mapping',{stat:'widget skill effect',level:hero.widget,progression:'widget level',comparison:'excluded'});
 }
 return statuses;
}
