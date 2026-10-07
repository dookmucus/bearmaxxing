import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inventoryGroups,inventoryBalance,BEAR_FORMATION} from '../src/inventory-planning.mjs';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {accountEffects,calculate,requirements} from '../src/calculator.mjs';
import {essentialSetupError,persistAppState,restoreAppState} from '../src/setup-state.mjs';
import {validateProfile} from '../src/engine.mjs';
import {actualMarchCapacity,plannedCapacityMissing} from '../src/march-capacity-inputs.mjs';
import {evaluateHostTrio} from '../src/host-comparison.mjs';
import {hostBearComparison} from '../src/bear-comparison.mjs';
import {actionableImprovements} from '../src/results-improvements.mjs';
import {evaluateUpgrade} from '../src/upgrade-model.mjs';

const inventory=(i,c,a)=>({troops:{infantry:{count:i},cavalry:{count:c},archer:{count:a}}});
const snapshot=()=>JSON.parse(fs.readFileSync(new URL('../audits/incoming-hosting-2026-10-06/replay.json',import.meta.url))).profileSnapshot;
test('balance: each troop type can limit relative supply and others are surplus',()=>{
 for(const [counts,limiting,surplus] of [
  [[100,150,1600],['infantry'],['cavalry','archer']],
  [[150,100,1600],['cavalry'],['infantry','archer']],
  [[150,200,800],['archer'],['infantry','cavalry']]
 ]){
  const p=inventory(...counts),before=structuredClone(p),balance=inventoryBalance(p);
  assert.deepEqual(balance,{known:true,empty:false,limiting,surplus});
  assert.ok(!Object.hasOwn(balance,'totalPerGroup'));assert.ok(!Object.hasOwn(balance,'perGroup'));
  assert.deepEqual(p,before);
 }
});
test('balance: exact relative ties include all limiting types without whole-group rounding',()=>{
 for(const [counts,limiting,surplus] of [
  [[120,120,1000],['infantry','cavalry'],['archer']],
  [[120,130,960],['infantry','archer'],['cavalry']],
  [[130,120,960],['cavalry','archer'],['infantry']],
  [[120,120,960],['infantry','cavalry','archer'],[]],
  [[121,122,965],['archer'],['infantry','cavalry']],
  [[120,130,961],['infantry'],['cavalry','archer']]
 ])assert.deepEqual(inventoryBalance(inventory(...counts)),{known:true,empty:false,limiting,surplus});
});
test('balance: empty, partial-zero and unknown inventories do not invent troop targets',()=>{
 assert.deepEqual(inventoryBalance(inventory(0,0,0)),{known:true,empty:true,limiting:['infantry','cavalry','archer'],surplus:[]});
 assert.deepEqual(inventoryBalance(inventory(100,0,800)),{known:true,empty:false,limiting:['cavalry'],surplus:['infantry','archer']});
 assert.deepEqual(inventoryBalance(inventory(0,100,0)),{known:true,empty:false,limiting:['infantry','archer'],surplus:['cavalry']});
 for(const unknown of [null,undefined,'',-1,1.5,true,Infinity])assert.deepEqual(inventoryBalance(inventory(unknown,100,800)),{known:false,empty:false,limiting:[],surplus:[]});
});
test('arithmetic: whole 10/10/80 blocks conserve unbalanced inventory for 3, 4 and 5 groups',()=>{
 const p=inventory(101,150,1001),before=structuredClone(p);
 for(const [groups,blocks] of [[3,33],[4,25],[5,20]]){
  const result=inventoryGroups(p,groups);
  assert.equal(result.blocks,blocks);assert.equal(result.totalPerGroup,10*blocks);
  assert.deepEqual(result.perGroup,{infantry:blocks,cavalry:blocks,archer:8*blocks});
  assert.deepEqual(result.limiting,['infantry']);
  for(const t of ['infantry','cavalry','archer']){
   assert.ok(Number.isInteger(result.used[t]));assert.equal(result.used[t]+result.unused[t],p.troops[t].count);
   assert.ok(result.unused[t]>=0);
  }
 }
 assert.deepEqual(p,before);
 const small=inventoryGroups(inventory(10,10,10),3);
 assert.equal(small.totalPerGroup,0);assert.deepEqual(small.limiting,['archer']);
});
test('zero: empty and partially empty inventories produce zero groups without invented targets',()=>{
 for(const groups of [3,4,5]){
  const result=inventoryGroups(inventory(0,0,0),groups);
  assert.equal(result.totalPerGroup,0);assert.deepEqual(result.limiting,['infantry','cavalry','archer']);
  assert.deepEqual(result.used,{infantry:0,cavalry:0,archer:0});
 }
 assert.deepEqual(inventoryGroups(inventory(100,0,800),4).limiting,['cavalry']);
 for(const unknown of [null,undefined,'',-1,1.5,true,Infinity])assert.equal(inventoryGroups(inventory(unknown,100,800),4).known,false);
});
test('ties: all troop types sharing the minimum whole-block limit are reported',()=>{
 assert.deepEqual(inventoryGroups(inventory(120,120,1000),3).limiting,['infantry','cavalry']);
 assert.deepEqual(inventoryGroups(inventory(120,130,960),3).limiting,['infantry','archer']);
 assert.deepEqual(inventoryGroups(inventory(120,120,960),3).limiting,['infantry','cavalry','archer']);
 assert.deepEqual(inventoryGroups(inventory(121,122,965),3).limiting,['infantry','cavalry','archer']);
});
test('saved-profile: removed formation and deployment values are preserved but inactive after import and reload',()=>{
 const old=snapshot();old.schemaVersion=1;old.weights={infantry:null,cavalry:null,archer:null};Object.assign(old,{ratios:{infantry:70,cavalry:20,archer:10},hostCapacity:-1,joinCapacity:'invalid',accountBaseCapacity:999999,troopsPerMarch:123456,marchSizeByType:{infantry:1,cavalry:2,archer:3},differentMarchCapacities:true,actualMarchCapacities:{host:777,joins:[888,999]},pusherEnabled:true,actualPusherCapacity:500000,joinCount:6,marchSlots:1,hostEnabled:false});
 const original=structuredClone(old),p=migrateProfile(old);
 assert.deepEqual(p.ratios,BEAR_FORMATION);assert.equal(p.joinCount,3);assert.equal(p.hostEnabled,true);
 assert.deepEqual(p.legacyTroopPlanning.ratios,old.ratios);assert.equal(p.legacyTroopPlanning.hostEnabled,false);
 for(const field of ['hostCapacity','joinCapacity','accountBaseCapacity','troopsPerMarch','marchSizeByType','actualMarchCapacities','actualPusherCapacity'])assert.deepEqual(p[field],old[field]);
 assert.equal(actualMarchCapacity(p,'host'),null);assert.equal(plannedCapacityMissing(p),false);
 assert.equal(essentialSetupError(p,4),null);assert.doesNotThrow(()=>validateProfile(p));
 let json;const storage={getItem:()=>json,setItem:(_,value)=>json=value};
 assert.ok(persistAppState(storage,p,{step:4,completed:true}));const reloaded=restoreAppState(storage).profile;
 assert.deepEqual(migrateProfile(reloaded),reloaded);assert.deepEqual(reloaded.legacyTroopPlanning,p.legacyTroopPlanning);
 assert.deepEqual(reloaded.ratios,BEAR_FORMATION);assert.deepEqual(old,original);
 for(const field of ['heroes','gear','troops','pets','masters'])assert.deepEqual(reloaded[field],p[field]);
});
test('recommendations: absent capacities, surplus inventory and optional pusher never affect offense rankings',()=>{
 const p=migrateProfile(snapshot());
 const summarize=profile=>{
  const h=calculate(profile,'hosting'),j=calculate(profile,'joining');
  assert.ok(h.joint.canRecommend);assert.ok(j.plan.assignment.joins.length);
  assert.ok(!requirements(profile,'joining').some(s=>/capacity|inventory|slots|ratio/i.test(s)));
  assert.equal(j.plan.needed,null);assert.ok(j.plan.marches.every(m=>m.capacity===null&&m.target===null));
  return {key:h.joint.selected.key,offense:h.joint.selected.host.bear.relativeOffense,fillers:j.plan.assignment.joins.map(r=>r.heroes.map(h=>h?.id))};
 };
 const baseline=summarize(p),edited=structuredClone(p);
 for(const t of ['infantry','cavalry','archer'])edited.troops[t].count=0;
 Object.assign(edited,{ratios:{infantry:100,cavalry:0,archer:0},hostCapacity:null,joinCapacity:null,troopsPerMarch:null,accountBaseCapacity:null,pusherEnabled:true,actualPusherCapacity:123456});
 assert.deepEqual(summarize(edited),baseline);
 edited.troops.infantry.count=999999;edited.troops.cavalry.count=12345;edited.troops.archer.count=8000000;
 assert.deepEqual(summarize(edited),baseline);
 const upgrade=profile=>evaluateUpgrade(profile,{...profile,combinedPetRefinement:{...profile.combinedPetRefinement,attack:Number(profile.combinedPetRefinement.attack)+10}},accountEffects);
 const beforeUpgrade=upgrade(p),afterUpgrade=upgrade(edited);
 assert.ok(beforeUpgrade);assert.ok(afterUpgrade);
 for(const key of ['damageGain','personalPointsDelta','joiningBenefits','selectedHost','selectedJoiningLeaders'])assert.deepEqual(afterUpgrade[key],beforeUpgrade[key],key);
});
test('rankings: an exact 10/10/80 deployed count adds a common scale without changing relative team ordering',()=>{
 const p=migrateProfile(snapshot()),account=accountEffects(p),trios=[['Zoe','Petra','Yang'],['Zoe','Petra','Rosa'],['Zoe','Petra','Vivian']];
 const rows=trios.map(names=>{
  const model=evaluateHostTrio(p,names.map(n=>p.heroes.find(h=>h.name===n)),account);
  assert.equal(model.bear.damage,null);assert.ok(model.bear.missing.every(gap=>!/troop count|capacity|verified available/i.test(gap)));
  const offline=hostBearComparison(p,model.team,{deployedCounts:{infantry:10000,cavalry:10000,archer:80000}});
  return {relative:model.bear.relativeOffense,offline:offline.modeledDamage};
 });
 const scale=rows[0].offline/rows[0].relative;
 for(const row of rows)assert.ok(Math.abs(row.offline/row.relative-scale)<scale*1e-12);
 assert.deepEqual(rows.map((r,i)=>i).sort((a,b)=>rows[b].relative-rows[a].relative),rows.map((r,i)=>i).sort((a,b)=>rows[b].offline-rows[a].offline));
});
test('advice: legacy capacity upgrades and assumed troop-training targets are excluded',()=>{
 const p=migrateProfile(snapshot());p.upgrades=[{id:'old-capacity',kind:'capacity',delta:'invalid',cost:-1,name:'Saved capacity upgrade'}];
 assert.deepEqual(requirements(p,'upgrades'),[]);
 const results={hosting:calculate(p,'hosting'),joining:calculate(p,'joining'),upgrades:calculate(p,'upgrades')};
 assert.deepEqual(results.upgrades.fillerSteps,[]);assert.deepEqual(results.upgrades.upgrades,[]);
 // Even a stale result from the removed planner cannot resurrect training advice.
 results.joining.plan={totalsKnown:true,shortage:{infantry:10000,cavalry:20000,archer:80000},needed:{infantry:10000,cavalry:20000,archer:80000},targetMarchCount:4};
 const advice=actionableImprovements(p,results,accountEffects);
 assert.ok(advice.every(a=>a.id!=='troop-shortage'&&a.resource!=='Troop training'&&a.id!=='old-capacity'));
 assert.equal(p.upgrades[0].delta,'invalid');
});
