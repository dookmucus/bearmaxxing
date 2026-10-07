import {presentationValue} from '../src/calculation-payload.mjs';
import {test} from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {calculate,requirements} from '../src/calculator.mjs';
import {setSharedMarchCapacity,actualMarchCapacity} from '../src/march-capacity-inputs.mjs';
import {inventorySupportedTotal} from '../src/march-plan.mjs';
import {troopPlan} from '../src/engine.mjs';
import {essentialSetupError,restoreAppState,persistAppState} from '../src/setup-state.mjs';
const ready=()=>{
 const p=JSON.parse(fs.readFileSync(new URL('../audits/incoming-hosting-2026-10-06/replay.json',import.meta.url))).profileSnapshot;p.troopsPerMarch=100003;
 p.differentMarchCapacities=true;p.actualMarchCapacities={host:90000,joins:[null,250000,70000]};p.actualPusherCapacity=40000;
 for(const t of ['infantry','cavalry','archer'])p.troops[t].count=999999;
 return migrateProfile(p);
};
test('legacy maximum and capacity bonuses cannot set deployment targets',()=>{
 const p=ready();p.accountBaseCapacity=99999;p.masters.find(m=>m.name==='Valora').skillLevels[4]=5;p.pets.find(p=>p.name==='Mighty Bison').level=11;
 const plan=calculate(p,'joining').plan;
 assert.deepEqual(plan.marches.map(r=>r.capacity),[null,null,null,null]);
 assert.equal(plan.needed,null);
 const stored=structuredClone(p.actualMarchCapacities),changed=setSharedMarchCapacity(p,88888);
 assert.deepEqual(changed.actualMarchCapacities,stored);assert.equal(changed.actualPusherCapacity,40000);
 assert.equal(actualMarchCapacity(changed,'host'),null);assert.equal(actualMarchCapacity(changed,'join',1),null);
 assert.deepEqual(migrateProfile(changed).actualMarchCapacities,stored);
});
test('zero or unset capacity leaves teams, upgrade recommendations and wizard completion available without shortages',()=>{
 for(const value of [0,null,undefined,'']){
  const p=ready();p.troopsPerMarch=value;
  const result=calculate(p,'joining');
  assert.ok(result.plan.marches.every(r=>r.heroes.length===3));
  assert.equal(new Set(result.plan.marches.flatMap(r=>r.heroes.map(h=>h.id))).size,12);
  assert.equal(result.plan.needed,null);assert.ok(Object.values(result.plan.shortage).every(n=>n===null));
  assert.ok(!result.missing.some(s=>/capacity|Maximum march size/i.test(s)));
  assert.equal(essentialSetupError(p,4),null);

  p.upgrades=[{kind:'capacity',name:'Capacity upgrade',delta:1000,cost:0}];
  assert.ok(!requirements(p,'upgrades').some(s=>s.includes('Maximum march size')));
  assert.deepEqual(calculate(p,'upgrades').upgrades,[]);
 }
 const fresh=restoreAppState(null);assert.equal(fresh.profile.capacityPlanningModel,'inventory-groups');assert.equal(essentialSetupError(fresh.profile,4),null);
});
test('saved pusher remains inactive in the four-march baseline',()=>{
 const p=ready();p.pusherEnabled=true;p.marchSlots=5;
 const result=calculate(p,'joining'),plan=result.plan;
 assert.equal(plan.marches.length,4);assert.equal(plan.targetMarchCount,4);assert.equal(plan.totalsKnown,false);
 assert.ok(!plan.marches.some(m=>m.name==='Hero-free pusher'));assert.equal(p.actualPusherCapacity,40000);
 assert.ok(!result.missing.some(message=>/pusher|slots/i.test(message)));
 for(const t of ['infantry','cavalry','archer'])assert.equal(plan.marches.reduce((n,r)=>n+(r.available?.[t]??0),0)+plan.remaining[t],p.troops[t].count);
});
test('inventory-supported volume is computed from totals without creating a capacity or shortages',()=>{
 const p=ready();p.troopsPerMarch=0;
 Object.assign(p.troops.infantry,{count:10001});p.troops.cavalry.count=20000;p.troops.archer.count=80009;
 assert.equal(inventorySupportedTotal(p),100010);
 p.troops.infantry.count=20000;assert.equal(inventorySupportedTotal(p),100010);
 p.troops.cavalry.count=0;assert.equal(inventorySupportedTotal(p),0);
 p.troops.cavalry.count=null;assert.equal(inventorySupportedTotal(p),null);
 assert.equal(calculate(p,'joining').plan?.needed??null,null);assert.equal(p.troopsPerMarch,0);
});
test('saved capacities and setup survive local persistence with deployment inputs inactive',()=>{
 const p=ready(),data=new Map(),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 persistAppState(store,p,{step:3,completed:false});const restored=restoreAppState(store);
 assert.deepEqual(restored.setup,{step:3,completed:false});assert.deepEqual(restored.profile.actualMarchCapacities,p.actualMarchCapacities);
 assert.equal(restored.profile.actualPusherCapacity,40000);
 assert.equal(actualMarchCapacity(restored.profile,'join',0),null);
});

test('saved pusher participation cannot change baseline readiness, allocation, hosting or upgrade priorities',()=>{
 const baseline=ready();baseline.marchSlots=4;baseline.hostCapacity=100003;baseline.joinCapacity=100003;
 const archived={...baseline,pusherEnabled:true,pusherCapacity:-1,actualPusherCapacity:9999999};
 for(const calculation of ['hosting','joining','upgrades']){
  assert.deepEqual(requirements(archived,calculation),requirements(baseline,calculation));
  assert.deepEqual(presentationValue(calculate(archived,calculation)),presentationValue(calculate(baseline,calculation)));
 }
 assert.equal(essentialSetupError(archived,4),essentialSetupError(baseline,4));
 assert.deepEqual(troopPlan(archived),troopPlan(baseline));
 const restored=migrateProfile(archived);
 assert.equal(restored.pusherEnabled,true);assert.equal(restored.pusherCapacity,-1);assert.equal(restored.actualPusherCapacity,9999999);
 assert.equal(restored.marchSlots,4);assert.equal(calculate(restored,'joining').plan.marches.length,4);
});
