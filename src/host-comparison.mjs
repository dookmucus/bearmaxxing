import {hostingReuseContext,reusedHosting,retainHosting} from './hosting-reuse.mjs';
import {activeGearInventory,activeGearInventoryIssues,activeGearLabel} from './active-gear.mjs';
import {gearIssues,gearProgression} from './gear-progression.mjs';
import {TYPES,bestGear,gearOffense} from './engine.mjs';
import {heroContributions} from './hero-effects.mjs';
import {hostBearComparison} from './bear-comparison.mjs';
import {heroReferenceName,heroAvailableInPlanner} from './hero-identity.mjs';
import {comparisonProfile} from './inventory-planning.mjs';

const known=n=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))&&Number(n)>=0;
const key=n=>String(n??'').trim().toLocaleLowerCase();
export const heroIdentity=h=>{const id=h.canonicalHeroId??h.id;return id==='roster-jaegar'?'roster-jaeger':id;};
export function includedHostCandidates(profile){
  return TYPES.map(t=>profile.heroes.filter(h=>heroAvailableInPlanner(h)&&h.troop===t&&h.owned===true&&h.included!==false&&h.marchAvailable!==false));
}
export function evaluateHostTrio(profile,heroes,account,prepared){
  profile=comparisonProfile(profile);
  if(!known(account.attack)||!known(account.lethality)||TYPES.some(t=>!known(account.classLethality[t])))return null;
  const reuse=prepared?prepared.reuse:hostingReuseContext(profile,account),cached=reusedHosting(reuse,heroes);
  if(cached)return cached;
  const contributions=heroes.map(h=>prepared?.contributions.get(heroIdentity(h))??heroContributions(h));
  if(contributions.some(c=>!known(c.inherentAttack)||!known(c.widgetLethality)||!known(c.widgetRallyLethality)||!known(c.widgetRallyAttack)||!c.comparisonReady))return null;
  const sharedAttack=contributions.reduce((n,c)=>n+c.sharedAttack+c.widgetRallyAttack,0);
  const sharedLethality=contributions.reduce((n,c)=>n+c.sharedLethality+c.widgetRallyLethality,0);
  const entries=heroes.map((hero,i)=>{
    const t=hero.troop,base=profile.stats[t],c=contributions[i],gear=prepared?.gear[t]??bestGear(profile,t);
    // Optional permanent stats are outside the comparison when absent; no game formula is invented.
    const baseAttack=known(base?.attack)?Number(base.attack):0,baseLethality=known(base?.lethality)?Number(base.lethality):0;
    const gearAttack=gear.reduce((n,g)=>n+gearOffense(g).attack,0);
    const gearLethality=gear.reduce((n,g)=>n+gearOffense(g).lethality,0);
    // Expedition skills and rally widget skills belong to separate operation
    // layers. Ordinary widget stats remain class-local stat additions.
    const attack=baseAttack+c.inherentAttack+gearAttack+account.attack;
    const lethality=baseLethality+c.inherentLethality+c.widgetLethality+gearLethality+account.lethality+account.classLethality[t];
    const factor=(1+attack/100)*(1+lethality/100)*(1+c.classAttackMultiplier/100)*(1+c.classLethalityMultiplier/100);
    return {hero,gear,factor,contribution:c,attack,lethality,gearAttack,gearLethality};
  });
  if(entries.some(x=>!x))return null;
  const bear=hostBearComparison(profile,entries);
  for(const entry of entries){
    entry.factor=bear.classes[entry.hero.troop]['independent-late-counter'];
    entry.bearEffects=bear.effects.filter(effect=>effect.hero===heroReferenceName(entry.hero));
  }
  const total=TYPES.reduce((n,t)=>n+Number(profile.ratios?.[t]??0),0);
  const index=total>0?TYPES.reduce((n,t)=>n+entries.find(e=>e.hero.troop===t).factor*Number(profile.ratios?.[t]??0)/total,0):null;
  return retainHosting(reuse,heroes,{team:entries,index,bear,coverageComplete:contributions.every(c=>c.offenseCoverageComplete)&&bear.coverageComplete,unresolvedOffensive:contributions.flatMap((c,i)=>c.unresolvedOffensive.map(e=>({...e,hero:heroes[i].name}))),assumptions:contributions.flatMap(c=>c.assumptions),uncertain:[...new Set([...contributions.flatMap(c=>c.uncertain),...bear.uncertainties,...bear.missing])]});
}
export function compareHosts(profile,account){
  profile=comparisonProfile(profile);
  const groups=includedHostCandidates(profile);
  const gaps=groups.flat().flatMap(h=>{
    const c=heroContributions(h),reasons=[];
    if(!known(c.inherentAttack))reasons.push('Inherent Expedition Attack at the entered star step is not mapped');
    if(!known(c.widgetLethality))reasons.push(`Widget Expedition Lethality at level ${h.widget??'unset'} is not mapped`);
    if(!known(c.widgetRallyLethality))reasons.push(`Widget rally skill at level ${h.widget??'unset'} is not mapped`);
    if(!known(c.widgetRallyAttack))reasons.push(`Widget hosting Attack at level ${h.widget??'unset'} is not mapped`);
    if(!c.comparisonReady)reasons.push(...c.uncertain);
    return reasons.length?[{heroId:h.id,name:h.name,reasons}]:[];
  });
  const gearGaps=activeGearInventory(profile).filter(g=>!gearIssues(g).length&&gearProgression(g)?.uncertain.length).map(g=>({gearId:g.id,name:activeGearLabel(g),reasons:gearProgression(g).uncertain,kind:'reference-gap'}));
  const scope=`Bear-specific scenario comparison at ${TYPES.map(t=>profile.ratios?.[t]??'unset').join('/')}, using entered progression and transferable gear. Known offensive effects enter documented family/timing sensitivity cases; unmapped values remain unknown. The legacy ratio-weighted index is diagnostic only and does not establish Bear damage or select the complete plan.`;
  const evaluable=h=>{const c=heroContributions(h);return known(c.inherentAttack)&&known(c.widgetLethality)&&known(c.widgetRallyLethality)&&known(c.widgetRallyAttack)&&c.comparisonReady;};
  const unevaluated=groups.flat().filter(h=>!evaluable(h)).map(h=>h.name);
  const options=groups.map(group=>group.filter(evaluable));
  if(options.some(group=>!group.length)||gearGaps.length||activeGearInventoryIssues(profile).length||activeGearInventory(profile).some(g=>gearIssues(g).length))return {best:null,alternatives:[],unevaluated,gaps:[...gaps,...gearGaps],scope};
  const combinations=[];
  const prepared={reuse:hostingReuseContext(profile,account),contributions:new Map(options.flat().map(h=>[heroIdentity(h),heroContributions(h)])),gear:Object.fromEntries(TYPES.map(t=>[t,bestGear(profile,t)]))};
  for(const i of options[0])for(const c of options[1])for(const a of options[2]){
    const names=[i,c,a].map(h=>key(h.name));
    if(new Set(names).size!==3||new Set([i,c,a].map(heroIdentity)).size!==3)continue;
    const result=evaluateHostTrio(profile,[i,c,a],account,prepared);
    if(result)combinations.push(result);
  }
  const order=(a,b)=>{const av=a.bear.modeledDamage,bv=b.bear.modeledDamage;return av==null?(bv==null?a.team.map(e=>heroIdentity(e.hero)).join(',').localeCompare(b.team.map(e=>heroIdentity(e.hero)).join(',')):1):bv==null?-1:bv-av||a.team.map(e=>heroIdentity(e.hero)).join(',').localeCompare(b.team.map(e=>heroIdentity(e.hero)).join(','));};
  combinations.sort(order);
  const best=combinations[0]??null;
  const candidates=best?combinations.filter(x=>x.team.some((e,i)=>e.hero.id!==best.team[i].hero.id)):[];
  candidates.sort(order);
  const alternatives=candidates.slice(0,12).map(x=>({...x,relativeIndex:best.index&&x.index?(best.index/x.index-1)*100:null}));
  const singleAlternatives=best?TYPES.map((t,i)=>candidates.find(x=>x.team[i].hero.id!==best.team[i].hero.id&&x.team.every((e,j)=>j===i||e.hero.id===best.team[j].hero.id))).filter(Boolean):[];
  return {best,options:combinations,alternatives,singleAlternatives,unevaluated,gaps,scope,coverageComplete:best?.coverageComplete??false,unresolvedOffensive:best?.unresolvedOffensive??[],assumptions:best?.assumptions??[],omissions:[...new Set(best?.team.flatMap(entry=>entry.contribution.uncertain.map(reason=>`${entry.hero.name}: ${reason}`))??[])]};
}
