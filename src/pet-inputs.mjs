import {canonicalPetId} from './pet-identity.mjs';
import levels from './data/pet-levels.json' with {type:'json'};
export const petOwned=pet=>pet.level!=null&&pet.level!==''&&Number.isInteger(Number(pet.level))&&Number(pet.level)>0;
export const petMilestones=name=>Object.entries(levels.pets[name]?.attackByLevel??{}).filter(([,values])=>values.length===2).map(([level])=>Number(level));
export function normalizePetInput(pet,assumed={}){
 const next={...pet,advancementByLevel:{...pet.advancementByLevel},advancementSources:{...pet.advancementSources}};
 const canonicalId=canonicalPetId(pet);
 if(canonicalId)next.canonicalPetId=canonicalId;
 const source=pet.levelSource??pet.provenance?.level??(pet.imported?'imported':undefined);
 const defaultOne=Number(pet.level)===1&&(source==='assumed'||!source&&(pet.provenance==='assumed'||assumed[`pets.${pet.id}.level`]==='assumed'));
 if(pet.level==null||pet.level===''||defaultOne){next.level=0;next.levelSource='assumed';if(defaultOne)next.legacyAssumedLevel=pet.level;}
 else next.levelSource=source??'saved';
 const level=Number(next.level);
 if(petMilestones(next.name).includes(level)){
  if(typeof pet.advancementConfirmed==='boolean'){
   next.advancementByLevel[level]=pet.advancementConfirmed;
   next.advancementSources[level]??=pet.advancementSource??'saved';
  }
  if(typeof next.advancementByLevel[level]!=='boolean'){
   next.advancementByLevel[level]=false;next.advancementSources[level]='assumed';
  }
  next.advancementConfirmed=next.advancementByLevel[level];next.advancementSource=next.advancementSources[level];
 }
 next.owned=petOwned(next);
 return next;
}
export function setPetLevel(pet,level){
 const next=normalizePetInput(pet);
 next.level=level;next.levelSource='user-confirmed';next.owned=petOwned(next);
 next.advancementConfirmed=next.advancementByLevel[level]??null;
 next.advancementSource=next.advancementSources[level]??null;
 return normalizePetInput(next);
}
export function setPetAdvancement(pet,advanced){
 const next=normalizePetInput(pet),level=Number(pet.level);
 next.advancementByLevel[level]=advanced;next.advancementSources[level]='user-confirmed';
 next.advancementConfirmed=advanced;next.advancementSource='user-confirmed';return next;
}
