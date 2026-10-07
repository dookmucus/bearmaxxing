import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enteredRosterProfile as emptyProfile} from './helpers/entered-roster.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {evaluateHostTrio} from '../src/host-comparison.mjs';
import {joiningRole} from '../src/hero-roles.mjs';
import {optimizeMarchPlan,selectCurrentPlan} from '../src/joint-plan.mjs';
import {BEAR_MECHANICS,bearExampleDamage,familyMultiplier,heroBearEffects,joiningBearComparison} from '../src/bear-comparison.mjs';
import {evaluateUpgrade} from '../src/upgrade-model.mjs';
import {actionableImprovements} from '../src/results-improvements.mjs';
const hero=(p,name)=>p.heroes.find(h=>h.name===name);
const permutations=([a,b,c])=>[[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]];
test('all six host permutations produce identical per-class stats, effects, and comparison scores',()=>{
 const p=emptyProfile(),trio=['Zoe','Petra','Rosa'].map(n=>hero(p,n)),before=structuredClone(p);
 const all=permutations(trio).map(h=>evaluateHostTrio(p,h,accountEffects(p)));
 const byClass=r=>Object.fromEntries(r.team.map(e=>[e.hero.troop,{attack:e.attack,lethality:e.lethality,factor:e.factor,contribution:e.contribution,gear:e.gear}]).sort(([a],[b])=>a.localeCompare(b)));
 for(const r of all){assert.deepEqual(byClass(r),byClass(all[0]));assert.equal(r.index,all[0].index);assert.deepEqual(r.bear.dimensions,all[0].bear.dimensions);}
 assert.deepEqual(p,before);
});
test('firsthand T6 TG0 Bear example reproduces 16797 without arbitrary class weights',()=>{
 const damage=bearExampleDamage({infantry:6000,cavalry:6000,archer:6000},BEAR_MECHANICS.baseTroops['6:0'],{infantry:1.25,cavalry:1.25,archer:1.25});
 assert.equal(Math.ceil(damage),16797);
 const four=bearExampleDamage({infantry:24000,cavalry:24000,archer:24000},BEAR_MECHANICS.baseTroops['6:0'],{infantry:1.25,cavalry:1.25,archer:1.25});
 assert.ok(Math.abs(four/damage-2)<1e-10);
 assert.equal(BEAR_MECHANICS.baseTroops['10:8'],undefined);
});
test('operation families add within a group, multiply across groups, and joining Attack has no lower fixed priority',()=>{
 assert.equal(familyMultiplier([{family:'101',value:25},{family:'101',value:25}]),1.5);
 assert.equal(familyMultiplier([{family:'101',value:25},{family:'102',value:25}]),1.5625);
 const p=emptyProfile(),chenko=joiningRole(hero(p,'Chenko')),amane=joiningRole(hero(p,'Amane'));
 assert.equal(chenko.bear.dimensions['no-overlap:independent-late-counter'],amane.bear.dimensions['no-overlap:independent-late-counter']);
 assert.ok(amane.bear.dimensions['three-101:independent-late-counter']>chenko.bear.dimensions['three-101:independent-late-counter']);
 assert.ok(chenko.bear.dimensions['three-102:independent-late-counter']>amane.bear.dimensions['three-102:independent-late-counter']);
 const option=l=>({host:null,leaders:[l],key:l.id,metrics:{dimensions:l.bear.dimensions,unknownSignature:'',capacity:null}});
 assert.equal(selectCurrentPlan([option(chenko),option(amane)]).key,amane.id); // Equal conservative outcomes use an identity display tie, not Lethality first.
});
test('scope and chance/timing semantics stay explicit for the six competing heroes',()=>{
 const p=emptyProfile(),rosa=heroBearEffects(hero(p,'Rosa')),yang=heroBearEffects(hero(p,'Yang'));
 assert.equal(rosa.effects.find(e=>e.skill===1).family,'101');assert.equal(rosa.effects.find(e=>e.skill===3).scope,'archer');
 assert.equal(yang.effects.find(e=>e.skill===1).scope,'all');assert.equal(yang.effects.find(e=>e.skill===2).scope,'archer');
 assert.equal(yang.effects[0].family,yang.effects[1].family);assert.notEqual(yang.effects[1].family,yang.effects[2].family);
 const zoe=joiningRole(hero(p,'Zoe'));assert.ok(zoe.rejection);assert.match(zoe.bearExclusion.reason,/Bear/);
 const long=heroBearEffects(hero(p,'Long Fei')).effects[0];assert.equal(long.probability,.25);assert.equal(long.rollScope,'per troop class');
 const ptr=heroBearEffects(hero(p,'Petra')).effects[0];assert.equal(ptr.kind,'chance-per-attack');assert.equal(ptr.duplicateRule,'nonstacking');
 const viv=heroBearEffects(hero(p,'Vivian'));assert.equal(viv.effects.find(e=>e.skill===1).family,'vivian-enemy-damage-taken');assert.ok(viv.effects.find(e=>e.skill===2).replacementDebuff);
});
test('rally widget multipliers are separate from ordinary widget stats and hero portrait position',()=>{
 const p=emptyProfile(),trio=['Long Fei','Petra','Rosa'].map(n=>hero(p,n));for(const h of trio){h.skillLevels={1:0,2:0,3:0};h.skillLevelSource={1:'user-confirmed',2:'user-confirmed',3:'user-confirmed'};h.widget=0;}
 const a=evaluateHostTrio(p,trio,accountEffects(p));hero(p,'Petra').widget=2;
 const b=evaluateHostTrio(p,trio,accountEffects(p));
 assert.equal(b.team[0].attack,a.team[0].attack);assert.equal(b.team[0].lethality,a.team[0].lethality);
 assert.ok(Math.abs(b.team[0].factor/a.team[0].factor-1.05)<1e-10);
 assert.equal(b.team[1].lethality-a.team[1].lethality,14);
 const role=joiningRole({...hero(p,'Chenko'),widget:10});assert.equal(role.bear.dimensions['no-overlap:independent-late-counter'],1.25);
});
test('joining squads enter separate contexts, do not combine skills, and remain legal without reservations',()=>{
 const p=emptyProfile(),before=structuredClone(p),r=optimizeMarchPlan(p,accountEffects(p));
 assert.ok(r.selected);assert.ok(!r.scenario.includes('Prioritizes steady joining Lethality'));
 const ids=[...r.selected.assignment.host,...r.selected.assignment.joins.flatMap(row=>row.heroes)].map(h=>h.canonicalHeroId??h.id);
 assert.equal(new Set(ids).size,12);for(const row of r.selected.assignment.joins){assert.equal(row.heroes[0],row.leaderRole.hero);assert.equal(new Set(row.heroes.map(h=>h.troop)).size,3);}
 for(const context of ['no-overlap','not-selected']){const values=Object.entries(r.selected.metrics.dimensions).filter(([key])=>key.startsWith(`separate-join:${context}:independent-late-counter`)).map(([,v])=>v);assert.equal(values.length,3);if(context==='not-selected')assert.deepEqual(values,[1,1,1]);else assert.ok(values.every(v=>v<1.5));}
 assert.equal(r.overallWinner,false);assert.deepEqual(p,before);
});
test('each upgrade re-optimizes a legal plan; unknown coefficients prevent damage forecasts and thresholds',()=>{
 const p=emptyProfile();for(const g of p.gear){g.quality='gold';g.enhancement=50;g.forge=11;}
 hero(p,'Petra').widget=3;const wolf=p.pets.find(p=>p.name==='Gray Wolf');wolf.level=5;
 const before=structuredClone(p),host=calculate(p,'hosting'),results={hosting:host,joining:calculate(p,'joining'),upgrades:calculate(p,'upgrades')};
 assert.equal(host.joint.selected.host.bear.damage,null);
 const gear=p.gear.find(g=>g.id==='set-archer-helmet'),changed={...p,gear:p.gear.map(g=>g===gear?{...g,forge:12}:g)};
 const outcome=evaluateUpgrade(p,changed,accountEffects,host.joint);assert.ok(outcome.reoptimized);assert.equal(outcome.selectedHost.length,3);assert.equal(outcome.selectedJoiningLeaders.length,3);
 const actions=actionableImprovements(p,results,accountEffects);assert.ok(actions.length>=3&&actions.length<=5);
 assert.ok(new Set(actions.map(a=>a.resource)).size>=2);
 for(const action of actions){if(action.id!=='troop-shortage')assert.equal(action.modelComparison?.reoptimized,true,action.id);if(action.replacesHeroId)assert.equal(action.crossover,false);}
 assert.deepEqual(p,before);
});

test('normalized comparisons ignore deployment size and inventory but still invalidate changed tier mechanics',()=>{
 const p=emptyProfile();for(const t of ['infantry','cavalry','archer']){p.stats[t]={attack:100,lethality:100};p.troops[t]={count:1000000,tier:6,tg:0};}
 p.capacityPlanningModel='shared-maximum';p.troopsPerMarch=18000;delete p.marchSizeByType;
 const a=optimizeMarchPlan(p,accountEffects(p));assert.ok(a.canRecommend);assert.ok(a.selected.host.bear.relativeOffense>0);assert.equal(a.selected.host.bear.damage,null);
 p.troopsPerMarch=72000;p.troops.archer.count=0;const b=optimizeMarchPlan(p,accountEffects(p));assert.equal(b.selected.key,a.selected.key);assert.equal(b.selected.host.bear.relativeOffense,a.selected.host.bear.relativeOffense);assert.equal(b.selected.host.bear.damage,null);
 p.troops.archer.tg=8;const c=optimizeMarchPlan(p,accountEffects(p));assert.notEqual(b,c);assert.equal(c.canRecommend,false);assert.equal(c.selected.host.bear.relativeOffense,null);
 assert.ok(c.selected.host.bear.objectiveMissing.some(m=>m.includes('Howling Wind')||m.includes('Truegold Wind')));
});

test('plans with missing magnitudes remain unranked rather than comparing their omitted effects as zero',()=>{
 const incomplete=[{key:'b',metrics:{unknownSignature:'unmapped B',dimensions:{host:50}}},{key:'a',metrics:{unknownSignature:'unmapped A',dimensions:{host:1}}}];
 const selected=selectCurrentPlan(incomplete);assert.equal(selected.key,'a');assert.equal(selected.scenarioRegret,null);
 const known={key:'c',metrics:{unknownSignature:'',dimensions:{host:2}}};
 assert.equal(selectCurrentPlan([...incomplete,known]),known);
});
