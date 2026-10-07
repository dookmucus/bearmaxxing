/** Independent handoff checks. This is not the BearMaxxing production engine. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const here=new URL('.',import.meta.url);
const progression=JSON.parse(readFileSync(new URL('hero-progression-review.json',here),'utf8'));
const effects=JSON.parse(readFileSync(new URL('supplementary-hero-effects.json',here),'utf8'));
const results=[];
const test=(name,fn)=>{try{fn();results.push({name,status:'pass'});}catch(e){results.push({name,status:'fail',error:e.message});}};
const close=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
const hero=slug=>progression.heroes.find(h=>h.slug===slug);
const skills=slug=>effects.heroes.find(h=>h.slug===slug).expeditionSkills;
const finite=(value,name)=>{if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`${name} must be finite numeric data`);return value;};

export function starStep(fullStars,partialSixths){
  if(!Number.isInteger(fullStars)||fullStars<0||fullStars>5||!Number.isInteger(partialSixths)||partialSixths<0||partialSixths>5||(fullStars===5&&partialSixths!==0))throw new Error('Invalid star progression');
  return 1+6*fullStars+partialSixths;
}
export function referenceAttack(slug,step){
  const h=hero(slug);if(!h||!Number.isInteger(step)||step<1||step>31)return null;
  if(step===31)return h.officialMaxAttackPp;
  return h.attackByStarStep.find(r=>r.starStep===step)?.attackPp??null;
}
export function chooseSkill(explicit,derivedCap){
  if(explicit!==undefined&&explicit!==null)return {level:explicit,source:'entered'};
  if(!Number.isInteger(derivedCap)||derivedCap<0||derivedCap>5)return {level:null,source:'unresolved'};
  return {level:derivedCap,source:'assumed-unlocked-cap'};
}
export function isolatedProcMean(kind,chance,damagePp){
  finite(chance,'Chance');finite(damagePp,'Damage');
  if(chance<0||chance>1||damagePp<0)throw new Error('Invalid proc magnitude');
  if(kind==='replace-hit-with-total-damage')return 1+chance*(damagePp/100-1);
  if(kind==='extra-attack-total-damage'||kind==='extra-damage-proc')return 1+chance*damagePp/100;
  throw new Error('Timing, packet eligibility, or operation unresolved');
}
/** Only valid when an independently identified ordinary/special report decomposition is available. */
export function recoverOrdinaryBaseline({reportedPp,knownOrdinaryPp,referenceSpecialFactor,contextVerified}){
  finite(reportedPp,'Reported stat');finite(knownOrdinaryPp,'Known ordinary stat');
  if(!contextVerified||referenceSpecialFactor==null)throw new Error('Report context and special-layer decomposition required');
  finite(referenceSpecialFactor,'Reference special factor');if(referenceSpecialFactor<=0)throw new Error('Invalid special factor');
  const baseline=(1+reportedPp/100)/referenceSpecialFactor-1-knownOrdinaryPp/100;
  if(baseline< -1e-9)throw new Error('Incompatible reference components or double counting');
  return Math.max(0,baseline);
}
export function candidateStatFactor(baseline,ordinaryPp,specialFactor){
  finite(baseline,'Baseline');finite(ordinaryPp,'Ordinary stat');finite(specialFactor,'Special factor');
  if(baseline<0||ordinaryPp<0||specialFactor<=0)throw new Error('Invalid factor inputs');
  return (1+baseline+ordinaryPp/100)*specialFactor;
}
export function resourceEfficiency(gain,costs,denominator){
  finite(gain,'Gain');const cost=costs[denominator];
  if(typeof cost!=='number'||!Number.isFinite(cost)||cost<=0)throw new Error('Verified resource cost required');
  return {gainPerUnit:gain/cost,costVector:{...costs},denominator};
}

test('Sixth-step encoding matches 3.3 and full-five-star snapshot',()=>{assert.equal(starStep(3,3),22);assert.equal(starStep(5,0),31);});
test('Illegal partial five-star input rejected',()=>assert.throws(()=>starStep(5,1)));
test('All seventeen retained curves contain unique, complete, monotone steps',()=>{
 const curves=progression.heroes.filter(h=>h.attackByStarStep.length);assert.equal(curves.length,17);
 for(const h of curves){assert.deepEqual(h.attackByStarStep.map(r=>r.starStep),Array.from({length:31},(_,i)=>i+1));
  h.attackByStarStep.forEach((r,i,a)=>{assert.ok(Number.isFinite(r.attackPp));if(i)assert.ok(r.attackPp>=a[i-1].attackPp);});}
});
test('Primary maximum is retained across curve rounding discrepancies',()=>{
 for(const h of progression.heroes)assert.equal(referenceAttack(h.slug,31),h.officialMaxAttackPp);
});
test('Conflicting Gordon/Fahd partial curves are withheld rather than rescaled',()=>{
 assert.equal(referenceAttack('gordon',25),null);assert.equal(referenceAttack('fahd',30),null);
 assert.equal(referenceAttack('gordon',31),140.11);assert.equal(referenceAttack('chenko',31),140.11);
});
test('Existing saved progression is used; Hilde is 3.5, not default five stars',()=>{assert.equal(hero('hilde').snapshot.starStep,24);assert.equal(referenceAttack('hilde',24),152.59);});
test('Widget levels zero through ten have correct neutral zero semantics',()=>{
 for(const h of progression.heroes){const table=h.ordinaryWidgetLethalityByLevel;if(!table.length)continue;
  assert.deepEqual(table.map(r=>r.level),Array.from({length:10},(_,i)=>i+1));assert.ok(table.every(r=>r.lethalityPp>0));}
});
test('Explicit skill zero survives assumed-cap resolution',()=>assert.deepEqual(chooseSkill(0,5),{level:0,source:'entered'}));
test('Unentered skill uses cap only when cap is known',()=>{assert.equal(chooseSkill(undefined,4).level,4);assert.equal(chooseSkill(undefined,null).level,null);});
test('Gordon second skill is static Attack and never a joining-first skill',()=>{const s=skills('gordon')[1];assert.equal(s.kind,'shared-attack');assert.equal(s.activation,'static');assert.equal(s.joinerEligible,false);assert.equal(s.valuesBySkillLevel[4],25);});
test('Marlin includes omitted third Expedition skill',()=>{const s=skills('marlin')[2];assert.equal(s.name,'Dynamo');assert.equal(s.chance,.5);assert.equal(s.valuesBySkillLevel[4],50);});
test('Quinn slot identity retains name aliases without mixing defense and offense',()=>{assert.equal(skills('quinn')[0].bearOffense,false);assert.equal(skills('quinn')[1].kind,'extra-damage-proc');});
test('Hilde total-damage proc differs from Margot extra-attack packet',()=>{
 close(isolatedProcMean('replace-hit-with-total-damage',.25,200),1.25);
 close(isolatedProcMean('extra-attack-total-damage',.25,200),1.5);
 close(isolatedProcMean('extra-damage-proc',.30,50),1.15);
});
test('Timed and skill-only effects cannot use simple isolated proc mean',()=>{
 assert.throws(()=>isolatedProcMean('timed-damage-proc',.2,40));
 assert.equal(skills('triton')[1].kind,'skill-damage-only');assert.equal(skills('sophia')[1].bearActivation,'unresolved');
});
test('Defensive/economy heroes retain inherent stats but no fabricated offensive skill',()=>{
 for(const s of ['howard','eric','diana','fahd','forrest','seth','edwin','olive'])assert.ok(skills(s).every(e=>!e.bearOffense));
 assert.equal(referenceAttack('howard',31),140.11);
});
test('Helga account talent is separate from her three explicitly zero skills',()=>{
 const h=effects.accountPassives[0];assert.equal(h.ownershipRequired,true);assert.equal(h.activeWhenHeroAbsent,true);assert.equal(h.attackPpByFullStar[0],2);
});
test('Synthetic report reconstructs reference without counting gear twice',()=>{
 const baseline=recoverOrdinaryBaseline({reportedPp:494,knownOrdinaryPp:240,referenceSpecialFactor:1.1,contextVerified:true});
 close(baseline,2);close(candidateStatFactor(baseline,240,1.1),5.94);close(candidateStatFactor(baseline,260,1.1),6.16);
});
test('Reported neutral zero differs from absent/unconfirmed baseline',()=>{
 close(recoverOrdinaryBaseline({reportedPp:0,knownOrdinaryPp:0,referenceSpecialFactor:1,contextVerified:true}),0);
 assert.throws(()=>recoverOrdinaryBaseline({reportedPp:null,knownOrdinaryPp:0,referenceSpecialFactor:1,contextVerified:true}));
});
test('Unknown report decomposition and incompatible subtraction are rejected',()=>{
 assert.throws(()=>recoverOrdinaryBaseline({reportedPp:400,knownOrdinaryPp:200,contextVerified:true}));
 assert.throws(()=>recoverOrdinaryBaseline({reportedPp:100,knownOrdinaryPp:200,referenceSpecialFactor:1,contextVerified:true}));
});
test('Hammer efficiency retains spare-gear cost and does not compare currencies',()=>{
 const boots=resourceEfficiency(.00453,{hammers:50},'hammers');
 const helmet=resourceEfficiency(.00485,{hammers:120,mythicPieces:2},'hammers');
 close(boots.gainPerUnit/helmet.gainPerUnit,2.2416494845360826);
 assert.equal(helmet.costVector.mythicPieces,2);assert.throws(()=>resourceEfficiency(.01,{truegold:null},'truegold'));
});

const output={scope:'Independent reference and algebra checks; not production integration tests or observed Bear damage validation.',checks:results.length,passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length,results};
if(process.argv.includes('--write'))writeFileSync(fileURLToPath(new URL('check-results.json',here)),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));if(output.failed)process.exitCode=1;
