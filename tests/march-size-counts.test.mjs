import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {maximumMarchSize,setMarchSizeByType,actualMarchCapacity,marchSizeInputError} from '../src/march-capacity-inputs.mjs';
import {calculate} from '../src/calculator.mjs';
import {essentialSetupError,persistAppState,restoreAppState} from '../src/setup-state.mjs';
const ready=()=>{const p=emptyProfile();for(const t of ['infantry','cavalry','archer'])p.troops[t].count=1000000;return migrateProfile(p);};
test('three entered counts sum immediately and apply once to the four planned hero marches',()=>{
 let p=ready();p=setMarchSizeByType(p,'infantry',12000);p=setMarchSizeByType(p,'cavalry',18000);p=setMarchSizeByType(p,'archer',80003);
 assert.equal(maximumMarchSize(p),110003);assert.equal(p.troopsPerMarch,110003);
 p.troopsPerMarch=999999;p.actualMarchCapacities={host:999999,joins:[999999,999999,999999]};
 assert.equal(actualMarchCapacity(p,'host'),110003);
 const plan=calculate(p,'joining').plan;
 assert.deepEqual(plan.marches.map(m=>m.capacity),Array(4).fill(110003));
 assert.deepEqual(plan.needed,{infantry:44000,cavalry:44000,archer:352012});
 assert.deepEqual(p.ratios,{infantry:10,cavalry:10,archer:80});
 p=setMarchSizeByType(p,'cavalry',0);assert.equal(maximumMarchSize(p),92003);
 assert.equal(essentialSetupError(p,4),null);
});
test('saved totals survive until class entry without manufacturing class counts; zero never restores the saved total',()=>{
 const old=ready();old.troopsPerMarch=150000;
 const migrated=migrateProfile(old);assert.equal(maximumMarchSize(migrated),150000);assert.equal(Object.hasOwn(migrated,'marchSizeByType'),false);
 let p=setMarchSizeByType(migrated,'archer',80000);
 assert.equal(p.legacyMaximumMarchSize,150000);assert.deepEqual(p.marchSizeByType,{infantry:0,cavalry:0,archer:80000});
 p=setMarchSizeByType(p,'archer',0);assert.equal(maximumMarchSize(p),null);assert.equal(p.legacyMaximumMarchSize,150000);
 assert.equal(calculate(p,'joining').plan.needed,null);assert.equal(essentialSetupError(p,4),null);
});
test('count inputs preserve integers and reject invalid totals without invented targets',()=>{
 for(const value of [-1,1.5,Infinity,true,'invalid']){
  const p=setMarchSizeByType(ready(),'infantry',value);
  assert.equal(maximumMarchSize(p),null);assert.ok(marchSizeInputError(p));assert.ok(essentialSetupError(p,4));
  assert.equal(calculate(p,'joining').plan.needed,null);
 }
 const p=setMarchSizeByType(ready(),'infantry','123456');assert.equal(maximumMarchSize(p),123456);
});
test('class counts and archived totals round-trip without changing pusher handling',()=>{
 let p=ready();p.troopsPerMarch=100000;p=setMarchSizeByType(p,'archer',80000);p=setMarchSizeByType(p,'infantry',10000);p=setMarchSizeByType(p,'cavalry',10000);
 p.pusherEnabled=true;p.marchSlots=5;p.actualPusherCapacity=50000;
 const data=new Map(),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 persistAppState(store,p,{step:4,completed:true});const saved=restoreAppState(store).profile;
 assert.deepEqual(saved.marchSizeByType,p.marchSizeByType);assert.equal(saved.legacyMaximumMarchSize,100000);
 assert.equal(actualMarchCapacity(saved,'pusher'),null);assert.equal(calculate(saved,'joining').plan.targetMarchCount,4);
});
