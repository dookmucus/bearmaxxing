import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile,mergeApi} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {commonSkillValue,setCommonSkillLevel,expeditionSlots} from '../src/hero-skills-control.mjs';
import {setHeroRosterPresence} from '../src/hero-roster-presence.mjs';
import {calculate} from '../src/calculator.mjs';

const find=(p,name)=>p.heroes.find(hero=>hero.name===name);
test('common skills use full-star assumptions and preserve unsupported intermediate caps',()=>{
  const hero=find(emptyProfile(),'Chenko');
  assert.equal(commonSkillValue(hero),'5');
  const lowered={...hero,starStep:13};
  const chosen=setCommonSkillLevel(lowered,5);
  assert.equal(chosen.skillLevels[1],3);
  assert.equal(chosen.skillLevelSource[1],'user-confirmed');
  assert.equal(commonSkillValue(chosen),'unmapped');
  const helga=find(emptyProfile(),'Helga');
  const original={...helga.skillLevels};
  assert.deepEqual(original,{1:5,2:5,3:5});
  assert.deepEqual(setCommonSkillLevel(helga,5).skillLevels,original);
  assert.ok(expeditionSlots('Helga').length>0);
  const custom={...hero,skillLevels:{1:2,2:4},skillLevelSource:{1:'imported',2:'user-confirmed'}};
  assert.equal(commonSkillValue(custom),'custom');
  const afterChoice=setCommonSkillLevel(custom,3);
  assert.equal(afterChoice.skillLevels[1],3);
  assert.equal(afterChoice.skillLevels[2],3);
  assert.equal(commonSkillValue(afterChoice),'3');
});
test('migration and import retain custom individual skill levels',()=>{
  const p=emptyProfile(),hero=find(p,'Chenko');
  hero.skillLevels={1:2,2:4};hero.skillLevelSource={1:'imported',2:'user-confirmed'};
  const loaded=migrateProfile(JSON.parse(JSON.stringify(p)));
  assert.equal(find(loaded,'Chenko').skillLevels[1],2);
  assert.equal(find(loaded,'Chenko').skillLevels[2],4);
  const imported=mergeApi(loaded,{player:{heroes:[{id:9,name:'Chenko',level:70,stars:5,gear:[]}]}});
  assert.deepEqual(find(imported,'Chenko').skillLevels,{1:2,2:4});
});
test('remove and restore preserve development and affect host candidate eligibility',()=>{
  const p=emptyProfile(),helga=find(p,'Helga');
  helga.widget=4;helga.starStep=25;
  const removed=setHeroRosterPresence(helga,false);
  assert.equal(removed.widget,4);assert.equal(removed.included,false);assert.equal(removed.marchAvailable,false);
  p.heroes=p.heroes.map(h=>h.id===helga.id?removed:h);
  const imported=mergeApi(p,{player:{heroes:[{id:1,name:'Helga',level:75,stars:5,gear:[]}]}});
  assert.equal(find(imported,'Helga').included,false);
  assert.equal(find(imported,'Helga').marchAvailable,false);
  assert.equal(find(imported,'Helga').level,75);
  const restored=setHeroRosterPresence(find(imported,'Helga'),true);
  assert.equal(restored.included,true);assert.equal(restored.marchAvailable,true);assert.equal(restored.widget,4);
  const amadeus=find(emptyProfile(),'Amadeus');
  assert.equal(amadeus.owned,false);
  const added=setHeroRosterPresence(amadeus,true);
  assert.equal(added.owned,true);
  assert.equal(added.provenance.owned,'user-confirmed');
});
test('recommended host membership follows calculated team',()=>{
  const p=emptyProfile();
  const first=calculate(p,'hosting').team;
  if(first)for(const entry of first)assert.equal(entry.hero.included,true);
  const helga=find(p,'Helga');
  p.heroes=p.heroes.map(h=>h.id===helga.id?setHeroRosterPresence(h,false):h);
  const second=calculate(p,'hosting').team;
  assert.ok(!second?.some(entry=>entry.hero.id===helga.id));
});

 test('three and four star thresholds provide selectable common levels across intermediate steps',()=>{
  const helga=find(emptyProfile(),'Helga');
  for(const [starStep,limit] of [[19,4],[20,4],[24,4],[25,5],[26,5],[31,5]]){
    const hero={...helga,starStep};
    assert.equal(commonSkillValue(hero),String(limit));
    const chosen=setCommonSkillLevel(hero,3);
    assert.equal(commonSkillValue(chosen),'3');
    assert.deepEqual(chosen.skillLevels,{1:3,2:3,3:3});
    assert.deepEqual(setCommonSkillLevel(hero,5).skillLevels,{1:limit,2:limit,3:limit});
  }
  const unmapped={name:'Unmapped hero',starStep:25,skillLevels:{}};
  assert.equal(commonSkillValue(unmapped),'5');
  const chosen=setCommonSkillLevel(unmapped,3);
  assert.equal(commonSkillValue(chosen),'3');
  assert.deepEqual(chosen.skillLevels,{});
 });

test('Helga lower-star skill choices remain editable and visible without fabricating unlock effects',()=>{
 const base=find(emptyProfile(),'Helga');
 for(const starStep of [1,7,13]){
  const h={...base,starStep,starStepSource:'user-confirmed'};
  for(const level of [0,1,3,5]){
   const chosen=setCommonSkillLevel(h,level);
   assert.equal(commonSkillValue(chosen),String(level));
   assert.deepEqual(chosen.skillLevels,{1:level,2:level,3:level});
   const p=emptyProfile();p.heroes=p.heroes.map(hero=>hero.id===chosen.id?chosen:hero);
   const restored=find(migrateProfile(p),'Helga');
   assert.equal(commonSkillValue(restored),String(level));
  }
 }
});
