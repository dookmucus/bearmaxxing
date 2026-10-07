import{test}from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{improvementCopy,joiningLeaderCopy}from'../src/results-copy.mjs';
import{gearProgression}from'../src/gear-progression.mjs';import{gearUpgradeCost,gearCostEfficiency}from'../src/gear-upgrade-costs.mjs';
import{activeGearInventory}from'../src/active-gear.mjs';import{bestGear}from'../src/engine.mjs';
import{normalizePetInput}from'../src/pet-inputs.mjs';import{petLevelEffect,petBuffEffects,petRefinementEffect}from'../src/pet-effects.mjs';
import{restoreAppState,persistAppState}from'../src/setup-state.mjs';
const r=JSON.parse(fs.readFileSync(new URL('../audits/incoming-hosting-2026-10-06/replay.json',import.meta.url))),p=r.profileSnapshot;
test('release snapshot retains twelve legal distinct heroes and active transferable pieces',()=>{
 assert.equal(new Set([...r.host,...r.joiningSquads.flat()]).size,12);
 for(const names of [r.host,...r.joiningSquads]){const heroes=names.map(n=>p.heroes.find(h=>h.name===n));assert.equal(new Set(heroes.map(h=>h.troop)).size,3);assert.ok(heroes.every(h=>h.owned&&h.marchAvailable!==false));}
 const ids=activeGearInventory(p).map(g=>g.id);assert.equal(ids.length,12);
 const archived={...p,gear:[...p.gear,{id:'archived-extra',troop:'archer',slot:'helmet',quality:'red',enhancement:200,forge:20}]};
 assert.deepEqual(bestGear(archived,'archer').map(g=>g.id),bestGear(p,'archer').map(g=>g.id));
 assert.equal(r.inputUnchanged,true);
});
test('release upgrade copy uses actual offensive deltas, verified gear costs and conditional hero scope',()=>{
 const before=JSON.stringify(p);
 assert.equal(r.actions.length,5);assert.equal(new Set(r.actions.map(a=>a.resource)).size,5);
 for(const a of r.actions){const copy=improvementCopy(a,p);assert.ok(copy.title&&copy.benefit&&copy.detail);assert.ok(!/predicted Bear damage|ROI/i.test(copy.benefit));
  if(a.gearId){const piece=p.gear.find(g=>g.id===a.gearId),old=gearProgression(piece),next=gearProgression(a.targetProgression);assert.ok(next.attack>old.attack||next.lethality>old.lethality);assert.deepEqual(a.verifiedCost,gearUpgradeCost(piece,a.targetProgression));assert.match(copy.detail,/Requires/);}
  else assert.match(copy.detail,/not verified/);
 }
 const petra=r.actions.find(a=>a.id.includes('petra'));assert.match(improvementCopy(petra,p).benefit,/2.5 percentage points of shared hosting Attack/);
 const yang=r.actions.find(a=>a.id.includes('yang'));assert.equal(yang.modelComparison.selectionDependent,true);assert.match(improvementCopy(yang,p).benefit,/while Yang hosts/);
 assert.equal(gearCostEfficiency({...yang,verifiedCost:null}),null);assert.equal(JSON.stringify(p),before);
});
test('unowned level-zero pets contribute nothing even with saved refinements and advancement flags',()=>{
 const pet=normalizePetInput({...p.pets.find(p=>p.name==='Giant Rhino'),level:0,advancementConfirmed:true,refinement:{infantry:99,cavalry:99,archer:99}});
 assert.equal(pet.owned,false);assert.equal(petLevelEffect(pet).attack,0);assert.deepEqual(petRefinementEffect({pets:[pet]}),{infantry:0,cavalry:0,archer:0});assert.equal(petBuffEffects({pets:[pet]}).attack,0);
 const panther=p.pets.find(p=>p.name==='Alpha Black Panther'),complete=normalizePetInput({...panther,advancementConfirmed:true,advancementByLevel:{60:true}});assert.equal(complete.advancementConfirmed,true);assert.equal(complete.advancementByLevel[60],true);assert.equal(petLevelEffect(complete).rank,5);
});
test('reload preserves entered progression, active gear, exact refinements and unconfirmed zero inputs',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 assert.equal(persistAppState(storage,p,{step:4,completed:true}),true);const a=restoreAppState(storage);
 assert.equal(a.profile.heroes.find(h=>h.name==='Yang').starStep,22);assert.equal(a.profile.gear.find(g=>g.id==='set-archer-helmet').enhancement,107);
 assert.deepEqual(a.profile.stats,p.stats);assert.deepEqual(a.profile.masters.map(m=>m.squadBonus),p.masters.map(m=>m.squadBonus));assert.deepEqual(a.profile.pets.map(p=>p.refinement),p.pets.map(p=>p.refinement));
 persistAppState(storage,a.profile,a.setup);assert.deepEqual(restoreAppState(storage).profile,a.profile);
});
test('joining cards avoid a second visible uncertainty indicator',()=>{
 const hero=p.heroes.find(h=>h.name==='Vivian'),copy=joiningLeaderCopy(hero);assert.match(copy.summary,/25% enemy damage taken/);assert.ok(!copy.summary.includes('Provisional'));assert.match(copy.detail,/selected by the rally/);
});
