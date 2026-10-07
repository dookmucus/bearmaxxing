import en from './locales/en.json' with {type:'json'};
// Locale-independent calculator copy; never loads translated catalogs into the worker.
export function englishMessage(key,values={}){
 let message=en[key];if(message&&typeof message==='object')message=message[new Intl.PluralRules('en').select(Number(values.count))]??message.other;
 return typeof message==='string'?message.replace(/\{([a-zA-Z][\w]*)\}/g,(placeholder,name)=>Object.hasOwn(values,name)?String(values[name]):placeholder):key;
}
