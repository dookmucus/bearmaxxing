import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {maximumMarchSize,setMarchSizeByType,actualMarchCapacity,marchSizeInputError} from '../src/march-capacity-inputs.mjs';
import {essentialSetupError,persistAppState,restoreAppState} from '../src/setup-state.mjs';

test('legacy per-class capacity counts never provide capacity or setup validation',()=>{
 for(const value of [0,123456,-1,1.5,Infinity,true,'invalid']){
  const p=setMarchSizeByType(emptyProfile(),'infantry',value);
  assert.equal(p.marchSizeByType.infantry,value);assert.equal(maximumMarchSize(p),null);assert.equal(actualMarchCapacity(p,'host'),null);
  assert.equal(marchSizeInputError(p),null);assert.equal(essentialSetupError(p,4),null);
 }
});
test('class counts and explicit zero totals survive saving while remaining inactive',()=>{
 const old=emptyProfile();old.troopsPerMarch=0;old.marchSizeByType={infantry:10000,cavalry:10000,archer:80000};
 const p=migrateProfile(old),data=new Map(),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 persistAppState(store,p,{step:4,completed:true});const saved=restoreAppState(store).profile;
 assert.deepEqual(saved.marchSizeByType,old.marchSizeByType);assert.equal(saved.troopsPerMarch,0);
 assert.equal(maximumMarchSize(saved),null);assert.deepEqual(saved.legacyTroopPlanning.marchSizeByType,old.marchSizeByType);
});
