import {primaryGearLocation} from '../active-gear.mjs';
import {normalizeHeroAvailability,normalizeActiveBearPlan} from '../bear-plan-defaults.mjs';
import {normalizePetInput} from '../pet-inputs.mjs';
import {applyInputDefaults} from '../input-defaults.mjs';
// Names and known troop classes from the community hero index. A blank class
// means the class still needs confirmation; no combat value is inferred.
import {defaultIncluded,starStepForStars} from '../hero-effects.mjs';
import {starStageParts} from '../star-progression.mjs';
import {applySkillDefaults,isMissingSkillValue} from '../hero-skill-unlocks.mjs';
import {masterSquadInputValue,masterRequiresSquadInput} from '../master-effects.mjs';
import {normalizeGearQuality} from '../gear-progression.mjs';
import {migrateLegacyMixedTroops} from '../troop-inventory.mjs';
import {HERO_ROSTER,heroReferenceName} from '../hero-identity.mjs';
import {normalizeHeroProgression} from '../hero-progression-inputs.mjs';
export {HERO_ROSTER};
export const GEAR_SLOTS = ['helmet','gloves','armor','boots'];
export const PET_NAMES = ['Gray Wolf','Lynx','Bison','Cheetah','Moose','Lion','Grizzly Bear','Giant Rhino','Mighty Bison','Great Moose','Alpha Black Panther','Regal White Lion','Ironclad War Elephant','Ironclad War Bear'];
export const MASTER_NAMES = ['Valora','Cassia','Pan','Roman','Wilson','Guinevere','Isnor','Aena'];
export const heroKey = name => String(name ?? '').trim().toLocaleLowerCase();
export function defaultHeroes() { return HERO_ROSTER.map(([name,troop]) => applySkillDefaults({id:`roster-${heroKey(name).replace(/[^a-z0-9]+/g,'-')}`,canonicalHeroId:`roster-${heroKey(name).replace(/[^a-z0-9]+/g,'-')}`,name,troop,owned:false,included:false,marchAvailable:true,level:80,stars:5,starStep:31,starStepSource:'assumed full 5 stars',skillLevels:{},skillLevelSource:{},widget:0,attack:null,lethality:null,advancedAttack:null,advancedLethality:null,provenance:{owned:'assumed',level:'assumed',stars:'assumed',widget:'assumed'}})); }
export function defaultGear() { return ['infantry','cavalry','archer'].flatMap(troop => GEAR_SLOTS.map(slot => ({id:`set-${troop}-${slot}`,name:`${troop[0].toUpperCase()+troop.slice(1)} ${slot}`,troop,slot,quality:'gold',enhancement:0,forge:0,imbuementConfirmed:{},imbuementAttack:null,lethality:null,provenance:{quality:'assumed',enhancement:'assumed',forge:'assumed'}}))); }
export function defaultMasters() { return MASTER_NAMES.map(name => ({id:`master-${name.toLowerCase()}`,name,provenance:'assumed',affinityLevel:1,squadBonus:0,talentLevel:0,skillLevels:{1:0,2:0,3:0,4:0},specialResearchProgress:0})); }
export function defaultPets() { return PET_NAMES.map(name => ({id:`pet-${heroKey(name).replace(/[^a-z0-9]+/g,'-')}`,canonicalPetId:`pet-${heroKey(name).replace(/[^a-z0-9]+/g,'-')}`,name,owned:false,level:0,levelSource:'assumed',advancementConfirmed:null,refinement:{infantry:0,cavalry:0,archer:0},active:false,skillLevel:null,provenance:'assumed',notes:''})); }
export function migrateProfile(old) {
  const p=structuredClone(old);
  const catalogue=defaultHeroes(),heroes=[];
  for(const savedHero of p.heroes??[]) {
    const h=normalizeHeroProgression(normalizeHeroAvailability(savedHero));
    const i=catalogue.findIndex(x=>x.name===heroReferenceName(h));
    const wholeStars=Number.isInteger(h.stars)&&h.stars>=0&&h.stars<=5?h.stars:null;
    const inferred=typeof h.starStepSource==='string'&&h.starStepSource.startsWith('inferred from');
    const unresolved=typeof h.starStepSource==='string'&&h.starStepSource.startsWith('ambiguous') || h.starStepSource==='user-confirmed'&&h.starStep===null;
    const exactStage=!inferred&&starStageParts(h.starStep)?h.starStep:null;
    const assumeStars=!unresolved&&h.stars==null&&h.starStep==null;
    const stage=unresolved?null:exactStage??(wholeStars!==null?starStepForStars(wholeStars):assumeStars?31:null);
    const savedSkillSource={...h.skillLevelSource};
    for(const slot of Object.keys(h.skillLevels??{}))if(!isMissingSkillValue(h.skillLevels[slot])&&!savedSkillSource[slot])savedSkillSource[slot]='saved-unclassified';
    const migrated={...h,...(i>=0?{canonicalHeroId:h.canonicalHeroId??catalogue[i].canonicalHeroId}:{}),widget:h.widget??0,provenance:{...h.provenance,...(h.widget==null?{widget:'assumed'}:{})},skillLevelSource:savedSkillSource,included:typeof h.included==='boolean'?h.included:i<0?true:defaultIncluded(h),marchAvailable:typeof h.marchAvailable==='boolean'?h.marchAvailable:h.included===false?false:true,
      stars:stage?starStageParts(stage).stars:unresolved?null:wholeStars,
      starStep:stage,
      starStepSource:assumeStars?'assumed full 5 stars':exactStage?h.starStepSource??'saved exact stage':stage!==null?(inferred?h.starStepSource:h.starStepSource??'inferred from saved whole-star count; review'):'ambiguous saved progression; review',
      ...(wholeStars===null&&h.stars!=null?{legacyStars:h.stars}:{}),
      ...(!starStageParts(h.starStep)&&h.starStep!=null?{legacyStarStep:h.starStep}:{})};
    if(i<0)heroes.push(applySkillDefaults(migrated));
    else heroes.push(applySkillDefaults({...catalogue[i],...migrated,owned:h.owned??true,skillLevelSource:{...catalogue[i].skillLevelSource,...savedSkillSource},provenance:{...catalogue[i].provenance,owned:h.provenance?.owned??(h.imported?'imported':h.owned!==undefined?'user-confirmed':'assumed'),level:h.provenance?.level??(h.imported?'imported':h.level!==undefined?'user-confirmed':'assumed'),stars:h.provenance?.stars??(h.imported?'imported':h.stars!==undefined?'user-confirmed':'assumed'),...migrated.provenance}}));
  }
  p.heroes=heroes;
  const gear=defaultGear(),savedGearIds=new Set();
  for(const g of p.gear??[]) {const i=gear.findIndex(x=>x.id===g.id);const migrated=primaryGearLocation(g.id)?{...g,quality:normalizeGearQuality(g.quality),imbuementConfirmed:{...(g.imbuementConfirmed??{})}}:{...g};if(i>=0&&!savedGearIds.has(g.id))gear[i]={...gear[i],...migrated};else gear.push(migrated);savedGearIds.add(g.id);}
  p.gear=gear;
  const mergeNamed=(defaults,items)=>{for(const item of items??[]){const i=defaults.findIndex(x=>heroKey(x.name)===heroKey(item.name));if(i>=0)defaults[i]={...defaults[i],...item};else defaults.push(item);}return defaults;};
  p.masters=mergeNamed(defaultMasters(),(p.masters??[]).map(m=>({...m,affinityLevel:m.affinityLevel??(masterRequiresSquadInput(m.name)?m.level??1:1),squadBonus:Object.hasOwn(m,'squadBonus')?(m.squadBonus??0):(masterRequiresSquadInput(m.name)?0:masterSquadInputValue(m)||0),skillLevels:{...m.skillLevels,...(m.name==='Valora'&&m.rallyLevel!=null&&!Object.hasOwn(m.skillLevels??{},1)?{1:m.rallyLevel}:{}) ,...(m.name==='Valora'&&m.deployLevel!=null&&!Object.hasOwn(m.skillLevels??{},4)?{4:m.deployLevel}:{})}}))).map(({owned,...m})=>({...m,skillLevels:{1:0,2:0,3:0,4:0,...m.skillLevels}}));
  p.pets=mergeNamed(defaultPets(),(p.pets??[]).map(pet=>normalizePetInput(pet,p.assumedInputs))).map(pet=>({...pet,refinement:{infantry:null,cavalry:null,archer:null,...pet.refinement}}));
  p.defaultTroopTier??=10;p.mixedTiersEnabled??=false;
  p.accountBaseCapacity??=null;
  p.capacityInputMode??=[p.hostCapacity,p.joinCapacity,p.pusherCapacity].some(value=>value!==null&&value!==undefined)?'legacy-base':'actual';
  p.tierInventory??=Object.fromEntries(['infantry','cavalry','archer'].map(t=>[t,{}]));
  Object.assign(p,migrateLegacyMixedTroops(p));
  p.marchSlots??=4;p.pusherEnabled??=false;p.pusherCapacity??=null;p.otherPetRefinement??={attack:null,lethality:null};
  p.petRefinementMode=p.petRefinementMode==='combined'?'combined':'per-pet';
  p.combinedPetRefinement={infantry:null,cavalry:null,archer:null,...p.combinedPetRefinement};
  return normalizeActiveBearPlan(applyInputDefaults(p));
}
