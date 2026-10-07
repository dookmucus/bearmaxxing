import {englishMessage} from './english-messages.mjs';
import {heroContributions,heroProgression} from './hero-effects.mjs';
import {evaluateHostTrio,heroIdentity} from './host-comparison.mjs';
import {roleEligible,joiningRole} from './hero-roles.mjs';
import {assembleJoiningSquads,optimizeMarchPlan} from './joint-plan.mjs';
import {applySkillDefaults,effectiveSkillLevel} from './hero-skill-unlocks.mjs';
import {starStageLabel} from './star-progression.mjs';
import {dimensionDominates,hostDamageDominates} from './bear-comparison.mjs';
const known=n=>n!=null&&n!==''&&Number.isFinite(Number(n));
const fmt=n=>Number(n.toFixed(2));
// A documented milestone is not a damage crossover. Hypotheses preserve explicit
// skills and transfer class gear; every proposed target re-optimizes legal roles.
export function replacementImprovements(profile,results,accountFor,{audit=[]}={}){
 const entries=results.hosting.team,leaders=results.hosting.joint?.selected?.leaders;
 if(!entries||!leaders)return [];
 const current=evaluateHostTrio(profile,entries.map(e=>e.hero),accountFor(profile));
 if(!current||current.bear.gaps.length||leaders.some(l=>l.bear?.missing.length))return [];
 const used=new Set(entries.map(e=>heroIdentity(e.hero)));
 const candidates=profile.heroes.filter(h=>roleEligible(h)&&!used.has(heroIdentity(h))),actions=[];
 for(const candidate of candidates){
  audit.push({kind:'replacement-candidate',id:candidate.id});
  if(candidate.included===false||current.bear.modeledDamage==null)continue;
  const incumbent=entries.find(e=>e.hero.troop===candidate.troop),c=heroContributions(candidate),data=heroProgression(candidate);
  if(!incumbent||!c.comparisonReady||!known(c.inherentAttack)||!known(c.widgetLethality))continue;
  const already=evaluateHostTrio(profile,entries.map(e=>e===incumbent?candidate:e.hero),accountFor(profile));
  if(already&&!already.bear.gaps.length&&already.bear.modeledDamage>current.bear.modeledDamage)continue;
  for(const kind of ['stars','widget']){
   const entered=kind==='stars'?candidate.starStep:candidate.widget,currentLevel=Number(entered),max=kind==='stars'?31:10;
   if(!known(entered)||!Number.isInteger(currentLevel))continue;
   for(let target=currentLevel+1;target<=max;target++){
    audit.push({kind:'replacement-target',id:candidate.id,path:kind,target});
    if((kind==='stars'?data?.starAttack:data?.widgetLethality)?.[target]==null)continue;
    const future=kind==='stars'?applySkillDefaults({...candidate,starStep:target}):{...candidate,widget:target};
    const changed={...profile,heroes:profile.heroes.map(h=>heroIdentity(h)===heroIdentity(candidate)?future:h)};
    const trio=entries.map(e=>e===incumbent?future:e.hero);
    // Re-optimize joins too: a current leader is not reserved from future hosting.
    const evaluated=evaluateHostTrio(changed,trio,accountFor(changed));
    if(!evaluated||evaluated.bear.gaps.length||!hostDamageDominates(evaluated.bear,current.bear))continue;
    const optimized=optimizeMarchPlan(changed,accountFor(changed));
    if(!optimized.selected)continue;
    const n=heroContributions(future),old=incumbent.contribution;
    const gains=[];
    if(n.inherentAttack>old.inherentAttack)gains.push(englishMessage("messages.replacement.improvements.replacementImprovements.more.points.of.class.attack",{detail:fmt(n.inherentAttack-old.inherentAttack)}));
    if(n.widgetLethality>old.widgetLethality)gains.push(englishMessage("messages.replacement.improvements.replacementImprovements.more.points.of.class.lethality",{detail:fmt(n.widgetLethality-old.widgetLethality)}));
    if(n.widgetRallyAttack>old.widgetRallyAttack)gains.push(englishMessage("messages.replacement.improvements.replacementImprovements.more.rally.attack.bonus",{detail:fmt(n.widgetRallyAttack-old.widgetRallyAttack)}));
    if(n.widgetRallyLethality>old.widgetRallyLethality)gains.push(englishMessage("messages.replacement.improvements.replacementImprovements.more.rally.lethality.bonus",{detail:fmt(n.widgetRallyLethality-old.widgetRallyLethality)}));
    const progress=kind==='stars'?englishMessage("messages.replacement.improvements.replacementImprovements.stars",{detail:starStageLabel(target)}):englishMessage("messages.replacement.improvements.replacementImprovements.widget",{target:target});
    const crossover=current.bear.coverageComplete&&evaluated.bear.coverageComplete&&!(accountFor(changed).unsupported?.length);
    actions.push({id:`${candidate.id}-replacement-${kind}`,heroId:candidate.id,replacesHeroId:incumbent.hero.id,title:englishMessage("messages.replacement.improvements.replacementImprovements.keep.for.now.develop.toward",{name:incumbent.hero.name,name2:candidate.name,progress:progress}),reason:gains.length?englishMessage("messages.replacement.improvements.replacementImprovements.offers.replacement.remains.provisional",{detail:gains[0]}):englishMessage("messages.replacement.improvements.replacementImprovements.improves.this.class.across.the.modeled.bear.scenarios.replacement.remains"),target:progress,targetProgression:{starStep:future.starStep,widget:future.widget,skillLevels:{...future.skillLevels}},resource:kind==='stars'?'Hero shards':'Widget materials',editor:'Heroes',measuredBenefit:null,crossover,
     uncertainty:englishMessage("messages.replacement.improvements.replacementImprovements.same.transferable.class.gear.the.full.legal.plan.was.re"),transferredGearIds:incumbent.gear.map(g=>g.id),
     modelComparison:{reoptimized:true,selectionDependent:!crossover,selectedHost:optimized.selected.host?.team.map(e=>e.hero.id),selectedJoiningLeaders:optimized.selected.leaders.map(l=>l.id),comparisonScope:'Supported host replacement and separate joining contexts'}});
    break;
   }
  }
 }
 for(const candidate of candidates){
  const effective=effectiveSkillLevel(candidate,1),cap=effective.unlock.max,currentLevel=effective.level;
  if(cap==null||currentLevel==null)continue;
  for(let target=currentLevel+1;target<=cap;target++){
   const future={...candidate,skillLevels:{...candidate.skillLevels,1:target},skillLevelSource:{...candidate.skillLevelSource,1:'user-confirmed'}},role=joiningRole(future);
   if(role.rejection||role.bear.missing.length)continue;
   const replace=leaders.find(l=>!l.bear.missing.length&&dimensionDominates(role.bear.dimensions,l.bear.dimensions));
   if(!replace)continue;
   const changed={...profile,heroes:profile.heroes.map(h=>heroIdentity(h)===heroIdentity(candidate)?future:h)};
   const futureLeaders=leaders.map(l=>l===replace?role:l);
   if(!assembleJoiningSquads(changed,entries,futureLeaders))continue;
   const optimized=optimizeMarchPlan(changed,accountFor(changed));if(!optimized.selected)continue;
   const sameEffect=role.effects.find(e=>replace.effects.some(old=>old.stat===e.stat));
   const old=sameEffect&&replace.effects.find(e=>e.stat===sameEffect.stat),delta=old?sameEffect.value-old.value:null;
   actions.push({id:`${candidate.id}-replacement-skill`,heroId:candidate.id,replacesHeroId:replace.hero.id,title:englishMessage("messages.replacement.improvements.replacementImprovements.keep.for.now.develop.s.to.level",{name:replace.hero.name,name2:candidate.name,name3:role.name,target:target}),reason:delta>0?englishMessage("messages.replacement.improvements.replacementImprovements.adds.percentage.points.of.joining.compared.with",{detail:fmt(delta),detail2:sameEffect.stat==='attack'?'Attack':sameEffect.stat==='lethality'?'Lethality':englishMessage("messages.replacement.improvements.replacementImprovements.enemy.damage.taken"),name:replace.hero.name}):englishMessage("messages.replacement.improvements.replacementImprovements.improves.the.joining.offer.across.the.compared.rally.contexts"),target:englishMessage("messages.replacement.improvements.replacementImprovements.level",{name:role.name,target:target}),targetProgression:{skillLevels:{1:target}},resource:'Hero skill upgrades',editor:'Heroes',measuredBenefit:null,crossover:false,uncertainty:englishMessage("messages.replacement.improvements.replacementImprovements.leader.first.its.skill.must.be.selected.by.the.rally"),modelComparison:{reoptimized:true,selectedHost:optimized.selected.host?.team.map(e=>e.hero.id),selectedJoiningLeaders:optimized.selected.leaders.map(l=>l.id)}});
   break;
  }
 }
 return actions;
}
