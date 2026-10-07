import levels from './data/pet-levels.json' with {type:'json'};
const key=value=>String(value??'').normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-');
const canonicalIds=new Set(Object.keys(levels.pets).map(name=>`pet-${key(name)}`));
const aliases=new Map(Object.keys(levels.pets).map(name=>[key(name),`pet-${key(name)}`]));
aliases.set('grey-wolf','pet-gray-wolf');
// App catalog identity is separate from saved instance IDs and undocumented API IDs.
export function canonicalPetId(pet){
 if(typeof pet==='string')return canonicalIds.has(pet)?pet:aliases.get(key(pet))??null;
 if(pet?.canonicalPetId!=null)return canonicalIds.has(pet.canonicalPetId)?pet.canonicalPetId:null;
 if(canonicalIds.has(pet?.id))return pet.id;
 return aliases.get(key(pet?.name))??null;
}
