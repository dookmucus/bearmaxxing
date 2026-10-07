import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emptyProfile,mergeApi} from '../src/profile.mjs';
import {migrateProfile,defaultHeroes} from '../src/data/roster.mjs';
import {heroCatalogueOptions,setProfileHeroPresence} from '../src/hero-roster-presence.mjs';
import {assembleJoiningSquads,optimizeMarchPlan} from '../src/joint-plan.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {roleCapacity,joiningRole} from '../src/hero-roles.mjs';
import {joiningHeroCopy} from '../src/results-copy.mjs';
import {essentialSetupError,restoreAppState,persistAppState} from '../src/setup-state.mjs';
import {setSharedMarchCapacity} from '../src/march-capacity-inputs.mjs';
import {includedHostCandidates} from '../src/host-comparison.mjs';
import {roleEligible} from '../src/hero-roles.mjs';

const snapshot=JSON.parse(fs.readFileSync(new URL('../audits/incoming-hosting-2026-10-06/replay.json',import.meta.url))).profileSnapshot;
const entered=name=>structuredClone(snapshot.heroes.find(h=>h.name===name));
function roster(names){const p=structuredClone(snapshot);p.heroes=names.map(entered);return p;}
const identities=assignment=>[...assignment.host,...assignment.joins.flatMap(row=>row.heroes)].filter(Boolean).map(h=>h.canonicalHeroId??h.id);

test('fresh and restored fresh profiles have no active or saved catalogue heroes or recommended teams',()=>{
 const p=emptyProfile();assert.deepEqual(p.heroes,[]);assert.deepEqual(migrateProfile(p).heroes,[]);
 const restored=restoreAppState({getItem:()=>null});assert.deepEqual(restored.profile.heroes,[]);
 const h=calculate(p,'hosting'),j=calculate(p,'joining');assert.ok(!h.team?.length);assert.equal(j.joint.canRecommend,false);
 assert.ok(j.plan.marches.every(row=>!row.heroes.some(Boolean)));
 assert.ok(heroCatalogueOptions(p).length>30);assert.ok(defaultHeroes().every(h=>h.owned===false));
});

test('catalogue add activates only the selected hero and removal remains an explicit exclusion',()=>{
 const p=emptyProfile(),option=heroCatalogueOptions(p).find(h=>h.name==='Yang');
 const added=setProfileHeroPresence(p,option.id,true);assert.equal(added.heroes.length,1);assert.equal(added.heroes[0].owned,true);assert.deepEqual(p.heroes,[]);
 const removed=setProfileHeroPresence(added,option.id,false);assert.equal(removed.heroes[0].marchAvailable,false);
 assert.equal(migrateProfile(removed).heroes.length,1);assert.equal(migrateProfile(removed).heroes[0].marchAvailable,false);
 assert.equal(heroCatalogueOptions(added).filter(h=>h.name==='Yang').length,1);
});

test('partial imports activate imported heroes only and do not add unreleased catalogue entries',()=>{
 const p=mergeApi(emptyProfile(),{player:{heroes:[{id:1,name:'Yang',level:70,stars:3,gear:[]}]}});
 assert.deepEqual(p.heroes.map(h=>h.name),['Yang']);assert.equal(p.heroes[0].owned,true);
 assert.equal(mergeApi(p,{player:{heroes:[]}}).heroes.length,1);
});

test('hidden unreleased heroes stay saved but never appear in selectors or simultaneous teams',()=>{
 const hidden=new Set(['Charles','Ava','Diego','Wee & Woo','Liz','Luna']);
 const p=roster(['Zoe','Petra','Yang','Chenko','Amane','Vivian']);
 const saved=defaultHeroes().filter(h=>hidden.has(h.name)).map(h=>({...h,owned:true,included:true,marchAvailable:true}));
 p.heroes.push(...saved);
 assert.equal(saved.length,6);
 assert.ok(heroCatalogueOptions(emptyProfile()).every(h=>!hidden.has(h.name)));
 assert.ok(heroCatalogueOptions(p).every(h=>!hidden.has(h.name)));
 assert.ok(saved.every(h=>!roleEligible(h)));
 assert.ok(includedHostCandidates(p).flat().every(h=>!hidden.has(h.name)));
 for(const h of saved)assert.equal(setProfileHeroPresence(p,h.id,true),p);
 const migrated=migrateProfile(p);
 assert.equal(migrated.heroes.filter(h=>hidden.has(h.name)).length,6);
 const result=optimizeMarchPlan(migrated,accountEffects(migrated));assert.ok(result.canRecommend);
 const assignment=result.selected.assignment;
 assert.ok([...assignment.host,...assignment.joins.flatMap(r=>r.heroes)].filter(Boolean).every(h=>!hidden.has(h.name)));
});

test('saved roster ownership, exclusions, entered progression and explicit skills survive migration and reload',()=>{
 const p=structuredClone(snapshot),count=p.heroes.length;
 p.heroes[0].marchAvailable=false;p.heroes[0].provenance.marchAvailable='user-confirmed';
 const m=migrateProfile(p);assert.equal(m.heroes.length,count);
 for(const h of p.heroes){const saved=m.heroes.find(x=>x.id===h.id);for(const key of ['owned','included','marchAvailable','level','starStep','widget'])assert.deepEqual(saved[key],h[key],h.name+': '+key);for(const [slot,value] of Object.entries(h.skillLevels??{}))assert.deepEqual(saved.skillLevels[slot],value,h.name+': explicit skill '+slot);}
 assert.deepEqual(migrateProfile(m),m);
 let stored=null;const storage={getItem:()=>stored,setItem:(_,value)=>{stored=value;}};
 assert.equal(persistAppState(storage,m,{step:4,completed:true}),true);assert.deepEqual(restoreAppState(storage).profile,m);
 const partial=roster(['Zoe','Petra','Rosa']);assert.deepEqual(migrateProfile(partial).heroes.map(h=>h.name),partial.heroes.map(h=>h.name));
});

test('joining fillers prefer entered available heroes and optional fillers have no ownership, damage or capacity contribution',()=>{
 const p=roster(['Zoe','Petra','Yang','Chenko','Amane','Vivian','Alcar']);
 const host=p.heroes.slice(0,3),leaders=p.heroes.slice(3,6).map(joiningRole);
 const assignment=assembleJoiningSquads(p,host,leaders,true);
 assert.ok(assignment.joins.flatMap(r=>r.heroes).some(h=>h?.name==='Alcar'&&!h.optionalFiller));
 const suggestions=assignment.joins.flatMap(r=>r.heroes).filter(h=>h?.optionalFiller);assert.ok(suggestions.length>0);
 for(const h of suggestions){assert.equal(h.owned,false);assert.equal(h.level,null);assert.equal(roleCapacity(h),null);assert.ok(joiningRole(h).rejection);const copy=joiningHeroCopy(h,1);assert.match(copy.summary,/Optional/);assert.match(copy.detail,/No damage or capacity bonus/);}
 assert.equal(assignment.fillerCapacity,null);assert.equal(new Set(identities(assignment)).size,identities(assignment).length);
 assert.deepEqual(p.heroes.map(h=>h.name),['Zoe','Petra','Yang','Chenko','Amane','Vivian','Alcar']);
});

test('optional suggestions never duplicate any host, leader or filler and respect explicit unavailability',()=>{
 const p=roster(['Zoe','Petra','Yang','Chenko','Amane','Vivian']);
 p.heroes.push({...defaultHeroes().find(h=>h.name==='Howard'),marchAvailable:false,included:false});
 const assignment=assembleJoiningSquads(p,p.heroes.slice(0,3),p.heroes.slice(3,6).map(joiningRole),true);
 assert.ok(!assignment.joins.flatMap(r=>r.heroes).some(h=>h?.name==='Howard'));
 assert.equal(new Set(identities(assignment)).size,identities(assignment).length);
 for(const row of assignment.joins){assert.equal(row.heroes[0].optionalFiller,undefined);assert.equal(new Set(row.heroes.filter(Boolean).map(h=>h.troop)).size,row.heroes.filter(Boolean).length);}
});

test('incomplete roster can recommend entered hosts and leaders with optional class completion, without requiring filler confirmation',()=>{
 const p=roster(['Zoe','Petra','Yang','Chenko','Amane','Vivian']);
 const result=optimizeMarchPlan(p,accountEffects(p));assert.ok(result.canRecommend);
 const assignment=result.selected.assignment;assert.equal(assignment.host.length,3);assert.equal(assignment.joins.length,3);
 assert.ok(assignment.host.every(h=>p.heroes.some(x=>x.id===h.id)));assert.ok(assignment.joins.every(row=>p.heroes.some(x=>x.id===row.heroes[0].id)));
 assert.equal(new Set(identities(assignment)).size,identities(assignment).length);
 const ready=setSharedMarchCapacity(p,100000);assert.equal(essentialSetupError(ready,4),null);
});

test('a supported host can be selected before enough joining leaders are entered; none are invented',()=>{
 const p=roster(['Zoe','Petra','Yang']);const result=optimizeMarchPlan(p,accountEffects(p));assert.ok(result.canRecommend);assert.equal(result.selected.host.team.length,3);assert.equal(result.selected.leaders.length,0);assert.deepEqual(result.selected.assignment.joins,[]);
});
