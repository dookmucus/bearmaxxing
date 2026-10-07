import {test} from 'node:test';
import assert from 'node:assert/strict';
import {heroContributions,joiningLeaderSkill,heroProgression} from '../src/hero-effects.mjs';
import {compareHosts,evaluateHostTrio} from '../src/host-comparison.mjs';
import {enteredRosterProfile as emptyProfile} from './helpers/entered-roster.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {calculate,accountEffects} from '../src/calculator.mjs';
import {actionableImprovements,hostingChoiceExplanation} from '../src/results-improvements.mjs';
import {assignMarchHeroes} from '../src/march-plan.mjs';
const explicit=name=>({name,starStep:31,widget:10,skillLevels:{1:5,2:5,3:5},skillLevelSource:{1:'user-confirmed',2:'user-confirmed',3:'user-confirmed'}});
const ready=()=>migrateProfile(emptyProfile());

test('six heroes retain explicit sourced magnitudes while unresolved offense makes coverage incomplete',()=>{
 for(const name of ['Long Fei','Zoe','Petra','Rosa','Yang','Vivian']){
  const input=explicit(name),before=structuredClone(input),c=heroContributions(input);
  assert.equal(c.offenseCoverageComplete,false,name);assert.ok(c.unresolvedOffensive.length,name);
  assert.ok(c.modeledEffects.some(e=>e.stat==='inherentAttack'),name);
  assert.ok(c.modeledEffects.some(e=>e.stat==='widgetLethality'),name);
  assert.deepEqual(input,before);
 }
 assert.equal(heroProgression('Zoe').starAttack[31],240.19);
 assert.equal(heroProgression('Vivian').starAttack[25],308.07);
 assert.equal(heroProgression('Zoe').widgetLethality[4],24);
});
test('Vivian damage taken is not Attack; Petra hosting widget Attack is separate from Lethality',()=>{
 const v=heroContributions(explicit('Vivian'));assert.equal(v.sharedAttack,0);
 assert.equal(v.unresolvedOffensive.find(e=>e.name==='Crouching Tiger').stat,'damageTaken');
 assert.match(joiningLeaderSkill(explicit('Vivian')),/enemy damage taken \+25%/);
 const p=heroContributions(explicit('Petra'));assert.equal(p.widgetRallyAttack,15);assert.equal(p.widgetRallyLethality,0);
 const missing=heroContributions({...explicit('Petra'),widget:8});assert.equal(missing.widgetRallyAttack,12.5);
 const absent=heroContributions({...explicit('Petra'),widget:0});assert.equal(absent.widgetRallyAttack,0);
});
test('Golden Rhythm magnitude is retained without inventing stacking or proc averages',()=>{
 const c=heroContributions(explicit('Rosa'));
 assert.equal(c.classAttackMultiplier,0);
 const effect=c.unresolvedOffensive.find(e=>e.name==='Golden Rhythm');assert.equal(effect.value,30);assert.match(effect.reason,/stacking/);
 assert.equal(heroContributions(explicit('Yang')).unresolvedOffensive.find(e=>e.name==='Avalanche').value,100);
});
test('irrelevant defender and defensive effects do not create offensive gaps; assumptions are separate',()=>{
 const h={...explicit('Long Fei'),skillLevels:{1:5,2:5,3:0}};
 const c=heroContributions(h);assert.equal(c.offenseCoverageComplete,true);assert.ok(c.irrelevantEffects.some(e=>/defender-only/i.test(e.reason)));
 const assumed=heroContributions({...explicit('Zoe'),skillLevelSource:{2:'assumed'}});assert.ok(assumed.assumptions.some(e=>e.name==='Charisma'));
});
test('partial comparisons preserve profile, expose unresolved offense and sort alternatives by estimated hosting damage',()=>{
 const p=ready();for(const h of p.heroes)h.included=['Helga','Long Fei','Zoe','Petra','Rosa','Yang','Vivian','Liz','Luna','Diego'].includes(h.name);
 const before=structuredClone(p),r=compareHosts(p,accountEffects(p));assert.ok(r.best);assert.equal(r.coverageComplete,false);
 assert.match(r.scope,/unmapped values remain unknown/);
 assert.ok(r.alternatives.every((a,i)=>i===0||r.alternatives[i-1].bear.modeledDamage>=a.bear.modeledDamage));assert.deepEqual(p,before);
 const helga=p.heroes.find(h=>h.name==='Helga'),petra=p.heroes.find(h=>h.name==='Petra'),rosa=p.heroes.find(h=>h.name==='Rosa');
 const trio=evaluateHostTrio(p,[helga,petra,rosa],accountEffects(p));assert.ok(trio);assert.equal(trio.coverageComplete,false);
});
test('resource suggestions use entered next progression, preserve input and avoid unsupported TG or defensive advice',()=>{
 const p=ready();p.heroes.find(h=>h.name==='Helga').widget=3;
 const wolf=p.pets.find(p=>p.name==='Gray Wolf');wolf.level=5;
 const rhino=p.pets.find(p=>p.name==='Giant Rhino');rhino.level=5;
 const before=structuredClone(p),results={hosting:calculate(p,'hosting'),upgrades:calculate(p,'upgrades')};
 const suggestions=actionableImprovements(p,results,accountEffects);
 assert.ok(suggestions.length>=3&&suggestions.length<=5);
 assert.equal(new Set(suggestions.map(s=>s.id)).size,suggestions.length);
 for(const s of suggestions){assert.ok(s.resource);assert.ok(s.target);assert.ok(s.reason);assert.ok(!/health|defense|power|Truegold/i.test(s.reason));}
 assert.deepEqual(p,before);
 assert.ok(suggestions.some(s=>s.resource==='Pet food'&&s.id===`${rhino.id}-passive`));
 assert.ok(!suggestions.some(s=>s.id===`${wolf.id}-passive`));
});
test('joining permits hosting-only exclusions but respects all-march exclusion',()=>{
 const p=ready(),h=p.heroes.find(h=>h.name==='Long Fei');h.included=false;h.marchAvailable=true;h.owned=true;h.level=80;
 for(const other of p.heroes)if(other.id!==h.id&&other.troop==='infantry')other.marchAvailable=false;
 const host=calculate(p,'hosting').team;
 const joined=assignMarchHeroes(p,host);assert.ok(joined.joins.some(row=>row.heroes.some(x=>x?.id===h.id)));
 h.marchAvailable=false;assert.ok(assignMarchHeroes(p,host).joins.every(row=>row.heroes.every(x=>x?.id!==h.id)));
});
