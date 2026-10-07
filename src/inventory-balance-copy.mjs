import {t as tr,formatList} from './i18n.mjs';

export function inventoryBalanceCopy(balance){
 const base={title:tr('troops.balance.title'),tooltip:tr('troops.balance.help'),surplus:null,priority:null};
 if(!balance.known)return {...base,description:tr('troops.balance.unknown')};
 if(balance.empty)return {...base,description:tr('troops.balance.empty')};
 const names=types=>formatList(types.map(type=>tr(type==='archer'?'troops.archers':`troops.${type}`)));
 const balanced=balance.limiting.length===3;
 return {...base,
  description:balanced?tr('troops.balance.balanced'):balance.limiting.length===1?tr(`troops.balance.limit.${balance.limiting[0]}`):tr('troops.balance.tied',{types:names(balance.limiting)}),
  surplus:balance.surplus.length?tr('troops.balance.surplus',{types:names(balance.surplus)}):null,
  priority:balanced?tr('troops.balance.priorityBalanced'):tr('troops.balance.priority',{types:names(balance.limiting)})};
}
