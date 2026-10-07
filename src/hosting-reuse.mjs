// Reuse only hosting evaluations identical to the current immutable snapshot.
// Hypotheses still enumerate every candidate and re-optimize complete legal plans.
// The scope ends with one recommendation calculation; no cross-edit cache survives.
const LIMIT=256;
let active=null;
function contextKey(profile,account){const {heroes,...rest}=profile;return JSON.stringify([rest,account]);}
function trioKey(scope,heroes){return heroes.map(hero=>{let id=scope.ids.get(hero);if(id===undefined){id=scope.next++;scope.ids.set(hero,id);}return id;}).join(',');}
export function hostingReuseContext(profile,account){return active&&contextKey(profile,account)===active.context?active:null;}
export function reusedHosting(scope,heroes){return scope?.models.get(trioKey(scope,heroes));}
export function retainHosting(scope,heroes,model){if(scope&&model&&scope.models.size<LIMIT)scope.models.set(trioKey(scope,heroes),model);return model;}
export function withHostingReuse(profile,account,models,calculate){
 const previous=active,scope={context:contextKey(profile,account),ids:new WeakMap(),next:0,models:new Map()};
 active=scope;
 try{for(const model of models??[])retainHosting(scope,model.team.map(e=>e.hero),model);return calculate();}
 finally{scope.models.clear();active=previous;}
}
