import {useEffect,useMemo,useState} from 'react';
import CalculationWorker from './calculation-worker.mjs?worker&inline';
import {calculate,accountEffects} from './calculator.mjs';
import {actionableImprovements} from './results-improvements.mjs';

const emptyResults={hosting:{team:null},joining:{plan:null},upgrades:{gearSteps:[]}};
export function useCalculations(profile){
 const [state,setState]=useState(null),[attempt,setAttempt]=useState(0);
 // Static rendering/tests have no browser worker. Production never takes this path.
 const server=useMemo(()=>{
  if(!import.meta.env.SSR)return null;
  const results=Object.fromEntries(['hosting','joining','upgrades'].map(mode=>[mode,calculate(profile,mode)]));
  return {results,improvements:actionableImprovements(profile,results,accountEffects),status:'ready'};
 },[profile]);
 useEffect(()=>{
  let worker,active=true;
  const timer=setTimeout(()=>{
   const fail=()=>{worker?.terminate();if(active)setState({profile,results:emptyResults,improvements:[],status:'error'});};
   try{
    worker=new CalculationWorker();
    worker.onerror=fail;
    worker.onmessage=({data})=>{
     if(!active||data.id!==attempt)return;
     if(data.kind==='plan')setState({profile,results:data.results,improvements:[],status:'improvements'});
     if(data.kind==='ready'){setState(previous=>({...previous,profile,improvements:data.improvements,status:'ready'}));worker.terminate();}
     if(data.kind==='error')fail();
    };
    worker.postMessage({profile,id:attempt,kind:'calculate'});
   }catch{fail();}
  },180);
  return ()=>{active=false;clearTimeout(timer);worker?.terminate();};
 },[profile,attempt]);
 const current=server??(state?.profile===profile?state:{results:emptyResults,improvements:[],status:'loading'});
 return {...current,retry:()=>{setState(null);setAttempt(n=>n+1);}};
}
export function diagnosticText(profile){
 return new Promise((resolve,reject)=>{
  const worker=new CalculationWorker();
  const finish=(error,json)=>{worker.terminate();error?reject(error):resolve(json);};
  worker.onerror=()=>finish(new Error('Diagnostics failed'));
  worker.onmessage=({data})=>data.kind==='diagnostics'?finish(null,data.json):data.kind==='error'?finish(new Error(data.message)):null;
  worker.postMessage({profile,id:0,kind:'diagnostics'});
 });
}
