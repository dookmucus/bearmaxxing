import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {masterEffects,masterInputDetails,masterSquadInputValue,masterResearchDetails} from '../src/master-effects.mjs';
import {accountEffects as allAccountEffects} from '../src/calculator.mjs';

const accountEffects=p=>allAccountEffects({...p,pets:[],heroes:[]});
const legacyFixture=emptyProfile;
const master=(p,name='Valora')=>p.masters.find(m=>m.name===name);
test('decimal affinity bonus replaces its table value and preserves 14.40 through migration',()=>{
  const p=legacyFixture(),m=master(p);
  m.affinityLevel=100;m.squadBonus='14.40';m.talentLevel=10;
  assert.equal(masterSquadInputValue(m),'14.40');
  assert.equal(masterInputDetails(m).affinityValue,14.4);
  assert.equal(accountEffects(p).attack,14.4);
  assert.equal(accountEffects(p).personalPoints,27);
  const restored=migrateProfile(JSON.parse(JSON.stringify(p)));
  assert.equal(master(restored).squadBonus,'14.40');
  assert.equal(masterSquadInputValue(master(restored)),'14.40');
  assert.equal(accountEffects(restored).attack,14.4);
  m.affinityLevel=90;
  assert.equal(accountEffects(p).attack,14.4);
  m.squadBonus='0.00';assert.equal(accountEffects(p).attack,0);
  m.squadBonus=null;
  assert.equal(masterSquadInputValue(m),'');
  assert.equal(masterEffects(m).attack,0);
  assert.match(masterEffects(m).unsupported.join(' '),/unknown/);
});
test('Cassia decimal lethality never duplicates affinity or independently derived skills',()=>{
  const p=legacyFixture(),m=master(p,'Cassia');
  Object.assign(m,{affinityLevel:100,squadBonus:'14.40',talentLevel:11,skillLevels:{1:0,2:20,3:20,4:20}});
  const effect=accountEffects(p);
  assert.equal(effect.attack,10);assert.equal(effect.lethality,24.4);
  assert.equal(effect.deploy,10000);assert.equal(effect.rally,100000);
  m.squadBonus='-1';assert.equal(masterEffects(m).lethality,10);
  m.squadBonus='invalid';assert.equal(masterEffects(m).lethality,10);
});
test('level 100 does not infer talent or research; explicit talent stays separate from offense',()=>{
  const p=legacyFixture(),m=master(p);
  m.affinityLevel=100;delete m.squadBonus;
  assert.equal(masterEffects(m).personalPoints,0);
  assert.equal(masterEffects(m).attack,15);
  m.talentLevel=10;
  assert.equal(masterEffects(m).personalPoints,27);
  m.talentLevel=11;
  assert.equal(masterEffects(m).personalPoints,30);
  assert.equal(masterEffects(m).attack,15);
  assert.equal(masterEffects(master(p,'Pan')).lethality,0);
});
test('saved supported research survives migration and counts once beside affinity and skills',()=>{
  const p=legacyFixture(),roman=master(p,'Roman'),pan=master(p,'Pan');
  Object.assign(roman,{affinityLevel:100,squadBonus:'14.40',specialResearchProgress:400,attack:99});
  Object.assign(pan,{affinityLevel:100,specialResearchProgress:600});
  const restored=migrateProfile(JSON.parse(JSON.stringify(p)));
  assert.equal(master(restored,'Roman').specialResearchProgress,400);
  assert.equal(master(restored,'Roman').attack,99);
  assert.equal(accountEffects(restored).attack,20.4);
  assert.equal(accountEffects(restored).lethality,12);
  assert.match(masterResearchDetails(roman).note,/included separately/);
  assert.match(masterResearchDetails(roman).note,/Path Stats.*not included/);
  roman.specialResearchProgress=401;
  assert.equal(masterEffects(roman).attack,14.4);
  assert.match(masterResearchDetails(roman).note,/intermediate.*retained/);
  roman.specialResearchProgress=400;roman.affinityLevel=99;
  assert.equal(masterEffects(roman).attack,14.4);
  assert.match(masterResearchDetails(roman).issue,/requires affinity 100/);
  const valora=master(p);valora.specialResearchProgress=400;
  assert.equal(masterEffects(valora).attack,0);
  assert.match(masterResearchDetails(valora).note,/Saved research is retained/);
});
test('legacy master inputs retain reference behavior and original skill slots while missing upgrades default to zero',()=>{
  const p=legacyFixture(),m=master(p);
  delete m.squadBonus;
  m.affinityLevel=10;m.talentLevel=null;m.skillLevels={1:2,2:4,3:5,4:3};
  const restored=migrateProfile(JSON.parse(JSON.stringify(p))),saved=master(restored);
  assert.equal(saved.squadBonus,'2.85');
  assert.equal(masterSquadInputValue(saved),'2.85');
  assert.equal(saved.talentLevel,0);
  assert.deepEqual(masterInputDetails(saved).skills.map(s=>[s.slot,s.kind,s.level]),[[1,'rally',2],[2,null,4],[3,null,5],[4,'deployment',3]]);
  assert.equal(masterEffects(saved).rally,60000);
  assert.equal(masterEffects(saved).deploy,9000);
});

test('Masters start at Level 1 with zero squad bonus and saved blank fields receive defaults',()=>{
 const p=emptyProfile();
 for(const m of p.masters){
  assert.equal(m.affinityLevel,1);
  assert.equal(m.squadBonus,0);
 }
 assert.equal(accountEffects(p).attack,0);
 assert.equal(accountEffects(p).lethality,0);
 const valora=master(p);valora.affinityLevel=null;valora.squadBonus=null;
 const cassia=master(p,'Cassia');cassia.affinityLevel=98;cassia.squadBonus='14.40';
 const restored=migrateProfile(JSON.parse(JSON.stringify(p)));
 assert.equal(master(restored).affinityLevel,1);
 assert.equal(masterSquadInputValue(master(restored)),0);
 assert.equal(master(restored,'Cassia').affinityLevel,98);
 assert.equal(master(restored,'Cassia').squadBonus,'14.40');
});
