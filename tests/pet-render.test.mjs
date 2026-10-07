import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {setPetLevel,petMilestones} from '../src/pet-inputs.mjs';

const retained=['Alpha Black Panther','Giant Rhino','Mighty Bison','Great Moose'];
test('Pets shows four Stats inputs and four compact progression rows without manual advancement controls',async t=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});t.after(()=>vite.close());
 const {App}=await vite.ssrLoadModule('/src/main.jsx');
 const p=emptyProfile();p.pets.push({id:'saved-utility',name:'Unmapped utility pet',level:8,notes:'saved'});
 const render=()=>renderToStaticMarkup(React.createElement(App,{initialTab:'Pets',initialProfile:p}));
 let html=render();
 for(const label of ['Squads’ Attack (%)','Infantry Lethality (%)','Cavalry Lethality (%)','Archer Lethality (%)'])assert.ok(html.includes(`aria-label="${label}"`),label);
 assert.equal((html.match(/type="number"/g)??[]).length,4);
 for(const name of retained)assert.ok(html.includes(`aria-label="Show ${name} name"`),name);
 for(const name of ['Gray Wolf','Lynx','Lion','Grizzly Bear','Ironclad War Bear','Unmapped utility pet'])assert.ok(!html.includes(`aria-label="Show ${name} name"`),name);
 assert.equal((html.match(/class="pet-advancement-cell"/g)??[]).length,4);
 assert.ok(!html.includes('type="checkbox"'));
 assert.ok(!html.includes('pet-refinement-control'));
 for(const label of ['Use entered refinements','Refinement entry','Wild Charge active for this hunt','Use pet buffs for this hunt'])assert.ok(!html.includes(label),label);
 for(const name of retained){
  const pet=p.pets.find(p=>p.name===name),level=petMilestones(name).at(-1);
  p.pets=p.pets.map(p=>p===pet?setPetLevel(p,level):p);
 }
 html=render();assert.ok(!html.includes('type="checkbox"'));
 assert.ok(!/type="checkbox"[^>]*checked/.test(html));
 p.pets=p.pets.map(p=>retained.includes(p.name)?{...p,advancementConfirmed:true,advancementByLevel:{[p.level]:true}}:p);
 p.pets=migrateProfile(JSON.parse(JSON.stringify(p))).pets;
 html=render();assert.ok(!html.includes('type="checkbox"'));
 p.pets=p.pets.map(p=>retained.includes(p.name)?setPetLevel(p,11):p);
 html=render();assert.ok(!html.includes('type="checkbox"'));
 p.pets=p.pets.map(p=>retained.includes(p.name)?setPetLevel(p,0):p);
 assert.ok(!render().includes('type="checkbox"'));
 const {setLanguage,t:translate}=await vite.ssrLoadModule('/src/i18n.mjs');
 try{
  for(const language of ['en','es','fr','de','tr','ko','zh-Hans','zh-Hant']){
   setLanguage(language,{persist:false});html=render();
   for(const stat of ['attack','infantry','cavalry','archer'])assert.ok(html.includes(translate(`pets.combined.${stat}`)),`${language}: ${stat}`);
   assert.ok(!html.includes('pets.combinedHelp'));assert.equal((html.match(/type="number"/g)??[]).length,4);
  }
 }finally{setLanguage('en',{persist:false});}
});
