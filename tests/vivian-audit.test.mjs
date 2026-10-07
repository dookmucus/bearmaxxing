import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {accountEffects} from '../src/calculator.mjs';
import {heroBearEffects,joiningBearComparison,hostBearComparison} from '../src/bear-comparison.mjs';
import {evaluateHostTrio} from '../src/host-comparison.mjs';
import {joiningRole} from '../src/hero-roles.mjs';
import {vivianAuditTrace} from '../src/vivian-audit-trace.mjs';
import {heroContributions} from '../src/hero-effects.mjs';
import {effectiveSkillLevel} from '../src/hero-skill-unlocks.mjs';
const hero=(p,n)=>p.heroes.find(h=>h.name===n);
const fixture=()=>{const p=emptyProfile();for(const t of ['infantry','cavalry','archer'])p.troops[t]={tier:10,tg:t==='infantry'?5:6,count:1000000};return p;};
test('explicit zero skills remain zero with an unknown unlock table; unknown nonzero skills stay unknown',()=>{
 const p=fixture(),h=hero(p,'Helga');h.starStep=7;h.widget=0;h.skillLevels={1:0,2:0,3:0};h.skillLevelSource={1:'user-confirmed',2:'user-confirmed',3:'user-confirmed'};
 const before=structuredClone(h);assert.equal(effectiveSkillLevel(h,2).level,0);assert.equal(effectiveSkillLevel(h,2).unlock.max,null);assert.equal(heroContributions(h).comparisonReady,true);assert.deepEqual(heroBearEffects(h).gaps,[]);assert.deepEqual(h,before);
 h.skillLevels[2]=1;assert.equal(effectiveSkillLevel(h,2).level,null);assert.equal(heroContributions(h).comparisonReady,false);
});
test('Focus Fire enters conditional event estimates; unresolved phase/stacking and known joining skill are retained',()=>{
 const p=fixture(),v=hero(p,'Vivian');v.skillLevels={1:5,2:5,3:5};v.skillLevelSource={1:'user-confirmed',2:'user-confirmed',3:'user-confirmed'};
 const before=structuredClone(p),r=evaluateHostTrio(p,['Zoe','Petra','Vivian'].map(n=>hero(p,n)),accountEffects(p));
 assert.ok(r.bear.modeledDamage>0);assert.ok(r.bear.uncertainties.some(g=>g.includes('phase')));assert.equal(r.bear.coverageComplete,false);
 assert.equal(r.bear.effects.find(e=>e.skill===1&&e.hero==='Vivian').value,25);
 assert.equal(joiningRole(v).bear.dimensions['no-overlap:independent-late-counter'],1.25);
 assert.equal(heroBearEffects(v).effects.find(e=>e.skill===3).scope,'archer');assert.equal(heroBearEffects(v).effects.find(e=>e.skill===3).value,60);assert.deepEqual(p,before);
});
test('hypothetical next-attack replacement affects exactly one attack, not an entire round',()=>{
 const trace=vivianAuditTrace({order:['infantry','cavalry','archer'],counter:'shared',activation:'fourth',focusDamage:100,tigerDamage:25,replacementDamage:15});
 assert.equal(trace.length,30);assert.equal(trace[3].focusExtraDamage,100);assert.equal(trace[3].troop,'infantry');
 assert.equal(trace[4].damageTaken,15);assert.equal(trace[5].damageTaken,25);
 assert.deepEqual(trace.filter(r=>r.focusExtraDamage).map(r=>r.attack),[4,8,12,16,20,24,28]);
 assert.ok(trace.every(r=>r.tested===false));
 const following=vivianAuditTrace({order:['infantry','cavalry','archer'],counter:'shared',activation:'following',focusDamage:100,tigerDamage:25,replacementDamage:15});assert.equal(following[3].focusExtraDamage,0);assert.equal(following[4].focusExtraDamage,100);
});
test('old audit hypotheses remain explicit overrides and do not mutate the production event model',()=>{
 const p=fixture(),r=evaluateHostTrio(p,['Zoe','Petra','Vivian'].map(n=>hero(p,n)),accountEffects(p)),effects=heroBearEffects(hero(p,'Vivian')).effects,focus=effects.find(e=>e.skill===2),tiger=effects.find(e=>e.skill===1);
 const trace=vivianAuditTrace({order:['infantry','cavalry','archer'],counter:'shared',activation:'fourth',focusDamage:focus.value,tigerDamage:tiger.value,replacementDamage:focus.nextAttackDamageTaken[focus.level]});
 const audit=hostBearComparison(p,r.team,{vivianTrace:trace});assert.ok(audit.modeledDamage>0);assert.ok(audit.assumptions.some(s=>s.includes('Hypothetical Vivian')));assert.equal(hostBearComparison(p,r.team).modeledDamage,r.bear.modeledDamage);assert.equal(r.bear.coverageComplete,false);
});
test('Alcar offensive magnitudes retain class scope and full-round target effect with explicit stacking cases',()=>{
 const p=fixture(),a=hero(p,'Alcar');a.starStep=20;a.widget=0;
 const r=heroBearEffects(a);assert.equal(r.effects.find(e=>e.skill===2&&e.scope==='infantry').value,80);
 assert.equal(r.effects.find(e=>e.skill===2&&e.scope==='archer').value,8);assert.equal(r.effects.find(e=>e.skill===3&&e.scope==='infantry').value,48);assert.equal(r.effects.find(e=>e.skill===3&&e.scope==='all').value,20);
 assert.equal(r.gaps.length,0);assert.ok(r.effects.some(e=>e.unresolved?.length));assert.equal(r.effects.find(e=>e.skill===1).excluded,true);
 const host=evaluateHostTrio(p,[a,hero(p,'Petra'),hero(p,'Yang')],accountEffects(p));assert.ok(host.bear.modeledDamage>0);assert.equal(host.bear.coverageComplete,false);assert.notEqual(host.bear.damageDimensions['finite-111:alcar-additive:independent'],host.bear.modeledDamage);
});
test('Yang joining contribution is separate from captain Avalanche and can lose to Yeonwoo',()=>{
 const p=fixture(),y=hero(p,'Yang');y.starStep=22;const r=joiningBearComparison(joiningRole(y)),w=joiningRole(hero(p,'Yeonwoo')).bear;
 assert.ok(Math.abs(r.dimensions['no-overlap:independent-late-counter']-1.16)<1e-12);
 assert.ok(Math.abs(r.dimensions['captain-yang-same-phase:independent-late-counter']-(1.36/1.2))<1e-12);
 assert.ok(r.dimensions['three-101:independent-late-counter']>w.dimensions['three-101:independent-late-counter']);
 assert.ok(r.dimensions['captain-yang-same-phase:independent-late-counter']<w.dimensions['captain-yang-same-phase:independent-late-counter']);
 assert.ok(r.uncertainties.length);assert.match(r.activationEvidence,/Official/);
});
