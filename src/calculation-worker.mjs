import {calculationDiagnostics} from './calculation-diagnostics.mjs';
import {calculate,accountEffects} from './calculator.mjs';
import {actionableImprovements} from './results-improvements.mjs';
import {presentationResults,presentationValue} from './calculation-payload.mjs';
self.onmessage=async({data})=>{
 const {profile,id,kind}=data;
 try {
  if(import.meta.env.DEV&&kind==='diagnostics'){
   self.postMessage({id,kind,json:JSON.stringify(calculationDiagnostics(profile),null,2)});return;
  }
  const results=Object.fromEntries(['hosting','joining','upgrades'].map(mode=>[mode,calculate(profile,mode)]));
  self.postMessage({id,kind:'plan',results:presentationResults(results)});
  const improvements=actionableImprovements(profile,results,accountEffects);
  self.postMessage({id,kind:'ready',improvements:presentationValue(improvements)});
 }catch(error){self.postMessage({id,kind:'error',message:error?.message??'Calculation failed'});}
};
