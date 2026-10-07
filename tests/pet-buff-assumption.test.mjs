import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {petBuffEffects,petBuffDetails,petBuffDescription,petLevelEffect} from '../src/pet-effects.mjs';
import {completeMarchPlan,heroCapacity} from '../src/march-plan.mjs';
const names=['Giant Rhino','Alpha Black Panther','Mighty Bison','Great Moose'];
function ready(){
 const p=emptyProfile(); // Isolate pet totals.
 for(const pet of p.pets)if(names.includes(pet.name))Object.assign(pet,{level:11,active:false});
 for(const t of ['infantry','cavalry','archer'])p.troops[t].count=1000000;
 return p;
}
test('all verified unlocked buffs apply automatically, ignoring preserved legacy switches and exclusions',()=>{
 const p=ready();p.usePetBuffs=false;p.petBuffExclusions=Object.fromEntries(names.map(n=>[n,true]));
 p.pets.find(pet=>pet.name==='Giant Rhino').refinement={infantry:'14.40',cavalry:2,archer:3};
 const saved=structuredClone(p);
 assert.deepEqual(petBuffEffects(p),{attack:2.5,lethality:2.5,deploy:1500,rally:60000,unsupported:[]});
 assert.ok(petBuffDetails(p).every(effect=>effect.included));
 const effects=accountEffects(p);
 const passive=p.pets.reduce((sum,pet)=>sum+(petLevelEffect(pet).attack??0),0);
 assert.equal(effects.attack,passive+2.5);
 assert.deepEqual(effects.classLethality,{infantry:14.4,cavalry:2,archer:3});
 assert.deepEqual(p,saved); // Calculating never edits refinements, levels or archived choices.
 p.usePetBuffs=true;p.petBuffExclusions={};p.pets.forEach(pet=>pet.active=true);
 assert.deepEqual(petBuffEffects(p),petBuffEffects(saved));
});
test('locked, unconfirmed and unmapped abilities never gain invented temporary effects',()=>{
 const p=ready();p.pets=p.pets.filter(pet=>pet.name==='Giant Rhino');const pet=p.pets[0];
 for(const [level,advancement,expected] of [[9,null,0],[10,false,0],[10,null,0],[10,true,2.5],[11,null,2.5],[100,false,9],[100,true,10],[101,true,0]]){
  Object.assign(pet,{level,advancementConfirmed:advancement});
  assert.equal(petBuffEffects(p).attack,expected,`level ${level}, advancement ${advancement}`);
 }
 p.pets=[{name:'Ironclad War Bear',level:11,active:true},{name:'Unmapped pet',level:100,active:true}];
 assert.deepEqual(petBuffDetails(p),[]);
 assert.deepEqual(petBuffEffects(p),{attack:0,lethality:0,deploy:0,rally:0,unsupported:[]});
});
test('hosting combat and rally buffs do not enter joining results; deployment and refinements remain separate',()=>{
 const p=ready();p.hostCapacity=100000;p.joinCapacity=90000;
 p.pets[0].refinement={infantry:1,cavalry:2,archer:3};
 const host=accountEffects(p,'hosting'),join=accountEffects(p,'joining');
 assert.equal(host.attack-join.attack,2.5);assert.equal(host.lethality-join.lethality,2.5);
 assert.equal(host.rally,60000);assert.equal(join.rally,0);
 assert.equal(host.deploy,1500);assert.equal(join.deploy,1500);
 assert.deepEqual(host.classLethality,join.classLethality);
 const hosting=calculate(p,'hosting'),joining=calculate(p,'joining');
 assert.equal(hosting.shared.attack,host.attack);assert.equal(joining.shared.attack,join.attack);
 assert.equal(joining.shared.lethality,0);assert.equal(joining.shared.rally,0);
 assert.equal(joining.plan.marches[0].capacity,100000);
 p.hostEnabled=false;
 assert.equal(calculate(p,'joining').shared.attack,join.attack);
 for(const effect of petBuffDetails(p))if(['attack','lethality'].includes(effect.kind))assert.match(petBuffDescription(effect),/hosting rally only/);
});
test('deployment buffs add once to derived and legacy base capacities; rally buffs never inflate march capacity',()=>{
 const p=ready();p.hostEnabled=false;p.joinCount=1;p.pusherEnabled=true;p.marchSlots=2;
 p.accountBaseCapacity=60000;
 let plan=completeMarchPlan(p,[],accountEffects(p,'joining'));
 const heroes=plan.marches[0].heroes.reduce((n,h)=>n+heroCapacity(h.level),0);
 assert.equal(plan.marches[0].capacity,60000+heroes+1500);
 assert.equal(plan.marches[1].capacity,61500);
 p.pets.find(pet=>pet.name==='Great Moose').level=1;
 assert.deepEqual(completeMarchPlan(p,[],accountEffects(p,'joining')).marches.map(m=>m.capacity),plan.marches.map(m=>m.capacity));
 p.accountBaseCapacity=null;p.capacityInputMode='legacy-base';p.joinCapacity=100000;p.pusherCapacity=50000;
 plan=completeMarchPlan(p,[],accountEffects(p,'joining'));
 assert.equal(plan.marches[0].capacity,101500);assert.equal(plan.marches[1].capacity,51500);
});
test('entered actual capacities take precedence and never receive another pet or hero capacity bonus',()=>{
 const p=ready();p.accountBaseCapacity=60000;
 p.hostCapacity=120001;p.joinCapacity=100003;p.joiners[0].capacity=95007;
 p.pusherEnabled=true;p.pusherCapacity=60009;p.marchSlots=5;
 const result=calculate(p,'joining');
 assert.deepEqual(result.plan.marches.map(m=>m.capacity),[120001,95007,100003,100003,60009]);
 assert.ok(result.plan.marches.every(m=>m.basis==='actual in-game fallback'));
 for(const t of ['infantry','cavalry','archer'])assert.ok(result.plan.marches.reduce((sum,m)=>sum+m.available[t],0)<=p.troops[t].count);
});
test('saved activation data survives repeated migration but cannot suppress unlocked buffs',()=>{
 const old=ready();old.usePetBuffs=false;old.petBuffExclusions={'Giant Rhino':true};old.petBuffSettingsSource='saved';
 const pet=old.pets.find(pet=>pet.name==='Giant Rhino');pet.refinement.infantry='14.40';pet.skillLevel=7;
 for(const p of [migrateProfile(old),migrateProfile(migrateProfile(old))]){
  assert.equal(p.usePetBuffs,false);assert.deepEqual(p.petBuffExclusions,old.petBuffExclusions);
  assert.equal(p.pets.find(pet=>pet.name==='Giant Rhino').active,false);
  assert.equal(p.pets.find(pet=>pet.name==='Giant Rhino').refinement.infantry,'14.40');
  assert.equal(p.pets.find(pet=>pet.name==='Giant Rhino').skillLevel,7);
  assert.deepEqual(petBuffEffects(p),petBuffEffects(old));
 }
});
