import {heroIdentity} from './host-comparison.mjs';
import {supportedJoiningPlans,assembleJoiningSquads} from './joint-plan.mjs';
import {joiningRole,roleEligible} from './hero-roles.mjs';
import {pusherParticipates,usesSharedMaximum,usesActualMarchInputs,actualMarchCapacity} from './march-capacity-inputs.mjs';
import {hasAccountBaseCapacity} from './input-defaults.mjs';
import capacityData from './data/hero-capacity.json' with {type:'json'};
import {TYPES,split} from './engine.mjs';
import {inventoryCount} from './troop-inventory.mjs';

const whole=n=>n!==null&&n!==undefined&&n!==''&&Number.isInteger(Number(n))&&Number(n)>=0;
export const heroCapacity=level=>whole(level)?capacityData.deploymentByLevel[Number(level)]??null:null;
export const capacitySource=capacityData.source;
export const marchEligible=roleEligible;

function capacityFor(profile,heroes,fallback,effects,pusher=false,legacy=false){
  if(!legacy&&whole(fallback)&&Number(fallback)>0)return {capacity:Number(fallback),basis:'actual in-game fallback'};
  const heroValues=heroes.map(h=>h?heroCapacity(h.level):null);
  if(hasAccountBaseCapacity(profile)&&(!pusher?heroes.length===3&&heroValues.every(whole):true))return {capacity:Number(profile.accountBaseCapacity)+(pusher?0:heroValues.reduce((a,b)=>a+b,0))+effects.deploy,basis:'derived'};
  if(whole(fallback)&&Number(fallback)>0)return legacy?{capacity:Number(fallback)+effects.deploy,basis:'saved base plus modeled deployment bonus; review'}:{capacity:Number(fallback),basis:'actual in-game fallback'};
  return {capacity:null,basis:'missing actual in-game capacity or account base'};
}
function candidateList(profile,used,classes){
  return profile.heroes.filter(h=>marchEligible(h)&&classes.includes(h.troop)&&!used.has(heroIdentity(h)))
    .sort((a,b)=>(heroCapacity(b.level)??-1)-(heroCapacity(a.level)??-1)||a.name.localeCompare(b.name));
}
export function assignMarchHeroes(profile,hostTeam=[],jointAssignment=null){
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
  const assignment=assignMarchHeroes(profile,hostTeam,jointAssignment);
  const rows=[];
  if(usesActualMarchInputs(profile)){
    if(profile.hostEnabled)rows.push({name:'Host',heroes:assignment.host,capacity:actualMarchCapacity(profile,'host'),basis:usesSharedMaximum(profile)?'approximate common maximum':'actual in-game capacity'});
    assignment.joins.forEach((row,i)=>rows.push({...row,capacity:actualMarchCapacity(profile,'join',i),basis:usesSharedMaximum(profile)?'approximate common maximum':'actual in-game capacity',joinIndex:i}));
    if(pusherParticipates(profile))rows.push({name:'Hero-free pusher',heroes:[],capacity:actualMarchCapacity(profile,'pusher'),basis:'pusher capacity not estimated',targetExcluded:usesSharedMaximum(profile)});
  }else{
  if(profile.hostEnabled){const info=capacityFor(profile,assignment.host,profile.hostCapacity,effects,false,profile.capacityInputMode==='legacy-base');rows.push({name:'Host',heroes:assignment.host,...info});}
  assignment.joins.forEach((row,i)=>{const individual=whole(row.joiner?.capacity)&&Number(row.joiner.capacity)>0;const info=capacityFor(profile,row.heroes,individual?row.joiner.capacity:profile.joinCapacity,effects,false,!individual&&profile.capacityInputMode==='legacy-base');rows.push({...row,...info,joinIndex:i});});
  if(pusherParticipates(profile)){const info=capacityFor(profile,[],profile.pusherCapacity,effects,true,profile.capacityInputMode==='legacy-base');rows.push({name:'Hero-free pusher',heroes:[],...info});}
  }
  // Targets and inventory allocations are planning amounts, not troops accepted by a rally.
  const remaining=Object.fromEntries(TYPES.map(t=>[t,inventoryCount(profile,t)]));
  const needed=Object.fromEntries(TYPES.map(t=>[t,0]));
  let blocked=false;
  for(const row of rows){
    if(row.targetExcluded){row.target=null;row.available=null;row.gap=null;row.fill=null;continue;}
    if(!whole(row.capacity)||Number(row.capacity)<1){row.target=null;row.available=null;row.gap=null;row.fill=null;blocked=true;continue;}
    row.target=split(row.capacity,profile.ratios);
    if(blocked||TYPES.some(t=>row.target[t]>0&&!whole(remaining[t]))){row.available=null;row.gap=null;row.fill=null;blocked=true;continue;}
    row.available={};row.gap={};
    for(const t of TYPES){needed[t]+=row.target[t];row.available[t]=row.target[t]===0?0:Math.min(row.target[t],remaining[t]);if(whole(remaining[t]))remaining[t]-=row.available[t];row.gap[t]=row.target[t]-row.available[t];}
    row.fill=TYPES.reduce((sum,t)=>sum+row.available[t],0)/row.capacity;
  }
  const totalsKnown=!blocked;
  const shortage=Object.fromEntries(TYPES.map(t=>[t,totalsKnown?(needed[t]===0?0:Math.max(0,needed[t]-Number(inventoryCount(profile,t)))):null]));
  return {marches:rows,needed:totalsKnown?needed:null,remaining,shortage,assignment,issues:assignment.issues,capacityComplete:rows.filter(r=>!r.targetExcluded).every(r=>whole(r.capacity)),targetMarchCount:rows.filter(r=>!r.targetExcluded).length,totalsKnown};
}

// Inventory volume at 10/10/80 is not an estimate of deployment capacity.
export function inventorySupportedTotal(profile){
 const values=TYPES.map(t=>inventoryCount(profile,t));
 if(!values.every(whole))return null;
 return Math.floor(Math.min(Number(values[0])*10,Number(values[1])*10,Number(values[2])*5/4));
}
