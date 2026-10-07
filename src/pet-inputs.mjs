import {canonicalPetId} from './pet-identity.mjs';
import levels from './data/pet-levels.json' with {type:'json'};
export const petOwned=pet=>pet.level!=null&&pet.level!==''&&Number.isInteger(Number(pet.level))&&Number(pet.level)>0;
export const petMilestones=name=>levels.pets[name]?.advancementAudit?.milestones??[];
export function petAdvancementStage(pet){
 const level=Number(pet.level),milestones=petMilestones(pet.name);
 const checkpoint=petOwned(pet)&&milestones.includes(level);
 // Saved advancement choices are inactive legacy data. Only levels strictly
 // above a checkpoint establish that its advancement is complete.
 return {checkpoint,advanced:false,rank:petOwned(pet)?milestones.filter(m=>m<level).length:0};
}
export function normalizePetInput(pet,assumed={}){
 const next={...pet};
 const canonicalId=canonicalPetId(pet);
 if(canonicalId)next.canonicalPetId=canonicalId;
 const source=pet.levelSource??pet.provenance?.level??(pet.imported?'imported':undefined);
 const defaultOne=Number(pet.level)===1&&(source==='assumed'||!source&&(pet.provenance==='assumed'||assumed[`pets.${pet.id}.level`]==='assumed'));
 if(pet.level==null||pet.level===''||defaultOne){next.level=0;next.levelSource='assumed';if(defaultOne)next.legacyAssumedLevel=pet.level;}
 else next.levelSource=source??'saved';
 next.owned=petOwned(next);
 return next;
}
export function setPetLevel(pet,level){
 const next=normalizePetInput(pet);
 next.level=level;next.levelSource='user-confirmed';next.owned=petOwned(next);
 return normalizePetInput(next);
}
