import {CAPACITY_PROMPT} from '../src/march-capacity-inputs.mjs';
import {demoProfile} from './helpers/primary-demo.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile, mergeApi} from '../src/profile.mjs';
import {validateProfile, troopPlan, bestGear} from '../src/engine.mjs';
import {calculate, requirements, upgradeBaselines, known} from '../src/calculator.mjs';

function joins() {
  const p = emptyProfile();
  p.hostEnabled = false; p.joinCapacity = 100003;
  for (const t of ['infantry', 'cavalry', 'archer']) p.troops[t].count = 500000;
  return p;
}
test('new profile retains marked defaults and unknown reference coefficients', () => {
  const p = emptyProfile();
  assert.equal(p.troops.archer.count, 0);
  assert.equal(p.hostEnabled, true);
  assert.equal(p.hostCapacity, 0);
  assert.equal(p.joinCapacity, 0);
  assert.equal(p.stats.archer.attack, 0);
  assert.equal(p.weights.archer, null);
  assert.equal(p.joiners[0].skill, null);
  assert.deepEqual(p.ratios, {infantry: 10, cavalry: 10, archer: 80});
  assert.deepEqual(p.joiners.map(j => j.name), ['', '', '']);
  assert.equal(p.heroes.length, 37);
  assert.equal(p.heroes.find(h => h.name === 'Amadeus').owned, false);
  assert.equal(p.heroes.find(h => h.name === 'Gordon').owned, true);
  assert.equal(p.gear.length, 12);
  for (const value of [null, undefined, '', false, NaN, -1]) assert.equal(known(value), false);
  assert.equal(known(0), true);
});
test('joining requirements do not ask for account inventory or combat stats', () => {
  const p = joins();
  assert.deepEqual(requirements(p, 'joining'), []);
  assert.equal(p.heroes.length, 37);
  assert.equal(p.gear.length, 12);
  const result = calculate(p, 'joining');
  assert.equal(result.plan.marches.length, 3);
  assert.equal(result.plan.marches[0].capacity, 100003);
  assert.equal(result.plan.needed.archer, 240009);
});
test('unknown troop inventory and capacity block results, confirmed zero produces exact gaps', () => {
  const p = joins(); p.troops.archer.count = null;
  assert.ok(calculate(p, 'joining').missing.some(s => s.includes('archers')));
  assert.equal(calculate(p, 'joining').plan, undefined);
  assert.throws(() => troopPlan(p), /known whole troop/);
  p.troops.archer.count = 0;
  assert.equal(calculate(p, 'joining').plan.shortage.archer, 240009);
  p.joinCapacity = null;
  assert.ok(requirements(p, 'joining').some(s => s===CAPACITY_PROMPT));
  p.joinCapacity = 100.5;
  assert.ok(calculate(p, 'joining').missing.length);
});
test('no inventory requested for a zero-ratio troop type, remaining count stays unknown', () => {
  const p = joins(); p.ratios = {infantry: 0, cavalry: 0, archer: 100};
  p.troops.infantry.count = null; p.troops.cavalry.count = 55;
  const result = calculate(p, 'joining');
  assert.deepEqual(result.missing, []);
  assert.equal(result.plan.remaining.infantry, null);
  assert.equal(result.plan.remaining.cavalry, 55);
  assert.equal(result.plan.marches[0].available.infantry, 0);
});
test('unknown simultaneous hosting choice blocks allocation and enabling it requires capacity', () => {
  const p = joins(); p.hostEnabled = null;
  assert.ok(requirements(p, 'joining').some(s => s.includes('simultaneous')));
  p.hostEnabled = true;
  assert.ok(requirements(p, 'joining').some(s => s===CAPACITY_PROMPT));
  p.hostCapacity = 100000;
  assert.deepEqual(requirements(p, 'joining'), []);
  const result = calculate(p, 'joining');
  assert.equal(result.plan.marches.length, 4);
  assert.equal(result.hostEnabled, true);
  assert.equal(result.leaderGaps.length, 0); // default leaders are assumed owned and marked as such
});
test('saved joining names do not reserve heroes, even with casing or duplicate legacy names',()=>{
 const p=emptyProfile();p.capacityPlanningModel='shared-maximum';p.troopsPerMarch=100000;
 for(const t of ['infantry','cavalry','archer'])p.troops[t].count=500000;
 const before=calculate(p,'hosting').team.map(e=>e.hero.id);
 p.joiners=[{name:' Chenko '},{name:'amANE'},{name:'amANE'}];
 assert.deepEqual(calculate(p,'hosting').team.map(e=>e.hero.id),before);
 assert.ok(!calculate(p,'joining').missing.some(s=>s.includes('different joining leaders')));
 const heroes=calculate(p,'joining').plan.marches.flatMap(m=>m.heroes);
 assert.equal(new Set(heroes.map(h=>h.canonicalHeroId??h.id)).size,12);
});
test('renamed supported leaders retain their first-skill mappings without forcing role assignments',()=>{
 const p=emptyProfile();p.capacityPlanningModel='shared-maximum';p.troopsPerMarch=100000;
 for(const t of ['infantry','cavalry','archer'])p.troops[t].count=500000;
 const candidate=p.heroes.find(h=>h.name==='Chenko');candidate.name='My cavalry hero';
 const plan=calculate(p,'joining').plan;
 const row=plan.assignment.joins.find(r=>r.heroes[0].canonicalHeroId===candidate.canonicalHeroId);
 assert.ok(row);assert.equal(row.leaderRole.effects[0].stat,'lethality');
 assert.equal(row.leaderRole.effects[0].value,25);assert.equal(row.heroes[0].name,'My cavalry hero');
});
test('hosting compares entered offensive stats and compatible transferable gear', () => {
  const p = demoProfile();
  const result = calculate(p, 'hosting');
  assert.deepEqual(result.missing, []);
  assert.equal(result.team[2].hero.id, 'h3');
  assert.equal(result.team[2].gear.length, 2);
  p.stats.archer.attack = null;
  assert.deepEqual(calculate(p, 'hosting').missing, []); // Optional permanent stats do not block comparison.
  p.stats.archer.attack = 340;
  p.gearComplete = false;
  assert.deepEqual(calculate(p, 'hosting').missing, []); // The twelve primary selections are authoritative.
});
test('unknown imported reference gear never blocks the active primary loadout', () => {
  const p=demoProfile();p.gear.push({id:'unknown',name:'Unknown boots',slot:'boots',troop:'archer',enhancement:100,lethality:null});
  assert.deepEqual(calculate(p,'hosting').missing,[]);
  assert.equal(bestGear(p,'archer').find(g=>g.slot==='boots').id,'set-archer-boots');
  p.gear.at(-1).lethality=9999;
  assert.equal(bestGear(p,'archer').find(g=>g.slot==='boots').id,'set-archer-boots');
});
test('equipment instances and hosting heroes are never assigned twice', () => {
  const p = demoProfile();
  const result = calculate(p, 'hosting');
  const ids = result.team.flatMap(entry => entry.gear.map(g => g.id));
  assert.equal(ids.length, new Set(ids).size);
  p.gear[1].id = p.gear[0].id;
  assert.ok(calculate(p, 'hosting').missing.some(s => s.includes('unique ID')));
  assert.throws(() => validateProfile(p), /unique ID/);
  const other = demoProfile(); other.heroes[1].name = other.heroes[0].name;
  assert.ok(calculate(other, 'hosting').missing.some(s => s.includes('duplicate hero')));
});
test('No gear is explicit for each primary piece; missing primary inventory is not assumed empty', () => {
  const p=demoProfile();for(const g of p.gear)g.quality='none';
  assert.ok(calculate(p,'hosting').team.every(entry=>entry.gear.length===0));
  p.gear=[];p.gearComplete=true;
  assert.ok(requirements(p,'hosting').some(reason=>reason.includes('primary piece is missing')));
});
test('partial import preserves unknown types and bonuses, known inputs, and separate equipment instances', () => {
  const payload = {player: {nick_name: 'Imported'}, heroes: [
    {id: 1, name: 'Unknown type', gear: [{slot: 'helmet', enhancement_level: 70}]},
    {id: 2, name: 'Known type', gear: [{slot: 'helmet', troop_label: 'Archer', enhancement_level: 50}]},
  ]};
  const original = joins();
  const imported = mergeApi(original, payload);
  const unknownHero=imported.heroes.find(h=>h.name==='Unknown type');
  const unknownGear=imported.gear.find(g=>g.id==='api-gear-1-helmet-0');
  assert.equal(unknownHero.troop, '');
  assert.equal(unknownGear.troop, '');
  assert.equal(unknownHero.attack, null);
  assert.equal(unknownHero.stars, 5); // Established assumed hero progression, not import-confirmed.
  assert.equal(unknownHero.starStepSource,'assumed full 5 stars');
  assert.equal(unknownHero.widget, 0);
  assert.equal(unknownGear.forge, null);
  assert.equal(unknownGear.lethality, null);
  assert.equal(imported.troops.archer.count, 500000);
  unknownHero.troop = 'infantry'; unknownGear.troop = 'infantry'; unknownGear.lethality = 12;
  const repeated = mergeApi(imported, payload);
  assert.equal(repeated.heroes.length, 39); assert.equal(repeated.gear.length, 14);
  assert.equal(repeated.heroes.find(h=>h.name==='Unknown type').troop, 'infantry');
  assert.equal(repeated.gear.find(g=>g.id==='api-gear-1-helmet-0').lethality, 12);
  assert.equal(new Set(repeated.gear.map(g => g.id)).size, 14);
});
test('stat upgrade asks only for the selected effective baseline and preserves entered zero', () => {
  const p = emptyProfile();
  p.effectiveStats.archer.attack=null;
  p.upgrades = [{id: 'u1', name: 'Attack step', kind: 'stat', troop: 'archer', stat: 'attack', delta: 10, cost: null, resource: ''}];
  assert.deepEqual(upgradeBaselines(p), [{troop: 'archer', stat: 'attack'}]);
  assert.equal(requirements(p, 'upgrades').length, 1);
  assert.ok(requirements(p, 'upgrades')[0].includes('current effective archers attack'));
  assert.deepEqual(calculate(p, 'upgrades').upgrades, []);
  p.stats.archer.attack = 1000;
  assert.equal(requirements(p, 'upgrades').length, 1); // component baseline must not be reused as an effective total
  p.effectiveStats.archer.attack = 0;
  assert.equal(calculate(p, 'upgrades').upgrades[0].factorGain, 10);
  p.effectiveStats.archer.attack = 300;
  assert.equal(calculate(p, 'upgrades').upgrades[0].factorGain, 2.5);
});
test('upgrade efficiency needs an explicit resource and never compares unlike costs or invents one', () => {
  const p = emptyProfile();
  p.effectiveStats.archer.lethality = 200;
  p.upgrades = [{id: 'u', kind: 'stat', troop: 'archer', stat: 'lethality', delta: 6, cost: 50, resource: ''}];
  assert.ok(requirements(p, 'upgrades').some(s => s.includes('Name the resource')));
  p.upgrades[0].resource = 'Hammers';
  const result = calculate(p, 'upgrades');
  assert.equal(result.upgrades[0].factorGain, 2); assert.equal(result.upgrades[0].efficiency, 4);
  p.upgrades[0].cost = null;
  assert.equal(calculate(p, 'upgrades').upgrades[0].efficiency, null);
});
test('a valid upgrade remains visible while another upgrade needs data', () => {
  const p = emptyProfile();
  p.effectiveStats.archer.attack = 100;
  p.upgrades = [
    {id: 'known', name: 'Known step', kind: 'stat', troop: 'archer', stat: 'attack', delta: 10, cost: null, resource: ''},
    {id: 'unknown', name: 'Unknown step', kind: 'stat', troop: 'infantry', stat: 'attack', delta: null, cost: null, resource: ''},
  ];
  const result = calculate(p, 'upgrades');
  assert.equal(result.upgrades.length, 1);
  assert.equal(result.upgrades[0].factorGain, 5);
  assert.ok(result.missing.some(s => s.includes('Unknown step')));
});
test('capacity upgrades show exact targets and shortages without a fabricated damage factor', () => {
  const p = emptyProfile(); p.hostCapacity = 100000;
  for(const t of ['infantry','cavalry','archer'])p.troops[t].count=null;
  p.upgrades = [{id: 'u', name: 'Capacity', kind: 'capacity', delta: 10003, cost: null}];
  assert.ok(requirements(p, 'upgrades').some(s => s.includes('available archers')));
  for (const t of ['infantry', 'cavalry', 'archer']) p.troops[t].count = 10000;
  const result = calculate(p, 'upgrades').upgrades[0];
  assert.deepEqual(result.additional, {infantry: 1000, cavalry: 1000, archer: 8003});
  assert.equal(result.shortage.archer, 78003);
  assert.equal(result.factorGain, undefined);
});
test('profile round trip retains unknowns and legacy profiles do not gain effective totals', () => {
  const p = emptyProfile();
  assert.equal(validateProfile(JSON.parse(JSON.stringify(p))).hostCapacity, 0);
  const legacy = demoProfile(); delete legacy.effectiveStats; legacy.reserveJoiners = false; legacy.hostSelection = {infantry: 'h1'};
  const loaded = validateProfile(legacy);
  assert.equal(loaded.effectiveStats.archer.attack, null);
  assert.equal(loaded.hostSelection, undefined);
  assert.equal(loaded.reserveJoiners, undefined);
  assert.throws(() => validateProfile({...p, troops: {...p.troops, archer: {count: 0.5}}}), /invalid troop/);
});
