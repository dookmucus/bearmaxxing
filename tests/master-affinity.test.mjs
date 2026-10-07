import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {evaluateHostTrio} from '../src/host-comparison.mjs';
import {masterEffects,masterInputDetails,masterAffinityInfo,masterRequiresSquadInput} from '../src/master-effects.mjs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';

const master=(p,name)=>p.masters.find(m=>m.name===name);
// Isolate Master effects from the separately tested owned-hero talent.
function isolated(){const p=emptyProfile();p.pets=[];for(const m of p.masters){m.affinityLevel=0;}return p;}

test('Isnor and Aena use entered decimals independently of Level and never add reference bonuses',()=>{
 for(const [name,kind] of [['Isnor','lethality'],['Aena','attack']]){
  const m=master(isolated(),name);
  Object.assign(m,{squadBonus:'14.40',attack:99,lethality:99,talentLevel:11,skillLevels:{1:10,2:10,3:10,4:10}});
  for(const level of [0,1,25,26,100,null]){
   m.affinityLevel=level;
   const effect=masterEffects(m),details=masterInputDetails(m);
   assert.equal(effect[kind],14.4);
   assert.equal(effect[kind==='attack'?'lethality':'attack'],0);
   assert.equal(effect.deploy,0);assert.equal(effect.rally,0);assert.equal(effect.personalPoints,0);
   assert.equal(details.affinityValue,14.4);assert.equal(details.affinityKind,kind);
   assert.match(masterAffinityInfo(m),/14.40%.*entered squad bonus/);
   assert.deepEqual(details.skills,[]);
  }
  delete m.squadBonus;assert.equal(masterEffects(m)[kind],0);
  for(const value of [null,'invalid','-1']){m.squadBonus=value;assert.equal(masterInputDetails(m).affinityValue,null);assert.equal(masterEffects(m)[kind],0);}
 }
});
test('new masters enter the saved roster once and preserve IDs, levels, and saved development',()=>{
 const p=isolated();p.masters=p.masters.filter(m=>!masterRequiresSquadInput(m.name));
 p.masters.push({id:'saved-isnor',name:'Isnor',affinityLevel:25,squadBonus:'4.580',talentLevel:7,skillLevels:{2:6},specialResearchProgress:40});
 p.masters.push({id:'saved-aena',name:'Aena',level:26,squadBonus:'14.40',attack:99,skillLevels:{4:3},notes:'Saved notes'});
 const first=migrateProfile(p),second=migrateProfile(JSON.parse(JSON.stringify(first)));
 for(const saved of [first,second]){
  assert.equal(saved.masters.filter(m=>m.name==='Isnor').length,1);
  assert.equal(saved.masters.filter(m=>m.name==='Aena').length,1);
  const isnor=master(saved,'Isnor'),aena=master(saved,'Aena');
  assert.equal(isnor.id,'saved-isnor');assert.equal(isnor.affinityLevel,25);
  assert.equal(isnor.squadBonus,'4.580');assert.equal(isnor.talentLevel,7);
  assert.equal(isnor.skillLevels[2],6);assert.equal(isnor.specialResearchProgress,40);
  assert.equal(aena.id,'saved-aena');assert.equal(aena.affinityLevel,26);
  assert.equal(aena.level,26);assert.equal(aena.attack,99);assert.equal(aena.skillLevels[4],3);assert.equal(aena.notes,'Saved notes');
  assert.equal(masterEffects(isnor).lethality,4.58);assert.equal(masterEffects(aena).attack,14.4);assert.equal(aena.squadBonus,'14.40');
 }
});
test('recommendations use entered percentages and react to changes without adding affinity',()=>{
 const p=isolated();p.hostEnabled=true;
 for(const t of ['infantry','cavalry','archer'])p.stats[t]={attack:0,lethality:0};
 const initial=calculate(p,'hosting');assert.ok(initial.team?.length===3);
 const heroes=initial.team.map(entry=>entry.hero);
 const before=evaluateHostTrio(p,heroes,accountEffects(p));
 Object.assign(master(p,'Isnor'),{affinityLevel:25,squadBonus:'4.58'});Object.assign(master(p,'Aena'),{affinityLevel:26,squadBonus:'4.65'});
 const after=evaluateHostTrio(p,heroes,accountEffects(p));
 for(let i=0;i<3;i++){
  assert.ok(Math.abs(after.team[i].lethality-before.team[i].lethality-4.58)<1e-9);
  assert.ok(Math.abs(after.team[i].attack-before.team[i].attack-4.65)<1e-9);
 }
 const recommended=calculate(p,'hosting');assert.ok(recommended.team?.length===3);
 assert.equal(recommended.shared.attack,4.65);assert.equal(recommended.shared.lethality,4.58);
 master(p,'Isnor').affinityLevel=26;
 assert.equal(calculate(p,'hosting').shared.lethality,4.58);
 master(p,'Isnor').squadBonus='14.40';
 assert.equal(calculate(p,'hosting').shared.lethality,14.4);
});
test('all eight Masters have progression controls; Isnor and Aena have editable squad percentages and empty skills',async t=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});t.after(()=>vite.close());
 const {App}=await vite.ssrLoadModule('/src/main.jsx');
 const p=isolated();Object.assign(master(p,'Isnor'),{affinityLevel:25,squadBonus:'4.58'});Object.assign(master(p,'Aena'),{affinityLevel:26,squadBonus:'4.65'});
 const render=()=>renderToStaticMarkup(React.createElement(App,{initialProfile:p,initialTab:'Masters'}));
 let html=render();
 assert.equal((html.match(/class="master-compact-row"/g)??[]).length,8);
 for(const m of p.masters)assert.ok(html.includes(`aria-label="${m.name} Level"`),`${m.name} needs its Level control`);
 for(const [name,value] of [['Isnor','4.58'],['Aena','4.65']]){
  const row=html.match(new RegExp(`<article class="master-compact-row" aria-label="${name}">([\\s\\S]*?)</article>`))[1];
  assert.ok(row.includes(`value="${value}"`));
  assert.ok(!row.includes(`About ${name} Level`));
  assert.equal((row.match(/<select/g)??[]).length,1);
  assert.equal((row.match(/class="master-empty-cell"/g)??[]).length,4);
  assert.ok(row.includes(`<input`));assert.ok(row.includes(`aria-label="${name} Squad ${name==='Isnor'?'Lethality':'ATK'} (%)"`));assert.ok(!row.includes(`${name} Skill`));
 }
 master(p,'Isnor').squadBonus='14.40';html=render();
 const row=html.match(/<article class="master-compact-row" aria-label="Isnor">([\s\S]*?)<\/article>/)[1];
 assert.ok(row.includes('value="14.40"'));assert.ok(!row.includes('value="4.58"'));
});
