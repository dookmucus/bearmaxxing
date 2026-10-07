import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reportTemplate,validateReports} from '../scripts/bear-report-validation.mjs';
import {HOST_SCENARIOS} from '../src/bear-comparison.mjs';
import {auditHostMechanics} from '../scripts/audit-host-mechanics.mjs';
const audit=JSON.parse(fs.readFileSync(new URL('../audits/handoff-replay-2026-10-06/replay.json',import.meta.url)));
function fixture(){
 const data=reportTemplate(audit);
 data.reports=data.reports.map((r,i)=>({...r,id:`synthetic-${i}`,blockId:'synthetic-block-1',timestamp:`2026-10-06T20:0${i}:00Z`,captainId:'captain-anonymous',target:{kind:'bear',eventId:'synthetic-event',rules:'synthetic-rules',rounds:10},metric:{kind:'captain_damage',value:[100,99,98][i]},profileMatch:{...r.profileMatch,confirmed:true,evidence:['synthetic fixture only; not observed game data']},hostingSkillsVerified:true,unchangedControls:{gear:true,masters:true,pets:true,researchGovernor:true},captainTroops:structuredClone(data.expected.captainTroops),participants:[],selectedJoiningSkills:[],selectionVerified:true,activeBuffs:{complete:true,items:[]},reportStats:{layer:'effective-rally-report',infantry:{attack:800,lethality:700},cavalry:{attack:900,lethality:800},archer:{attack:1000,lethality:900}},scoreBonuses:{personalPoints:27},evidence:['synthetic report, not an in-game screenshot']}));
 return data;
}
test('template expected progression is separate from unknown observations; blanks never match as zeros',()=>{
 const data=reportTemplate(audit),before=structuredClone(audit),result=validateReports(data,audit);
 assert.equal(data.expected.hostingProgression.Yang.starStep,22);assert.equal(data.reports[0].captainTroops,null);
 assert.ok(result.pairs.every(p=>!p.matched&&p.observedRatio===null&&p.model===null));assert.deepEqual(audit,before);
});
test('matched captain reports compare relative model scenarios without injecting effective report stats or changing inputs',()=>{
 const data=fixture(),before=structuredClone(data),result=validateReports(data,audit),pair=result.pairs.find(p=>p.heroes.join('/')==='Yang/Rosa');
 assert.equal(pair.matched,true);assert.equal(pair.observedRatio,.99);assert.equal(pair.model.status,'conditional-relative-comparison');
 assert.equal(pair.model.centralRatio,audit.comparison.find(r=>r.heroes[2]==='Rosa').damage/audit.comparison.find(r=>r.heroes[2]==='Yang').damage);
 assert.match(pair.model.limits,/second time/);assert.equal(result.summaries[0].conclusion,'Insufficient repeated matched rallies');assert.deepEqual(data,before);
});
test('participants, accepted troop counts, active buffs, selected joining skills and scopes are independently checked',()=>{
 for(const [name,change,pattern] of [
  ['troops',r=>r.captainTroops[2].count--,/troop composition|captain troops/],
  ['participants',r=>r.participants=[{id:'joiner-a',troops:[{troop:'archer',tier:10,tg:6,count:20000}]}],/participants/],
  ['buffs',r=>r.activeBuffs.items=[{name:'Attack boost',value:20}],/active buffs/],
  ['metric',r=>r.metric.kind='rally_damage',/metric scopes/],
  ['unknown',r=>r.selectionVerified=null,/joining skills/],
  ['unknown buff',r=>r.activeBuffs.items=[{name:'Attack',value:null}],/Active buffs/],
  ['unknown score',r=>r.scoreBonuses={points:null},/Score-only/]
 ]){const data=fixture();change(data.reports[1]);const pair=validateReports(data,audit).pairs.find(p=>p.heroes.join('/')==='Yang/Rosa');assert.equal(pair.matched,false,name);assert.equal(pair.observedRatio,null);assert.ok(pair.flags.some(f=>pattern.test(f)),name);}
});
test('identical incoming skills permit an observed comparison but cannot silently cancel from the model',()=>{
 const data=fixture();for(const r of data.reports){r.participants=[{id:'joiner-a',troops:[{troop:'archer',tier:10,tg:6,count:20000}]}];r.selectedJoiningSkills=[{participantId:'joiner-a',hero:'Chenko',slot:1,level:5}];}
 let pair=validateReports(data,audit).pairs[0];assert.equal(pair.matched,true);assert.equal(pair.model.status,'conditional-relative-comparison');assert.match(pair.model.limits,/replayed separately/);
 data.reports[1].selectedJoiningSkills[0].hero='Amane';pair=validateReports(data,audit).pairs[0];assert.equal(pair.matched,false);assert.ok(pair.flags.some(f=>f.includes('Different selected')));
});
test('whole rally damage is never benchmarked as captain march damage',()=>{
 const data=fixture();for(const r of data.reports)r.metric.kind='rally_damage';const pair=validateReports(data,audit).pairs[0];assert.equal(pair.matched,true);assert.equal(pair.model.status,'withheld');assert.match(pair.model.reason,/aggregate damage/);
});
test('reused blocks/duplicate report IDs do not inflate repeat evidence; different rules prevent matching',()=>{
 const data=fixture();data.reports.push({...structuredClone(data.reports[0]),id:'synthetic-new'});const result=validateReports(data,audit);assert.ok(result.pairs.filter(p=>p.heroes.includes('Yang')).every(p=>!p.matched));
 const d=fixture();d.reports[1].id=d.reports[0].id;assert.ok(validateReports(d,audit).pairs.every(p=>p.heroes.includes('Yang')||p.heroes.includes('Rosa')?!p.matched:true));
 const e=fixture();e.reports[1].target.rules='different-patch';assert.ok(validateReports(e,audit).pairs[0].flags.some(f=>f.includes('Different Bear')));
});
test('repeated distinct matched blocks get descriptive summaries, never a winner or confidence from scenario counts',()=>{
 const data=fixture();data.reports.push(...structuredClone(data.reports).map(r=>({...r,id:r.id+'-second',blockId:'synthetic-block-2'})));
 const result=validateReports(data,audit);assert.equal(result.summaries[0].matchedBlocks,2);assert.match(result.summaries[0].conclusion,/no automatic winner/);
});
test('isolated mechanics audit reproduces production class totals and distinguishes reversals from generic uncertainty',()=>{
 const before=JSON.stringify(audit.profileSnapshot),scenarios=structuredClone(HOST_SCENARIOS),r=auditHostMechanics(audit);assert.deepEqual(HOST_SCENARIOS,scenarios);
 assert.equal(r.volleySweep.find(c=>c.probability===.05).winner,'Vivian');assert.equal(r.volleySweep.find(c=>c.probability===.075).winner,'Yang');assert.equal(r.changes.find(c=>c.id==='trap-phase-3').centralWinner,'Vivian');assert.equal(r.changes.find(c=>c.id==='rosa-shared-attack').centralWinner,'Yang');
 assert.equal(r.changes.find(c=>c.id==='vivian-trap-precedence').changedWinners.length,0);
 assert.ok(r.howlingAlgebra.every(a=>a.reversalWithinSingleHowlingBound===false));
 assert.ok(r.decompositions.every(d=>d.sameStatWidgetCollision===false));
 assert.equal(JSON.stringify(audit.profileSnapshot),before);
});
