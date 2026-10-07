import {inventoryCount} from './troop-inventory.mjs';

export const BEAR_FORMATION=Object.freeze({infantry:10,cavalry:10,archer:80});
const types=Object.keys(BEAR_FORMATION);
const normalizedProfiles=new WeakMap();
// Removed configuration remains saved, but cannot enter the active assessment.
export function comparisonProfile(profile){
 if(profile.capacityPlanningModel==='inventory-groups'&&profile.hostEnabled===true&&profile.joinCount===3&&profile.marchSlots===4&&types.every(t=>profile.ratios?.[t]===BEAR_FORMATION[t]))return profile;
 const cached=normalizedProfiles.get(profile),keys=Object.keys(profile);
 if(cached&&keys.length===Object.keys(cached.inputs).length&&keys.every(key=>cached.inputs[key]===profile[key]))return cached.profile;
 const normalized={...profile,ratios:{...BEAR_FORMATION},hostEnabled:true,joinCount:3,marchSlots:4,capacityPlanningModel:'inventory-groups'};
 normalizedProfiles.set(profile,{inputs:{...profile},profile:normalized});
 return normalized;
}
const whole=value=>value!==null&&value!==undefined&&value!==''&&typeof value!=='boolean'&&Number.isSafeInteger(Number(value))&&Number(value)>=0;
export function inventoryGroups(profile,groups){
 if(![1,3,4,5].includes(groups))throw new Error('Unsupported inventory group count');
 const inventory=Object.fromEntries(types.map(t=>[t,inventoryCount(profile,t)]));
 if(types.some(t=>!whole(inventory[t])))return {groups,known:false,blocks:null,perGroup:null,totalPerGroup:null,limiting:[],used:null,unused:null};
 const limits={infantry:Math.floor(Number(inventory.infantry)/groups),cavalry:Math.floor(Number(inventory.cavalry)/groups),archer:Math.floor(Number(inventory.archer)/(8*groups))};
 const blocks=Math.min(...Object.values(limits));
 const perGroup={infantry:blocks,cavalry:blocks,archer:8*blocks};
 const used=Object.fromEntries(types.map(t=>[t,groups*perGroup[t]]));
 return {groups,known:true,blocks,perGroup,totalPerGroup:10*blocks,limiting:types.filter(t=>limits[t]===blocks),used,unused:Object.fromEntries(types.map(t=>[t,Number(inventory[t])-used[t]]))};
}
