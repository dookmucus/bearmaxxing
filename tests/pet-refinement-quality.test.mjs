import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canonicalPetId} from '../src/pet-identity.mjs';
import {refinementQuality,REFINEMENT_COLORS,PET_REFINEMENT_AUDIT} from '../src/pet-refinement-quality.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {emptyProfile} from '../src/profile.mjs';
import {petRefinementEffect} from '../src/pet-effects.mjs';

test('Gray Wolf reported green ceiling is never used as a green starting value',()=>{
 for(const value of ['1.02','1.50','2.00','2.009999'])assert.equal(refinementQuality('pet-gray-wolf',value).quality,'green');
 assert.equal(refinementQuality('pet-gray-wolf','2.01').quality,'green');
 assert.equal(refinementQuality('pet-gray-wolf','2.010001').quality,'blue');
 assert.equal(refinementQuality('pet-gray-wolf','3.349999').quality,'blue');
 assert.equal(refinementQuality('pet-gray-wolf','3.35').quality,'blue');
 assert.equal(refinementQuality('pet-gray-wolf','3.350001').quality,'purple');
 assert.equal(refinementQuality('pet-gray-wolf',6.70).quality,'gold');
 assert.equal(refinementQuality('pet-gray-wolf',8.70).quality,null);
 assert.equal(refinementQuality('pet-gray-wolf',1.01).quality,'gray');
 assert.match(refinementQuality('pet-gray-wolf',2.01).description,/up to 2.01% \(inclusive\)/);
 assert.match(refinementQuality('pet-gray-wolf',1.5).description,/blue above 2.01%/);
});
test('new Elephant transition table supersedes the earlier partial gray observation',()=>{
 assert.equal(refinementQuality('pet-ironclad-war-elephant',5.499999).quality,'gray');
 assert.equal(refinementQuality('pet-ironclad-war-elephant',5.5).quality,'green');
 for(const value of [7.369999,7.37,7.38])assert.equal(refinementQuality('pet-ironclad-war-elephant',value).quality,'green');
 assert.equal(refinementQuality('pet-ironclad-war-elephant',7).next,16.2);
});
test('canonical IDs select pet-specific mappings independently of display names and portrait rarity',()=>{
 assert.equal(refinementQuality({id:'pet-gray-wolf',name:'Ironclad War Elephant'},1.5).quality,'green');
 assert.equal(refinementQuality({id:'pet-ironclad-war-elephant',name:'Gray Wolf'},1.5).quality,'gray');
 assert.equal(refinementQuality({id:'saved-instance',canonicalPetId:'pet-gray-wolf',name:'Renamed'},1.5).quality,'green');
 assert.equal(canonicalPetId({id:'legacy',name:'  GREY WOLF '}),'pet-gray-wolf');
 assert.equal(refinementQuality({id:'custom',name:'Unmapped pet'},1.5).color,REFINEMENT_COLORS.neutral);
 assert.equal(refinementQuality({canonicalPetId:'unknown',name:'Gray Wolf'},1.5).quality,null);
 for(const pet of ['pet-regal-white-lion','pet-ironclad-war-bear'])assert.equal(refinementQuality(pet,1.5).quality,'gray');
});
test('Lynx, Bison and Cheetah use their own reported inclusive green ceilings',()=>{
 for(const [id,lower,ceiling] of [['pet-lynx',2.01,4.02],['pet-bison',2.01,4.02],['pet-cheetah',3.02,6.03]]){
  assert.equal(refinementQuality(id,ceiling-0.000001).quality,'green');
  assert.equal(refinementQuality(id,String(ceiling)).quality,'green');
  assert.equal(refinementQuality(id,ceiling+0.000001).quality,'blue');
  assert.equal(refinementQuality(id,lower).quality,'gray');
 }
 assert.equal(refinementQuality('pet-gray-wolf',4.02).quality,'purple');
 assert.equal(refinementQuality('pet-lynx',4.02).quality,'green');
 assert.equal(refinementQuality('pet-bison',6.03).quality,'blue');
 assert.equal(refinementQuality('pet-cheetah',6.03).quality,'green');
});
test('explicit inclusive and exclusive limits compare raw decimals without rounding',()=>{
 const tables={'pet-gray-wolf':{source:'boundary fixture',status:'fixture',bands:[
  {quality:'gray',min:0,minInclusive:true,max:1.01,maxInclusive:true},
  {quality:'green',min:1.01,minInclusive:false,max:2.01,maxInclusive:true},
  {quality:'blue',min:2.01,minInclusive:false,max:3.35,maxInclusive:true}
 ]}};
 for(const [value,color] of [[0,'gray'],[1.01,'gray'],['1.010001','green'],['2.009999','green'],['2.01','green'],['2.010001','blue'],[3.35,'blue']])assert.equal(refinementQuality('pet-gray-wolf',value,tables).quality,color);
 assert.equal(refinementQuality('pet-gray-wolf',3.350001,tables).quality,null);
 for(const value of [null,'',-1,NaN,Infinity,'not a percentage'])assert.equal(refinementQuality('pet-gray-wolf',value,tables).quality,null);
});
test('identity migration and independent color evaluation preserve all entered percentages and effects',()=>{
 const p=emptyProfile();
 p.pets.find(p=>p.name==='Gray Wolf').refinement={infantry:'1.50',cavalry:'2.01',archer:'100.00'};
 p.pets.find(p=>p.name==='Gray Wolf').level=50;
 p.pets.find(p=>p.name==='Ironclad War Elephant').refinement={infantry:'7.369999',cavalry:'7.37',archer:'7.38'};
 p.pets.find(p=>p.name==='Ironclad War Elephant').level=50;
 const migrated=migrateProfile(p),before=structuredClone(migrated),effect=petRefinementEffect(migrated);
 for(const pet of migrated.pets)for(const value of Object.values(pet.refinement))refinementQuality(pet,value);
 assert.deepEqual(migrated,before);assert.deepEqual(petRefinementEffect(migrated),effect);
 for(const name of ['Gray Wolf','Ironclad War Elephant']){
  const saved=p.pets.find(p=>p.name===name),next=migrated.pets.find(p=>p.name===name);
  assert.equal(next.id,saved.id);assert.deepEqual(next.refinement,saved.refinement);
  assert.equal(next.canonicalPetId,saved.id);
 }
 assert.equal(PET_REFINEMENT_AUDIT.byPetId['pet-ironclad-war-elephant'].bands[0].max,5.5);
});


test('all supplied pet-group ceilings are inclusive and transition without rounding',()=>{
 const groups=[
  [['gray-wolf'],[1.01,2.01,3.35,4.69,6.7]],
  [['lynx','bison'],[2.01,4.02,6.7,9.39,13.41]],
  [['cheetah','moose'],[3.02,6.03,10.06,14.08,20.11]],
  [['lion','grizzly-bear'],[4.36,8.72,14.53,20.34,29.05]],
  [['giant-rhino','mighty-bison'],[6.7,13.41,22.35,31.28,44.69]]
 ];
 const colors=['gray','green','blue','purple','gold'];
 for(const [pets,ceilings] of groups)for(const pet of pets){
  const id=`pet-${pet}`;assert.equal(refinementQuality(id,0).quality,'gray');
  for(const [index,ceiling] of ceilings.entries()){
   assert.equal(refinementQuality(id,String(ceiling)).quality,colors[index],`${pet} at ${ceiling}`);
   assert.equal(refinementQuality(id,ceiling-0.000001).quality,colors[index]);
   assert.equal(refinementQuality(id,ceiling+0.000001).quality,colors[index+1]??null);
  }
 }
 assert.equal(refinementQuality('pet-gray-wolf',3).quality,'blue');
 assert.equal(refinementQuality('pet-lynx',3).quality,'green');
 assert.equal(refinementQuality('pet-lion',3).quality,'gray');
 assert.equal(refinementQuality('pet-great-moose',3).quality,'gray');
});


test('generation 5–7 transitions start the next color at equality without rounding',()=>{
 const groups=[
  [['alpha-black-panther','great-moose'],[5,14.8,24.5,35,45]],
  [['regal-white-lion','ironclad-war-elephant'],[5.5,16.2,26.8,38.5,50]],
  [['ironclad-war-bear'],[6,17.5,29,41.5,55]]
 ];
 const qualities=['gray','green','blue','purple','legendary','mythic'];
 for(const [pets,starts] of groups)for(const pet of pets){
  const id=`pet-${pet}`;
  assert.equal(refinementQuality(id,0).quality,'gray');
  for(const [i,value] of starts.entries()){
   assert.equal(refinementQuality(id,value-0.000001).quality,qualities[i]);
   assert.equal(refinementQuality(id,String(value)).quality,qualities[i+1]);
   assert.equal(refinementQuality(id,value+0.000001).quality,qualities[i+1]);
  }
  assert.equal(refinementQuality(id,100).quality,'mythic');
  assert.equal(refinementQuality(id,100).next,null);
 }
 assert.equal(refinementQuality('pet-alpha-black-panther',5).quality,'green');
 assert.equal(refinementQuality('pet-regal-white-lion',5).quality,'gray');
 assert.equal(refinementQuality('pet-ironclad-war-bear',5.5).quality,'gray');
 assert.match(refinementQuality('pet-great-moose',14.8).description,/Rare.*Next quality: Epic at 24.5%/);
 assert.equal(refinementQuality('pet-great-moose',35).color,REFINEMENT_COLORS.legendary);
 assert.equal(refinementQuality('pet-great-moose',45).color,REFINEMENT_COLORS.mythic);
 assert.equal(refinementQuality({canonicalPetId:'pet-great-moose',name:'Renamed'},35).quality,'legendary');
});
