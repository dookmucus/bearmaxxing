import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile,mergeApi} from '../src/profile.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {heroContributions,heroProgression,defaultIncluded,progressionCoverage} from '../src/hero-effects.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {compareHosts,evaluateHostTrio,includedHostCandidates} from '../src/host-comparison.mjs';
import {STAR_OPTIONS,starStageFromStars,starStageParts,starStageLabel} from '../src/star-progression.mjs';

function ready(){
  const p=emptyProfile();
  for(const t of ['infantry','cavalry','archer'])p.stats[t]={attack:0,lethality:0};
  for(const h of p.heroes)if(heroProgression(h.name)?.widgetLethality)h.widget=0;
  return p;
}
const hero=(p,name)=>p.heroes.find(h=>h.name===name);
test('sourced star-step and widget lookups do not use hero level',()=>{
  for(const name of progressionCoverage())assert.equal(heroProgression(name).starAttack.length,32);
  const p=ready(),rosa=hero(p,'Rosa'),yang=hero(p,'Yang');
  assert.equal(heroProgression('Rosa').starAttack[31],370.3);
  assert.equal(heroProgression('Yang').starAttack[31],540.43);
  rosa.widget=10;assert.equal(heroContributions(rosa).widgetLethality,92.5);
  assert.equal(heroContributions(rosa).widgetRallyLethality,15);
  const before=heroContributions(rosa).inherentAttack;rosa.level=1;
  assert.equal(heroContributions(rosa).inherentAttack,before);
  rosa.starStep=24;assert.equal(heroContributions(rosa).inherentAttack,235.25);
  assert.equal(heroProgression('Yang').widgetLethality[10],133.5);
});
test('unknown widget effects stay unknown rather than becoming zero',()=>{
  const p=ready(),rosa=hero(p,'Rosa');
  rosa.widget=null;
  assert.equal(heroContributions(rosa).widgetLethality,null);
  assert.equal(heroContributions(rosa).widgetRallyLethality,null);
  assert.ok(compareHosts(p,accountEffects(p)).unevaluated.includes('Rosa'));
  rosa.widget=0;
  assert.equal(heroContributions(rosa).widgetLethality,0);
});
test('star progression labels cover exact sixth-steps through 5 stars',()=>{
  assert.equal(STAR_OPTIONS.length,31);
  assert.equal(starStageLabel(25),'4★');
  assert.deepEqual(STAR_OPTIONS.slice(25,30).map(x=>x.label),['4.1','4.2','4.3','4.4','4.5']);
  assert.equal(starStageLabel(31),'5★');
  assert.equal(starStageFromStars(4),25);
  assert.equal(starStageParts(26).stars,4);
  assert.equal(starStageParts(26).substep,1);
  assert.equal(STAR_OPTIONS.some(x=>x.label==='5.1'),false);
});
test('saved displayed totals are flagged and never added to sourced stats or same gear',()=>{
  const p=ready(),rosa=hero(p,'Rosa'),petra=hero(p,'Petra'),helga=hero(p,'Helga');
  rosa.attack=9999;rosa.lethality=9999;
  const first=evaluateHostTrio(p,[helga,petra,rosa],accountEffects(p));
  assert.match(first.uncertain.join(' '),/displayed hero/);
  const factor=first.team[2].factor;
  rosa.attack=null;rosa.lethality=null;
  assert.equal(evaluateHostTrio(p,[helga,petra,rosa],accountEffects(p)).team[2].factor,factor);
  const yang=hero(p,'Yang');
  const other=evaluateHostTrio(p,[helga,petra,yang],accountEffects(p));
  assert.deepEqual(first.team[2].gear.map(g=>g.id),other.team[2].gear.map(g=>g.id));
});
test('whole-team Expedition skills can change all three class factors',()=>{
  const p=ready(),helga=hero(p,'Helga'),petra=hero(p,'Petra'),rosa=hero(p,'Rosa');
  helga.skillLevels={...helga.skillLevels,2:0,3:0};
  helga.skillLevelSource={...helga.skillLevelSource,2:'user-confirmed',3:'user-confirmed'};
  const before=evaluateHostTrio(p,[helga,petra,rosa],accountEffects(p));
  helga.skillLevels={...helga.skillLevels,2:5,3:5};
  const after=evaluateHostTrio(p,[helga,petra,rosa],accountEffects(p));
  assert.ok(after.index>before.index);
  for(let i=0;i<3;i++)assert.ok(after.team[i].factor>before.team[i].factor);
  assert.equal(after.team[0].contribution.sharedAttack,25);
  assert.equal(after.team[0].contribution.sharedLethality,25);
});
test('an unmapped skill unlock does not become a zero-damage host input',()=>{
  const p=ready(),helga=hero(p,'Helga');
  helga.starStep=13;
  const comparison=compareHosts(p,accountEffects(p));
  assert.ok(comparison.unevaluated.includes('Helga'));
  assert.ok(!comparison.best?.team.some(entry=>entry.hero.name==='Helga'));
});
test('Rosa and Yang alternatives use the identical archer set and report only an index difference',()=>{
  const p=ready();
  for(const h of p.heroes)h.included=['Helga','Petra','Rosa','Yang','Chenko','Amane','Yeonwoo'].includes(h.name);
  const comparison=compareHosts(p,accountEffects(p));
  const archerNames=[comparison.best.team[2].hero.name,...comparison.alternatives.map(x=>x.team[2].hero.name)];
  assert.ok(archerNames.includes('Rosa')&&archerNames.includes('Yang'));
  const alternative=comparison.alternatives.find(x=>x.team[2].hero.name!==comparison.best.team[2].hero.name);
  assert.deepEqual(alternative.team[2].gear.map(g=>g.id),comparison.best.team[2].gear.map(g=>g.id));
  assert.ok(Number.isFinite(alternative.relativeIndex));
  assert.ok(comparison.best.uncertain.length>0);
});
test('default exclusions survive reference repair; unsupported partial progression stays unknown',()=>{
  const p=ready();
  assert.equal(defaultIncluded('Helga'),true);
  assert.equal(defaultIncluded('Gordon'),false);
  assert.equal(hero(p,'Gordon').included,false);
  assert.ok(!includedHostCandidates(p).flat().some(h=>h.name==='Gordon'));
  hero(p,'Gordon').included=true;
  // The new primary maximum and static hosting skill make full-star Gordon comparable.
  assert.ok(!compareHosts(p,accountEffects(p)).unevaluated.includes('Gordon'));
  assert.ok(!calculate(p,'hosting').unevaluated.includes('Gordon'));
  hero(p,'Gordon').starStep=25;
  // Its conflicting partial curve is withheld, not scaled to the primary endpoint.
  assert.ok(compareHosts(p,accountEffects(p)).unevaluated.includes('Gordon'));
});
test('exclusion preserves development through save migration and reimport',()=>{
  const p=ready(),helga=hero(p,'Helga');
  helga.included=false;helga.starStep=19;helga.widget=4;helga.skillLevels={2:3};
  const loaded=migrateProfile(JSON.parse(JSON.stringify(p)));
  const saved=hero(loaded,'Helga');
  assert.equal(saved.included,false);assert.equal(saved.starStep,19);assert.equal(saved.widget,4);
  const imported=mergeApi(loaded,{player:{heroes:[{id:9,name:'Helga',level:75,stars:5,gear:[]}]}});
  assert.equal(hero(imported,'Helga').included,false);
  assert.equal(hero(imported,'Helga').level,75);
  assert.ok(!includedHostCandidates(imported).flat().some(h=>h.name==='Helga'));
  hero(imported,'Helga').included=true;
  assert.ok(includedHostCandidates(imported).flat().some(h=>h.name==='Helga'));
});
test('imported stars update sourced progression without importing equipped totals as inherent',()=>{
  const p=ready(),rosa=hero(p,'Rosa');
  const before=heroContributions(rosa).inherentAttack;
  const imported=mergeApi(p,{player:{heroes:[{id:77,name:'Rosa',stars:4,level:70,attack:999,gear:[]}]}});
  const updated=hero(imported,'Rosa');
  assert.equal(updated.starStep,25);
  assert.equal(heroContributions(updated).inherentAttack,256.72);
  assert.ok(before>heroContributions(updated).inherentAttack);
  assert.equal(updated.attack,null);
  assert.match(updated.starStepSource,/review/);
});
test('old inferred stages are corrected; exact saved stages and ambiguous imports are preserved',()=>{
  const old=ready(),rosa=hero(old,'Rosa');
  rosa.stars=4;rosa.starStep=24;rosa.starStepSource='inferred from saved whole-star count; review';
  assert.equal(hero(migrateProfile(old),'Rosa').starStep,25);
  rosa.starStepSource='user-confirmed';
  const exact=hero(migrateProfile(old),'Rosa');
  assert.equal(exact.starStep,24);
  assert.equal(exact.stars,3);
  const ambiguous=mergeApi(ready(),{player:{heroes:[{id:77,name:'Rosa',stars:4.5,gear:[]}]}});
  const imported=hero(ambiguous,'Rosa');
  assert.equal(imported.starStep,null);
  assert.equal(imported.stars,null);
  assert.equal(imported.importedStarsRaw,4.5);
  assert.match(imported.starStepSource,/ambiguous/);
});
test('an excluded joining candidate is replaced without blocking troop shortage output',()=>{
  const p=ready();p.hostCapacity=100000;p.joinCapacity=100000;
  for(const t of ['infantry','cavalry','archer'])p.troops[t].count=500000;
  hero(p,'Chenko').marchAvailable=false;
  const result=calculate(p,'joining');
  assert.ok(result.plan);
  assert.ok(result.plan.assignment.joins.every(row=>row.heroes[0]?.name!=='Chenko'));
  assert.ok(result.plan.assignment.joins.every(row=>row.heroes[0]));
});
