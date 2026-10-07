import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enteredRosterProfile as emptyProfile} from './helpers/entered-roster.mjs';
import {accountEffects} from '../src/calculator.mjs';
import {evaluateHostTrio} from '../src/host-comparison.mjs';
import {withHostingReuse,hostingReuseContext,retainHosting} from '../src/hosting-reuse.mjs';
const setup=()=>{const profile=emptyProfile();return {profile,heroes:['Zoe','Petra','Yang'].map(name=>profile.heroes.find(h=>h.name===name)),account:accountEffects(profile)};};
test('identical snapshot hosting work is shared only during one recommendation call',()=>{
 const {profile,heroes,account}=setup(),model=evaluateHostTrio(profile,heroes,account);assert.ok(model);
 withHostingReuse(profile,account,[model],()=>{
  assert.equal(evaluateHostTrio(profile,heroes,account),model);
  const benchEdit={...profile,heroes:[...profile.heroes,{id:'bench-extra',name:'Unmapped',troop:'archer'}]};
  assert.equal(evaluateHostTrio(benchEdit,heroes,account),model);
 });
 assert.equal(hostingReuseContext(profile,account),null);
 assert.notEqual(evaluateHostTrio(profile,heroes,account),model);
});
test('hero, gear, account, formation and baseline changes bypass cached hosting models',()=>{
 const {profile,heroes,account}=setup(),model=evaluateHostTrio(profile,heroes,account);
 const cases=[{profile,heroes:[heroes[0],heroes[1],{...heroes[2],widget:Number(heroes[2].widget)+1}],account},
 {profile:{...profile,gear:profile.gear.map(g=>({...g,forge:Number(g.forge)+1}))},heroes,account},
 {profile,heroes,account:{...account,attack:account.attack+1}},
 {profile:{...profile,ratios:{infantry:20,cavalry:10,archer:70}},heroes,account},
 {profile:{...profile,stats:{...profile.stats,archer:{...profile.stats.archer,attack:123}}},heroes,account}];
 for(const c of cases){const fresh=evaluateHostTrio(c.profile,c.heroes,c.account);
  withHostingReuse(profile,account,[model],()=>{const cached=evaluateHostTrio(c.profile,c.heroes,c.account);assert.notEqual(cached,model);assert.equal(cached?.bear.modeledDamage,fresh?.bear.modeledDamage);assert.deepEqual(cached?.bear.objectiveMissing,fresh?.bear.objectiveMissing);});
 }
});
test('reuse is bounded and scopes are released even when recommendation calculation fails',()=>{
 const {profile,account}=setup();let scope;
 assert.throws(()=>withHostingReuse(profile,account,[],()=>{
  scope=hostingReuseContext(profile,account);
  for(let i=0;i<300;i++)retainHosting(scope,[{id:i},{id:i+300},{id:i+600}],{id:i});
  assert.equal(scope.models.size,256);throw new Error('expected failure');
 }),/expected failure/);
 assert.equal(scope.models.size,0);assert.equal(hostingReuseContext(profile,account),null);
});
