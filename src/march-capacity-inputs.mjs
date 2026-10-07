import {englishMessage} from './english-messages.mjs';
// Compatibility surface for saved files and offline fixtures. Deployment inputs
// are no longer active, even when an old profile has not yet been migrated.
export const usesSharedMaximum=p=>false;
export const usesActualMarchInputs=p=>false;
export const pusherParticipates=p=>false;
export const positiveCapacity=value=>value!==null&&value!==undefined&&value!==''&&typeof value!=='boolean'&&Number.isInteger(Number(value))&&Number(value)>0;
export const CAPACITY_PROMPT=englishMessage('validation.capacityPrompt');
export const maximumMarchSize=p=>null;
export const marchSizeInputError=p=>null;
export const actualMarchCapacity=(p,kind,index=0)=>null;
export const plannedCapacityMissing=p=>false;
export function setSharedMarchCapacity(p,value){return {...p,troopsPerMarch:value};}
export function setMarchSizeByType(p,troop,value){return {...p,marchSizeByType:{...p.marchSizeByType,[troop]:value}};}
export function setIndividualMarchCapacity(p,kind,index,value){
 const current=p.actualMarchCapacities??{host:null,joins:[]};
 if(kind==='pusher')return {...p,actualPusherCapacity:value};
 if(kind==='host')return {...p,actualMarchCapacities:{...current,host:value}};
 const joins=[...(current.joins??[])];joins[index]=value;
 return {...p,actualMarchCapacities:{...current,joins}};
}
