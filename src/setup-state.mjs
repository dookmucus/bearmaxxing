import {englishMessage} from './english-messages.mjs';
import {plannedCapacityMissing,CAPACITY_PROMPT,usesSharedMaximum,marchSizeInputError} from './march-capacity-inputs.mjs';
import {emptyProfile} from './profile.mjs';
import {migrateProfile} from './data/roster.mjs';

export const SETUP_STEPS=['Heroes','Gear','Masters','Pets','Troops'];
export const MAIN_TABS=['Home',...SETUP_STEPS];
export const PLAN_STEPS=[...SETUP_STEPS,'Home'];
export const planStepIndex=(setup,tab)=>setup.completed?Math.max(0,PLAN_STEPS.indexOf(tab)):setup.step;
export function navigatePlanStep(setup,tab,index){
  if(!Number.isInteger(index)||index<0||index>=PLAN_STEPS.length)return {setup,tab};
  if(setup.completed)return {setup,tab:PLAN_STEPS[index]};
  if(index===SETUP_STEPS.length)return {setup:{...setup,completed:true,step:SETUP_STEPS.length-1},tab:'Home'};
  return {setup:{...setup,step:index},tab:PLAN_STEPS[index]};
}
export const STORAGE_KEY='bearmaxxing:setup:v1';
const LEGACY_KEYS=['bearmaxxing-profile','bearmaxxing:profile'];

export function normalizeSetup(saved) {
  const step=Number.isInteger(saved?.step)&&saved.step>=0&&saved.step<SETUP_STEPS.length?saved.step:0;
  return {step,completed:saved?.completed===true};
}
export function restoreAppState(storage,initialProfile) {
  if(initialProfile)return {profile:migrateProfile(initialProfile),setup:{step:0,completed:true},storageError:false};
  if(!storage)return {profile:migrateProfile(emptyProfile()),setup:normalizeSetup(null),storageError:true};
  try {
    const current=storage.getItem(STORAGE_KEY);
    if(current){
      const saved=JSON.parse(current);
      if(saved?.profile&&typeof saved.profile==='object')return {profile:migrateProfile(saved.profile),setup:normalizeSetup(saved.setup),storageError:false};
    }
    for(const key of LEGACY_KEYS){
      const value=storage.getItem(key);
      if(!value)continue;
      const saved=JSON.parse(value);
      const profile=saved?.profile??saved;
      if(profile&&typeof profile==='object'&&Array.isArray(profile.heroes))return {profile:migrateProfile(profile),setup:{step:SETUP_STEPS.length-1,completed:true},storageError:false};
    }
  } catch {return {profile:migrateProfile(emptyProfile()),setup:normalizeSetup(null),storageError:true};}
  return {profile:migrateProfile(emptyProfile()),setup:normalizeSetup(null),storageError:false};
}
export function persistAppState(storage,profile,setup) {
  try {
    if(!storage)return false;
    storage.setItem(STORAGE_KEY,JSON.stringify({version:1,profile,setup:normalizeSetup(setup)}));
    return true;
  } catch {return false;}
}
export function advanceSetup(setup) {
  const current=normalizeSetup(setup);
  return current.step===SETUP_STEPS.length-1?{step:current.step,completed:true}:{step:current.step+1,completed:false};
}
export function essentialSetupError(profile,step) {
  if(SETUP_STEPS[step]!=='Troops')return null;
  const whole=(value,positive=false)=>value==null||value===''||(Number.isInteger(Number(value))&&Number(value)>=(positive?1:0));
  for(const troop of ['infantry','cavalry','archer'])if(!whole(profile.troops?.[troop]?.count))return englishMessage("messages.setup.state.essentialSetupError.enter.a.whole.nonnegative.total.for.or.enter.0",{troop:troop});
  if(usesSharedMaximum(profile)&&marchSizeInputError(profile))return marchSizeInputError(profile);
  if(plannedCapacityMissing(profile))return CAPACITY_PROMPT;
  if(!whole(profile.joinCount,true)||!whole(profile.marchSlots,true))return englishMessage("messages.setup.state.essentialSetupError.choose.positive.whole.numbers.for.joining.marches.and.march.slots");
  if(['infantry','cavalry','archer'].some(t=>!whole(profile.ratios?.[t]))||['infantry','cavalry','archer'].reduce((sum,t)=>sum+Number(profile.ratios[t]),0)!==100)return englishMessage("messages.setup.state.essentialSetupError.choose.a.troop.ratio.totaling.100");
  return null;
}
