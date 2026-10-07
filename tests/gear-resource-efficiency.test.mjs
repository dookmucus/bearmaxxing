import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gearUpgradeCost,gearCostEfficiency,nextGearOffensiveMilestone} from '../src/gear-upgrade-costs.mjs';
import {compareUpgradeBenefits} from '../src/upgrade-model.mjs';
import {gearProgression} from '../src/gear-progression.mjs';
import {emptyProfile} from '../src/profile.mjs';
import {calculate,accountEffects} from '../src/calculator.mjs';
import {actionableImprovements} from '../src/results-improvements.mjs';
import {improvementCopy} from '../src/results-copy.mjs';
const boots={id:'boots',troop:'archer',slot:'boots',quality:'gold',enhancement:100,forge:4};
const helm={id:'helm',troop:'archer',slot:'helmet',quality:'red',enhancement:107,forge:11};
test('verified incremental costs keep Mythic gear separate from hammers',()=>{
 assert.deepEqual(gearUpgradeCost(boots,{...boots,forge:5}).quantities,{forgeHammers:50,enhancementXp:0,mythicGear:0,mithril:0});
 assert.deepEqual(gearUpgradeCost(helm,{...helm,forge:12}).quantities,{forgeHammers:120,enhancementXp:0,mythicGear:2,mithril:0});
 assert.equal(gearUpgradeCost(boots,{...boots,forge:3}),null);
 assert.equal(gearUpgradeCost({...boots,forge:null},{...boots,forge:5}),null);
});
test('smaller total gain can be more efficient; extra materials are never converted into hammers',()=>{
 const a={id:'boots-forge',resource:'Forge hammers',verifiedCost:gearUpgradeCost(boots,{...boots,forge:5}),modelComparison:{damageGain:.00453}},b={id:'helm-forge',resource:'Forge hammers',verifiedCost:gearUpgradeCost(helm,{...helm,forge:12}),modelComparison:{damageGain:.00485}};
 assert.deepEqual([b,a].sort(compareUpgradeBenefits),[a,b]);assert.deepEqual(gearCostEfficiency(b).additionalMaterials,{mythicGear:2});
 assert.equal(gearCostEfficiency({...a,verifiedCost:null}),null);
 assert.equal(gearCostEfficiency({...a,resource:'Widget materials'}),null);
});
test('whole milestone paths include ascension and all prerequisite/intervening materials',()=>{
 const h=nextGearOffensiveMilestone(helm);assert.equal(h.milestone,120);assert.equal(h.candidate.forge,11);
 assert.deepEqual(h.verifiedCost.quantities,{forgeHammers:0,enhancementXp:36900,mythicGear:3,mithril:10});
 const b=nextGearOffensiveMilestone(boots);assert.equal(b.milestone,160);assert.equal(b.candidate.forge,13);
 assert.deepEqual(b.verifiedCost.quantities,{forgeHammers:810,enhancementXp:219850,mythicGear:21,mithril:60});
 const health={...boots,slot:'armor',forge:3};const a=nextGearOffensiveMilestone(health);assert.equal(gearProgression(health).lethality,0);assert.equal(a.milestone,120);assert.equal(gearProgression(a.candidate).attack,20);
});
test('Results selects efficient boots before helmet Mastery and keeps Petra shared Attack and Yang conditional',()=>{
 const p=emptyProfile();for(const t of ['infantry','cavalry','archer'])p.troops[t]={tier:10,tg:t==='infantry'?5:6,count:1000000};
 for(const g of p.gear){g.quality='gold';g.enhancement=100;g.forge=4;}
 const head=p.gear.find(g=>g.id==='set-archer-helmet');Object.assign(head,{quality:'red',enhancement:107,forge:11});
 const petra=p.heroes.find(h=>h.name==='Petra');petra.widget=3;
 const before=structuredClone(p),results=Object.fromEntries(['hosting','joining','upgrades'].map(k=>[k,calculate(p,k)]));
 const actions=actionableImprovements(p,results,accountEffects),forge=actions.find(a=>a.resource==='Forge hammers');assert.equal(forge.gearId,'set-archer-boots');assert.ok(actions.length>=3&&actions.length<=5);
 const widget=actions.find(a=>a.id===`${petra.id}-widget`);assert.ok(widget);assert.match(improvementCopy(widget,p).benefit,/2\.5 percentage points of shared hosting Attack/);
 const yang=p.heroes.find(h=>h.name==='Yang'),copy=improvementCopy({id:`${yang.id}-stars`,reason:'Inherent Attack 308.5% → 325.92% (+17.42 percentage points).',target:'3.4',modelComparison:{selectionDependent:true}},p);assert.match(copy.benefit,/while Yang hosts/);
 assert.deepEqual(p,before);
});
