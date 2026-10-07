import {englishMessage} from './english-messages.mjs';
import {compareHosts,heroIdentity} from './host-comparison.mjs';
import {roleEligible,roleCapacity,joiningRole,roleInventoryIssues} from './hero-roles.mjs';
import {TYPES} from './engine.mjs';
import {usesActualMarchInputs} from './march-capacity-inputs.mjs';
import {hasAccountBaseCapacity} from './input-defaults.mjs';
import {planBearDimensions,dimensionDominates,joiningBearComparison} from './bear-comparison.mjs';
const id=h=>heroIdentity(h);
const stable=(a,b)=>String(id(a)).localeCompare(String(id(b)));
const vectorKeys=['attack','lethality','damageTaken','attackMultiplier','lethalityMultiplier','damageDealt','extraDamage','extraStrike','damageOverTime'];
function combinations(items,count,start=0,prefix=[],out=[]){
 if(prefix.length===count){out.push(prefix);return out;}
 for(let i=start;i<=items.length-(count-prefix.length);i++)combinations(items,count,i+1,[...prefix,items[i]],out);
 return out;
}
export function assembleJoiningSquads(profile,host,leaders,allowPartial=false){
 if(roleInventoryIssues(profile).length)return null;
 const occupied=new Set([...host.map(e=>id(e.hero??e)),...leaders.map(l=>l.id)]);
 if(occupied.size!==host.length+leaders.length)return null;
 const pools=Object.fromEntries(TYPES.map(t=>[t,profile.heroes.filter(h=>roleEligible(h)&&h.troop===t&&!occupied.has(id(h))).sort((a,b)=>{
  const ac=roleCapacity(a),bc=roleCapacity(b);
  return ac===null?(bc===null?stable(a,b):1):bc===null?-1:bc-ac||stable(a,b);
 })]));
 const joins=leaders.map((role,index)=>({name:`Join ${index+1}`,heroes:[role.hero,null,null],leaderRole:role,equivalent:[[],[],[]],manual:[false,false,false],joiner:{...profile.joiners?.[index],name:role.hero.name},reason:`${role.hero.name} offers ${offerText(role)}; the other heroes complete the troop classes.`}));
 for(const row of joins)for(const [index,t] of TYPES.filter(t=>t!==row.heroes[0].troop).entries()){
  const chosen=pools[t].shift();if(!chosen){if(!allowPartial)return null;continue;}
  row.heroes[index+1]=chosen;
 }
 const used=new Set(joins.flatMap(row=>row.heroes).filter(Boolean).map(id));
 for(const row of joins)for(const slot of [1,2]){
  const chosen=row.heroes[slot];if(!chosen)continue;const cap=roleCapacity(chosen);
  // Stable IDs only choose a display representative; equal effects are ties.
  row.equivalent[slot]=cap===null?[]:profile.heroes.filter(h=>roleEligible(h)&&h.troop===chosen.troop&&id(h)!==id(chosen)&&!host.some(e=>id(e.hero??e)===id(h))&&!leaders.some(l=>l.id===id(h))&&roleCapacity(h)===cap).map(h=>h.name);
 }
 const values=joins.flatMap(row=>row.heroes).map(roleCapacity);
 return {host:host.map(e=>e.hero??e),joins,issues:joins.flatMap(row=>row.heroes.flatMap((h,i)=>h?[]:[`${row.name} slot ${i+1}: no available compatible hero.`])),fillerCapacity:values.every(v=>v!==null)?values.reduce((n,v)=>n+v,0):null,used};
}
export function offerText(role){
 const labels={attack:'Attack',lethality:'Lethality',damageTaken:englishMessage("messages.joint.plan.offerText.enemy.damage.taken"),attackMultiplier:englishMessage("messages.joint.plan.offerText.attack.multiplier"),lethalityMultiplier:englishMessage("messages.joint.plan.offerText.lethality.multiplier"),damageDealt:englishMessage("messages.joint.plan.offerText.damage.dealt"),extraDamage:englishMessage("messages.joint.plan.offerText.extra.damage"),extraStrike:englishMessage("messages.joint.plan.offerText.extra.strike.damage"),damageOverTime:englishMessage("messages.joint.plan.offerText.damage.over.time")};
 return role.effects.map(e=>`+${e.value}% ${labels[e.stat]}${e.scope!=='all'?englishMessage("messages.joint.plan.offerText.for",{scope:e.scope}):''}${e.conditional?englishMessage("messages.joint.plan.offerText.conditional"):''}`).join(' and ');
}
const leaderMetricCache=new WeakMap(),hostMetricCache=new WeakMap();
function metrics(host,leaders,assignment,profile){
 let leaderMetrics=leaderMetricCache.get(leaders);
 if(!leaderMetrics){
  leaderMetrics={
   offers:Object.fromEntries(vectorKeys.map(stat=>[stat,leaders.flatMap(l=>l.effects.filter(e=>e.stat===stat&&e.scope==='all').map(e=>e.value)).sort((a,b)=>b-a)])),
   steadyOffers:Object.fromEntries(vectorKeys.map(stat=>[stat,leaders.flatMap(l=>l.effects.filter(e=>e.stat===stat&&e.scope==='all'&&!e.conditional).map(e=>e.value)).sort((a,b)=>b-a)])),
   signature:leaders.flatMap(l=>[...(l.unresolvedEffects??[]).map(e=>`${l.id}:${e.stat}:missing-mapping`),...l.effects.filter(e=>e.conditional||e.mechanics.length||e.scope!=='all').map(e=>`${e.name}:${e.stat}:${e.scope}:${e.conditional}:${e.mechanics.join(',')}`)]),
   unknown:leaders.flatMap(l=>l.bear?.missing??[]),
   joinDimensions:planBearDimensions(null,leaders)
  };leaderMetricCache.set(leaders,leaderMetrics);
 }
 const {offers,steadyOffers}=leaderMetrics;
 // Never replace missing effect values with zero. Different effect sets and
 // unresolved mechanisms stay separate comparison scenarios.
 let hostMetadata=host?hostMetricCache.get(host):{unknown:[],missingSignature:''};
 if(!hostMetadata){hostMetadata={unknown:(host.team??[]).flatMap(entry=>entry.contribution.effectStatuses.filter(s=>['unresolved_mechanics','missing_mapping'].includes(s.status)).map(s=>`${id(entry.hero)}:${s.id}:${s.status}:${s.mechanics?.join(',')??s.stat}`)),missingSignature:[...(host.bear.gaps??[])].sort().join('|')};hostMetricCache.set(host,hostMetadata);}
 // Diagnostic signatures do not enter selection; avoid allocating the same
 // long host/leader string for every legal combination in every hypothesis.
 let signature,dimensions;
 const unknownSignature=leaderMetrics.unknown.length?[...(host?.bear.gaps??[]),...leaderMetrics.unknown].sort().join('|'):hostMetadata.missingSignature;
 return {hostIndex:host?.index??null,offers,steadyOffers,get signature(){return signature??=[...hostMetadata.unknown,...leaderMetrics.signature].sort().join('|');},get dimensions(){return dimensions??=planBearDimensions(host,leaders);},joinDimensions:leaderMetrics.joinDimensions,unknownSignature,capacity:!usesActualMarchInputs(profile)&&hasAccountBaseCapacity(profile)?assignment.fillerCapacity:null};
}
const hostDimensionKeys=new WeakMap();
function dominates(a,b){
 if(a.metrics.unknownSignature!==b.metrics.unknownSignature)return false;
 if((a.metrics.capacity===null)!==(b.metrics.capacity===null))return false;
 if(a.metrics.capacity!==null&&a.metrics.capacity<b.metrics.capacity)return false;
 // The same host shares every hosting dimension; compare its separate joins
 // without copying thousands of identical incoming/baseline cases.
 if(a.host===b.host){const av=joinDimensions(a),bv=joinDimensions(b);return dimensionDominates(av,bv)||a.metrics.capacity>b.metrics.capacity&&Object.keys(bv).every(k=>av[k]>=bv[k]-1e-10);}
 const av=joinDimensions(a),bv=joinDimensions(b);
 if(!Object.keys(bv).every(k=>av[k]>=bv[k]-1e-10))return false;
 if(Number.isFinite(hostScore(a))&&Number.isFinite(hostScore(b))&&hostScore(a)<hostScore(b)-1e-10)return false;
 const ah=a.host?.bear.damageDimensions??{},bh=b.host?.bear.damageDimensions??{};
 let keys=hostDimensionKeys.get(bh);if(!keys){keys=Object.keys(bh);hostDimensionKeys.set(bh,keys);}
 let better=Object.keys(bv).some(k=>av[k]>bv[k]+1e-10)||a.metrics.capacity>b.metrics.capacity;
 for(const k of keys){if(!Number.isFinite(ah[k])||ah[k]<bh[k]-1e-10)return false;if(ah[k]>bh[k]+1e-10)better=true;}
 return better;
}
const displayOrder=(a,b)=>a.key.localeCompare(b.key);
// Hosting total damage is the primary objective. Joining contexts are separate
// constraints/tradeoffs, never equal-weighted terms in a host damage score.
const hostScore=o=>o.host?.bear?.modeledDamage??null;
const joinDimensions=o=>o.metrics.joinDimensions??Object.fromEntries(Object.entries(o.metrics.dimensions).filter(([k])=>k.startsWith('separate-join:')));
export function selectCurrentPlan(options){
 const candidates=options.map(option=>option.metrics?option:{...option,key:option.key??`${option.host?.team.map(e=>id(e.hero)).join(',')}/${option.leaders.map(l=>l.id).sort().join(',')}`,metrics:{dimensions:planBearDimensions(option.host,option.leaders),unknownSignature:[...(option.host?.bear.gaps??[]),...option.leaders.flatMap(l=>(l.bear??joiningBearComparison(l)).missing)].sort().join('|'),capacity:null},original:option});
 const modeled=candidates.filter(c=>!c.metrics.unknownSignature),pool=modeled.length?modeled:candidates;
 if(!pool.length)return null;
 const scored=pool.filter(o=>Number.isFinite(hostScore(o)));
 let finalists;
 if(scored.length){
  const best=Math.max(...scored.map(hostScore));
  finalists=scored.filter(o=>Math.abs(hostScore(o)-best)<=Math.max(1,Math.abs(best))*1e-12);
 }else{
  // Missing tier/proc magnitudes cannot be replaced by T6 or a class index.
  // Keep one legal, explicitly unranked host representative.
  const hostKey=[...pool].sort(displayOrder)[0].host?.team.map(e=>id(e.hero)).join(',')??'';
  finalists=pool.filter(o=>(o.host?.team.map(e=>id(e.hero)).join(',')??'')===hostKey);
 }
 const joins=finalists.filter(o=>!finalists.some(other=>other!==o&&other.metrics.unknownSignature===o.metrics.unknownSignature&&(dimensionDominates(joinDimensions(other),joinDimensions(o))||Object.keys(joinDimensions(o)).every(k=>Math.abs(joinDimensions(other)[k]-joinDimensions(o)[k])<1e-10)&&other.metrics.capacity!=null&&o.metrics.capacity!=null&&other.metrics.capacity>o.metrics.capacity)));
 joins.sort(displayOrder);
 const selected=joins[0]??finalists[0];
 selected.hostObjective=hostScore(selected);selected.scenarioRegret=null;
 return selected.original??selected;
}
function hostSensitivity(selected,options){
 if(!selected?.host||!Number.isFinite(hostScore(selected)))return {evaluated:false,reason:'Entered troop coefficients or offensive mechanics are incomplete; no damage ranking is established'};
 const pool=[...new Map(options.filter(o=>!o.metrics.unknownSignature&&Number.isFinite(hostScore(o))).map(o=>[o.host,o])).values()],chosen=selected.host.team.map(e=>id(e.hero)).join(',');
 const keys=selected.host.bear.damageKeys??Object.keys(selected.host.bear.damageDimensions);
 const identities=new Map(pool.map(o=>[o,o.host.team.map(e=>id(e.hero)).join(',')]));
 const at=(o,key)=>o.host.bear.damageAt?o.host.bear.damageAt(key):o.host.bear.damageDimensions[key];
 const caseCache=new Map();
 const evaluate=key=>{
  if(caseCache.has(key))return caseCache.get(key);
  let best=-Infinity,winners=[];
  for(const option of pool){const value=at(option,key);if(!Number.isFinite(value))continue;
   if(value>best+Math.max(1,Math.abs(value))*1e-12){best=value;winners=[identities.get(option)];}
   else if(Math.abs(value-best)<=Math.max(1,Math.abs(best))*1e-12)winners.push(identities.get(option));
  }
  const unique=[...new Set(winners)],value=at(selected,key);
  const result={scenario:key,winningHosts:unique,selectedDamage:value,bestDamage:best,selectedIsBest:unique.includes(chosen),relativeShortfall:best>0?1-value/best:null};
  caseCache.set(key,result);return result;
 };
 const incomingReversal=keys.filter(k=>k.startsWith('finite-111:independent-late-counter:independent:')).some(k=>!evaluate(k).selectedIsBest);
 const stableAcrossTestedCases=!keys.some(k=>!evaluate(k).selectedIsBest);
 const alternatives=pool.filter(o=>o.host.team.map(e=>id(e.hero)).join(',')!==chosen).sort((a,b)=>hostScore(b)-hostScore(a)||displayOrder(a,b));
 const closest=alternatives[0];
 return {evaluated:true,stableAcrossTestedCases,incomingReversal,get cases(){return keys.map(evaluate);},closestHost:closest?.host.team.map(e=>id(e.hero))??null,centralRelativeAdvantage:closest?(hostScore(selected)/hostScore(closest)-1):null,
  scope:'Finite baseline × mechanic × troop-proc sensitivity checks, not probabilities, confidence intervals or the objective'};
}
function decidingUncertainty(selected,comparison,account){
 const bear=selected?.host?.bear;
 if(bear?.objectiveMissing?.length)return 'Estimated comparison unavailable: '+bear.objectiveMissing[0]+'.';
 const omitted=comparison.options?.flatMap(o=>o.bear.objectiveMissing??[]).find(g=>g.startsWith('Vivian: Focus Fire'));
 if(omitted)return englishMessage("messages.joint.plan.decidingUncertainty.vivian.s.focus.fire.attack.sequence.is.unresolved.so.an");
 const incomingReversal=selected?.sensitivity?.incomingReversal??selected?.sensitivity?.cases?.some(c=>c.scenario.startsWith('finite-111:independent-late-counter:independent:')&&!c.selectedIsBest);
 if(incomingReversal)return englishMessage("messages.joint.plan.decidingUncertainty.provisional.the.best.host.changes.with.incoming.joining.bonuses.vivian");
 if(selected?.sensitivity?.evaluated&&!selected.sensitivity.stableAcrossTestedCases)return bear?.incomingContexts?.length?englishMessage("messages.joint.plan.decidingUncertainty.provisional.this.host.leads.across.the.incoming.mixes.under.central"):englishMessage("messages.joint.plan.decidingUncertainty.estimated.comparison.a.different.hosting.trio.wins.under.some.baseline");
 if(bear?.uncertainties.length){
  const names=[...new Set(bear.effects.filter(e=>e.unresolved?.length).map(e=>`${e.hero}’s ${e.name}`))].slice(0,2);
  return names.length?englishMessage("messages.joint.plan.decidingUncertainty.stacking.or.timing.could.change.this.plan.other.rallies.selected",{detail:names.join(' and ')}):englishMessage("messages.joint.plan.decidingUncertainty.widget.bonuses.may.interact.with.your.master.and.pet.bonuses");
 }
 const records=(selected?.host?.unresolvedOffensive??[]).filter(e=>e.value!=null);
 const details=records.slice(0,2).map(e=>`${e.hero}’s ${e.name}: ${e.reason.includes('stacking')?englishMessage("messages.joint.plan.decidingUncertainty.bonus.stacking"):englishMessage("messages.joint.plan.decidingUncertainty.trigger.timing.during.bear")}`);
 if(details.length)return englishMessage("messages.joint.plan.decidingUncertainty.could.change.the.choice",{detail:details.join('; ')});
 const gap=comparison.gaps[0];
 if(gap)return englishMessage("messages.joint.plan.decidingUncertainty.s.entered.offensive.progression.is.incomplete.so.no.advantage.over",{name:gap.name});
 const effect=selected?.leaders.flatMap(l=>l.effects).find(e=>e.mechanics.length);
 if(effect)return englishMessage("messages.joint.plan.decidingUncertainty.could.change.the.preferred.leader",{name:effect.name,detail:effect.mechanics[0]});
 return account.unsupported?.length?englishMessage("messages.joint.plan.decidingUncertainty.some.account.offensive.effects.are.incomplete"):englishMessage("messages.joint.plan.decidingUncertainty.the.selected.joining.skills.must.be.accepted.by.each.rally");
}
export function supportedJoiningPlans(profile,host=[]){
 const all=profile.heroes.filter(roleEligible).map(joiningRole),roles=all.filter(r=>!r.rejection&&!host.some(e=>id(e.hero??e)===r.id));
 const count=Number(profile.joinCount??3),plans=[];
 if(!Number.isInteger(count)||count<1||count>6)return {plans,gaps:all.filter(r=>r.rejection)};
 for(const leaders of combinations(roles,count)){
  const assignment=assembleJoiningSquads(profile,host,leaders);if(!assignment)continue;
  plans.push({leaders,assignment,host:null,metrics:metrics(null,leaders,assignment,profile),key:leaders.map(l=>l.id).sort().join(",")});
 }
 plans.sort(displayOrder);
 const selected=selectCurrentPlan(plans);
 if(selected)plans.splice(plans.indexOf(selected),1),plans.unshift(selected);
 return {plans,gaps:all.filter(r=>r.rejection)};
}
const cache=new WeakMap();
export function releaseHypothesisPlan(profile){cache.delete(profile);}
export function optimizeMarchPlan(profile,account){
 const fingerprint=JSON.stringify({heroes:profile.heroes,gear:profile.gear,stats:profile.stats,ratios:profile.ratios,hostEnabled:profile.hostEnabled,joinCount:profile.joinCount,marchSlots:profile.marchSlots,joiners:profile.joiners,capacityInputMode:profile.capacityInputMode,capacityPlanningModel:profile.capacityPlanningModel,accountBaseCapacity:profile.accountBaseCapacity,hostCapacity:profile.hostCapacity,joinCapacity:profile.joinCapacity,troopsPerMarch:profile.troopsPerMarch,marchSizeByType:profile.marchSizeByType,troops:profile.troops,mixedTiersEnabled:profile.mixedTiersEnabled,tierInventory:profile.tierInventory,assumedInputs:profile.assumedInputs,account});
 const cached=cache.get(profile);if(cached?.fingerprint===fingerprint)return cached.result;
 const validation=roleInventoryIssues(profile);
 const comparison=compareHosts(profile,account),hosts=profile.hostEnabled?(comparison.options??[]):[null];
 const all=profile.heroes.filter(roleEligible).map(joiningRole),roles=all.filter(r=>!r.rejection);
 const combos=validation.length?[]:combinations(roles,Number(profile.joinCount??3));
 const needsFillerCapacity=!usesActualMarchInputs(profile)&&hasAccountBaseCapacity(profile);
 const availableCounts=Object.fromEntries(TYPES.map(t=>[t,profile.heroes.filter(h=>roleEligible(h)&&h.troop===t).length]));
 const comparisons=[];let evaluated=0;
 for(const host of hosts)for(const leaders of combos){
  const team=host?.team??[];
  if(leaders.some(l=>team.some(e=>id(e.hero)===l.id)))continue;
  // Every legal march needs one of each class. With distinct leaders/host and
  // enough owned available heroes per class, fillers always exist. If entered
  // maximum capacity already includes them, constructing tens of thousands of
  // equivalent filler records cannot affect selection. Materialize on demand.
  if(TYPES.some(t=>availableCounts[t]<leaders.length+team.filter(e=>e.hero.troop===t).length))continue;
  let assignment=needsFillerCapacity?assembleJoiningSquads(profile,team,leaders):null;
  if(needsFillerCapacity&&!assignment)continue;
  const candidate={host,leaders,get assignment(){return assignment??=assembleJoiningSquads(profile,team,leaders);},metrics:metrics(host,leaders,assignment??{fillerCapacity:null},profile),key:`${team.map(e=>id(e.hero)).join(',')}/${leaders.map(l=>l.id).sort().join(',')}`,coverageComplete:Boolean((!profile.hostEnabled||host?.coverageComplete)&&!(host?.team??[]).some(e=>e.contribution.effectStatuses.some(s=>['missing_mapping','unresolved_mechanics'].includes(s.status)))&&leaders.every(l=>l.coverageComplete)&&!(account.unsupported?.length)),reason:'Jointly assigned without sharing heroes; no combined Bear damage score.'};
  evaluated++;
  comparisons.push(candidate);
 }
 // Exhaustive Pareto alternatives are development diagnostics, not the
 // current-plan objective. Materialize them only when explicitly requested.
 let frontier;
 const getFrontier=()=>{
  if(frontier)return frontier;
  const scenarios=new Map();
  for(const candidate of comparisons){
   const scenarioKey=JSON.stringify([candidate.metrics.unknownSignature,candidate.metrics.capacity===null]);
   const group=scenarios.get(scenarioKey)??[];scenarios.set(scenarioKey,group);
   if(group.some(other=>dominates(other,candidate)))continue;
   for(let i=group.length-1;i>=0;i--)if(dominates(candidate,group[i]))group.splice(i,1);
   group.push(candidate);
  }
  return frontier=[...scenarios.values()].flat().sort(displayOrder);
 };
 const selected=selectCurrentPlan(comparisons);
 if(selected)Object.defineProperty(selected,'assignment',{value:selected.assignment,enumerable:true,configurable:true});
 if(selected)selected.sensitivity=hostSensitivity(selected,comparisons);
 if(selected)selected.hostReason=`Uses this trio’s Bear effects; ${selected.leaders.map(l=>l.hero.name).join(' / ')} contribute first skills to separate rallies.`;
 let alternatives;
 const getAlternatives=()=>alternatives??=(getFrontier().filter(o=>o!==selected).slice(0,5));
 const canRecommend=Boolean(selected&&(!profile.hostEnabled||Number.isFinite(hostScore(selected)))&&!selected.metrics.unknownSignature);
 const unresolvedCandidates=[...new Set([...(comparison.options??[]).flatMap(o=>o.bear.objectiveMissing??[]),...(comparison.gaps??[]).flatMap(g=>g.reasons.map(r=>`${g.name}: ${r}`))])];
 const result={selected,canRecommend,get alternatives(){return getAlternatives();},get frontier(){return getFrontier();},comparisons,evaluated,comparison,leaderGaps:all.filter(r=>r.rejection),overallWinner:false,unresolvedCandidates,
  recommendationUncertainty:decidingUncertainty(selected,comparison,account),
  scenario:'Hosting uses total modeled Bear damage for the entered formation and a documented central mechanic case. Finite baseline and mechanic variations only check stability. Joining contexts are separate rallies with no assumed captain strength or context probabilities.',
  objective:'Maximize central total modeled hosting Bear damage among complete legal plans; compare joining offers by context dominance only among equal-damage hosts. Incomparable joining outcomes remain tradeoffs, not an equal-weighted score.',
  selectionStatus:!selected?'no legal supported plan':!canRecommend?'unranked legal arrangement; no hosting or joining recommendation':'estimated hosting-damage recommendation with separate joining tradeoffs',
  scope:'Estimated total hosting Bear damage for the entered formation. Joining contexts and uncertainty checks stay separate from the hosting objective; incomplete coefficients or mechanics do not become zero.',
  blockingValidation:validation,issues:selected?[]:validation.length?validation:['No complete supported plan fits the available heroes and troop classes.']};
 cache.set(profile,{fingerprint,result});return result;
}
