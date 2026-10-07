import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {accountEffects} from '../src/calculator.mjs';
import {evaluateHostTrio} from '../src/host-comparison.mjs';
import {hostBearComparison,familyMultiplier} from '../src/bear-comparison.mjs';
import {HOST_INCOMING_CONTEXTS,incomingEffects,combineIncoming} from '../src/hosting-incoming.mjs';
const skill=(hero,level=5,selected=true)=>({hero,level,slot:1,selected});
const context=(skills,extra={})=>({id:'recorded',central:true,skills,...extra});
function fixture(){const p=emptyProfile();for(const t of ['infantry','cavalry','archer']){p.troops[t]={count:1000000,tier:10,tg:6};p.stats[t]={attack:500,lethality:500};}p.troopsPerMarch=100000;p.capacityPlanningModel='shared-maximum';delete p.marchSizeByType;for(const h of p.heroes){h.starStep=31;h.level=80;}return p;}
test('four selected incoming effects use sourced levels and additive families, not offered heroes',()=>{
 const c=context([skill('Chenko'),skill('Yeonwoo'),skill('Amane',4),skill('Vivian',5,false)]);
 const effects=incomingEffects(c);assert.equal(effects.length,3);assert.deepEqual(effects.map(e=>e.value),[25,25,20]);
 assert.equal(familyMultiplier(combineIncoming([],effects,c)),1.5*1.2);
 assert.throws(()=>incomingEffects(context(Array.from({length:5},()=>skill('Chenko')))));
 assert.throws(()=>incomingEffects(context([skill('Yang')])));
});
test('incoming bonuses dilute shared-family hosting contributions rather than cancel',()=>{
 const c=context([skill('Chenko'),skill('Yeonwoo'),skill('Amane'),skill('Amane')]),incoming=incomingEffects(c);
 const noIncoming=familyMultiplier([{family:'101',value:20}]);
 const withIncoming=familyMultiplier(combineIncoming([{family:'101',value:20}],incoming,c))/familyMultiplier(incoming);
 assert.equal(noIncoming,1.2);assert.ok(Math.abs(withIncoming-1.7/1.5)<1e-12);assert.notEqual(noIncoming,withIncoming);
});
test('incoming Vivian overlap is explicitly assumed; no Focus Fire or widget is imported',()=>{
 const effects=incomingEffects(context([skill('Vivian')]));assert.ok(effects[0].unresolved.length);assert.equal(effects[0].slot,1);
 const own=[{family:'vivian-enemy-damage-taken',value:15}];
 assert.equal(familyMultiplier(combineIncoming(own,effects,{vivianOverlap:'strongest'})),1.25);
 assert.equal(familyMultiplier(combineIncoming(own,effects,{vivianOverlap:'add'})),1.4);
});
test('full hosting replay separates incoming contexts and ignores outgoing squads without mutating inputs',()=>{
 const p=fixture(),original=JSON.stringify(p),heroes=['Zoe','Petra','Rosa'].map(n=>p.heroes.find(h=>h.name===n));
 const a=evaluateHostTrio(p,heroes,accountEffects(p));assert.equal(a.bear.incomingContexts.length,HOST_INCOMING_CONTEXTS.length);assert.ok(a.bear.modeledDamage>0);
 const q=structuredClone(p);q.joiners=['Vivian','Yang','Long Fei'];q.joinCount=1;
 const b=evaluateHostTrio(q,heroes,accountEffects(q));assert.deepEqual(a.bear.damageDimensions,b.bear.damageDimensions);
 const control=hostBearComparison(p,a.team,{incomingContexts:[context([])]});assert.ok(a.bear.modeledDamage>control.modeledDamage);
 for(const permutation of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]])assert.deepEqual(evaluateHostTrio(p,permutation.map(i=>heroes[i]),accountEffects(p)).bear.damageDimensions,a.bear.damageDimensions);
 assert.equal(JSON.stringify(p),original);
});
