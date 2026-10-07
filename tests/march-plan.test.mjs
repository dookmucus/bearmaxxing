import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {accountEffects,calculate,capacityHostDraft,requirements} from '../src/calculator.mjs';
import {validateProfile} from '../src/engine.mjs';
import {compareHosts} from '../src/host-comparison.mjs';
import {assignMarchHeroes,availableFillers,completeMarchPlan,heroCapacity} from '../src/march-plan.mjs';

const hero=(p,name)=>p.heroes.find(h=>h.name===name);
const types=['infantry','cavalry','archer'];
test('capacity draft excludes unavailable heroes without reserving leaders when offense baselines are missing',()=>{
  const p=emptyProfile();p.heroes.find(h=>h.name==='Helga').included=false;
  const draft=capacityHostDraft(p);
  assert.equal(draft.length,3);
  assert.ok(!draft.some(entry=>['Helga'].includes(entry.hero.name)));
  const plan=completeMarchPlan(p,draft,accountEffects(p));
  const assigned=plan.marches.flatMap(row=>row.heroes).filter(Boolean);
  assert.equal(new Set(assigned.map(h=>h.id)).size,assigned.length);
});
function ready(){const p=emptyProfile();p.accountBaseCapacity=60000;for(const t of types){p.stats[t]={attack:0,lethality:0};p.troops[t].count=1000000;}for(const h of p.heroes)if(h.widget===null)h.widget=0;return p;}
test('complete host and joins use unique owned heroes with one of each class',()=>{
  const p=ready();const host=compareHosts(p,accountEffects(p)).best.team;
  const plan=completeMarchPlan(p,host,accountEffects(p));
  assert.equal(plan.marches.length,4);
  assert.ok(plan.marches.slice(1).every(r=>r.leaderRole?.effects.length));
  const assigned=plan.marches.flatMap(r=>r.heroes).filter(Boolean);
  assert.equal(new Set(assigned.map(h=>h.id)).size,assigned.length);
  for(const row of plan.marches)assert.deepEqual(new Set(row.heroes.map(h=>h.troop)),new Set(types));
  for(const row of plan.marches)assert.equal(row.capacity,100410);
  assert.equal(new Set(host.flatMap(e=>e.gear.map(g=>g.id))).size,host.flatMap(e=>e.gear).length);
});
test('fillers rank only by sourced hero capacity and label equal alternatives',()=>{
  const p=ready();p.hostEnabled=false;p.joinCount=1;
  for(const h of p.heroes)h.marchAvailable=false;
  for(const name of ['Chenko','Helga','Howard','Zoe','Rosa'])hero(p,name).marchAvailable=true;
  hero(p,'Howard').level=70;hero(p,'Zoe').level=80;
  const row=assignMarchHeroes(p).joins[0];
  assert.equal(row.heroes[0].name,'Chenko');
  assert.equal(row.heroes[1].name,'Helga');
  assert.ok(row.equivalent[1].includes('Zoe'));
  assert.equal(heroCapacity(80),13470);
  assert.equal(heroCapacity(39),null);
  assert.equal(heroCapacity(40),null);
});
test('host exclusion does not remove a separately available joining filler',()=>{
  const p=ready();p.hostEnabled=false;p.joinCount=1;
  for(const h of p.heroes)h.marchAvailable=false;
  for(const name of ['Chenko','Helga','Rosa'])hero(p,name).marchAvailable=true;
  hero(p,'Helga').included=false;
  assert.ok(assignMarchHeroes(p).joins[0].heroes.some(h=>h?.name==='Helga'));
  hero(p,'Helga').marchAvailable=false;
  assert.ok(!assignMarchHeroes(p).joins[0].heroes.some(h=>h?.name==='Helga'));
});
test('archived filler choices persist without reserving heroes or overriding legal automatic composition',()=>{
  const p=ready();p.hostEnabled=false;p.joinCount=1;
  const before=assignMarchHeroes(p).joins[0].heroes.map(h=>h.id);
  p.joiners[0].slot2=hero(p,'Chenko').id;p.joiners[0].slot3=hero(p,'Chenko').id;
  const assigned=assignMarchHeroes(p).joins[0].heroes;
  assert.deepEqual(assigned.map(h=>h.id),before);
  assert.equal(new Set(assigned.map(h=>h.id)).size,3);
  assert.deepEqual(new Set(assigned.map(h=>h.troop)),new Set(types));
  assert.equal(p.joiners[0].slot2,hero(p,'Chenko').id);assert.equal(p.joiners[0].slot3,hero(p,'Chenko').id);
});
test('derived capacity counts heroes and deployment once; pusher receives no hero bonus',()=>{
  const p=ready();p.hostEnabled=false;p.joinCount=1;p.pusherEnabled=true;p.marchSlots=2;
  p.masters.find(m=>m.name==='Valora').owned=true;
  p.masters.find(m=>m.name==='Valora').skillLevels={4:2};
  const effects=accountEffects(p);
  const plan=completeMarchPlan(p,[],effects);
  assert.equal(plan.marches[0].capacity,60000+13470*3+effects.deploy);
  assert.equal(plan.marches[1].capacity,60000+effects.deploy);
  assert.equal(plan.marches[1].heroes.length,0);
  p.accountBaseCapacity=null;p.joiners[0].capacity=95000;p.pusherCapacity=40000;
  const actual=completeMarchPlan(p,[],effects);
  assert.equal(actual.marches[0].capacity,95000);
  assert.equal(actual.marches[1].capacity,40000);
});
test('integer allocation conserves inventory and reports exact per-row shortages',()=>{
  const p=ready();p.hostEnabled=false;p.joinCount=1;p.pusherEnabled=true;p.marchSlots=2;p.accountBaseCapacity=null;p.joiners[0].capacity=100003;p.pusherCapacity=50003;
  p.troops={infantry:{count:10000},cavalry:{count:10000},archer:{count:100000}};
  const plan=completeMarchPlan(p,[],accountEffects(p));
  for(const t of types){
    const used=plan.marches.reduce((sum,row)=>sum+row.available[t],0);
    assert.equal(used+plan.remaining[t],p.troops[t].count);
    assert.equal(plan.marches.reduce((sum,row)=>sum+row.gap[t],0),plan.shortage[t]);
    assert.ok(Number.isInteger(used));
  }
  assert.equal(plan.marches[0].target.archer,80003);
});
test('different actual march capacities round to exact 10/10/80 troop totals and fill exactly',()=>{
  const p=ready();p.joinCount=1;p.pusherEnabled=true;p.marchSlots=3;p.accountBaseCapacity=null;
  p.hostCapacity=100003;p.joiners[0].capacity=80007;p.pusherCapacity=40009;
  const capacities=[100003,80007,40009];
  const totals={infantry:0,cavalry:0,archer:0};
  for(const capacity of capacities){
    totals.infantry+=Math.floor(capacity*.1);totals.cavalry+=Math.floor(capacity*.1);
    totals.archer+=capacity-Math.floor(capacity*.1)-Math.floor(capacity*.1);
  }
  for(const t of types)p.troops[t].count=totals[t];
  const plan=completeMarchPlan(p,[],accountEffects(p));
  assert.deepEqual(plan.marches.map(row=>row.capacity),capacities);
  assert.deepEqual(plan.shortage,{infantry:0,cavalry:0,archer:0});
  for(const row of plan.marches){assert.equal(Object.values(row.target).reduce((a,b)=>a+b,0),row.capacity);assert.equal(row.fill,1);}
});
test('derived march capacities include each assigned hero capacity once',()=>{
  const p=ready();p.joinCount=1;p.accountBaseCapacity=40000;p.joiners[0].capacity=null;p.joinCapacity=null;
  const host=[hero(p,'Helga'),hero(p,'Gordon'),hero(p,'Saul')];
  for(const h of host)h.level=50;
  const plan=completeMarchPlan(p,host.map(hero=>({hero})),accountEffects(p));
  assert.equal(plan.marches[0].capacity,40000+host.reduce((sum,h)=>sum+heroCapacity(h.level),0));
  const join=plan.marches[1];
  assert.equal(join.capacity,40000+join.heroes.reduce((sum,h)=>sum+heroCapacity(h.level),0));
  assert.notEqual(plan.marches[0].capacity,join.capacity);
});
test('a binding class shortage shows feasible allocation without spending inventory twice',()=>{
  const p=ready();p.hostEnabled=false;p.joinCount=2;p.pusherEnabled=true;p.marchSlots=3;p.accountBaseCapacity=null;
  p.joiners[0].capacity=100003;p.joiners[1].capacity=80007;p.pusherCapacity=40009;
  p.troops={infantry:{count:10000},cavalry:{count:10000},archer:{count:100000}};
  const plan=completeMarchPlan(p,[],accountEffects(p));
  assert.deepEqual(plan.shortage,{infantry:12000,cavalry:12000,archer:76019});
  for(const t of types){
    const allocated=plan.marches.reduce((n,row)=>n+row.available[t],0);
    assert.ok(allocated<=p.troops[t].count);
    assert.equal(allocated+plan.remaining[t],p.troops[t].count);
  }
  assert.equal(plan.marches.length,3);
  assert.equal(plan.marches[2].name,'Hero-free pusher');
});
test('enabled hero-free pusher consumes a march slot and joins the shared inventory plan',()=>{
  const p=ready();p.hostEnabled=true;p.joinCount=3;p.pusherEnabled=true;p.marchSlots=4;
  assert.ok(requirements(p,'joining').some(message=>/needs 5 march slots/.test(message)));
  p.marchSlots=5;p.accountBaseCapacity=null;p.hostCapacity=100;p.joinCapacity=100;p.pusherCapacity=100;
  for(const t of types)p.troops[t].count=100;
  const plan=completeMarchPlan(p,[],accountEffects(p));
  assert.equal(plan.marches.length,5);
  assert.equal(plan.needed.archer,400);
  assert.equal(plan.shortage.archer,300);
  assert.equal(plan.marches.at(-1).name,'Hero-free pusher');
});
test('legacy mixed tiers migrate to summed editable counts and request representative progression only for mixed classes',()=>{
  const p=emptyProfile();p.mixedTiersEnabled=true;
  p.tierInventory={infantry:{8:120,9:80},cavalry:{10:300},archer:{9:100,10:400}};
  p.troops.infantry={count:200,tier:9,tg:3};p.troops.cavalry={count:300,tier:null,tg:2};p.troops.archer={count:500,tier:10,tg:4};
  const migrated=migrateProfile(validateProfile(JSON.parse(JSON.stringify(p))));
  assert.equal(migrated.mixedTiersEnabled,false);
  assert.deepEqual(migrated.troops.infantry,{count:200,tier:10,tg:0,progressionNeedsConfirmation:true});
  assert.deepEqual(migrated.troops.cavalry,{count:300,tier:10,tg:2});
  assert.deepEqual(migrated.troops.archer,{count:500,tier:10,tg:0,progressionNeedsConfirmation:true});
  assert.deepEqual(migrated.legacyTroopProgression.tierInventory,p.tierInventory);
  assert.deepEqual(migrated.legacyTroopProgression.troops,p.troops);
  const reloaded=migrateProfile(migrated);
  assert.equal(reloaded.troops.infantry.progressionNeedsConfirmation,true);
  assert.equal(reloaded.troops.infantry.count,200);
});
test('legacy host exclusions and percentage overrides are preserved and flagged',()=>{
  const p=emptyProfile();const helga=hero(p,'Helga');helga.included=false;delete helga.marchAvailable;helga.advancedAttack=123;
  p.joiners[0].slot2=hero(p,'Howard').id;p.joiners[0].capacity=91000;
  const saved=migrateProfile(JSON.parse(JSON.stringify(p)));
  assert.equal(hero(saved,'Helga').included,false);
  assert.equal(hero(saved,'Helga').marchAvailable,false);
  assert.equal(hero(saved,'Helga').advancedAttack,123);
  assert.equal(saved.joiners[0].slot2,hero(p,'Howard').id);
  assert.equal(saved.joiners[0].capacity,91000);
  assert.equal(compareHosts(saved,accountEffects(saved)).best?.team.some(e=>e.hero.name==='Helga')??false,false);
});
test('older base capacity fields keep their bonus-excluding meaning during migration',()=>{
  const p=emptyProfile();delete p.capacityInputMode;p.hostCapacity=100000;p.joinCapacity=90000;
  p.masters.find(m=>m.name==='Valora').owned=true;
  p.masters.find(m=>m.name==='Valora').skillLevels={1:10,4:2};
  const saved=migrateProfile(p),effects=accountEffects(saved);
  assert.equal(saved.capacityInputMode,'legacy-base');
  const rows=completeMarchPlan(saved,[],effects).marches;
  assert.equal(rows[0].capacity,100000+effects.deploy);
  assert.equal(rows[1].capacity,100000+effects.deploy);
  assert.equal(saved.actualMarchCapacities.joins[0],90000+effects.deploy);
  assert.equal(effects.rally,300000);
  assert.equal(rows[0].basis,'approximate common maximum');
  assert.equal(saved.legacyCapacitySetup.hostCapacity,100000);
});
test('filler leveling advice requires supported capacity and spare matching troops',()=>{
  const p=ready();p.hostEnabled=false;p.joinCount=1;
  for(const h of p.heroes.filter(h=>h.troop==='infantry'))h.level=79;
  const assignment=assignMarchHeroes(p).joins[0];
  const filler=assignment.heroes[1];
  const advice=calculate(p,'upgrades').fillerSteps;
  assert.ok(advice.some(step=>step.title.includes(filler.name)));
  for(const t of types)p.troops[t].count=0;
  assert.ok(!calculate(p,'upgrades').fillerSteps?.some(step=>step.title.includes(filler.name)));
});
