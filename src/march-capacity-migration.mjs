import {accountEffects,capacityHostDraft} from './calculator.mjs';
import {completeMarchPlan} from './march-plan.mjs';
import {masterInputDetails} from './master-effects.mjs';
import {petBuffDetails} from './pet-effects.mjs';
import {positiveCapacity,usesActualMarchInputs} from './march-capacity-inputs.mjs';

function supportedDeployment(p){
 for(const m of p.masters??[]){
  const details=masterInputDetails(m);
  if(m.name==='Cassia'&&details.talentValue===null)return false;
  if(m.name==='Valora'&&details.skills.find(s=>s.slot===4)?.value===null)return false;
  if(Number(m.deploy)>0)return false; // Unclassified saved manual capacity cannot be converted.
 }
 return !petBuffDetails(p).some(effect=>effect.kind==='capacity'&&(effect.issue||(p.pets??[]).some(pet=>pet.id===effect.petId&&pet.advancementSource==='assumed'&&typeof pet.advancementConfirmed==='boolean')));
}
export function normalizeMarchCapacities(p){
 if(usesActualMarchInputs(p))return p;
 const next={...p};
 next.legacyCapacitySetup??=structuredClone({hostCapacity:p.hostCapacity,joinCapacity:p.joinCapacity,pusherCapacity:p.pusherCapacity,accountBaseCapacity:p.accountBaseCapacity,capacityInputMode:p.capacityInputMode,joiners:(p.joiners??[]).map(j=>({name:j.name,capacity:j.capacity}))});
 const present=value=>value!==null&&value!==undefined&&value!==''&&Number(value)!==0;
 const hasSaved=[p.hostCapacity,p.joinCapacity,p.accountBaseCapacity,p.pusherCapacity,...(p.joiners??[]).map(j=>j.capacity)].some(present);
 const effects=accountEffects(p,'joining');
 const oldPlan=completeMarchPlan(p,p.hostEnabled?capacityHostDraft(p)??[]:[],effects);
 const safe=supportedDeployment(p),confirmation=[];
 const convert=(row,key,entered)=>{
  if(present(entered)&&!positiveCapacity(entered)){confirmation.push({key,reason:'Confirm the saved capacity as a positive whole number.'});return null;}
  const direct=row?.basis==='actual in-game fallback';
  if(positiveCapacity(row?.capacity)&&(direct||safe))return Number(row.capacity);
  if(hasSaved)confirmation.push({key,reason:'Enter the actual in-game capacity; the saved value could not be safely converted.'});
  return hasSaved?null:0;
 };
 const inactive=(value,key)=>!present(value)?0:convert({capacity:positiveCapacity(value)?Number(value)+(p.capacityInputMode==='actual'?0:effects.deploy):null,basis:p.capacityInputMode==='actual'?'actual in-game fallback':'saved base'},key,value);
 const host=p.hostEnabled?convert(oldPlan.marches.find(r=>r.name==='Host'),'host',p.hostCapacity):inactive(p.hostCapacity,'host');
 const joins=Array.from({length:p.joinCount??3},(_,i)=>convert(oldPlan.marches.find(r=>r.joinIndex===i),`join-${i}`,present(p.joiners?.[i]?.capacity)?p.joiners[i].capacity:p.joinCapacity));
 const retainedJoins=(p.joiners??[]).slice(joins.length).map((j,i)=>inactive(j.capacity,`join-${joins.length+i}`));
 const values=[...(p.hostEnabled?[host]:[]),...joins];
 next.troopsPerMarch=values.find(positiveCapacity)??0;
 next.actualMarchCapacities={host:positiveCapacity(host)&&Number(host)===Number(next.troopsPerMarch)?0:host,joins:[...joins,...retainedJoins].map(value=>positiveCapacity(value)&&Number(value)===Number(next.troopsPerMarch)?0:value)};
 next.differentMarchCapacities=[host,...joins,...retainedJoins].some(value=>value===null||positiveCapacity(value)&&Number(value)!==Number(next.troopsPerMarch));
 let pusher=p.pusherEnabled?convert(oldPlan.marches.find(r=>r.name==='Hero-free pusher'),'pusher',p.pusherCapacity):0;
 if(!p.pusherEnabled)pusher=inactive(p.pusherCapacity,'pusher');
 next.actualPusherCapacity=pusher;
 next.capacityConfirmation=confirmation;
 next.capacityInputProvenance=hasSaved?'normalized saved actual or supported calculation':'assumed missing';
 return next;
}
