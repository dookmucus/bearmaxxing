export const HERO_ROSTER = [
  ['Helga','infantry'],['Amadeus','infantry'],['Jabel','cavalry'],['Saul','archer'],
  ['Howard','infantry'],['Gordon','cavalry'],['Quinn','archer'],['Chenko','cavalry'],
  ['Diana','archer'],['Amane','archer'],['Yeonwoo','archer'],['Fahd','cavalry'],
  ['Forrest','infantry'],['Seth','infantry'],['Edwin','cavalry'],['Olive','archer'],
  ['Zoe','infantry'],['Hilde','cavalry'],['Marlin','archer'],
  ['Eric','infantry'],['Petra','cavalry'],['Jaeger','archer'],
  ['Alcar','infantry'],['Margot','cavalry'],['Rosa','archer'],
  ['Long Fei','infantry'],['Thrud','cavalry'],['Vivian','archer'],
  ['Triton','infantry'],['Sophia','cavalry'],['Yang','archer'],
  ['Charles','infantry'],['Ava','cavalry'],['Wee & Woo','archer'],
  ['Diego','infantry'],['Liz','cavalry'],['Luna','archer']
];
const key=value=>String(value??'').normalize('NFKC').trim().toLowerCase();
const HERO_ALIASES={jaegar:'Jaeger'};
export const canonicalHeroId=name=>`roster-${key(HERO_ALIASES[key(name)]??name).replace(/[^a-z0-9]+/g,'-')}`;
const namesById=new Map(HERO_ROSTER.map(([name])=>[canonicalHeroId(name),name]));
const namesByKey=new Map(HERO_ROSTER.map(([name])=>[key(name),name]));
// Hidden at the user's request; retain reference identities and saved data.
const hiddenHeroes=new Set(['Diego','Liz','Luna']);
const joiningExcludedHeroes=new Set(['Charles','Ava','Wee & Woo']);
export const heroAvailableInPlanner=hero=>!hiddenHeroes.has(heroReferenceName(hero));
// Gen 7 can be entered and reviewed, but no joining slot may use it yet.
export const heroAvailableForJoining=hero=>heroAvailableInPlanner(hero)&&!joiningExcludedHeroes.has(heroReferenceName(hero));
export function heroReferenceName(hero){
 const record=typeof hero==='object'&&hero!==null?hero:null;
 const id=record?.canonicalHeroId??(typeof record?.id==='string'&&record.id.startsWith('roster-')?record.id:null);
 if(id)return namesById.get(id)??HERO_ALIASES[id.replace(/^roster-/,'')]??null;
 return namesByKey.get(key(record?.name??hero))??HERO_ALIASES[key(record?.name??hero)]??(typeof (record?.name??hero)==='string'?String(record?.name??hero).trim():null);
}
