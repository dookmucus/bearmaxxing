import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {t,englishMessage,localizeText,formatNumber,formatPercent,setLanguage,resolveLanguage,entityName,LANGUAGE_STORAGE_KEY} from '../src/i18n.mjs';
import {languages} from '../src/locales/registry.mjs';
import {joiningLeaderCopy,joiningHeroCopy} from '../src/results-copy.mjs';
import {enteredRosterProfile} from './helpers/entered-roster.mjs';
import {inventoryBalance} from '../src/inventory-planning.mjs';
import {inventoryBalanceCopy} from '../src/inventory-balance-copy.mjs';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),values};};
test('English catalog, named placeholders, plural forms and safe fallback',()=>{
 assert.equal(t('results.rallyCapacity',{capacity:400000}),'Rally capacity contribution: +400,000');
 assert.equal(t('results.upgrade.heroStars',{hero:'Yang',current:'3.3',target:'3.4'}),'Yang: Stars 3.3 → 3.4');
 assert.equal(t('results.training.title',{count:1}),'Train troops for 1 full march');assert.equal(t('results.training.title',{count:4}),'Train troops for 4 full marches');
 const previousDe=languages.de;languages.de={name:'Temporary test',messages:{'results.upgrade.heroWidget':'Widget {current} → {target}: {hero}','results.rallyCapacity':'Incomplete translation'}};
 try{assert.equal(t('results.upgrade.heroWidget',{hero:'Petra',current:3,target:4},'de'),'Widget 3 → 4: Petra');assert.equal(t('results.rallyCapacity',{capacity:400000},'de'),'Rally capacity contribution: +400.000');assert.equal(t('navigation.home',{},'de'),'Results');assert.equal(t('missing.key',{},'de'),'missing.key');}finally{languages.de=previousDe;}
});
test('browser matching, explicit preference, blocked storage, document language and persistence',()=>{
 const previousFr=languages.fr;languages.fr={name:'Temporary test',messages:{}};const saved=storage(),doc={documentElement:{lang:'en'}};
 try{assert.equal(resolveLanguage({storage:saved,browserLanguages:['fr-CA','en-US']}),'fr');setLanguage('en',{storage:saved,document:doc});assert.equal(saved.getItem(LANGUAGE_STORAGE_KEY),'en');assert.equal(resolveLanguage({storage:saved,browserLanguages:['fr']}),'en');assert.equal(doc.documentElement.lang,'en');assert.equal(resolveLanguage({storage:{getItem(){throw Error('blocked');}},browserLanguages:['zz']}),'en');assert.doesNotThrow(()=>setLanguage('en',{storage:{setItem(){throw Error('blocked');}},document:doc}));}finally{languages.fr=previousFr;setLanguage('en',{persist:false});}
});
test('localized numbers and percentages never alter numeric input or star notation',()=>{
 const input={capacity:13470,percentage:7.5,starStep:22};const before=structuredClone(input);assert.equal(formatNumber(input.capacity,{},'de'),'13.470');assert.equal(formatPercent(input.percentage,{},'de'),'7,5 %');const previousDe=languages.de;languages.de={name:'Temporary test',messages:{}};
 try{assert.equal(t('results.upgrade.heroStars',{hero:'Yang',current:'3.3',target:'3.4'},'de'),'Yang: Stars 3.3 → 3.4');assert.deepEqual(input,before);}finally{languages.de=previousDe;}
});
test('canonical entity names are display-only and generated English messages translate at render',()=>{
 const previousDe=languages.de;languages.de={name:'Temporary test',messages:{'entities.heroes.roster-petra':'Petra test display','results.upgrade.widgetSharedAttack':'Shared Attack {sharedAttack}; widget Lethality {delta}.','messages.setup.state.essentialSetupError.choose.a.troop.ratio.totaling.100':'Ratio test: 100%.'}};
 try{setLanguage('de',{persist:false});assert.equal(entityName('heroes','roster-petra','Petra'),'Petra test display');assert.equal(entityName('heroes','unknown','Entered name'),'Entered name');assert.equal(t('results.upgrade.widgetSharedAttack',{delta:7,sharedAttack:2.5}),'Shared Attack 2,5; widget Lethality 7.');assert.equal(localizeText('Choose a troop ratio totaling 100%.'),'Ratio test: 100%.');assert.equal(englishMessage('results.rallyCapacity',{capacity:400000}),'Rally capacity contribution: +400000');}finally{languages.de=previousDe;setLanguage('en',{persist:false});}
});
test('bundled language registration and every static translation reference resolves',()=>{
 assert.deepEqual(Object.keys(languages),['en','es','fr','de','tr','ko','zh-Hans','zh-Hant']);for(const file of fs.readdirSync(new URL('../src/',import.meta.url)).filter(file=>/\.(mjs|jsx)$/.test(file))){const source=fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8');for(const match of source.matchAll(/\b(?:tr|englishMessage)\(['"]([^'"]+)['"]/g))assert.ok(Object.hasOwn(languages.en.messages,match[1]),`${file}: ${match[1]}`);}
});

test('star progression remains unambiguous in tooltips and nested engine copy translates',()=>{
 const previousDe=languages.de;languages.de={name:'Temporary test',messages:{'messages.pet.refinement.quality.refinementQuality.refinement':'Quality test {label}. {detail}','messages.pet.refinement.quality.refinementQuality.next.quality.at':'Next test: {label} at {min}%.','import.errors.notFound':'Player test not found.'}};
 try{
  assert.match(t('player.guidance.heroFieldGuidance.next.percentage.points.of.attack',{starProgression:'3.3',current2:17.42,bonus:'Archer'},'de'),/3\.3/);
  assert.match(t('hero.tooltips.effectStatusInfo.the.app.has.no.verified.value.for.at',{name:'Attack',hero:'Yang',progression:'3.3',bonus:'Excluded.'},'de'),/3\.3/);
  assert.equal(localizeText('Common refinement. Next quality: Uncommon at 5%.','de'),'Quality test Common. Next test: Uncommon at 5 %.');
  assert.equal(localizeText('No player was found for that ID.','de'),'Player test not found.');
 }finally{languages.de=previousDe;}
});

test('inventory balance labels, limits, ties, conditional priorities and empty states translate in all eight languages',()=>{
 const profile=(i,c,a)=>({troops:{infantry:{count:i},cavalry:{count:c},archer:{count:a}}});
 const states=[[100,150,1600],[150,100,1600],[150,200,800],[120,120,1000],[120,130,960],[130,120,960],[120,120,960],[0,0,0],[0,100,0],[null,100,800]];
 try{
  for(const code of Object.keys(languages)){
   setLanguage(code,{persist:false});
   for(const key of Object.keys(languages.en.messages).filter(key=>key.startsWith('troops.balance.'))){
    assert.ok(Object.hasOwn(languages[code].messages,key),`${code}: ${key}`);
    if(code!=='en')assert.notEqual(languages[code].messages[key],languages.en.messages[key],`${code}: ${key}`);
   }
   assert.ok(!Object.keys(languages[code].messages).some(key=>key.startsWith('troops.inventory.')));
   for(const counts of states){
    const balance=inventoryBalance(profile(...counts)),copy=inventoryBalanceCopy(balance);
    assert.equal(copy.title,t('troops.balance.title'));
    assert.equal(copy.tooltip,t('troops.balance.help'));
    for(const text of [copy.title,copy.tooltip,copy.description,copy.surplus,copy.priority].filter(Boolean)){
     assert.ok(!text.includes('troops.balance.'));assert.ok(!/\{[^}]+\}/.test(text));
     if(code!=='en')assert.ok(!/Inventory balance|Prioritize|if you need|Based on your troop inventory|Extra troops can remain unused/.test(text),`${code}: ${text}`);
    }
    if(!balance.known||balance.empty){assert.equal(copy.priority,null);assert.equal(copy.surplus,null);}
    else {
     assert.ok(copy.priority);
     if(balance.limiting.length===2)for(const type of balance.limiting)assert.ok(copy.description.includes(t(type==='archer'?'troops.archers':`troops.${type}`)));
     for(const type of balance.surplus)assert.ok(copy.surplus.includes(t(type==='archer'?'troops.archers':`troops.${type}`)));
    }
   }
  }
  setLanguage('en',{persist:false});
  const copy=inventoryBalanceCopy(inventoryBalance(profile(150,200,800)));
  assert.equal(copy.description,'Archers limit your available 10/10/80 allocation.');
  assert.equal(copy.priority,'Prioritize Archers if you need more troops for simultaneous marches.');
  assert.equal(copy.tooltip,'Based on your troop inventory. Actual deployment depends on march capacity and available rally space.');
 }finally{setLanguage('en',{persist:false});}
});

test('recent joining copy stays concise and localized in all eight languages',()=>{
 const leader=enteredRosterProfile().heroes.find(h=>h.name==='Chenko');
 try{
  for(const code of Object.keys(languages)){
   setLanguage(code,{persist:false});
   const copy=joiningLeaderCopy(leader),filler=joiningHeroCopy({name:'Gordon',level:80},1,['Saul','Helga','Amadeus']);
   assert.ok(copy.summary.includes('25'));assert.ok(copy.summary.includes(t('stats.lethality')));
   assert.ok(!copy.summary.includes(t('stats.rallyLethality')));
   assert.ok(!copy.detail.includes(t('results.copy.joiningLeaderCopy.assumed.from.stars')));
   assert.ok(!languages[code].messages['results.join.skillDetail'].includes('{assumption}'));
   assert.equal(languages[code].messages['results.join.offer'],'{effects}');
   assert.ok(filler.summary.includes(formatNumber(13470,{useGrouping:true},code)));
   for(const name of ['Saul','Helga','Amadeus'])assert.ok(filler.detail.includes(name));
   assert.ok(!filler.detail.includes('13470'));assert.ok(!filler.detail.includes(formatNumber(13470,{},code)));
   if(code!=='en'){
    assert.notEqual(filler.summary,'Adds 13,470 troops.');
    assert.notEqual(filler.detail,'Can be substituted with Saul, Helga, or Amadeus.');
    assert.notEqual(t('results.join.suggested'),'Suggested');
    assert.notEqual(t('pets.activeAdvancementHelp'),languages.en.messages['pets.activeAdvancementHelp']);
   }
  }
 }finally{setLanguage('en',{persist:false});}
});

const placeholders=text=>[...text.matchAll(/\{([a-zA-Z][\w]*)\}/g)].map(match=>match[1]).sort();
test('all bundled catalogs have identical keys, plural forms, placeholders and numeric literals',()=>{
 const english=languages.en.messages;
 for(const [locale,{messages}] of Object.entries(languages)){
  assert.deepEqual(Object.keys(messages).sort(),Object.keys(english).sort(),locale);
  for(const [key,value] of Object.entries(english)){
   const source=typeof value==='string'?{text:value}:value;
   const translated=typeof messages[key]==='string'?{text:messages[key]}:messages[key];
   assert.deepEqual(Object.keys(translated).sort(),Object.keys(source).sort(),`${locale}: ${key} plural forms`);
   for(const [form,text] of Object.entries(source)){
    const target=translated[form];assert.equal(typeof target,'string');assert.ok(target.length,`${locale}: ${key}`);
    assert.deepEqual(placeholders(target),placeholders(text),`${locale}: ${key} ${form}`);
    const numbers=s=>s.replace(/\{[^}]+\}/g,'').match(/\d+(?:\.\d+)?/g)??[];
    assert.deepEqual(numbers(target).sort(),numbers(text).sort(),`${locale}: ${key} numeric literals`);
   }
   if(/^entities\.(heroes|pets|masters|skills)\./.test(key))assert.deepEqual(messages[key],value,`${locale}: preserved proper name ${key}`);
  }
 }
});
test('regional browser languages resolve to registered languages and correct Chinese scripts',()=>{
 for(const [requested,expected] of [['es-MX','es'],['fr-CA','fr'],['de-AT','de'],['tr-TR','tr'],['ko-KR','ko'],['zh-CN','zh-Hans'],['zh-SG','zh-Hans'],['zh-TW','zh-Hant'],['zh-HK','zh-Hant'],['zh-MO','zh-Hant'],['zh-Hant-CN','zh-Hant'],['zh-Hans-TW','zh-Hans'],['zh_Hant_HK','zh-Hant']])assert.equal(resolveLanguage({browserLanguages:[requested]}),expected,requested);
 const saved=storage();saved.setItem(LANGUAGE_STORAGE_KEY,'zh-Hant');assert.equal(resolveLanguage({storage:saved,browserLanguages:['zh-CN']}),'zh-Hant');
});
test('translated Results use localized numbers while stars, raw English calculations and inputs stay unchanged',()=>{
 for(const code of Object.keys(languages)){
  setLanguage(code,{persist:false});
  assert.ok(t('results.upgrade.heroStars',{hero:'Yang',current:'3.3',target:'3.4'}).includes('3.3'));
  assert.ok(t('results.upgrade.heroStars',{hero:'Yang',current:'3.3',target:'3.4'}).includes('3.4'));
  const text=t('results.copy.hostingBonusCopy.adds.shared.attack',{sharedAttack:7.5});
  assert.ok(text.includes(formatPercent(7.5,{},code)),`${code}: ${text}`);
  assert.equal(entityName('heroes','roster-petra','Petra'),'Petra');
  assert.equal(englishMessage('results.rallyCapacity',{capacity:400000}),'Rally capacity contribution: +400000');
 }
 setLanguage('en',{persist:false});
});

test('plural class labels translate in pet fields and stay distinct from Cavalry',()=>{
 for(const code of Object.keys(languages)){
  const archers=t('main.PetRefinementControl.let',{troop:'Archers'},code);
  assert.ok(archers.includes(t('troops.archers',{},code)),`${code}: ${archers}`);
  assert.notEqual(t('main.PetRefinementControl.let',{troop:'Infantry'},code),t('main.PetRefinementControl.let',{troop:'Cavalry'},code));
 }
});
