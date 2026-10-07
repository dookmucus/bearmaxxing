import {HOST_INCOMING_CONTEXTS,incomingEffects,combineIncoming} from './hosting-incoming.mjs';
import {attackEventExpectation,widgetStatFactor} from './bear-attack-events.mjs';
import mechanics from './data/bear-mechanics.json' with {type:'json'};
import offensive from './data/hero-offensive-effects.json' with {type:'json'};
import {bearTroop,troopDamageMultiplier} from './bear-troops.mjs';
import {heroReference,heroSkillName} from './hero-effects.mjs';
import {heroReferenceName} from './hero-identity.mjs';
import {effectiveSkillLevel} from './hero-skill-unlocks.mjs';
import {actualMarchCapacity,usesActualMarchInputs} from './march-capacity-inputs.mjs';
import {split,TYPES} from './engine.mjs';
import {inventoryCount} from './troop-inventory.mjs';
import {combatBaselineInput} from './input-defaults.mjs';
const stages={15:[0,3,6,9,12,15],25:[0,5,10,15,20,25],30:[0,6,12,18,24,30]};
const known=n=>n!=null&&n!==''&&Number.isFinite(Number(n));
export const BEAR_MECHANICS=mechanics;
// Sensitivity cases, not a probability distribution or a claim that counter
// phase, debuff overlap, and proc correlation have been completely resolved.
// Isolated mechanic changes plus an interaction case; counts are not odds.
export const HOST_SCENARIOS=[
 {id:'independent-late-counter',merge:null,offset:1,petra:'forward-round',phase:0,trapPhase:0,collision:'focus',alcar:'separate',rosa:'separate'},
 {id:'independent-early-counter',merge:null,offset:0,petra:'forward-round',phase:0,trapPhase:0,collision:'focus',alcar:'separate',rosa:'separate'},
 {id:'overlap-101',merge:'101',offset:1,petra:'per-attack',phase:0,trapPhase:0,collision:'focus',alcar:'combined',rosa:'102'},
 {id:'overlap-102',merge:'102',offset:1,petra:'forward-round',phase:0,trapPhase:0,collision:'focus',alcar:'combined',rosa:'102'},
 {id:'vivian-initial-phase',merge:null,offset:1,petra:'forward-round',phase:1,trapPhase:1,collision:'focus',alcar:'separate',rosa:'separate'},
 {id:'vivian-trap-precedence',merge:null,offset:1,petra:'forward-round',phase:0,trapPhase:0,collision:'trap',alcar:'separate',rosa:'separate'},
 {id:'vivian-additive-extra-damage',merge:null,offset:1,petra:'forward-round',phase:0,trapPhase:0,collision:'focus',extraDamage:'additive',alcar:'separate',rosa:'separate'},
 {id:'alcar-additive',merge:null,offset:1,petra:'forward-round',phase:0,trapPhase:0,collision:'focus',alcar:'combined',rosa:'separate'},
 {id:'rosa-shared-attack',merge:null,offset:1,petra:'forward-round',phase:0,trapPhase:0,collision:'focus',alcar:'separate',rosa:'102'},
 {id:'petra-current-hit',merge:null,offset:1,petra:'per-attack',phase:0,trapPhase:0,collision:'focus',alcar:'separate',rosa:'separate'}
];
// Isolate unknown stage applicability rather than claiming the generic 10% is
// verified T10/TG6 data. Endpoints bound probability, not player inputs.
for(const probability of [0,.2,1])HOST_SCENARIOS.push({...HOST_SCENARIOS[0],id:`volley-stage-${probability}`,volleyProbability:probability});
for(const phase of [2,3])HOST_SCENARIOS.push({...HOST_SCENARIOS[0],id:`vivian-phase-${phase}`,phase,trapPhase:0});
for(const phase of [1,2,3])HOST_SCENARIOS.push({...HOST_SCENARIOS[0],id:`trap-phase-${phase}`,phase:0,trapPhase:phase});
// Supplementary proc magnitudes are sourced; their common-packet stacking is
// not. Compare independent versus additive hypotheses without declaring either
// an observed game rule or assigning probabilities to these scenarios.
HOST_SCENARIOS.push({...HOST_SCENARIOS[0],id:'review-procs-additive',reviewProcStacking:'additive'});
export function periodicActive(round,period,offset=1){const first=period+(offset===0?1:0);return round>=first&&(round-first)%period===0;}
export function heroBearEffects(hero,role='hosting'){
 const name=heroReferenceName(hero),specific=offensive.heroes[name],ref=heroReference(hero),effects=[],gaps=[];
 if(!specific&&!ref&&(role==='joining'?[1]:[1,2,3]).some(slot=>effectiveSkillLevel(hero,slot).level!==0))gaps.push(`${name}: Expedition offensive effects and Bear operation families are unmapped`);
 for(const record of specific?.effects??ref?.effects??[]){
  if(role==='joining'&&record.skill!==1)continue;
  const level=effectiveSkillLevel(hero,record.skill).level;
  if(level===0)continue;
  const rule=mechanics.heroes[name]?.find(r=>r.skill===record.skill&&(!r.scope||!record.scope||r.scope===record.scope));
  const value=record.values?.[level]??stages[record.max]?.[level];
  if(rule?.kind==='bear-excluded'){effects.push({...rule,name:record.name??heroSkillName(hero,record.skill),level,value,excluded:true});continue;}
  if(level==null||value==null){gaps.push(`${name}: ${record.name??heroSkillName(hero,record.skill)} progression is unmapped`);continue;}
  const family=rule?.family??({group101:'101',group102:'102'})[record.kind];
  if(!family){gaps.push(`${name}: ${record.name??heroSkillName(hero,record.skill)} (${record.scope??'all'}) Bear operation family is unmapped`);effects.push({...record,...rule,hero:name,level,value,name:record.name??heroSkillName(hero,record.skill),family:null,kind:'unresolved-operation'});continue;}
  effects.push({...record,...rule,name:record.name??heroSkillName(hero,record.skill),hero:name,level,value,scope:rule?.scope??record.scope??'all',family,kind:rule?.kind??'steady',source:rule?.source??ref?.source,evidence:rule?.evidence??'Firsthand joiner-family tests; hosting application is a comparison assumption'});
  if(rule?.kind==='unresolved-operation')gaps.push(`${name}: ${record.name} ${rule.unresolved.join('; ')} is unresolved`);
  if(rule?.kind==='unresolved-attack-sequence')gaps.push(`${name}: ${record.name} attack counter, activation and replacement sequence are not verified`);
 }
 return {effects,gaps};
}
function activeClasses(profile){return TYPES.filter(t=>Number(profile.ratios?.[t])>0).length;}
function magnitude(effect,scenario,round,active){
 if(effect.kind==='steady')return effect.value;
 if(effect.kind==='chance')return effect.value*(effect.probabilityByLevel?.[effect.level]??effect.probability);
 if(effect.kind==='chance-replacement')return (effect.value-100)*effect.probability;
 if(effect.kind==='chance-per-attack')return effect.value*(scenario.petra==='per-turn-union'?1-(1-effect.probability)**active:effect.probability);
 if(effect.kind==='periodic')return periodicActive(round+1,effect.period,scenario.offset)?effect.value:0;
 if(effect.kind==='counter'){
  const tick=scenario.counter==='per-active-class-attack'?active:1;
  return Math.floor((round+1)*tick/effect.period)>Math.floor(round*tick/effect.period)?effect.value:0;
 }
 return null;
}
function familyFor(effect,scenario){
 if(effect.reviewProc&&scenario.reviewProcStacking==='additive')return 'review-proc-overlap-assumption';
 if(effect.hero==='Alcar'&&scenario.alcar==='combined')return 'alcar-combined-damage-assumption';
 if(effect.hero==='Rosa'&&effect.skill===3)return scenario.rosa==='102'?'102':effect.family;
 return effect.familyUnresolved&&scenario.merge?scenario.merge:effect.family;
}
export function familyMultiplier(offers,baseline={}){
 const totals={...baseline};
 for(const offer of offers)totals[offer.family]=(totals[offer.family]??0)+offer.value;
 return Object.keys(totals).sort().reduce((value,key)=>value*(1+totals[key]/100),1);
}
// Sensitivity ranges are transparent comparison assumptions, never saved inputs.
// Unentered permanent bonuses use finite 200/500/1000 percentage-point cases;
// entered bonuses retain their exact central value and vary by ±20% for checks.
const baselineCaseCache=new Map(),damageKeyCache=new Map();
function boundedMemo(cache,key,create){
 if(cache.has(key))return cache.get(key);
 const value=create();if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(key,value);return value;
}
export function finiteBaselineCases(profile){
 const input=Object.fromEntries(TYPES.map(t=>[t,Object.fromEntries(['attack','lethality'].map(stat=>[stat,combatBaselineInput(profile,t,stat).value]))]));
 return boundedMemo(baselineCaseCache,JSON.stringify(input),()=>buildFiniteBaselineCases(input));
}
function buildFiniteBaselineCases(input){
 const cases=[];
 for(const i of [0,1,2])for(const c of [0,1,2])for(const a of [0,1,2]){
  const choices={infantry:i,cavalry:c,archer:a},values={};
  for(const t of TYPES)values[t]=Object.fromEntries(['attack','lethality'].map(stat=>[stat,input[t][stat]!=null?input[t][stat]*[.8,1,1.2][choices[t]]:[200,500,1000][choices[t]]]));
  cases.push({id:`finite-${i}${c}${a}`,central:i===1&&c===1&&a===1,values});
 }
 for(const reverse of [false,true]){
  const values=Object.fromEntries(TYPES.map(t=>[t,Object.fromEntries(['attack','lethality'].map((stat,i)=>{
   const high=(i===0)!==reverse;return [stat,input[t][stat]!=null?input[t][stat]*(high?1.2:.8):high?1000:200];
  }))]));cases.push({id:reverse?'finite-low-attack-high-lethality':'finite-high-attack-low-lethality',central:false,values});
 }
 const unique=new Map();
 for(const entry of cases){const key=JSON.stringify(entry.values);if(!unique.has(key)||entry.central)unique.set(key,entry);}
 return [...unique.values()];
}
const eventCache=new Map();
export function hostBearComparison(profile,entries,auditAssumptions=null){
 const records=entries.map(e=>heroBearEffects(e.hero)),effects=records.flatMap(r=>r.effects).sort((a,b)=>`${a.hero}:${a.skill}`.localeCompare(`${b.hero}:${b.skill}`));
 // An explicit hypothetical trace is available for research only. Production
 // cannot silently choose one attack sequence and call Vivian the winner.
 const trace=auditAssumptions?.vivianTrace;
 const gaps=records.flatMap(r=>r.gaps).filter(g=>!(trace&&g.startsWith('Vivian: Focus Fire attack counter')));
 const active=activeClasses(profile),dimensions={},classes={},skillFactors={};
 const troops=Object.fromEntries(TYPES.map(t=>[t,bearTroop(profile,t)]));
 const baselines=finiteBaselineCases(profile),centralBaseline=baselines.find(b=>b.central);
 const focus=effects.find(e=>e.hero==='Vivian'&&e.skill===2&&!e.excluded),tiger=effects.find(e=>e.hero==='Vivian'&&e.skill===1&&!e.excluded),trap=effects.find(e=>e.hero==='Vivian'&&e.skill===3&&!e.excluded);
 const widgetAttack=entries.reduce((n,e)=>n+e.contribution.widgetRallyAttack,0),widgetLethality=entries.reduce((n,e)=>n+e.contribution.widgetRallyLethality,0);
 const volley=troops.archer.effects.find(e=>e.name==='Volley');
 const incomingContexts=auditAssumptions?.incomingContexts??HOST_INCOMING_CONTEXTS;
 const centralIncoming=incomingContexts.find(c=>c.central)??incomingContexts[0];
 if(!centralIncoming)throw new Error('At least one incoming comparison context is required');
 const contextEffects=new Map(incomingContexts.map(c=>[c.id,incomingEffects(c)]));
 const eventSummaries={};
 const eventKey=JSON.stringify([effects,TYPES.filter(t=>Number(profile.ratios?.[t])>0),volley?.probability??0,trace??null,incomingContexts]);
 let cachedEvents=eventCache.get(eventKey);if(!cachedEvents){cachedEvents=new Map();if(eventCache.size>=512)eventCache.delete(eventCache.keys().next().value);eventCache.set(eventKey,cachedEvents);}
 for(const context of incomingContexts)for(const scenario of HOST_SCENARIOS){
  const scenarioKey=context.id===centralIncoming.id?scenario.id:`${scenario.id}:${context.id}`;
  const eventResult=cachedEvents.get(scenarioKey)??attackEventExpectation({active:TYPES.filter(t=>Number(profile.ratios?.[t])>0),rounds:mechanics.bear.rounds,volleyProbability:volley?(scenario.volleyProbability??volley.probability):0,focus:focus?{value:focus.value,nextTaken:focus.nextAttackDamageTaken[focus.level]}:null,trap:trap?{value:trap.value}:null,tiger:tiger?.value??0,phase:scenario.phase,trapPhase:scenario.trapPhase,collision:scenario.collision,
   factor:event=>{
    const offers=effects.filter(e=>!e.excluded&&e.family&&e.kind!=='attack-event'&&(e.scope==='all'||e.scope===event.troop)).map(e=>({family:familyFor(e,scenario),value:e.kind==='chance-per-attack'?e.value*(scenario.petra==='per-attack'?e.probability:event.petraProbability):magnitude(e,scenario,event.round-1,active)}));
    if(tiger){const offer=offers.find(o=>o.family===familyFor(tiger,scenario));if(offer)offer.value=trace?trace.find(r=>r.round===event.round&&r.troop===event.troop)?.damageTaken??event.damageTaken:event.damageTaken;}
    if(focus)offers.push({family:familyFor(focus,scenario),value:trace?trace.find(r=>r.round===event.round&&r.troop===event.troop)?.focusExtraDamage??event.focusExtraDamage:event.focusExtraDamage});
    if(trap)offers.push({family:scenario.extraDamage==='additive'&&event.focusProc?'vivian-focus-fire':familyFor(trap,scenario),value:event.trapExtraDamage});
    return familyMultiplier(combineIncoming(offers,contextEffects.get(context.id),context));
   }});
  cachedEvents.set(scenarioKey,eventResult);
  eventSummaries[scenarioKey]={expectedClassTotals:eventResult.totals,probabilityMass:eventResult.probabilityMass,volleyProbability:volley?(scenario.volleyProbability??volley.probability):0,volleyStageVerified:volley?.stageVerified??null};
  for(const entry of entries){
   const troop=entry.hero.troop,skill=eventResult.averages[troop]*widgetStatFactor(widgetAttack)*widgetStatFactor(widgetLethality);
   skillFactors[`${scenarioKey}:${troop}`]=skill;
   const attack=entry.attack+centralBaseline.values[troop].attack-(known(profile.stats?.[troop]?.attack)?Number(profile.stats[troop].attack):0);
   const lethality=entry.lethality+centralBaseline.values[troop].lethality-(known(profile.stats?.[troop]?.lethality)?Number(profile.stats[troop].lethality):0);
   const factor=(1+attack/100)*(1+lethality/100)*skill;
   dimensions[`${scenarioKey}:${troop}`]=factor;classes[troop]??={};classes[troop][scenarioKey]=factor;
  }
 }
 const capacity=usesActualMarchInputs(profile)?actualMarchCapacity(profile,'host'):profile.hostCapacity;
 const counts=known(capacity)&&Number(capacity)>0?split(capacity,profile.ratios):null;
 const totalRatio=TYPES.reduce((n,t)=>n+Number(profile.ratios?.[t]??0),0);
 const ratioValid=totalRatio===100&&TYPES.every(t=>known(profile.ratios?.[t])&&Number(profile.ratios[t])>=0);
 const troopGaps=TYPES.filter(t=>Number(profile.ratios?.[t])>0).flatMap(t=>troops[t].missing);
 const objectiveMissing=[...gaps,...troopGaps,...(!ratioValid?['Formation percentages are unavailable or invalid']:[])];
 const damageDimensions={},unresolvedTroopTerms={},centralScenario='independent-late-counter';
 const unknownHowling=objectiveMissing.length===1&&/Howling Wind/.test(objectiveMissing[0])&&!profile.mixedTiersEnabled;
 const defense=mechanics.bear.targetDefense*mechanics.bear.targetHealth/100;
 const scale=counts?Math.sqrt(Number(capacity)*Math.min(Number(capacity),mechanics.bear.targetCount))*mechanics.bear.rounds/defense/100:1;
 const enabled=(!objectiveMissing.length||unknownHowling)&&!profile.mixedTiersEnabled;
 const scenarioIds=HOST_SCENARIOS.map(s=>s.id),contextIds=incomingContexts.map(c=>c.id);
 const prefixes=new Map();
 const troopProcs=Object.fromEntries(TYPES.map(t=>{const withoutVolley={...troops[t],effects:troops[t].effects.filter(e=>e.name!=='Volley')};return [t,Object.fromEntries(['independent','additive'].map(proc=>[proc,troopDamageMultiplier(withoutVolley,proc)]))];}));
 if(enabled)for(const baseline of baselines){
  const terms=[];
  for(const t of TYPES){
   if(Number(profile.ratios[t])===0)continue;
   const entry=entries.find(e=>e.hero.troop===t),coefficient=troops[t].coefficient;
   const attack=entry.attack+baseline.values[t].attack-(known(profile.stats?.[t]?.attack)?Number(profile.stats[t].attack):0);
   const lethality=entry.lethality+baseline.values[t].lethality-(known(profile.stats?.[t]?.lethality)?Number(profile.stats[t].lethality):0);
   const share=counts?counts[t]/Number(capacity):Number(profile.ratios[t])/100;
   terms.push({t,prefix:Math.sqrt(share)*coefficient.attack*coefficient.lethality/100*(1+attack/100)*(1+lethality/100),procs:troopProcs[t]});
  }
  prefixes.set(baseline.id,terms);
 }
 let damageKeys;
 const getDamageKeys=()=>damageKeys??=(enabled&&!unknownHowling?boundedMemo(damageKeyCache,JSON.stringify([baselines.map(b=>b.id),scenarioIds,contextIds,centralIncoming.id]),()=>baselines.flatMap(b=>scenarioIds.flatMap(s=>contextIds.flatMap(c=>['independent','additive'].map(proc=>`${b.id}:${s}:${proc}${c===centralIncoming.id?'':':'+c}`))))):[]);
 // Evaluate the exact same sum only when needed. Central selection does not
 // require exporting every crossed diagnostic case for every candidate.
 const damageAt=key=>{
  if(Object.hasOwn(damageDimensions,key))return damageDimensions[key];
  const [baseline,scenario,proc,context=centralIncoming.id]=key.split(':');
  if(!enabled||!prefixes.has(baseline)||!scenarioIds.includes(scenario)||!contextIds.includes(context)||!['independent','additive'].includes(proc))return null;
  const scenarioKey=context===centralIncoming.id?scenario:`${scenario}:${context}`;
  let damage=0,affectedCoefficient=0;
  for(const term of prefixes.get(baseline)){
   const contribution=term.prefix*skillFactors[`${scenarioKey}:${term.t}`]*term.procs[proc];
   if(unknownHowling&&term.t==='archer')affectedCoefficient=contribution*scale;else damage+=contribution;
  }
  if(unknownHowling){unresolvedTroopTerms[key]={knownTotal:damage*scale,affectedCoefficient,expression:'knownTotal + affectedCoefficient × unknown Archer Howling Wind factor'};return null;}
  return damageDimensions[key]=damage*scale;
 };
 const materializeDamage=()=>{for(const key of getDamageKeys())damageAt(key);return damageDimensions;};
 if(unknownHowling)for(const b of baselines)for(const s of scenarioIds)for(const c of contextIds)for(const proc of ['independent','additive'])damageAt(`${b.id}:${s}:${proc}${c===centralIncoming.id?'':':'+c}`);
 const centralKey=`${centralBaseline.id}:${centralScenario}:independent`,modeledDamage=damageAt(centralKey);
 const baselineMissing=TYPES.filter(t=>Number(profile.ratios?.[t])>0).flatMap(t=>['attack','lethality'].filter(stat=>combatBaselineInput(profile,t,stat).value==null).map(stat=>`${t}: permanent ${stat} baseline is absent`));
 const missing=[...objectiveMissing,...baselineMissing,...(!counts?['Entered host troop count/capacity is unavailable']:[]),...TYPES.filter(t=>Number(profile.ratios?.[t])>0).flatMap(t=>!known(inventoryCount(profile,t))||counts&&Number(inventoryCount(profile,t))<counts[t]?[`${t}: planned troops are not verified available`]:[]),...(profile.mixedTiersEnabled?['Mixed-tier battle damage aggregation is unresolved']:[])];
 if(profile.mixedTiersEnabled){objectiveMissing.push('Mixed-tier battle damage aggregation is unresolved');for(const k of Object.keys(damageDimensions))delete damageDimensions[k];}
 const damage={};if(!missing.length)for(const scenario of HOST_SCENARIOS)damage[scenario.id]=damageAt(`finite-111:${scenario.id}:independent`);
 const widgetActive=entries.some(e=>e.contribution.widgetRallyAttack>0||e.contribution.widgetRallyLethality>0);
 const uncertainties=[...new Set([...effects.flatMap(e=>e.unresolved??[]),...incomingContexts.flatMap(c=>contextEffects.get(c.id).flatMap(e=>e.unresolved)),...TYPES.flatMap(t=>troops[t].effects.flatMap(e=>(e.uncertainties??[]).map(u=>`${e.name}: ${u}`))),...(widgetActive?mechanics.widget.unresolved:[]),'Troop skill/hero extra-attack correlation and counter timing',...TYPES.flatMap(t=>troops[t].conflicts.map(c=>`${t} T${c.tier} TG${c.tg}: published base Attack differs by one point`))])];
 return {incomingContexts:incomingContexts.map(c=>({...c,effects:contextEffects.get(c.id)})),centralIncomingContext:centralIncoming.id,incomingContextDamage:Object.fromEntries(incomingContexts.map(c=>[c.id,damageAt(`${centralBaseline.id}:${centralScenario}:independent${c.id===centralIncoming.id?'':':'+c.id}`)])),dimensions,classes,eventSummaries,effects,gaps,missing,objectiveMissing,troops,baselineCases:baselines,baselineInputs:Object.fromEntries(TYPES.map(t=>[t,Object.fromEntries(['attack','lethality'].map(stat=>[stat,combatBaselineInput(profile,t,stat)]))])),get damageKeys(){return getDamageKeys();},damageAt,get damageDimensions(){return materializeDamage();},unresolvedTroopTerms,
  modeledDamage:profile.mixedTiersEnabled?null:modeledDamage,centralKey,units:counts?'community Bear-example damage units':'formation-relative damage units',
  estimated:baselineMissing.length>0||uncertainties.length>0,damage:missing.length?null:damage,
  scenarioAssumptions:HOST_SCENARIOS,assumptions:['Incoming contexts specify selected primary skills only; levels and mixes are assumptions, not player inputs or probabilities. Own outgoing joining squads are excluded','Incoming Vivian additive versus strongest-only overlap are sensitivity assumptions, not verified stacking rules',...(trace?['Hypothetical Vivian attack sequence supplied for audit; not verified or used for production selection']:[]),...(volley&&!volley.stageVerified?['Volley 10% is a conditional generic-source case; exact entered tier/TG applicability remains unresolved. Zero/20%/100% cases test that assumption without editing troop inputs']:[]),'Canonical troop attack order is Infantry/Cavalry/Archer, independent of hero portrait order; Volley branches advance Focus Fire only','Petra forward-round case applies its first proc to the current and subsequent hits, expires at round end; lifetime/apply timing remains assumed',...effects.filter(e=>e.hostFamilyAssumption).map(e=>`${e.hero}: ${e.name} hosting operation family is a transfer assumption`),...(baselineMissing.length?['Missing permanent bonuses use finite 200/500/1000pp sensitivity assumptions; these are not player values']:[]),...(!counts?['Only formation-relative damage can be compared without march size']:[])],
  uncertainties,coverageComplete:!missing.length&&!uncertainties.length,scope:objectiveMissing.length?'Unranked: known stat/effect subtotals only; unresolved effects are excluded from totals, not valued as zero':'Estimated total Bear damage for the entered formation; finite baseline and mechanic variations flag uncertainty separately'};
}
// A class-local unknown is not a common factor of I + C + A. Cancellation
// requires identical Archer contribution and identical offensive trigger logic.
export function compareWithUnknownTroopEffect(a,b){
 const av=a?.unresolvedTroopTerms??{},bv=b?.unresolvedTroopTerms??{},keys=Object.keys(av);
 if(!keys.length||keys.length!==Object.keys(bv).length)return {permitted:false,reason:'No matching single-unknown decomposition'};
 const operations=effects=>JSON.stringify(effects.filter(e=>!e.excluded).map(e=>({hero:e.hero,skill:e.skill,scope:e.scope,family:e.family,kind:e.kind,value:e.value,probability:e.probability,probabilityByLevel:e.probabilityByLevel,period:e.period,unresolved:e.unresolved})).sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y))));
 if(operations(a.effects)!==operations(b.effects))return {permitted:false,reason:'Different offensive trigger or stacking logic could interact with Howling Wind'};
 const deltas=[];
 for(const key of keys){
  if(!bv[key]||Math.abs(av[key].affectedCoefficient-bv[key].affectedCoefficient)>Math.max(1,Math.abs(av[key].affectedCoefficient))*1e-12)return {permitted:false,reason:'Unknown Archer contribution differs; it cannot cancel from the total'};
  deltas.push(av[key].knownTotal-bv[key].knownTotal);
 }
 return {permitted:true,relation:deltas.every(d=>d>=0)?deltas.some(d=>d>0)?'a-dominates':'tie':deltas.every(d=>d<=0)?'b-dominates':'scenario-tradeoff',
  justification:'D_A − D_B = (I_A + C_A) − (I_B + C_B): the identical Archer term cancels. Offensive trigger logic is unchanged.',
  scope:'Pairwise difference only; no total damage or proc magnitude is inferred',remainingUncertainty:'Changes to Archer contribution, stacking, or extra-attack trigger logic require a new comparison'};
}
// Reproduces the cited T6 TG0 Bear example only. No unrelated PvP simulator.
export function bearExampleDamage(counts,baseStats,factors,rounds=mechanics.bear.rounds){
 const total=TYPES.reduce((n,t)=>n+counts[t],0),armyMin=Math.min(total,mechanics.bear.targetCount);
 const defense=mechanics.bear.targetDefense*mechanics.bear.targetHealth/100;
 return rounds*TYPES.reduce((n,t)=>n+Math.sqrt(counts[t]*armyMin)*baseStats[t].attack*baseStats[t].lethality/100/defense/100*factors[t]*(t==='archer'?mechanics.bear.archerMultiplier:1),0);
}
export function joiningBearComparison(role){
 const records=heroBearEffects(role.hero,'joining'),effects=records.effects.filter(e=>!e.excluded),dimensions={},missing=[...records.gaps];
 for(const context of mechanics.comparisonScenarios.joiningContexts)for(const scenario of HOST_SCENARIOS){
  let withLeader=0,withoutLeader=0;
  for(let round=0;round<mechanics.bear.rounds;round++){
   const baseline={...context.families},offers=[];
   for(const effect of context.periodicEffects??[])baseline[effect.family]=(baseline[effect.family]??0)+(periodicActive(round+1,effect.period,scenario.offset)?effect.value:0);
   for(const effect of effects){
    if(!context.selected||context.duplicateSkills.includes(`${effect.hero}:${effect.skill}`)&&effect.duplicateRule==='nonstacking')continue;
    const value=magnitude(effect,scenario,round,3);
    if(value==null||!Number.isFinite(value)){missing.push(`${effect.hero}: ${effect.name} expected contribution is unresolved`);continue;}
    if(effect.scope!=='all'){missing.push(`${effect.hero}: joining class mix is not known`);continue;}
    offers.push({family:familyFor(effect,scenario),value});
   }
   withLeader+=familyMultiplier(offers,baseline);withoutLeader+=familyMultiplier([],baseline);
  }
  dimensions[`${context.id}:${scenario.id}`]=withLeader/withoutLeader;
 }
 return {dimensions,effects,missing:[...new Set(missing)],uncertainties:[...new Set(effects.flatMap(e=>e.unresolved??[]))],activationEvidence:'Official Combat FAQ includes four selected member primary skills; no Yang-specific exclusion established. Exact Avalanche timing and duplicate behavior are not independently verified.',contexts:mechanics.comparisonScenarios.joiningContexts,assumption:'Each leader enters a separate rally; contexts have no assigned probabilities. Captain stats are not supplied and are not invented.'};
}
export function planBearDimensions(host,leaders){
 const values={};
 if(host){
  // Total hosting damage only. Per-class factors are development details,
  // never individual plan-selection targets or equal-weighted join tradeoffs.
  for(const [key,value] of Object.entries(host.bear.damageDimensions??{}))values[`host-damage-scenario:${key}`]=value;
 }
 // A separate marginal value for each joined rally. Sorting within a context
 // represents exchangeable random destinations, never a combined family total.
 const joins=leaders.map(l=>l.bear??joiningBearComparison(l));
 for(const key of Object.keys(joins[0]?.dimensions??{}))joins.map(j=>j.dimensions[key]).sort((a,b)=>a-b).forEach((value,i)=>values[`separate-join:${key}:${i}`]=value);
 return values;
}
export function dimensionDominates(a,b){
 const keys=Object.keys(b);return keys.length>0&&keys.every(k=>known(a[k])&&known(b[k])&&a[k]>=b[k]-1e-10)&&keys.some(k=>a[k]>b[k]+1e-10);
}
// Same dominance criterion as materialized damage dictionaries, evaluated
// lazily. Rejecting a losing central case avoids thousands of irrelevant
// sensitivity calculations while preserving every supported comparison.
export function hostDamageDominates(a,b){
 if(!Number.isFinite(a?.modeledDamage)||!Number.isFinite(b?.modeledDamage)||a.modeledDamage<b.modeledDamage-1e-10)return false;
 const keys=b.damageKeys??Object.keys(b.damageDimensions??{});let better=false;
 if(!keys.length)return false;
 for(const key of keys){const av=a.damageAt?a.damageAt(key):a.damageDimensions[key],bv=b.damageAt?b.damageAt(key):b.damageDimensions[key];if(!known(av)||!known(bv)||av<bv-1e-10)return false;if(av>bv+1e-10)better=true;}
 return better;
}
