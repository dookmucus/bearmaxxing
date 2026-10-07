// The app's starStep is a one-based 31-row index, not a decimal star label.
import {starStageParts} from './star-progression.mjs';
export const STAR_ENCODING='sixth-step-index-v1';
export function progressionInteger(value,min,max){
 if(typeof value!=='number'&&!(typeof value==='string'&&/^\d+(?:\.0+)?$/.test(value.trim())))return null;
 const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:null;
}
export function normalizeHeroProgression(input){
 const hero={...input,skillLevels:{...input.skillLevels},progressionOriginals:{...input.progressionOriginals}};
 const remember=(field,value)=>{hero.progressionOriginals[field]??={value,source:field.startsWith('skillLevels.')?input.skillLevelSource?.[field.split('.')[1]]??null:input.provenance?.[field]??(field==='starStep'?input.starStepSource:null)};};
 for(const [field,min,max] of [['stars',0,5],['level',0,80],['widget',0,10],['commonSkillLevel',0,5]]){
  const value=input[field],n=progressionInteger(value,min,max);
  if(typeof value==='string'&&n!==null){remember(field,value);hero[field]=n;}
 }
 for(const [slot,value] of Object.entries(hero.skillLevels)){
  const n=progressionInteger(value,0,5);if(typeof value==='string'&&n!==null){remember(`skillLevels.${slot}`,value);hero.skillLevels[slot]=n;}
 }
 if(typeof input.starStep==='string'){
  remember('starStep',input.starStep);
  const n=progressionInteger(input.starStep,1,31),stage=starStageParts(n);
  const explicit=input.starStepEncoding===STAR_ENCODING||['user-confirmed','saved exact stage','assumed full 5 stars'].includes(input.starStepSource);
  const corroborated=stage&&hero.stars===stage.stars;
  if(stage&&(explicit||corroborated)){hero.starStep=n;hero.starStepEncoding=STAR_ENCODING;}
  else {hero.legacyStarStep=input.starStep;hero.starStep=null;hero.starStepSource='ambiguous saved progression; review';}
 }
 return hero;
}
