import {heroSkillDisplayName} from './entity-display.mjs';
import {t as tr,formatNumber,formatPercent,localizeText} from './i18n.mjs';
import {heroProgression,heroContributions} from './hero-effects.mjs';
import {starStageLabel} from './star-progression.mjs';
import {heroCapacity} from './march-plan.mjs';

const known=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
const fmt=value=>Number(Number(value).toFixed(2));
const typeName={infantry:'Infantry',cavalry:'Cavalry',archer:'Archer'};
const statName=(stat,hero)=>({sharedAttack:tr("hero.tooltips.page.shared.attack"),group102:tr("hero.tooltips.page.shared.attack"),group101:tr("hero.tooltips.page.shared.lethality"),attackMultiplier:tr("hero.tooltips.page.attack", {bonus: typeName[hero.troop]}),lethalityMultiplier:tr("hero.tooltips.page.lethality", {bonus: typeName[hero.troop]}),classAttack:tr("hero.tooltips.page.attack", {bonus: typeName[hero.troop]}),extraDamage:tr("hero.tooltips.page.extra.damage"),damageOverTime:tr("hero.tooltips.page.damage.over.time"),damageTaken:tr("hero.tooltips.page.enemy.damage.taken"),damageDealt:tr("hero.tooltips.page.damage.dealt"),extraStrike:tr("hero.tooltips.page.extra.strike.damage")})[stat]??stat;
const scope=status=>status.comparison==='prevents'?tr("hero.tooltips.page.this.prevents.comparison.of.this.hero"):tr("hero.tooltips.page.this.effect.is.excluded.from.comparison");
export function effectStatusInfo(hero,status){
 if(!status)return '';
 const name=status.slot?heroSkillDisplayName(hero,status.slot,status.name):status.name;
 const level=status.progression==='stars'?starStageLabel(hero.starStep)??tr("hero.tooltips.effectStatusInfo.entered.star.progression", {bonus: hero.starStep??'unknown'}):status.progression==='widget level'?tr("hero.tooltips.effectStatusInfo.widget.level", {level: status.level}):tr("hero.tooltips.effectStatusInfo.skill.level", {level: status.enteredLevel??status.level??'unknown'});
 switch(status.status){
  case 'irrelevant':return tr("hero.tooltips.effectStatusInfo.affects.and.does.not.contribute.to.this.bear.comparison", {name: name, appliesTo: status.appliesTo});
  case 'locked':{
   const requirement=status.requirement;
   const target=requirement?.widgetLevel!=null?tr("hero.tooltips.effectStatusInfo.widget.level.2", {widgetLevel: requirement.widgetLevel}):requirement?.starStep!=null?starStageLabel(requirement.starStep):requirement?.skillLevel!=null?tr("hero.tooltips.effectStatusInfo.skill.level.2", {skillLevel: requirement.skillLevel}):null;
   return target?tr("hero.tooltips.effectStatusInfo.unlocks.at", {name: name, bonus: status.stat?tr("hero.tooltips.effectStatusInfo.s.bonus", {stat: status.stat}):'', target: target}):tr("hero.tooltips.effectStatusInfo.is.locked.at.the.entered.stars.the.app.has", {name: name});
  }
  case 'invalid_input':return tr("hero.tooltips.effectStatusInfo.saved.level.exceeds.unlocked.level", {name: name, value: status.conflict.value, max: status.conflict.max, bonus: scope(status)});
  case 'missing_input':return tr("hero.tooltips.effectStatusInfo.enter.to.calculate", {progression: status.progression, name: name, bonus: scope(status)});
  case 'missing_mapping':return tr("hero.tooltips.effectStatusInfo.the.app.has.no.verified.value.for.at", {name: status.slot?tr("hero.tooltips.effectStatusInfo.message", {name: name, stat: status.stat}):status.name!==status.stat?tr("hero.tooltips.effectStatusInfo.message", {name: name, stat: status.stat}):status.stat, hero: hero.name, progression: level, bonus: scope(status)});
  case 'unresolved_mechanics':return tr("hero.tooltips.effectStatusInfo.has.a.known.bonus.but.its.is.unverified", {name: name, percentage: fmt(status.value), bonus: statName(status.stat,hero), level: status.assumed?tr("hero.tooltips.effectStatusInfo.skill.level.assumed"):'', bonus2: status.mechanics.join(', '), bonus3: scope(status)});
  case 'not_upgraded':return tr("hero.tooltips.effectStatusInfo.level.0.not.upgraded", {name: name});
  case 'not_equipped':return tr("hero.tooltips.effectStatusInfo.no.exclusive.widget.equipped");
  case 'modeled':return tr("hero.tooltips.effectStatusInfo.message.3", {name: name, percentage: fmt(status.value), name2: name===statName(status.stat,hero)?'':tr("hero.tooltips.effectStatusInfo.message.2", {bonus: statName(status.stat,hero)}), level: status.slot?tr("hero.tooltips.effectStatusInfo.at.skill.level", {level: status.level, bonus: status.assumed?tr("hero.tooltips.effectStatusInfo.assumed"):''}):''});
  default:return '';
 }
}
export function levelInfo(hero){
 const capacity=heroCapacity(hero.level);
 return capacity===null?tr("hero.tooltips.levelInfo.the.app.has.no.verified.personal.march.capacity.value", {hero: hero.name, level: hero.level}):tr("hero.tooltips.levelInfo.adds.personal.march.capacity.at.level", {capacity: fmt(capacity), level: hero.level});
}
export function starInfo(hero,contribution){
 const label=starStageLabel(hero.starStep);
 if(!label)return known(hero.advancedAttack)?tr("hero.tooltips.starInfo.exact.star.progress.is.unknown.advanced.inherent.attack.is", {percentage: fmt(hero.advancedAttack)}):effectStatusInfo(hero,contribution.effectStatuses.find(e=>e.id==='inherentAttack'));
 if(contribution.inherentAttack===null)return effectStatusInfo(hero,contribution.effectStatuses.find(e=>e.id==='inherentAttack'));
 const sourced=heroProgression(hero)?.starAttack?.[hero.starStep];
 if(known(hero.advancedAttack))return tr("hero.tooltips.starInfo.advanced.inherent.attack.is.included", {percentage: fmt(contribution.inherentAttack), label: known(sourced)?tr("hero.tooltips.starInfo.the.mapped.value.at.is", {label: label, percentage: fmt(sourced)}):tr("hero.tooltips.starInfo.the.app.has.no.verified.inherent.attack.value.for", {hero: hero.name, label: label})});
 return tr("hero.tooltips.starInfo.at.inherent.expedition.attack.is", {label: label, bonus: typeName[hero.troop]??'troop', percentage: fmt(contribution.inherentAttack)});
}
export function skillInfo(hero,ref,slot){
 return effectStatusInfo(hero,heroContributions(hero).effectStatuses.find(e=>e.id===`skill-${slot}`));
}
export function widgetInfo(hero,contribution){
 if(!known(hero.widget))return tr("hero.tooltips.widgetInfo.enter.widget.level.to.calculate.its.lethality.and.hosting");
 if(Number(hero.widget)===0)return '';
 return contribution.effectStatuses.filter(e=>e.id.startsWith('widget')&&!['irrelevant','not_equipped','not_upgraded'].includes(e.status)&&(e.status!=='modeled'||e.value>0)).map(e=>effectStatusInfo(hero,e)).join(' ');
}
