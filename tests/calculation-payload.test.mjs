import test from 'node:test';
import assert from 'node:assert/strict';
import {presentationValue,presentationResults} from '../src/calculation-payload.mjs';
test('presentation payload never evaluates exhaustive lazy diagnostics',()=>{
 const value={team:[{hero:{id:'hero'},bear:{modeledDamage:123}}],get dimensions(){throw Error('expensive');},get benefits(){throw Error('expensive');},comparisons:[{huge:true}]};
 const result=presentationValue(value);
 assert.deepEqual(result,{team:[{hero:{id:'hero'},bear:{modeledDamage:123}}]});
 assert.deepEqual(structuredClone(result),result);
});
test('presentation preserves supported explanations and comparison values',()=>{
 const host={team:[{hero:{id:'h'},attack:25}],bear:{modeledDamage:123},coverageComplete:false};
 const joint={canRecommend:true,recommendationUncertainty:'Estimated',selected:{host},comparison:{options:[host]}};
 const result=presentationResults({hosting:{...host,joint,singleAlternatives:[host]},joining:{plan:{marches:[{heroes:[{id:'j'}]}]}},upgrades:{gearSteps:[]}});
 assert.equal(result.hosting.joint.selected.host.bear.modeledDamage,123);
 assert.equal(result.hosting.singleAlternatives[0].team[0].attack,25);
 assert.equal(result.joining.plan.marches[0].heroes[0].id,'j');
 assert.deepEqual(structuredClone(result),result);
});

import {planDimensionsDominate} from '../src/upgrade-model.mjs';
import {dimensionDominates} from '../src/bear-comparison.mjs';
test('lazy upgrade dominance preserves hosting and separate joining dimensions',()=>{
 const plan=(host,join)=>({host:{bear:{damageKeys:Object.keys(host),damageAt:key=>host[key]}},metrics:{joinDimensions:join}});
 for(const [a,b]of [[{x:3,y:2},{x:2,y:2}],[{x:3,y:1},{x:2,y:2}],[{x:2,y:2},{x:2,y:2}]]){
  const joins={j:1};assert.equal(planDimensionsDominate(plan(a,joins),plan(b,joins)),dimensionDominates({...a,...joins},{...b,...joins}));
 }
 assert.equal(planDimensionsDominate(plan({x:3},{j:0}),plan({x:2},{j:1})),false);
});
