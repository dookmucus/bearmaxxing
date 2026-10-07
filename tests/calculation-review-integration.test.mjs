import {enteredRosterProfile} from './helpers/entered-roster.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {heroContributions,heroProgression,heroSkillName} from '../src/hero-effects.mjs';
import {heroReferenceName} from '../src/hero-identity.mjs';
import {heroBearEffects,familyMultiplier,finiteBaselineCases} from '../src/bear-comparison.mjs';
import {accountEffects} from '../src/calculator.mjs';
import {accountHeroTalents} from '../src/account-hero-talents.mjs';
import {joiningRole} from '../src/hero-roles.mjs';
import {evaluateHostTrio} from '../src/host-comparison.mjs';
import {effectiveSkillLevel} from '../src/hero-skill-unlocks.mjs';
import {widgetStatFactor} from '../src/bear-attack-events.mjs';
import {emptyProfile} from '../src/profile.mjs';
const snapshot=()=>JSON.parse(fs.readFileSync(new URL('../audits/incoming-hosting-2026-10-06/replay.json',import.meta.url))).profileSnapshot;
const hero=(p,name)=>p.heroes.find(h=>h.name===name);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('reviewed references repair entered stages without rescaling conflicts or saved profile',()=>{
 const p=snapshot(),before=JSON.stringify(p);
 for(const [name,value] of [['Gordon',140.11],['Chenko',140.11],['Jabel',200.16],['Hilde',152.59],['Marlin',152.59],['Sophia',343.33],['Fahd',null]])assert.equal(heroContributions(hero(p,name)).inherentAttack,value,name);
 for(const name of ['Gordon','Fahd','Chenko'])assert.equal(heroProgression(name).starAttack[30],null);
 assert.equal(heroContributions(hero(p,'Hilde')).referenceEvidence.inherentAttack,'community-table-endpoint-crosschecked');
 assert.equal(heroContributions(hero(p,'Gordon')).referenceEvidence.inherentAttack,'primary-max');
 assert.equal(JSON.stringify(p),before);
 assert.equal(heroReferenceName('Jaegar'),'Jaeger');assert.equal(heroReferenceName({canonicalHeroId:'roster-jaegar',name:'Localized name'}),'Jaeger');
});
test('Gordon hosting Attack is static slot 2 and cannot become a joining offer',()=>{
 const p=snapshot(),g=hero(p,'Gordon');
 assert.equal(heroContributions(g).sharedAttack,25);
 assert.deepEqual(heroBearEffects(g).effects.map(e=>[e.name,e.kind,e.family,e.value]),[['Trash Talk','steady','102',25]]);
 assert.equal(joiningRole(g).effects.length,0);
 assert.equal(heroContributions({...g,skillLevels:{2:0},skillLevelSource:{2:'user-confirmed'}}).sharedAttack,0);
});
test('Marlin maps both distinct offensive slots and preserves entered zero',()=>{
 const p=snapshot(),m=hero(p,'Marlin'),effects=heroBearEffects(m).effects;
 assert.deepEqual(effects.map(e=>[e.skill,e.name,e.value]),[[1,'Wild Card',50],[3,'Dynamo',40]]);
 assert.equal(effects[0].probabilityByLevel[4],.32);assert.equal(effects[1].probability,.5);
 assert.equal(joiningRole(m).effects.length,1);assert.equal(joiningRole(m).effects[0].name,'Wild Card');assert.equal(joiningRole(m).effects[0].conditional,true);
 assert.equal(heroBearEffects({...m,skillLevels:{1:0,3:0},skillLevelSource:{1:'user-confirmed',3:'user-confirmed'}}).effects.length,0);
 const future={...m,widget:1};assert.equal(heroContributions(future).widgetLethality,6);assert.equal(heroContributions(future).widgetRallyLethality,null);
});
test('Hilde replaces total damage; Margot extra packet and Triton skill-only remain unresolved',()=>{
 const p=snapshot(),h=hero(p,'Hilde'),b=heroBearEffects(h);
 assert.equal(b.effects.find(e=>e.skill===2).kind,'chance-replacement');
 const plain={...h,skillLevels:{1:4,2:0,3:0},skillLevelSource:{1:'user-confirmed',2:'user-confirmed',3:'user-confirmed'}};
 const trio=[hero(p,'Zoe'),h,hero(p,'Rosa')],withProc=evaluateHostTrio(p,trio,accountEffects(p)),without=evaluateHostTrio(p,[trio[0],plain,trio[2]],accountEffects(p));
 close(withProc.bear.modeledDamage/without.bear.modeledDamage,1.2);
 const margot={...hero(p,'Margot'),starStep:31};
 assert.equal(heroBearEffects(margot).effects.find(e=>e.skill===3).operation,'extra-attack-total-damage');assert.match(heroBearEffects(margot).gaps.join(' '),/counter participation/);
 assert.ok(heroBearEffects(hero(p,'Triton')).gaps.length);assert.ok(heroBearEffects(hero(p,'Sophia')).gaps.length);
 assert.equal(effectiveSkillLevel(hero(p,'Thrud'),1).level,null);
});
test('Quinn canonical slots distinguish defensive first skill from Burst Fire',()=>{
 const q=hero(snapshot(),'Quinn');assert.equal(heroSkillName(q,1),'Precision Shot');assert.equal(heroSkillName(q,2),'Burst Fire');
 assert.deepEqual(heroBearEffects(q).effects.map(e=>e.skill),[2]);assert.equal(joiningRole(q).effects.length,0);
});
test('Helga owned account talent applies once while absent and keeps zero Expedition skills',()=>{
 const p=snapshot(),h=hero(p,'Helga'),before=structuredClone(p);
 assert.equal(accountHeroTalents(p).attack,2);assert.deepEqual(h.skillLevels,{'1':0,'2':0,'3':0});
 h.included=false;h.marchAvailable=false;assert.equal(accountHeroTalents(p).attack,2);
 p.heroes.push({...h});assert.equal(accountHeroTalents(p).attack,2);
 p.heroes=p.heroes.filter(x=>heroReferenceName(x)!=='Helga');assert.equal(accountHeroTalents(p).attack,0);
 const active=evaluateHostTrio(before,['Zoe','Petra','Yang'].map(n=>hero(before,n)),accountEffects(before));
 const absent=evaluateHostTrio(p,['Zoe','Petra','Yang'].map(n=>hero(p,n)),accountEffects(p));
 for(const entry of active.team)close(entry.attack-absent.team.find(e=>e.hero.troop===entry.hero.troop).attack,2);
});
test('unconfirmed baseline zero remains saved and finite; explicit zero stays confirmed',()=>{
 const p=snapshot(),before=JSON.stringify(p);assert.equal(finiteBaselineCases(p).find(c=>c.central).values.archer.attack,500);assert.equal(JSON.stringify(p),before);
 p.assumedInputs={'stats.archer.attack':'user-confirmed'};assert.equal(finiteBaselineCases(p).find(c=>c.central).values.archer.attack,0);
 assert.equal(widgetStatFactor(15,{alreadyIncluded:true}),1);
});

test('bench-stat rejection bound agrees with complete re-optimization',async()=>{
 const {optimizeMarchPlan}=await import('../src/joint-plan.mjs');
 const {evaluateUpgrade}=await import('../src/upgrade-model.mjs');
 const p=enteredRosterProfile();
 for(const h of p.heroes)h.included=['Zoe','Petra','Yang','Jabel'].includes(h.name);
 const before=optimizeMarchPlan(p,accountEffects(p));
 const bench=before.comparison.options.flatMap(o=>o.team.map(e=>e.hero)).find(h=>!before.selected.host.team.some(e=>e.hero.id===h.id));
 const changed={...p,heroes:p.heroes.map(h=>h.id===bench.id?{...h,widget:Number(h.widget)+1}:h)};
 const shortcut=evaluateUpgrade(p,changed,accountEffects,before);
 const complete=evaluateUpgrade(p,changed,accountEffects,{...before,comparison:{...before.comparison,options:[]}});
 assert.equal(shortcut?.damageGain??null,complete?.damageGain??null);
 assert.deepEqual(shortcut?.selectedHost??null,complete?.selectedHost??null);
});

test('offline report reconciliation refuses unknown special layers and double counting',async()=>{
 const {reconcileReportStat}=await import('../scripts/report-stat-reconciliation.mjs');
 const context={contextVerified:true,layerVerified:true};
 close(reconcileReportStat({...context,reportedPp:494,knownOrdinaryPp:240,specialFactor:1.1}).ordinaryBaselinePp,200);
 assert.throws(()=>reconcileReportStat({...context,reportedPp:494,knownOrdinaryPp:240}));
 assert.throws(()=>reconcileReportStat({...context,reportedPp:100,knownOrdinaryPp:240,specialFactor:1.1}));
 assert.equal(reconcileReportStat({...context,reportedPp:0,knownOrdinaryPp:0,specialFactor:1}).ordinaryBaselinePp,0);
 const h=hero(snapshot(),'Fahd');assert.equal(heroContributions(h).comparisonReady,false);
});

test('verified Jaegar alias cannot supply a duplicate simultaneous hero',async()=>{
 const {canonicalHeroId}=await import('../src/hero-identity.mjs');
 const {heroIdentity}=await import('../src/host-comparison.mjs');
 const {roleInventoryIssues}=await import('../src/hero-roles.mjs');
 assert.equal(canonicalHeroId('Jaegar'),canonicalHeroId('Jaeger'));
 const p=snapshot(),jaeger=hero(p,'Jaeger');
 const alias={...jaeger,id:'roster-jaegar',canonicalHeroId:'roster-jaegar',name:'Jaegar'};
 assert.equal(heroIdentity(alias),heroIdentity(jaeger));p.heroes.push(alias);
 assert.ok(roleInventoryIssues(p).some(reason=>reason.includes('duplicate')));
});
