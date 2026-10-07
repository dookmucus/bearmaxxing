import {primaryGearLocation,activeGearLabel} from './active-gear.mjs';
import {includedHostCandidates,compareHosts,heroIdentity} from './host-comparison.mjs';
import {calculate,accountEffects} from './calculator.mjs';
import {heroContributions} from './hero-effects.mjs';
import {heroReferenceName} from './hero-identity.mjs';
import {heroSkillSlots,effectiveSkillLevel} from './hero-skill-unlocks.mjs';
import {TYPES} from './engine.mjs';
import {inventoryGroups} from './inventory-planning.mjs';
import {masterInputDetails,masterEffects,masterResearchDetails} from './master-effects.mjs';
import {petLevelEffect,petActiveEffect} from './pet-effects.mjs';
import {gearProgression,gearIssues} from './gear-progression.mjs';
import {TROOP_REFERENCE} from './bear-troops.mjs';
import {BEAR_MECHANICS,compareWithUnknownTroopEffect} from './bear-comparison.mjs';
import {combatBaselineInput} from './input-defaults.mjs';
import {actionableImprovements} from './results-improvements.mjs';
import {improvementCopy} from './results-copy.mjs';

// Explicit allowlist: never copy the profile wholesale, identifiers from imports,
// credentials, user notes, or unrelated account data.
export function calculationDiagnostics(profile){
 const comparison=compareHosts(profile,accountEffects(profile));
 const hosting=calculate(profile,'hosting');
 const joining=calculate(profile,'joining'),upgrades=calculate(profile,'upgrades');
 const displayedImprovements=actionableImprovements(profile,{hosting,joining,upgrades},accountEffects);
 const eligible=new Set(includedHostCandidates(profile).flat());
 // Factor repeated matrices once per host/joining-leader set. Every legal plan
 // stays present; never serialize the same 8,000+ hosting cases per join trio.
 const hostKey=o=>o.host?.team.map(e=>heroIdentity(e.hero)).join('|')??'none';
 const joinKey=o=>o.leaders.map(l=>l.id).sort().join('|');
 const hostingComparisons=Object.fromEntries((hosting.joint?.comparison.options??[]).map(host=>{
  const key=host.team.map(e=>heroIdentity(e.hero)).join('|');
  return [key,{host:host.team.map(e=>heroIdentity(e.hero)),hostingDamage:host.bear.modeledDamage,centralKey:host.bear.centralKey,classes:host.bear.classes,incomingContextDamage:host.bear.incomingContextDamage,effects:host.bear.effects,objectiveMissing:host.bear.objectiveMissing,ordinaryStats:host.team.map(e=>({heroId:heroIdentity(e.hero),troop:e.hero.troop,attack:e.attack,lethality:e.lethality})),scope:host.bear.scope}];
 }));
 const joiningComparisons={};
 for(const option of hosting.joint?.comparisons??[])joiningComparisons[joinKey(option)]??={leaders:option.leaders.map(l=>l.id),dimensions:option.metrics.joinDimensions};
 return {
  version:4,scope:hosting.joint?.scope??comparison.scope,
  bearModel:{references:BEAR_MECHANICS,troopReference:TROOP_REFERENCE,sensitivity:hosting.joint?.selected?.sensitivity??null,selectedHosting:hosting.joint?.canRecommend?hosting.joint.selected?.host?.bear??null:null,unrankedArrangement:hosting.joint?.canRecommend===false?{hosting:hosting.joint.selected?.host?.bear??null,key:hosting.joint.selected?.key??null}:null,objective:hosting.joint?.objective,selectionStatus:hosting.joint?.selectionStatus,scenarioRegret:hosting.joint?.selected?.scenarioRegret??null,selectedJoining:hosting.joint?.canRecommend?hosting.joint.selected.leaders.map(role=>({heroId:role.id,...role.bear})):[]},
  selectionStatus:hosting.joint?.selectionStatus??'comparison unavailable',
  unresolvedCandidates:hosting.joint?.unresolvedCandidates??[],
  recommendationEstablished:hosting.joint?.canRecommend??false,
  displayedImprovements:displayedImprovements.map(item=>({id:item.id,...improvementCopy(item,profile),resource:item.resource,target:item.target,verifiedCost:item.verifiedCost??null,resourceEfficiency:item.resourceEfficiency??null,modelComparison:item.modelComparison??null})),
  incomingHosting:{centralContext:hosting.joint?.selected?.host?.bear.centralIncomingContext,contexts:hosting.joint?.selected?.host?.bear.incomingContexts,damageByContext:hosting.joint?.selected?.host?.bear.incomingContextDamage,outgoingSquadsIncluded:false},
  baselineInputs:Object.fromEntries(TYPES.map(t=>[t,Object.fromEntries(['attack','lethality'].map(stat=>[stat,combatBaselineInput(profile,t,stat)]))])),
  blockingValidation:hosting.blockingValidation??hosting.missing??[],
  referenceGaps:comparison.gaps,
  selectedHost:hosting.team?.map(({hero})=>heroIdentity(hero))??null,
  combatBaselines:Object.fromEntries(TYPES.map(t=>[t,{attack:profile.stats?.[t]?.attack??null,lethality:profile.stats?.[t]?.lethality??null}])),
  sharedEffects:{hosting:accountEffects(profile,'hosting'),joining:accountEffects(profile,'joining')},
  masters:(profile.masters??[]).map(m=>({id:m.id,name:m.name,affinityLevel:m.affinityLevel,squadBonus:m.squadBonus,talentLevel:m.talentLevel,skillLevels:Object.fromEntries([1,2,3,4].map(slot=>[slot,m.skillLevels?.[slot]??null])),deployLevel:m.deployLevel,rallyLevel:m.rallyLevel,specialResearchProgress:m.specialResearchProgress,effectCoverage:{details:masterInputDetails(m),effects:masterEffects(m),research:masterResearchDetails(m)},attack:m.attack,lethality:m.lethality,deploy:m.deploy,rally:m.rally})),
  pets:(profile.pets??[]).map(p=>({id:p.id,canonicalPetId:p.canonicalPetId,name:p.name,level:p.level,levelSource:p.levelSource,advancementConfirmed:p.advancementConfirmed,advancementSource:p.advancementSource,effectCoverage:{passive:petLevelEffect(p),active:petActiveEffect(p)},refinement:Object.fromEntries(TYPES.map(t=>[t,p.refinement?.[t]??null]))})),
  petRefinement:{mode:'combined-stats',archivedMode:profile.petRefinementMode,individualContributionsIncluded:false,combined:Object.fromEntries(['attack',...TYPES].map(t=>[t,profile.combinedPetRefinement?.[t]??null])),sources:Object.fromEntries(['attack',...TYPES].map(t=>[t,profile.combinedPetRefinementSources?.[t]?.source??null]))},
  troops:Object.fromEntries(TYPES.map(t=>[t,{count:profile.troops?.[t]?.count??null,tier:profile.troops?.[t]?.tier??null,tg:profile.troops?.[t]?.tg??null}])),
  mixedTiersEnabled:profile.mixedTiersEnabled,
  tierInventory:Object.fromEntries(TYPES.map(t=>[t,Object.fromEntries(Array.from({length:11},(_,i)=>[i+1,profile.tierInventory?.[t]?.[i+1]??null]))])),
  marchPlanning:{model:'inventory-groups',formation:{infantry:10,cavalry:10,archer:80},joining:inventoryGroups(profile,3),hostingAndJoining:inventoryGroups(profile,4),deploymentCount:null,absoluteForecastInScope:false},
  joiningLeaders:hosting.joint?.canRecommend?hosting.joint.selected.leaders.map(l=>l.hero.name):[],
  jointPlan:hosting.joint?{dimensionsEncoding:'Factorized: hosting classes plus common baselines/troop mechanics; joining dimensions keyed by leader set. No plan or effect is truncated.',hostingComparisons,joiningComparisons,selectionStatus:hosting.joint.selectionStatus,recommendationEstablished:hosting.joint.canRecommend,displayedHost:hosting.team?.map(e=>heroIdentity(e.hero))??null,displayedJoiningSquads:hosting.joint.canRecommend?hosting.joint.selected.assignment.joins.map(row=>row.heroes.map(heroIdentity)):[],scenario:hosting.joint.scenario,recommendationUncertainty:hosting.joint.recommendationUncertainty,comparisons:hosting.joint.comparisons.map(option=>({key:option.key,host:option.host?.team.map(e=>heroIdentity(e.hero)),joins:option.assignment.joins.map(row=>row.heroes.map(heroIdentity)),hostIndex:option.host?.index??null,hostingDamage:option.host?.bear.modeledDamage??null,unknownEffectComparisonToArrangement:option.host&&hosting.joint.selected?.host?compareWithUnknownTroopEffect(option.host.bear,hosting.joint.selected.host.bear):null,damageScope:option.host?.bear.units??null,hostingComparisonKey:hostKey(option),joiningComparisonKey:joinKey(option),bearDimensions:Number.isFinite(option.host?.bear.modeledDamage)?{['host-damage-scenario:'+option.host.bear.centralKey]:option.host.bear.modeledDamage}:{},unmappedBearEffects:option.metrics.unknownSignature,offers:option.leaders.map(role=>({heroId:role.id,effects:role.effects})),coverageComplete:option.coverageComplete})),scope:hosting.joint.scope,overallWinner:hosting.joint.overallWinner,evaluated:hosting.joint.evaluated,issues:hosting.joint.issues,leaders:hosting.joint.canRecommend?hosting.joint.selected?.leaders.map(l=>({canonicalHeroId:l.id,skill:l.name,level:l.level,assumed:l.assumed,effects:l.effects,coverageComplete:l.coverageComplete})):[],alternatives:hosting.joint.alternatives.map(a=>({host:a.host?.team.map(e=>heroIdentity(e.hero)),joins:a.assignment.joins.map(r=>r.heroes.map(heroIdentity)),offers:a.leaders.map(l=>({heroId:l.id,effects:l.effects})),coverageComplete:a.coverageComplete}))}:null,
  heroes:profile.heroes.map(h=>{
   const gap=comparison.gaps.find(g=>g.heroId===h.id),effect=heroContributions(h);
   return {canonicalHeroId:heroIdentity(h),displayName:h.name,referenceName:heroReferenceName(h),troop:h.troop,
    owned:h.owned,included:h.included,marchAvailable:h.marchAvailable,eligible:eligible.has(h),
    eligibilityReasons:eligible.has(h)?[]:[h.owned!==true?'Not owned':null,h.included===false?'Excluded from host':null,h.marchAvailable===false?'Unavailable for marches':null,
     !['infantry','cavalry','archer'].includes(h.troop)?'Unknown troop class':null,
     null].filter(Boolean),
    progression:{level:h.level,stars:h.stars,starStep:h.starStep,starStepEncoding:h.starStepEncoding,starStepSource:h.starStepSource,skillLevels:{...h.skillLevels},skillLevelSource:{...h.skillLevelSource},widget:h.widget,
     advancedAttack:h.advancedAttack,advancedLethality:h.advancedLethality,originals:h.progressionOriginals,legacyStarStep:h.legacyStarStep},
    provenance:{owned:h.provenance?.owned,stars:h.provenance?.stars,starStep:h.provenance?.starStep,widget:h.provenance?.widget},
    effectiveSkills:heroSkillSlots(h).map(slot=>{const e=effectiveSkillLevel(h,slot);return {slot,entered:h.skillLevels?.[slot]??null,level:e.level,source:e.source,maximumUnlocked:e.unlock.max,unlockSource:e.unlock.source,unlockAssumption:e.unlock.assumption,conflict:e.conflict};}),
    rejectionReasons:gap?.reasons??[],uncertainty:effect.uncertain,
    effectCoverage:{statuses:effect.effectStatuses,modeled:effect.modeledEffects,irrelevant:effect.irrelevantEffects,assumptions:effect.assumptions,unresolvedOffensive:effect.unresolvedOffensive},
    contributions:{inherentAttack:effect.inherentAttack,widgetLethality:effect.widgetLethality,widgetRallyLethality:effect.widgetRallyLethality,widgetRallyAttack:effect.widgetRallyAttack,offenseCoverageComplete:effect.offenseCoverageComplete}};
  }),
  gear:profile.gear.map(g=>({active:Boolean(primaryGearLocation(g.id)),label:primaryGearLocation(g.id)?activeGearLabel(g):undefined,id:g.id,troop:g.troop,slot:g.slot,quality:g.quality,enhancement:g.enhancement,mastery:g.forge,imbuementConfirmed:{...g.imbuementConfirmed},issues:gearIssues(g),effectCoverage:gearProgression(g)}))
 };
}
