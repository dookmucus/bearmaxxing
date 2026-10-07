import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {accountEffects,calculate,capacityHostDraft} from '../src/calculator.mjs';
import {completeMarchPlan} from '../src/march-plan.mjs';
import {actualMarchCapacity,plannedCapacityMissing,setSharedMarchCapacity,setIndividualMarchCapacity,CAPACITY_PROMPT} from '../src/march-capacity-inputs.mjs';
import {essentialSetupError,persistAppState,restoreAppState} from '../src/setup-state.mjs';
const types=['infantry','cavalry','archer'];
const plan=p=>completeMarchPlan(p,capacityHostDraft(p)??[],accountEffects(p));
function ready(){const p=emptyProfile();for(const t of types)p.troops[t].count=1000000;return p;}

test('shared actual capacity applies to four marches without hero, pet or master additions',()=>{
 let p=ready();p.accountBaseCapacity=60000;
 p.pets.find(pet=>pet.name==='Mighty Bison').level=11;
 p.masters.find(m=>m.name==='Valora').skillLevels[4]=2;
 p=setSharedMarchCapacity(p,100000);
 assert.ok(accountEffects(p).deploy>0);
 assert.deepEqual(plan(p).marches.map(r=>r.capacity),[100000,100000,100000,100000]);
 assert.deepEqual(plan(p).needed,{infantry:40000,cavalry:40000,archer:320000});
 assert.equal(essentialSetupError(p,4),null);
});
test('different saved actual capacities survive migration, shared edits and local saving',()=>{
 const old=ready();old.hostCapacity=120000;old.joinCapacity=100000;old.joiners[0].capacity=95000;
 let p=migrateProfile(old);
 assert.equal(p.troopsPerMarch,120000);assert.equal(p.differentMarchCapacities,true);
 assert.deepEqual(plan(p).marches.map(r=>r.capacity),[120000,120000,120000,120000]);
 p=setSharedMarchCapacity(p,130000);
 assert.deepEqual(plan(p).marches.map(r=>r.capacity),[130000,130000,130000,130000]);
 p=setIndividualMarchCapacity(p,'join',1,110000);
 let saved;const storage={setItem:(_,value)=>{saved=value;},getItem:()=>saved};
 assert.equal(persistAppState(storage,p,{step:4,completed:true}),true);
 const restored=restoreAppState(storage).profile;
 assert.equal(actualMarchCapacity(restored,'join',1),130000);
 assert.equal(restored.actualMarchCapacities.joins[1],110000);
 assert.equal(restored.joiners[0].capacity,95000);
 assert.equal(restored.legacyCapacitySetup.hostCapacity,120000);
 assert.deepEqual(migrateProfile(restored),restored);
});
test('supported legacy base conversion adds deployment once and retains original values',()=>{
 const old=ready();delete old.capacityInputMode;old.hostCapacity=100000;old.joinCapacity=90000;
 old.masters.find(m=>m.name==='Valora').skillLevels[4]=2;
 const p=migrateProfile(old),deploy=accountEffects(p).deploy;
 assert.equal(p.troopsPerMarch,100000+deploy);
 assert.equal(actualMarchCapacity(p,'join',0),100000+deploy);
 assert.equal(p.actualMarchCapacities.joins[0],90000+deploy);
 assert.equal(p.legacyCapacitySetup.hostCapacity,100000);
 p.masters.find(m=>m.name==='Valora').skillLevels[4]=3;
 assert.equal(plan(p).marches[0].capacity,100000+deploy);
});
test('derived base capacities normalize from supported assigned heroes without recounting bonuses',()=>{
 const old=ready();old.accountBaseCapacity=60000;
 old.pets.find(pet=>pet.name==='Mighty Bison').level=11;
 const before=plan(old).marches.map(r=>r.capacity);
 const p=migrateProfile(old);
 assert.deepEqual(plan(p).marches.map(r=>r.capacity),Array(4).fill(before[0]));
 assert.equal(p.legacyCapacitySetup.accountBaseCapacity,60000);
 assert.equal(p.capacityConfirmation.length,0);
});
test('uncertain legacy conversion remains archived without blocking optional capacity planning',()=>{
 const old=ready();old.capacityInputMode='legacy-base';old.hostCapacity=100000;old.joinCapacity=90000;
 old.pets.find(pet=>pet.name==='Mighty Bison').level=10;
 const p=migrateProfile(old);
 assert.equal(p.troopsPerMarch,0);assert.equal(plannedCapacityMissing(p),false);
 assert.equal(p.capacityConfirmation.length,4);
 assert.equal(plan(p).totalsKnown,false);
 assert.equal(essentialSetupError(p,4),null);
 assert.equal(p.legacyCapacitySetup.hostCapacity,100000);
 const confirmed=setSharedMarchCapacity(p,100000);
 assert.equal(plannedCapacityMissing(confirmed),false);
 assert.equal(confirmed.capacityConfirmation.length,4); // Archived uncertainty is preserved.
 assert.deepEqual(plan(confirmed).marches.map(r=>r.capacity),[100000,100000,100000,100000]);
 old.capacityInputMode='actual';
 assert.equal(migrateProfile(old).troopsPerMarch,100000);
});
test('invalid legacy individual values remain archived and cannot override the common maximum',()=>{
 const old=ready();old.hostCapacity=100000;old.joinCapacity=90000;old.joiners[0].capacity=90000.5;
 const p=migrateProfile(old);
 assert.equal(actualMarchCapacity(p,'join',0),100000);
 assert.equal(p.actualMarchCapacities.joins[0],null);
 assert.ok(p.capacityConfirmation.some(item=>item.key==='join-0'));
 assert.equal(p.legacyCapacitySetup.joiners[0].capacity,90000.5);
 assert.equal(plan(p).totalsKnown,true);
});
test('inventory allocation and optional pusher consume each available troop at most once',()=>{
 let p=setSharedMarchCapacity(ready(),100000);
 p.troops.infantry.count=44000;p.troops.cavalry.count=45000;p.troops.archer.count=360000;
 p.pusherEnabled=true;p.marchSlots=5;p=setIndividualMarchCapacity(p,'pusher',0,50000);
 const result=plan(p);
 assert.equal(result.marches.length,5);
 assert.deepEqual(result.needed,{infantry:45000,cavalry:45000,archer:360000});
 assert.deepEqual(result.shortage,{infantry:1000,cavalry:0,archer:0});
 assert.equal(result.marches.at(-1).heroes.length,0);
 for(const t of types)assert.equal(result.marches.reduce((sum,r)=>sum+r.available[t],0),p.troops[t].count);
 p.pusherEnabled=false;
 assert.equal(plan(p).marches.length,4);
 assert.equal(p.actualPusherCapacity,50000);
 p.pusherEnabled=true;p.marchSlots=4;
 assert.ok(calculate(p,'joining').missing.some(message=>/slots/i.test(message)));
});
test('missing capacity yields no blocking prompt or exact troop target; entered march configuration is preserved',()=>{
 const p=migrateProfile(ready());
 assert.equal(p.troopsPerMarch,0);
 assert.equal(plan(p).totalsKnown,false);
 assert.equal(calculate(p,'joining').missing.filter(message=>message===CAPACITY_PROMPT).length,0);
 const old=ready();old.hostEnabled=false;old.joinCount=2;old.marchSlots=2;old.joinCapacity=75000;old.ratios={infantry:20,cavalry:20,archer:60};
 const saved=migrateProfile(old);
 assert.equal(saved.joinCount,2);assert.equal(saved.hostEnabled,false);
 assert.deepEqual(saved.ratios,old.ratios);
 assert.equal(plan(saved).marches.length,2);
 assert.deepEqual(plan(saved).needed,{infantry:30000,cavalry:30000,archer:90000});
});
test('disabled saved host and extra joins retain capacities internally without overriding the common maximum',()=>{
 const old=ready();old.hostEnabled=false;old.joinCount=2;old.hostCapacity=120000;old.joinCapacity=100000;old.joiners[2].capacity=90000;
 const p=migrateProfile(old);
 p.hostEnabled=true;p.joinCount=3;
 assert.deepEqual(plan(p).marches.map(r=>r.capacity),[100000,100000,100000,100000]);
 assert.equal(p.actualMarchCapacities.host,120000);assert.equal(p.actualMarchCapacities.joins[2],90000);
});
test('invalid new individual entry cannot silently use the shared capacity',()=>{
 const p=setIndividualMarchCapacity(setSharedMarchCapacity(ready(),100000),'join',0,-1);
 assert.equal(actualMarchCapacity(p,'join',0),null);
 assert.equal(plan(p).totalsKnown,false);
 assert.equal(essentialSetupError(p,4),CAPACITY_PROMPT);
});
