import {englishMessage} from './english-messages.mjs';
export const GEAR_SOURCES={
  progression:'https://kingshotveterans.com/database/hero-gear',
  costs:'https://kingshotoptimizer.com/hero-gear/references/imbuement-costs/',
  official:'https://centurygames.helpshift.com/hc/en/140-kingshot/faq/9132-what-is-gear-imbuement-1783436327/'
};
// Explicit class/slot mapping from the source's twelve-piece and imbuement tables.
export const GEAR_SLOT_EFFECTS=Object.fromEntries(['infantry','cavalry','archer'].map(t=>[t,{
 helmet:{ordinary:'lethality',attackMilestones:{120:20,200:50}},
 boots:{ordinary:'lethality',attackMilestones:{160:30}},
 gloves:{ordinary:'health',attackMilestones:{160:30}},
 armor:{ordinary:'health',attackMilestones:{120:20,200:50}}
}]));
export const gearSlotEffect=gear=>GEAR_SLOT_EFFECTS[gear?.troop]?.[gear?.slot]??null;
export const GEAR_QUALITY={purple:{label:'Epic',min:0,max:80},gold:{label:'Mythic',min:0,max:100},red:{label:'Legendary',min:100,max:200},none:{label:'No gear',min:null,max:null}};
export const IMBUEMENT_GATES={120:{mastery:11,mithril:10,mythic:3},140:{mastery:12,mithril:20,mythic:5},160:{mastery:13,mithril:30,mythic:5},180:{mastery:14,mithril:40,mythic:10},200:{mastery:15,mithril:50,mythic:10}};
export function normalizeGearQuality(value){const raw=String(value??'').toLowerCase();return {epic:'purple',purple:'purple',mythic:'gold',gold:'gold',ascended:'red',legendary:'red',red:'red',none:'none','no gear':'none'}[raw]??value;}
export function requiredGearMastery(quality,level){
  if(quality!=='red')return 0;
  if(level<=100)return 10;
  if(level<=120)return 11;
  if(level<=140)return 12;
  if(level<=160)return 13;
  if(level<=180)return 14;
  return 15;
}
export function maxGearLevelForMastery(mastery){
  if(!Number.isInteger(Number(mastery)))return 100;
  const value=Number(mastery);
  return value<11?100:value<12?120:value<13?140:value<14?160:value<15?180:200;
}
export function gearEnhancementXp(level){
  if(!Number.isInteger(level)||level<1||level>200)return null;
  if([101,120,140,160,180,200].includes(level))return 0;
  if(level<30)return 5*level+5;
  if(level<40)return 10*level-140;
  if(level<60)return 20*level-530;
  if(level<70)return 30*level-1120;
  if(level<80)return 40*level-1810;
  if(level<160)return 50*level-2600;
  return 100*level-10600;
}
export function gearIssues(gear){
  const q=normalizeGearQuality(gear?.quality),band=GEAR_QUALITY[q];
  if(!band)return ['Gear type is unknown.'];
  if(q==='none')return [];
  const level=Number(gear.enhancement),mastery=Number(gear.forge);
  const issues=[];
  if(!gearSlotEffect(gear))issues.push(englishMessage("messages.gear.progression.gearIssues.troop.class.or.gear.slot.has.no.verified.effect.mapping"));
  if(gear.enhancement==null||gear.enhancement===''||typeof gear.enhancement==='boolean'||!Number.isInteger(level)||level<band.min||level>band.max)issues.push(englishMessage("messages.gear.progression.gearIssues.level.must.be",{label:band.label,min:band.min,max:band.max,detail:q==='red'?englishMessage("messages.gear.progression.gearIssues.shown.as.0.100"):''}));
  if(q!=='purple'&&(gear.forge==null||gear.forge===''||typeof gear.forge==='boolean'||!Number.isInteger(mastery)||mastery<0||mastery>20))issues.push(englishMessage("messages.gear.progression.gearIssues.mastery.must.be.0.20"));

  return issues;
}
export function gearLevelLabel(quality,level){return normalizeGearQuality(quality)==='red'?`+${Number(level)-100}`:String(level);}
export function completedImbuement(gear,gate){
  const level=Number(gear.enhancement);
  if(normalizeGearQuality(gear.quality)!=='red'||level<gate)return false;
  if(level>gate)return true;
  return gear.imbuementConfirmed?.[gate]===true?true:gear.imbuementConfirmed?.[gate]===false?false:null;
}
export function gearProgression(gear){
  const quality=normalizeGearQuality(gear?.quality);
  if(quality==='none')return {attack:0,lethality:0,ordinary:0,milestones:[],uncertain:[],effectStatuses:[]};
  if(gearIssues(gear).length)return null;
  const level=Number(gear.enhancement),mastery=Number(gear.forge);
  const ordinary=quality==='purple'?9+0.21*level:quality==='gold'?15+0.35*level:50+0.5*(level-100);
  const finalOrdinary=ordinary*(quality==='purple'?1:1+0.1*mastery);
  const slotEffect=gearSlotEffect(gear);
  if(!slotEffect)return null;
  const offensiveSlot=slotEffect.ordinary==='lethality';
  const result={attack:0,lethality:offensiveSlot?finalOrdinary:0,ordinary:offensiveSlot?ordinary:0,milestones:[],uncertain:[],effectStatuses:[]};
  if(quality!=='red')return result;
  // Offensive Expedition milestones only. The source lists distinct buffs, but
  // does not establish whether the two Attack buffs on helm/chest stack.
  for(const gate of [120,160,200]){
    const complete=completedImbuement(gear,gate);
    if(complete===false)continue;
    const offensive=slotEffect.attackMilestones[gate]!=null;
    if(!offensive)continue;
    if(complete===null){result.effectStatuses.push({name:`+${gate-100} imbuement Attack`,status:'missing_input',gate,comparison:'excluded'});result.uncertain.push(`Confirm whether +${gate-100} imbuement is complete.`);continue;}
    if(gate===200){result.effectStatuses.push({name:'+100 imbuement Attack',status:'unresolved_mechanics',value:slotEffect.attackMilestones[gate],mechanics:'whether it replaces or adds to +20 imbuement Attack',comparison:'excluded'});result.uncertain.push('Whether +100 Attack replaces or adds to +20 Attack is unverified.');continue;}
    const attack=slotEffect.attackMilestones[gate];
    result.attack+=attack;
    result.milestones.push({gate,attack});
  }
  return result;
}
