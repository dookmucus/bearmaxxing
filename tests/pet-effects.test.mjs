import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {accountEffects} from '../src/calculator.mjs';
import {petHasBearContribution,petLevelEffect,petActiveEffect,petRefinementEffect} from '../src/pet-effects.mjs';
import {PET_NAMES} from '../src/data/roster.mjs';

test('every listed pet has a verified level-one passive lookup',()=>{
  assert.equal(PET_NAMES.length,14);
  for(const name of PET_NAMES){
    const effect=petLevelEffect({name,level:1});
    assert.ok(effect.attack>0,`${name} needs a passive lookup`);
    assert.ok(effect.source?.startsWith('https://'),`${name} needs a source`);
    assert.equal(petHasBearContribution({name,owned:false,level:0,refinement:{infantry:0}}),true);
  }
});

test('filter keeps entered class rolls and leaves unrelated saved records intact',()=>{
  const old=emptyProfile();
  old.pets.push({id:'saved-utility',name:'Unmapped utility pet',owned:true,level:8,notes:'keep me'});
  old.pets.push({id:'saved-roll',name:'Unmapped rolled pet',owned:true,level:0,refinement:{infantry:0,cavalry:2}});
  const p=migrateProfile(old);
  assert.equal(p.pets.find(pet=>pet.id==='saved-utility').notes,'keep me');
  assert.equal(petHasBearContribution(p.pets.find(pet=>pet.id==='saved-utility')),false);
  assert.equal(petHasBearContribution(p.pets.find(pet=>pet.id==='saved-roll')),true);
  assert.equal(accountEffects(p).classLethality.cavalry,0);
});

test('verified level passives and active ranks follow advancement stage',()=>{
  const rhino={name:'Giant Rhino',level:9,advancementConfirmed:null};
  assert.equal(petLevelEffect(rhino).attack,1.51);
  assert.equal(petActiveEffect(rhino).rank,0);
  rhino.level=10;
  assert.equal(petLevelEffect(rhino).attack,1.68);
  rhino.advancementConfirmed=false;
  assert.equal(petLevelEffect(rhino).attack,1.68);
  assert.equal(petActiveEffect(rhino).rank,0);
  rhino.advancementConfirmed=true;
  assert.equal(petLevelEffect(rhino).attack,2.86);
  assert.equal(petActiveEffect(rhino).rank,1);
  assert.equal(petActiveEffect(rhino).value,2.5);
  rhino.level=11;
  assert.equal(petLevelEffect(rhino).attack,3.02);
  assert.equal(petActiveEffect(rhino).rank,1);
});

test('passive Attack stacks once and unlocked buffs are assumed despite archived activation choices',()=>{
  const p=emptyProfile();p.heroes.find(h=>h.name==='Helga').owned=false; // Isolate pet Attack.
  const wolf=p.pets.find(x=>x.name==='Gray Wolf');wolf.owned=true;wolf.level=11;
  const rhino=p.pets.find(x=>x.name==='Giant Rhino');rhino.owned=true;rhino.level=11;
  rhino.refinement={infantry:1,cavalry:2,archer:3};
  p.pets=[wolf,rhino];
  wolf.owned=false;rhino.owned=false;
  const passive=accountEffects(p).attack;
  assert.equal(passive,0.97+3.02+2.5);
  rhino.active=true;
  assert.equal(accountEffects(p).attack,passive);
  assert.deepEqual(accountEffects(p).classLethality,{infantry:1,cavalry:2,archer:3});
  rhino.active=false;
  assert.equal(accountEffects(p).attack,passive);
  assert.deepEqual(accountEffects(p).classLethality,{infantry:1,cavalry:2,archer:3});
});

test('refinement modes never sum each other and inactive values are preserved',()=>{
  const p=emptyProfile();const pet=p.pets.find(x=>x.name==='Gray Wolf');
  pet.owned=true;pet.level=1;p.pets=[pet];pet.refinement={infantry:2,cavalry:3,archer:4};
  p.combinedPetRefinement={infantry:8,cavalry:9,archer:10};
  assert.deepEqual(petRefinementEffect(p),{infantry:2,cavalry:3,archer:4});
  p.petRefinementMode='combined';
  assert.deepEqual(accountEffects(p).classLethality,{infantry:8,cavalry:9,archer:10});
  assert.equal(pet.refinement.infantry,2);
  p.petRefinementMode='per-pet';
  assert.deepEqual(accountEffects(p).classLethality,{infantry:2,cavalry:3,archer:4});
});

test('migration keeps legacy values and ambiguous checkpoints explicit',()=>{
  const old=emptyProfile();old.pets=[{id:'legacy-rhino',name:'Giant Rhino',owned:true,level:10,skillLevel:7,attack:5,refinement:{infantry:2}}];
  old.otherPetRefinement={attack:9,lethality:6};
  const p=migrateProfile(old),rhino=p.pets.find(x=>x.name==='Giant Rhino');
  assert.equal(rhino.id,'legacy-rhino');
  assert.equal(rhino.skillLevel,7);
  assert.equal(rhino.attack,5);
  assert.equal(rhino.refinement.infantry,2);
  assert.equal(petLevelEffect(rhino).attack,1.68);
  assert.equal(p.petRefinementMode,'per-pet');
  assert.deepEqual(accountEffects(p).classLethality,{infantry:2,cavalry:0,archer:0});
  assert.equal(rhino.advancementConfirmed,false);
  assert.equal(rhino.advancementSource,'assumed');
  assert.match(accountEffects(p).unsupported.join(' '),/saved manual active-skill level/);
  assert.match(accountEffects(p).unsupported.join(' '),/Legacy other-pet refinement/);
});
