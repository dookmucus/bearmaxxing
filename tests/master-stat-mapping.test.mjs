import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enteredRosterProfile as emptyProfile} from './helpers/entered-roster.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {masterAffinityDefinition,masterAffinityInfo,masterEffects,masterSquadBonus} from '../src/master-effects.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {evaluateHostTrio} from '../src/host-comparison.mjs';

const mappings={Valora:'attack',Roman:'attack',Wilson:'attack',Aena:'attack',Cassia:'lethality',Guinevere:'lethality',Isnor:'lethality'};
test('every entered affinity percentage maps explicitly to its sourced stat, independent of magnitude',()=>{
 for(const [name,stat] of Object.entries(mappings)){
  const p=emptyProfile(),m=p.masters.find(m=>m.name===name);
  assert.equal(masterAffinityDefinition(name).stat,stat);
  assert.equal(masterAffinityDefinition(name).label,stat==='attack'?'Squad ATK (%)':'Squad Lethality (%)');
  for(const amount of ['0.00','4.58','14.40','99.123']){
   Object.assign(m,{affinityLevel:100,squadBonus:amount,attack:888,lethality:777});
   const effect=masterEffects(m);
   assert.equal(effect[stat],Number(amount));
   assert.equal(effect[stat==='attack'?'lethality':'attack'],0);
   assert.equal(masterSquadBonus(m).kind,stat);
   assert.match(masterAffinityInfo(m),/Source: Kingshot (Database|Optimizer)/);
   assert.ok(masterAffinityInfo(m).includes(`${amount}%`));
   assert.equal(migrateProfile(p).masters.find(m=>m.name===name).squadBonus,amount);
  }
 }
});
test('Defense and unmapped masters never inherit an Attack mapping from a saved percentage',()=>{
 for(const name of ['Pan','Unknown master']){
  const m={name,affinityLevel:100,squadBonus:'14.40',talentLevel:10,skillLevels:{1:10,2:20,3:20,4:20}};
  const effect=masterEffects(m);
  assert.equal(effect.attack,0);assert.equal(effect.lethality,0);
  assert.equal(masterSquadBonus(m).kind,null);
 }
});
test('every master percentage flows once to the correct recommendation stat and offense factor',()=>{
 for(const [name,stat] of Object.entries(mappings)){
  const p=emptyProfile();p.heroes.find(h=>h.name==='Helga').owned=false;p.pets=[]; // Isolate Master stat deltas.
  const recommendation=calculate(p,'hosting');assert.ok(recommendation.team);
  const heroes=recommendation.team.map(entry=>entry.hero);
  const before=evaluateHostTrio(p,heroes,accountEffects(p));
  p.masters.find(m=>m.name===name).squadBonus='14.40';
  const after=evaluateHostTrio(p,heroes,accountEffects(p));
  const next=calculate(p,'hosting');
  assert.equal(next.shared[stat],14.4);
  assert.equal(next.shared[stat==='attack'?'lethality':'attack'],0);
  for(let i=0;i<3;i++){
   assert.ok(Math.abs(after.team[i][stat]-before.team[i][stat]-14.4)<1e-9);
   assert.equal(after.team[i][stat==='attack'?'lethality':'attack'],before.team[i][stat==='attack'?'lethality':'attack']);
   const entry=before.team[i],t=entry.hero.troop,central=before.bear.baselineCases.find(b=>b.central);
   const baseline=entry[stat]+central.values[t][stat]-Number(p.stats[t][stat]??0);
   const expected=entry.factor*(100+baseline+14.4)/(100+baseline);
   assert.ok(Math.abs(after.team[i].factor-expected)<1e-9);
  }
 }
});
test('Cassia affinity, distinct skills, talent and research cannot collapse into one bonus',()=>{
 const p=emptyProfile();p.heroes.find(h=>h.name==='Helga').owned=false;p.pets=[]; // Isolate Master stat deltas.
 const cassia=p.masters.find(m=>m.name==='Cassia');
 Object.assign(cassia,{affinityLevel:100,squadBonus:'14.40',talentLevel:11,skillLevels:{1:0,2:4,3:6,4:2},specialResearchProgress:400});
 assert.equal(masterEffects(cassia).attack,2);
 assert.equal(masterEffects(cassia).lethality,17.4);
 assert.equal(masterEffects(cassia).deploy,10000);
 assert.equal(masterEffects(cassia).rally,10000);
 assert.match(masterEffects(cassia).unsupported.join(' '),/Research/);
 const roman=p.masters.find(m=>m.name==='Roman');
 Object.assign(roman,{affinityLevel:100,squadBonus:'14.40',specialResearchProgress:400});
 assert.equal(masterEffects(roman).attack,20.4);
 assert.equal(masterEffects(roman).lethality,0);
 roman.squadBonus='0.00';assert.equal(masterEffects(roman).attack,6);
 cassia.squadBonus='0.00';assert.equal(masterEffects(cassia).lethality,3);
});
