import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {demoProfile,emptyProfile} from '../src/profile.mjs';
import {readFile} from 'node:fs/promises';

test('obsolete tab-bar design has no renderer or stylesheet rules',async()=>{
  const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
  const styles=await readFile(new URL('../src/styles.css',import.meta.url),'utf8');
  assert.ok(!source.includes('className="tabs"'));
  assert.doesNotMatch(styles,/\.tabs\b/);
  assert.equal((source.match(/<nav className=/g)||[]).length,1);
});

test('five-step setup ends on Results with normal editing navigation', async t => {
  const vite=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
  t.after(()=>vite.close());
  const {App}=await vite.ssrLoadModule('/src/main.jsx');
  const setup=renderToStaticMarkup(React.createElement(App));
  assert.match(setup,/Step 1 of 5: Heroes/);
  assert.ok(setup.includes('role="tablist"'));
  assert.ok(setup.includes('class="setup-progress"'));
  assert.ok(setup.includes('class="setup-actions"'));
  assert.ok(setup.includes('Continue'));
  assert.ok(!setup.includes('Load profile'));
  assert.ok(!setup.includes('Download profile'));
  const panels={Home:'Hosting march',Heroes:'Heros',Gear:'Infantry helmet Type',Masters:'Valora talent',Pets:'Gray Wolf Infantry Lethality (%)',Troops:'Maximum march size'};
  for(const [name,content] of Object.entries(panels)){
    const html=renderToStaticMarkup(React.createElement(App,{initialProfile:emptyProfile(),initialTab:name}));
    assert.match(html,new RegExp(`aria-selected="true"[^>]*>${name==='Home'?'Results':name}<`));
    assert.ok(html.includes(content),`${name} should show ${content}`);
    assert.ok(html.includes('role="tabpanel"'));
    assert.ok(html.includes('>Results</button>'));
    assert.ok(!html.includes('class="setup-progress"'));
    assert.ok(!html.includes('class="setup-actions"'));
    assert.ok(html.includes('class="setup-progress completed-navigation"'));
    assert.ok(!html.includes('class="tabs"'));
    assert.ok(html.indexOf('>Heroes</button>')<html.indexOf('>Results</button>'));
    assert.ok(!html.includes('>Back</button>'));
    assert.ok(!html.includes('>Continue</button>'));
    assert.ok(!html.includes('Step 6 of 6: Results')); assert.ok(!html.includes('Your Bear plan'));
    assert.equal((html.match(/role="tab"/g)||[]).length,6);
    assert.ok(!/role="tab"[^>]*disabled/.test(html));
    assert.ok(!html.includes('>Stats</button>'));
  }
  const snapshot=JSON.parse(await readFile(new URL('../audits/incoming-hosting-2026-10-06/replay.json',import.meta.url),'utf8')).profileSnapshot;
  const populated=renderToStaticMarkup(React.createElement(App,{initialProfile:snapshot}));
  for(const name of ['Join 1','Join 2','Join 3','Chenko','Amane','Vivian'])assert.ok(populated.includes(name));
  assert.ok(!populated.includes('Troop readiness'));
});

test('fresh setup retains the catalogue picker and Results renders no assumed teams',async t=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});t.after(()=>vite.close());
 const {App}=await vite.ssrLoadModule('/src/main.jsx');
 const heroes=renderToStaticMarkup(React.createElement(App,{initialProfile:emptyProfile(),initialTab:'Heroes'}));
 assert.ok(heroes.includes('hero-picker-trigger'));assert.ok(!heroes.includes('hero-compact-row rarity-'));
 const results=renderToStaticMarkup(React.createElement(App,{initialProfile:emptyProfile(),initialTab:'Home'}));
 assert.ok(!results.includes('class="home-hero"'));assert.ok(!results.includes('class="home-join"'));assert.ok(!results.includes('class="home-squad-member"'));
});
