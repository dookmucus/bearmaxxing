import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {evaluateHostTrio} from '../src/host-comparison.mjs';
import {selectCurrentPlan,optimizeMarchPlan} from '../src/joint-plan.mjs';
import {finiteBaselineCases} from '../src/bear-comparison.mjs';
import {bearTroop,troopDamageMultiplier,TROOP_REFERENCE} from '../src/bear-troops.mjs';
import {evaluateUpgrade,compareUpgradeBenefits} from '../src/upgrade-model.mjs';
import {actionableImprovements} from '../src/results-improvements.mjs';
import {calculationDiagnostics} from '../src/calculation-diagnostics.mjs';
const hero=(p,n)=>p.heroes.find(h=>h.name===n);
function entered(){
 const p=emptyProfile();p.troopsPerMarch=100000;p.capacityPlanningModel='shared-maximum';delete p.marchSizeByType;
 for(const t of ['infantry','cavalry','archer']){p.troops[t]={count:1000000,tier:10,tg:3};p.stats[t]={attack:400,lethality:300};}
 for(const g of p.gear){g.quality='gold';g.enhancement=50;g.forge=11;}
 hero(p,'Petra').widget=3;p.pets.find(p=>p.name==='Gray Wolf').level=5;return p;
}
test('entered tier/TG rows are exact published lookups, never T6 replacements or extrapolations',()=>{
 const p=entered();assert.equal(bearTroop(p,'archer').coefficient.attack,2165);assert.equal(bearTroop(p,'cavalry').coefficient.attack,1624);
 p.troops.archer.tg=8;assert.equal(bearTroop(p,'archer').coefficient.attack,2763);assert.ok(bearTroop(p,'archer').missing.some(m=>m.includes('pure-damage')));
 p.troops.archer.tg=9;assert.equal(bearTroop(p,'archer').coefficient,null);
 p.troops.archer.tg=null;assert.equal(bearTroop(p,'archer').coefficient,null);
 assert.equal(Object.keys(TROOP_REFERENCE.rows).length,99);assert.match(TROOP_REFERENCE.evidence,/community/i);
});
test('Volley and Truegold procs have explicit scope, magnitudes, exclusions and unknown checkpoints',()=>{
 const p=entered(),arc=bearTroop(p,'archer'),cav=bearTroop(p,'cavalry'),inf=bearTroop(p,'infantry');
 assert.ok(Math.abs(troopDamageMultiplier(arc)-1.1*1.1*1.1)<1e-12);
 assert.ok(Math.abs(troopDamageMultiplier(arc,'additive')-1.1*1.2)<1e-12);
 assert.equal(troopDamageMultiplier(cav),1.1);assert.equal(troopDamageMultiplier(inf),1);
 assert.ok(inf.irrelevant.some(e=>e.name==='Unyielding Shield'));
 p.troops.archer.tier=6;p.troops.archer.tg=0;assert.equal(troopDamageMultiplier(bearTroop(p,'archer')),1.1);
 p.troops.archer.tg=5;assert.ok(bearTroop(p,'archer').missing.some(e=>e.includes('values are substituted')));
});
test('total formation damage beats a balanced class-factor plan even with stronger joining offers elsewhere',()=>{
 const option=(key,damage,classes,join)=>({key,host:{bear:{modeledDamage:damage,dimensions:classes},team:[]},leaders:[],metrics:{unknownSignature:'',dimensions:{...classes,'separate-join:neutral:0':join},capacity:null}});
 const balanced=option('a-balanced',100,{infantry:2,cavalry:2,archer:2},2);
 const higher=option('z-archer-heavy',130,{infantry:1,cavalry:1,archer:4},1.1);
 assert.equal(selectCurrentPlan([balanced,higher]),higher);
 assert.equal(selectCurrentPlan([higher,balanced]),higher);
});
test('joining context dominance decides equal-host offers without trading away host damage',()=>{
 const option=(key,join)=>({key,host:null,leaders:[],metrics:{unknownSignature:'',dimensions:{'separate-join:neutral:0':join,'separate-join:crowded:0':join},capacity:null}});
 assert.equal(selectCurrentPlan([option('a-weak',1.1),option('z-strong',1.25)]).key,'z-strong');
 const a=option('a-tradeoff',1.2),b=option('b-tradeoff',1.2);a.metrics.dimensions['separate-join:crowded:0']=1.1;b.metrics.dimensions['separate-join:neutral:0']=1.1;
 assert.equal(selectCurrentPlan([b,a]).key,'a-tradeoff'); // Display representative, not an invented combined ranking.
});
test('host damage sums class/tier/count contributions and does not use class-relative regret',()=>{
 const p=entered(),before=structuredClone(p),plan=optimizeMarchPlan(p,accountEffects(p));assert.ok(plan.selected.host.bear.modeledDamage>0);
 const eligible=plan.comparisons.filter(o=>!o.metrics.unknownSignature&&o.host.bear.modeledDamage!=null);
 assert.equal(plan.selected.host.bear.modeledDamage,Math.max(...eligible.map(o=>o.host.bear.modeledDamage)));
 assert.ok(Object.keys(plan.selected.metrics.dimensions).every(k=>!k.startsWith('host:')));
 assert.ok(plan.selected.sensitivity.evaluated);assert.equal(plan.selected.sensitivity.cases.length,Object.keys(plan.selected.host.bear.damageDimensions).length);
 assert.match(plan.objective,/Maximize central total/);assert.deepEqual(p,before);
});
test('finite baseline variations preserve entered values and distinguish assumptions from player inputs',()=>{
 const p=entered(),before=structuredClone(p),cases=finiteBaselineCases(p);
 assert.equal(cases.length,29);assert.deepEqual(cases.find(c=>c.central).values,p.stats);
 assert.equal(cases[0].values.infantry.attack,320);assert.equal(cases.at(-3).values.archer.attack,480);
 p.stats.infantry={attack:null,lethality:null};const unknown=finiteBaselineCases(p);
 assert.equal(unknown.find(c=>c.central).values.infantry.attack,500);
 assert.ok(unknown.every(c=>[200,500,1000].includes(c.values.infantry.attack)));
 const result=evaluateHostTrio(p,['Long Fei','Petra','Rosa'].map(n=>hero(p,n)),accountEffects(p));
 assert.equal(result.bear.damage,null);assert.ok(result.bear.modeledDamage>0);assert.ok(result.bear.assumptions.some(a=>a.includes('not player values')));
 assert.deepEqual(before.stats.cavalry,p.stats.cavalry);assert.equal(p.stats.infantry.attack,null);
});
test('unmapped TG mechanics do not become zero procs or produce a damage winner',()=>{
 const p=entered();p.troops.archer.tg=8;const result=optimizeMarchPlan(p,accountEffects(p));
 assert.equal(result.selected.host.bear.modeledDamage,null);assert.equal(result.selected.sensitivity.evaluated,false);
 assert.match(result.selectionStatus,/unranked/);assert.equal(result.selected.scenarioRegret,null);assert.equal(result.overallWinner,false);
});
test('upgrades use re-optimized total host damage, separate joining paths and multiple resources without changing inputs',()=>{
 const p=entered(),before=structuredClone(p),baseline=optimizeMarchPlan(p,accountEffects(p));
 const g=p.gear.find(g=>g.id==='set-archer-helmet'),changed={...p,gear:p.gear.map(item=>item===g?{...g,forge:12}:item)};
 const evaluated=evaluateUpgrade(p,changed,accountEffects,baseline);assert.ok(evaluated.damageGain>0);assert.equal(evaluated.objectiveUnavailable,false);
 const actions=actionableImprovements(p,{hosting:calculate(p,'hosting'),joining:calculate(p,'joining'),upgrades:calculate(p,'upgrades')},accountEffects);
 assert.ok(actions.length>=3&&actions.length<=5);assert.ok(new Set(actions.map(a=>a.resource)).size>=2);
 assert.ok(actions.filter(a=>a.modelComparison?.damageGain!=null).every(a=>a.modelComparison.damageGain>=-1e-12));
 const small={id:'a',modelComparison:{damageGain:.01}},large={id:'z',modelComparison:{damageGain:.02}};
 assert.ok(compareUpgradeBenefits(small,large)>0);assert.deepEqual(p,before);
});
test('diagnostics retain total-damage objective, sourced troop rows and finite sensitivity checks',()=>{
 const p=entered(),before=structuredClone(p),data=calculationDiagnostics(p);
 assert.equal(data.version,4);assert.match(data.bearModel.objective,/total modeled hosting/);
 assert.equal(data.bearModel.troopReference.rows['10:3'].archer.attack,2165);
 assert.ok(data.bearModel.sensitivity.cases.length>=29);
 assert.ok(data.jointPlan.comparisons.some(o=>o.hostingDamage>0));assert.deepEqual(p,before);
});

test('finite baseline checks detect a real host crossover and do not replace the central damage objective',()=>{
 const p=emptyProfile();p.ratios={infantry:100,cavalry:0,archer:0};
 for(const t of ['infantry','cavalry','archer']){p.troops[t]={tier:10,tg:3,count:1000000};p.stats[t]={attack:null,lethality:null};}
 for(const h of p.heroes){h.included=['Long Fei','Zoe','Chenko','Rosa'].includes(h.name);h.widget=0;}
 for(const name of ['Long Fei','Zoe','Chenko','Rosa']){hero(p,name).skillLevels={1:0,2:0,3:0};hero(p,name).skillLevelSource={1:'user-confirmed',2:'user-confirmed',3:'user-confirmed'};}
 // Synthetic 370% lies below the central crossover with incoming Attack,
 // but above the low-baseline crossover. It is never a player-value default.
 hero(p,'Long Fei').advancedAttack=370;hero(p,'Zoe').skillLevels[2]=5;
 const before=structuredClone(p),result=optimizeMarchPlan(p,accountEffects(p));
 assert.equal(result.selected.host.team[0].hero.name,'Zoe');
 assert.equal(result.selected.sensitivity.stableAcrossTestedCases,false);
 assert.ok(result.selected.sensitivity.cases.some(c=>c.winningHosts.some(h=>h.includes(hero(p,'Long Fei').canonicalHeroId??hero(p,'Long Fei').id))));
 assert.match(result.recommendationUncertainty,/different hosting trio wins|best host changes with incoming joining bonuses/);assert.deepEqual(p,before);
});
