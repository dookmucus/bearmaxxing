import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {MASTER_SKILLS,lookup,masterEffects} from '../src/master-effects.mjs';
import progression from '../src/data/master-progression.json' with {type:'json'};
import {accountEffects,calculate} from '../src/calculator.mjs';
import {enableMixedTiers,inventoryCount,aggregateTroops} from '../src/troop-inventory.mjs';
import {troopPlan,validateProfile} from '../src/engine.mjs';

test('Valora fixture separates personal points and two capacities',()=>{
  const m=emptyProfile().masters.find(x=>x.name==='Valora');
  m.owned=true;m.talentLevel=10;m.skillLevels={1:10,2:5,3:5,4:10};
  assert.deepEqual(MASTER_SKILLS.Valora.skills.map(x=>x[0]),['Dance of the Hunt','Leader By Example','Weapon Obsession','Savage Advantage']);
  assert.deepEqual(MASTER_SKILLS.Valora.skills.map(x=>Boolean(x[1])),[true,false,false,true]);
  assert.deepEqual(masterEffects(m),{attack:0,lethality:0,deploy:30000,rally:300000,personalPoints:27,unsupported:[]});
  assert.equal(lookup(progression.affinity.Valora,10),2.85);
});
test('Cassia only applies offensive parts and separate capacity effects',()=>{
  const m=emptyProfile().masters.find(x=>x.name==='Cassia');
  delete m.squadBonus;m.owned=true;m.affinityLevel=10;m.talentLevel=11;m.skillLevels={1:10,2:20,3:20,4:20};
  assert.deepEqual(MASTER_SKILLS.Cassia.skills.map(x=>Boolean(x[1])),[false,true,true,true]);
  assert.deepEqual(masterEffects(m),{attack:10,lethality:13.8,deploy:10000,rally:100000,personalPoints:0,unsupported:[]});
});
test('Pan research requires actual progress and only verified checkpoints',()=>{
  const m=emptyProfile().masters.find(x=>x.name==='Pan');
  m.owned=true;m.affinityLevel=100;m.skillLevels={1:10,2:10,3:10,4:10};
  assert.equal(masterEffects(m).lethality,0);
  m.specialResearchProgress=400;assert.equal(masterEffects(m).lethality,6);
  m.specialResearchProgress=401;assert.equal(masterEffects(m).lethality,0);
  assert.match(masterEffects(m).unsupported.join(' '),/intermediate/);
  m.affinityLevel=99;m.specialResearchProgress=400;assert.equal(masterEffects(m).lethality,0);
});
test('other masters count sourced affinity while event skills remain irrelevant',()=>{
  for(const [name,key] of [['Roman','attack'],['Wilson','attack'],['Guinevere','lethality']]){
    const m=emptyProfile().masters.find(x=>x.name===name);
    delete m.squadBonus;m.owned=true;m.affinityLevel=10;m.skillLevels={1:10,2:10,3:10,4:10};
    const effect=masterEffects(m);
    assert.equal(effect[key],progression.affinity[name][10]);
    assert.ok(MASTER_SKILLS[name].skills.every(skill=>skill[1]===null));
  }
});
test('entered owned pet levels stack rolls once and unlocked active effects use the established planning assumption',()=>{
  const p=emptyProfile();
  const wolf=p.pets.find(x=>x.name==='Gray Wolf');
  wolf.level=1;wolf.owned=true;wolf.refinement={infantry:2,cavalry:3,archer:4};
  const rhino=p.pets.find(x=>x.name==='Giant Rhino');
  rhino.owned=true;rhino.refinement={infantry:1,cavalry:2,archer:3};rhino.level=11;
  assert.deepEqual(accountEffects(p).classLethality,{infantry:3,cavalry:5,archer:7});
  const before=accountEffects(p).attack;rhino.active=true;
  assert.equal(accountEffects(p).attack,before); // Legacy toggle does not override unlocked-rank planning.
  assert.deepEqual(accountEffects(p).classLethality,{infantry:3,cavalry:5,archer:7});
});
test('legacy refinement Attack is retained without conversion or counting',()=>{
  const old=emptyProfile();
  // Isolate pet migration from Helga's separately modeled account talent.
  old.pets=[{id:'old',name:'Giant Rhino',owned:true,attack:8,lethality:12}];
  const p=migrateProfile(old);const rhino=p.pets.find(x=>x.name==='Giant Rhino');
  assert.equal(rhino.attack,8);assert.equal(rhino.lethality,12);
  assert.deepEqual(rhino.refinement,{infantry:0,cavalry:0,archer:0}); // Existing migration defaults are unchanged.
  assert.equal(accountEffects(p).attack,0);
  assert.equal(accountEffects(p).classLethality.infantry,0);
  assert.match(accountEffects(p).unsupported.join(' '),/legacy refinement/);
});
test('old Valora levels migrate to numbered skill slots',()=>{
  const old=emptyProfile();old.masters=[{id:'valora',name:'Valora',owned:true,rallyLevel:10,deployLevel:10,talentLevel:10}];
  const m=migrateProfile(old).masters.find(x=>x.name==='Valora');
  assert.equal(m.skillLevels[1],10);assert.equal(m.skillLevels[4],10);
  assert.equal(masterEffects(m).rally,300000);
});
test('mixed-tier inventory conserves exact troops including pusher and shortages',()=>{
  let p=emptyProfile();p.hostCapacity=100000;p.joinCapacity=100000;p.pusherEnabled=true;p.pusherCapacity=50000;p.marchSlots=5;
  p.troops.infantry.count=45000;p.troops.cavalry.count=45000;p.troops.archer.count=350000;
  p=enableMixedTiers(p);p.tierInventory.archer={9:100000,10:250000};
  assert.equal(inventoryCount(p,'archer'),350000);
  const plan=calculate(p,'joining').plan;
  assert.equal(plan.needed.archer,360000);assert.equal(plan.shortage.archer,10000);
  for(const t of ['infantry','cavalry','archer'])assert.ok(plan.marches.reduce((n,m)=>n+m.available[t],0)<=inventoryCount(p,t));
  assert.equal(troopPlan(aggregateTroops(p)).shortage.archer,10000);
  assert.throws(()=>validateProfile({...p,tierInventory:{...p.tierInventory,archer:{9:0.5}}}),/mixed-tier/);
});

test('masters default levels and entered progression apply without ownership',()=>{
  const p=emptyProfile();
  // This fixture tests Masters alone, not the owned hero account talent.

  for(const m of p.masters){
    assert.equal(m.affinityLevel,1);
    assert.equal(m.squadBonus,0);
    assert.equal(m.talentLevel,0);
    assert.equal(m.specialResearchProgress,0);
    assert.deepEqual(m.skillLevels,{1:0,2:0,3:0,4:0});
    assert.ok(!Object.hasOwn(m,'owned'));
  }
  assert.equal(accountEffects(p).attack,0);
  assert.equal(accountEffects(p).deploy,0);
  const valora=p.masters.find(m=>m.name==='Valora');
  valora.owned=false;
  valora.talentLevel=5;
  valora.skillLevels[4]=2;
  assert.equal(accountEffects(p).personalPoints,12);
  assert.equal(accountEffects(p).deploy,6000);
  const saved=migrateProfile(p).masters.find(m=>m.name==='Valora');
  assert.ok(!Object.hasOwn(saved,'owned'));
  assert.equal(saved.talentLevel,5);
  assert.equal(saved.skillLevels[4],2);
});
