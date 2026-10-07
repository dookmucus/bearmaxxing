import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {enteredRosterProfile as emptyProfile} from './helpers/entered-roster.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {calculate,requirements,accountEffects} from '../src/calculator.mjs';
import {compareHosts} from '../src/host-comparison.mjs';
import {bestGear,gearOffense} from '../src/engine.mjs';
import {activeGearInventory,activeGearInventoryIssues} from '../src/active-gear.mjs';
import {gearIssues,gearLevelLabel} from '../src/gear-progression.mjs';
const ready=()=>migrateProfile(emptyProfile());
const fixture=()=>{
 const p=ready();
 for(const name of ['Long Fei','Zoe','Rosa','Yang','Petra'])for(const slot of ['helmet','gloves','armor','boots'])p.gear.push({id:`api-gear-${name}-${slot}`,name:`${name} ${slot}`,slot,troop:'',quality:'Unknown',enhancement:null,forge:null,imported:true,provenance:{quality:'imported'}});
 return p;
};
test('12 primary pieces are authoritative with 20 malformed imported reference pieces',()=>{
 const p=fixture(),before=structuredClone(p.gear.slice(12));
 assert.equal(activeGearInventory(p).length,12);assert.equal(p.gear.length,32);
 assert.deepEqual(requirements(p,'hosting'),[]);assert.equal(calculate(p,'hosting').team.length,3);
 assert.ok(compareHosts(p,accountEffects(p)).best);
 for(const type of ['infantry','cavalry','archer'])assert.equal(bestGear(p,type).length,4);
 assert.ok(calculate(p,'hosting').gearIds.every(id=>id.startsWith('set-')));
 assert.deepEqual(p.gear.slice(12),before);
 assert.deepEqual(migrateProfile(p).gear.slice(12),before); // Archived null progression is not defaulted to zero.
 // Even apparently stronger, valid imported gear is reference only.
 Object.assign(p.gear[12],{troop:'infantry',quality:'gold',enhancement:100,forge:20});
 assert.equal(bestGear(p,'infantry').find(g=>g.slot==='helmet').id,'set-infantry-helmet');
});
test('edited primary Type, Level and Mastery immediately reach assigned gear and factors',()=>{
 const p=fixture(),g=p.gear.find(g=>g.id==='set-archer-helmet');
 const before=compareHosts(p,accountEffects(p)).best.index;
 Object.assign(g,{quality:'gold',enhancement:'100',forge:'10'});
 const result=calculate(p,'hosting'),entry=result.team.find(e=>e.hero.troop==='archer');
 assert.equal(entry.gear.find(x=>x.slot==='helmet'),g);assert.equal(gearOffense(g).lethality,100);
 assert.ok(result.index>before);
 g.quality='purple';g.enhancement='80';g.forge='20';
 assert.deepEqual(gearIssues(g),[]);assert.equal(gearOffense(g).lethality,25.8);
 g.quality='none';assert.deepEqual(gearOffense(g),{attack:0,lethality:0,estimated:false,milestones:[]});
 assert.ok(!bestGear(p,'archer').some(x=>x.id===g.id));
});
test('Legendary display conversion preserves absolute saved values and leaves ambiguous +levels untouched',()=>{
 const p=ready(),g=p.gear[0];Object.assign(g,{quality:'Ascended',enhancement:'100',forge:'0'});
 assert.equal(gearLevelLabel(g.quality,g.enhancement),'+0');assert.deepEqual(gearIssues(g),[]);
 assert.equal(gearOffense(g).lethality,50);
 g.enhancement='200';assert.equal(gearLevelLabel(g.quality,g.enhancement),'+100');assert.deepEqual(gearIssues(g),[]);
 g.enhancement='0';assert.match(gearIssues(g).join(' '),/100–200/);assert.equal(g.enhancement,'0');
 const migrated=migrateProfile(p);assert.equal(migrated.gear[0].enhancement,'0');assert.equal(migrated.gear[0].forge,'0');
});
test('only primary duplicates and class/slot conflicts block assignment without picking a winner',()=>{
 const p=fixture();p.gear.push({...p.gear[12]});assert.deepEqual(requirements(p,'hosting'),[]);
 p.gear.push({...p.gear[0],enhancement:99});assert.match(activeGearInventoryIssues(p).join(' '),/duplicate primary/);
 assert.equal(compareHosts(p,accountEffects(p)).best,null);assert.deepEqual(bestGear(p,'infantry'),[]);
 const restored=migrateProfile(p);assert.equal(restored.gear.filter(g=>g.id===p.gear[0].id).length,2);
 assert.match(activeGearInventoryIssues(restored).join(' '),/duplicate primary/);
 const other=ready();other.gear[0].slot='boots';assert.match(requirements(other,'hosting').join(' '),/slot must match/);
});
test('malformed primary progression and missing imbuement references report distinct precise reasons',()=>{
 const p=ready(),g=p.gear[0];g.name='Former hero owner helmet';g.enhancement='101';
 assert.match(requirements(p,'hosting').join(' '),/Infantry helmet: Mythic Level must be 0–100/);
 assert.ok(!requirements(p,'hosting').join(' ').includes('Former hero owner'));
 Object.assign(g,{quality:'red',enhancement:200,forge:0,imbuementConfirmed:{200:true}});
 assert.deepEqual(requirements(p,'hosting'),[]);
 const result=calculate(p,'hosting');assert.equal(result.team,null);assert.deepEqual(result.blockingValidation,[]);
 assert.ok(result.modelGaps.some(g=>g.kind==='reference-gap'&&g.reasons.some(r=>r.includes('replaces or adds'))));
});
test('Gear renders all Level and Mastery options independently and uses class labels',async t=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});t.after(()=>vite.close());
 const {App}=await vite.ssrLoadModule('/src/main.jsx');const p=fixture();
 Object.assign(p.gear[0],{quality:'red',enhancement:'150',forge:'0',name:'Long Fei helmet'});
 const html=renderToStaticMarkup(React.createElement(App,{initialProfile:p,initialTab:'Gear'}));
 assert.equal((html.match(/class="gear-compact-row gear-quality-/g)||[]).length,12);
 assert.ok(html.includes('Infantry helmet Type'));assert.ok(!html.includes('Long Fei helmet Type'));
 assert.match(html,/value="200">\+100<\/option>/);assert.ok(!html.includes('requires Mastery'));
 assert.ok(html.includes('value="0" selected="">0</option>'));
});
