import {comparisonProfile} from './inventory-planning.mjs';
import {withHostingReuse} from './hosting-reuse.mjs';
import {englishMessage} from './english-messages.mjs';
import {heroProgression,heroContributions} from './hero-effects.mjs';
import {petLevelEffect,PET_MAX_LEVEL,petCollectsProgression,petUpgradeProfile,petAdvancementUpgrade} from './pet-effects.mjs';
import {gearProgression,gearSlotEffect} from './gear-progression.mjs';
import {heroReferenceName} from './hero-identity.mjs';
import {starStageLabel} from './star-progression.mjs';
import {replacementImprovements} from './replacement-improvements.mjs';
import {evaluateUpgrade,compareUpgradeBenefits} from './upgrade-model.mjs';
import {applySkillDefaults,effectiveSkillLevel} from './hero-skill-unlocks.mjs';
import {masterInputDetails,masterEffects} from './master-effects.mjs';
import {roleEligible} from './hero-roles.mjs';
import {bearTroop} from './bear-troops.mjs';
import {gearCostEfficiency} from './gear-upgrade-costs.mjs';

// Benefits are modeled-effect changes, never a cross-resource return or damage forecast.
export function actionableImprovements(profile,results,accountFor,options={}){
 profile=comparisonProfile(profile);
 return withHostingReuse(profile,accountFor(profile),results.hosting.joint?.comparison?.options,()=>calculateImprovements(profile,results,accountFor,options));
}
function calculateImprovements(profile,results,accountFor,{audit=[]}={}){
 const groups=new Map();
 const baselineJoint=results.hosting.joint;
 const add=(item,changed=null)=>{
  if(changed){const comparison=evaluateUpgrade(profile,changed,accountFor,baselineJoint);audit.push({id:item.id,resource:item.resource,target:item.target,modelComparison:comparison,status:comparison?'supported gain':'no supported gain or incomplete comparison'});if(!comparison)return;item={...item,modelComparison:comparison,measuredBenefit:null};item.resourceEfficiency=gearCostEfficiency(item);}
  if(!groups.has(item.resource))groups.set(item.resource,[]);groups.get(item.resource).push(item);
 };
 const replacements=replacementImprovements(profile,results,accountFor,{audit});
 for(const step of results.upgrades.gearSteps??[]){
  const piece=profile.gear.find(g=>g.id===step.gearId);
  const before=piece&&gearProgression(piece),after=step.targetProgression&&gearProgression(step.targetProgression);
  if(!piece||!gearSlotEffect(piece)||!before||!after||after.uncertain.length||!(after.attack>before.attack||after.lethality>before.lethality))continue;
  const isForge=step.id.endsWith('-forge');
  const changed={...profile,gear:profile.gear.map(g=>g.id===piece.id?step.targetProgression:g)};
  add({...step,reason:step.benefit.replace('experimental offense-factor gain','scoped factor gain; plan re-optimized'),resource:isForge?'Forge hammers':step.cost.includes('Mithril')?'Mithril and Mythic Gear':'Enhancement materials',target:step.title.split(' → ')[1],editor:'Gear',measuredBenefit:null},changed);
 }
 for(const hero of profile.heroes.filter(roleEligible)){
  const data=heroProgression(hero),c=heroContributions(hero);audit.push({id:hero.id,kind:'hero-eligibility',starStep:hero.starStep,widget:hero.widget,comparisonReady:c.comparisonReady,inherentAttack:c.inherentAttack,widgetLethality:c.widgetLethality,limitations:c.uncertain});
  for(const kind of ['stars','widget']){
   const current=Number(kind==='stars'?hero.starStep:hero.widget),target=current+1;
   const table=kind==='stars'?data?.starAttack:data?.widgetLethality;
   const currentKnown=kind==='stars'?table?.[current]!=null:hero.widget!=null&&hero.widget!==''&&c.widgetLethality!==null;
   if(!Number.isInteger(current)||current<1&&kind==='stars'||!currentKnown||table?.[target]==null)continue;
   const nextHero=kind==='stars'?applySkillDefaults({...hero,starStep:target}):{...hero,widget:target};
   const next=heroContributions(nextHero);
   if(!next.comparisonReady||next.widgetRallyAttack===null||next.widgetRallyLethality===null)continue;
   const field=kind==='stars'?'inherentAttack':'widgetLethality',delta=next[field]-c[field];
   if(!(delta>0||next.widgetRallyAttack>c.widgetRallyAttack||next.widgetRallyLethality>c.widgetRallyLethality))continue;
   const changed={...profile,heroes:profile.heroes.map(h=>h.id===hero.id?nextHero:h)};
   add({id:`${hero.id}-${kind}`,title:`${hero.name}: ${kind==='stars'?englishMessage("messages.results.improvements.actionableImprovements.next.star.step"):englishMessage("messages.results.improvements.actionableImprovements.next.widget.level")}`,reason:englishMessage("messages.results.improvements.actionableImprovements.percentage.points.this.measures.mapped.effects.only.unresolved.skills.are",{detail:kind==='stars'?englishMessage("messages.results.improvements.actionableImprovements.inherent.attack"):englishMessage("messages.results.improvements.actionableImprovements.widget.lethality"),field:c[field],field2:next[field],detail2:delta.toFixed(2)}),widgetGains:kind==='widget'?{rallyAttack:next.widgetRallyAttack-c.widgetRallyAttack,rallyLethality:next.widgetRallyLethality-c.widgetRallyLethality}:null,resource:kind==='stars'?'Hero shards':'Widget materials',cost:englishMessage("messages.results.improvements.actionableImprovements.exact.material.cost.not.verified"),target:kind==='stars'?starStageLabel(target):englishMessage("messages.results.improvements.actionableImprovements.widget.level",{target:target}),editor:'Heroes',measuredBenefit:null},changed);
  }
 }
 for(const pet of profile.pets??[]){
  if(!petCollectsProgression(pet)||!(Number(pet.level)>0))continue;
  const before=petLevelEffect(pet);
  const advancement=petAdvancementUpgrade(pet);
  if(advancement){
   const item={id:`${pet.id}-passive`,petStatDelta:advancement.attackDelta,petActiveDelta:advancement.activeDelta,petActiveKind:advancement.activeKind,title:`${pet.name}: ${englishMessage("messages.results.improvements.actionableImprovements.complete.advancement")}`,reason:englishMessage('pets.upgradeDelta',{delta:advancement.attackDelta}),resource:'Pet advancement materials',cost:englishMessage("messages.results.improvements.actionableImprovements.exact.material.cost.not.verified"),target:englishMessage("messages.results.improvements.actionableImprovements.level.advanced",{level:pet.level}),editor:'Pets',measuredBenefit:null};
   audit.push({id:item.id,resource:item.resource,target:item.target,status:'documented checkpoint advancement; unranked',petStatDelta:item.petStatDelta,petActiveDelta:item.petActiveDelta});
   add(item);continue;
  }
  const candidate={...pet,level:Number(pet.level)+1};
  if(candidate.level>(PET_MAX_LEVEL[pet.name]??0))continue;
  const after=petLevelEffect(candidate);
  if(before.attack===null||after.attack===null||after.attack<=before.attack)continue;
  const changed=petUpgradeProfile(profile,pet,candidate);if(!changed)continue;
  add({id:`${pet.id}-passive`,petStatDelta:Number((after.attack-before.attack).toFixed(10)),title:`${pet.name}: ${englishMessage("messages.results.improvements.actionableImprovements.next.level")}`,reason:englishMessage('pets.upgradeDelta',{delta:Number((after.attack-before.attack).toFixed(10))}),resource:'Pet food',cost:englishMessage("messages.results.improvements.actionableImprovements.exact.material.cost.not.verified"),target:englishMessage("messages.results.improvements.actionableImprovements.level",{level:candidate.level}),editor:'Pets',measuredBenefit:null},changed);
 }
 const personal=results.upgrades.personalStep;
 if(personal){const valora=profile.masters.find(m=>m.name==='Valora');add({...personal,id:'valora-personal',reason:personal.benefit,resource:'Master talent materials',target:personal.title.split(' → ')[1],editor:'Masters',measuredBenefit:null},{...profile,masters:profile.masters.map(m=>m===valora?{...m,talentLevel:Number(m.talentLevel)+1}:m)});}
 for(const master of profile.masters??[])for(const skill of masterInputDetails(master).skills){
  if(!['attack','lethality'].includes(skill.kind)||skill.value==null||skill.level==null)continue;
  const future={...master,skillLevels:{...master.skillLevels,[skill.slot]:Number(skill.level)+1}},after=masterEffects(future),before=masterEffects(master);
  const delta=after[skill.kind]-before[skill.kind];if(delta<=0||after.unsupported.length)continue;
  add({id:`${master.id}-skill-${skill.slot}`,title:`${master.name}: ${skill.name} ${skill.level} → ${Number(skill.level)+1}`,reason:englishMessage("messages.results.improvements.actionableImprovements.adds.percentage.points.of.shared",{detail:Number(delta.toFixed(2)),detail2:skill.kind==='attack'?'Attack':'Lethality'}),resource:'Master skill materials',target:englishMessage("messages.results.improvements.actionableImprovements.level.2",{name:skill.name,detail:Number(skill.level)+1}),editor:'Masters',measuredBenefit:null},{...profile,masters:profile.masters.map(m=>m.id===master.id?future:m)});
 }
 for(const leader of baselineJoint?.selected?.leaders??[]){
  const hero=leader.hero,level=effectiveSkillLevel(hero,1),target=level.level+1;if(level.level==null||target>level.unlock.max)continue;
  const future={...hero,skillLevels:{...hero.skillLevels,1:target},skillLevelSource:{...hero.skillLevelSource,1:'user-confirmed'}},next=heroContributions(future);
  const delta=leader.effects[0]&&(next.sharedAttack+next.sharedLethality)-(heroContributions(hero).sharedAttack+heroContributions(hero).sharedLethality);
  if(!(delta>0))continue;
  const label=leader.effects[0].stat==='attack'?'Attack':'Lethality';
  add({id:`${hero.id}-joining-skill`,skillHeroId:hero.id,title:`${hero.name}: ${leader.name} ${level.level} → ${target}`,reason:englishMessage("messages.results.improvements.actionableImprovements.adds.percentage.points.of.joining",{delta:delta,label:label}),resource:'Hero skill manuals',target:englishMessage("messages.results.improvements.actionableImprovements.level.3",{name:leader.name,target:target}),editor:'Heroes',measuredBenefit:null,uncertainty:englishMessage("messages.results.improvements.actionableImprovements.first.hero.first.skill.the.rally.must.select.it.full")},{...profile,heroes:profile.heroes.map(h=>h.id===hero.id?future:h)});
 }
 for(const troop of ['infantry','cavalry','archer']){
  const entered=profile.troops?.[troop];if(entered?.tg==null||entered.tg===''||Number(profile.ratios?.[troop])<=0)continue;
  const target=Number(entered.tg)+1;if(target>8)continue;
  const changed={...profile,troops:{...profile.troops,[troop]:{...entered,tg:target}}};
  const before=bearTroop(profile,troop),after=bearTroop(changed,troop);
  if(before.missing.length||after.missing.length||!before.coefficient||!after.coefficient)continue;
  add({id:`${troop}-truegold`,title:englishMessage("messages.results.improvements.actionableImprovements.troops.truegold",{detail:troop[0].toUpperCase()+troop.slice(1),tg:entered.tg,target:target}),reason:englishMessage("messages.results.improvements.actionableImprovements.increases.base.troop.attack",{detail:after.effects.some(e=>e.name==='Howling Wind')&&!before.effects.some(e=>e.name==='Howling Wind')?englishMessage("messages.results.improvements.actionableImprovements.and.unlocks.howling.wind"):'',detail2:after.effects.some(e=>e.name==='Assault Lance')&&!before.effects.some(e=>e.name==='Assault Lance')?englishMessage("messages.results.improvements.actionableImprovements.and.unlocks.assault.lance"):''}),resource:'Truegold',target:englishMessage("messages.results.improvements.actionableImprovements.truegold",{target:target}),editor:'Troops',measuredBenefit:null,uncertainty:englishMessage("messages.results.improvements.actionableImprovements.estimated.comparison.using.sourced.troop.coefficients.and.skill.expectations.requires")},changed);
 }
 // Sort within each material path. Interleave paths without claiming cross-resource ROI.
 const lists=[...groups.values()].map(list=>list.sort(compareUpgradeBenefits));
 const selected=[];
 // One concrete future replacement, rather than another displayed team list.
 // Retain room for current-plan upgrades and other material paths.
 // An assumed-mechanic challenger milestone is diagnostic evidence, not an
 // instruction to spend shards before its crossover is defensible.
 const replacement=replacements.find(item=>item.crossover);
 if(replacement)selected.push(replacement);
 for(let round=0;selected.length<5&&lists.some(list=>list[round]);round++)for(const list of lists){if(list[round]&&selected.length<5)selected.push(list[round]);}
 return selected;
}

export function hostingChoiceExplanation(entry,hosting){
 const alternatives=(hosting.singleAlternatives??hosting.alternatives??[]).filter(a=>a.team.every((e,i)=>e.hero.troop===entry.hero.troop||e.hero.id===hosting.team[i].hero.id));
 const other=alternatives.find(a=>a.team.some(e=>e.hero.troop===entry.hero.troop&&e.hero.id!==entry.hero.id))?.team.find(e=>e.hero.troop===entry.hero.troop);
 const labels={infantry:'Infantry',cavalry:'Cavalry',archer:'Archer'},troop=labels[entry.hero.troop];
 const own=entry.contribution??heroContributions(entry.hero),rival=other&&(other.contribution??heroContributions(other.hero));
 const percent=n=>Number(n.toFixed(2));
 if(!other)return {summary:englishMessage("messages.results.improvements.hostingChoiceExplanation.only.comparable.candidate",{troop:troop}),detail:'Provisional. Only comparable '+troop+' candidate; no stronger alternative is established.'};
 const sharedAttack=own.sharedAttack+own.widgetRallyAttack,sharedLethality=own.sharedLethality+own.widgetRallyLethality;
 let summary;
 if(sharedAttack>rival.sharedAttack+rival.widgetRallyAttack)summary=englishMessage("messages.results.improvements.hostingChoiceExplanation.adds.shared.attack",{detail:percent(sharedAttack)});
 else if(sharedLethality>rival.sharedLethality+rival.widgetRallyLethality)summary=englishMessage("messages.results.improvements.hostingChoiceExplanation.adds.shared.lethality",{detail:percent(sharedLethality)});
 else if(own.inherentAttack>rival.inherentAttack)summary=englishMessage("messages.results.improvements.hostingChoiceExplanation.adds.attack",{detail:percent(own.inherentAttack),troop:troop});
 else if(own.widgetLethality>rival.widgetLethality)summary=englishMessage("messages.results.improvements.hostingChoiceExplanation.adds.lethality",{detail:percent(own.widgetLethality),troop:troop});
 else if(own.classAttackMultiplier>rival.classAttackMultiplier)summary=englishMessage("messages.results.improvements.hostingChoiceExplanation.boosts.attack.by",{troop:troop,detail:percent(own.classAttackMultiplier)});
 else if(own.classLethalityMultiplier>rival.classLethalityMultiplier)summary=englishMessage("messages.results.improvements.hostingChoiceExplanation.boosts.lethality.by",{troop:troop,detail:percent(own.classLethalityMultiplier)});
 else summary=englishMessage("messages.results.improvements.hostingChoiceExplanation.similar.supported.bonuses");
 const zoePair=[heroReferenceName(entry.hero),heroReferenceName(other.hero)].includes('Zoe')&&[heroReferenceName(entry.hero),heroReferenceName(other.hero)].includes('Long Fei');
 const higherAttack=own.inherentAttack>rival.inherentAttack?entry.hero:other.hero;
 const infantryTradeoff=own.inherentAttack===rival.inherentAttack?englishMessage("messages.results.improvements.hostingChoiceExplanation.they.have.equal.inherent.infantry.attack"):englishMessage("messages.results.improvements.hostingChoiceExplanation.has.percentage.points.more.inherent.infantry.attack",{name:higherAttack.name,detail:percent(Math.abs(own.inherentAttack-rival.inherentAttack))});
 const tradeoff=zoePair?englishMessage("messages.results.improvements.hostingChoiceExplanation.zoe.supplies.shared.attack",{infantryTradeoff:infantryTradeoff}):englishMessage("messages.results.improvements.hostingChoiceExplanation.supported.alternative.with.attack.and.lethality.versus.and",{name:other.hero.name,detail:other.attack.toFixed(2),detail2:other.lethality.toFixed(2),detail3:entry.attack.toFixed(2),detail4:entry.lethality.toFixed(2)});
 return {summary,detail:englishMessage("messages.results.improvements.hostingChoiceExplanation.proc.stacking.and.other.rally.scenarios.could.change.the.choice",{tradeoff:tradeoff})};
}
