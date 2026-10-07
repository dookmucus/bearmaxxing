// Finite attack-event expectation, not a sampled combat simulator. State branches
// only on Volley. Other independent proc expectations are supplied by the caller.
export const ATTACK_ORDER=['infantry','cavalry','archer'];
export function attackEventExpectation({active=ATTACK_ORDER,rounds=10,volleyProbability=0,forcedVolleyRounds=[],focus=null,trap=null,tiger=0,phase=0,trapPhase=0,collision='focus',factor=()=>1,collectTrace=false}){
 if(!Number.isFinite(volleyProbability)||volleyProbability<0||volleyProbability>1)throw new Error('Explicit Volley probability required');
 const order=ATTACK_ORDER.filter(t=>active.includes(t)),totals=Object.fromEntries(ATTACK_ORDER.map(t=>[t,0])),trace=[];
 let states=[{probability:1,counter:phase%4,trapCounter:trapPhase%4,pending:null,rolls:0}];
 const merge=rows=>{const map=new Map();for(const row of rows){const key=`${row.counter}:${row.trapCounter}:${row.pending}:${row.rolls}`;const prior=map.get(key);if(prior)prior.probability+=row.probability;else map.set(key,{...row});}return [...map.values()];};
 const resolve=(state,round,troop,kind)=>{
  const counter=focus?(state.counter+1)%4:0,trapCounter=trap&&troop==='archer'&&kind==='normal'?(state.trapCounter+1)%4:state.trapCounter;
  const focusProc=Boolean(focus&&counter===0),trapProc=Boolean(trap&&troop==='archer'&&kind==='normal'&&trapCounter===0);
  const consumed=state.pending==='focus'||state.pending==='trap'&&kind==='normal';
  const damageTaken=state.pending==='focus'?focus.nextTaken:state.pending==='trap'&&kind==='normal'?0:tiger;
  const rolls=state.rolls+1,petraProbability=1-.5**rolls;
  const event={round,troop,kind,counterBefore:state.counter,counterAfter:counter,focusExtraDamage:focusProc?focus.value:0,trapExtraDamage:trapProc?trap.value:0,damageTaken,petraProbability,petraRolls:rolls,consumes:consumed?state.pending:null,focusProc,trapProc};
  totals[troop]+=state.probability*factor(event);
  if(collectTrace)trace.push({...event,probability:state.probability});
  let pending=consumed?null:state.pending;
  if(focusProc)pending='focus';if(trapProc&&(!focusProc||collision==='trap'))pending='trap';
  return {...state,counter,trapCounter,pending,rolls};
 };
 for(let round=1;round<=rounds;round++){
  states=merge(states.map(s=>({...s,rolls:0})));
  for(const troop of order){
   states=merge(states.map(s=>resolve(s,round,troop,'normal')));
   if(troop==='archer'){
    const chance=forcedVolleyRounds.includes(round)?1:volleyProbability,branches=[];
    for(const state of states){if(chance<1)branches.push({...state,probability:state.probability*(1-chance)});if(chance>0)branches.push(resolve({...state,probability:state.probability*chance},round,troop,'volley'));}
    states=merge(branches);
   }
  }
 }
 return {totals,averages:Object.fromEntries(ATTACK_ORDER.map(t=>[t,totals[t]/rounds])),trace,probabilityMass:states.reduce((n,s)=>n+s.probability,0)};
}
export function widgetStatFactor(percent,{alreadyIncluded=false}={}){return alreadyIncluded?1:1+percent/100;}
export function effectiveWidgetStat(solo,widget,options){return 100*((1+solo/100)*widgetStatFactor(widget,options)-1);}
