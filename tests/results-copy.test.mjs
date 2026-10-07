import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {rallyCapacityCopy,improvementCopy,joiningLeaderCopy} from '../src/results-copy.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {actionableImprovements} from '../src/results-improvements.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {compareHosts} from '../src/host-comparison.mjs';

test('per-class explanation receives the closest single-slot alternatives without changing the selected host',()=>{
 const p=migrateProfile(emptyProfile()),compared=compareHosts(p,accountEffects(p)),hosting=calculate(p,'hosting');
 assert.deepEqual(hosting.team,hosting.joint.selected.host.team);
 assert.equal(hosting.index,hosting.joint.selected.host.index);
 assert.ok(compared.options.some(o=>o.team.every((e,i)=>e.hero.id===hosting.team[i].hero.id)));
 for(const alt of hosting.singleAlternatives)assert.equal(alt.team.filter((e,i)=>e.hero.id!==hosting.team[i].hero.id).length,1);
});

test('rally display reconciles sources and distinguishes personal capacity without modifying inputs',()=>{
 const p=migrateProfile(emptyProfile());
 p.masters.find(m=>m.name==='Valora').skillLevels={1:'10'};
 p.masters.find(m=>m.name==='Cassia').skillLevels={4:'20'};
 const before=structuredClone(p),total=accountEffects(p).rally;
 assert.equal(total,400000);
 const copy=rallyCapacityCopy(p,total);
 assert.match(copy,/Valora — Dance of the Hunt, level 10: \+300,000/);
 assert.match(copy,/Cassia — Inspiring Mobilization, level 20: \+100,000/);
 assert.match(copy,/total hosted rally capacity, not your personal march size/);
 assert.equal(rallyCapacityCopy(p,450000),null);
 assert.equal(rallyCapacityCopy(p,0),null);
 assert.deepEqual(p,before);
});

test('upgrade presentation keeps supported targets and effects separate from modeled gains',()=>{
 const p=migrateProfile(emptyProfile());
 for(const g of p.gear){g.quality='gold';g.enhancement=50;g.forge=11;}
 const results={hosting:calculate(p,'hosting'),upgrades:calculate(p,'upgrades')};
 const actions=actionableImprovements(p,results,accountEffects),before=structuredClone(actions);
 const gear=actions.find(a=>a.gearId&&a.id.endsWith('-forge'));
 const copy=improvementCopy(gear,p);
 assert.match(copy.title,/Mastery 11 → 12/);
 assert.match(copy.benefit,/Adds [\d.]+ percentage points of .* Lethality/);
 assert.ok(!copy.benefit.includes('modeled'));
 assert.match(copy.detail,/Estimated comparison|Verified stat improvement/);
 assert.deepEqual(actions,before);
 const leader=joiningLeaderCopy(p.heroes.find(h=>h.name==='Chenko'));
 assert.match(leader.summary,/\+25% rally Lethality/);
 assert.match(leader.detail,/assumed from stars/);
});
