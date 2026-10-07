import {heroSkillDisplayName,masterSkillDisplayName} from './entity-display.mjs';
import {t as tr,formatNumber,formatPercent,localizeText} from './i18n.mjs';
import {heroContributions,heroProgression} from './hero-effects.mjs';
import {heroReferenceName} from './hero-identity.mjs';
import offensive from './data/hero-offensive-effects.json' with {type:'json'};
import {starStageLabel} from './star-progression.mjs';
import {effectiveSkillLevel} from './hero-skill-unlocks.mjs';
import {gearProgression,gearSlotEffect,gearLevelLabel,normalizeGearQuality} from './gear-progression.mjs';
import {masterInputDetails,masterResearchDetails} from './master-effects.mjs';
import {petLevelEffect,petActiveEffect} from './pet-effects.mjs';
import {petOwned,petMilestones} from './pet-inputs.mjs';

const fmt=n=>Number(Number(n).toFixed(2));
const classes={infantry:'Infantry',cavalry:'Cavalry',archer:'Archer'};
const statLabel=(stat,h)=>({sharedAttack:tr("player.guidance.page.shared.attack"),sharedLethality:tr("player.guidance.page.shared.lethality"),group102:tr("player.guidance.page.shared.attack"),group101:tr("player.guidance.page.shared.lethality"),attackMultiplier:tr("player.guidance.page.attack", {bonus: classes[h.troop]}),lethalityMultiplier:tr("player.guidance.page.lethality", {bonus: classes[h.troop]}),classAttack:tr("player.guidance.page.attack", {bonus: classes[h.troop]}),extraDamage:tr("player.guidance.page.extra.damage"),damageOverTime:tr("player.guidance.page.damage.over.time"),damageTaken:tr("player.guidance.page.enemy.damage.taken"),damageDealt:tr("player.guidance.page.damage.dealt"),extraStrike:tr("player.guidance.page.extra.strike.damage"),'Inherent Attack':tr("player.guidance.page.attack", {bonus: classes[h.troop]}),'Widget Lethality':tr("player.guidance.page.lethality", {bonus: classes[h.troop]}),inherentAttack:tr("player.guidance.page.attack", {bonus: classes[h.troop]}),widgetLethality:tr("player.guidance.page.lethality", {bonus: classes[h.troop]})})[stat]??stat;

// Copy only: selection and all coverage statuses remain calculator-owned.
export function heroPlanGuidance(hero,results){
 const c=heroContributions(hero),entry=results.hosting.team?.find(e=>e.hero.id===hero.id);
 const march=results.hosting.joint?.canRecommend===false?null:results.joining.plan?.marches.find(m=>m.heroes?.some(h=>h?.id===hero.id));
 if(entry)return tr("player.guidance.heroPlanGuidance.recommended.for.hosting", {bonus: c.offenseCoverageComplete?'':tr("player.guidance.heroPlanGuidance.provisional")});
 if(march?.joinIndex!=null)return march.heroes[0]?.id===hero.id?tr("player.guidance.heroPlanGuidance.recommended.as.a.joining.leader"):tr("results.join.classCompletionDetails");
 const rival=results.hosting.team?.find(e=>e.hero.troop===hero.troop);
 const option=results.hosting.joint?.comparison?.options?.find(o=>o.team.some(e=>e.hero.id===hero.id)&&o.team.every(e=>e.hero.troop===hero.troop||results.hosting.team?.some(h=>h.hero.id===e.hero.id)));
 if(rival&&option?.bear?.modeledDamage!=null&&results.hosting.joint?.selected?.host?.bear.modeledDamage>option.bear.modeledDamage&&c.offenseCoverageComplete&&rival.contribution.offenseCoverageComplete&&results.hosting.coverageComplete&&option.coverageComplete)return tr("player.guidance.heroPlanGuidance.lower.priority.for.hosting.than.at.your.entered.levels", {hero: rival.hero.name});
 return tr("player.guidance.heroPlanGuidance.bear.offense.recommendation.provisional");
}
function effectCopy(h,s){
 if(['irrelevant','not_equipped','not_upgraded'].includes(s.status))return '';
 if(s.status==='locked'){
  const r=s.requirement,target=r?.widgetLevel!=null?tr("player.guidance.effectCopy.widget.level", {widgetLevel: r.widgetLevel}):r?.starStep!=null?starStageLabel(r.starStep):r?.skillLevel!=null?tr("player.guidance.effectCopy.skill.level", {skillLevel: r.skillLevel}):null;
  return target?tr("player.guidance.effectCopy.unlocks.at", {hero: s.slot?heroSkillDisplayName(h,s.slot,s.name):s.name, target: target}):'';
 }
 if(s.status==='invalid_input')return tr("player.guidance.effectCopy.choose.a.skill.level.within.its.unlocked.limit", {hero: s.slot?heroSkillDisplayName(h,s.slot,s.name):s.name});
 if(s.value>0){
  const effect=offensive.heroes[heroReferenceName(h)]?.effects.find(e=>e.skill===s.slot);
  if(['replacementHitTotalDamage','extraAttackTotalDamage'].includes(s.stat))return tr(s.stat==='replacementHitTotalDamage'?'player.guidance.replacementHit':'player.guidance.extraAttack',{skill:heroSkillDisplayName(h,s.slot,s.name),chance:formatNumber(100*effect.chance),total:formatNumber(s.value),troop:tr(`troops.${h.troop}`)})+(s.assumed?` ${tr('player.guidance.effectCopy.skill.level.assumed.from.stars')}`:'');
  if(s.stat==='skillDamage')return ''; // Packet eligibility is unresolved; retain the provisional relevance indicator.
  const conditional=effect?.chance!=null?tr("player.guidance.effectCopy.chance", {percentage: fmt(effect.chance*100)}):effect?.everyTurns?tr("player.guidance.effectCopy.every.turns", {everyTurns: effect.everyTurns}):effect?.everyAttacks?tr("player.guidance.effectCopy.every.attacks", {everyAttacks: effect.everyAttacks}):'';
  return tr("player.guidance.effectCopy.message", {hero: s.slot?heroSkillDisplayName(h,s.slot,s.name):s.name, percentage: fmt(s.value), bonus: statLabel(s.stat,h), conditional: conditional, level: s.assumed?tr("player.guidance.effectCopy.skill.level.assumed.from.stars"):''});
 }
 return '';
}
export function heroFieldGuidance(h,field,results){
 if(field==='widget'&&h.widget!=null&&h.widget!==''&&Number(h.widget)===0)return '';
 const c=heroContributions(h),march=results.joining.plan?.marches.find(m=>m.joinIndex!=null&&m.heroes?.some(hero=>hero?.id===h.id));
 const leader=march?.heroes[0]?.id===h.id;
 const statuses=c.effectStatuses.filter(s=>field==='stars'?s.id==='inherentAttack':field==='skills'?s.id.startsWith('skill-')&&(!leader||s.slot===1):s.id.startsWith('widget'));
 const lines=statuses.map(s=>effectCopy(h,s)).filter(Boolean);
 const pending=statuses.some(s=>['missing_mapping','missing_input','unresolved_mechanics'].includes(s.status));
 if(!lines.length&&!pending)return '';
 let next='';
 const data=heroProgression(h),current=Number(field==='stars'?h.starStep:h.widget);
 if(field==='stars'&&data?.starAttack?.[current]!=null&&data.starAttack[current+1]>data.starAttack[current])next=tr("player.guidance.heroFieldGuidance.next.percentage.points.of.attack", {starProgression: starStageLabel(current+1), current2: fmt(data.starAttack[current+1]-data.starAttack[current]), bonus: classes[h.troop]});
 if(field==='widget'){
  const stages=offensive.heroes[heroReferenceName(h)]?.widget.hostingValuesByWidgetLevel;
  const target=stages?.findIndex((value,i)=>i>current&&value>stages[current]);
  if(target>0)next=tr("player.guidance.heroFieldGuidance.next.rally.bonus.widget.shared", {target: target, target2: fmt(stages[target]), sharedAttack: offensive.heroes[heroReferenceName(h)].widget.kind==='sharedAttack'?'Attack':'Lethality'});
  else if(data?.widgetLethality?.[current]!=null&&data.widgetLethality[current+1]>data.widgetLethality[current])next=tr("player.guidance.heroFieldGuidance.next.widget.percentage.points.of.lethality", {current: current+1, current2: fmt(data.widgetLethality[current+1]-data.widgetLethality[current]), bonus: classes[h.troop]});
 }
 if(field==='skills'){
  const records=offensive.heroes[heroReferenceName(h)]?.effects??[];
  const step=records.find(e=>statuses.some(s=>s.slot===e.skill&&s.level>0&&s.level<effectiveSkillLevel(h,e.skill).unlock.max&&e.values?.[s.level+1]>e.values[s.level]));
  const status=step&&statuses.find(s=>s.slot===step.skill);
  if(step&&status)next=tr("player.guidance.heroFieldGuidance.next.level", {hero: heroSkillDisplayName(h,step.skill,step.name), level: status.level+1, level2: fmt(step.values[status.level+1]), bonus: statLabel(step.stat,h), bonus2: step.chance!=null?tr("player.guidance.heroFieldGuidance.when.triggered"):''});
 }
 const lockedOnly=statuses.every(s=>['locked','irrelevant','not_upgraded'].includes(s.status));
 const relevance=lockedOnly?tr("player.guidance.heroFieldGuidance.no.offensive.contribution.from.these.skills.at.the.entered"):!lines.length?tr("player.guidance.heroFieldGuidance.provisional.bear.priority.is.not.established"):march&&(field!=='skills'||!leader)?tr("player.guidance.heroFieldGuidance.lower.priority.for.this.joining.role.these.bonuses.help"):heroPlanGuidance(h,results);
 return [relevance,lines.length?`${lines.join('; ')}.`:'',next].filter(Boolean).join(' ');
}

export function gearFieldGuidance(g,field,improvements=[]){
 const slot=gearSlotEffect(g),effect=gearProgression(g);
 if(!slot||!effect)return tr("player.guidance.gearFieldGuidance.provisional.review.this.piece.s.entered.type.and.progression");
 const offensive=slot.ordinary==='lethality',label=classes[g.troop],quality=normalizeGearQuality(g.quality);
 const recommendation=improvements.some(i=>i.gearId===g.id&&i.id.endsWith(field==='mastery'?'-forge':'-enhance'))?tr("player.guidance.gearFieldGuidance.recommended"):tr("player.guidance.gearFieldGuidance.bear.offense");
 const gains=[offensive?tr("player.guidance.gearFieldGuidance.lethality", {percentage: fmt(effect.lethality), label: label}):null,effect.attack>0?tr("player.guidance.gearFieldGuidance.attack", {percentage: fmt(effect.attack), label: label}):null].filter(Boolean);
 if(field==='mastery')return offensive?tr("player.guidance.gearFieldGuidance.message", {recommendation: recommendation, bonus: gains[0], bonus2: quality!=='purple'&&Number(g.forge)<20?tr("player.guidance.gearFieldGuidance.next.mastery.adds.percentage.points", {bonus: fmt(effect.ordinary*0.1)}):''}):tr("player.guidance.gearFieldGuidance.no.offensive.contribution.mastery.increases.health.only");
 const next=Object.entries(slot.attackMilestones).find(([level])=>Number(level)>Number(g.enhancement));
 const milestone=next?tr("player.guidance.gearFieldGuidance.bear.attack.milestone.legendary.attack.after.imbuement", {bonus: gearLevelLabel('red',Number(next[0])), percentage: next[1], label: label}):'';
 const pending=effect.effectStatuses.some(s=>s.status==='unresolved_mechanics');
 const confirmation=effect.effectStatuses.some(s=>s.status==='missing_input')?tr("player.guidance.gearFieldGuidance.confirm.completed.imbuement.to.include.its.attack.bonus"):'';
 return [gains.length?tr("player.guidance.gearFieldGuidance.message.2", {recommendation: recommendation, bonus: pending?tr("player.guidance.gearFieldGuidance.provisional"):'', bonus2: gains.join('; ')}):tr("player.guidance.gearFieldGuidance.no.offensive.contribution.at.this.level"),confirmation,milestone].filter(Boolean).join(' ');
}

export function masterFieldGuidance(m,skill=null){
 if(!skill){
  const d=masterInputDetails(m);
  return d.affinityValue>0?tr("player.guidance.masterFieldGuidance.bear.offense.shared.from.affinity", {percentage: fmt(d.affinityValue), bonus: d.affinityKind==='attack'?'Attack':'Lethality'}):tr("player.guidance.masterFieldGuidance.provisional.enter.the.displayed.attack.or.lethality.bonus");
 }
 const names={attack:tr("player.guidance.masterFieldGuidance.shared.attack"),lethality:tr("player.guidance.masterFieldGuidance.shared.lethality"),rally:tr("player.guidance.masterFieldGuidance.total.hosted.rally.capacity"),deployment:tr("player.guidance.masterFieldGuidance.personal.march.capacity")};
 if(skill.value===null)return tr("player.guidance.masterFieldGuidance.provisional.upgrade.priority.is.not.established");
 const capacity=['rally','deployment'].includes(skill.kind);
 if(skill.value>0){
  const target=Number(skill.level)+1,next=masterInputDetails({...m,skillLevels:{...m.skillLevels,[skill.slot]:target}}).skills.find(s=>s.slot===skill.slot);
  const milestone=next?.value>skill.value?tr("player.guidance.masterFieldGuidance.next.skill", {target: target, bonus: fmt(next.value-skill.value), capacity: capacity?tr("player.guidance.masterFieldGuidance.troops"):tr("player.guidance.masterFieldGuidance.percentage.points")}):'';
  return tr("player.guidance.masterFieldGuidance.message", {capacity: capacity?tr("player.guidance.masterFieldGuidance.capacity.only"):tr("player.guidance.masterFieldGuidance.bear.offense"), skill: masterSkillDisplayName(m,skill.slot,skill.name), bonus: fmt(skill.value), capacity2: capacity?tr("player.guidance.masterFieldGuidance.troops"):'%', bonus2: names[skill.kind]??'bonus', milestone: milestone});
 }
 return skill.presentation.unlockAffinity!=null?tr("player.guidance.masterFieldGuidance.unlocks.at.affinity", {skill: masterSkillDisplayName(m,skill.slot,skill.name), unlockAffinity: skill.presentation.unlockAffinity}):'';
}
export function masterResearchGuidance(m){
 const r=masterResearchDetails(m);
 return r.value>0?tr("player.guidance.masterResearchGuidance.bear.offense.research.adds.shared.provisional", {percentage: fmt(r.value), bonus: r.kind==='attack'?'Attack':'Lethality'}):tr("player.guidance.masterResearchGuidance.provisional.research.upgrade.priority.is.not.established");
}
export function petGuidance(pet,improvements=[]){
 if(!petOwned(pet))return tr("player.guidance.petGuidance.not.owned", {pet: pet.name});
 const effect=petLevelEffect(pet),active=petActiveEffect(pet),recommended=improvements.some(i=>i.id===`${pet.id}-passive`);
 const statements=[active?.value>0?tr("player.guidance.petGuidance.message", {hero: active.name, bonus: fmt(active.value), capacity: ['capacity','rallyCapacity'].includes(active.kind)?' troops '+(active.kind==='capacity'?tr("player.guidance.petGuidance.personal.march.capacity"):tr("player.guidance.petGuidance.total.rally.capacity")):'% '+(active.kind==='attack'?tr("player.guidance.petGuidance.hosting.attack"):tr("player.guidance.petGuidance.hosting.lethality"))}):null].filter(Boolean);
 const next=petMilestones(pet.name).find(level=>level>=Number(pet.level));
 return [`${pet.name}. ${effect.attack===null&&!statements.length?tr("player.guidance.petGuidance.provisional.upgrade.priority.is.not.established"):recommended?tr("player.guidance.petGuidance.recommended"):tr("player.guidance.petGuidance.bear.offense")}.`,statements.length?`${statements.join('; ')}.`:'',next?tr("player.guidance.petGuidance.next.advancement.level", {next: next}):''].filter(Boolean).join(' ');
}
