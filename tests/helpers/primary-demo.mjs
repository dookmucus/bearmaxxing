import {demoProfile as legacyDemoProfile} from '../../src/profile.mjs';
import {defaultGear,defaultHeroes} from '../../src/data/roster.mjs';
// A calculation fixture with the editor's twelve explicit primary selections.
// Synthetic fixture only: known hero identities and explicit zero skills/widgets.
// No saved player profile is migrated or remapped by this helper.
export function demoProfile(){
 const p=legacyDemoProfile(),reference=p.gear;
 const names=['Helga','Petra','Rosa','Yang'];
 p.heroes=p.heroes.map((hero,index)=>({...hero,name:names[index],canonicalHeroId:`roster-${names[index].toLowerCase()}`,starStep:(hero.stars*6)+1,widget:0,skillLevels:{1:0,2:0,3:0},skillLevelSource:{1:'user-confirmed',2:'user-confirmed',3:'user-confirmed'},included:index<3}));
 p.heroes.push(...defaultHeroes().filter(hero=>!names.includes(hero.name)).map(hero=>({...hero,included:false})));
 p.gear=defaultGear().map(g=>{
  const selected=reference.find(x=>x.troop===g.troop&&x.slot===g.slot);
  return selected?{...selected,id:g.id}:{...g,quality:'none',lethality:0};
 });
 return p;
}
