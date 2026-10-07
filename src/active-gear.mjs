import {englishMessage} from './english-messages.mjs';
// Stable editor IDs define active inventory. Other saved pieces remain reference data.
export const PRIMARY_GEAR_TYPES=['infantry','cavalry','archer'];
export const PRIMARY_GEAR_SLOTS=['helmet','boots','gloves','armor'];
export const PRIMARY_GEAR_IDS=PRIMARY_GEAR_TYPES.flatMap(t=>PRIMARY_GEAR_SLOTS.map(s=>`set-${t}-${s}`));
export function primaryGearLocation(id){
 if(!PRIMARY_GEAR_IDS.includes(id))return null;
 const [,troop,slot]=id.split('-');return {troop,slot};
}
export function activeGearInventory(profile){return (profile.gear??[]).filter(g=>primaryGearLocation(g.id));}
export function activeGearLabel(gear){
 const location=primaryGearLocation(gear.id);
 return location?`${location.troop==='archer'?'Archer':location.troop[0].toUpperCase()+location.troop.slice(1)} ${location.slot}`:'Equipment piece';
}
export function activeGearInventoryIssues(profile){
 const pieces=activeGearInventory(profile),issues=[];
 for(const id of PRIMARY_GEAR_IDS){
  const matches=pieces.filter(g=>g.id===id),location=primaryGearLocation(id),label=activeGearLabel({id});
  if(!matches.length){issues.push(englishMessage("messages.active.gear.activeGearInventoryIssues.primary.piece.is.missing.review.gear",{label:label}));continue;}
  if(matches.length!==1){issues.push(englishMessage("messages.active.gear.activeGearInventoryIssues.each.equipment.instance.needs.a.unique.id.duplicate.primary.pieces",{label:label}));continue;}
  const g=matches[0];
  if(g.troop!==location.troop)issues.push(englishMessage("messages.active.gear.activeGearInventoryIssues.troop.class.must.match.its.primary.id",{label:label,troop:location.troop}));
  if(g.slot!==location.slot)issues.push(englishMessage("messages.active.gear.activeGearInventoryIssues.slot.must.match.its.primary.id",{label:label,slot:location.slot}));
 }
 return issues;
}
