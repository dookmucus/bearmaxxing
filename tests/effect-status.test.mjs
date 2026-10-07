import {test} from 'node:test';
import assert from 'node:assert/strict';
import {heroContributions} from '../src/hero-effects.mjs';
import {skillInfo,widgetInfo,effectStatusInfo} from '../src/hero-tooltips.mjs';
import {commonSkillInfo} from '../src/hero-skills-control.mjs';
import {SKILL_UNLOCKS} from '../src/hero-skill-unlocks.mjs';
import {gearProgression} from '../src/gear-progression.mjs';
const hero=(name,widget=5)=>({name,troop:name==='Petra'?'cavalry':['Rosa','Yang'].includes(name)?'archer':'infantry',starStep:31,widget,skillLevels:{1:5,2:5,3:5},skillLevelSource:{1:'user-confirmed',2:'user-confirmed',3:'user-confirmed'}});
const status=(c,id)=>c.effectStatuses.find(e=>e.id===id);
test('documented widget stages 8 and 9 preserve Lethality and add their hosting rally bonus',()=>{
 for(const name of ['Petra','Rosa','Yang'])for(const level of [8,9]){
  const h=hero(name,level),before=structuredClone(h),c=heroContributions(h);
  const field=name==='Petra'?'widgetRallyAttack':'widgetRallyLethality';
  assert.equal(c[field],12.5);assert.equal(status(c,field).status,'modeled');
  assert.match(status(c,field).source,/kingshotcommand.com/);
  assert.ok(c.widgetLethality>0);assert.doesNotMatch(widgetInfo(h,c),/prevents comparison/);
  assert.equal(c.offenseCoverageComplete,false);assert.deepEqual(h,before);
 }
});
test('known modeled, unresolved mechanics and irrelevant effects remain distinct',()=>{
 const z=hero('Zoe'),c=heroContributions(z);
 assert.equal(c.sharedAttack,25);assert.equal(status(c,'skill-2').status,'modeled');
 assert.match(skillInfo(z,null,2),/Charisma: \+25% shared Attack/);
 assert.match(skillInfo(z,null,1),/Sundering Wound affects targets other than Bear.*does not contribute/);
 assert.doesNotMatch(widgetInfo(z,c),/Dark Lady/);
 assert.match(effectStatusInfo(z,c.effectStatuses.find(e=>e.status==='irrelevant'&&e.name==='Dark Lady')),/affects Attack while defending/);
 const r=hero('Rosa');assert.match(skillInfo(r,null,3),/Golden Rhythm.*\+30% Archer Attack.*additive versus multiplicative Attack stacking.*excluded/);
 const v=hero('Vivian');assert.match(skillInfo(v,null,1),/Crouching Tiger.*\+25% enemy damage taken.*enemy damage-taken stacking/);
 assert.doesNotMatch(widgetInfo(v,heroContributions(v)),/Money Driven/);
 assert.match(effectStatusInfo(v,heroContributions(v).effectStatuses.find(e=>e.status==='irrelevant'&&e.name==='Money Driven')),/affects Defense while defending/);
});
test('only explicit verified unlock requirements are displayed; zero saved skill is not locked',()=>{
 SKILL_UNLOCKS['Unlock fixture']={1:{limits:{7:0},unlockAt:{starStep:13}},2:{limits:{7:2}}};
 try{
  const h={name:'Unlock fixture',starStep:7,skillLevels:{2:0},skillLevelSource:{2:'user-confirmed'}};
  assert.match(skillInfo(h,null,1),/unlocks at 2★/);
  assert.equal(status(heroContributions(h),'skill-2').status,'not_upgraded');
  delete SKILL_UNLOCKS['Unlock fixture'][1].unlockAt;
  assert.match(skillInfo(h,null,1),/no verified unlock requirement/);
 }finally{delete SKILL_UNLOCKS['Unlock fixture'];}
 const p=hero('Petra',1),c=heroContributions(p);
 assert.equal(status(c,'widgetRallyAttack').status,'locked');
 assert.match(widgetInfo(p,c),/Cosmic Eye’s shared Attack bonus unlocks at widget level 2/);
 assert.ok(c.widgetLethality>0);
});
test('derived skill assumptions stay labeled and explicit levels are preserved',()=>{
 const h=hero('Zoe');h.skillLevels={2:3};h.skillLevelSource={2:'user-confirmed'};
 const before=structuredClone(h);assert.match(skillInfo(h,null,2),/skill level 3/);assert.doesNotMatch(skillInfo(h,null,2),/assumed/);
 assert.equal(status(heroContributions(h),'skill-1').status,'irrelevant');
 const rosa=hero('Rosa');rosa.skillLevels={2:3};rosa.skillLevelSource={2:'user-confirmed'};assert.match(skillInfo(rosa,null,3),/skill level assumed/);assert.deepEqual(h,before);
});
test('gear confirmation input and unresolved stacking have separate statuses; known contributions survive',()=>{
 const g={troop:'archer',slot:'helmet',quality:'red',enhancement:120,forge:11};
 const before=structuredClone(g),pending=gearProgression(g);
 assert.equal(pending.effectStatuses[0].status,'missing_input');assert.ok(pending.lethality>0);
 const max=gearProgression({...g,enhancement:200,imbuementConfirmed:{200:true}});
 assert.equal(max.effectStatuses[0].status,'unresolved_mechanics');assert.equal(max.effectStatuses[0].value,50);
 assert.equal(max.attack,20);assert.ok(max.lethality>0);assert.deepEqual(g,before);
});

test('unequipped widgets have no field tooltip regardless of provenance; unknown is not zero',()=>{
 for(const value of [0,'0'])for(const provenance of ['assumed','user-confirmed','imported']){
  const h={...hero('Zoe',value),provenance:{widget:provenance}},before=structuredClone(h);
  assert.equal(widgetInfo(h,heroContributions(h)),'');assert.deepEqual(h,before);
 }
 const h=hero('Zoe',null);assert.match(widgetInfo(h,heroContributions(h)),/Enter widget level.*prevents comparison/);
});
test('zero skills omit the field tooltip while positive and unresolved effects remain named',()=>{
 const h={...hero('Zoe'),skillLevels:{1:0,2:0,3:0}},before=structuredClone(h);
 assert.equal(commonSkillInfo(h,(hero,slot)=>skillInfo(hero,null,slot)),'');
 assert.deepEqual(h,before);
 h.skillLevels[2]=3;
 assert.match(commonSkillInfo(h,(hero,slot)=>skillInfo(hero,null,slot)),/Charisma: \+15% shared Attack/);
 h.skillLevels[1]=1;
 assert.match(commonSkillInfo(h,(hero,slot)=>skillInfo(hero,null,slot)),/Charisma/);assert.doesNotMatch(commonSkillInfo(h,(hero,slot)=>skillInfo(hero,null,slot)),/Sundering Wound/);
});
