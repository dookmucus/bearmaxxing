import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enteredRosterProfile as emptyProfile} from './helpers/entered-roster.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {accountEffects,calculate} from '../src/calculator.mjs';
import {optimizeMarchPlan,assembleJoiningSquads} from '../src/joint-plan.mjs';
import {joiningRole,roleCapacity,compareJoiningFillers} from '../src/hero-roles.mjs';
import {heroContributions} from '../src/hero-effects.mjs';
import {heroIdentity} from '../src/host-comparison.mjs';
import {joiningHeroCopy} from '../src/results-copy.mjs';
function ready(){
 const p=emptyProfile();
 const owned=['Helga','Amadeus','Howard','Forrest','Petra','Chenko','Gordon','Fahd','Jabel','Rosa','Amane','Yeonwoo','Diana','Vivian'];
 for(const h of p.heroes){h.owned=owned.includes(h.name);h.included=['Helga','Amadeus','Petra','Chenko','Rosa','Amane','Yeonwoo','Vivian'].includes(h.name);}
 p.heroes.find(h=>h.name==='Chenko').skillLevels[1]=1;p.heroes.find(h=>h.name==='Chenko').skillLevelSource[1]='user-confirmed';
 p.capacityPlanningModel='shared-maximum';p.troopsPerMarch=100003;
 for(const t of ['infantry','cavalry','archer'])p.troops[t].count=1000000;
 return p;
}
const hero=(p,name)=>p.heroes.find(h=>h.name===name);
const names=o=>({host:o.host?.team.map(e=>e.hero.name)??[],joins:o.leaders.map(l=>l.hero.name)});
test('joint role search maximizes hosting damage among legal plans while retaining dynamic role swaps',()=>{
 const p=ready(),before=structuredClone(p),r=optimizeMarchPlan(p,accountEffects(p));
 assert.ok(r.evaluated>1);assert.ok(r.selected);
 const comparable=r.comparisons.filter(o=>!o.metrics.unknownSignature&&o.host.bear.modeledDamage!=null);
 assert.equal(r.selected.host.bear.modeledDamage,Math.max(...comparable.map(o=>o.host.bear.modeledDamage)));
 for(const name of ['Amadeus','Chenko']){assert.ok(r.comparisons.some(o=>names(o).host.includes(name)));assert.ok(r.comparisons.some(o=>names(o).joins.includes(name)));}
 assert.ok(r.comparisons.some(o=>names(o).joins.includes('Vivian')));assert.ok(r.comparisons.some(o=>names(o).joins.includes('Amane')));
 assert.equal(r.overallWinner,false);assert.deepEqual(p,before);
});
test('every retained plan has four legal trios, twelve distinct heroes and no equipment reuse',()=>{
 const p=ready(),r=optimizeMarchPlan(p,accountEffects(p));
 for(const option of r.frontier){
  const squads=[option.assignment.host,...option.assignment.joins.map(j=>j.heroes)];
  assert.equal(squads.length,4);
  for(const squad of squads){assert.equal(squad.length,3);assert.deepEqual(squad.map(h=>h.troop).sort(),['archer','cavalry','infantry']);assert.ok(squad.every(h=>h.owned&&h.marchAvailable!==false));}
  const ids=squads.flat().map(heroIdentity);assert.equal(new Set(ids).size,12);
  const gear=option.host.team.flatMap(e=>e.gear).map(g=>g.id);assert.equal(new Set(gear).size,gear.length);
 }
 const joining=calculate(p,'joining'),hosting=calculate(p,'hosting');
 assert.deepEqual(joining.plan.assignment.host,hosting.team.map(e=>e.hero));
 assert.ok(joining.plan.marches.every(m=>m.capacity===null&&m.available===null));assert.equal(joining.plan.needed,null);
 for(const t of ['infantry','cavalry','archer'])assert.equal(joining.plan.remaining[t],p.troops[t].count);
});
test('saved joining names do not reserve or force heroes and explicit all-march exclusions win',()=>{
 const p=ready();p.joiners=[{name:'Chenko'},{name:'Chenko'},{name:'Unavailable legacy name'}];
 hero(p,'Chenko').marchAvailable=false;hero(p,'Chenko').provenance.marchAvailable='user-confirmed';
 const r=optimizeMarchPlan(p,accountEffects(p));assert.ok(r.selected);
 for(const o of r.frontier)assert.ok(![...o.assignment.host,...o.assignment.joins.flatMap(j=>j.heroes)].some(h=>h.name==='Chenko'));
 assert.ok(calculate(p,'hosting').team);assert.ok(!calculate(p,'hosting').missing.length);
 hero(p,'Amane').included=false;assert.ok(joiningRole(hero(p,'Amane')).effects.length); // Host-only exclusion.
 hero(p,'Amane').owned=false;assert.ok(joiningRole(hero(p,'Amane')).rejection);
});
test('joining roles use only first-skill entered or derived values, preserving distinct effect types and unresolved mechanics',()=>{
 const p=ready(),v=hero(p,'Vivian');v.skillLevels[1]=3;v.skillLevelSource[1]='user-confirmed';
 const role=joiningRole(v);assert.equal(role.effects[0].stat,'damageTaken');assert.equal(role.effects[0].value,15);assert.equal(role.coverageComplete,false);assert.match(role.effects[0].mechanics.join(' '),/damage-taken stacking/);
 const a=hero(p,'Amadeus');a.widget=10;a.skillLevels[2]=5;a.skillLevels[3]=5;
 const first=joiningRole(a);assert.deepEqual(first.effects.map(e=>e.stat),['lethality']);assert.equal(first.effects[0].value,25);
 a.widget=0;a.skillLevels[2]=0;a.skillLevels[3]=0;assert.deepEqual(joiningRole(a).effects,first.effects);
 a.skillLevels[1]=2;a.skillLevelSource[1]='user-confirmed';assert.equal(joiningRole(a).effects[0].value,10);
 delete a.skillLevels[1];delete a.skillLevelSource[1];assert.equal(joiningRole(a).assumed,true);assert.equal(joiningRole(a).effects[0].value,25);
 const r=optimizeMarchPlan(p,accountEffects(p));assert.equal(r.overallWinner,false);assert.ok(r.alternatives.some(o=>o.leaders.some(l=>l.hero.name==='Vivian')));
 assert.ok(r.alternatives.filter(o=>o.leaders.some(l=>l.hero.name==='Vivian')).every(o=>!o.coverageComplete));
});
test('unmapped first skill never becomes a zero offer; missing host mapping does not disqualify a supported joining role',()=>{
 const p=ready(),a=hero(p,'Amadeus');a.widget=8;
 assert.ok(joiningRole(a).effects.length);
 const v=hero(p,'Vivian');v.starStep=13;v.skillLevels[1]=2;v.skillLevelSource[1]='user-confirmed';
 const role=joiningRole(v);assert.ok(role.rejection);assert.equal(role.effects.length,0);
 const r=optimizeMarchPlan(p,accountEffects(p));assert.ok(r.leaderGaps.some(l=>l.hero.name==='Vivian'));assert.equal(r.overallWinner,false);
 // A relevant missing hosting widget value remains unknown; it is not reused as a joining stat.
 hero(p,'Petra').widget=null;assert.equal(heroContributions(hero(p,'Petra')).widgetRallyAttack,null);
 assert.ok(joiningRole(hero(p,'Petra')).effects.length);
});
test('equivalent fillers are swap ties; hosting stats and later skills do not affect their selection',()=>{
 const p=ready(),r=optimizeMarchPlan(p,accountEffects(p)),row=r.selected.assignment.joins[0],filler=row.heroes[1];
 assert.ok(row.equivalent[1].length);
 const before=row.heroes.map(h=>h.id);
 filler.widget=10;filler.advancedAttack=999;filler.skillLevels={1:0,2:5,3:5};
 const after=assembleJoiningSquads(p,r.selected.host.team,r.selected.leaders).joins[0];
 assert.deepEqual(after.heroes.map(h=>h.id),before);
 const copy=joiningHeroCopy(filler,1,row.equivalent[1],false,null,false);
 assert.match(copy.summary,/Adds [\d,]+ troops\./);assert.match(copy.detail,/^Can be substituted with /);
});
test('fillers maximize known capacity across simultaneous squads without changing reserved roles',()=>{
 const p=emptyProfile(),names=['Helga','Petra','Diana','Amane','Yeonwoo','Quinn','Howard','Forrest','Seth','Fahd','Jabel','Gordon','Edwin'];
 p.heroes=p.heroes.filter(h=>names.includes(h.name));
 for(const h of p.heroes){h.owned=true;h.included=true;h.marchAvailable=true;h.level=80;}
 const get=name=>p.heroes.find(h=>h.name===name);
 get('Fahd').level=1;get('Gordon').level=70;get('Edwin').level=60;
 const host=['Helga','Petra','Diana'].map(get),leaders=['Amane','Yeonwoo','Quinn'].map(name=>({hero:get(name),id:heroIdentity(get(name)),effects:[]}));
 const before=structuredClone(p),assignment=assembleJoiningSquads(p,host,leaders);
 const cavalry=assignment.joins.flatMap(row=>row.heroes.slice(1)).filter(h=>h.troop==='cavalry');
 assert.deepEqual(cavalry.map(h=>h.name),['Jabel','Gordon','Edwin']);
 assert.equal(cavalry.reduce((sum,h)=>sum+roleCapacity(h),0),38910);
 assert.equal(new Set([...assignment.host,...assignment.joins.flatMap(row=>row.heroes)].map(heroIdentity)).size,12);
 assert.deepEqual(assignment.joins.map(row=>row.heroes[0].name),['Amane','Yeonwoo','Quinn']);
 assert.deepEqual(p,before);
 const reserved=assembleJoiningSquads(p,[get('Helga'),get('Jabel'),get('Diana')],leaders);
 assert.ok(!reserved.joins.flatMap(row=>row.heroes).some(h=>h.name==='Jabel'));
 get('Gordon').level=39;
 assert.equal(roleCapacity(get('Gordon')),null);
 assert.deepEqual(assembleJoiningSquads(p,host,leaders).joins.flatMap(row=>row.heroes.slice(1)).filter(h=>h.troop==='cavalry').map(h=>h.name),['Jabel','Edwin','Fahd']);
 get('Fahd').level=80;
 assert.equal(compareJoiningFillers(get('Fahd'),get('Jabel')),heroIdentity(get('Fahd')).localeCompare(heroIdentity(get('Jabel'))));
});
test('migration archives automatic reservations without changing inputs, configuration or explicit exclusions',()=>{
 const p=ready();p.activeBearPlanVersion=1;p.actualMarchCapacities={host:120000,joins:[90000,80000,70000]};p.differentMarchCapacities=true;
 p.ratios={infantry:20,cavalry:20,archer:60};p.joiners=[{name:'Chenko',capacity:90000},{name:'Amane',capacity:80000},{name:'Yeonwoo',capacity:70000}];
 const h=hero(p,'Chenko');h.marchAvailable=false;h.provenance.marchAvailable='user-confirmed';
 const amane=hero(p,'Amane');amane.included=false;amane.provenance.included='automatic-reservation';amane.marchAvailable=true;
 const before=structuredClone(p),m=migrateProfile(p);
 assert.deepEqual(m.joiners,p.joiners);assert.deepEqual(m.legacyAutomaticReservations.joiners,p.joiners);assert.deepEqual(m.ratios,{infantry:10,cavalry:10,archer:80});assert.deepEqual(m.legacyTroopPlanning.ratios,p.ratios);assert.deepEqual(m.actualMarchCapacities,p.actualMarchCapacities);
 assert.equal(hero(m,'Chenko').marchAvailable,false);assert.equal(hero(m,'Amane').included,true);
 for(const name of ['Chenko','Amane','Yeonwoo']){assert.deepEqual(hero(m,name).skillLevels,hero(p,name).skillLevels);assert.equal(hero(m,name).widget,hero(p,name).widget);}
 assert.deepEqual(m.gear,p.gear);assert.deepEqual(migrateProfile(m),m);assert.deepEqual(p,before);
});
test('insufficient class inventory produces an explicit incomplete plan without overlapping heroes',()=>{
 const p=ready();for(const h of p.heroes.filter(h=>h.troop==='infantry').slice(3))h.owned=false;
 const r=optimizeMarchPlan(p,accountEffects(p));assert.ok(r.selected);assert.ok(r.selected.assignment.joins.some(row=>row.heroes.some(h=>!h)));
 const plan=calculate(p,'joining').plan;assert.ok(plan);
 const ids=plan.marches.flatMap(m=>m.heroes.filter(Boolean)).map(heroIdentity);assert.equal(new Set(ids).size,ids.length);
});
test('conflicting available canonical records block the joint search instead of choosing a duplicate filler',()=>{
 const p=ready(),duplicate={...hero(p,'Howard'),id:'conflicting-howard',included:false,name:'Renamed duplicate'};
 p.heroes.push(duplicate);
 const r=optimizeMarchPlan(p,accountEffects(p));assert.equal(r.selected,null);assert.match(r.blockingValidation.join(' '),/duplicate available hero/);
 const joining=calculate(p,'joining');assert.ok(!joining.plan);assert.match(joining.missing.join(' '),/duplicate available hero/);
 duplicate.owned=false;assert.ok(optimizeMarchPlan(p,accountEffects(p)).selected);
});
test('different unresolved host effects remain explicit comparisons rather than being erased by a scalar index',()=>{
 const p=ready(),r=optimizeMarchPlan(p,accountEffects(p));
 const leaderIds=r.selected.leaders.map(l=>l.id).sort().join(',');
 const sameLeaders=r.comparisons.filter(o=>o.leaders.map(l=>l.id).sort().join(',')===leaderIds);
 assert.ok(sameLeaders.some(o=>o.metrics.signature!==r.selected.metrics.signature));
 assert.ok(sameLeaders.every(o=>o.host.bear.effects.length>0));
 assert.ok(sameLeaders.every(o=>!o.coverageComplete));assert.equal(r.overallWinner,false);
});
test('legacy march slots cannot block recommendations or alter saved heroes',()=>{
 const p=ready(),before=structuredClone(p.heroes),initial=optimizeMarchPlan(p,accountEffects(p));assert.ok(initial.canRecommend);
 p.marchSlots=3;const active=optimizeMarchPlan(p,accountEffects(p));assert.equal(active.selected.key,initial.selected.key);assert.deepEqual(active.blockingValidation,[]);assert.ok(active.canRecommend);
 p.marchSlots=4;assert.equal(optimizeMarchPlan(p,accountEffects(p)).selected.key,initial.selected.key);assert.deepEqual(p.heroes,before);
});
