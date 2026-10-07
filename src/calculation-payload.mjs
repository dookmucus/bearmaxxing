// Only presentation data crosses the worker boundary. Exhaustive comparisons and
// lazy sensitivity matrices remain available to development diagnostics on demand.
export function presentationValue(value) {
 if(value==null||typeof value!=='object')return typeof value==='function'?undefined:value;
 if(Array.isArray(value))return value.map(presentationValue);
 const out={};
 for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))){
  if(descriptor.get||['damageAt','damageKeys','damageDimensions','dimensions','comparisons','frontier','cases','baselineSensitivity','benefits','joint'].includes(key))continue;
  if(key==='bear'){out.bear={modeledDamage:descriptor.value?.modeledDamage};continue;}
  const next=presentationValue(descriptor.value);if(next!==undefined)out[key]=next;
 }
 return out;
}
export function presentationResults(results){
 const hosting=presentationValue(results.hosting),joining=presentationValue(results.joining);
 const joint=results.hosting.joint??results.joining.joint;
 if(joint)hosting.joint={canRecommend:joint.canRecommend,recommendationUncertainty:joint.recommendationUncertainty,selected:presentationValue(joint.selected),comparison:{options:(joint.comparison?.options??[]).map(option=>({team:presentationValue(option.team),coverageComplete:option.coverageComplete,bear:{modeledDamage:option.bear.modeledDamage}}))}};
 return {hosting,joining,upgrades:{gearSteps:[]}};
}
