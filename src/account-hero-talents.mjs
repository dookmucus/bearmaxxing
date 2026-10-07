import {heroReferenceName} from './hero-identity.mjs';
import {starStageParts} from './star-progression.mjs';
// Separate account talent, not an Expedition skill or hosting-only effect.
// Primary: https://kingshotwiki.com/heroes/kingshot_wiki_hero_name_50009_kingshot_end/
// Star increments: https://kingshotoptimizer.com/heroes/helga/
const HELGA_ATTACK=[0,2,4,6,8,10];
export function accountHeroTalents(profile){
 const out={attack:0,effects:[],unsupported:[]};
 const records=(profile.heroes??[]).filter(h=>heroReferenceName(h)==='Helga'&&h.owned===true);
 // Multiple records never duplicate an account talent. Ambiguous progression
 // stays unknown instead of choosing a larger bonus from duplicate records.
 if(!records.length)return out;
 const stages=records.map(h=>starStageParts(h.starStep));
 if(stages.some(s=>!s)||new Set(stages.map(s=>s.stars)).size!==1){out.unsupported.push('Helga: Power of the Deer star progression is unresolved');return out;}
 const stage=stages[0],value=HELGA_ATTACK[stage.stars];
 out.attack=value;
 out.effects.push({hero:'Helga',name:'Power of the Deer',stat:'attack',value,scope:'account-all-classes',activeWhenHeroAbsent:true,expeditionSkill:false,source:'https://kingshotwiki.com/heroes/kingshot_wiki_hero_name_50009_kingshot_end/',progressionSource:'https://kingshotoptimizer.com/heroes/helga/',evidence:'Primary account-talent applicability; community full-star increments'});
 return out;
}
