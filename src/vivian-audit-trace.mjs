// Research hypotheses, not a verified combat simulator. Never invoked by plan
// selection. Extra attacks are deliberately not fabricated into this trace.
export function vivianAuditTrace({order,rounds=10,period=4,activation,counter,focusDamage,tigerDamage,replacementDamage}){
 if(!['fourth','following'].includes(activation)||!['shared','class-local'].includes(counter))throw new Error('Explicit counter and activation hypotheses required');
 if(!order?.length||new Set(order).size!==order.length||![focusDamage,tigerDamage,replacementDamage].every(Number.isFinite))throw new Error('Known magnitudes and unique active classes required');
 const ticks={shared:0},trace=[];let replacementPending=false;
 for(let round=1;round<=rounds;round++)for(const troop of order){
  const key=counter==='shared'?'shared':troop,before=ticks[key]??0,after=before+1;
  const focus=activation==='fourth'?after%period===0:before>0&&before%period===0;
  const damageTaken=replacementPending?replacementDamage:tigerDamage;
  trace.push({round,troop,attack:trace.length+1,counterBefore:before,counterAfter:after,focusExtraDamage:focus?focusDamage:0,damageTaken,replacesTiger:replacementPending,tested:false});
  ticks[key]=after;replacementPending=focus;
 }
 return trace;
}
