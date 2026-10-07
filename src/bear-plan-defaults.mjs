import {HERO_ROSTER,heroReferenceName,canonicalHeroId} from './hero-identity.mjs';
const key=name=>String(name??'').normalize('NFKC').trim().toLowerCase().replace(/[\s_-]+/g,'');
// Identity recovery applies to the whole roster, never to a reserved role.
export function normalizeHeroAvailability(hero){
 const name=heroReferenceName(hero),record=HERO_ROSTER.find(([n])=>n===name||key(n)===key(hero?.name));
 if(!record)return hero;
 const autoIncluded=hero.provenance?.included==='automatic-reservation';
 const autoAvailable=hero.provenance?.marchAvailable==='automatic-reservation'&&hero.provenance?.included!=='user-confirmed';
 return {...hero,canonicalHeroId:hero.canonicalHeroId??canonicalHeroId(record[0]),name:hero.name?.trim()?hero.name:record[0],troop:hero.troop||record[1],
  ...(autoIncluded||autoAvailable?{legacyAutomaticReservation:{included:hero.included,marchAvailable:hero.marchAvailable,provenance:{...hero.provenance}}}:{}),
  ...(autoIncluded?{included:true}:{}),
  marchAvailable:autoAvailable?true:typeof hero.marchAvailable==='boolean'?hero.marchAvailable:autoIncluded||hero.included!==false,
  provenance:{...hero.provenance,...(autoIncluded?{included:'reservation-migration'}:{}),...(autoAvailable?{marchAvailable:'reservation-migration'}:{})}};
}
export function normalizeActiveBearPlan(profile){
 const p={...profile};
 if(p.rolePlanVersion!==1){
  p.legacyAutomaticReservations??=structuredClone({joiners:p.joiners??[],activeBearPlanVersion:p.activeBearPlanVersion??null});
 }
 // Keep saved capacities, ratios, progression and exclusions. Legacy joiner
 // entries are retained for provenance/capacity, but do not reserve heroes.
 p.hostEnabled??=true;p.joinCount??=3;p.marchSlots??=4;
 p.ratios??={infantry:10,cavalry:10,archer:80};
 p.joiners??=Array.from({length:p.joinCount},()=>({name:'',skill:null}));
 p.capacityPlanningModel??='shared-maximum';
 p.rolePlanVersion=1;
 return p;
}
export function setBearPusher(profile,enabled){return {...profile,pusherEnabled:enabled,marchSlots:profile.capacityPlanningModel==='shared-maximum'?4:enabled?5:4};}
