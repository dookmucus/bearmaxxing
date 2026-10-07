import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {migrateProfile} from '../src/data/roster.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {completeMarchPlan} from '../src/march-plan.mjs';
import {inventoryGroups} from '../src/inventory-planning.mjs';
const ready=()=>migrateProfile(JSON.parse(fs.readFileSync(new URL('../audits/incoming-hosting-2026-10-06/replay.json',import.meta.url))).profileSnapshot);

test('complete host and joining squads preserve hero and gear uniqueness without deploying inventory',()=>{
 const p=ready(),hosting=calculate(p,'hosting'),plan=completeMarchPlan(p,hosting.joint.selected.host.team,accountEffects(p),hosting.joint.selected.assignment);
 assert.equal(plan.marches.length,4);
 const heroes=plan.marches.flatMap(row=>row.heroes).filter(Boolean);
 assert.equal(new Set(heroes.map(h=>h.id)).size,heroes.length);
 for(const row of plan.marches){assert.deepEqual(new Set(row.heroes.map(h=>h.troop)),new Set(['infantry','cavalry','archer']));assert.equal(row.capacity,null);assert.equal(row.target,null);assert.equal(row.available,null);}
 const gear=hosting.joint.selected.host.team.flatMap(entry=>entry.gear??[]);assert.equal(new Set(gear.map(g=>g.id)).size,gear.length);
 assert.equal(plan.needed,null);assert.equal(plan.totalsKnown,false);
 for(const type of ['infantry','cavalry','archer'])assert.equal(plan.remaining[type],p.troops[type].count);
});
test('inventory planning remains separate and conserves mixed quantities with an optional fifth group',()=>{
 const p=ready();p.pusherEnabled=true;p.marchSlots=5;
 Object.assign(p.troops.infantry,{count:44000});Object.assign(p.troops.cavalry,{count:45000});Object.assign(p.troops.archer,{count:360000});
 for(const groups of [3,4,5]){const plan=inventoryGroups(p,groups);for(const type of ['infantry','cavalry','archer'])assert.equal(plan.used[type]+plan.unused[type],p.troops[type].count);}
 assert.equal(completeMarchPlan(p,[],accountEffects(p)).targetMarchCount,4);
});
test('mixed-tier migration preserves original progression and requires review only for mixed classes',()=>{
 const p=ready();p.mixedTiersEnabled=true;p.tierInventory={infantry:{8:120,9:80},cavalry:{10:300},archer:{9:100,10:400}};
 p.troops.infantry={count:200,tier:9,tg:3};p.troops.cavalry={count:300,tier:null,tg:2};p.troops.archer={count:500,tier:10,tg:4};
 const next=migrateProfile(p);assert.equal(next.mixedTiersEnabled,false);assert.equal(next.troops.infantry.count,200);assert.equal(next.troops.infantry.progressionNeedsConfirmation,true);
 assert.equal(next.troops.cavalry.tier,10);assert.equal(next.troops.cavalry.tg,2);assert.equal(next.troops.archer.count,500);
 assert.deepEqual(next.legacyTroopProgression.troops,p.troops);assert.deepEqual(next.legacyTroopProgression.tierInventory,p.tierInventory);
});
