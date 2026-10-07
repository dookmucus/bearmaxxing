import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {bearTroop,REPORTED_TG6_HOWLING_WIND} from '../src/bear-troops.mjs';
import {combatBaselineInput} from '../src/input-defaults.mjs';
import {finiteBaselineCases,compareWithUnknownTroopEffect} from '../src/bear-comparison.mjs';
import {heroContributions,heroProgression} from '../src/hero-effects.mjs';
import {evaluateHostTrio} from '../src/host-comparison.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {calculationDiagnostics} from '../src/calculation-diagnostics.mjs';
import {actionableImprovements} from '../src/results-improvements.mjs';
import {improvementCopy} from '../src/results-copy.mjs';
import {heroPlanGuidance} from '../src/player-guidance.mjs';
const hero=(p,n)=>p.heroes.find(h=>h.name===n);
function fixture(){const p=emptyProfile();p.capacityPlanningModel='shared-maximum';p.troopsPerMarch=100000;delete p.marchSizeByType;for(const t of ['infantry','cavalry','archer'])p.troops[t]={count:1000000,tier:10,tg:6};for(const g of p.gear){g.quality='gold';g.enhancement=50;g.forge=11;}return p;}
test('reported Howling Wind magnitude applies exclusively to T10/TG6 Archers',()=>{
 const p=fixture(),before=structuredClone(p),r=bearTroop(p,'archer'),e=r.effects.find(e=>e.name==='Howling Wind');
 assert.equal(e.probability,.30);assert.equal(e.extra,.50);assert.equal(e.scope,'archer');assert.deepEqual(e.provenance,REPORTED_TG6_HOWLING_WIND.provenance);assert.equal(r.missing.length,0);assert.equal(e.uncertainties.length,2);
 for(const tg of [5,7,8]){const next=structuredClone(p);next.troops.archer.tg=tg;const other=bearTroop(next,'archer');assert.ok(other.missing.some(m=>m.includes('Howling Wind')));assert.ok(!other.effects.some(e=>e.name==='Howling Wind'));}
 const t11=structuredClone(p);t11.troops.archer.tier=11;assert.ok(bearTroop(t11,'archer').missing.length);assert.ok(!bearTroop(p,'cavalry').effects.some(e=>e.name==='Howling Wind'));assert.deepEqual(p,before);
});
test('legacy assumed zeros use finite cases while confirmed zeros are preserved and deduplicated',()=>{
 const p=fixture(),before=structuredClone(p),cases=finiteBaselineCases(p);
 assert.equal(cases.length,29);assert.equal(cases.find(c=>c.central).values.archer.attack,500);assert.equal(combatBaselineInput(p,'archer','attack').source,'legacy-default');assert.deepEqual(p,before);
 for(const t of ['infantry','cavalry','archer'])for(const stat of ['attack','lethality'])p.assumedInputs[`stats.${t}.${stat}`]='user-confirmed';
 const confirmed=structuredClone(p),zeros=finiteBaselineCases(p);assert.equal(zeros.length,1);assert.equal(zeros[0].central,true);assert.deepEqual(zeros[0].values,p.stats);assert.deepEqual(p,confirmed);
 delete p.assumedInputs['stats.archer.attack'];assert.equal(combatBaselineInput(p,'archer','attack').source,'unclassified-zero');assert.equal(combatBaselineInput(p,'archer','attack').value,null);
});
test('Alcar entered step 20 maps directly to the sourced inherent Attack row',()=>{
 const p=fixture(),h=hero(p,'Alcar');h.starStep=20;h.widget=0;const before=structuredClone(p);
 assert.equal(heroProgression(h).starAttack[20],187.53);assert.equal(heroContributions(h).inherentAttack,187.53);assert.equal(heroProgression(h).source,'https://kingshotdata.com/heroes/alcar/');assert.deepEqual(p,before);
});
test('TG6 magnitudes restore modeled totals, finite baseline checks and legal displayed recommendations',()=>{
 const p=fixture(),before=structuredClone(p),report=calculationDiagnostics(p);
 assert.equal(report.recommendationEstablished,true);assert.equal(report.selectedHost.length,3);assert.equal(report.jointPlan.displayedJoiningSquads.length,3);
 assert.ok(report.jointPlan.comparisons.filter(o=>!o.unmappedBearEffects).every(o=>o.hostingDamage>0));assert.equal(report.bearModel.selectedHosting.baselineCases.length,29);
 assert.ok(report.bearModel.selectedHosting.uncertainties.some(u=>u.includes('extra-attack')));assert.equal(report.bearModel.selectedHosting.coverageComplete,false);
 const ids=[...report.selectedHost,...report.jointPlan.displayedJoiningSquads.flat()];assert.equal(new Set(ids).size,12);
 const results=Object.fromEntries(['hosting','joining','upgrades'].map(k=>[k,calculate(p,k)]));const actual=actionableImprovements(p,results,accountEffects);
 assert.deepEqual(report.displayedImprovements.map(a=>a.id),actual.map(a=>a.id));assert.deepEqual(report.displayedImprovements.map(a=>({title:a.title,benefit:a.benefit,detail:a.detail})),actual.map(a=>improvementCopy(a,p)));assert.deepEqual(p,before);
});
test('unranked arrangements never export or label displayed host and joining recommendations',()=>{
 const p=fixture();p.troops.archer.tg=7;const report=calculationDiagnostics(p),results={hosting:calculate(p,'hosting'),joining:calculate(p,'joining')};
 assert.equal(report.recommendationEstablished,false);assert.match(report.selectionStatus,/unranked/);assert.equal(report.selectedHost,null);assert.deepEqual(report.joiningLeaders,[]);assert.deepEqual(report.jointPlan.displayedJoiningSquads,[]);assert.equal(report.bearModel.selectedHosting,null);assert.deepEqual(report.bearModel.selectedJoining,[]);
 const leader=results.joining.plan.marches.find(m=>m.joinIndex!=null).heroes[0];assert.ok(!heroPlanGuidance(leader,results).includes('Recommended'));assert.ok(report.bearModel.unrankedArrangement);
});
test('unknown Archer magnitude cancels only for identical affected contribution and trigger logic',()=>{
 const p=fixture();p.troops.archer.tg=7;
 const trio=['Long Fei','Petra','Rosa'].map(n=>hero(p,n));for(const h of trio){h.widget=0;h.skillLevels={1:0,2:0,3:0};h.skillLevelSource={1:'user-confirmed',2:'user-confirmed',3:'user-confirmed'};}
 const a=evaluateHostTrio(p,trio,accountEffects(p));hero(p,'Long Fei').advancedAttack=a.team.find(e=>e.hero.name==='Long Fei').contribution.inherentAttack+5;
 const b=evaluateHostTrio(p,trio,accountEffects(p)),proof=compareWithUnknownTroopEffect(b.bear,a.bear);
 assert.equal(a.bear.modeledDamage,null);assert.equal(b.bear.modeledDamage,null);assert.equal(proof.permitted,true);assert.equal(proof.relation,'a-dominates');assert.match(proof.justification,/identical Archer term cancels/);
 hero(p,'Rosa').advancedAttack=500;const changed=evaluateHostTrio(p,trio,accountEffects(p));assert.equal(compareWithUnknownTroopEffect(changed.bear,a.bear).permitted,false);
 hero(p,'Rosa').advancedAttack=null;hero(p,'Long Fei').skillLevels[3]=5;const proc=evaluateHostTrio(p,trio,accountEffects(p));assert.equal(compareWithUnknownTroopEffect(proc.bear,a.bear).permitted,false);
});
