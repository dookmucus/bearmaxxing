// Selected skills from OTHER players. Never derive these from the player's
// outgoing squads. Contexts are comparison assumptions, not attendance odds.
export const INCOMING_SOURCES={
 selection:'https://centurygames.helpshift.com/hc/en/140-kingshot/faq/9125-combat-faq-1783436100/',
 families:'https://kingshotguides.com/guide/joiner-hero-mechanics-no-one-told-you-about/',
 vivian:'https://kingshotoptimizer.com/heroes/vivian/'
};
const selected=(hero,level=5)=>({hero,level,slot:1,selected:true});
export const HOST_INCOMING_CONTEXTS=[
 {id:'usual-balanced',central:true,skills:['Chenko','Yeonwoo','Amane','Amane'].map(h=>selected(h))},
 {id:'lethality-heavy',skills:['Chenko','Yeonwoo','Chenko','Amane'].map(h=>selected(h))},
 {id:'attack-heavy',skills:['Chenko','Amane','Amane','Amane'].map(h=>selected(h))},
 {id:'all-lethality',skills:['Chenko','Yeonwoo','Chenko','Yeonwoo'].map(h=>selected(h))},
 {id:'all-attack',skills:Array.from({length:4},()=>selected('Amane'))},
 {id:'mixed-level-four',skills:['Chenko','Yeonwoo','Amane','Amane'].map(h=>selected(h,4))},
 ...['add','strongest'].map(rule=>({id:`vivian-${rule}`,vivianOverlap:rule,skills:['Chenko','Yeonwoo','Amane','Vivian'].map(h=>selected(h))}))
];
export function incomingEffects(context){
 if(!Array.isArray(context.skills)||context.skills.length>4)throw new Error('Incoming context requires at most four selected primary skills');
 return context.skills.filter(s=>s.selected===true).map(s=>{
  if(s.slot!==1||!Number.isInteger(s.level)||s.level<1||s.level>5)throw new Error('Incoming primary skill level must be explicitly specified');
  const family={Chenko:'101',Yeonwoo:'101',Amane:'102',Vivian:'vivian-enemy-damage-taken'}[s.hero];
  if(!family)throw new Error(`Unmapped incoming skill: ${s.hero}`);
  return {...s,family,value:5*s.level,scope:'all',kind:'steady',source:s.hero==='Vivian'?INCOMING_SOURCES.vivian:INCOMING_SOURCES.families,
   evidence:'Published community effect mapping; same-family stacking tested in PvP, transferred to Bear',
   unresolved:s.hero==='Vivian'?['Incoming Crouching Tiger overlap with hosting damage-taken effects, including weaker replacement, is unverified']:[]};
 });
}
export function combineIncoming(offers,incoming,context){
 const combined=offers.map(o=>({...o}));
 for(const effect of incoming){
  if(effect.hero==='Vivian'&&context.vivianOverlap==='strongest'){
   const existing=combined.filter(o=>o.family===effect.family),maximum=Math.max(effect.value,...existing.map(o=>o.value));
   for(let i=combined.length-1;i>=0;i--)if(combined[i].family===effect.family)combined.splice(i,1);
   combined.push({family:effect.family,value:maximum});
  }else combined.push({family:effect.family,value:effect.value});
 }
 return combined;
}
