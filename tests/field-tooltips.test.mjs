import {test} from 'node:test';import assert from 'node:assert/strict';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createServer} from 'vite';
import {emptyProfile} from '../src/profile.mjs';
test('non-damage fields retain inputs but omit info actions; offensive and unknown fields retain explanations',async t=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});t.after(()=>vite.close());
 const {App}=await vite.ssrLoadModule('/src/main.jsx');
 const p=emptyProfile();for(const gear of p.gear){gear.quality='gold';gear.enhancement=70;gear.forge=11;}
 p.gear.find(g=>g.id==='set-archer-gloves').quality='red';p.gear.find(g=>g.id==='set-archer-gloves').enhancement=160;
 p.masters.find(m=>m.name==='Cassia').skillLevels={2:1,3:1};
 const before=structuredClone(p);
 const render=tab=>renderToStaticMarkup(React.createElement(App,{initialTab:tab,initialProfile:p}));
 const heroes=render('Heroes');assert.ok(heroes.includes('aria-label="Helga Level"'));assert.ok(!heroes.includes('aria-label="About Helga Level"'));assert.ok(heroes.includes('aria-label="About Helga Stars"'));
 assert.ok(!heroes.includes('Assumed no exclusive widget equipped'));
 for(const h of p.heroes.filter(h=>Number(h.widget)===0))assert.ok(!heroes.includes(`aria-label="About ${h.name} Widget"`));
 const gear=render('Gear');
 for(const label of ['Infantry gloves Mastery','Infantry armor Level','Archer gloves Mastery']){assert.ok(gear.includes(`aria-label="${label}"`));assert.ok(!gear.includes(`aria-label="About ${label}"`));}
 for(const label of ['Infantry helmet Mastery','Infantry boots Level','Archer gloves Level'])assert.ok(gear.includes(`aria-label="About ${label}"`));
 const masters=render('Masters');
 for(const label of ['Valora Level','Valora talent: Hunter Instinct','Valora Skill 1','Valora Skill 4','Cassia Skill 4']){assert.ok(masters.includes(`aria-label="${label}"`));assert.ok(!masters.includes(`aria-label="About ${label}"`));}
 for(const label of ['Cassia Skill 2','Cassia Skill 3'])assert.ok(masters.includes(`aria-label="About ${label}"`));
 const redGloves=p.gear.find(g=>g.id==='set-archer-gloves');
 redGloves.enhancement=100;assert.ok(!render('Gear').includes('aria-label="About Archer gloves Level"'));redGloves.enhancement=160;
 assert.ok(!render('Troops').includes('aria-label="About maximum march size"'));
 assert.deepEqual(p,before);
});
