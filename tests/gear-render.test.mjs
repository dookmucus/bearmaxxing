import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {emptyProfile} from '../src/profile.mjs';

test('compact Gear editor renders the twelve pieces and omits manual percentages',async t=>{
  const vite=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
  t.after(()=>vite.close());
  const {App}=await vite.ssrLoadModule('/src/main.jsx');
  const p=emptyProfile();
  Object.assign(p.gear[0],{quality:'purple',enhancement:20,forge:0});
  Object.assign(p.gear[1],{quality:'none'});
  Object.assign(p.gear[2],{quality:'red',enhancement:100,forge:10});
  const html=renderToStaticMarkup(React.createElement(App,{initialTab:'Gear',initialProfile:p}));
  assert.equal((html.match(/class="gear-compact-row gear-quality-/g)??[]).length,12);
  assert.ok(html.includes('/figma-gear/infantry-helmet-purple.png'));
  assert.ok(html.includes('/figma-gear/archer-boots.png'));
  assert.ok(html.includes('About Infantry helmet Level'));
  assert.ok(!html.includes('About Infantry armor Mastery'));assert.ok(html.includes('Infantry armor Mastery'));
  assert.ok(html.includes('gear-quality-purple'));
  assert.ok(html.includes('gear-quality-none'));
  assert.ok(html.includes('gear-quality-red'));
  assert.ok(html.includes('>+0</option>'));
  assert.ok(!html.includes('imbuement Attack (%)'));
  assert.ok(!html.includes('displayed Lethality (%)'));
});
