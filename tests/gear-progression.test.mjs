import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gearOffense} from '../src/engine.mjs';
import {GEAR_QUALITY,completedImbuement,gearEnhancementXp,gearIssues,gearLevelLabel,gearProgression,requiredGearMastery} from '../src/gear-progression.mjs';
import {emptyProfile} from '../src/profile.mjs';
import {enteredRosterProfile} from './helpers/entered-roster.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {heroProgression} from '../src/hero-effects.mjs';
import {compareHosts} from '../src/host-comparison.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';

const piece=(quality,enhancement,forge,slot='helmet')=>({id:'gear-1',name:'Infantry helmet',troop:'infantry',slot,quality,enhancement,forge,imbuementConfirmed:{}});
test('quality numeric bounds and XP checkpoints preserve independent progression entry',()=>{
  assert.deepEqual([GEAR_QUALITY.purple.max,GEAR_QUALITY.gold.max,GEAR_QUALITY.red.max],[80,100,200]);
  assert.equal(gearLevelLabel('red',100),'+0');assert.equal(gearLevelLabel('red',200),'+100');
  assert.equal(requiredGearMastery('red',120),11);assert.equal(requiredGearMastery('red',121),12);
  assert.equal(requiredGearMastery('red',200),15);
  assert.equal(gearIssues(piece('red',121,0)).length,0);
  assert.equal(gearIssues(piece('red',121,12)).length,0);
  assert.ok(gearIssues(piece('purple',81,0)).length);
  assert.equal(gearIssues(piece('purple',80,2)).length,0);
  assert.equal(gearIssues(piece('purple',80,null)).length,0);
  assert.equal(gearEnhancementXp(1),10);assert.equal(gearEnhancementXp(100),2400);
  assert.equal(gearEnhancementXp(120),0);assert.equal(gearEnhancementXp(199),9300);
});
test('ordinary offense uses enhancement and Mastery separately; no gear is zero',()=>{
  assert.equal(gearOffense(piece('purple',80,0)).lethality,25.8);
  assert.equal(gearOffense(piece('gold',100,10)).lethality,100);
  assert.equal(gearOffense(piece('gold',100,10,'gloves')).lethality,0);
  assert.deepEqual([gearOffense({...piece('none',200,20),lethality:999,imbuementAttack:999}).attack,gearOffense(piece('none',200,20)).lethality],[0,0]);
  assert.equal(gearOffense({...piece('gold',0,0),lethality:999}).lethality,15);
});
test('exact offensive imbuement gates need confirmation; later levels prove earlier completion',()=>{
  const atGate=piece('red',120,11);
  assert.equal(completedImbuement(atGate,120),null);
  assert.equal(gearOffense(atGate),null);
  assert.equal(gearOffense({...atGate,imbuementConfirmed:{120:false}}).attack,0);
  assert.equal(gearOffense({...atGate,imbuementConfirmed:{120:true}}).attack,20);
  assert.equal(gearOffense(piece('red',121,12)).attack,20);
  assert.equal(gearOffense(piece('red',160,13,'gloves')),null);
  assert.equal(gearOffense({...piece('red',160,13,'gloves'),imbuementConfirmed:{160:true}}).attack,30);
  assert.equal(gearOffense(piece('red',161,14,'gloves')).attack,30);
  assert.match(gearProgression({...piece('red',200,15),imbuementConfirmed:{200:true}}).uncertain.join(' '),/replaces or adds/);
  assert.equal(gearOffense({...piece('red',200,15),imbuementConfirmed:{200:true}}),null);
});
test('migration retains IDs, progression, manual values and extra inventory without counting legacy percentages',()=>{
  const old=emptyProfile();
  old.gear=[{...piece('Mythic',60,3),lethality:777,imbuementAttack:333},{...piece('purple',20,0,'boots'),id:'extra-1',name:'Extra boots'}];
  const p=migrateProfile(old);
  const primary=p.gear.find(g=>g.id==='gear-1');
  assert.equal(p.gear.length,14);
  assert.equal(primary.quality,'Mythic'); // Reference gear retains its original label.assert.equal(primary.enhancement,60);assert.equal(primary.forge,3);
  assert.equal(primary.lethality,777);assert.equal(primary.imbuementAttack,333);
  assert.equal(gearOffense(primary).attack,0);
  assert.equal(gearOffense(primary).lethality,(15+.35*60)*1.3);
  assert.equal(p.gear.find(g=>g.id==='extra-1').slot,'boots');
});
test('host comparison uses the same derived imbuement Attack as gear assignment',()=>{
  const p=enteredRosterProfile();for(const type of ['infantry','cavalry','archer'])p.stats[type]={attack:0,lethality:0};
  for(const hero of p.heroes)if(heroProgression(hero.name)?.widgetLethality)hero.widget=0;
  const before=compareHosts(p,accountEffects(p)).best?.index;
  assert.ok(before>0);
  const helmet=p.gear.find(g=>g.id==='set-infantry-helmet');
  Object.assign(helmet,piece('red',120,11),{id:helmet.id,imbuementConfirmed:{120:true}});
  const after=compareHosts(p,accountEffects(p)).best?.index;
  assert.ok(after>before);
});
test('upgrade advice uses a sourced offensive milestone and its required materials',()=>{
  const p=enteredRosterProfile();for(const type of ['infantry','cavalry','archer'])p.stats[type]={attack:0,lethality:0};
  for(const hero of p.heroes)if(heroProgression(hero.name)?.widgetLethality)hero.widget=0;
  const helmet=p.gear.find(g=>g.id==='set-infantry-helmet');
  Object.assign(helmet,piece('red',119,11),{id:helmet.id});
  const step=calculate(p,'upgrades').gearSteps.find(item=>item.id==='set-infantry-helmet-enhance');
  assert.match(step.benefit,/Attack \+20\.00 pp/);
  assert.match(step.cost,/10 Mithril and 3 Mythic Gear/);
});
