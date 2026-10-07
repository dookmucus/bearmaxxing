import {canonicalHeroId} from './hero-identity.mjs';
import {canonicalPetId} from './pet-identity.mjs';
import {t as tr,formatNumber,formatPercent,localizeText,entityName,formatList} from './i18n.mjs';
import {joiningRole,roleCapacity} from './hero-roles.mjs';
import {offerText} from './joint-plan.mjs';
import {gearProgression,gearLevelLabel,normalizeGearQuality} from './gear-progression.mjs';
import {masterInputDetails} from './master-effects.mjs';
import {petBuffDetails,PET_ACTIVE_NAMES} from './pet-effects.mjs';
import {joiningLeaderSkill} from './hero-effects.mjs';
import {effectiveSkillLevel} from './hero-skill-unlocks.mjs';
import {starStageLabel} from './star-progression.mjs';
import {heroContributions} from './hero-effects.mjs';

const labels={infantry:'Infantry',cavalry:'Cavalry',archer:'Archer'};
const number=n=>Number(n.toFixed(2));

// Presentation adapters leave recommendation selection, benefits and inputs intact.
function improvementDescription(item,profile){
 if(item.skillHeroId||item.replacesHeroId)return {title:localizeText(item.title),benefit:localizeText(item.reason),detail:localizeText(item.uncertainty)};
 const piece=item.gearId&&profile.gear.find(g=>g.id===item.gearId);
 if(piece&&item.targetProgression){
  const before=gearProgression(piece),after=gearProgression(item.targetProgression),mastery=item.id.endsWith('-forge'),quality=normalizeGearQuality(piece.quality);
  const current=mastery?piece.forge:gearLevelLabel(quality,Number(piece.enhancement)),target=mastery?item.targetProgression.forge:gearLevelLabel(quality,Number(item.targetProgression.enhancement));
  const gains=['attack','lethality'].filter(stat=>after[stat]>before[stat]).map(stat=>tr('results.upgrade.classStatDelta',{delta:number(after[stat]-before[stat]),troop:tr(`troops.${piece.troop}`),stat:tr(`stats.${stat}`)}));
  return {title:tr('results.upgrade.gearTitle',{troop:tr(`troops.${piece.troop}`),slot:tr(`gear.slot.${piece.slot==='armor'?'chest':piece.slot}`),progression:tr(mastery?'results.copy.improvementDescription.mastery':'results.copy.improvementDescription.level'),current,target}),benefit:tr('results.upgrade.gearBenefit',{effects:formatList(gains)}),detail:item.modelComparison?.objectiveUnavailable?tr('results.copy.improvementDescription.verified.stat.improvement.total.damage.cannot.yet.be.ranked'):tr('results.copy.improvementDescription.estimated.comparison.with.transferable.class.gear')};
 }
 const increase=item.reason.match(/\(\+([\d.]+) percentage points\)/),delta=increase?Number(increase[1]):null;
 const hero=profile.heroes.find(h=>item.id===`${h.id}-stars`||item.id===`${h.id}-widget`),pet=(profile.pets??[]).find(p=>item.id===`${p.id}-passive`);
 const name=hero?entityName('heroes',canonicalHeroId(hero.name),hero.name):pet?entityName('pets',canonicalPetId(pet),pet.name):null;
 let benefit=localizeText(item.reason.split('. ')[0]);
 if(delta!==null)benefit=tr('results.upgrade.statGain',{delta,stat:tr(item.id.endsWith('-stars')?'stats.inherentAttack':item.id.endsWith('-widget')?'stats.widgetLethality':'stats.passiveAttack')});
 if(item.widgetGains?.rallyAttack>0&&delta!==null)benefit=tr('results.upgrade.widgetSharedAttack',{delta,sharedAttack:number(item.widgetGains.rallyAttack)});
 if(hero?.name==='Yang'&&item.modelComparison?.selectionDependent&&delta!==null)benefit=tr('results.upgrade.yangConditional',{delta,hero:name});
 const title=hero?item.id.endsWith('-stars')?tr('results.upgrade.heroStars',{hero:name,current:starStageLabel(Number(hero.starStep)),target:item.target}):tr('results.upgrade.heroWidget',{hero:name,current:hero.widget,target:item.target.replace('Widget level ','')}):pet?item.title.includes('advancement')?tr('results.upgrade.petAdvance',{pet:name,level:pet.level}):tr('results.upgrade.petLevel',{pet:name,current:pet.level,target:item.target.replace('Level ','')}):localizeText(item.title);
 if(pet&&item.petStatDelta!=null)return {title,benefit:tr('pets.upgradeDelta',{delta:item.petStatDelta}),detail:item.petActiveDelta!=null?tr('pets.advancementUpgradeHelp',{ability:PET_ACTIVE_NAMES[pet.name],delta:formatNumber(item.petActiveDelta),effect:['capacity','rallyCapacity'].includes(item.petActiveKind)?tr(item.petActiveKind==='capacity'?'player.guidance.petGuidance.personal.march.capacity':'player.guidance.petGuidance.total.rally.capacity'):`% ${tr(item.petActiveKind==='attack'?'player.guidance.petGuidance.hosting.attack':'player.guidance.petGuidance.hosting.lethality')}`}):tr('results.copy.improvementDescription.estimated.comparison.this.improves.the.listed.bonus.at.your')};
 return {title,benefit,detail:tr('results.copy.improvementDescription.estimated.comparison.this.improves.the.listed.bonus.at.your')};
}

export function hostingBonusCopy(entry,fallback){
 const special=entry.bearEffects?.find(e=>!e.excluded&&['chance','periodic','counter','chance-per-attack'].includes(e.kind));
 if(special?.kind==='periodic')return tr("results.copy.hostingBonusCopy.adds.an.extra.squad.strike.every.turns", {period: special.period});
 if(special?.kind==='chance-per-attack')return tr("results.copy.hostingBonusCopy.can.increase.damage.taken.by.bear", {hero: special.name});
 if(special?.kind==='chance'&&special.hero==='Long Fei')return tr("results.copy.hostingBonusCopy.chance.of.extra.squad.damage", {percentage: number(special.probability*100)});
 const c=entry.contribution??heroContributions(entry.hero);
 const sharedLethality=c.sharedLethality!==null&&c.widgetRallyLethality!==null?c.sharedLethality+c.widgetRallyLethality:null;
 const sharedAttack=c.sharedAttack!==null&&c.widgetRallyAttack!==null?c.sharedAttack+c.widgetRallyAttack:null;
 if(sharedLethality>0)return tr("results.copy.hostingBonusCopy.adds.shared.lethality", {sharedLethality: number(sharedLethality)});
 if(sharedAttack>0)return tr("results.copy.hostingBonusCopy.adds.shared.attack", {sharedAttack: number(sharedAttack)});
 if(c.inherentAttack>0)return tr("results.copy.hostingBonusCopy.adds.attack", {percentage: number(c.inherentAttack), bonus: labels[entry.hero.troop]});
 if(c.widgetLethality>0)return tr("results.copy.hostingBonusCopy.adds.lethality", {percentage: number(c.widgetLethality), bonus: labels[entry.hero.troop]});
 return fallback;
}

export function joiningLeaderCopy(hero,role=hero&&joiningRole(hero)){
 if(!hero)return {summary:tr("results.copy.joiningLeaderCopy.leader.unavailable"),detail:tr("results.copy.joiningLeaderCopy.review.availability.in.heroes")};
 if(role.rejection)return {summary:tr("results.copy.joiningLeaderCopy.joining.effect.cannot.be.compared"),detail:tr("results.copy.joiningLeaderCopy.provisional.this.leader.s.bear.priority.is.not.established")};
 const statKeys={attack:'attack',lethality:'lethality',damageTaken:'enemyDamageTaken',attackMultiplier:'attackMultiplier',lethalityMultiplier:'lethalityMultiplier',damageDealt:'damageDealt',extraDamage:'extraDamage',extraStrike:'extraStrike',damageOverTime:'damageOverTime'};
 const effects=role.effects.map(effect=>tr(effect.scope!=='all'?effect.conditional?'results.join.classConditionalEffect':'results.join.classEffect':effect.conditional?'results.join.conditionalEffect':'results.join.offeredEffect',{percentage:effect.value,stat:tr(`stats.${statKeys[effect.stat]}`),troop:tr(`troops.${effect.scope}`)}));
 return {summary:tr('results.join.offer',{effects:formatList(effects)}),detail:tr('results.join.skillDetail',{skill:entityName('skills',`${canonicalHeroId(hero.name)}-expedition-1`,role.name),level:role.level})};
}

export function joiningHeroCopy(hero,slot,equivalent=[],manual=false,role=null,capacityCalculated=true){
 if(!hero)return {summary:tr("results.copy.joiningHeroCopy.no.available.hero"),detail:tr("results.copy.joiningHeroCopy.include.an.available.hero.of.the.missing.class.in")};
 if(hero.optionalFiller)return {summary:tr('results.copy.joiningHeroCopy.capacity.not.verified'),detail:tr('results.join.optionalFillerDetails')};
 if(slot===0)return joiningLeaderCopy(hero,role??joiningRole(hero));
 const capacity=roleCapacity(hero),names=equivalent.slice(0,3).map(name=>entityName('heroes',canonicalHeroId(name),name));
 const summary=capacity===null?tr('results.copy.joiningHeroCopy.capacity.not.verified'):tr('results.join.fillerCapacity',{capacity});
 return {summary,detail:names.length?tr('results.join.fillerSubstitutes',{names:formatList(names,{type:'disjunction'})}):null};
}

export function rallyCapacityCopy(profile,total){
 const sources=(profile.masters??[]).flatMap(master=>masterInputDetails(master).skills.filter(s=>s.kind==='rally'&&s.value>0).map(s=>({name:tr("results.copy.rallyCapacityCopy.level", {hero: master.name, hero2: s.name, level: s.level}),value:s.value})));
 sources.push(...petBuffDetails(profile).filter(e=>e.included&&e.kind==='rallyCapacity'&&e.value>0).map(e=>({name:tr("results.copy.rallyCapacityCopy.message", {petName: e.petName, hero: e.name}),value:e.value})));
 if(!(total>0)||sources.reduce((n,s)=>n+s.value,0)!==total)return null;
 return tr("results.copy.rallyCapacityCopy.source.kingshot.database.skill.tables.this.increases.total.hosted", {name: sources.map(s=>tr("results.copy.rallyCapacityCopy.message.2", {hero: s.name, bonus: s.value})).join('; ')});
}

export function jointAlternativeCopy(option,selected){
 const host=option.host?.team.map(e=>e.hero.name).join(' / ')??'No host';
 const joining=option.leaders.map(l=>`${l.hero.name}: ${offerText(l)}`).join('; ');
 const delta=selected?.host?.bear.modeledDamage!=null&&option.host?.bear.modeledDamage!=null?option.host.bear.modeledDamage-selected.host.bear.modeledDamage:null;
 const hostTradeoff=delta===null?'Hosting relative offense is unranked.':Math.abs(delta)<1e-9?'Equal estimated hosting relative offense.':delta>0?'Higher estimated hosting relative offense.':'Lower estimated hosting relative offense.';
 return {title:host,detail:`${hostTradeoff} Joins — ${joining}. ${option.coverageComplete?'Different rally effects are not converted into a damage score.':'Unresolved effects could change the preference.'}`};
}

export function improvementCopy(item,profile){
 const copy=improvementDescription(item,profile);
 const labels={forgeHammers:tr("results.copy.improvementCopy.forge.hammers"),enhancementXp:tr("results.copy.improvementCopy.enhancement.xp"),mythicGear:tr("results.copy.improvementCopy.mythic.gear"),mithril:tr("results.copy.improvementCopy.mithril")};
 const verified=item.verifiedCost?.verified===true;
 const costs=verified?Object.entries(item.verifiedCost.quantities).filter(([,value])=>value>0).map(([key,value])=>tr("results.copy.improvementCopy.message", {bonus: value, bonus2: labels[key]??key})).join(', '):null;
 const pet=(profile.pets??[]).find(p=>item.id===`${p.id}-passive`);
 const advance=pet&&item.title.includes('advancement');
 const detail=costs?tr("results.copy.improvementCopy.requires", {detail: copy.detail, costs: costs}):advance&&item.petActiveDelta!=null?copy.detail:advance?tr("results.copy.improvementCopy.if.advancement.at.level.is.incomplete.this.adds.the", {level: pet.level}):item.resource?tr("results.copy.improvementCopy.exact.material.cost.is.not.verified.no.resource.efficiency", {bonus: item.modelComparison?.selectionDependent?tr("results.copy.improvementCopy.benefit.depends.on.this.hero.s.hosting.role"):tr("results.copy.improvementCopy.at.your.entered.progression")}):copy.detail;
 return {...copy,title:advance?tr("results.copy.improvementCopy.level.advancement.complete", {pet: pet.name, level: pet.level}):copy.title,detail};
}
