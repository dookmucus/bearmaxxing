import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {calculate,accountEffects} from '../src/calculator.mjs';
import {actionableImprovements} from '../src/results-improvements.mjs';
import {improvementCopy} from '../src/results-copy.mjs';
const results=p=>({joining:calculate(p,'joining'),hosting:calculate(p,'hosting'),upgrades:calculate(p,'upgrades')});
test('limited inventory never creates assumed-capacity training advice and remains unmodified',()=>{
 const p=migrateProfile(emptyProfile());p.marchSizeByType={infantry:10000,cavalry:10000,archer:80000};p.troops.infantry.count=39000;p.troops.cavalry.count=40000;p.troops.archer.count=245000;
 const before=structuredClone(p),actions=actionableImprovements(p,results(p),accountEffects);
 assert.ok(actions.every(a=>a.id!=='troop-shortage'&&a.resource!=='Troop training'));assert.deepEqual(p,before);
 p.pusherEnabled=true;p.pusherCapacity=500000;assert.ok(actionableImprovements(p,results(p),accountEffects).every(a=>a.id!=='troop-shortage'));
});

test('full inventories, unknown inventories and unset maximum produce no training advice',()=>{
 const p=migrateProfile(emptyProfile());p.marchSizeByType={infantry:10000,cavalry:10000,archer:80000};
 for(const t of ['infantry','cavalry','archer'])p.troops[t].count=400000;
 const noAdvice=()=>assert.ok(!actionableImprovements(p,results(p),accountEffects).some(a=>a.id==='troop-shortage'));
 noAdvice();p.troops.archer.count=null;noAdvice();
 p.troops.archer.count=0;p.marchSizeByType={infantry:0,cavalry:0,archer:0};noAdvice();
});
