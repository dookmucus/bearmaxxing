import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {masterEffects,masterInputDetails,masterSkillInfo,masterSkillPresentation} from '../src/master-effects.mjs';

const relevant={Valora:[1,4],Cassia:[2,3,4]};
test('Masters hide verified irrelevant skills and their info icons while retaining original grid positions',async t=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 t.after(()=>vite.close());
 const {App}=await vite.ssrLoadModule('/src/main.jsx');
 const p=emptyProfile();
 for(const m of p.masters)for(const slot of [1,2,3,4])m.skillLevels[slot]=(relevant[m.name]??[]).includes(slot)?0:7;
 const html=renderToStaticMarkup(React.createElement(App,{initialTab:'Masters',initialProfile:p}));
 for(const master of p.masters){
  const row=html.match(new RegExp(`<article class="master-compact-row" aria-label="${master.name}">([\\s\\S]*?)</article>`))[1];
  for(const slot of [1,2,3,4]){
   const visible=(relevant[master.name]??[]).includes(slot);
   assert.equal(row.includes(`aria-label="${master.name} Skill ${slot}"`),visible,`${master.name} Skill ${slot}`);
   assert.equal(row.includes(`aria-label="About ${master.name} Skill ${slot}"`),false);
  }
  // Level + optional Talent + relevant skills; zero-level relevant skills remain editable.
  assert.equal((row.match(/<select/g)??[]).length,1+(relevant[master.name]?.length??0)+(relevant[master.name]?1:0));
  assert.ok(!row.includes('disabled=""'));
 }
 const valora=html.match(/<article class="master-compact-row" aria-label="Valora">([\s\S]*?)<\/article>/)[1];
 assert.ok(valora.indexOf('Valora Skill 1')<valora.indexOf('data-skill-slot="2"'));
 assert.ok(valora.indexOf('data-skill-slot="2"')<valora.indexOf('data-skill-slot="3"'));
 assert.ok(valora.indexOf('data-skill-slot="3"')<valora.indexOf('Valora Skill 4'));
 const cassia=html.match(/<article class="master-compact-row" aria-label="Cassia">([\s\S]*?)<\/article>/)[1];
 assert.ok(cassia.indexOf('data-skill-slot="1"')<cassia.indexOf('Cassia Skill 2'));
});
test('relevant skill tooltips explain unlock affinity even when the saved skill level is zero',()=>{
 const p=emptyProfile();
 for(const [name,slots] of Object.entries(relevant)){
  const m=p.masters.find(m=>m.name===name);
  for(const slot of slots){
   const skill=masterInputDetails(m).skills.find(s=>s.slot===slot);
   assert.equal(skill.presentation.relevance,'relevant');
   assert.equal(masterSkillInfo(m,skill),`${skill.name} unlocks at Affinity ${skill.presentation.unlockAffinity}.`);
   m.affinityLevel=100;
   assert.doesNotMatch(masterSkillInfo(m,skill),/Locked at the displayed affinity/);
   m.affinityLevel=1;
  }
 }
});
test('hidden values survive save migration and do not alter independently supported effects',()=>{
 const p=emptyProfile();
 const valora=p.masters.find(m=>m.name==='Valora');
 Object.assign(valora,{affinityLevel:40,skillLevels:{1:2,2:5,3:4,4:3}});
 const before=masterEffects(valora);
 const restored=migrateProfile(JSON.parse(JSON.stringify(p))).masters.find(m=>m.name==='Valora');
 assert.deepEqual(restored.skillLevels,valora.skillLevels);
 assert.deepEqual(masterEffects(restored),before);
 assert.equal(before.rally,60000);assert.equal(before.deploy,9000);
 for(const m of p.masters)for(const slot of [1,2,3,4])assert.ok(masterSkillPresentation(m.name,slot).source);
 assert.equal(masterSkillPresentation('Unmapped master',1).relevance,'unknown');
 assert.equal(masterSkillPresentation('Valora',99).relevance,'unknown');
});
