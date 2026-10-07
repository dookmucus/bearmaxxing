import {englishMessage} from './english-messages.mjs';
import {roleInventoryIssues} from './hero-roles.mjs';
import {optimizeMarchPlan} from './joint-plan.mjs';
import {activeGearInventory,activeGearInventoryIssues,activeGearLabel} from './active-gear.mjs';
import {gearIssues} from './gear-progression.mjs';
import {heroIdentity} from './host-comparison.mjs';
import {pusherParticipates,usesSharedMaximum,usesActualMarchInputs,plannedCapacityMissing,actualMarchCapacity,CAPACITY_PROMPT} from './march-capacity-inputs.mjs';
import {hasAccountBaseCapacity} from './input-defaults.mjs';
import {TYPES, split, troopPlan, bestGear, gearOffense} from './engine.mjs';
import {GEAR_QUALITY,IMBUEMENT_GATES,gearEnhancementXp,gearLevelLabel,normalizeGearQuality} from './gear-progression.mjs';
import {masterEffects} from './master-effects.mjs';
import {inventoryCount,aggregateTroops} from './troop-inventory.mjs';
import {compareHosts,includedHostCandidates} from './host-comparison.mjs';
import {heroContributions} from './hero-effects.mjs';
import {gearUpgradeCost} from './gear-upgrade-costs.mjs';
import {completeMarchPlan,heroCapacity} from './march-plan.mjs';
import {petLevelEffect,petRefinementEffect,petBuffEffects} from './pet-effects.mjs';
import {accountHeroTalents} from './account-hero-talents.mjs';

export const LABELS = {infantry: 'Infantry', cavalry: 'Cavalry', archer: 'Archers'};
export const SLOTS = ['helmet', 'boots', 'gloves', 'armor'];
export const known = value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value)) && Number(value) >= 0;
const integer = value => known(value) && Number.isInteger(Number(value));
export const heroKey = name => String(name ?? '').trim().toLocaleLowerCase();
export const activeJoiners = p => p.joiners.slice(0, p.joinCount);
export const usedTypes = p => TYPES.filter(t => known(p.ratios[t]) && Number(p.ratios[t]) > 0);
export function accountEffects(p,scope='hosting') {
  const out={attack:0,lethality:0,classLethality:{infantry:0,cavalry:0,archer:0},deploy:0,rally:0,personalPoints:0,unsupported:[]};
  const talents=accountHeroTalents(p);
  out.attack+=talents.attack;
  out.heroTalents=talents.effects;
  out.unsupported.push(...talents.unsupported);
  for(const m of p.masters??[]){
    const effect=masterEffects(m);
    for(const key of ['attack','lethality','deploy','rally','personalPoints'])out[key]+=effect[key];
    out.unsupported.push(...effect.unsupported);
    if(['attack','lethality','deploy','rally'].some(key=>known(m[key])))out.unsupported.push(`${m.name} legacy manual bonuses retained in profile but excluded to prevent double counting; confirm levels`);
  }
  out.classLethality=petRefinementEffect(p);
  for(const pet of p.pets??[]){
    {
      const passive=petLevelEffect(pet);
      if(passive.attack!==null)out.attack+=passive.attack;
      if(passive.issue)out.unsupported.push(passive.issue);
      if(known(pet.attack)||known(pet.lethality))out.unsupported.push(`${pet.name} legacy refinement entry retained but unmapped; enter class Lethality rolls`);
      if(known(pet.skillLevel))out.unsupported.push(`${pet.name} saved manual active-skill level is retained for review; active rank now follows confirmed pet level`);
    }
  }
  const buffs=petBuffEffects(p,scope);
  for(const key of ['attack','lethality','deploy','rally'])out[key]+=buffs[key];
  out.unsupported.push(...buffs.unsupported);

  if(known(p.otherPetRefinement?.attack)||known(p.otherPetRefinement?.lethality))out.unsupported.push('Legacy other-pet refinement retained but unmapped; enter actual class Lethality in each pet row');
  return out;
}
export function comparableHostTeam(p) {
  return optimizeMarchPlan(p,accountEffects(p)).selected?.host?.team??TYPES.map(()=>null);
}
export function capacityHostDraft(p) {
  const groups=includedHostCandidates(p);
  if(groups.some(group=>!group.length))return null;
  return groups.map(group=>{
    const hero=[...group].sort((a,b)=>(heroCapacity(b.level)??-1)-(heroCapacity(a.level)??-1)||a.name.localeCompare(b.name))[0];
    return {hero,gear:bestGear(p,hero.troop)};
  });
}

function ratioRequirements(p, errors) {
  if (TYPES.some(t => !known(p.ratios[t]) || Number(p.ratios[t]) > 100) || TYPES.reduce((s, t) => s + Number(p.ratios[t]), 0) !== 100) {
    errors.push('Enter a ratio totaling 100%. It determines the target troop count of each type.');
  }
}
function joinerRequirements(p,errors){errors.push(...roleInventoryIssues(p));}
function hostingRequirements(p, errors) {
  joinerRequirements(p, errors);
  const names = p.heroes.filter(h => h.owned !== false && h.included!==false && h.name?.trim()).map(h => heroIdentity(h));
  const displayedNames=p.heroes.filter(h=>h.owned!==false&&h.included!==false&&h.name?.trim()).map(h=>heroKey(h.name));
  if (new Set(names).size !== names.length||new Set(displayedNames).size!==displayedNames.length) errors.push('Remove duplicate hero records or names before assigning simultaneous marches.');
  const groups=includedHostCandidates(p);
  for (const [i,t] of TYPES.entries()) {
    const candidates = groups[i];
    if (!candidates.length) errors.push(`Include an owned ${LABELS[t].toLowerCase()} host candidate.`);
  }
}
const positiveHostCapacity=p=>integer(usesActualMarchInputs(p)?actualMarchCapacity(p,'host'):p.hostCapacity)&&Number(usesActualMarchInputs(p)?actualMarchCapacity(p,'host'):p.hostCapacity)>0;
function capacityRequirements(p, errors) {
  if (!positiveHostCapacity(p)) errors.push(CAPACITY_PROMPT);
}
function inventoryRequirements(p, errors) {
  for (const t of usedTypes(p)) {
    if (!integer(inventoryCount(p,t))) errors.push(`Enter available ${LABELS[t].toLowerCase()} as a whole number, including 0 if none. Allocation cannot assume an unknown inventory is empty.`);
  }
}

export function requirements(p, calculation) {
  const errors = [];
  if (calculation === 'hosting') {
    if (p.hostEnabled !== true) errors.push('Include a hosting march in Troops to compare host candidates.');
    ratioRequirements(p,errors);
    hostingRequirements(p, errors);
    errors.push(...activeGearInventoryIssues(p));
    for(const g of activeGearInventory(p))for(const issue of gearIssues(g))errors.push(`${activeGearLabel(g)}: ${issue}`);
  } else if (calculation === 'joining') {
    ratioRequirements(p, errors);
    joinerRequirements(p, errors);
    if (typeof p.hostEnabled !== 'boolean') errors.push('Choose whether a hosting march is simultaneous with your joins. It uses troops from the same inventory.');
    if(usesActualMarchInputs(p)){
      if(plannedCapacityMissing(p))errors.push(CAPACITY_PROMPT);
    }else{
      if(!hasAccountBaseCapacity(p))for(const [i,j] of activeJoiners(p).entries())if(!integer((Number(j.capacity)>0?j.capacity:p.joinCapacity))||Number((Number(j.capacity)>0?j.capacity:p.joinCapacity))<1)errors.push(CAPACITY_PROMPT);
      if(p.hostEnabled&&!hasAccountBaseCapacity(p)&&(!integer(p.hostCapacity)||p.hostCapacity<1))errors.push(CAPACITY_PROMPT);
      if(pusherParticipates(p)&&!hasAccountBaseCapacity(p)&&(!integer(p.pusherCapacity)||p.pusherCapacity<1))errors.push('Enter the pusher capacity.');
    }
    inventoryRequirements(p, errors);
    const slots=(p.hostEnabled?1:0)+Number(p.joinCount)+(pusherParticipates(p)?1:0);
    if(!integer(p.marchSlots??4)||slots>Number(p.marchSlots??4))errors.push(`This setup needs ${slots} march slots; enter available slots or reduce joins.`);
  } else if (calculation === 'upgrades') {
    for (const u of p.upgrades) {
      const name = u.name || 'Upgrade';
      if (!['stat', 'capacity'].includes(u.kind)) errors.push(`Choose the effect of ${name}.`);
      if (!known(u.delta) || Number(u.delta) <= 0 || (u.kind === 'capacity' && !integer(u.delta))) errors.push(`Enter a positive ${u.kind === 'capacity' ? 'whole troop' : 'percentage point'} increase for ${name}.`);
      if (u.kind === 'stat') {
        if (!TYPES.includes(u.troop) || !['attack', 'lethality'].includes(u.stat)) errors.push(`Choose the troop type and stat affected by ${name}.`);
        else if (!known(p.effectiveStats?.[u.troop]?.[u.stat])) errors.push(`Enter current effective ${LABELS[u.troop].toLowerCase()} ${u.stat}. It is the baseline for ${name}; include existing hero and gear bonuses once.`);
      }
      if (u.cost !== null && u.cost !== undefined && u.cost !== '' && !known(u.cost)) errors.push(`Enter a nonnegative cost for ${name}, or leave it blank.`);
      if (known(u.cost) && Number(u.cost) > 0 && !u.resource?.trim()) errors.push(`Name the resource used by ${name} so unlike costs are not compared.`);
    }
    if (p.upgrades.some(u => u.kind === 'capacity')) {
      if(!usesSharedMaximum(p))capacityRequirements(p, errors);
      ratioRequirements(p, errors);
      inventoryRequirements(p, errors);
    }
  } else errors.push('Choose a calculation.');
  return [...new Set(errors)];
}

export function upgradeBaselines(p) {
  const unique = new Map();
  p.upgrades.filter(u => u.kind === 'stat' && TYPES.includes(u.troop) && ['attack', 'lethality'].includes(u.stat)).forEach(u => unique.set(`${u.troop}-${u.stat}`, {troop: u.troop, stat: u.stat}));
  return [...unique.values()];
}

export function calculate(p, calculation) {
  const missing = requirements(p, calculation);
  if (calculation === 'upgrades') {
    const comparable = p.upgrades.filter(u => requirements({...p, upgrades: [u]}, 'upgrades').length === 0);
    const host=p.hostEnabled?comparableHostTeam(p):[];
    const shared=accountEffects(p);
    const gearSteps=host.filter(Boolean).flatMap(({hero,gear,attack,lethality})=>gear.flatMap(g=>{
      const quality=normalizeGearQuality(g.quality),before=gearOffense(g);
      if(!before||!['purple','gold','red'].includes(quality))return [];
      const steps=[];
      const benefit=(after)=>{
        if(!after)return null;
        const gainAttack=after.attack-before.attack,gainLethality=after.lethality-before.lethality;
        if(gainAttack<=0&&gainLethality<=0)return null;
        const factor=((100+attack+gainAttack)/(100+attack))*((100+lethality+gainLethality)/(100+lethality))-1;
        return englishMessage("messages.calculator.calculate.for.s.host.class.experimental.offense.factor.gain",{detail:gainAttack>0?englishMessage("messages.calculator.calculate.attack.pp",{detail:gainAttack.toFixed(2)}):'',detail2:gainAttack>0&&gainLethality>0?', ':'',detail3:gainLethality>0?englishMessage("messages.calculator.calculate.lethality.pp",{detail:gainLethality.toFixed(2)}):'',name:hero.name,detail4:(factor*100).toFixed(2)});
      };
      const current=Number(g.enhancement),max=GEAR_QUALITY[quality].max;
      if(Number.isInteger(current)&&current<max){
        const target=current+1,gate=IMBUEMENT_GATES[target];
        const candidate={...g,enhancement:target,imbuementConfirmed:gate?{...g.imbuementConfirmed,[target]:true}:g.imbuementConfirmed};
        const result=benefit(gearOffense(candidate));
        if(result)steps.push({gearId:g.id,targetProgression:candidate,delta:{attack:gearOffense(candidate).attack-before.attack,lethality:gearOffense(candidate).lethality-before.lethality},id:`${g.id}-enhance`,title:englishMessage("messages.calculator.calculate.enhance",{troop:g.troop,slot:g.slot,detail:gearLevelLabel(quality,current),detail2:gearLevelLabel(quality,target)}),benefit:result,cost:gate?englishMessage("messages.calculator.calculate.mithril.and.mythic.gear",{mithril:gate.mithril,mythic:gate.mythic}):englishMessage("messages.calculator.calculate.enhancement.xp",{detail:gearEnhancementXp(target)}),prerequisite:gate?englishMessage("messages.calculator.calculate.mastery.and.completed.imbuement.confirm.in.game",{mastery:gate.mastery,detail:target-100}):englishMessage("messages.calculator.calculate.verify.enhancement.materials.and.available.gear.progression"),uncertainty:englishMessage("messages.calculator.calculate.community.progression.total.bear.damage.is.uncalibrated")});
      }
      if(quality!=='purple'&&Number.isInteger(Number(g.forge))&&Number(g.forge)<20){
        const target=Number(g.forge)+1,result=benefit(gearOffense({...g,forge:target}));
        if(result)steps.push({gearId:g.id,targetProgression:{...g,forge:target},delta:{attack:gearOffense({...g,forge:target}).attack-before.attack,lethality:gearOffense({...g,forge:target}).lethality-before.lethality},id:`${g.id}-forge`,title:englishMessage("messages.calculator.calculate.master",{troop:g.troop,slot:g.slot,forge:g.forge,target:target}),benefit:result,cost:englishMessage("messages.calculator.calculate.forgehammers",{detail:10*target,detail2:target>10?englishMessage("messages.calculator.calculate.and.mythic.gear",{detail:target-10}):''}),prerequisite:englishMessage("messages.calculator.calculate.confirm.mastery.is.unlocked.for.this.piece"),uncertainty:englishMessage("messages.calculator.calculate.community.progression.total.bear.damage.is.uncalibrated")});
      }
      return steps.map(step=>({...step,verifiedCost:gearUpgradeCost(g,step.targetProgression)}));
    }));
    const valora=(p.masters??[]).find(m=>m.name==='Valora');
    const personalStep=valora&&integer(valora.talentLevel)&&Number(valora.talentLevel)<11?{title:englishMessage("messages.calculator.calculate.valora.bear.point.talent",{talentLevel:valora.talentLevel,detail:Number(valora.talentLevel)+1}),benefit:englishMessage("messages.calculator.calculate.percentage.points.of.personal.bear.points",{detail:[0,2,4,6,9,12,15,18,21,24,27,30][Number(valora.talentLevel)+1]-[0,2,4,6,9,12,15,18,21,24,27,30][Number(valora.talentLevel)]}),cost:englishMessage("messages.calculator.calculate.cost.unknown"),prerequisite:englishMessage("messages.calculator.calculate.talent.unlock.and.materials.need.in.game.confirmation"),uncertainty:englishMessage("messages.calculator.calculate.personal.score.only.shared.damage.unchanged")}:null;
    const joint=optimizeMarchPlan(p,shared);
    const marchPlan=completeMarchPlan(p,host,shared,joint.selected?.assignment);
    const fillerSteps=marchPlan.totalsKnown?marchPlan.marches.filter(row=>row.joinIndex!=null&&row.basis==='derived').flatMap(row=>row.heroes.slice(1).flatMap(hero=>{
      if(!hero||!integer(hero.level)||Number(hero.level)>=80)return [];
      const current=heroCapacity(hero.level),next=heroCapacity(Number(hero.level)+1);
      if(!integer(current)||!integer(next)||next<=current)return [];
      const extra=Object.fromEntries(TYPES.map(t=>[t,split(row.capacity+next-current,p.ratios)[t]-row.target[t]]));
      if(TYPES.some(t=>extra[t]>marchPlan.remaining[t]))return [];
      return [{title:englishMessage("messages.calculator.calculate.level",{name:hero.name,level:hero.level,detail:Number(hero.level)+1}),benefit:englishMessage("messages.calculator.calculate.sourced.troop.places.in.available.troops.can.fill",{detail:next-current,name:row.name,detail2:TYPES.map(t=>`${extra[t]} ${LABELS[t].toLowerCase()}`).join(', ')}),cost:englishMessage("messages.calculator.calculate.hero.xp.cost.not.mapped.in.this.calculator"),prerequisite:englishMessage("messages.calculator.calculate.confirm.the.hero.can.be.leveled.and.the.account.base"),uncertainty:englishMessage("messages.calculator.calculate.community.capacity.table.no.direct.bear.damage.gain.is.inferred")}];
    })):[];
    if(!gearSteps.length&&!personalStep&&!fillerSteps.length&&!comparable.length)missing.push(englishMessage("messages.calculator.calculate.enter.confirmed.host.offensive.stats.to.compare.gear.steps.or"));
    return {calculation, missing, gearSteps, personalStep, fillerSteps, upgrades: comparable.map(u => {
      if (u.kind === 'capacity') {
        if(usesSharedMaximum(p)&&!positiveHostCapacity(p))return {...u,additional:null,shortage:null};
        const hostCapacity=usesActualMarchInputs(p)?actualMarchCapacity(p,'host'):p.hostCapacity;
        const before = split(hostCapacity, p.ratios);
        const after = split(Number(hostCapacity) + Number(u.delta), p.ratios);
        return {...u, additional: Object.fromEntries(TYPES.map(t => [t, after[t] - before[t]])), shortage: Object.fromEntries(TYPES.map(t => [t, Math.max(0, after[t] - (Number(p.ratios[t]) === 0 ? 0 : Number(inventoryCount(p,t))))]))};
      }
      const baseline = Number(p.effectiveStats[u.troop][u.stat]);
      const factorGain = Number(u.delta) / (100 + baseline) * 100;
      return {...u, factorGain, efficiency: known(u.cost) && Number(u.cost) > 0 ? factorGain / Number(u.cost) * 100 : null};
    })};
  }
  if(calculation==='joining'){
    const fatal=missing.some(item=>/ratio totaling|duplicate available hero|between one and six|march slots|available .* as a whole/.test(item));
    if(fatal)return {calculation,missing};
    const effects=accountEffects(p,'joining');
    const joint=optimizeMarchPlan(p,accountEffects(p,'hosting'));
    const modeledHost=joint.selected?.host?.team??null;
    const host=modeledHost??[];
    const plan=completeMarchPlan(p,host,effects,joint.selected?.assignment);
    if(!usesSharedMaximum(p)&&plan.marches.some(row=>!known(row.capacity)))missing.push(CAPACITY_PROMPT);
    const leaderGaps=plan.issues.filter(item=>item.includes('leader')||item.includes('not owned')||item.startsWith('Include '));
    return {calculation,missing:[...new Set(missing)],plan,hostDraft:modeledHost?null:host.length===3?host:null,hostEnabled:p.hostEnabled,joiners:plan.assignment.joins.map(r=>r.joiner),leaderGaps,shared:effects,joint};
  }
  if (missing.length) return {calculation, missing,...(calculation==='hosting'?{blockingValidation:missing,modelGaps:compareHosts(p,accountEffects(p)).gaps}: {})};
  if (calculation === 'hosting') {
    const shared=accountEffects(p),joint=optimizeMarchPlan(p,shared),comparison=joint.comparison,selected=joint.selected?.host;
    const options=(comparison.options??[]).filter(o=>o!==selected);
    const singleAlternatives=selected?TYPES.map((t,i)=>joint.comparisons.filter(o=>o.host&&o.host.team[i].hero.id!==selected.team[i].hero.id&&o.host.team.every((e,j)=>j===i||e.hero.id===selected.team[j].hero.id)).sort((a,b)=>(b.host?.bear.modeledDamage??-Infinity)-(a.host?.bear.modeledDamage??-Infinity)||a.key.localeCompare(b.key))[0]?.host).filter(Boolean):[];
    return {calculation,missing:[],blockingValidation:[],gearIds:activeGearInventory(p).map(g=>g.id),team:joint.canRecommend?selected?.team??null:null,alternatives:options.slice(0,12),singleAlternatives,index:selected?.index??null,uncertain:selected?.uncertain??[],unevaluated:comparison.unevaluated,shared,provisional:true,scope:joint.scope,coverageComplete:selected?.coverageComplete??false,unresolvedOffensive:selected?.unresolvedOffensive??[],assumptions:selected?.assumptions??[],modelGaps:comparison.gaps,omissions:comparison.omissions,joint};
  }
  return {calculation, missing: []};
}
