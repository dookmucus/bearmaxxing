import progression from './data/master-progression.json' with {type:'json'};

export const MASTER_SKILLS = {
  Isnor: {affinity:'Squad Lethality',requiresSquadInput:true,skills:[]},
  Aena: {affinity:'Squad Attack',requiresSquadInput:true,skills:[]},
  Valora: {talent:'Hunter Instinct',affinity:'Squad Attack',skills:[
    ['Dance of the Hunt','rally'],['Leader By Example',null],['Weapon Obsession',null],['Savage Advantage','deployment']]},
  Cassia: {talent:'Horn of Valor',affinity:'Squad Lethality',skills:[
    ['Recruiter In Chief',null],['Firepower to Win','attack'],['Commando','lethality'],['Inspiring Mobilization','rally']]},
  Pan: {talent:'Efficient Reserves',affinity:'Squad Defense',skills:[
    ['Falconer',null],['Good Steward',null],['Master Architect',null],['Ways and Means',null]]},
  Roman: {talent:'Star Belligerent',affinity:'Squad Attack',skills:[
    ['Teacher of Champions',null],['Winner Take All',null],['Crowd Favorite',null],['One Desire',null]]},
  Wilson: {talent:'Trade Decree',affinity:'Squad Attack',skills:[
    ['Mobilization Master',null],['Championship Publicity',null],['Viking Bounty',null],['Duel Sponsorship',null]]},
  Guinevere: {talent:'Holy Sword Domain',affinity:'Squad Lethality',skills:[
    ['Max Efficiency',null],['Merciful Heart',null],['Royal Guidance',null],['Call of Round Table',null]]}
};
export const MASTER_SOURCE = progression.sources;
export const masterRequiresSquadInput = name => MASTER_SKILLS[name]?.requiresSquadInput===true;
export const masterAffinityDefinition = name => progression.affinityEffects[name]??null;
const affinityKind = name => {
  const stat=masterAffinityDefinition(name)?.stat;
  return ['attack','lethality'].includes(stat)?stat:null;
};
const number = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
export function lookup(table, level) {
  const n=number(level);
  return n !== null && Number.isInteger(n) && n>=0 && n<table.length ? table[n] ?? null : null;
}
// A displayed affinity bonus replaces its table equivalent; preserve the entered
// decimal text in profiles and convert only when calculating.
export function masterSquadBonus(m) {
  const kind=affinityKind(m.name);
  if(kind===null)return {kind,value:null,source:'unmapped'};
  if(Object.hasOwn(m,'squadBonus')){
    const value=number(m.squadBonus);
    return {kind,value:value!==null&&value>=0?value:null,source:'entered'};
  }
  if(masterRequiresSquadInput(m.name))return {kind,value:0,source:'default'};
  return {kind,value:lookup(progression.affinity[m.name]??[],m.affinityLevel),source:'reference'};
}
export function masterSquadInputValue(m) {
  if(Object.hasOwn(m,'squadBonus'))return m.squadBonus??'';
  const {value}=masterSquadBonus(m);
  return value===null?'':value.toFixed(2);
}
export function masterAffinityInfo(m) {
  const definition=masterAffinityDefinition(m.name);
  if(!definition)return `The app has no verified affinity effect value for ${m.name} at affinity level ${m.affinityLevel}. This effect is excluded from comparison.`;
  if(affinityKind(m.name)===null)return `${definition.effect} does not contribute to this Bear comparison.`;
  const {value,source}=masterSquadBonus(m);
  if(value===null)return `The app has no verified ${definition.effect} value for ${m.name} at affinity level ${m.affinityLevel}. This effect is excluded from comparison.`;
  const amount=`${masterSquadInputValue(m)}%`;
  return `${definition.effect} +${amount}${source==='entered'?', from the entered squad bonus':''}. Enter the displayed percentage, excluding skills and research. Source: ${definition.sourceName}.`;
}
export function masterResearchDetails(m) {
  const progress=number(m.specialResearchProgress);
  const kind=({Pan:'lethality',Roman:'attack'})[m.name]??null;
  if(progress===null||progress===0)return {kind,value:0,issue:null,note:'No completed research is inferred from Level 100.'};
  if(!['Pan','Roman'].includes(m.name))return {kind,value:0,issue:`${m.name} saved Special Research has no complete offensive lookup`,note:'Saved research is retained; its offensive Path Stats are not yet mapped.'};
  if(number(m.affinityLevel)!==100)return {kind,value:0,issue:`${m.name} Special Research requires affinity 100`,note:'Saved research is retained but its unlock level needs confirmation.'};
  if(!Number.isInteger(progress)||!Object.hasOwn(progression.panResearch,String(progress)))return {kind,value:0,issue:`${m.name} intermediate Special Research progress has no verified lookup; no inferred bonus counted`,note:'Saved intermediate progress is retained; its global bonus and Path Stats need a verified lookup.'};
  const value=progression.panResearch[progress];
  return {kind,value,issue:null,note:`Saved research ${progress}: Squad ${kind==='attack'?'ATK':'LET'} +${value}% is included separately from affinity and skills. Troop-specific Path Stats remain unmapped and are not included.`};
}
export function masterSkillPresentation(name,slot){
  const audit=progression.skillAudit.masters[name]?.[slot-1];
  return {...(audit??{relevance:'unknown',reason:'Bear relevance and calculation mapping are unverified; saved levels are retained.'}),source:MASTER_SOURCE[name]??null};
}
export function masterSkillInfo(m,skill){
  const presentation=masterSkillPresentation(m.name,skill.slot);
  const labels={attack:'Squad Attack',lethality:'Squad Lethality',rally:'Rally capacity',deployment:'Personal deployment capacity',personalPoints:'Personal Bear points'};
  const bonus=skill.value===null?'no verified calculated contribution':`${labels[skill.kind]??'Unmapped effect'} +${skill.value.toLocaleString('en-US',{maximumFractionDigits:2})}${['rally','deployment'].includes(skill.kind)?' troops':'%'}`;
  const unlock=presentation.unlockAffinity;
  const locked=unlock!=null&&number(m.affinityLevel)!==null&&number(m.affinityLevel)<unlock;
  if(presentation.relevance==='irrelevant')return `${skill.name}: ${presentation.reason}`;
  if(locked&&Number(skill.level)===0)return `${skill.name} unlocks at Affinity ${unlock}.`;
  if(skill.value===null)return `The app has no verified ${skill.name} value for ${m.name} at skill level ${skill.level??'unknown'}. This effect is excluded from comparison.`;
  return `${skill.name}, level ${skill.level??'unknown'}: ${bonus}.`;
}
export function masterInputDetails(m) {
  const model=MASTER_SKILLS[m.name];
  const affinityLevel=number(m.affinityLevel);
  const affinityValue=masterSquadBonus(m).value;
  const kind=affinityKind(m.name);
  const talentTable=m.name==='Valora'?progression.valora.talent:m.name==='Cassia'?progression.cassia.talent:null;
  const talentValue=lookup(talentTable??[],m.talentLevel);
  const talents={Valora:'personal Bear points',Cassia:'deployment capacity'};
  const skills=(model?.skills??[]).map(([name,kind],index)=>{
    const slot=index+1, level=number(m.skillLevels?.[slot]??(m.name==='Valora'&&slot===1?m.rallyLevel:m.name==='Valora'&&slot===4?m.deployLevel:null));
    let table=null;
    if(m.name==='Valora'&&slot===1)table=progression.valora.rally;
    if(m.name==='Valora'&&slot===4)table=progression.valora.deployment;
    if(m.name==='Cassia'&&slot===2)table=progression.cassia.attack;
    if(m.name==='Cassia'&&slot===3)table=progression.cassia.lethality;
    if(m.name==='Cassia'&&slot===4)table=progression.cassia.rally;
    return {slot,name,kind,level,value:table?lookup(table,level):null,presentation:masterSkillPresentation(m.name,slot)};
  });
  return {affinityLevel,affinityValue,affinityKind:kind,talentValue,talentLabel:talents[m.name]??null,skills};
}
export function masterEffects(m) {
  const out={attack:0,lethality:0,deploy:0,rally:0,personalPoints:0,unsupported:[]};
  if(!masterAffinityDefinition(m.name))out.unsupported.push(`${m.name} has no verified Bear effect mapping`);
  if(affinityKind(m.name)!==null){
    const a=masterSquadBonus(m).value;
    if(a===null)out.unsupported.push(`${m.name} squad bonus is unknown or has no verified affinity lookup`);
    if(a!==null)out[affinityKind(m.name)]+=a;
  }
  // Affinity, talents, skills and research remain independent effect sources.
  if(['Valora','Cassia'].includes(m.name)){
    const talent=lookup(m.name==='Valora'?progression.valora.talent:progression.cassia.talent,m.talentLevel);
    if(number(m.talentLevel)!==null&&talent===null)out.unsupported.push(`${m.name} talent level`);
    if(talent!==null)out[m.name==='Valora'?'personalPoints':'deploy']+=talent;
    const skills={...m.skillLevels,...(m.name==='Valora'&&m.rallyLevel!=null&&m.skillLevels?.[1]==null?{1:m.rallyLevel}:{}),...(m.name==='Valora'&&m.deployLevel!=null&&m.skillLevels?.[4]==null?{4:m.deployLevel}:{})};
    const tables=m.name==='Valora'?{1:['rally',progression.valora.rally],4:['deploy',progression.valora.deployment]}:{2:['attack',progression.cassia.attack],3:['lethality',progression.cassia.lethality],4:['rally',progression.cassia.rally]};
    for(const [slot,[effect,table]] of Object.entries(tables)){
      const level=number(skills[slot]);if(level===null)continue;
      const value=lookup(table,level);
      if(value===null)out.unsupported.push(`${m.name} skill ${slot} level ${level}`);
      else out[effect]+=value;
    }
  }
  const research=masterResearchDetails(m);
  if(research.issue)out.unsupported.push(research.issue);
  if(research.kind!==null)out[research.kind]+=research.value;
  return out;
}
