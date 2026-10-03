export const TYPES = ['infantry', 'cavalry', 'archer'];
export const num = (x) => Math.max(0, Number.isFinite(Number(x)) ? Number(x) : 0);
export const fmt = (x) => Math.round(num(x)).toLocaleString('en-US');
export function split(capacity, ratios) {
  const total = TYPES.reduce((s,t) => s + num(ratios[t]), 0);
  if (!total) return Object.fromEntries(TYPES.map(t => [t, 0]));
  const cap = Math.floor(num(capacity));
  const infantry = Math.floor(cap * num(ratios.infantry) / total);
  const cavalry = Math.floor(cap * num(ratios.cavalry) / total);
  return {infantry, cavalry, archer: cap - infantry - cavalry};
}
export function troopPlan(profile) {
  let remaining = Object.fromEntries(TYPES.map(t => [t, Math.floor(num(profile.troops[t].count))]));
  const capacities = [...(profile.hostEnabled ? [num(profile.hostCapacity)] : []), ...Array.from({length: Math.min(6, Math.floor(num(profile.joinCount)))}, () => num(profile.joinCapacity))];
  const names = [...(profile.hostEnabled ? ['Your rally'] : []), ...Array.from({length: Math.min(6, Math.floor(num(profile.joinCount)))}, (_,i) => `Join march ${i+1}`)];
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
  return ['helmet','boots','gloves','armor'].map(slot => profile.gear.filter(g=>g.troop===troop && g.slot===slot).sort((a,b)=>num(b.lethality)-num(a.lethality))[0]).filter(Boolean);
}
export function heroValue(profile, hero) {
  const t=hero.troop;
  const base=profile.stats[t];
  const gear=bestGear(profile,t).reduce((s,g)=>s+num(g.lethality),0);
  return (1+(num(base.attack)+num(hero.attack))/100)*(1+(num(base.lethality)+num(hero.lethality)+gear)/100)*Math.max(1,num(hero.multiplier));
}
export function hostTeam(profile) {
  const reserved=new Set(profile.joiners.slice(0,Math.floor(num(profile.joinCount))).map(j=>j.name));
  const team=TYPES.map(t=>profile.heroes.filter(h=>h.troop===t && h.modeled && !reserved.has(h.name)).sort((a,b)=>heroValue(profile,b)-heroValue(profile,a))[0] || null);
  return {team,reserved,complete:team.every(Boolean)};
}
export function relativeIndex(profile, team=hostTeam(profile).team, counts=split(profile.hostCapacity,profile.ratios)) {
  if (!profile.hostEnabled || !team.every(Boolean)) return null;
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
export function priorities(p) {
  const plan=troopPlan(p), out=[];
  TYPES.forEach(t=>{if(plan.shortage[t]>0)out.push({kind:'Training',title:`Train ${fmt(plan.shortage[t])} more ${t==='archer'?'archers':t}`,body:`This closes the ${t} gap across your simultaneous marches at the selected ratio. Hosting march is filled first.`,tag:'Exact inventory gap'});});
  p.joiners.slice(0,p.joinCount).forEach(j=>{if(j.name!=='None' && num(j.skill)<5)out.push({kind:'Skills',title:`Develop ${j.name}'s first Expedition skill`,body:`Current level ${j.skill}; target level 5. This is useful when the rally selects your joiner skill. Confirm the skill's displayed bonus in game.`,tag:'Conditional rally benefit'});});
  const host=hostTeam(p);
  if(p.hostEnabled && !host.complete)out.push({kind:'Hero setup',title:'Complete your hosting hero comparison',body:'Add one modeled candidate per troop type, excluding heroes reserved for joining. Hero power alone cannot identify the best Bear team.',tag:'More information needed'});
  if(p.hostEnabled && host.complete)out.push({kind:'Equipment',title:'Concentrate offensive gear on your hosting team',body:`Assign your best compatible pieces to ${host.team.map(h=>h.name).join(', ')}. Gear is ranked by entered Expedition lethality, not enhancement level alone.`,tag:'Based on entered stats'});
  if(!out.length)out.push({kind:'Next step',title:'Compare your next offensive upgrades',body:'Your selected troop targets are covered. Add the actual stat increase and cost of your next gear or research upgrade in the Upgrade lab.',tag:'Ready to compare'});
  return out;
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
  if(!p || p.schemaVersion!==1)throw new Error('This file is not a BearMaxxing v1 profile.');
  for(const t of TYPES) {
    if(!p.troops?.[t] || !p.stats?.[t] || !Number.isFinite(Number(p.ratios?.[t])) || !Number.isFinite(Number(p.weights?.[t])))throw new Error('Profile is missing troop, stat, or ratio fields.');
  }
  for(const field of ['heroes','gear','joiners','upgrades'])if(!Array.isArray(p[field]) || p[field].length>500 || p[field].some(x=>!x || typeof x!=='object'))throw new Error(`Invalid ${field} inventory.`);
  if(p.heroes.some(h=>!TYPES.includes(h.troop)||typeof h.name!=='string') || p.gear.some(g=>!TYPES.includes(g.troop)||!['helmet','boots','gloves','armor'].includes(g.slot)) || p.joiners.some(j=>typeof j.name!=='string'))throw new Error('Invalid hero, gear, or joiner fields.');
  if(!Number.isFinite(Number(p.hostCapacity))||!Number.isFinite(Number(p.joinCapacity))||!Number.isInteger(Number(p.joinCount))||p.joinCount<0||p.joinCount>6)throw new Error('Invalid march capacities or count.');
  return p;
}
