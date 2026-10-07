import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enteredRosterProfile as emptyProfile} from './helpers/entered-roster.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {applySkillDefaults,effectiveSkillLevel,SKILL_UNLOCKS} from '../src/hero-skill-unlocks.mjs';
import {commonSkillInfo} from '../src/hero-skills-control.mjs';
import {calculationDiagnostics} from '../src/calculation-diagnostics.mjs';
import {calculate,accountEffects} from '../src/calculator.mjs';
import {actionableImprovements,hostingChoiceExplanation} from '../src/results-improvements.mjs';
import {GEAR_SLOT_EFFECTS,gearProgression} from '../src/gear-progression.mjs';
const ready=()=>migrateProfile(emptyProfile());
test('missing named skills derive assumptions consistently without replacing explicit values',()=>{
 const h={name:'Zoe',starStep:31,skillLevels:{1:'2',3:0},skillLevelSource:{1:'imported',3:'user-confirmed'}};
 const before=structuredClone(h),derived=applySkillDefaults(h);
 assert.equal(derived.skillLevels[1],'2');assert.equal(derived.skillLevels[3],0);
 assert.equal(derived.skillLevels[2],5);assert.equal(derived.skillLevelSource[2],'assumed');
 assert.match(commonSkillInfo(derived,()=>''),/Charisma: level 5 \(assumed\)/);assert.deepEqual(h,before);
 const lower=applySkillDefaults({...derived,starStep:19});assert.equal(lower.skillLevels[2],4);assert.equal(lower.skillLevels[1],'2');
 const unknown=applySkillDefaults({name:'Zoe',starStep:13,skillLevels:{2:2},skillLevelSource:{2:'user-confirmed'}});
 assert.equal(unknown.skillLevels[2],2);assert.equal(effectiveSkillLevel(unknown,2).level,null);
});
test('verified per-skill checkpoint overrides a broader planning threshold',()=>{
 const record=SKILL_UNLOCKS.Zoe[2];try{
  SKILL_UNLOCKS.Zoe[2]={limits:{19:2},source:'verified fixture'};
  const result=applySkillDefaults({name:'Zoe',starStep:19,skillLevels:{},skillLevelSource:{}});
  assert.equal(result.skillLevels[2],2);assert.equal(result.skillLevelSource[2],'assumed');
 }finally{SKILL_UNLOCKS.Zoe[2]=record;}
});
test('diagnostics copy the full relevant current profile and derived skills without leaking unrelated fields',()=>{
 const p=ready(),zoe=p.heroes.find(h=>h.name==='Zoe');zoe.skillLevels={};zoe.skillLevelSource={};
 const master=p.masters.find(m=>m.name==='Roman');master.squadBonus=12.34;master.affinityLevel=87;master.skillLevels={1:3,2:4};master.notes='PRIVATE_MASTER';
 const pet=p.pets.find(p=>p.name==='Gray Wolf');pet.level=9;pet.refinement={infantry:1,cavalry:2,archer:3};pet.notes='PRIVATE_PET';
 p.troops.archer={count:654321,tier:11,tg:5,notes:'PRIVATE_TROOPS'};p.marchSizeByType={infantry:12000,cavalry:12000,archer:96000};
 p.stats.archer={attack:345,lethality:678};p.playerId='PRIVATE_PLAYER';p.apiKey='PRIVATE_KEY';
 const before=structuredClone(p),d=calculationDiagnostics(p);
 assert.equal(d.version,4);assert.equal(d.masters.find(m=>m.name==='Roman').squadBonus,12.34);
 assert.equal(d.pets.find(p=>p.name==='Gray Wolf').refinement.archer,3);
 assert.deepEqual(d.troops.archer,{count:654321,tier:11,tg:5});assert.equal(d.marchPlanning.deploymentCount,null);assert.deepEqual(d.marchPlanning.formation,{infantry:10,cavalry:10,archer:80});assert.equal(d.marchPlanning.hostingAndJoining.groups,4);
 assert.equal(d.combatBaselines.archer.attack,345);
 const skill=d.heroes.find(h=>h.referenceName==='Zoe').effectiveSkills.find(s=>s.slot===2);
 assert.equal(skill.entered,null);assert.equal(skill.level,5);assert.equal(skill.source,'assumed');
 assert.deepEqual(d.sharedEffects.hosting,accountEffects(p,'hosting'));
 for(const secret of ['PRIVATE_MASTER','PRIVATE_PET','PRIVATE_TROOPS','PRIVATE_PLAYER','PRIVATE_KEY'])assert.ok(!JSON.stringify(d).includes(secret));
 assert.deepEqual(p,before);
});
test('all twelve slots follow verified effects and ordinary health upgrades never become Bear priorities',()=>{
 const p=ready();for(const g of p.gear){g.quality='gold';g.enhancement=50;g.forge=4;}
 const results={hosting:calculate(p,'hosting'),upgrades:calculate(p,'upgrades')};
 for(const troop of ['infantry','cavalry','archer'])for(const slot of ['helmet','boots','gloves','armor']){
  const piece=p.gear.find(g=>g.troop===troop&&g.slot===slot),before=gearProgression(piece),after=gearProgression({...piece,forge:5});
  assert.equal(GEAR_SLOT_EFFECTS[troop][slot].ordinary,['helmet','boots'].includes(slot)?'lethality':'health');
  assert.equal(after.lethality>before.lethality,['helmet','boots'].includes(slot));
 }
 assert.ok(results.upgrades.gearSteps.some(s=>s.gearId==='set-archer-boots'));
 assert.ok(results.upgrades.gearSteps.every(s=>!['gloves','armor'].includes(s.targetProgression.slot)));
 const suggestions=actionableImprovements(p,results,accountEffects);
 assert.ok(suggestions.length>=3&&suggestions.length<=5);assert.ok(suggestions.every(s=>!s.id.includes('gloves')&&!s.id.includes('armor')));
});
test('Results uses Masters and Pets inputs and explains Zoe shared Attack versus Long Fei without damage claims',()=>{
 const p=ready();for(const h of p.heroes)h.included=['Zoe','Long Fei','Petra','Rosa'].includes(h.name);
 const zoe=p.heroes.find(h=>h.name==='Zoe');zoe.skillLevels={2:5};zoe.skillLevelSource={2:'user-confirmed'};
 const host=calculate(p,'hosting');const entry=host.team.find(e=>e.hero.name==='Zoe');assert.ok(entry);
 const why=hostingChoiceExplanation(entry,host);assert.match(why.summary,/shared Attack/);assert.match(why.detail,/inherent Infantry Attack/);assert.match(why.detail,/could change/);
 const valora=p.masters.find(m=>m.name==='Valora');valora.talentLevel=2;
 const wolf=p.pets.find(p=>p.name==='Gray Wolf');wolf.level=5;
 const rhino=p.pets.find(p=>p.name==='Giant Rhino');rhino.level=5;
 const roman=p.masters.find(m=>m.name==='Roman');roman.squadBonus=12;
 const changed=calculate(p,'hosting');assert.ok(changed.index>host.index);
 const suggestions=actionableImprovements(p,{hosting:changed,upgrades:calculate(p,'upgrades')},accountEffects);
 assert.ok(suggestions.some(s=>s.resource==='Pet food'&&s.id===`${rhino.id}-passive`));
 assert.ok(!suggestions.some(s=>s.id===`${wolf.id}-passive`));
 assert.ok(suggestions.every(s=>s.target&&s.reason&&s.resource));
});
