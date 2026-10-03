const types=['infantry','cavalry','archer'];
export function emptyProfile(){return {
 schemaVersion:1, name:'',playerId:'100111478',city:'',kingdom:'',hostEnabled:true,hostCapacity:100000,joinCount:3,joinCapacity:100000,
 ratios:{infantry:10,cavalry:10,archer:80},weights:{infantry:1,cavalry:1,archer:1},
 troops:Object.fromEntries(types.map(t=>[t,{count:0,tier:10,tg:0}])),stats:Object.fromEntries(types.map(t=>[t,{attack:0,lethality:0}])),
 heroes:[],gear:[],joiners:[{name:'Amane',skill:5},{name:'Yeonwoo',skill:5},{name:'Chenko',skill:5}],upgrades:[],importedAt:null,apiCoverage:[],isDemo:false
};}
export function demoProfile(){const p=emptyProfile();return {...p,name:'Example governor',playerId:'',city:'30',kingdom:'Demo',isDemo:true,
 troops:{infantry:{count:160000,tier:10,tg:2},cavalry:{count:140000,tier:10,tg:2},archer:{count:245000,tier:10,tg:2}},
 stats:{infantry:{attack:220,lethality:170},cavalry:{attack:260,lethality:190},archer:{attack:340,lethality:260}},
 weights:{infantry:1,cavalry:3,archer:4.4},
 heroes:[{id:'h1',name:'Infantry candidate',troop:'infantry',stars:4,level:80,attack:50,lethality:0,multiplier:1,modeled:true},{id:'h2',name:'Cavalry candidate',troop:'cavalry',stars:4,level:80,attack:60,lethality:0,multiplier:1,modeled:true},{id:'h3',name:'Archer candidate A',troop:'archer',stars:4,level:80,attack:70,lethality:0,multiplier:1.15,modeled:true},{id:'h4',name:'Archer candidate B',troop:'archer',stars:3,level:70,attack:50,lethality:0,multiplier:1.05,modeled:true}],
 gear:[{id:'g1',troop:'archer',slot:'helmet',quality:'Mythic',enhancement:70,forge:5,lethality:40},{id:'g2',troop:'archer',slot:'boots',quality:'Mythic',enhancement:60,forge:4,lethality:30},{id:'g3',troop:'cavalry',slot:'helmet',quality:'Mythic',enhancement:50,forge:3,lethality:20}],
 joiners:[{name:'Amane',skill:5},{name:'Yeonwoo',skill:4},{name:'Chenko',skill:5}],
 upgrades:[{id:'u1',name:'Archer helmet mastery step',kind:'stat',troop:'archer',stat:'lethality',delta:8,cost:50,resource:'Forge hammers'},{id:'u2',name:'Archer research step',kind:'stat',troop:'archer',stat:'attack',delta:5,cost:120,resource:'Research materials'}]
};}
export function mergeApi(profile,response){
 const raw=response.player; if(!raw || typeof raw!=='object')throw new Error('The provider returned no player profile.');
 const next=structuredClone(profile);next.name=String(raw.nick_name??next.name);next.city=String(raw.town_center_level??next.city);next.kingdom=String(raw.kid??next.kingdom);next.importedAt=response.cached_at || new Date().toISOString();next.isDemo=false;
 const heroes=Array.isArray(raw.heroes)?raw.heroes:Array.isArray(response.heroes)?response.heroes:[];
 heroes.forEach(h=>{
   const id=`api-hero-${h.id}`;const existing=next.heroes.find(x=>x.id===id);const troop=String(h.gear?.[0]?.troop_label || h.gear?.[0]?.troop || '').toLowerCase();const matched=types.find(t=>troop.includes(t));
   const item={id,name:String(h.name || `Hero ${h.id}`),troop:matched || existing?.troop || 'archer',stars:Number(h.stars??h.star)||0,level:Number(h.level)||0,attack:existing?.attack??0,lethality:existing?.lethality??0,multiplier:existing?.multiplier??1,modeled:existing?.modeled??false,widget:Number(h.exclusive_gear_level)||0,imported:true,needsTroopConfirmation:!matched};
   if(existing)Object.assign(existing,item);else next.heroes.push(item);
   (Array.isArray(h.gear)?h.gear:[]).forEach((g,i)=>{
     const slot=String(g.slot).toLowerCase();if(!['helmet','gloves','armor','boots'].includes(slot))return;
     // Provider does not document whether eid uniquely identifies an instance; preserve per-hero slot identity.
     const gid=`api-gear-${h.id}-${slot}-${i}`;const prior=next.gear.find(x=>x.id===gid);
     const entry={id:gid,troop:matched||item.troop,slot,quality:String(g.quality_label||g.quality_key||g.quality||'Unknown'),enhancement:Number(g.enhancement_level)||0,forge:Number(g.refine_level)||0,lethality:prior?.lethality??0,imported:true};
     if(prior)Object.assign(prior,entry);else next.gear.push(entry);
   });
 });
 next.apiCoverage=['Public profile',`${heroes.length} Arena defense heroes`,'Equipped gear only'];
 return next;
}
