import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {WELCOME_DISMISSAL_KEY,welcomeDismissed,saveWelcomeDismissal} from '../src/welcome-preference.mjs';
import {languages} from '../src/locales/registry.mjs';

test('welcome dismissal is separate from profiles and saved only on checked close',()=>{
 const values=new Map([['bearmaxxing:setup:v1','preserved profile']]);
 const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 assert.equal(welcomeDismissed(storage),false);
 assert.equal(saveWelcomeDismissal(false,storage),false);
 assert.equal(values.has(WELCOME_DISMISSAL_KEY),false);
 assert.equal(welcomeDismissed(storage),false,'unchecked close reopens on reload');
 assert.equal(saveWelcomeDismissal(true,storage),true);
 assert.equal(welcomeDismissed(storage),true,'checked close stays dismissed on reload');
 assert.equal(values.get('bearmaxxing:setup:v1'),'preserved profile');
 values.delete(WELCOME_DISMISSAL_KEY);
 assert.equal(welcomeDismissed(storage),false,'clearing site data resets dismissal');
 for(const value of ['false','1','null','']){values.set(WELCOME_DISMISSAL_KEY,value);assert.equal(welcomeDismissed(storage),false);}
});

test('unavailable or denied browser storage does not break welcome dismissal',()=>{
 const denied={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
 for(const storage of [null,denied]){
  assert.equal(welcomeDismissed(storage),false);
  assert.equal(saveWelcomeDismissal(false,storage),false);
  assert.equal(saveWelcomeDismissal(true,storage),false);
 }
});

test('welcome content is complete in every language with unchanged source names and links',async t=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 t.after(()=>vite.close());
 const {WelcomeModal}=await vite.ssrLoadModule('/src/welcome-modal.jsx');
 const {setLanguage}=await vite.ssrLoadModule('/src/i18n.mjs');
 const keys=Object.keys(languages.en.messages).filter(key=>key.startsWith('welcome.'));
 assert.equal(keys.length,11);
 for(const [locale,{messages}] of Object.entries(languages)){
  setLanguage(locale,{persist:false});
  const html=renderToStaticMarkup(React.createElement(WelcomeModal,{initiallyOpen:true}));
  assert.ok(html.includes(messages['welcome.title']),locale+' title');
  for(const key of keys){
   assert.equal(typeof messages[key],'string',locale+' '+key);
   if(locale!=='en'&&!['welcome.sources.separator','welcome.sources.lastSeparator'].includes(key))assert.notEqual(messages[key],languages.en.messages[key],locale+' '+key+' must not fall back to English');
  }
  for(const name of ['Kingshot Wiki','Kingshot Optimizer','Frakinator','[RED]/[evl]Remu'])assert.ok(html.includes(name));
  for(const url of ['https://kingshotwiki.com/','https://kingshotoptimizer.com/','https://frakinator.streamlit.app/'])assert.ok(html.includes(`href="${url}" target="_blank" rel="noopener noreferrer"`));
  assert.ok(!html.includes('checked=""'),'checkbox defaults unchecked');
  assert.ok(html.includes('aria-labelledby='));
 }
 setLanguage('en',{persist:false});
 assert.equal(languages.en.messages['welcome.title'],'Welcome to BearMaxxing · v1.2');
 assert.equal(languages.en.messages['welcome.introduction'],'Find your strongest Bear Hunt teams and the next upgrades worth working on. Enter your progression to compare hosting heroes, joining squads, gear, and upgrade priorities.');
 assert.equal(languages.en.messages['welcome.estimates'],'Recommendations are estimates, not guaranteed scores. Skill timing, overlapping bonuses, and other rally participants can affect actual damage.');
 assert.equal(languages.en.messages['welcome.privacy'],'Your calculator entries are saved only in your browser, not collected or stored by BearMaxxing. Your Kingshot ID can import some values; you enter the rest. Clearing this site’s browser data deletes your entries, and switching browsers means starting over.');
 assert.equal(languages.en.messages['welcome.sources.prefix'],'Sources and community resources: ');
 assert.equal(languages.en.messages['welcome.sources.suffix'],'. BearMaxxing is an unofficial community calculator.');
 assert.equal(languages.en.messages['welcome.contact'],'Found an incorrect value or recommendation? Please inform');
 assert.equal(languages.en.messages['welcome.dismiss'],'Don’t show this again');
 assert.equal(languages.en.messages['welcome.close'],'Close');
});
