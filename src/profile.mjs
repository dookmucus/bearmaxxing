import {heroReferenceName} from './hero-identity.mjs';
import {normalizeHeroAvailability} from './bear-plan-defaults.mjs';
import {applyInputDefaults} from './input-defaults.mjs';
const types=['infantry','cavalry','archer'];
import {defaultGear,defaultMasters,defaultPets,heroKey,migrateProfile} from './data/roster.mjs';
import {defaultIncluded,starStepForStars} from './hero-effects.mjs';
import {applySkillDefaults} from './hero-skill-unlocks.mjs';
const metadataNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
export function emptyProfile(){return applyInputDefaults({
 schemaVersion:1, name:'',playerId:'',city:'',kingdom:'',hostEnabled:true,hostCapacity:null,joinCount:3,joinCapacity:null,accountBaseCapacity:null,capacityInputMode:'actual',
 gearComplete:false,
 effectiveStats:Object.fromEntries(types.map(t=>[t,{attack:null,lethality:null}])),
 ratios:{infantry:10,cavalry:10,archer:80},weights:{infantry:null,cavalry:null,archer:null},
 troops:Object.fromEntries(types.map(t=>[t,{count:null,tier:null,tg:null}])),stats:Object.fromEntries(types.map(t=>[t,{attack:null,lethality:null}])),
 heroes:[],gear:defaultGear(),masters:defaultMasters(),pets:defaultPets(),joiners:Array.from({length:3},()=>({name:'',skill:null})),upgrades:[],importedAt:null,apiCoverage:[],isDemo:false,marchSlots:4,pusherEnabled:false,pusherCapacity:null,petRefinementMode:'per-pet',combinedPetRefinement:{infantry:null,cavalry:null,archer:null},otherPetRefinement:{attack:null,lethality:null},defaultTroopTier:10,mixedTiersEnabled:false,tierInventory:Object.fromEntries(types.map(t=>[t,{}]))
});}
export function demoProfile(){const p=emptyProfile();return {...p,hostEnabled:true,hostCapacity:100000,joinCapacity:100000,gearComplete:true,name:'Example governor',playerId:'',city:'30',kingdom:'Demo',isDemo:true,
 troops:{infantry:{count:160000,tier:10,tg:2},cavalry:{count:140000,tier:10,tg:2},archer:{count:245000,tier:10,tg:2}},
 stats:{infantry:{attack:220,lethality:170},cavalry:{attack:260,lethality:190},archer:{attack:340,lethality:260}},
 weights:{infantry:1,cavalry:3,archer:4.4},
 heroes:[{id:'h1',name:'Infantry candidate',owned:true,marchAvailable:true,troop:'infantry',included:true,advancedAttack:50,advancedLethality:0,stars:4,level:80,attack:50,lethality:0,multiplier:1,modeled:true},{id:'h2',name:'Cavalry candidate',owned:true,marchAvailable:true,troop:'cavalry',included:true,advancedAttack:60,advancedLethality:0,stars:4,level:80,attack:60,lethality:0,multiplier:1,modeled:true},{id:'h3',name:'Archer candidate A',owned:true,marchAvailable:true,troop:'archer',included:true,advancedAttack:70,advancedLethality:0,stars:4,level:80,attack:70,lethality:0,multiplier:1.15,modeled:true},{id:'h4',name:'Archer candidate B',owned:true,marchAvailable:true,troop:'archer',included:true,advancedAttack:50,advancedLethality:0,stars:3,level:70,attack:50,lethality:0,multiplier:1.05,modeled:true}],
 gear:[{id:'g1',troop:'archer',slot:'helmet',quality:'Mythic',enhancement:70,forge:5,lethality:40},{id:'g2',troop:'archer',slot:'boots',quality:'Mythic',enhancement:60,forge:4,lethality:30},{id:'g3',troop:'cavalry',slot:'helmet',quality:'Mythic',enhancement:50,forge:3,lethality:20}],
 joiners:Array.from({length:3},()=>({name:'',skill:null})),
 upgrades:[{id:'u1',name:'Archer helmet mastery step',kind:'stat',troop:'archer',stat:'lethality',delta:8,cost:50,resource:'Forge hammers'},{id:'u2',name:'Archer research step',kind:'stat',troop:'archer',stat:'attack',delta:5,cost:120,resource:'Research materials'}]
};}
export function mergeApi(profile,response){
 const raw=response.player; if(!raw || typeof raw!=='object')throw new Error('The provider returned no player profile.');
 const next=migrateProfile(profile);next.name=String(raw.nick_name??next.name);next.city=String(raw.town_center_level??next.city);next.kingdom=String(raw.kid??next.kingdom);next.importedAt=response.cached_at || new Date().toISOString();next.isDemo=false;
 const heroes=Array.isArray(raw.heroes)?raw.heroes:Array.isArray(response.heroes)?response.heroes:[];
 heroes.forEach(rawHero=>{
   const h=normalizeHeroAvailability(rawHero);
   const id=`api-hero-${h.id}`;const existing=(heroReferenceName(h)?next.heroes.find(x=>heroReferenceName(x)===heroReferenceName(h)):null)??next.heroes.find(x=>x.id===id||x.apiHeroId!=null&&String(x.apiHeroId)===String(h.id));const troop=String(h.gear?.[0]?.troop_label || h.gear?.[0]?.troop || '').toLowerCase();const matched=types.find(t=>troop.includes(t));
   const importedStars=metadataNumber(h.stars??h.star);
   const importedWholeStars=Number.isInteger(importedStars)&&importedStars>=0&&importedStars<=5?importedStars:null;
   const confirmedStage=existing?.provenance?.starStep==='user-confirmed';
   const confirmedStars=existing?.provenance?.stars==='user-confirmed';
   const confirmedLevel=existing?.provenance?.level==='user-confirmed';
   const confirmedWidget=existing?.provenance?.widget==='user-confirmed';
   const importedOriginals={...existing?.progressionOriginals};
   for(const [field,value,confirmed] of [['stars',h.stars??h.star,confirmedStars||confirmedStage],['level',h.level,confirmedLevel],['widget',h.exclusive_gear_level,confirmedWidget]])if(!confirmed&&typeof value==='string')importedOriginals[field]={value,source:'imported'};
   const item={progressionOriginals:importedOriginals,id:existing?.id??id,apiHeroId:h.id,canonicalHeroId:existing?.canonicalHeroId??h.canonicalHeroId,name:String(existing?.canonicalHeroId?existing.name:h.name || existing?.name || `Hero ${h.id}`),troop:matched || existing?.troop || '',
     owned:existing?.provenance?.owned==='user-confirmed'?existing.owned:true,included:existing?.included??defaultIncluded(h.name),
     stars:confirmedStars||confirmedStage?existing?.stars??null:importedWholeStars??(importedStars!==null?null:existing?.stars??null),
     starStep:confirmedStage||confirmedStars?existing.starStep:importedWholeStars!==null?starStepForStars(importedWholeStars):importedStars!==null?null:existing?.starStep??null,
     starStepSource:confirmedStage||confirmedStars?existing?.starStepSource??'user-confirmed':importedWholeStars!==null?'inferred from imported whole-star count; review':importedStars!==null?'ambiguous imported progression; review':existing?.starStepSource??'unknown',
     ...(importedStars!==null&&importedWholeStars===null?{importedStarsRaw:h.stars??h.star}:{}),
     level:confirmedLevel?existing.level:metadataNumber(h.level)??existing?.level??null,attack:existing?.attack??null,lethality:existing?.lethality??null,
     multiplier:existing?.multiplier??null,modeled:existing?.modeled??false,
     widget:confirmedWidget?existing.widget:metadataNumber(h.exclusive_gear_level)??existing?.widget??0,imported:true,
     provenance:{...existing?.provenance,owned:existing?.provenance?.owned==='user-confirmed'?'user-confirmed':'imported',
       level:confirmedLevel?'user-confirmed':metadataNumber(h.level)!==null?'imported':existing?.provenance?.level,
       stars:confirmedStars||confirmedStage?'user-confirmed':importedWholeStars!==null?'imported':existing?.provenance?.stars,
       widget:confirmedWidget?'user-confirmed':metadataNumber(h.exclusive_gear_level)!==null?'imported':existing?.provenance?.widget??'assumed'},
     needsTroopConfirmation:!matched && !types.includes(existing?.troop)};
   if(existing)Object.assign(existing,applySkillDefaults({...existing,...item}));else next.heroes.push(applySkillDefaults(item));
   (Array.isArray(h.gear)?h.gear:[]).forEach((g,i)=>{
     const slot=String(g.slot).toLowerCase();if(!['helmet','gloves','armor','boots'].includes(slot))return;
     // Provider does not document whether eid uniquely identifies an instance; preserve per-hero slot identity.
     const gid=`api-gear-${h.id}-${slot}-${i}`;const prior=next.gear.find(x=>x.id===gid);
     const choose=(field,incoming)=>prior?.provenance?.[field]==='user-confirmed'?prior[field]:incoming;
     const entry={id:gid,troop:choose('troop',matched||prior?.troop||item.troop),slot,quality:choose('quality',String(g.quality_label||g.quality_key||g.quality||'Unknown')),enhancement:choose('enhancement',metadataNumber(g.enhancement_level)),forge:choose('forge',metadataNumber(g.refine_level)),lethality:prior?.lethality??null,name:prior?.name||`${item.name} ${slot}`,imported:true,provenance:{...prior?.provenance,troop:prior?.provenance?.troop==='user-confirmed'?'user-confirmed':'imported',quality:prior?.provenance?.quality==='user-confirmed'?'user-confirmed':'imported',enhancement:prior?.provenance?.enhancement==='user-confirmed'?'user-confirmed':'imported',forge:prior?.provenance?.forge==='user-confirmed'?'user-confirmed':'imported'}};
     if(prior)Object.assign(prior,entry);else {next.gear.push(entry);next.gearComplete=false;}
   });
 });
 next.apiCoverage=['Public profile',`${heroes.length} Arena defense heroes`,'Equipped gear only'];
 return applyInputDefaults(next);
}
