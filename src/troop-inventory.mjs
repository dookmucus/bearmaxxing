import buildingLevels from './data/troop-building-levels.json' with {type:'json'};

export const TROOP_CLASSES=['infantry','cavalry','archer'];
export const TROOP_TIERS=Array.from({length:11},(_,i)=>i+1);
export const BUILDING_TG_LEVELS=buildingLevels.completedLevels;
export function tierFor(profile,troop){return profile.troops?.[troop]?.tier??profile.defaultTroopTier??10;}
export function inventoryCount(profile,troop){
  if(!profile.mixedTiersEnabled)return profile.troops?.[troop]?.count??null;
  const rows=profile.tierInventory?.[troop]??{};
  const values=Object.values(rows).filter(v=>v!==null&&v!==''&&v!==undefined);
  if(!values.length)return null;
  if(values.some(v=>!Number.isInteger(Number(v))||Number(v)<0))return NaN;
  return values.reduce((sum,v)=>sum+Number(v),0);
}
export function aggregateTroops(profile){
  const copy=structuredClone(profile);
  for(const t of TROOP_CLASSES)copy.troops[t].count=inventoryCount(profile,t);
  return copy;
}
export function enableMixedTiers(profile){
  const next=structuredClone(profile);next.mixedTiersEnabled=true;
  for(const t of TROOP_CLASSES)if(!Object.values(next.tierInventory?.[t]??{}).some(v=>v!==null&&v!==''&&v!==undefined)&&next.troops[t].count!==null){
    next.tierInventory??={};next.tierInventory[t]??={};
    next.tierInventory[t][tierFor(next,t)]=next.troops[t].count;
  }
  return next;
}
export function migrateLegacyMixedTroops(profile){
  if(profile.mixedTiersEnabled!==true)return profile;
  const next=structuredClone(profile);
  next.legacyTroopProgression??={
    mixedTiersEnabled:true,
    tierInventory:structuredClone(profile.tierInventory??{}),
    troops:structuredClone(profile.troops??{})
  };
  for(const troop of TROOP_CLASSES){
    const rows=profile.tierInventory?.[troop]??{};
    const populated=Object.entries(rows).filter(([,count])=>count!==null&&count!==undefined&&count!==''&&Number(count)>0);
    const total=inventoryCount(profile,troop);
    if(total!==null&&!Number.isNaN(total))next.troops[troop].count=total;
    if(populated.length>1){
      next.troops[troop]={...next.troops[troop],tier:null,tg:null,progressionNeedsConfirmation:true};
    }else if(populated.length===1&&next.troops[troop].tier==null){
      next.troops[troop].tier=Number(populated[0][0]);
    }
  }
  next.mixedTiersEnabled=false;
  return next;
}
