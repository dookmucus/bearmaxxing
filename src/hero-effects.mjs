import {heroEffectStatuses} from './hero-effect-status.mjs';
import {heroReferenceName} from './hero-identity.mjs';
import offensive from './data/hero-offensive-effects.json' with {type:'json'};
import progression from './data/hero-progression.json' with {type:'json'};
import catalog from './data/bear-catalog.json' with {type:'json'};
import skillNames from './data/hero-skill-names.json' with {type:'json'};
import {starStageFromStars} from './star-progression.mjs';
import {effectiveSkillLevel} from './hero-skill-unlocks.mjs';
import {heroRarity} from './hero-rarity.mjs';

const key=name=>String(name??'').trim().toLocaleLowerCase();
const known=n=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))&&Number(n)>=0;
const SOURCED_STAGES={25:[0,5,10,15,20,25],30:[0,6,12,18,24,30],15:[0,3,6,9,12,15]};
export const heroProgression=name=>progression[Object.keys(progression).find(n=>key(n)===key(heroReferenceName(name)))]??null;
export const heroReference=name=>catalog.heroes.find(h=>key(h.name)===key(heroReferenceName(name)))??null;
// Widget eligibility is independent of whether its effects have been mapped.
// https://kingshotdata.kr/en/database/widgets.html
export const heroHasWidget=name=>Boolean(heroReference(name)?.widget)||heroRarity(heroReferenceName(name))==='ssr';
export const starStepForStars=starStageFromStars;
export const heroSkillName=(name,skill)=>skillNames[heroReferenceName(name)]?.[skill-1]??`Expedition skill ${skill}`;
export const defaultIncluded=name=>Boolean(heroProgression(name)&&heroReference(name)?.hostReady);
export function heroContributions(hero){
  const data=heroProgression(hero),ref=heroReference(hero);
  const hasWidget=heroHasWidget(hero),specific=offensive.heroes[heroReferenceName(hero)];
  const out={inherentAttack:null,inherentLethality:0,widgetLethality:hasWidget?null:0,widgetRallyLethality:hasWidget&&specific?.widget.kind==='sharedLethality'?null:0,sharedAttack:0,sharedLethality:0,classAttackMultiplier:0,classLethalityMultiplier:0,offenseCoverageComplete:true,uncertain:[],source:data?.source??ref?.source??null,widgetRallyAttack:specific?.widget.kind==='sharedAttack'?null:0,modeledEffects:[],irrelevantEffects:specific?.irrelevant.map(reason=>({reason,source:specific.source}))??[],assumptions:[],unresolvedOffensive:[],comparisonReady:true};
  out.referenceEvidence=data?.referenceEvidence?{...data.referenceEvidence,inherentAttack:Number(hero.starStep)===31?'primary-max':data.referenceEvidence.partial}:null;
  if(Number(hero.starStep)===31&&data?.sources?.primary)out.source=data.sources.primary;
  const unresolved=(name,reason,detail={})=>{out.unresolvedOffensive.push({name,reason,...detail});out.uncertain.push(`${name}: ${reason}`);};
  if(!data?.starAttack){out.uncertain.push('Inherent Expedition Attack progression missing');}
  else if(!known(hero.starStep)||data.starAttack[Number(hero.starStep)]==null)out.uncertain.push('Confirm exact star step for inherent Expedition Attack');
  else out.inherentAttack=data.starAttack[Number(hero.starStep)];
  if(hasWidget&&known(hero.widget)&&Number(hero.widget)===0){out.widgetLethality=0;out.widgetRallyLethality=0;out.widgetRallyAttack=0;}
  if(known(hero.widget)&&Number(hero.widget)>0){
    const level=Number(hero.widget);
    if(data?.widgetLethality?.[level]!=null)out.widgetLethality=data.widgetLethality[level];
    else out.uncertain.push('Exclusive widget Expedition stat progression missing');
    if(specific?.widget.kind==='sharedLethality'){
      if(specific?.widget.hostingValuesByWidgetLevel?.[level]!=null)out.widgetRallyLethality=specific.widget.hostingValuesByWidgetLevel[level];
      else out.uncertain.push('Exclusive widget skill stage at this level is missing');
    } else if(specific?.widget.kind==='sharedAttack'){
      if(specific.widget.hostingValuesByWidgetLevel?.[level]!=null)out.widgetRallyAttack=specific.widget.hostingValuesByWidgetLevel[level];
      else unresolved(specific.widget.name,'Hosting widget skill stage is missing',{value:null});
    } else if(hasWidget&&!specific)unresolved('Exclusive widget skill','Bear relevance and interaction need verification',{value:null});
  }
  const effects=specific?.effects??ref?.effects??[];
  if(!specific&&!ref)unresolved('Expedition skills','Offensive reference coverage is missing',{value:null});
  for(const effect of effects){
    if(effect.bearExclusion){out.irrelevantEffects.push({name:effect.name,reason:effect.bearExclusion.reason,source:effect.bearExclusion.source,evidence:effect.bearExclusion.evidence});continue;}
    const {level,conflict,unlock}=effectiveSkillLevel(hero,effect.skill);
    if(conflict){out.comparisonReady=false;unresolved(effect.name??heroSkillName(hero,effect.skill),'Entered level exceeds the unlocked cap',{value:null});out.offenseCoverageComplete=false;out.uncertain.push(`${heroSkillName(hero,effect.skill)} level ${conflict.value} exceeds unlocked maximum ${conflict.max}; excluded from calculations`);continue;}
    if(Number(level)===0&&level!==null)continue;
    if(unlock.max===null){out.comparisonReady=false;unresolved(effect.name??heroSkillName(hero,effect.skill),'Unlock at this progression is unmapped',{value:null});out.offenseCoverageComplete=false;out.uncertain.push(`${heroSkillName(hero,effect.skill)} unlock requirement is not mapped at this star progression; excluded from calculations`);continue;}
    if(Number(level)===0)continue;
    if(!Number.isInteger(Number(level))||Number(level)>5){out.uncertain.push(`Expedition skill ${effect.skill} level invalid`);continue;}
    if(effectiveSkillLevel(hero,effect.skill).source==='assumed')out.assumptions.push({name:effect.name??heroSkillName(hero,effect.skill),reason:`Skill level ${level} is assumed from the configured star threshold, not confirmed progression.`});
    const value=effect.values?.[Number(level)]??SOURCED_STAGES[effect.max]?.[Number(level)];
    if(effect.unresolved){unresolved(effect.name,effect.unresolved,{stat:effect.stat,value:value??null,level,source:specific.source});continue;}
    if(specific){
      if(value==null){unresolved(effect.name,'Skill magnitude is not mapped',{value:null});continue;}
      if(effect.stat==='sharedAttack')out.sharedAttack+=value;
      else if(effect.stat==='sharedLethality')out.sharedLethality+=value;
      else {unresolved(effect.name,'Offensive integration is unmapped',{stat:effect.stat,value});continue;}
      out.modeledEffects.push({name:effect.name,stat:effect.stat,value,source:specific.source});continue;
    }
    if(value===undefined){unresolved(heroSkillName(hero,effect.skill),'Progression or offensive interaction is missing',{value:null});continue;}
    if(effect.kind==='group101')out.sharedLethality+=value;
    else if(effect.kind==='group102')out.sharedAttack+=value;
    else if(effect.kind==='attackMultiplier')out.classAttackMultiplier+=value;
    else if(effect.kind==='lethalityMultiplier')out.classLethalityMultiplier+=value;
    else {unresolved(heroSkillName(hero,effect.skill),'Proc or interaction is not calibrated',{value});continue;}
    out.modeledEffects.push({name:heroSkillName(hero,effect.skill),stat:effect.kind,value,source:ref.source});
  }
  for(const [stat,value] of Object.entries({inherentAttack:out.inherentAttack,widgetLethality:out.widgetLethality,widgetRallyLethality:out.widgetRallyLethality,widgetRallyAttack:out.widgetRallyAttack})){
    if(value===null)unresolved(stat,'Reference value or entered progression is unavailable',{value:null});
    else if(value>0)out.modeledEffects.push({name:stat,stat,value,source:stat==='widgetLethality'?data?.sources?.progression??data?.source??out.source:stat.startsWith('widgetRally')?specific?.widget.progressionSource??out.source:out.source,evidence:stat==='inherentAttack'?out.referenceEvidence?.inherentAttack:stat==='widgetLethality'?out.referenceEvidence?.ordinaryWidget:null});
  }
  if(known(hero.attack)||known(hero.lethality))out.uncertain.push('Saved displayed hero Attack/Lethality may include gear or widgets; excluded pending review');
  if(known(hero.advancedAttack)){out.inherentAttack=Number(hero.advancedAttack);out.assumptions.push({name:'Advanced Attack override',reason:'Saved manual value replaces the reference lookup.'});out.unresolvedOffensive=out.unresolvedOffensive.filter(e=>e.name!=='inherentAttack');}
  if(known(hero.advancedLethality))out.inherentLethality=Number(hero.advancedLethality);
  // Eligibility is not numeric readiness. Missing ordinary stat/widget values
  // cannot be advertised as comparable merely because skill inputs are valid.
  out.comparisonReady=out.comparisonReady&&[out.inherentAttack,out.widgetLethality,out.widgetRallyLethality,out.widgetRallyAttack].every(value=>value!==null);
  out.offenseCoverageComplete=out.unresolvedOffensive.length===0;
  out.effectStatuses=heroEffectStatuses(hero,out,{data,ref,specific,hasWidget});
  return out;
}
export function joiningLeaderSkill(hero){
  const {level,conflict,unlock}=effectiveSkillLevel(hero,1);
  const name=heroSkillName(hero,1);
  if(conflict)return `${name}: saved level exceeds the unlocked cap; excluded`;
  if(unlock.max===null)return `The app has no verified ${name} unlock limit for ${hero.name} at entered star progression ${hero.starStep??"unknown"}. This joining effect is excluded.`;
  if(level===0)return unlock.max===0?`${name}: Locked`:`${name}: level 0; no Bear effect`;
  const effect=heroReference(hero)?.effects?.find(item=>item.skill===1);
  const value=effect?SOURCED_STAGES[effect.max]?.[level]:null;
  if(heroReferenceName(hero)!=='Vivian'&&value!=null&&['group101','group102'].includes(effect.kind))return `${name} level ${level}: ${effect.kind==='group101'?'Lethality':'Attack'} +${value}% if selected by the rally`;
  const mapped=offensive.heroes[heroReferenceName(hero)]?.effects.find(e=>e.skill===1);
  if(mapped?.stat==='damageTaken')return `${name} level ${level}: enemy damage taken +${mapped.values[level]}% if selected; stacking is unverified`;
  return `${name} level ${level}: Bear effect not quantified`;
}
export const progressionCoverage=()=>Object.keys(progression);
