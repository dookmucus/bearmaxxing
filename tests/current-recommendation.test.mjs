import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enteredRosterProfile as emptyProfile} from './helpers/entered-roster.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {evaluateHostTrio,heroIdentity} from '../src/host-comparison.mjs';
import {joiningRole} from '../src/hero-roles.mjs';
import {selectCurrentPlan,assembleJoiningSquads,supportedJoiningPlans} from '../src/joint-plan.mjs';
import {replacementImprovements} from '../src/replacement-improvements.mjs';
import {calculationDiagnostics} from '../src/calculation-diagnostics.mjs';
import {applySkillDefaults} from '../src/hero-skill-unlocks.mjs';
import {actionableImprovements} from '../src/results-improvements.mjs';
const hero=(p,name)=>p.heroes.find(h=>h.name===name);
const host=(p,names)=>evaluateHostTrio(p,names.map(n=>hero(p,n)),accountEffects(p));
const leaders=(p,names)=>names.map(n=>joiningRole(hero(p,n)));
test('no widget equipped permits a supported first upgrade while missing widget input stays unknown',()=>{
 const p=emptyProfile(),hosting=calculate(p,'hosting'),before=structuredClone(p);
 const results={hosting,joining:calculate(p,'joining'),upgrades:{gearSteps:[]}};
 const actions=actionableImprovements(p,results,accountEffects);
 assert.ok(actions.some(a=>a.id.endsWith('-widget')&&a.target==='Widget level 1'));
 for(const action of actions.filter(a=>a.id.endsWith('-widget')&&!a.replacesHeroId))assert.equal(action.target,'Widget level 1');
 assert.deepEqual(p,before);
 hosting.team[0].hero.widget=null;
 assert.ok(!actionableImprovements(p,results,accountEffects).some(a=>a.id===`${hosting.team[0].hero.id}-widget`));
});
test('first-skill-only hosting is replaced provisionally without losing joining bonuses or known class stats',()=>{
 const p=emptyProfile();hero(p,'Amadeus').owned=true;const before=structuredClone(p);
 const old={host:host(p,['Long Fei','Chenko','Rosa']),leaders:leaders(p,['Amadeus','Amane','Yeonwoo'])};
 const next={host:host(p,['Long Fei','Petra','Rosa']),leaders:leaders(p,['Amadeus','Amane','Chenko'])};
 assert.ok(next.host.index>old.host.index); // Bear proc/family scenarios now include Petra's offensive effects.
 const selected=selectCurrentPlan([old,next]);assert.equal(selected,next);
 const allocation=assembleJoiningSquads(p,selected.host.team,selected.leaders);
 const ids=[...allocation.host,...allocation.joins.flatMap(j=>j.heroes)].map(heroIdentity);
 assert.equal(new Set(ids).size,12);assert.deepEqual(p,before);
 // A lower entered Petra is not granted an arbitrary viability level or forced into hosting.
 const lower=applySkillDefaults({...hero(p,'Petra'),starStep:19,widget:0,skillLevels:{1:0,2:0,3:0},skillLevelSource:{1:'user-confirmed',2:'user-confirmed',3:'user-confirmed'}});
 p.heroes=p.heroes.map(h=>h.id===lower.id?lower:h);
 const weak={host:host(p,['Long Fei','Petra','Rosa']),leaders:leaders(p,['Amadeus','Amane','Chenko'])};
 assert.equal(selectCurrentPlan([old,weak]),old);
 hero(p,'Petra').widget=null;assert.equal(host(p,['Long Fei','Petra','Rosa']),null);
});
test('conditional first-skill damage is not ordered as a larger steady joining bonus',()=>{
 const p=emptyProfile();
 for(const h of p.heroes){h.skillLevels[1]=0;h.skillLevelSource[1]='user-confirmed';}
 for(const name of ['Chenko','Amane','Yeonwoo','Petra'])hero(p,name).skillLevels[1]=5;
 const plans=supportedJoiningPlans(p).plans;
 assert.ok(plans.length);assert.ok(plans.some(o=>o.leaders.every(l=>l.hero.name!=='Petra')));
 assert.ok(plans.some(o=>o.leaders.some(l=>l.hero.name==='Petra'))); // Context tradeoffs are retained without a fixed steady-effect priority.
 assert.equal(joiningRole(hero(p,'Petra')).effects[0].value,50);
 assert.equal(joiningRole(hero(p,'Petra')).effects[0].conditional,true);
 assert.ok(plans.some(o=>o.leaders.some(l=>l.hero.name==='Petra')));
});
function developmentFixture(){
 const p=emptyProfile();
 for(const h of p.heroes)h.included=['Long Fei','Petra','Rosa','Yang'].includes(h.name);
 for(const gear of p.gear){gear.quality='gold';gear.enhancement=70;gear.forge=11;}
 hero(p,'Rosa').widget=7;Object.assign(hero(p,'Yang'),applySkillDefaults({...hero(p,'Yang'),starStep:22,widget:0}));
 const current=host(p,['Long Fei','Petra','Rosa']);
 return {p,results:{hosting:{team:current.team,index:current.index,joint:{selected:{leaders:leaders(p,['Chenko','Amane','Yeonwoo'])}}}}};
}
test('replacement target uses the earliest supported widget checkpoint and the same transferable gear',()=>{
 const {p,results}=developmentFixture(),before=structuredClone(p);
 const action=replacementImprovements(p,results,accountEffects).find(a=>a.id===`${hero(p,'Yang').id}-replacement-widget`);
 assert.ok(action);assert.ok(action.targetProgression.widget>=1&&action.targetProgression.widget<=10);assert.equal(action.target,`Widget ${action.targetProgression.widget}`);
 assert.equal(action.crossover,false);assert.match(action.reason,/replacement remains provisional/);
 assert.match(action.uncertainty,/not a verified Bear damage crossover/);
 assert.deepEqual(action.transferredGearIds,results.hosting.team[2].gear.map(g=>g.id));
 assert.equal(action.targetProgression.starStep,hero(p,'Yang').starStep);
 assert.deepEqual(action.targetProgression.skillLevels,hero(p,'Yang').skillLevels);
 assert.deepEqual(p,before);
});
test('missing references and explicit all-march exclusions cannot generate replacement targets',()=>{
 const {p,results}=developmentFixture();hero(p,'Yang').widget=null;
 assert.ok(!replacementImprovements(p,results,accountEffects).some(a=>a.heroId===hero(p,'Yang').id));
 hero(p,'Yang').widget=0;hero(p,'Yang').marchAvailable=false;
 assert.ok(!replacementImprovements(p,results,accountEffects).some(a=>a.heroId===hero(p,'Yang').id));
});
test('joining development uses the first skill only, respects hosting-only exclusion and stays within its cap',()=>{
 const {p,results}=developmentFixture();
 const chenko=hero(p,'Chenko'),amadeus=hero(p,'Amadeus');
 amadeus.owned=true;
 chenko.included=false;chenko.skillLevels[1]=1;chenko.skillLevelSource[1]='user-confirmed';
 amadeus.skillLevels[1]=2;amadeus.skillLevelSource[1]='user-confirmed';
 results.hosting.joint.selected.leaders=leaders(p,['Amadeus','Amane','Yeonwoo']);
 const before=structuredClone(p),action=replacementImprovements(p,results,accountEffects).find(a=>a.id===`${chenko.id}-replacement-skill`);
 assert.ok(action);assert.equal(action.target,'Stand of Arms level 3');
 assert.deepEqual(action.targetProgression,{skillLevels:{1:3}});assert.match(action.reason,/5 percentage points of joining Lethality/);
 assert.deepEqual(p,before);
 chenko.starStep=7;assert.ok(!replacementImprovements(p,results,accountEffects).some(a=>a.id===`${chenko.id}-replacement-skill`));
});
test('missing Bear tier coefficients and mechanics cannot establish an exact replacement crossover',()=>{
 const {p,results}=developmentFixture(),before=structuredClone(p);
 const actions=replacementImprovements(p,results,accountEffects);
 assert.ok(actions.every(a=>a.crossover===false));
 assert.equal(hero(p,'Yang').starStep,22);assert.deepEqual(p,before);
});
test('exhaustive comparisons remain accessible in development diagnostics without changing the current plan',()=>{
 const p=emptyProfile(),before=structuredClone(p),current=calculate(p,'hosting');
 const report=calculationDiagnostics(p);
 assert.equal(report.jointPlan.comparisons.length,report.jointPlan.evaluated);
 assert.ok(report.jointPlan.comparisons.length>report.jointPlan.alternatives.length);
 assert.deepEqual(report.selectedHost,current.team.map(e=>heroIdentity(e.hero)));
 assert.ok(report.jointPlan.recommendationUncertainty);assert.deepEqual(p,before);
});
