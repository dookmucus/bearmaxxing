import {englishMessage} from './english-messages.mjs';
import {activeGearInventory,activeGearInventoryIssues} from './active-gear.mjs';
import {pusherParticipates} from './march-capacity-inputs.mjs';
export const TYPES = ['infantry', 'cavalry', 'archer'];
import {gearProgression,normalizeGearQuality} from './gear-progression.mjs';
const known = x => x !== null && x !== undefined && x !== '' && typeof x !== 'boolean' && Number.isFinite(Number(x)) && Number(x) >= 0;
export const num = (x) => Math.max(0, Number.isFinite(Number(x)) ? Number(x) : 0);
export const fmt = (x) => Math.round(num(x)).toLocaleString('en-US');
// Expedition offense from quality-specific progression; saved displayed
// percentages are retained in profiles but never added to derived stats.
export function gearOffense(g) {
  if(!g)return null;
  const effect=gearProgression(g);
  if(!effect||effect.uncertain.length)return null;
  return {attack:effect.attack,lethality:effect.lethality,estimated:normalizeGearQuality(g.quality)!=='none',milestones:effect.milestones};
}
export function split(capacity, ratios) {
  const total = TYPES.reduce((s,t) => s + num(ratios[t]), 0);
  if (!total) return Object.fromEntries(TYPES.map(t => [t, 0]));
  const cap = Math.floor(num(capacity));
  const infantry = Math.floor(cap * num(ratios.infantry) / total);
  const cavalry = Math.floor(cap * num(ratios.cavalry) / total);
  return {infantry, cavalry, archer: cap - infantry - cavalry};
}
export function troopPlan(profile) {
  const integer = x => known(x) && Number.isInteger(Number(x));
  if (typeof profile.hostEnabled !== 'boolean' || !integer(profile.joinCount) || profile.joinCount > 6) throw new Error('Confirm simultaneous marches before allocating troops.');
  if (TYPES.some(t => !known(profile.ratios[t])) || TYPES.reduce((s,t)=>s+Number(profile.ratios[t]),0) <= 0) throw new Error('Enter a nonzero troop ratio.');
  if (TYPES.some(t => num(profile.ratios[t]) > 0 && !integer(profile.troops[t].count))) throw new Error('Enter known whole troop inventories before allocating troops.');
  if ((profile.hostEnabled && (!integer(profile.hostCapacity) || Number(profile.hostCapacity) < 1)) || (Number(profile.joinCount) > 0 && (!integer(profile.joinCapacity) || Number(profile.joinCapacity) < 1))) throw new Error('Enter positive whole march capacities.');
  let remaining = Object.fromEntries(TYPES.map(t => [t, Math.floor(num(profile.troops[t].count))]));
  if(pusherParticipates(profile) && (!integer(profile.pusherCapacity)||Number(profile.pusherCapacity)<1))throw new Error('Enter a positive whole pusher capacity.');
  const count=(profile.hostEnabled?1:0)+Number(profile.joinCount)+(pusherParticipates(profile)?1:0);
  if(!integer(profile.marchSlots??4)||Number(profile.marchSlots??4)<1)throw new Error('Enter available march slots as a positive whole number.');
  if(count>Number(profile.marchSlots??4))throw new Error(`This setup needs ${count} march slots; enter your actual available slots or reduce joining marches.`);
  const capacities = [...(profile.hostEnabled ? [num(profile.hostCapacity)] : []), ...Array.from({length: Math.min(6, Math.floor(num(profile.joinCount)))}, () => num(profile.joinCapacity)),...(pusherParticipates(profile)?[num(profile.pusherCapacity)]:[])];
  const names = [...(profile.hostEnabled ? ['Your rally'] : []), ...Array.from({length: Math.min(6, Math.floor(num(profile.joinCount)))}, (_,i) => `Join march ${i+1}`),...(pusherParticipates(profile)?['Hero-free pusher']:[])];
  const needed = {infantry:0,cavalry:0,archer:0};
  const marches = capacities.map((capacity,i) => {
    const target = split(capacity, profile.ratios);
    const available = {}; const gap = {};
    TYPES.forEach(t => { needed[t] += target[t]; available[t] = Math.min(target[t], remaining[t]); remaining[t] -= available[t]; gap[t] = target[t] - available[t]; });
    return {name:names[i],capacity,target,available,gap,fill:capacity ? TYPES.reduce((s,t)=>s+available[t],0)/capacity:0};
  });
  return {marches,needed,remaining,shortage:Object.fromEntries(TYPES.map(t => [t,Math.max(0,needed[t]-num(profile.troops[t].count))])), fill: capacities.reduce((s,c)=>s+c,0) ? marches.reduce((s,m)=>s+m.capacity*m.fill,0)/capacities.reduce((s,c)=>s+c,0):0};
}
export function bestGear(profile,troop) {
  const gear=activeGearInventory(profile);
  if(activeGearInventoryIssues(profile).length||gear.some(g=>g.troop===troop&&!gearOffense(g)))return [];
  return ['helmet','boots','gloves','armor'].map(slot=>gear.find(g=>g.id===`set-${troop}-${slot}`&&normalizeGearQuality(g.quality)!=='none'&&gearOffense(g))).filter(Boolean);
}
export function heroValue(profile, hero) {
  const t=hero.troop;
  const base=profile.stats[t];
  if(!base || ![base.attack,base.lethality,hero.attack,hero.lethality,hero.multiplier].every(known) || profile.gear.some(g=>g.troop===t&&!known(g.lethality)))return null;
  const gear=bestGear(profile,t).reduce((s,g)=>s+num(g.lethality),0);
  return (1+(num(base.attack)+num(hero.attack))/100)*(1+(num(base.lethality)+num(hero.lethality)+gear)/100)*Math.max(1,num(hero.multiplier));
}
export function hostTeam(profile) {
  const team=TYPES.map(t=>profile.heroes.filter(h=>h.troop===t && h.modeled && h.owned!==false && heroValue(profile,h)!==null && h.included!==false && h.marchAvailable!==false).sort((a,b)=>heroValue(profile,b)-heroValue(profile,a))[0] || null);
  return {team,complete:team.every(Boolean)};
}
export function relativeIndex(profile, team=hostTeam(profile).team, counts=split(profile.hostCapacity,profile.ratios)) {
  if (!profile.hostEnabled || !team.every(Boolean) || TYPES.some(t=>!known(profile.weights[t])) || team.some(h=>heroValue(profile,h)===null)) return null;
  return TYPES.reduce((s,t,i)=>s+Math.sqrt(num(counts[t]))*num(profile.weights[t])*heroValue(profile,team[i]),0);
}
export function suggestedRatio(profile) {
  const {team,complete}=hostTeam(profile); if (!profile.hostEnabled || !complete) return null;
  const coefficients=TYPES.map((t,i)=>num(profile.weights[t])*heroValue(profile,team[i]));
  const total=coefficients.reduce((s,c)=>s+c*c,0); if(!total)return null;
  const infantry=Math.round(coefficients[0]**2/total*100);
  const cavalry=Math.round(coefficients[1]**2/total*100);
  return {infantry,cavalry,archer:100-infantry-cavalry};
}
export function upgradeComparison(profile) {
  const baseline=relativeIndex(profile);
  return profile.upgrades.map(u=>{
    let after=null;
    const copy=structuredClone(profile);
    if(u.kind==='capacity'){copy.hostCapacity=num(copy.hostCapacity)+num(u.delta);after=relativeIndex(copy);}
    else if(TYPES.includes(u.troop) && ['attack','lethality'].includes(u.stat)){copy.stats[u.troop][u.stat]=num(copy.stats[u.troop][u.stat])+num(u.delta);after=relativeIndex(copy);}
    const gain=baseline && after!==null ? (after/baseline-1)*100 : null;
    return {...u,gain,efficiency:gain!==null && num(u.cost)>0 ? gain/num(u.cost)*100 : null};
  }).sort((a,b)=>(b.gain??-1)-(a.gain??-1));
}
export function validateProfile(p) {
  if(!p || p.schemaVersion!==1)throw new Error(englishMessage("messages.engine.validateProfile.this.file.is.not.a.bearmaxxing.v1.profile"));
  const nullable = x => x === null || known(x);
  const whole = x => x === null || (known(x) && Number.isInteger(Number(x)));
  for(const t of TYPES) {
    if(!p.troops?.[t] || !p.stats?.[t] || !known(p.ratios?.[t]) || !nullable(p.weights?.[t]) || !whole(p.troops[t].count) || !nullable(p.stats[t].attack) || !nullable(p.stats[t].lethality))throw new Error(englishMessage("messages.engine.validateProfile.profile.has.missing.or.invalid.troop.stat.or.ratio.fields"));
  }
  if(p.defaultTroopTier!==undefined&&(!Number.isInteger(p.defaultTroopTier)||p.defaultTroopTier<1||p.defaultTroopTier>11))throw new Error(englishMessage("messages.engine.validateProfile.invalid.shared.troop.tier"));
  if(p.mixedTiersEnabled!==undefined&&typeof p.mixedTiersEnabled!=='boolean')throw new Error(englishMessage("messages.engine.validateProfile.invalid.mixed.tier.setting"));
  for(const t of TYPES){
    if(p.troops[t].tier!==undefined&&p.troops[t].tier!==null&&(!Number.isInteger(p.troops[t].tier)||p.troops[t].tier<1||p.troops[t].tier>11))throw new Error(englishMessage("messages.engine.validateProfile.invalid.troop.tier.override"));
    for(const [tier,count] of Object.entries(p.tierInventory?.[t]??{}))if(!/^([1-9]|10|11)$/.test(tier)||!whole(count))throw new Error(englishMessage("messages.engine.validateProfile.invalid.mixed.tier.troop.inventory"));
  }
  for(const field of ['heroes','gear','joiners','upgrades'])if(!Array.isArray(p[field]) || p[field].length>500 || p[field].some(x=>!x || typeof x!=='object'))throw new Error(englishMessage("messages.engine.validateProfile.invalid.inventory",{field:field}));
  for(const field of ['masters','pets'])if(p[field]!==undefined&&(!Array.isArray(p[field])||p[field].length>100||p[field].some(x=>!x||typeof x!=='object'||typeof x.name!=='string'||(x.notes!==undefined&&typeof x.notes!=='string'))))throw new Error(englishMessage("messages.engine.validateProfile.invalid.entries",{field:field}));
  if(p.heroes.some(h=>!(TYPES.includes(h.troop)||h.troop==='')||typeof h.name!=='string') || p.gear.some(g=>!(TYPES.includes(g.troop)||g.troop==='')||!['helmet','boots','gloves','armor',''].includes(g.slot)) || p.joiners.some(j=>typeof j.name!=='string'))throw new Error(englishMessage("messages.engine.validateProfile.invalid.hero.gear.or.joiner.fields"));
  if(p.heroes.some(h=>h.marchAvailable!==undefined&&typeof h.marchAvailable!=='boolean')||p.joiners.some(j=>!whole(j.capacity??null)||['slot2','slot3'].some(slot=>j[slot]!=null&&typeof j[slot]!=='string'))||!whole(p.accountBaseCapacity??null)||!['actual','legacy-base',undefined].includes(p.capacityInputMode))throw new Error(englishMessage("messages.engine.validateProfile.invalid.march.availability.assignment.or.capacity"));
  if(p.gear.some(g=>g.name!==undefined&&typeof g.name!=='string') || p.upgrades.some(u=>(u.name!==undefined&&typeof u.name!=='string')||(u.resource!==undefined&&typeof u.resource!=='string')))throw new Error(englishMessage("messages.engine.validateProfile.invalid.equipment.labels.or.upgrade.resource.names"));
  for(const field of ['heroes','gear']) {
    const ids=p[field].map(x=>x.id);
    if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw new Error(englishMessage("messages.engine.validateProfile.each.instance.must.have.a.unique.id",{field:field}));
  }
  if(!whole(p.hostCapacity)||!whole(p.joinCapacity)||!Number.isInteger(Number(p.joinCount))||p.joinCount<0||p.joinCount>6||![true,false,null].includes(p.hostEnabled))throw new Error(englishMessage("messages.engine.validateProfile.invalid.march.capacities.or.count"));
  const effective=p.effectiveStats??Object.fromEntries(TYPES.map(t=>[t,{attack:null,lethality:null}]));
  if(TYPES.some(t=>!effective[t]||!nullable(effective[t].attack)||!nullable(effective[t].lethality)))throw new Error(englishMessage("messages.engine.validateProfile.invalid.effective.combat.stats"));
  const {hostSelection, reserveJoiners, ...profile}=p;
  return {...profile,masters:Array.isArray(p.masters)?p.masters:[],pets:Array.isArray(p.pets)?p.pets:[],effectiveStats:effective,gearComplete:p.gearComplete===true};
}
