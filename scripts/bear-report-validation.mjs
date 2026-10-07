import {hostBearComparison} from '../src/bear-comparison.mjs';
import {evaluateHostTrio} from '../src/host-comparison.mjs';
import {accountEffects} from '../src/calculator.mjs';
import {incomingEffects} from '../src/hosting-incoming.mjs';
// Local research tool. No UI, network, saved-profile writes or calibration fit.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const TYPES=['infantry','cavalry','archer'],HERO_ORDER=['Yang','Rosa','Vivian'];
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const hasUnknown=x=>x==null||typeof x==='number'&&!Number.isFinite(x)||typeof x==='string'&&!x.trim()||Array.isArray(x)&&x.some(hasUnknown)||x&&typeof x==='object'&&Object.values(x).some(hasUnknown);
const canonical=x=>JSON.stringify(normalize(x));
function normalize(x){if(Array.isArray(x))return x.map(normalize);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])]));return x;}
const sorted=items=>[...items].map(normalize).sort((a,b)=>canonical(a).localeCompare(canonical(b)));
const snapshotHash=audit=>createHash('sha256').update(JSON.stringify(audit.profileSnapshot)).digest('hex');
function validTroops(rows){return Array.isArray(rows)&&rows.length>0&&rows.every(r=>r&&TYPES.includes(r.troop)&&Number.isInteger(r.tier)&&r.tier>=1&&r.tier<=11&&Number.isInteger(r.tg)&&r.tg>=0&&r.tg<=8&&Number.isInteger(r.count)&&r.count>=0)&&new Set(rows.map(r=>`${r.troop}:${r.tier}:${r.tg}`)).size===rows.length;}
function expectedTroops(profile){return TYPES.map(t=>({troop:t,tier:profile.troops[t].tier,tg:profile.troops[t].tg,count:profile.marchSizeByType?.[t]??Math.round(profile.troopsPerMarch*profile.ratios[t]/100)}));}
export function reportTemplate(audit){
 const hash=snapshotHash(audit),p=audit.profileSnapshot;
 return {version:1,notes:'Expected values are not observed report values. Fill only battle-report controls and confirm unchanged profile; never infer missing fields. Pseudonymous participant IDs are enough.',expected:{profileSha256:hash,captainTroops:expectedTroops(p),hostingProgression:Object.fromEntries(['Zoe','Petra',...HERO_ORDER].map(n=>{const h=p.heroes.find(h=>h.name===n);return [n,{level:h.level,starStep:h.starStep,widget:h.widget,skillLevels:h.skillLevels}];}))},reports:HERO_ORDER.map((hero,i)=>({id:null,blockId:null,timestamp:null,captainId:null,host:['Zoe','Petra',hero],target:{kind:'bear',eventId:null,rules:null,rounds:null},metric:{kind:null,value:null},profileMatch:{sha256:hash,confirmed:null,evidence:[]},hostingSkillsVerified:null,unchangedControls:{gear:null,masters:null,pets:null,researchGovernor:null},captainTroops:null,participants:null,selectedJoiningSkills:null,selectionVerified:null,activeBuffs:{complete:null,items:null},reportStats:{layer:'effective-rally-report',infantry:{attack:null,lethality:null},cavalry:{attack:null,lethality:null},archer:{attack:null,lethality:null}},scoreBonuses:null,evidence:[],notes:`Cycle ${i+1} is a placeholder, not a recorded battle.`}))};
}
export function validateReports(data,audit){
 if(data.version!==1||!Array.isArray(data.reports))throw new Error('Expected version 1 with reports array');
 const p=audit.profileSnapshot,hash=snapshotHash(audit),expected=expectedTroops(p),diagnostics=[];
 const duplicates=new Set(data.reports.filter((r,i,all)=>r.id&&all.findIndex(x=>x.id===r.id)!==i).map(r=>r.id));
 const inspected=data.reports.map((r,index)=>{
  const flags=[];
  for(const field of ['id','blockId','captainId','timestamp'])if(typeof r[field]!=='string'||!r[field].trim())flags.push(`Missing ${field}`);
  if(r.timestamp&&!Number.isFinite(Date.parse(r.timestamp)))flags.push('Invalid timestamp');
  if(duplicates.has(r.id))flags.push('Duplicate report ID');
  const archer=r.host?.find(n=>HERO_ORDER.includes(n));
  if(!Array.isArray(r.host)||r.host.length!==3||!r.host.includes('Zoe')||!r.host.includes('Petra')||!archer||new Set(r.host).size!==3)flags.push('Hosting trio is outside this comparison');
  if(r.profileMatch?.sha256!==hash||r.profileMatch?.confirmed!==true||!Array.isArray(r.profileMatch?.evidence)||!r.profileMatch.evidence.length)flags.push('Entered progression/transferable gear/profile not confirmed against preserved snapshot');
  if(r.hostingSkillsVerified!==true)flags.push('Actual hosting skill levels, including previously derived defaults, not confirmed');
  if(['gear','masters','pets','researchGovernor'].some(k=>r.unchangedControls?.[k]!==true))flags.push('Unchanged nonhero progression not confirmed');
  if(r.target?.kind!=='bear'||!r.target.eventId||!r.target.rules||r.target.rounds!==10)flags.push('Bear event/rules/ten-round target not established');
  if(!['captain_damage','captain_points','rally_damage'].includes(r.metric?.kind)||!finite(r.metric?.value)||r.metric.value<=0)flags.push('Positive observed damage/points with explicit scope required');
  if(!validTroops(r.captainTroops)||canonical(sorted(r.captainTroops))!==canonical(sorted(expected)))flags.push('Accepted captain troop composition differs from snapshot or is missing');
  if(!Array.isArray(r.participants)||r.participants.some(m=>!m||typeof m.id!=='string'||!m.id||m.id===r.captainId||!validTroops(m.troops))||new Set((r.participants??[]).map(m=>m?.id)).size!==(r.participants??[]).length)flags.push('Joining participants/accepted class-tier-TG counts missing or invalid');
  if(r.selectionVerified!==true||!Array.isArray(r.selectedJoiningSkills)||r.selectedJoiningSkills.length>4||r.selectedJoiningSkills.some(s=>!s||!r.participants?.some(m=>m?.id===s.participantId)||typeof s.hero!=='string'||!s.hero||s.slot!==1||!Number.isInteger(s.level)||s.level<1||s.level>5)||new Set((r.selectedJoiningSkills??[]).map(s=>s?.participantId)).size!==(r.selectedJoiningSkills??[]).length)flags.push('Actual selected joining skills/order/levels not confirmed');
  if(r.activeBuffs?.complete!==true||!Array.isArray(r.activeBuffs?.items)||hasUnknown(r.activeBuffs.items))flags.push('Active buffs not completely captured');
  if(r.reportStats?.layer!=='effective-rally-report'||TYPES.some(t=>!finite(r.reportStats?.[t]?.attack)||!finite(r.reportStats?.[t]?.lethality)))flags.push('Effective report Attack/Lethality missing; these are never added to component stats');
  if(!r.scoreBonuses||typeof r.scoreBonuses!=='object'||Array.isArray(r.scoreBonuses)||hasUnknown(r.scoreBonuses))flags.push('Score-only bonuses not recorded (use {} only for confirmed none)');
  if(!Array.isArray(r.evidence)||!r.evidence.length)flags.push('Battle report evidence missing');
  return {index,id:r.id,blockId:r.blockId,hero:archer,flags,report:r};
 });
 const groups=new Map();for(const row of inspected){const key=row.blockId??`missing-${row.index}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const pairs=[];
 for(const [blockId,group] of groups){
  const repeated=new Set(group.filter((r,i,all)=>r.hero&&all.findIndex(x=>x.hero===r.hero)!==i).map(r=>r.hero));
  if(repeated.size)diagnostics.push({blockId,issue:'Repeated hero in one block; use a new block ID for each complete comparison cycle, avoiding reused reference scores'});
  const ordered=group.filter(r=>r.hero).sort((a,b)=>HERO_ORDER.indexOf(a.hero)-HERO_ORDER.indexOf(b.hero));
  for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length;j++){
   const a=ordered[i],b=ordered[j];if(a.hero===b.hero)continue;
   const flags=[...a.flags.map(f=>`${a.id??a.index}: ${f}`),...b.flags.map(f=>`${b.id??b.index}: ${f}`)];
   if(repeated.has(a.hero)||repeated.has(b.hero))flags.push('Ambiguous/reused comparison block');
   const A=a.report,B=b.report;
   const compare=(label,left,right)=>{if(canonical(left)!==canonical(right))flags.push(label);};
   compare('Different captain',A.captainId,B.captainId);compare('Different Bear event/rules/rounds',A.target,B.target);
   compare('Different metric scopes',A.metric?.kind,B.metric?.kind);
   compare('Different accepted captain troops',sorted(A.captainTroops??[]),sorted(B.captainTroops??[]));
   const participants=r=>sorted((r.participants??[]).map(m=>({id:m?.id,troops:sorted(m?.troops??[])})));
   compare('Different joining participants or troop composition',participants(A),participants(B));
   // Keep selected order: tie/arrival order can matter. Same names alone is insufficient.
   compare('Different selected joining skills/order/levels',A.selectedJoiningSkills,B.selectedJoiningSkills);
   compare('Different active buffs',sorted(A.activeBuffs?.items??[]),sorted(B.activeBuffs?.items??[]));
   compare('Different score bonuses',A.scoreBonuses,B.scoreBonuses);
   let model=null;
   if(!flags.length){
    if(A.metric.kind==='rally_damage')model={status:'withheld',reason:'Snapshot engine models the entered captain march, not aggregate damage for all participant troops'};
    else if(A.selectedJoiningSkills.length){
     const base={id:'recorded',central:true,skills:A.selectedJoiningSkills.map(s=>({...s,selected:true}))};
     try{
      incomingEffects(base);
      const contexts=base.skills.some(s=>s.hero==='Vivian')?['add','strongest'].map((rule,i)=>({...base,id:`recorded-${rule}`,central:i===0,vivianOverlap:rule})):[base];
      const replay=hero=>{const entry=evaluateHostTrio(audit.profileSnapshot,['Zoe','Petra',hero].map(n=>audit.profileSnapshot.heroes.find(h=>h.name===n)),accountEffects(audit.profileSnapshot));return hostBearComparison(audit.profileSnapshot,entry.team,{incomingContexts:contexts,deployedCounts:expectedTroops(audit.profileSnapshot)});};
      const first=replay(a.hero),second=replay(b.hero),ratios=Object.keys(first.damageDimensions).filter(k=>first.damageDimensions[k]>0&&Number.isFinite(second.damageDimensions[k])).map(k=>({scenario:k,ratio:second.damageDimensions[k]/first.damageDimensions[k]}));
      model=ratios.length?{status:'conditional-relative-comparison',centralRatio:second.modeledDamage/first.modeledDamage,minScenarioRatio:Math.min(...ratios.map(r=>r.ratio)),maxScenarioRatio:Math.max(...ratios.map(r=>r.ratio)),limits:'Recorded selected skills are replayed separately for each host. Incoming Vivian overlap and other mechanics remain assumed. Effective report stats are not added a second time.'}:{status:'withheld',reason:'Relevant offensive magnitudes remain unmapped'};
     }catch(error){model={status:'withheld',reason:error.message};}
    }
    else{
     const first=audit.comparison.find(r=>r.heroes[2]===a.hero),second=audit.comparison.find(r=>r.heroes[2]===b.hero);
     const ratios=Object.keys(first.damageDimensions).filter(k=>Number.isFinite(first.damageDimensions[k])&&first.damageDimensions[k]>0&&Number.isFinite(second.damageDimensions[k])).map(k=>({scenario:k,ratio:second.damageDimensions[k]/first.damageDimensions[k]}));
     const observed=B.metric.value/A.metric.value,central=second.damage/first.damage;
     model={status:'conditional-relative-comparison',centralRatio:central,observedRatio:observed,residualToCentralRatio:observed/central-1,minScenarioRatio:Math.min(...ratios.map(r=>r.ratio)),maxScenarioRatio:Math.max(...ratios.map(r=>r.ratio)),nearestScenario:ratios.map(r=>({...r,relativeResidual:observed/r.ratio-1})).sort((a,b)=>Math.abs(a.relativeResidual)-Math.abs(b.relativeResidual))[0],proximityNote:'Nearest scenario is descriptive only, not evidence that its mechanic is correct; there is no chosen acceptance threshold',limits:'Finite baseline/mechanic cases are assumed. Points-only multipliers cancel only because identical captured score bonuses are required. No effective report stats or widgets are added a second time.'};
    }
   }
   pairs.push({blockId,reports:[a.id,b.id],heroes:[a.hero,b.hero],matched:flags.length===0,flags,observedRatio:flags.length?null:B.metric.value/A.metric.value,model});
  }
 }
 const summaries=[];for(let i=0;i<HERO_ORDER.length;i++)for(let j=i+1;j<HERO_ORDER.length;j++){
  const heroes=[HERO_ORDER[i],HERO_ORDER[j]],matched=pairs.filter(p=>p.matched&&canonical(p.heroes)===canonical(heroes)),values=matched.map(p=>p.observedRatio).sort((a,b)=>a-b),n=values.length;
  summaries.push({heroes,matchedBlocks:n,medianObservedRatio:n?(values[Math.floor((n-1)/2)]+values[Math.ceil((n-1)/2)])/2:null,range:n?[values[0],values.at(-1)]:null,conclusion:n<2?'Insufficient repeated matched rallies':'Descriptive repeated-block comparison only; no automatic winner, significance claim or mechanic identification'});
 }
 return {profileSha256:hash,providedReports:data.reports.length,reportChecks:inspected.map(({report,...row})=>row),diagnostics,pairs,summaries,limits:['One higher score does not establish a winner','Matching controls does not identify which unresolved skill mechanic caused a residual','Random procs require repeats; report totals cannot reveal an exact attack sequence','Aggregate scores, unselected offered skills, and unknown buffs are not treated as matched captain damage']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),option=name=>args.includes(name)?args[args.indexOf(name)+1]:null;
 const auditPath=option('--audit')??'audits/handoff-replay-2026-10-06/replay.json',raw=fs.readFileSync(auditPath),audit=JSON.parse(raw);
 if(option('--init')){const file=option('--init');if(fs.existsSync(file))throw new Error('Refusing to overwrite an existing reports file');fs.writeFileSync(file,JSON.stringify(reportTemplate(audit),null,2)+'\n');console.log(`Created unobserved template: ${file}`);}
 else{const input=option('--reports');if(!input)throw new Error('Use --init file.json or --reports reports.json [--output results.json]');const reportBytes=fs.readFileSync(input);const result=validateReports(JSON.parse(reportBytes),audit);if(!fs.readFileSync(input).equals(reportBytes))throw new Error('Report input changed');const output=JSON.stringify(result,null,2)+'\n';if(option('--output')){const resolved=p=>fs.existsSync(p)?fs.realpathSync(p):resolve(p);if([auditPath,input].some(p=>resolved(p)===resolved(option('--output'))))throw new Error('Output cannot overwrite inputs');fs.writeFileSync(option('--output'),output);}else process.stdout.write(output);}
 if(!fs.readFileSync(auditPath).equals(raw))throw new Error('Profile audit changed');
}
