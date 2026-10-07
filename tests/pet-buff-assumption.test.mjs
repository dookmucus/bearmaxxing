import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile,defaultHeroes} from '../src/data/roster.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {petBuffEffects,petBuffDetails,petBuffDescription,petLevelEffect} from '../src/pet-effects.mjs';
import {completeMarchPlan,heroCapacity} from '../src/march-plan.mjs';
const names=['Giant Rhino','Alpha Black Panther','Mighty Bison','Great Moose'];
function ready(){
 const p=emptyProfile(); // Isolate pet totals.
 p.heroes=defaultHeroes().filter(h=>['Zoe','Petra','Rosa','Amane','Chenko','Yeonwoo'].includes(h.name)).map(h=>({...h,owned:true,included:true,marchAvailable:true}));
 for(const pet of p.pets)if(names.includes(pet.name))Object.assign(pet,{level:11,active:false});
 for(const t of ['infantry','cavalry','archer'])p.troops[t].count=1000000;
 return p;
}
test('all verified unlocked buffs apply automatically, ignoring preserved legacy switches and exclusions',()=>{
 const p=ready();p.usePetBuffs=false;p.petBuffExclusions=Object.fromEntries(names.map(n=>[n,true]));
 p.pets.find(pet=>pet.name==='Giant Rhino').refinement={infantry:'14.40',cavalry:2,archer:3};
 p.combinedPetRefinement={attack:20,infantry:14.4,cavalry:2,archer:3};
 const saved=structuredClone(p);
 assert.deepEqual(petBuffEffects(p),{attack:2.5,lethality:2.5,deploy:1500,rally:60000,unsupported:[]});
 assert.ok(petBuffDetails(p).every(effect=>effect.included));
 const effects=accountEffects(p);
 const passive=20;
 assert.equal(effects.attack,passive+2.5);
 assert.deepEqual(effects.classLethality,{infantry:14.4,cavalry:2,archer:3});
 assert.deepEqual(p,saved); // Calculating never edits refinements, levels or archived choices.
 p.usePetBuffs=true;p.petBuffExclusions={};p.pets.forEach(pet=>pet.active=true);
 assert.deepEqual(petBuffEffects(p),petBuffEffects(saved));
});
test('locked, unconfirmed and unmapped abilities never gain invented temporary effects',()=>{
 const p=ready();p.pets=p.pets.filter(pet=>pet.name==='Giant Rhino');const pet=p.pets[0];
 for(const [level,advancement,expected] of [[9,null,0],[10,false,0],[10,null,0],[10,true,0],[11,null,2.5],[100,false,9],[100,true,9],[101,true,0]]){
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
 assert.ok(joining.plan.marches.every(m=>m.capacity===null));assert.equal(joining.plan.needed,null);
 p.hostEnabled=false;
 assert.equal(calculate(p,'joining').shared.attack,join.attack);
 for(const effect of petBuffDetails(p))if(['attack','lethality'].includes(effect.kind))assert.match(petBuffDescription(effect),/hosting rally only/);
});
test('active deployment and rally buffs remain separate effects and cannot invent troop targets',()=>{
 const p=ready();p.accountBaseCapacity=60000;const before=structuredClone(p),effects=accountEffects(p,'joining');
 assert.equal(effects.deploy,1500);assert.equal(effects.rally,0);assert.equal(accountEffects(p,'hosting').rally,60000);
 const plan=completeMarchPlan(p,[],effects);assert.ok(plan.marches.every(m=>m.capacity===null&&m.target===null));assert.equal(plan.needed,null);assert.deepEqual(p,before);
});

test('saved actual capacities stay inactive despite active pet or hero deployment bonuses',()=>{
 const p=ready();Object.assign(p,{accountBaseCapacity:60000,hostCapacity:120001,joinCapacity:100003,pusherEnabled:true,pusherCapacity:60009,marchSlots:5});p.joiners[0].capacity=95007;
 const result=calculate(p,'joining');assert.equal(result.plan.marches.length,4);assert.ok(result.plan.marches.every(m=>m.capacity===null&&m.available===null));assert.equal(p.joiners[0].capacity,95007);assert.equal(result.plan.needed,null);
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
