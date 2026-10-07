import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeApi} from '../src/profile.mjs';
import {enteredRosterProfile as emptyProfile} from './helpers/entered-roster.mjs';
import {migrateProfile} from '../src/data/roster.mjs';
import {calculate} from '../src/calculator.mjs';
import {setSharedMarchCapacity} from '../src/march-capacity-inputs.mjs';
import {setHeroRosterPresence} from '../src/hero-roster-presence.mjs';
const hero=(p,name)=>p.heroes.find(h=>h.canonicalHeroId===`roster-${name.toLowerCase()}`);
function ready(){const p=setSharedMarchCapacity(emptyProfile(),100000);for(const t of ['infantry','cavalry','archer'])p.troops[t].count=1000000;return p;}
test('active migration archives old automatic leader names while preserving configuration and entered capacities',()=>{
 const p=ready();p.activeBearPlanVersion=1;p.joiners=[{name:'Chenko',capacity:80000,slot2:'roster-helga'},{name:'Amane',capacity:90000},{name:'Yeonwoo',capacity:70000}];
 p.ratios={infantry:20,cavalry:30,archer:50};p.differentMarchCapacities=true;p.actualMarchCapacities={host:120000,joins:[80000,90000,70000]};
 const before=structuredClone(p),m=migrateProfile(p);
 assert.deepEqual(m.joiners,p.joiners);assert.deepEqual(m.legacyAutomaticReservations.joiners,p.joiners);assert.deepEqual(m.ratios,p.ratios);assert.deepEqual(m.actualMarchCapacities,p.actualMarchCapacities);
 assert.equal(m.rolePlanVersion,1);assert.deepEqual(migrateProfile(m),m);assert.deepEqual(p,before);
});
test('canonical identity recovery applies to every hero without forcing ownership or a role',()=>{
 const p=ready();p.heroes=[{id:'roster-chenko',name:'',owned:false,provenance:{owned:'user-confirmed'},level:70},{id:'old-amane',name:'  AMANE ',owned:true,troop:''},{id:'old-yeonwoo',name:'Yeon Woo',owned:true,troop:'archer'}];
 const m=migrateProfile(p);assert.equal(hero(m,'Chenko').owned,false);assert.equal(hero(m,'Amane').troop,'archer');assert.equal(hero(m,'Yeonwoo').canonicalHeroId,'roster-yeonwoo');
 assert.equal(hero(m,'Amane').name,'  AMANE ');assert.equal(new Set(m.heroes.map(h=>h.id)).size,m.heroes.length);
});
test('import absence does not revive unowned candidates and explicit all-march exclusions remain intact',()=>{
 const p=ready();for(const name of ['Chenko','Amane','Yeonwoo']){const h=hero(p,name);h.owned=false;h.provenance.owned='imported';}
 const absent=mergeApi(p,{player:{heroes:[]}});for(const name of ['Chenko','Amane','Yeonwoo'])assert.equal(hero(absent,name).owned,false);
 const manual=ready();Object.assign(hero(manual,'Amane'),setHeroRosterPresence(hero(manual,'Amane'),false));
 const m=migrateProfile(manual);assert.equal(hero(m,'Amane').marchAvailable,false);assert.equal(hero(m,'Amane').provenance.marchAvailable,'user-confirmed');
 assert.ok(calculate(m,'joining').plan.assignment.joins.every(r=>r.heroes.every(h=>h?.name!=='Amane')));
});
test('four jointly selected complete squads conserve entered inventory and capacity',()=>{
 const p=ready(),result=calculate(p,'joining').plan;
 const squads=result.marches.map(r=>r.heroes);assert.equal(squads.length,4);assert.equal(squads.flat().length,12);assert.equal(new Set(squads.flat().map(h=>h.id)).size,12);
 assert.deepEqual(result.marches.map(r=>r.capacity),[100000,100000,100000,100000]);assert.deepEqual(result.needed,{infantry:40000,cavalry:40000,archer:320000});
 for(const t of ['infantry','cavalry','archer'])assert.equal(result.marches.reduce((n,r)=>n+r.available[t],0)+result.remaining[t],p.troops[t].count);
});
