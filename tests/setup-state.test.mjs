import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile,mergeApi} from '../src/profile.mjs';
import {MAIN_TABS,SETUP_STEPS,PLAN_STEPS,planStepIndex,navigatePlanStep,STORAGE_KEY,advanceSetup,persistAppState,restoreAppState} from '../src/setup-state.mjs';

const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
test('wizard saves profile, exclusions and current step, then resumes and finishes on Home',()=>{
  const store=storage();const profile=emptyProfile();profile.playerId='';profile.heroes.find(h=>h.name==='Helga').included=false;
  let setup={step:0,completed:false};
  for(let i=0;i<3;i++)setup=advanceSetup(setup);
  assert.equal(setup.step,3);assert.equal(setup.completed,false);
  assert.ok(persistAppState(store,profile,setup));
  const restored=restoreAppState(store);
  assert.equal(restored.setup.step,3);assert.equal(restored.setup.completed,false);
  assert.equal(restored.profile.heroes.find(h=>h.name==='Helga').included,false);
  setup=advanceSetup(restored.setup);setup=advanceSetup(setup);
  assert.deepEqual(setup,{step:4,completed:true});
  assert.ok(MAIN_TABS.includes('Home'));
  assert.deepEqual(MAIN_TABS,['Home',...SETUP_STEPS]);
  persistAppState(store,restored.profile,setup);
  assert.equal(restoreAppState(store).setup.completed,true);
});
test('legacy saved profile migrates as established, retaining values',()=>{
  const store=storage();const profile=emptyProfile();profile.troops.archer.count=123456;profile.heroes.find(h=>h.name==='Helga').included=false;
  store.setItem('bearmaxxing-profile',JSON.stringify(profile));
  const restored=restoreAppState(store);
  assert.equal(restored.setup.completed,true);
  assert.equal(restored.profile.troops.archer.count,123456);
  assert.equal(restored.profile.heroes.find(h=>h.name==='Helga').included,false);
  assert.equal(store.getItem(STORAGE_KEY),null);
});
test('import keeps confirmed progression and exclusions without altering wizard state',()=>{
  const store=storage();const profile=emptyProfile();const helga=profile.heroes.find(h=>h.name==='Helga');
  helga.included=false;helga.owned=false;helga.level=72;helga.widget=4;
  helga.provenance={...helga.provenance,owned:'user-confirmed',level:'user-confirmed',widget:'user-confirmed'};
  const setup={step:2,completed:false};persistAppState(store,profile,setup);
  const before=restoreAppState(store);
  const merged=mergeApi(before.profile,{player:{nick_name:'Player',heroes:[{id:101,name:'Helga',level:80,exclusive_gear_level:9,stars:5,gear:[]}]}});
  persistAppState(store,merged,before.setup);
  const after=restoreAppState(store);
  const saved=after.profile.heroes.find(h=>h.name==='Helga');
  assert.equal(saved.included,false);assert.equal(saved.owned,false);
  assert.equal(saved.level,72);assert.equal(saved.widget,4);
  assert.deepEqual(after.setup,setup);
});
test('storage failure keeps setup usable and reports it',()=>{
  const broken={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.equal(restoreAppState(broken).storageError,true);
  assert.equal(persistAppState(broken,emptyProfile(),{step:0,completed:false}),false);
});

test('Results retains the plan sequence and can navigate back through editors after completion',()=>{
 let state={setup:{step:0,completed:false},tab:'Heroes'};
 for(let index=1;index<PLAN_STEPS.length;index++)state=navigatePlanStep(state.setup,state.tab,index);
 assert.equal(state.setup.completed,true);assert.equal(state.tab,'Home');assert.equal(planStepIndex(state.setup,state.tab),5);
 state=navigatePlanStep(state.setup,state.tab,4);assert.equal(state.tab,'Troops');assert.equal(state.setup.completed,true);
 state=navigatePlanStep(state.setup,state.tab,3);assert.equal(state.tab,'Pets');
 state=navigatePlanStep(state.setup,state.tab,4);state=navigatePlanStep(state.setup,state.tab,5);assert.equal(state.tab,'Home');
 const fresh={step:0,completed:false};assert.deepEqual(navigatePlanStep(fresh,'Heroes',5),{setup:{step:4,completed:true},tab:'Home'});
 for(let index=0;index<PLAN_STEPS.length;index++)assert.equal(navigatePlanStep(fresh,'Heroes',index).tab,PLAN_STEPS[index]);
 assert.deepEqual(navigatePlanStep(state.setup,state.tab,6),state);
});
