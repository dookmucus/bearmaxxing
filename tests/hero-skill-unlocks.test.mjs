import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile,mergeApi} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {SKILL_UNLOCKS,applySkillDefaults,effectiveSkillLevel,skillConflict,skillUnlock} from '../src/hero-skill-unlocks.mjs';
import {heroContributions,joiningLeaderSkill} from '../src/hero-effects.mjs';
import {commonSkillInfo,commonSkillValue} from '../src/hero-skills-control.mjs';
import {expeditionSlots} from '../src/hero-skills-control.mjs';

const find=(p,name)=>p.heroes.find(h=>h.name===name);
test('every default included hero uses sourced full-star assumptions for each Expedition skill',()=>{
  const p=emptyProfile();
  for(const hero of p.heroes.filter(h=>h.included)){
    const slots=expeditionSlots(hero.name,hero);
    assert.ok(slots.length>0,`${hero.name} needs named Expedition skills`);
    for(const slot of slots){
      assert.equal(skillUnlock(hero.name,slot,31).max,5,`${hero.name} skill ${slot} needs a sourced full-star cap`);
      assert.equal(effectiveSkillLevel(hero,slot).level,5);
      assert.equal(hero.skillLevelSource[slot],'assumed');
    }
    assert.equal(commonSkillValue(hero),'5');
  }
});
test('sourced lower-star limits and user-provided three/four-star planning thresholds',()=>{
  for(const name of ['Chenko','Amane','Yeonwoo']){
    assert.equal(skillUnlock(name,1,7).max,2);
    assert.equal(skillUnlock(name,1,13).max,3);
    assert.equal(skillUnlock(name,1,19).max,4);
    assert.equal(skillUnlock(name,1,25).max,5);
    assert.equal(skillUnlock(name,1,26).max,5);
    assert.equal(skillUnlock(name,1,20).max,4);
    assert.equal(skillUnlock(name,2,31).max,5);
  }
  assert.equal(skillUnlock('Helga',2,31).max,5);
  assert.equal(skillUnlock('Helga',2,25).max,5);
});
test('new and added heroes receive only supported assumed Expedition levels',()=>{
  const p=emptyProfile(),chenko=find(p,'Chenko'),helga=find(p,'Helga');
  assert.equal(chenko.skillLevels[1],5);
  assert.equal(chenko.skillLevelSource[1],'assumed');
  assert.equal(helga.skillLevels[2],5);
  assert.equal(helga.skillLevelSource[2],'assumed');
  chenko.included=false;
  const included=applySkillDefaults({...chenko,included:true,skillLevels:{},skillLevelSource:{}});
  assert.equal(included.skillLevels[1],5);
});
test('missing imported and saved skill values use sourced full-star assumptions',()=>{
  const p=emptyProfile(),helga=find(p,'Helga');
  helga.skillLevels={1:null,2:'Unknown',3:null};
  helga.skillLevelSource={1:'imported',2:'saved-unclassified'};
  const loaded=migrateProfile(p);
  assert.deepEqual(find(loaded,'Helga').skillLevels,{1:5,2:5,3:5});
  assert.deepEqual(find(loaded,'Helga').skillLevelSource,{1:'assumed',2:'assumed',3:'assumed'});
  const imported=mergeApi(loaded,{player:{heroes:[{id:1,name:'Helga',stars:5,gear:[]}]}});
  assert.deepEqual(find(imported,'Helga').skillLevels,{1:5,2:5,3:5});
});
test('star changes update assumptions and preserve manual and imported levels',()=>{
  const chenko=find(emptyProfile(),'Chenko');
  const lower=applySkillDefaults({...chenko,starStep:13});
  assert.equal(lower.skillLevels[1],3);
  const manual={...chenko,skillLevels:{1:2},skillLevelSource:{1:'user-confirmed'}};
  assert.equal(applySkillDefaults({...manual,starStep:25}).skillLevels[1],2);
  const imported={...chenko,skillLevels:{1:2},skillLevelSource:{1:'imported'}};
  assert.equal(applySkillDefaults({...imported,starStep:25}).skillLevels[1],2);
  const updated=mergeApi(emptyProfile(),{player:{heroes:[{id:1,name:'Chenko',stars:2,gear:[]}]}});
  assert.equal(find(updated,'Chenko').skillLevels[1],3);
  assert.equal(find(updated,'Chenko').skillLevelSource[1],'assumed');
  assert.equal(find(updated,'Chenko').skillLevels[2],null);
  const restored=mergeApi(updated,{player:{heroes:[{id:1,name:'Chenko',stars:5,gear:[]}]}});
  assert.equal(find(restored,'Chenko').skillLevels[2],5);
});
test('conflicting saved levels are retained, flagged, and excluded from offense',()=>{
  const chenko=find(emptyProfile(),'Chenko');
  chenko.starStep=13;
  chenko.skillLevelSource[1]='user-confirmed';
  assert.deepEqual(skillConflict(chenko,1),{value:5,max:3});
  const effect=heroContributions(chenko);
  assert.equal(effect.sharedLethality,0);
  assert.match(effect.uncertain.join(' '),/exceeds unlocked maximum 3/);
  const saved=migrateProfile({...emptyProfile(),heroes:[{...chenko,skillLevelSource:{1:'user-confirmed'}}]});
  assert.equal(find(saved,'Chenko').skillLevels[1],5);
  assert.equal(find(saved,'Chenko').skillLevelSource[1],'user-confirmed');
});
test('assumed values recalculate at star changes while explicit values stay intact',()=>{
  const chenko=find(emptyProfile(),'Chenko');
  const lower=applySkillDefaults({...chenko,starStep:13});
  assert.equal(effectiveSkillLevel(lower,1).level,3);
  assert.equal(lower.skillLevels[2],null);
  assert.equal(effectiveSkillLevel(lower,2).unlock.max,null);
  assert.match(joiningLeaderSkill(lower),/level 3: Lethality \+15%/);
  const explicit={...chenko,skillLevels:{1:2,2:4},skillLevelSource:{1:'imported',2:'user-confirmed'}};
  const changed=applySkillDefaults({...explicit,starStep:13});
  assert.deepEqual(changed.skillLevels,{1:2,2:4});
  assert.equal(effectiveSkillLevel(changed,1).level,2);
  assert.equal(effectiveSkillLevel(changed,2).level,null);
});
test('migration retains legacy skill values without relabeling them assumed',()=>{
  const legacy={...find(emptyProfile(),'Chenko'),skillLevels:{1:2}};
  delete legacy.skillLevelSource;
  const migrated=migrateProfile({...emptyProfile(),heroes:[legacy]});
  assert.equal(find(migrated,'Chenko').skillLevels[1],2);
  assert.equal(find(migrated,'Chenko').skillLevelSource[1],'saved-unclassified');
});
test('a verified locked skill is labeled Locked and contributes no level',()=>{
  SKILL_UNLOCKS['Unlock fixture']={1:{limits:{7:0},source:'fixture'},2:{limits:{7:2},source:'fixture'}};
  try{
    const hero=applySkillDefaults({name:'Unlock fixture',starStep:7,skillLevels:{},skillLevelSource:{}});
    assert.deepEqual(hero.skillLevels,{1:0,2:2});
    assert.equal(commonSkillValue(hero),'auto');
    assert.match(commonSkillInfo(hero,()=>''),/Expedition skill 1: Locked/);
    assert.match(commonSkillInfo(hero,()=>''),/Expedition skill 2: level 2/);
    assert.equal(effectiveSkillLevel(hero,1).level,0);
  }finally{delete SKILL_UNLOCKS['Unlock fixture'];}
});
