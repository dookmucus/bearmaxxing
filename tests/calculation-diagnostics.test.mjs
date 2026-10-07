import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeApi} from '../src/profile.mjs';
import {enteredRosterProfile as emptyProfile} from './helpers/entered-roster.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {heroContributions,heroReference} from '../src/hero-effects.mjs';
import {compareHosts} from '../src/host-comparison.mjs';
import {calculate,accountEffects} from '../src/calculator.mjs';
import {calculationDiagnostics} from '../src/calculation-diagnostics.mjs';
import {normalizeHeroProgression} from '../src/hero-progression-inputs.mjs';
const ready=()=>migrateProfile(emptyProfile());

test('duplicate gear validation remains separate from an unused candidate widget gap',()=>{
 const p=ready();p.heroes.find(h=>h.name==='Rosa').widget=null;
 assert.equal(compareHosts(p,accountEffects(p)).best.team.length,3);
 p.gear[1].id=p.gear[0].id;
 const result=calculate(p,'hosting');assert.ok(!result.team);
 assert.match(result.blockingValidation.join(' '),/unique ID/);
 assert.ok(result.modelGaps.some(g=>g.name==='Rosa'));
});
test('unsupported unused candidates do not prevent supported trios',()=>{
 const p=ready();p.heroes.find(h=>h.name==='Rosa').widget=null;
 const result=calculate(p,'hosting');assert.equal(result.team.length,3);assert.deepEqual(result.blockingValidation,[]);
 assert.ok(result.team.every(e=>e.hero.name!=='Rosa'));assert.match(result.scope,/Formation-relative hosting comparison at 10\/10\/80/);
});
test('numeric string progression requires range and explicit encoding or corroboration',()=>{
 const input={name:'Helga',stars:'5',starStep:'31',level:'80',widget:'4',skillLevels:{1:'5'},provenance:{stars:'user-confirmed',widget:'imported'}};
 const parsed=normalizeHeroProgression(input);
 assert.equal(parsed.starStep,31);assert.equal(parsed.widget,4);assert.equal(parsed.skillLevels[1],5);
 assert.deepEqual(parsed.provenance,input.provenance);assert.equal(parsed.progressionOriginals.starStep.value,'31');assert.equal(input.starStep,'31');
 for(const starStep of ['31','5.2','32','Infinity']){
  const ambiguous=normalizeHeroProgression({name:'Helga',starStep,starStepSource:'legacy'});
  assert.equal(ambiguous.starStep,null);assert.equal(ambiguous.legacyStarStep,starStep);
 }
 const encoded=normalizeHeroProgression({starStep:'31',starStepEncoding:'sixth-step-index-v1'});assert.equal(encoded.starStep,31);
 const bad=normalizeHeroProgression({widget:'11',level:'81',stars:'6',skillLevels:{1:'6'}});
 assert.equal(bad.widget,'11');assert.equal(bad.stars,'6');assert.equal(bad.skillLevels[1],'6');
});
test('migration normalizes confirmed strings and keeps ambiguous stages unresolved across reloads',()=>{
 const p=ready(),h=p.heroes.find(h=>h.name==='Helga');h.stars='5';h.starStep='31';h.starStepSource='user-confirmed';
 const m=migrateProfile(p).heroes.find(h=>h.name==='Helga');assert.equal(m.starStep,31);assert.equal(m.progressionOriginals.starStep.value,'31');
 h.stars=null;h.starStepSource='legacy';const unresolved=migrateProfile(p);const saved=unresolved.heroes.find(h=>h.name==='Helga');assert.equal(saved.starStep,null);
 assert.equal(migrateProfile(unresolved).heroes.find(h=>h.name==='Helga').starStep,null);
});
test('canonical identity survives display renaming for migration, skills, widgets and imports',()=>{
 const p=ready(),h=p.heroes.find(h=>h.name==='Rosa');h.widget=7;const before=heroContributions(h);h.name='My renamed archer';
 assert.deepEqual(heroContributions(h),before);assert.equal(heroReference(h).name,'Rosa');
 const migrated=migrateProfile(p);assert.equal(migrated.heroes.filter(x=>x.canonicalHeroId==='roster-rosa').length,1);
 assert.equal(migrated.heroes.find(x=>x.canonicalHeroId==='roster-rosa').name,h.name);
 const imported=mergeApi(migrated,{player:{heroes:[{id:456,name:'Rosa',stars:'5',level:'80',exclusive_gear_level:'7'}]}});
 assert.equal(imported.heroes.find(x=>x.canonicalHeroId==='roster-rosa').name,h.name);
 assert.equal(heroReference({canonicalHeroId:'unverified-id',name:'Rosa'}),null);
 assert.equal(imported.heroes.find(x=>x.canonicalHeroId==='roster-rosa').progressionOriginals.widget.value,'7');
 const leader=p.heroes.find(x=>x.canonicalHeroId==='roster-chenko');leader.name='Custom leader name';
 assert.equal(migrateProfile(p).heroes.find(x=>x.canonicalHeroId==='roster-chenko').name,'Custom leader name');
});
test('diagnostics reflect current memory, omit private fields and never mutate the profile',()=>{
 const p=ready();p.playerId='PRIVATE_PLAYER';p.apiKey='PRIVATE_KEY';p.credentials={token:'PRIVATE_TOKEN'};
 p.notes='PRIVATE_NOTES';p.heroes.find(h=>h.name==='Rosa').widget=9;
 const original=structuredClone(p),report=calculationDiagnostics(p),serialized=JSON.stringify(report);
 assert.ok(serialized.length<50_000_000,'Factorized diagnostics must not repeat a hosting matrix for every joining trio');
 for(const row of report.jointPlan.comparisons)assert.ok(Object.hasOwn(report.jointPlan.hostingComparisons,row.hostingComparisonKey));
 assert.deepEqual(p,original);for(const secret of ['PRIVATE_PLAYER','PRIVATE_KEY','PRIVATE_TOKEN','PRIVATE_NOTES'])assert.ok(!serialized.includes(secret));
 assert.ok(!report.referenceGaps.some(g=>g.name==='Rosa'));
 assert.equal(report.heroes.find(h=>h.displayName==='Rosa').contributions.widgetRallyLethality,12.5);
 assert.equal(report.heroes.find(h=>h.displayName==='Chenko').eligible,true);assert.ok(!JSON.stringify(report).includes('Reserved joining leader'));
});
