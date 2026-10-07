import {demoProfile} from './helpers/primary-demo.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile,mergeApi} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {gearOffense} from '../src/engine.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';

test('roster and three gear sets are stable defaults with explicit provenance',()=>{
  const p=emptyProfile();
  assert.equal(p.heroes.length,37);
  assert.equal(p.heroes.find(h=>h.name==='Gordon').troop,'cavalry');
  assert.deepEqual(p.heroes.find(h=>h.name==='Amadeus').provenance,{owned:'assumed',level:'assumed',stars:'assumed',widget:'assumed'});
  assert.equal(p.heroes.find(h=>h.name==='Amadeus').owned,false);
  assert.equal(p.gear.length,12);
  assert.equal(new Set(p.gear.map(g=>g.id)).size,12);
  assert.ok(p.gear.every(g=>g.quality==='gold'&&g.provenance.quality==='assumed'));
});
test('legacy setup migration preserves entries while filling roster and set slots',()=>{
  const old=emptyProfile();old.heroes=[{id:'custom',name:'Gordon',troop:'cavalry',owned:false,level:67,stars:3,attack:22,lethality:12}];old.gear=[{id:'custom-gear',name:'Saved boots',troop:'cavalry',slot:'boots',quality:'purple',enhancement:50,forge:2,lethality:19}];
  const next=migrateProfile(old);
  assert.equal(next.heroes.length,37);
  assert.equal(next.heroes.find(h=>h.name==='Gordon').level,67);
  assert.equal(next.heroes.find(h=>h.name==='Gordon').owned,false);
  assert.equal(next.gear.length,13);
  assert.equal(next.gear.find(g=>g.id==='custom-gear').lethality,19);
});
test('import matches roster and preserves manual gear corrections on reimport',()=>{
  const response={player:{heroes:[{id:8,name:'Gordon',level:70,stars:4,gear:[{slot:'helmet',troop_label:'Cavalry',quality_label:'Mythic',enhancement_level:60,refine_level:4}]}]}};
  const first=mergeApi(emptyProfile(),response);
  assert.equal(first.heroes.length,37);
  assert.equal(first.heroes.find(h=>h.name==='Gordon').provenance.level,'imported');
  const piece=first.gear.find(g=>g.id==='api-gear-8-helmet-0');piece.enhancement=67;piece.provenance.enhancement='user-confirmed';
  const again=mergeApi(first,response);
  assert.equal(again.gear.length,13);
  assert.equal(again.gear.find(g=>g.id===piece.id).enhancement,67);
});
test('offensive gear excludes health-only regular stats',()=>{
  const p=emptyProfile();
  assert.equal(gearOffense(p.gear.find(g=>g.id==='set-archer-helmet')).lethality,15);
  assert.equal(gearOffense(p.gear.find(g=>g.id==='set-archer-gloves')).lethality,0);
  assert.equal(gearOffense({slot:'helmet',quality:'none'}).lethality,0);
});
test('personal points stay separate; active pets and masters change relevant outputs',()=>{
  const p=emptyProfile();p.heroes.find(h=>h.name==='Helga').owned=false; // Isolate Master/pet effects.
  p.masters.find(m=>m.name==='Valora').talentLevel=5;
  p.masters.find(m=>m.name==='Valora').skillLevels[4]=2;
  p.masters.find(m=>m.name==='Valora').skillLevels[1]=1;
  p.pets.find(x=>x.name==='Giant Rhino').owned=true;
  p.pets.find(x=>x.name==='Giant Rhino').active=true;
  p.pets.find(x=>x.name==='Giant Rhino').level=11;
  p.pets=p.pets.filter(pet=>pet.name==='Giant Rhino');
  const effects=accountEffects(p);
  assert.equal(effects.personalPoints,12);
  assert.equal(effects.attack,5.52);
  assert.equal(effects.deploy,6000);
  assert.equal(effects.rally,30000);
  p.hostCapacity=100000;p.joinCapacity=100000;
  for(const t of ['infantry','cavalry','archer'])p.troops[t].count=500000;
  const plan=calculate(p,'joining').plan;
  assert.equal(plan.marches[0].capacity,100000);
  assert.equal(plan.marches[1].capacity,100000);
  assert.equal(plan.marches[0].basis,'actual in-game fallback');
});
test('hero-free pusher uses a slot and actual troops',()=>{
  const p=emptyProfile();p.hostCapacity=100000;p.joinCapacity=100000;p.pusherEnabled=true;p.pusherCapacity=50000;
  for(const t of ['infantry','cavalry','archer'])p.troops[t].count=500000;
  assert.ok(calculate(p,'joining').missing.some(x=>x.includes('5 march slots')));
  p.marchSlots=5;
  const plan=calculate(p,'joining').plan;
  assert.equal(plan.marches.length,5);
  assert.equal(plan.marches[4].name,'Hero-free pusher');
  assert.equal(Object.values(plan.needed).reduce((a,b)=>a+b),450000);
  for(const t of ['infantry','cavalry','archer'])assert.ok(plan.marches.reduce((s,m)=>s+m.available[t],0)<=p.troops[t].count);
});
test('effective report totals do not get added to host components twice',()=>{
  const p=demoProfile();
  const before=calculate(p,'hosting').team[2].factor;
  p.effectiveStats.archer.attack=9999;
  p.effectiveStats.archer.lethality=9999;
  assert.equal(calculate(p,'hosting').team[2].factor,before);
  const rhino=p.pets.find(x=>x.name==='Giant Rhino');rhino.owned=true;rhino.active=true;rhino.level=11;
  assert.ok(calculate(p,'hosting').team[2].factor>before);
  rhino.active=false;
  assert.ok(calculate(p,'hosting').team[2].factor>before);
});
