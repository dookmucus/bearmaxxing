import {heroIdentity} from './host-comparison.mjs';
import {supportedJoiningPlans,assembleJoiningSquads} from './joint-plan.mjs';
import {joiningRole,joiningEligible,compareJoiningFillers} from './hero-roles.mjs';
import {comparisonProfile,inventoryGroups} from './inventory-planning.mjs';
import capacityData from './data/hero-capacity.json' with {type:'json'};
import {TYPES} from './engine.mjs';
import {inventoryCount} from './troop-inventory.mjs';

const whole=n=>n!==null&&n!==undefined&&n!==''&&Number.isInteger(Number(n))&&Number(n)>=0;
export const heroCapacity=level=>whole(level)?capacityData.deploymentByLevel[Number(level)]??null:null;
export const capacitySource=capacityData.source;
export const marchEligible=joiningEligible;

function candidateList(profile,used,classes){
  return profile.heroes.filter(h=>marchEligible(h)&&classes.includes(h.troop)&&!used.has(heroIdentity(h)))
    .sort(compareJoiningFillers);
}
export function assignMarchHeroes(profile,hostTeam=[],jointAssignment=null){
 profile=comparisonProfile(profile);
 if(jointAssignment)return withMissingLeaderSlots(profile,{...jointAssignment,joins:[...jointAssignment.joins],issues:[...jointAssignment.issues]});
 const host=profile.hostEnabled?hostTeam.filter(Boolean):[];
 const selection=supportedJoiningPlans(profile,host).plans[0];
 if(selection)return selection.assignment;
 const used=new Set(host.map(e=>heroIdentity(e.hero??e)));
 const roles=profile.heroes.filter(h=>marchEligible(h)&&!used.has(heroIdentity(h))).map(joiningRole).filter(r=>!r.rejection).sort((a,b)=>Number(b.coverageComplete)-Number(a.coverageComplete)||String(a.id).localeCompare(String(b.id))).slice(0,profile.joinCount);
 const partial=assembleJoiningSquads(profile,host,roles,true);
 const result=partial??{host:host.map(e=>e.hero??e),joins:[],issues:[]};
 return withMissingLeaderSlots(profile,result);
}
function withMissingLeaderSlots(profile,result){
 // Troop planning retains requested march slots. Results only shows squads
 // with an entered leader; these empty slots do not invent a recommendation.
 while(result.joins.length<profile.joinCount){const index=result.joins.length;result.joins.push({name:`Join ${index+1}`,heroes:[null,null,null],equivalent:[[],[],[]],manual:[false,false,false],joiner:{...profile.joiners?.[index],name:''}});result.issues.push(`Join ${index+1}: no available supported joining leader.`);}
 return result;
}
export function availableFillers(profile,assignment,joinIndex,slot){
  const row=assignment.joins[joinIndex];if(!row?.heroes[0]||![1,2].includes(slot))return [];
  const occupied=new Set([...assignment.host,...assignment.joins.flatMap(r=>r.heroes.filter((h,i)=>i===0||r.manual[i]))].filter(Boolean).map(heroIdentity));
  const current=row.heroes[slot];if(current)occupied.delete(heroIdentity(current));
  const other=slot===1?2:1;
  const classes=TYPES.filter(t=>t!==row.heroes[0].troop&&(!row.manual[other]||t!==row.heroes[other]?.troop));
  return candidateList(profile,occupied,classes);
}
export function completeMarchPlan(profile,hostTeam,effects,jointAssignment=null){
 profile=comparisonProfile(profile);
 const assignment=assignMarchHeroes(profile,hostTeam,jointAssignment);
 const marches=[{name:'Host',heroes:assignment.host},...assignment.joins.map((row,joinIndex)=>({...row,joinIndex}))]
  .map(row=>({...row,capacity:null,basis:'deployment count unknown',target:null,available:null,gap:null,fill:null}));
 return {marches,needed:null,remaining:Object.fromEntries(TYPES.map(t=>[t,inventoryCount(profile,t)])),shortage:Object.fromEntries(TYPES.map(t=>[t,null])),assignment,issues:assignment.issues,capacityComplete:false,targetMarchCount:4,totalsKnown:false};
}
// Kept for callers of the inventory helper; never a march-capacity estimate.
export function inventorySupportedTotal(profile){return inventoryGroups(profile,1).totalPerGroup;}
