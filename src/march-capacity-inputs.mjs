import {englishMessage} from './english-messages.mjs';
export const usesSharedMaximum=p=>p.capacityPlanningModel==='shared-maximum';
export const pusherParticipates=p=>!usesSharedMaximum(p)&&p.pusherEnabled===true;
export const positiveCapacity=value=>value!==null&&value!==undefined&&value!==''&&typeof value!=='boolean'&&Number.isInteger(Number(value))&&Number(value)>0;
export const usesActualMarchInputs=p=>Object.hasOwn(p,'troopsPerMarch');
export const CAPACITY_PROMPT=englishMessage('validation.capacityPrompt');
const marchTypes=['infantry','cavalry','archer'];
const nonnegativeWhole=value=>value==null||value===''||typeof value!=='boolean'&&Number.isSafeInteger(Number(value))&&Number(value)>=0;
export function maximumMarchSize(p){
  if(!Object.hasOwn(p,'marchSizeByType'))return positiveCapacity(p.troopsPerMarch)?Number(p.troopsPerMarch):null;
  const values=marchTypes.map(t=>p.marchSizeByType?.[t]??0);
  if(!values.every(nonnegativeWhole))return null;
  const total=values.reduce((sum,value)=>sum+Number(value??0),0);
  return Number.isSafeInteger(total)&&total>0?total:null;
}
export function setMarchSizeByType(p,troop,value){
  if(!marchTypes.includes(troop))return p;
  const next={...p,marchSizeByType:{infantry:0,cavalry:0,archer:0,...p.marchSizeByType,[troop]:value},capacityInputProvenance:'user-confirmed class counts for shared maximum'};
  if(!Object.hasOwn(p,'marchSizeByType'))next.legacyMaximumMarchSize??=p.troopsPerMarch;
  next.troopsPerMarch=maximumMarchSize(next)??0;
  return next;
}
export function marchSizeInputError(p){
  if(Object.hasOwn(p,'marchSizeByType')){
    for(const t of marchTypes)if(!nonnegativeWhole(p.marchSizeByType?.[t]))return englishMessage("messages.march.capacity.inputs.marchSizeInputError.enter.a.whole.nonnegative.maximum.march.count.for.or.enter",{t:t});
    const sum=marchTypes.reduce((total,t)=>total+Number(p.marchSizeByType?.[t]??0),0);
    if(!Number.isSafeInteger(sum))return englishMessage("messages.march.capacity.inputs.marchSizeInputError.maximum.march.size.exceeds.the.supported.whole.number.range");
    return null;
  }
  return p.troopsPerMarch!=null&&p.troopsPerMarch!==''&&Number(p.troopsPerMarch)!==0&&!positiveCapacity(p.troopsPerMarch)?englishMessage("messages.march.capacity.inputs.marchSizeInputError.enter.a.whole.nonnegative.maximum.march.size.or.leave.it"):null;
}
export function actualMarchCapacity(p,kind,index=0){
  if(usesSharedMaximum(p))return kind==='pusher'?null:maximumMarchSize(p);
  if(kind==='pusher'){
    if(p.actualPusherCapacity===null||p.actualPusherCapacity!=null&&Number(p.actualPusherCapacity)!==0&&!positiveCapacity(p.actualPusherCapacity))return null;
    if(positiveCapacity(p.actualPusherCapacity))return Number(p.actualPusherCapacity);
  }else if(p.differentMarchCapacities){
    const value=kind==='host'?p.actualMarchCapacities?.host:p.actualMarchCapacities?.joins?.[index];
    if(value===null||value!=null&&Number(value)!==0&&!positiveCapacity(value))return null; // A retained unresolved value needs confirmation.
    if(positiveCapacity(value))return Number(value);
  }
  return positiveCapacity(p.troopsPerMarch)?Number(p.troopsPerMarch):null;
}
export function plannedCapacityMissing(p){
  if(usesSharedMaximum(p))return false; // Capacity is optional in the current planner.
  if(usesActualMarchInputs(p))return (p.hostEnabled&&actualMarchCapacity(p,'host')===null)
    ||Array.from({length:p.joinCount??3},(_,i)=>actualMarchCapacity(p,'join',i)).some(n=>n===null)
    ||(p.pusherEnabled&&actualMarchCapacity(p,'pusher')===null);
  if(positiveCapacity(p.accountBaseCapacity))return false;
  return (p.hostEnabled&&!positiveCapacity(p.hostCapacity))
    ||Array.from({length:p.joinCount??3},(_,i)=>positiveCapacity(p.joiners?.[i]?.capacity)?false:!positiveCapacity(p.joinCapacity)).some(Boolean)
    ||(p.pusherEnabled&&!positiveCapacity(p.pusherCapacity));
}
export function setSharedMarchCapacity(p,value){
  if(usesSharedMaximum(p))return {...p,troopsPerMarch:value,capacityInputProvenance:'user-confirmed shared maximum'};
  const resolve=n=>n===null&&positiveCapacity(value)?0:n;
  return {...p,troopsPerMarch:value,
    actualMarchCapacities:{host:resolve(Object.hasOwn(p.actualMarchCapacities??{},'host')?p.actualMarchCapacities.host:0),joins:(p.actualMarchCapacities?.joins??[]).map(resolve)},
    actualPusherCapacity:p.actualPusherCapacity===null&&positiveCapacity(value)?0:p.actualPusherCapacity,
    capacityConfirmation:positiveCapacity(value)?[]:p.capacityConfirmation,
    capacityInputProvenance:'user-confirmed actual'};
}
export function setIndividualMarchCapacity(p,kind,index,value){
  const next={...p,troopsPerMarch:p.troopsPerMarch??0,capacityInputProvenance:'user-confirmed actual'};
  if(kind==='pusher')next.actualPusherCapacity=value;
  else{
    next.differentMarchCapacities=true;
    const current=p.actualMarchCapacities??{host:0,joins:[]};
    next.actualMarchCapacities={...current,joins:[...(current.joins??[])]};
    if(kind==='host')next.actualMarchCapacities.host=value;
    else next.actualMarchCapacities.joins[index]=value;
  }
  const key=kind==='join'?`join-${index}`:kind;
  next.capacityConfirmation=(p.capacityConfirmation??[]).filter(item=>item.key!==key);
  return next;
}
