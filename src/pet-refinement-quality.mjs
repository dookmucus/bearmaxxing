import {englishMessage} from './english-messages.mjs';
import levels from './data/pet-levels.json' with {type:'json'};
import {canonicalPetId} from './pet-identity.mjs';
const ceilingSource='https://kingshothandbook.com/guides/kingshot-pets-system-guide';
// User-supplied table lists color-band ceilings for these explicit pet groups.
// Equality stays in the listed band, consistent with the reported in-game limits.
const suppliedTableSource='User-supplied refinement ceiling table, 2026-10-05';
const qualities=['gray','green','blue','purple','gold'];
const reportedGroups=[
 {pets:['gray-wolf'],ceilings:[1.01,2.01,3.35,4.69,6.7]},
 {pets:['lynx','bison'],ceilings:[2.01,4.02,6.7,9.39,13.41]},
 {pets:['cheetah','moose'],ceilings:[3.02,6.03,10.06,14.08,20.11]},
 {pets:['lion','grizzly-bear'],ceilings:[4.36,8.72,14.53,20.34,29.05]},
 {pets:['giant-rhino','mighty-bison'],ceilings:[6.7,13.41,22.35,31.28,44.69]}
];
const suppliedTables=Object.fromEntries(reportedGroups.flatMap(({pets,ceilings})=>pets.map(id=>[
 `pet-${id}`,{source:suppliedTableSource,status:'user-supplied pet-group table',bands:ceilings.map((max,index)=>({quality:qualities[index],min:index?ceilings[index-1]:0,minInclusive:index===0,max,maxInclusive:true}))}
])));
// These are color STARTS, unlike the older pet-group ceilings above.
const transitionSource='User-supplied generation 5–7 refinement transition table, 2026-10-05';
const transitionQualities=['gray','green','blue','purple','legendary','mythic'];
const transitionLabels=['Common','Uncommon','Rare','Epic','Legendary','Mythic'];
const transitionGroups=[
 {pets:['alpha-black-panther','great-moose'],starts:[5,14.8,24.5,35,45]},
 {pets:['regal-white-lion','ironclad-war-elephant'],starts:[5.5,16.2,26.8,38.5,50]},
 {pets:['ironclad-war-bear'],starts:[6,17.5,29,41.5,55]}
];
const transitionTables=Object.fromEntries(transitionGroups.flatMap(({pets,starts})=>pets.map(id=>[
 `pet-${id}`,{source:transitionSource,status:'user-supplied transition table',kind:'transitions',bands:[0,...starts].map((min,index)=>({quality:transitionQualities[index],label:transitionLabels[index],min,minInclusive:true,max:starts[index]??Infinity,maxInclusive:false}))}
])));
export const PET_REFINEMENT_AUDIT={
 checked:'2026-10-05',
 sources:[suppliedTableSource,ceilingSource,transitionSource],
 byPetId:{
  ...suppliedTables,
  // The newer explicit transition table supersedes the earlier Elephant report.
  ...transitionTables
 }
};
export const REFINEMENT_COLORS={neutral:'#aeb5c5',gray:'#cbd0da',green:'#9cdaa7',blue:'#92caf3',purple:'#a374f4',gold:'var(--accent-yellow)',legendary:'#f5a442',mythic:'#f16b73'};
export function refinementQuality(pet,value,tables=PET_REFINEMENT_AUDIT.byPetId){
 const petId=canonicalPetId(pet),table=petId?tables[petId]:null,n=Number(value);
 const neutral={quality:null,color:REFINEMENT_COLORS.neutral,next:null,description:englishMessage("messages.pet.refinement.quality.refinementQuality.the.app.has.no.color.threshold.for.this.pet.at")};
 if(value==null||value===''||!Number.isFinite(n)||n<0)return {...neutral,description:englishMessage("messages.pet.refinement.quality.refinementQuality.enter.a.nonnegative.refinement.percentage")};
 if(!table?.source||!table.bands?.length)return neutral;
 // Compare raw entered values. Never round to the game's displayed precision.
 const boundary=table.bands.find(b=>n===b.min&&b.minInclusive==null||n===b.max&&b.maxInclusive==null);
 if(boundary)return {...neutral,description:englishMessage("messages.pet.refinement.quality.refinementQuality.the.app.has.not.confirmed.which.color.applies.at.exactly",{n:n})};
 const band=table.bands.find(b=>(n>b.min||n===b.min&&b.minInclusive===true)&&(n<b.max||n===b.max&&b.maxInclusive===true));
 if(!band)return neutral;
 const next=table.bands.find(b=>b.min>=band.max&&b.minInclusive!=null);
 if(table.kind==='transitions')return {quality:band.quality,color:REFINEMENT_COLORS[band.quality],next:next?.min??null,description:englishMessage("messages.pet.refinement.quality.refinementQuality.refinement",{label:band.label,detail:next?englishMessage("messages.pet.refinement.quality.refinementQuality.next.quality.at",{label:next.label,min:next.min}):englishMessage("messages.pet.refinement.quality.refinementQuality.highest.reported.quality.no.further.transition.is.listed")})};
 const label=band.quality[0].toUpperCase()+band.quality.slice(1);
 return {quality:band.quality,color:REFINEMENT_COLORS[band.quality]??REFINEMENT_COLORS.neutral,next:next?.min??null,description:englishMessage("messages.pet.refinement.quality.refinementQuality.refinement.up.to",{label:label,max:band.max,detail:band.maxInclusive?englishMessage("messages.pet.refinement.quality.refinementQuality.inclusive"):englishMessage("messages.pet.refinement.quality.refinementQuality.exclusive"),detail2:next?englishMessage("messages.pet.refinement.quality.refinementQuality.next.color",{quality:next.quality,detail:next.minInclusive?'at':'above',min:next.min}):englishMessage("messages.pet.refinement.quality.refinementQuality.no.higher.color.threshold.is.mapped.in.the.app")})};
}

export function petPortraitColor(name){
 const entry=levels.pets[name];
 if(!entry)return REFINEMENT_COLORS.neutral;
 const max=Math.max(...Object.keys(entry.attackByLevel).map(Number));
 return REFINEMENT_COLORS[{50:'gray',60:'green',70:'blue',80:'purple',100:'gold'}[max]]??REFINEMENT_COLORS.neutral;
}
