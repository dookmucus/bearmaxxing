import {optimizeMarchPlan,releaseHypothesisPlan} from './joint-plan.mjs';
import {dimensionDominates,heroBearEffects} from './bear-comparison.mjs';
import {gearCostEfficiency} from './gear-upgrade-costs.mjs';
import {evaluateHostTrio} from './host-comparison.mjs';
import {joiningRole} from './hero-roles.mjs';

// Exact rejection bound for a bench hero's next stat-only upgrade. Its joining
// offer and account effects must be unchanged. Every existing hosting
// trio containing it is re-evaluated; if even their unconstrained maximum cannot
// beat the current legal host, complete role allocation cannot create a gain.
// Unknown/newly unlocked mappings bypass this shortcut, never become zero.
function benchUpgradeCannotImprove(profile,changed,accountFor,before){
 if(!before.canRecommend||!Number.isFinite(before.selected?.host?.bear.modeledDamage))return false;
 if(Object.keys(profile).some(k=>k!=='heroes'&&profile[k]!==changed[k]))return false;
 const edits=profile.heroes.filter(h=>JSON.stringify(h)!==JSON.stringify(changed.heroes.find(n=>n.id===h.id)));
 if(edits.length!==1)return false;
 const hero=edits[0],next=changed.heroes.find(h=>h.id===hero.id);
 if(!next||before.selected.host.team.some(e=>e.hero.id===hero.id)||hero.troop!==next.troop||hero.owned!==next.owned||hero.included!==next.included||hero.marchAvailable!==next.marchAvailable)return false;
 const account=accountFor(changed);
 if(JSON.stringify(account)!==JSON.stringify(accountFor(profile)))return false;
 const offer=h=>{const role=joiningRole(h);return {effects:role.effects,rejection:role.rejection,bear:role.bear};};
 if(JSON.stringify(offer(hero))!==JSON.stringify(offer(next)))return false;
 const oldEffects=heroBearEffects(hero),newEffects=heroBearEffects(next);
 if(oldEffects.gaps.length&&JSON.stringify(oldEffects.gaps)===JSON.stringify(newEffects.gaps))return true;
 // Other heroes' unchanged unresolved mechanics cannot suddenly become ranked
 // because this bench hero gains ordinary stats. Keep those records unknown.
 const options=before.comparison?.options?.filter(o=>o.team.some(e=>e.hero.id===hero.id)&&!o.bear.objectiveMissing.length&&Number.isFinite(o.bear.modeledDamage));
 if(!options?.length)return false;
 for(const option of options){
  const after=evaluateHostTrio(changed,option.team.map(e=>e.hero.id===hero.id?next:e.hero),account);
  if(!after||after.bear.objectiveMissing.length||!Number.isFinite(after.bear.modeledDamage))return false;
  if(after.bear.modeledDamage>before.selected.host.bear.modeledDamage+Math.max(1,before.selected.host.bear.modeledDamage)*1e-12)return false;
 }
 return true;
}
function benefitGetter(oldBear,newBear,joinA,joinB,personalGain){
 let benefits;
 return ()=>{
  if(benefits)return benefits;
  benefits=Object.fromEntries(Object.keys(joinB).map(k=>[k,joinB[k]>0?joinA[k]/joinB[k]-1:null]));
  for(const key of oldBear?.damageKeys??Object.keys(oldBear?.damageDimensions??{})){
   const before=oldBear.damageAt?oldBear.damageAt(key):oldBear.damageDimensions[key];
   const after=newBear?.damageAt?newBear.damageAt(key):newBear?.damageDimensions?.[key];
   benefits[`host-damage-scenario:${key}`]=before>0?after/before-1:null;
  }
  if(personalGain>0)benefits.personalScoreMultiplier=personalGain;
  return benefits;
 };
}
function withBenefits(summary,readBenefits){return {...summary,get benefits(){return readBenefits();}};}
// Only compact maxima are retained, weakly scoped to an immutable plan.
// Many legal joining combinations share a hosting model; scan it just once.
const incomingBestCache=new WeakMap();
function incomingContextBest(plan){
 const cached=incomingBestCache.get(plan);if(cached)return cached;
 const best={},seen=new Set();
 for(const option of plan.comparisons){
  if(option.metrics.unknownSignature||seen.has(option.host))continue;
  seen.add(option.host);
  for(const [id,value] of Object.entries(option.host?.bear.incomingContextDamage??{}))if(Number.isFinite(value))best[id]=Math.max(best[id]??-Infinity,value);
 }
 incomingBestCache.set(plan,best);return best;
}
// Every hypothesis is a new profile object. Re-optimize the complete legal plan;
// use the retained current assignment to prove a supported increment, rather
// than confusing a changed display representative with the upgrade's benefit.
export function evaluateUpgrade(profile,changed,accountFor,baseline=null){
 const before=baseline?.selected?baseline:optimizeMarchPlan(profile,accountFor(profile));
 if(benchUpgradeCannotImprove(profile,changed,accountFor,before))return null;
 const after=optimizeMarchPlan(changed,accountFor(changed));
 // Upgrade cards retain compact numbers/two host models, not each full plan
 // graph through the global profile cache. Current-profile caching is intact.
 if(changed!==profile)releaseHypothesisPlan(changed);
 if(!before.selected||!after.selected)return null;
 const retained=after.comparisons.find(plan=>plan.key===before.selected.key);
 if(!retained||retained.metrics.unknownSignature!==before.selected.metrics.unknownSignature)return null;
 const joinA=retained.metrics.joinDimensions,joinB=before.selected.metrics.joinDimensions;
 const personalPointsDelta=accountFor(changed).personalPoints-accountFor(profile).personalPoints;
 const beforeDamage=before.selected.host?.bear.modeledDamage,afterDamage=after.selected.host?.bear.modeledDamage;
 const damageGain=Number.isFinite(beforeDamage)&&Number.isFinite(afterDamage)?afterDamage/beforeDamage-1:null;
 // No substitute class score when tier/proc data is missing. A directly
 // verified monotonic stat upgrade can remain useful, explicitly unranked.
 const oldEntries=before.selected.host?.team??[],newEntries=retained.host?.team??[];
 const monotonic=oldEntries.length>0&&oldEntries.every(e=>{const n=newEntries.find(n=>n.hero.id===e.hero.id);return n&&n.attack>=e.attack&&n.lethality>=e.lethality;})&&oldEntries.some(e=>{if(!(Number(profile.ratios?.[e.hero.troop])>0))return false;const n=newEntries.find(n=>n.hero.id===e.hero.id);return n.attack>e.attack||n.lethality>e.lethality||n.contribution.widgetRallyAttack>e.contribution.widgetRallyAttack||n.contribution.widgetRallyLethality>e.contribution.widgetRallyLethality;});
 const joiningGain=!(damageGain>1e-12)&&!(personalPointsDelta>0)&&planDimensionsDominate(retained,before.selected);
 if(!(damageGain>1e-12)&&!(personalPointsDelta>0)&&!joiningGain&&!(damageGain===null&&monotonic))return null;
 const personalGain=(100+accountFor(changed).personalPoints)/(100+accountFor(profile).personalPoints)-1;
 const getBenefits=benefitGetter(before.selected.host?.bear,retained.host?.bear,joinA,joinB,personalGain);
 const changedHeroes=profile.heroes.filter(h=>JSON.stringify(h)!==JSON.stringify(changed.heroes.find(n=>n.id===h.id))).map(h=>h.id);
 const hostInvestment=changedHeroes.some(id=>[...oldEntries,...(after.selected.host?.team??[])].some(e=>e.hero.id===id));
 const selectionDependent=hostInvestment&&Boolean(before.unresolvedCandidates?.length||before.selected.sensitivity?.stableAcrossTestedCases===false);
 const oldBest=incomingContextBest(before),newBest=incomingContextBest(after);
 const incomingContextGains=Object.fromEntries(Object.keys(before.selected.host?.bear.incomingContextDamage??{}).map(id=>[id,oldBest[id]>0&&Number.isFinite(newBest[id])?newBest[id]/oldBest[id]-1:null]));
 const s=after.selected.sensitivity;
 const baselineSensitivity=s?{evaluated:s.evaluated,stableAcrossTestedCases:s.stableAcrossTestedCases,incomingReversal:s.incomingReversal,closestHost:s.closestHost,centralRelativeAdvantage:s.centralRelativeAdvantage,scope:s.scope,caseCount:after.selected.host?.bear.damageKeys?.length??0}:null;
 return withBenefits({incomingContextGains,investmentScope:hostInvestment?'Hero-specific; depends on the selected hosting role':'Transferable gear/account upgrade or separate joining contribution',joiningBenefits:Object.fromEntries(Object.keys(joinB).map(k=>[k,joinB[k]>0?joinA[k]/joinB[k]-1:null])),personalPointsDelta,damageGain,objectiveUnavailable:damageGain===null,estimated:true,selectionDependent,changedHeroes,baselineSensitivity,reoptimized:true,beforeKey:before.selected.key,afterKey:after.selected.key,retainedKey:retained.key,
  selectedHost:after.selected.host?.team.map(e=>e.hero.id)??[],selectedJoiningLeaders:after.selected.leaders.map(l=>l.id),
  comparisonScope:damageGain===null?'Verified local stat improvement; relative offense cannot be ranked for the entered troop mechanics':'Normalized 10/10/80 relative-offense comparison after legal re-optimization; not a Bear damage forecast',
  unresolved:[...(retained.host?.bear.uncertainties??[]),...(retained.host?.bear.missing??[])]},getBenefits);
}
export function compareUpgradeBenefits(a,b){
 const ae=gearCostEfficiency(a),be=gearCostEfficiency(b);
 if(a.resource===b.resource&&ae&&be&&ae.primary===be.primary&&Math.abs(ae.gainPerUnit-be.gainPerUnit)>1e-15)return be.gainPerUnit-ae.gainPerUnit;
 const av=a.modelComparison?.damageGain,bv=b.modelComparison?.damageGain;
 if(Number.isFinite(av)&&Number.isFinite(bv)&&Math.abs(av-bv)>1e-12)return bv-av;
 if(a.modelComparison?.personalPointsDelta>0&&b.modelComparison?.personalPointsDelta>0)return b.modelComparison.personalPointsDelta-a.modelComparison.personalPointsDelta;
 // Joining-context gains are comparable only by contextual dominance.
 if(a.modelComparison&&b.modelComparison&&!(av>0)&&!(bv>0)){
  if(dimensionDominates(a.modelComparison.benefits,b.modelComparison.benefits))return -1;
  if(dimensionDominates(b.modelComparison.benefits,a.modelComparison.benefits))return 1;
 }
 // Incomparable class/role gains are display ties, not arbitrary weighted ROI.
 return a.id.localeCompare(b.id);
}

// The original all-context dominance check, evaluated lazily without allocating
// full diagnostic dictionaries for every proposed upgrade.
export function planDimensionsDominate(a,b){
 const av=a.metrics.joinDimensions,bv=b.metrics.joinDimensions;
 let count=0,better=false;
 for(const key of Object.keys(bv)){count++;if(!Number.isFinite(av[key])||!Number.isFinite(bv[key])||av[key]<bv[key]-1e-10)return false;if(av[key]>bv[key]+1e-10)better=true;}
 const ah=a.host?.bear,bh=b.host?.bear;
 for(const key of bh?.damageKeys??Object.keys(bh?.damageDimensions??{})){
  count++;const x=ah?.damageAt?ah.damageAt(key):ah?.damageDimensions?.[key],y=bh.damageAt?bh.damageAt(key):bh.damageDimensions[key];
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<y-1e-10)return false;if(x>y+1e-10)better=true;
 }
 return count>0&&better;
}
