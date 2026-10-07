import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {actualMarchCapacity,plannedCapacityMissing,setSharedMarchCapacity,setIndividualMarchCapacity,usesActualMarchInputs,usesSharedMaximum,pusherParticipates} from '../src/march-capacity-inputs.mjs';
import {essentialSetupError,persistAppState,restoreAppState} from '../src/setup-state.mjs';

test('legacy deployment inputs remain inactive before and after migration',()=>{
 const p=emptyProfile();Object.assign(p,{capacityPlanningModel:'shared-maximum',hostCapacity:100000,joinCapacity:90000,accountBaseCapacity:60000,pusherEnabled:true,marchSlots:5,troopsPerMarch:100000});
 for(const profile of [p,migrateProfile(p)]){
  for(const kind of ['host','join','pusher'])assert.equal(actualMarchCapacity(profile,kind),null);
  assert.equal(plannedCapacityMissing(profile),false);assert.equal(usesActualMarchInputs(profile),false);assert.equal(usesSharedMaximum(profile),false);assert.equal(pusherParticipates(profile),false);
  assert.equal(essentialSetupError(profile,4),null);
 }
});
test('saved legacy capacities and confirmation data survive reload without conversion or activation',()=>{
 const old=emptyProfile();old.hostCapacity=120000;old.joinCapacity=95000;old.joiners[0].capacity=90000.5;old.capacityConfirmation=[{key:'join-0'}];
 let p=migrateProfile(old);p=setSharedMarchCapacity(p,130000);p=setIndividualMarchCapacity(p,'join',1,110000);
 let saved;const storage={setItem:(_,v)=>saved=v,getItem:()=>saved};
 assert.ok(persistAppState(storage,p,{step:4,completed:true}));const next=restoreAppState(storage).profile;
 assert.equal(next.troopsPerMarch,130000);assert.equal(next.actualMarchCapacities.joins[1],110000);assert.equal(next.joiners[0].capacity,90000.5);
 assert.equal(next.legacyTroopPlanning.hostCapacity,120000);assert.deepEqual(next.capacityConfirmation,old.capacityConfirmation);
 assert.equal(actualMarchCapacity(next,'join',1),null);assert.deepEqual(migrateProfile(next),next);
});
