import table from './data/bear-troops.json' with {type:'json'};
export const TROOP_REFERENCE=table;
export const REPORTED_TG6_HOWLING_WIND={name:'Howling Wind',kind:'extra-damage',probability:.30,extra:.50,
 tier:10,tg:6,scope:'archer',role:'troops',source:'User-reported in-game text at T10/TG6',
 provenance:{type:'user-reported-in-game',tier:10,tg:6,text:'a 30% chance to deal 50% extra damage'},
 uncertainties:['Stacking with hero damage effects','Interaction with Volley and hero extra attacks']};
export function bearTroop(profile,troop){
 const {tier,tg}=profile.troops?.[troop]??{};
 const row=tier!=null&&tier!==''&&tg!=null&&tg!==''?table.rows[`${tier}:${tg}`]?.[troop]:null;
 const missing=[],effects=[],irrelevant=[];
 if(!row)missing.push(`${troop}: entered tier ${tier??'unset'}/Truegold ${tg??'unset'} has no sourced coefficients`);
 if(row&&troop==='archer'){
  effects.push({name:'Ranged Strike',kind:'counter-type',value:10,source:'https://kingshotdata.kr/en/buildings/range.html'});
  if(Number(tier)>=7)effects.push({name:'Volley',kind:'extra-attack',probability:.1,extra:1,source:'https://kingshotdata.kr/en/buildings/range.html',stageVerified:false,probabilityProvenance:'Generic Volley transcription; exact entered tier/TG applicability is not established',uncertainties:['Exact tier/TG Volley probability: generic 10% is a conditional reference case, not a verified stage mapping']});
 }
 if(row&&troop==='cavalry')irrelevant.push({name:'Cavalry bypass',reason:'Targets enemy Archers; Bear has no Archer back row',source:'https://kingshotoptimizer.com/buildings/stable/'});
 if(row&&Number(tg)>=3){
  const source='https://kingshotworld.com/guides/kingshot-castle-battle-guide-formations-points/';
  if(troop==='infantry')irrelevant.push({name:'Unyielding Shield',reason:'Incoming damage reduction; does not add Bear offense',source});
  if(troop==='cavalry')effects.push({name:'Assault Lance',kind:'extra-damage',probability:Number(tg)>=5?.15:.1,extra:1,source:Number(tg)>=5?'https://kingshotguide.org/guide/kingshot-tg5-to-tg8-upgrade-guide':source});
  if(troop==='archer'&&Number(tg)<5)effects.push({name:'Howling Wind',kind:'extra-damage',probability:.2,extra:.5,source});
  if(troop==='archer'&&Number(tier)===10&&Number(tg)===6)effects.push({...REPORTED_TG6_HOWLING_WIND});
  else if(troop==='archer'&&Number(tg)>=5)missing.push(`archer: Howling Wind at T${tier}/TG${tg} is not sourced; neither TG3 nor reported T10/TG6 values are substituted`);
 }
 if(row&&Number(tg)>=8){
  const source='https://kingshotguide.org/guide/kingshot-tg5-to-tg8-upgrade-guide';
  if(troop==='archer'){
   effects.push({name:'Truegold Wind base Attack',kind:'base-attack',value:4,source});
   missing.push('archer: Truegold Wind pure-damage scaling, Howling Wind trigger and overlap on Bear are unresolved');
  }else irrelevant.push({name:'TG8 protection',reason:'Defense/damage reduction; does not add Bear offense',source});
 }
 return {tier,tg,coefficient:row??null,effects:effects.map(e=>({...e,scope:troop,role:'troops'})),irrelevant,missing,estimated:true,
  assumptions:['Troop coefficients are community estimates, not official Kingshot constants','Troop-proc expectations and hero extra-strike/counter interactions remain estimates'],
  conflicts:table.conflicts.filter(c=>c.tier===Number(tier)&&c.tg===Number(tg)&&c.troop===troop)};
}
export function troopDamageMultiplier(record,mode='independent'){
 const base=record.effects.filter(e=>e.kind==='base-attack').reduce((n,e)=>n*(1+e.value/100),1);
 const counter=record.effects.filter(e=>e.kind==='counter-type').reduce((n,e)=>n*(1+e.value/100),1);
 const procs=record.effects.filter(e=>['extra-attack','extra-damage'].includes(e.kind)).map(e=>e.probability*e.extra);
 return base*counter*(mode==='additive'?1+procs.reduce((n,x)=>n+x,0):procs.reduce((n,x)=>n*(1+x),1));
}
