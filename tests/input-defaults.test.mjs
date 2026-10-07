import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile,mergeApi} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {hasAccountBaseCapacity} from '../src/input-defaults.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {petLevelEffect,petRefinementEffect,replaceCombinedRefinement} from '../src/pet-effects.mjs';
import {essentialSetupError} from '../src/setup-state.mjs';

test('new numeric inputs default without inventing unknown reference effects or enabling buffs',()=>{
  const p=emptyProfile();
  for(const t of ['infantry','cavalry','archer']){
    assert.equal(p.stats[t].attack,0);assert.equal(p.stats[t].lethality,0);
    assert.equal(p.troops[t].count,0);assert.equal(p.troops[t].tg,0);
    assert.equal(p.weights[t],null); // Unverified troop coefficients are not formulas of zero.
  }
  assert.ok(p.heroes.every(h=>h.level===80&&h.stars===5));
  assert.ok(p.pets.every(pet=>!pet.owned&&pet.level===0&&!pet.active&&pet.advancementConfirmed===null));
  assert.ok(p.pets.every(pet=>Object.values(pet.refinement).every(n=>n===0)));
  assert.ok(p.masters.every(m=>m.affinityLevel===1&&m.squadBonus===0));
  assert.equal(p.assumedInputs['troops.infantry.count'],'assumed');
  assert.equal(hasAccountBaseCapacity(p),false);
  assert.equal(essentialSetupError(p,4),'Enter Maximum march size to estimate full-capacity requirements.');
  assert.equal(petLevelEffect({name:'Unmapped pet',level:1}).attack,null);
});

test('migration and import preserve saved decimals, levels, gear, and unconfirmed advancement',()=>{
  const p=emptyProfile();
  Object.assign(p.pets[0],{owned:false,level:10,active:false,refinement:{infantry:'14.40',cavalry:2.25,archer:null}});
  p.masters[0].squadBonus='14.40';p.gear[0].enhancement=55;
  const next=migrateProfile(p);
  assert.equal(next.pets[0].level,10);assert.equal(next.pets[0].refinement.infantry,'14.40');
  assert.equal(next.pets[0].refinement.archer,0);assert.equal(next.pets[0].active,false);
  assert.equal(petLevelEffect(next.pets[0]).attack,0.5);
  assert.equal(next.pets[0].advancementSource,'assumed');
  assert.equal(next.masters[0].squadBonus,'14.40');assert.equal(next.gear[0].enhancement,55);
  const imported=mergeApi(next,{player:{heroes:[{id:8,name:'Gordon',level:63,stars:3,gear:[{slot:'helmet',troop_label:'Cavalry',quality_label:'Mythic',enhancement_level:44,refine_level:5}]}]}});
  assert.equal(imported.heroes.find(h=>h.name==='Gordon').level,63);
  assert.equal(imported.gear.find(g=>g.imported).enhancement,44);
  assert.equal(imported.pets[0].refinement.infantry,'14.40');
  const sparse=mergeApi(next,{player:{heroes:[{id:999,name:'Saved unfamiliar hero'}]}});
  const hero=sparse.heroes.find(h=>h.name==='Saved unfamiliar hero');
  assert.equal(hero.level,80);assert.equal(hero.stars,5);assert.equal(hero.starStep,31);
  assert.equal(hero.starStepSource,'assumed full 5 stars');
  assert.deepEqual(migrateProfile(next).assumedInputs,next.assumedInputs);
});

test('legacy combined totals remain exclusive through edits, replacement, and saved migration',()=>{
  const old=emptyProfile();old.pets.forEach(pet=>{pet.level=1;pet.levelSource='user-confirmed';});old.petRefinementMode='combined';
  old.combinedPetRefinement={infantry:'14.40',cavalry:7.5,archer:11};
  const p=migrateProfile(old);
  assert.ok(p.pets.every(pet=>Object.values(pet.refinement).every(n=>n===0)));
  p.pets[0].refinement={infantry:2,cavalry:3,archer:4};
  p.pets[1].refinement={infantry:1,cavalry:2,archer:3};
  assert.deepEqual(accountEffects(p).classLethality,{infantry:14.4,cavalry:7.5,archer:11});
  const next=replaceCombinedRefinement(p);
  assert.deepEqual(petRefinementEffect(next),{infantry:3,cavalry:5,archer:7});
  assert.equal(next.combinedPetRefinement.infantry,'14.40');
  assert.deepEqual(accountEffects(migrateProfile(next)).classLethality,{infantry:3,cavalry:5,archer:7});
  assert.equal(next.pets[0].level,1);assert.equal(next.pets[0].active,false);
});

test('default zero capacities do not suppress shared fallback or fabricate a derived capacity',()=>{
  const p=emptyProfile();p.hostCapacity=100000;p.joinCapacity=90000;
  for(const t of ['infantry','cavalry','archer'])p.troops[t].count=500000;
  const plan=calculate(p,'joining').plan;
  assert.ok(plan);
  assert.equal(plan.marches[0].capacity,100000);
  assert.ok(plan.marches.filter(m=>m.joinIndex!=null).every(m=>m.capacity===90000));
  assert.ok(plan.marches.every(m=>m.basis==='actual in-game fallback'));
});
