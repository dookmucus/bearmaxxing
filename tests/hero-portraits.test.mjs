import {test} from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {heroPortraitFile} from '../src/portrait-assets.mjs';
import {emptyProfile} from '../src/profile.mjs';
import {setCommonSkillLevel} from '../src/hero-skills-control.mjs';
import {heroContributions} from '../src/hero-effects.mjs';

test('Howard, Gordon, Forrest and Jaeger have distinct local portraits resolved by canonical identity',async()=>{
 const names=['Howard','Gordon','Forrest','Jaeger'],files=names.map(heroPortraitFile);
 assert.equal(new Set(files).size,4);
 for(const [index,name] of names.entries()){
  assert.ok(files[index]);await access(new URL(`../public/figma-heroes/${files[index]}`,import.meta.url));
  assert.equal(heroPortraitFile({canonicalHeroId:`roster-${name.toLowerCase()}`,name:'Renamed hero'}),files[index]);
 }
 assert.equal(heroPortraitFile('Howard'),'howard.png');assert.equal(heroPortraitFile('Gordon'),'gordon.png');
});
test('Heroes renders corrected portraits and Helga selected skills at an unmapped lower-star unlock',async t=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});t.after(()=>vite.close());
 const {App}=await vite.ssrLoadModule('/src/main.jsx');const p=emptyProfile();
 for(const h of p.heroes)if(['Howard','Gordon','Forrest','Jaeger'].includes(h.name)){h.owned=true;h.included=true;}
 const helga=p.heroes.find(h=>h.name==='Helga');
 const chosen=setCommonSkillLevel({...helga,starStep:7,starStepSource:'user-confirmed'},3);
 p.heroes=p.heroes.map(h=>h.id===helga.id?chosen:h);
 assert.equal(heroContributions(chosen).offenseCoverageComplete,false);
 const html=renderToStaticMarkup(React.createElement(App,{initialProfile:p,initialTab:'Heroes'}));
 for(const name of ['Howard','Gordon','Forrest','Jaeger'])assert.ok(html.includes(`/figma-heroes/${heroPortraitFile(name)}`));
 const skills=html.match(/<select[^>]*aria-label="Helga Skills"[^>]*>(.*?)<\/select>/)?.[1];
 assert.ok(skills);assert.ok(skills.includes('value="3" selected="">3</option>'));
});
