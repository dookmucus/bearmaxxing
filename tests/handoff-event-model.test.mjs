import {test} from 'node:test';
import assert from 'node:assert/strict';
import {attackEventExpectation,effectiveWidgetStat} from '../src/bear-attack-events.mjs';
import {periodicActive,bearExampleDamage,heroBearEffects} from '../src/bear-comparison.mjs';
import {evaluateHostTrio} from '../src/host-comparison.mjs';
import {enteredRosterProfile as emptyProfile} from './helpers/entered-roster.mjs';
import {accountEffects} from '../src/calculator.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('production matches handoff Daryl T6 and one-widget fixtures, without double applying a report multiplier',()=>{
 const counts={infantry:6000,cavalry:6000,archer:6000},stats={infantry:{attack:243,lethality:10},cavalry:{attack:730,lethality:10},archer:{attack:974,lethality:10}};
 assert.equal(Math.ceil(bearExampleDamage(counts,stats,{infantry:1.25,cavalry:1.25,archer:1.25})),16797);
 close(effectiveWidgetStat(234.6,7.5),259.695);close(effectiveWidgetStat(259.695,7.5,{alreadyIncluded:true}),259.695);
});
test('Focus Fire counts all normal class attacks and replaces Tiger on exactly the next event',()=>{
 const r=attackEventExpectation({focus:{value:100,nextTaken:15},tiger:25,collectTrace:true,factor:e=>(1+e.damageTaken/100)*(1+e.focusExtraDamage/100)});
 assert.equal(r.trace.length,30);assert.deepEqual(r.trace.filter(e=>e.focusProc).map((e)=>[e.round,e.troop]),[[2,'infantry'],[3,'cavalry'],[4,'archer'],[6,'infantry'],[7,'cavalry'],[8,'archer'],[10,'infantry']]);
 close(r.trace[4].damageTaken,15);close(r.trace[5].damageTaken,25);
 close(r.totals.infantry+3*r.totals.cavalry+4.4*r.totals.archer,125.27);
});
test('Volley advances Focus Fire, but not Trap; no recursive focus attack or duplicate Volley multiplier',()=>{
 const r=attackEventExpectation({forcedVolleyRounds:[1],focus:{value:100,nextTaken:15},trap:{value:60},tiger:25,collectTrace:true});
 const fourth=r.trace[3];assert.equal(fourth.kind,'volley');assert.equal(fourth.focusProc,true);assert.equal(fourth.trapProc,false);
 assert.equal(r.trace[4].damageTaken,15);assert.deepEqual(r.trace.filter(e=>e.trapProc).map(e=>e.round),[4,8]);
 close(r.totals.archer,11);close(r.probabilityMass,1);
 const expected=attackEventExpectation({volleyProbability:.1});close(expected.totals.archer,11);
});
test('Trap retains infantry-Bear damage and clears Tiger on the next normal hit, not every hit of a round',()=>{
 const r=attackEventExpectation({trap:{value:60},tiger:25,collectTrace:true});
 assert.equal(r.trace[11].trapExtraDamage,60);assert.equal(r.trace[12].damageTaken,0);assert.equal(r.trace[13].damageTaken,25);
});
test('Petra forward-round probabilities cannot retroactively buff earlier hits; rounds reset',()=>{
 const r=attackEventExpectation({collectTrace:true});
 assert.deepEqual(r.trace.slice(0,4).map(e=>e.petraProbability),[.5,.75,.875,.5]);
});
test('Yang has two finite pulses for both supported phase cases; no fabricated round-one pulse',()=>{
 assert.deepEqual(Array.from({length:10},(_,i)=>i+1).filter(r=>periodicActive(r,4,1)),[4,8]);
 assert.deepEqual(Array.from({length:10},(_,i)=>i+1).filter(r=>periodicActive(r,4,0)),[5,9]);
});
test('all host permutations preserve event factors and total damage; uncertain Vivian and Alcar effects remain modeled and labeled',()=>{
 const p=emptyProfile();for(const t of ['infantry','cavalry','archer'])p.troops[t]={tier:10,tg:t==='infantry'?5:6,count:1000000};
 const heroes=['Zoe','Petra','Vivian'].map(n=>p.heroes.find(h=>h.name===n)),before=structuredClone(p);
 const perms=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
 const rows=perms.map(order=>evaluateHostTrio(p,order.map(i=>heroes[i]),accountEffects(p)));
 for(const r of rows){assert.ok(r.bear.modeledDamage>0);assert.deepEqual(r.bear.classes,rows[0].bear.classes);assert.deepEqual(r.bear.damageDimensions,rows[0].bear.damageDimensions);assert.equal(r.bear.coverageComplete,false);}
 const alcar=p.heroes.find(h=>h.name==='Alcar');alcar.starStep=20;alcar.widget=0;
 const effects=heroBearEffects(alcar);assert.equal(effects.gaps.length,0);assert.equal(effects.effects.find(e=>e.skill===3&&e.scope==='all').value,20);assert.ok(effects.effects.some(e=>e.unresolved?.length));
 // We only changed the isolated Alcar test object, never player data.
 p.heroes.find(h=>h.name==='Alcar').starStep=before.heroes.find(h=>h.name==='Alcar').starStep;p.heroes.find(h=>h.name==='Alcar').widget=before.heroes.find(h=>h.name==='Alcar').widget;assert.deepEqual(p,before);
});
