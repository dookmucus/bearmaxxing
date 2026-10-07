import {test} from 'node:test';
import assert from 'node:assert/strict';
import levels from '../src/data/pet-levels.json' with {type:'json'};
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {normalizePetInput,setPetLevel,petMilestones} from '../src/pet-inputs.mjs';
import {accountEffects} from '../src/calculator.mjs';
import {petLevelEffect,petActiveEffect,petBuffEffects,petRefinementEffect} from '../src/pet-effects.mjs';

test('all fourteen pets default to not owned and contribute no effects',()=>{
 const p=emptyProfile(); // Isolate unowned-pet totals.
 assert.ok(p.pets.every(pet=>pet.level===0&&!pet.owned&&pet.levelSource==='assumed'));
 assert.equal(accountEffects(p).attack,0);
 assert.deepEqual(petRefinementEffect(p),{infantry:0,cavalry:0,archer:0});
 assert.deepEqual(petBuffEffects(p),{attack:0,lethality:0,deploy:0,rally:0,unsupported:[]});
});
test('zero suppresses passive, refinement and abilities; re-enabling retains exact entered decimals and choices',()=>{
 for(const name of ['Giant Rhino','Mighty Bison','Great Moose','Alpha Black Panther']){
  const owned=setPetLevel({name,level:0,advancementConfirmed:true,advancementByLevel:{100:true},refinement:{infantry:'100.00',cavalry:2,archer:3}},100);
  const off=setPetLevel(owned,0),p={pets:[off]};
  assert.equal(petLevelEffect(off).attack,0);
  assert.equal(petActiveEffect(off).value,null);
  assert.equal(petRefinementEffect(p).infantry,0);
  assert.deepEqual(petBuffEffects(p),{attack:0,lethality:0,deploy:0,rally:0,unsupported:[]});
  const restored=setPetLevel(off,100);
  assert.equal(restored.refinement.infantry,'100.00');assert.equal(restored.advancementConfirmed,true);
  assert.equal(petRefinementEffect({pets:[restored]}).infantry,100);
  assert.ok(petLevelEffect(restored).attack>0);assert.ok(petActiveEffect(restored).value>0);
 }
});
test('milestones and final advancements follow individual sourced tables, including Lion and Grizzly level 60',()=>{
 for(const [name,entry] of Object.entries(levels.pets)){
  assert.deepEqual(petMilestones(name),entry.advancementAudit.milestones);
  const max=Math.max(...Object.keys(entry.attackByLevel).map(Number));
  assert.ok(petMilestones(name).includes(max),name);
  for(const level of petMilestones(name)){
   const before=normalizePetInput({name,level}),after=normalizePetInput({name,level,advancementConfirmed:true,advancementByLevel:{[level]:true}});
   assert.equal(petLevelEffect(before).attack,entry.attackByLevel[level][0]);
   assert.deepEqual(petLevelEffect(after),petLevelEffect(before));
   if(level<max){
    const next=setPetLevel(before,level+1);
    assert.equal(petLevelEffect(next).checkpoint,false);
    assert.equal(petLevelEffect(next).rank,petMilestones(name).filter(n=>n<level+1).length);
   }
  }
 }
 for(const name of ['Lion','Grizzly Bear']){
  assert.equal(petLevelEffect({name,level:60,advancementConfirmed:false}).attack,14.25);
  assert.equal(petLevelEffect({name,level:60,advancementConfirmed:true}).attack,14.25);
 }
 assert.equal(petMilestones('Gray Wolf').at(-1),50);assert.equal(petMilestones('Cheetah').at(-1),70);
});
test('migration changes only established default level-one ownership and preserves explicit progression and advancement',()=>{
 const base=emptyProfile();
 base.pets=[
  {id:'default',name:'Gray Wolf',level:1,provenance:'assumed',refinement:{infantry:'14.40'}},
  {id:'explicit',name:'Lynx',level:1,levelSource:'user-confirmed'},
  {id:'saved',name:'Bison',level:1},
  {id:'imported',name:'Cheetah',level:1,imported:true,provenance:'assumed'},
  {id:'advanced',name:'Lion',level:60,advancementConfirmed:true},
  {id:'not-advanced',name:'Grizzly Bear',level:60,advancementConfirmed:false},
  {id:'ambiguous',name:'Giant Rhino',level:100}
 ];
 const p=migrateProfile(base),get=id=>p.pets.find(pet=>pet.id===id);
 assert.equal(get('default').level,0);assert.equal(get('default').legacyAssumedLevel,1);assert.equal(get('default').refinement.infantry,'14.40');
 for(const id of ['explicit','saved','imported'])assert.equal(get(id).level,1,id);
 assert.equal(get('advanced').advancementConfirmed,true);assert.equal(get('not-advanced').advancementConfirmed,false);
 assert.equal(get('ambiguous').advancementConfirmed,null);assert.equal(petLevelEffect(get('ambiguous')).rank,9);
 assert.deepEqual(migrateProfile(p),p);
 const changed=setPetLevel(setPetLevel(get('advanced'),61),60);
 assert.equal(changed.advancementConfirmed,true);assert.equal(petLevelEffect(changed).attack,14.25);
});
test('combined totals remain authoritative regardless of individual ownership and archived mode',()=>{
 const p={pets:[{name:'Gray Wolf',level:0,refinement:{infantry:2}},{name:'Lion',level:60,refinement:{infantry:3}}],petRefinementMode:'combined',combinedPetRefinement:{infantry:'14.40',cavalry:0,archer:0}};
 assert.equal(petRefinementEffect(p).infantry,14.4);
 p.pets[0]=setPetLevel(p.pets[0],1);p.petRefinementMode='per-pet';
 assert.equal(petRefinementEffect(p).infantry,14.4);assert.equal(p.combinedPetRefinement.infantry,'14.40');
});

test('checkpoint boundaries use level alone even when legacy flags contradict it',()=>{
 for(const [name,entry] of Object.entries(levels.pets)){
  const thresholds=petMilestones(name),max=Math.max(...Object.keys(entry.attackByLevel).map(Number));
  for(const checkpoint of thresholds){
   for(const level of [checkpoint-1,checkpoint,checkpoint+1].filter(level=>level>=0&&level<=max)){
    const expectedRank=thresholds.filter(threshold=>threshold<level).length;
    for(const confirmed of [false,true]){
     const pet={name,level,advancementConfirmed:confirmed,advancementByLevel:Object.fromEntries(thresholds.map(threshold=>[threshold,confirmed])),advancementSource:'user-confirmed'};
     const effect=petLevelEffect(pet),active=petActiveEffect(pet);
     assert.equal(effect.rank,expectedRank,`${name} level ${level}`);
     assert.equal(effect.attack,level===0?0:entry.attackByLevel[level][0]);
     if(active)assert.equal(active.rank,expectedRank);
    }
   }
  }
 }
 for(const level of [60,61,69,70]){
  const pet={name:'Giant Rhino',level,advancementConfirmed:true};
  assert.equal(petLevelEffect(pet).rank,level===60?5:6);
  assert.equal(petActiveEffect(pet).rank,level===60?5:6);
 }
});
