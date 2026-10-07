import {englishMessage} from './english-messages.mjs';
import {heroIdentity} from './host-comparison.mjs';
import {heroReference,heroContributions,heroSkillName} from './hero-effects.mjs';
import offensive from './data/hero-offensive-effects.json' with {type:'json'};
import {heroReferenceName,heroAvailableInPlanner} from './hero-identity.mjs';
import {effectiveSkillLevel} from './hero-skill-unlocks.mjs';
import capacity from './data/hero-capacity.json' with {type:'json'};
import {heroBearEffects,joiningBearComparison} from './bear-comparison.mjs';
export const roleEligible=h=>heroAvailableInPlanner(h)&&h?.owned===true&&h.marchAvailable!==false&&['infantry','cavalry','archer'].includes(h.troop);
export const roleCapacity=h=>!h?.optionalFiller&&h?.level!=null&&h.level!==''&&Number.isInteger(Number(h.level))?capacity.deploymentByLevel[Number(h.level)]??null:null;
export function roleInventoryIssues(profile){
 const available=profile.heroes.filter(roleEligible),ids=available.map(heroIdentity),names=available.map(h=>String(h.name??'').normalize('NFKC').trim().toLowerCase());
 const issues=[];
 if(new Set(ids).size!==ids.length||new Set(names).size!==names.length)issues.push(englishMessage("messages.hero.roles.roleInventoryIssues.remove.duplicate.available.hero.records.or.names.before.assigning.simultaneous"));
 return issues;
}
const stages={15:[0,3,6,9,12,15],25:[0,5,10,15,20,25],30:[0,6,12,18,24,30]};
// A joining leader supplies only skill 1. Widgets, inherent stats and later
// skills never enter its rally offer. Magnitudes are not damage forecasts.
export function joiningRole(hero){
 const effective=effectiveSkillLevel(hero,1),name=heroSkillName(hero,1);
 const base={hero,id:heroIdentity(hero),name,level:effective.level,assumed:effective.source==='assumed',effects:[],coverageComplete:false};
 if(!roleEligible(hero))return {...base,rejection:'Not owned, unavailable for marches, or unknown troop class.'};
 if(effective.conflict)return {...base,rejection:`${name}: entered level exceeds the unlocked cap.`};
 if(effective.level===0)return {...base,rejection:`${name} is not upgraded.`};
 if(effective.unlock.max===null)return {...base,rejection:`The app has no verified ${name} unlock limit at the entered stars.`};
 if(!effective.level)return {...base,rejection:`${name} is locked or not upgraded.`};
 const bearEffects=heroBearEffects(hero,'joining');
 const excluded=bearEffects.effects.find(e=>e.excluded);
 if(excluded)return {...base,rejection:`${name}: ${excluded.reason}`,bearExclusion:excluded};
 const specific=offensive.heroes[heroReferenceName(hero)],ref=heroReference(hero);
 const records=(specific?.effects??ref?.effects??[]).filter(e=>e.skill===1);
 const status=heroContributions(hero).effectStatuses.find(s=>s.id==='skill-1');
 if(status?.status==='irrelevant')return {...base,rejection:`${name} affects ${status.appliesTo} and does not contribute to this Bear comparison.`};
 const unresolvedEffects=[];
 const effects=records.flatMap(e=>{
  const value=e.values?.[effective.level]??stages[e.max]?.[effective.level];
  if(value==null){unresolvedEffects.push({name,stat:e.stat??e.kind,level:effective.level,reason:`The app has no verified ${e.stat??e.kind} value at this skill level.`});return [];}
  const stat=({group101:'lethality',group102:'attack',sharedAttack:'attack',sharedLethality:'lethality',damageTaken:'damageTaken',attackMultiplier:'attackMultiplier',lethalityMultiplier:'lethalityMultiplier',damageDealt:'damageDealt',extraDamage:'extraDamage',extraStrike:'extraStrike',damageOverTime:'damageOverTime'})[e.stat??e.kind];
  if(!stat)return [];
  const mechanics=e.unresolvedMechanics??(['attackMultiplier','lethalityMultiplier'].includes(stat)?['joining applicability and multiplier stacking']:status?.status==='unresolved_mechanics'?status.mechanics:[]);
  return [{name,stat,value,scope:e.scope??'all',mechanics,source:specific?.source??ref.source,conditional:e.chance!=null||e.chanceByLevel!=null||e.everyTurns!=null||e.everyAttacks!=null||e.kind==='chance'||e.kind==='extra'}];
 });
 const role={...base,effects,unresolvedEffects,coverageComplete:unresolvedEffects.length===0&&effects.length>0&&effects.every(e=>!e.mechanics.length),rejection:effects.length?null:`The app has no verified joining value for ${name} at skill level ${effective.level}.`};
 role.bear=joiningBearComparison(role);
 return role;
}
