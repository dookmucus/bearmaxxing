import {gearEnhancementXp,normalizeGearQuality,IMBUEMENT_GATES,gearSlotEffect,gearIssues} from './gear-progression.mjs';
export const GEAR_COST_SOURCES={mastery:'https://kingshotoptimizer.com/hero-gear/references/forgehammer-costs/',xp:'https://kingshotoptimizer.com/hero-gear/references/xp-costs/',imbuement:'https://kingshotoptimizer.com/hero-gear/references/imbuement-costs/'};
// Costs stay a vector. Mythic Gear, XP, Mithril and hammers have no invented
// exchange rate. This does not imply that the player's backpack can pay them.
export function gearUpgradeCost(from,to){
 const fq=normalizeGearQuality(from.quality),tq=normalizeGearQuality(to.quality),a=Number(from.enhancement),b=Number(to.enhancement),m=Number(from.forge??0),n=Number(to.forge??0);
 if(gearIssues(from).length||gearIssues(to).length)return null;
 if(![a,b,m,n].every(Number.isInteger)||b<a||n<m||!['purple','gold','red'].includes(fq)||!(fq===tq||fq==='gold'&&tq==='red')||n>20||b>200)return null;
 const quantities={forgeHammers:0,enhancementXp:0,mythicGear:0,mithril:0};
 for(let level=m+1;level<=n;level++){quantities.forgeHammers+=10*level;quantities.mythicGear+=Math.max(0,level-10);}
 if(fq==='gold'&&tq==='red')quantities.mythicGear+=2;
 for(let level=a+1;level<=b;level++){
  const xp=gearEnhancementXp(level);if(xp==null)return null;quantities.enhancementXp+=xp;
  if(tq==='red'&&IMBUEMENT_GATES[level]){quantities.mithril+=IMBUEMENT_GATES[level].mithril;quantities.mythicGear+=IMBUEMENT_GATES[level].mythic;}
 }
 return {verified:true,quantities,sources:GEAR_COST_SOURCES,scope:'Published incremental costs; additional materials are not converted to the primary resource'};
}
// Larger paths are research/planning alternatives, not immediate actions.
// Include health pieces only when a documented class Attack milestone exists.
export function nextGearOffensiveMilestone(gear){
 if(gearIssues(gear).length||!['gold','red'].includes(normalizeGearQuality(gear.quality)))return null;
 const gates=Object.keys(gearSlotEffect(gear).attackMilestones).map(Number).filter(g=>g>Number(gear.enhancement)&&g<200).sort((a,b)=>a-b);
 const target=gates[0];if(!target)return null;
 const candidate={...gear,quality:'red',enhancement:target,forge:Math.max(Number(gear.forge),IMBUEMENT_GATES[target].mastery),imbuementConfirmed:{...gear.imbuementConfirmed}};
 for(const gate of Object.keys(IMBUEMENT_GATES).map(Number).filter(g=>g<=target))candidate.imbuementConfirmed[gate]=true;
 return {candidate,verifiedCost:gearUpgradeCost(gear,candidate),milestone:target,scope:'Whole path, including prerequisite Mastery, ascension, XP and every intervening imbuement'};
}
export function gearCostEfficiency(item){
 const gain=item.modelComparison?.damageGain,cost=item.verifiedCost;
 const primary=item.resource==='Forge hammers'?'forgeHammers':item.resource==='Enhancement materials'?'enhancementXp':null;
 if(!primary||!cost?.verified||!(gain>0)||!(cost.quantities[primary]>0))return null;
 return {primary,gainPerUnit:gain/cost.quantities[primary],additionalMaterials:Object.fromEntries(Object.entries(cost.quantities).filter(([k,v])=>k!==primary&&v>0)),scope:'Estimated hosting gain per primary resource; additional material costs remain explicit'};
}
