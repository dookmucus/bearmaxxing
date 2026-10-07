import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {combinedPetStats,petLevelEffect,petBuffEffects,petUpgradeProfile,petAdvancementUpgrade,setCombinedPetStat} from '../src/pet-effects.mjs';
import {setPetLevel,petMilestones,normalizePetInput} from '../src/pet-inputs.mjs';
import {actionableImprovements} from '../src/results-improvements.mjs';
import {persistAppState,restoreAppState} from '../src/setup-state.mjs';
import {petGuidance} from '../src/player-guidance.mjs';
import {improvementCopy} from '../src/results-copy.mjs';

const legacy=()=>{const p=emptyProfile();delete p.petStatsVersion;delete p.combinedPetRefinement;delete p.combinedPetRefinementSources;return p;};
test('migration: derive absent totals once and retain contributing saved provenance',()=>{
 const p=legacy();
 p.pets=[{id:'wolf',name:'Gray Wolf',level:11,levelSource:'user-confirmed',refinement:{infantry:'1.50',cavalry:2,archer:3}},
  {id:'rhino',name:'Giant Rhino',level:10,advancementConfirmed:true,refinement:{infantry:'4.40',cavalry:5,archer:6}},
  {id:'off',name:'Lion',level:0,advancementConfirmed:true,refinement:{infantry:99}}];
 const saved=structuredClone(p),m=migrateProfile(p);
 assert.deepEqual(combinedPetStats(m),{attack:2.65,infantry:5.9,cavalry:7,archer:9});
 assert.equal(m.combinedPetRefinementSources.attack.source,'derived from saved pet calculations');
 assert.equal(m.combinedPetRefinementSources.attack.contributions[0].levelSource,'user-confirmed');
 assert.equal(m.combinedPetRefinementSources.infantry.contributions[0].source,'saved refinement');
 assert.deepEqual(migrateProfile(m),m);assert.deepEqual(p,saved);
 // Updating the retained level is only an active-ability input now.
 m.pets.find(p=>p.id==='rhino').level=50;
 assert.deepEqual(combinedPetStats(m),{attack:2.65,infantry:5.9,cavalry:7,archer:9});
});
test('migration: unknown contributions stay unknown and existing totals survive partial migration',()=>{
 const p=legacy();p.pets=[{id:'unknown',name:'Unmapped pet',level:30,refinement:{infantry:2}}];
 p.combinedPetRefinement={infantry:0,cavalry:'4.20'};
 const m=migrateProfile(p);
 assert.deepEqual(combinedPetStats(m),{attack:null,infantry:0,cavalry:4.2,archer:0});
 assert.equal(accountEffects(m).attack,null);assert.ok(accountEffects(m).unsupported.length);
 assert.deepEqual(migrateProfile(m),m);
});
test('totals: new profiles display four zeros; saved totals and explicit zeros are authoritative',()=>{
 assert.deepEqual(combinedPetStats(emptyProfile()),{attack:0,infantry:0,cavalry:0,archer:0});
 const p=legacy();p.combinedPetRefinement={attack:'12.3400',infantry:0,cavalry:'7.50',archer:0};p.petRefinementMode='per-pet';
 p.pets[0].level=50;p.pets[0].refinement={infantry:99,cavalry:99,archer:99};
 const m=migrateProfile(p);
 assert.deepEqual(m.combinedPetRefinement,p.combinedPetRefinement);
 assert.deepEqual(combinedPetStats(m),{attack:12.34,infantry:0,cavalry:7.5,archer:0});
 m.pets.forEach(p=>p.level=0);
 assert.deepEqual(combinedPetStats(m),{attack:12.34,infantry:0,cavalry:7.5,archer:0});
});
test('double-counting: combined passives count once and buffs stay separate with hosting scopes',()=>{
 const p=emptyProfile();p.combinedPetRefinement={attack:20,infantry:4,cavalry:5,archer:6};
 for(const pet of p.pets){pet.level=11;pet.refinement={infantry:99,cavalry:99,archer:99};pet.active=false;}
 p.usePetBuffs=false;
 const host=accountEffects(p),join=accountEffects(p,'joining');
 assert.equal(host.attack,22.5);assert.equal(join.attack,20);
 assert.equal(host.lethality,2.5);assert.equal(join.lethality,0);
 assert.deepEqual(host.classLethality,{infantry:4,cavalry:5,archer:6});
 assert.deepEqual(join.classLethality,host.classLethality);
 assert.equal(host.deploy,1500);assert.equal(join.deploy,1500);assert.equal(host.rally,60000);assert.equal(join.rally,0);
 p.pets=p.pets.map(p=>setPetLevel(p,0));
 assert.deepEqual(petBuffEffects(p),{attack:0,lethality:0,deploy:0,rally:0,unsupported:[]});
 assert.equal(accountEffects(p).attack,20);
});
test('double-counting: retained-pet upgrade preview adds only documented delta to combined Attack',()=>{
 const p=emptyProfile();p.combinedPetRefinement={attack:40,infantry:5,cavalry:6,archer:7};
 p.pets=p.pets.map(p=>p.name==='Giant Rhino'?setPetLevel(p,10):p);
 const pet=p.pets.find(p=>p.name==='Giant Rhino'),candidate=setPetLevel(pet,11),saved=structuredClone(p);
 const next=petUpgradeProfile(p,pet,candidate);
 assert.equal(next.combinedPetRefinement.attack,41.34);
 assert.ok(Math.abs(accountEffects(next).attack-accountEffects(p).attack-3.84)<1e-10);
 assert.deepEqual(accountEffects(next).classLethality,accountEffects(p).classLethality);
 assert.deepEqual(p,saved);
 assert.equal(petUpgradeProfile(p,p.pets[0],setPetLevel(p.pets[0],20)),null);
});
test('saved-inputs: editing totals and reloading preserve individual pet history and unrelated inputs',()=>{
 const p=legacy();const pet=p.pets.find(p=>p.name==='Giant Rhino');
 Object.assign(pet,{level:20,advancementConfirmed:true,levelSource:'user-confirmed',refinement:{infantry:'14.400',cavalry:0,archer:3},skillLevel:7,active:false,notes:'keep',advancementByLevel:{10:true,20:true}});
 p.otherPetRefinement={attack:9,lethality:6};p.petRefinementMode='per-pet';p.stats.archer.attack=123;p.troops.archer.count=321;p.hostCapacity=456;
 const m=migrateProfile(p),pets=structuredClone(m.pets),next=setCombinedPetStat(m,'attack',0);
 let saved;const storage={setItem:(_,v)=>saved=v,getItem:()=>saved};
 assert.ok(persistAppState(storage,next,{completed:true,step:4}));const reloaded=restoreAppState(storage).profile;
 assert.deepEqual(reloaded.pets,pets);assert.equal(reloaded.combinedPetRefinement.attack,0);
 const reloadedPet=reloaded.pets.find(p=>p.id===pet.id);
 assert.equal(reloadedPet.advancementConfirmed,true);
 assert.deepEqual(reloadedPet.advancementByLevel,{10:true,20:true});
 assert.equal(petLevelEffect(reloadedPet).rank,1);
 assert.deepEqual(petBuffEffects(reloaded),petBuffEffects({...reloaded,pets:reloaded.pets.map(p=>({...p,advancementConfirmed:false,advancementByLevel:{}}))}));
 assert.equal(reloaded.combinedPetRefinementSources.attack.source,'user-confirmed');
 for(const field of ['stats','troops','otherPetRefinement','hostCapacity','petRefinementMode'])assert.deepEqual(reloaded[field],m[field]);
});
test('checkpoint upgrade advice isolates documented advancement gains from the next level',()=>{
 const pet={id:'rhino',name:'Giant Rhino',level:10,advancementConfirmed:true};
 assert.deepEqual(petAdvancementUpgrade(pet),{attackDelta:1.18,activeKind:'attack',activeDelta:2.5});
 assert.equal(petLevelEffect(pet).attack,1.68);
 assert.equal(petBuffEffects({pets:[pet]}).attack,0);
 assert.equal(petAdvancementUpgrade({...pet,level:11}),null);
 const final=petAdvancementUpgrade({...pet,level:100});
 assert.ok(final.attackDelta>0);assert.equal(final.activeDelta,1);
 assert.equal(petAdvancementUpgrade({...pet,level:0}),null);
 assert.equal(petAdvancementUpgrade({name:'Lion',level:60}),null);
});
test('checkpoint advice survives legacy completion flags without changing current totals',()=>{
 const p=emptyProfile();
 p.pets=[{id:'rhino',name:'Giant Rhino',level:10,advancementConfirmed:true,advancementByLevel:{10:true}}];
 p.combinedPetRefinement={attack:40,infantry:5,cavalry:6,archer:7};
 const saved=structuredClone(p),audit=[];
 const results={hosting:calculate(p,'hosting'),joining:calculate(p,'joining'),upgrades:calculate(p,'upgrades')};
 const advice=actionableImprovements(p,results,accountEffects,{audit}).find(item=>item.id==='rhino-passive');
 assert.ok(advice);assert.equal(advice.resource,'Pet advancement materials');
 assert.equal(advice.petStatDelta,1.18);assert.equal(advice.petActiveDelta,2.5);
 assert.equal(advice.modelComparison,undefined);
 assert.match(improvementCopy(advice,p).detail,/Wild Charge.*2.5.*unranked/);
 assert.match(petGuidance(p.pets[0]),/Next advancement: level 10/);
 assert.deepEqual(p,saved);assert.equal(accountEffects(p).attack,40);
});
test('advancement: each documented threshold derives earlier ranks and ignores current legacy flags',()=>{
 for(const name of ['Alpha Black Panther','Giant Rhino','Mighty Bison','Great Moose']){
  const thresholds=petMilestones(name);
  for(const [index,level] of thresholds.entries()){
   const p=normalizePetInput({name,level,refinement:{}});
   assert.equal(p.advancementConfirmed,undefined);
   assert.equal(petLevelEffect(p).rank,index);
   const advanced={...p,advancementConfirmed:true,advancementByLevel:{[level]:true}};assert.equal(petLevelEffect(advanced).rank,index);
   assert.equal(petLevelEffect({name,level,advancementByLevel:{[level]:true}}).rank,index);
   if(level<thresholds.at(-1)){
    const next=setPetLevel(p,level+1);assert.equal(petLevelEffect(next).rank,index+1);assert.equal(petLevelEffect(next).checkpoint,false);
    assert.equal(setPetLevel(setPetLevel(advanced,level+1),level).advancementConfirmed,true);
   }
  }
  const off=setPetLevel({name,level:thresholds.at(-1),advancementConfirmed:true},0);
  assert.equal(petLevelEffect(off).attack,0);assert.equal(petLevelEffect(off).rank,0);
  assert.deepEqual(petBuffEffects({pets:[off]}),{attack:0,lethality:0,deploy:0,rally:0,unsupported:[]});
 }
});
test('upgrades: advice never collects or recommends progression for hidden pet rows',()=>{
 const p=migrateProfile(JSON.parse(fs.readFileSync(new URL('../audits/incoming-hosting-2026-10-06/replay.json',import.meta.url))).profileSnapshot);
 const audit=[];actionableImprovements(p,{hosting:calculate(p,'hosting'),joining:calculate(p,'joining'),upgrades:calculate(p,'upgrades')},accountEffects,{audit});
 const ids=new Set(p.pets.filter(p=>['Alpha Black Panther','Giant Rhino','Mighty Bison','Great Moose'].includes(p.name)).map(p=>`${p.id}-passive`));
 const petAdvice=audit.filter(a=>a.id.endsWith('-passive'));
 assert.equal(petAdvice.length,4);assert.ok(petAdvice.every(a=>ids.has(a.id)));
});
