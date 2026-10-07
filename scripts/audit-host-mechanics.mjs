// Offline audit only: consumes the preserved complete profile and latest replay.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {hostBearComparison,BEAR_MECHANICS,HOST_SCENARIOS} from '../src/bear-comparison.mjs';
import {evaluateHostTrio} from '../src/host-comparison.mjs';
import {accountEffects} from '../src/calculator.mjs';
import {bearTroop,troopDamageMultiplier} from '../src/bear-troops.mjs';
const TYPES=['infantry','cavalry','archer'];
export function auditHostMechanics(audit){
 const profile=structuredClone(audit.profileSnapshot),before=JSON.stringify(profile);
 const sourceRows=audit.comparison;
 const centralBaseline='finite-111',centralScenario='independent-late-counter';
 const key=(baseline,scenario)=>`${baseline}:${scenario}:independent`;
 const rows=sourceRows.map(row=>({...row,hero:row.heroes[2]}));
 const winner=(baseline,scenario)=>[...rows].sort((a,b)=>b.damageDimensions[key(baseline,scenario)]-a.damageDimensions[key(baseline,scenario)])[0].hero;
 const baselines=[...new Set(Object.keys(rows[0].damageDimensions).map(k=>k.split(':')[0]))];
 const changes=HOST_SCENARIOS.filter(s=>s.id!==centralScenario).map(s=>{
  const cases=baselines.map(b=>({baseline:b,before:winner(b,centralScenario),after:winner(b,s.id),values:Object.fromEntries(rows.map(r=>[r.hero,r.damageDimensions[key(b,s.id)]]))}));
  return {id:s.id,assumption:s,isolated:!['overlap-101','overlap-102','vivian-initial-phase'].includes(s.id),centralWinner:winner(centralBaseline,s.id),centralValues:cases.find(c=>c.baseline===centralBaseline).values,changedWinners:cases.filter(c=>c.before!==c.after),cases};
 });
 const baselineOnly=baselines.map(b=>({baseline:b,winner:winner(b,centralScenario),values:Object.fromEntries(rows.map(r=>[r.hero,r.damageDimensions[key(b,centralScenario)]]))}));
 // Reconstruct per-class terms from production totals, including the same count
 // scale. These permit algebraic checks of a common Archer-only proc factor;
 // they do not establish how a new attack would advance Vivian's counter.
 const replay=row=>{const result=evaluateHostTrio(profile,row.heroes.map(n=>profile.heroes.find(h=>h.name===n)),accountEffects(profile));
  if(!audit.centralContext)result.bear=hostBearComparison(profile,result.team,{incomingContexts:[{id:'historical-no-incoming',central:true,skills:[]}]});
  return result;};
 const current=rows.map(replay);
 const troopCount=Object.values(profile.marchSizeByType??{}).reduce((n,c)=>n+Number(c),0)||Number(profile.troopsPerMarch??profile.maximumMarchSize);
 const counts=profile.marchSizeByType??Object.fromEntries(TYPES.map(t=>[t,Math.round(troopCount*profile.ratios[t]/100)]));
 const target=BEAR_MECHANICS.bear,scale=Math.sqrt(troopCount*Math.min(troopCount,target.targetCount))*target.rounds/(target.targetDefense*target.targetHealth/100)/100;
 const decompositions=current.map((r,index)=>{
  const rallyAttack=r.team.reduce((n,e)=>n+e.contribution.widgetRallyAttack,0),rallyLethality=r.team.reduce((n,e)=>n+e.contribution.widgetRallyLethality,0);
  const entries=r.team.map(e=>{
   const t=e.hero.troop,attack=e.attack+r.bear.baselineCases.find(b=>b.central).values[t].attack-Number(profile.stats[t].attack??0),lethality=e.lethality+r.bear.baselineCases.find(b=>b.central).values[t].lethality-Number(profile.stats[t].lethality??0),troop=bearTroop(profile,t);
   const ordinary=(1+attack/100)*(1+lethality/100),skill=r.bear.eventSummaries[centralScenario].expectedClassTotals[t]/target.rounds;
   const withoutWidget=scale*Math.sqrt(counts[t]/troopCount)*troop.coefficient.attack*troop.coefficient.lethality/100*ordinary*skill*troopDamageMultiplier({...troop,effects:troop.effects.filter(e=>e.name!=='Volley')});
   return {troop:t,attack,lethality,withoutWidget,central:withoutWidget*(1+rallyAttack/100)*(1+rallyLethality/100),additiveWidgetStress:withoutWidget*(1+rallyAttack/(100+attack))*(1+rallyLethality/(100+lethality))};
  });
  const total=entries.reduce((n,e)=>n+e.central,0);
  if(Math.abs(total-r.bear.modeledDamage)>total*1e-10)throw new Error('Class decomposition does not reproduce production');
  return {hero:rows[index].hero,rallyAttack,rallyLethality,sameStatWidgetCollision:r.team.filter(e=>e.contribution.widgetRallyAttack>0).length>1||r.team.filter(e=>e.contribution.widgetRallyLethality>0).length>1,entries,total,additiveWidgetStress:entries.reduce((n,e)=>n+e.additiveWidgetStress,0),crossStatAdditiveStress:total*(1+(rallyAttack+rallyLethality)/100)/((1+rallyAttack/100)*(1+rallyLethality/100))};
 });
 // Add isolated probability stress cases only inside this offline process;
 // restore the shared scenario list and never change the troop mapping/profile.
 const originalLength=HOST_SCENARIOS.length,volleySweep=[];
 try{
  const cases=[.025,.05,.075,.10,.15,.20,.50,.75];
  for(const probability of cases)HOST_SCENARIOS.push({...HOST_SCENARIOS[0],id:`offline-volley-${probability}`,volleyProbability:probability});
  const swept=rows.map(replay);
  for(const probability of cases){const values=Object.fromEntries(swept.map((r,i)=>[rows[i].hero,r.bear.damageDimensions[key(centralBaseline,`offline-volley-${probability}`)]]));volleySweep.push({probability,values,winner:Object.keys(values).sort((a,b)=>values[b]-values[a])[0],evidence:'Hypothetical sensitivity, not a sourced TG6 probability'});}
 }finally{HOST_SCENARIOS.splice(originalLength);}
 const howlingAlgebra=['Rosa','Vivian'].map(other=>{
  const a=decompositions.find(d=>d.hero==='Yang'),b=decompositions.find(d=>d.hero===other);
  const arc=d=>d.entries.find(e=>e.troop==='archer').central/1.15,rest=d=>d.entries.filter(e=>e.troop!=='archer').reduce((n,e)=>n+e.central,0);
  const deltaArcher=arc(a)-arc(b),deltaOther=rest(a)-rest(b),threshold=deltaArcher? -deltaOther/deltaArcher:null;
  return {pair:['Yang',other],deltaArcher,deltaOther,commonArcherFactorAtTie:threshold,centralFactor:1.15,reversalWithinSingleHowlingBound:threshold!=null&&threshold>=1&&threshold<=1.5,scope:'Only a common Archer damage factor with unchanged event/counter behavior; not Volley/Howling correlation or attack spawning'};
 });
 if(JSON.stringify(profile)!==before)throw new Error('Profile changed during audit');
 return {profileHash:createHash('sha256').update(before).digest('hex'),central:Object.fromEntries(rows.map(r=>[r.hero,r.damage])),changes,baselineOnly,decompositions,volleySweep,howlingAlgebra,limits:['Scenario counts are not probabilities','Compound operation merges cannot identify a single causal mechanic','Widget additive scenarios are adversarial model checks, not documented game alternatives','Unknown proc/counter correlations are not resolved by a common-factor algebra check']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const input=process.argv[2]??'audits/handoff-replay-2026-10-06/replay.json',out=process.argv[3]??'audits/mechanics-validation-2026-10-06/sensitivity.json';
 const raw=fs.readFileSync(input),result=auditHostMechanics(JSON.parse(raw));
 if(!fs.readFileSync(input).equals(raw))throw new Error('Audit input changed');
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({central:result.central,changes:result.changes.map(c=>({id:c.id,centralWinner:c.centralWinner,changedMatchedBaselineCases:c.changedWinners.length})),widgets:result.decompositions.map(d=>({hero:d.hero,additiveStress:d.additiveWidgetStress,crossStatStress:d.crossStatAdditiveStress})),howling:result.howlingAlgebra},null,2));
}
