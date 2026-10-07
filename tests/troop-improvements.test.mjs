import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {calculate,accountEffects} from '../src/calculator.mjs';
import {actionableImprovements} from '../src/results-improvements.mjs';
import {improvementCopy} from '../src/results-copy.mjs';
const results=p=>({joining:calculate(p,'joining'),hosting:calculate(p,'hosting'),upgrades:calculate(p,'upgrades')});
test('known troop shortages become one exact improvement using maximum planning without mutating inputs',()=>{
 const p=migrateProfile(emptyProfile());p.marchSizeByType={infantry:10000,cavalry:10000,archer:80000};
 p.troops.infantry.count=39000;p.troops.cavalry.count=40000;p.troops.archer.count=245000;
 const before=structuredClone(p),actions=actionableImprovements(p,results(p),accountEffects),action=actions.find(a=>a.id==='troop-shortage');
 assert.equal(actions[0],action);assert.ok(actions.length<=5);
 assert.deepEqual(action.target,{infantry:40000,archer:320000});
 const copy=improvementCopy(action,p);
 assert.equal(copy.title,'Train troops for 4 full marches');
 assert.equal(copy.benefit,'Add 1,000 Infantry and 75,000 Archers.');
 assert.match(copy.detail,/Exact material cost is not verified/);assert.match(copy.detail,/no resource-efficiency ranking/);
 assert.deepEqual(p,before);
 p.pusherEnabled=true;p.pusherCapacity=500000;
 assert.deepEqual(actionableImprovements(p,results(p),accountEffects).find(a=>a.id==='troop-shortage'),action);
});
test('full inventories, unknown inventories and unset maximum produce no training advice',()=>{
 const p=migrateProfile(emptyProfile());p.marchSizeByType={infantry:10000,cavalry:10000,archer:80000};
 for(const t of ['infantry','cavalry','archer'])p.troops[t].count=400000;
 const noAdvice=()=>assert.ok(!actionableImprovements(p,results(p),accountEffects).some(a=>a.id==='troop-shortage'));
 noAdvice();p.troops.archer.count=null;noAdvice();
 p.troops.archer.count=0;p.marchSizeByType={infantry:0,cavalry:0,archer:0};noAdvice();
});
