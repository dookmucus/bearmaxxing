import {languages} from './locales/registry.mjs';
export const LANGUAGE_STORAGE_KEY='bearmaxxing:language:v1';
let locale='en';
const listeners=new Set();
export const currentLanguage=()=>locale;
export const subscribeLanguage=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
export function supportedLanguage(language){
 const code=String(language??'').replaceAll('_','-');
 const exact=Object.keys(languages).find(key=>key.toLowerCase()===code.toLowerCase());
 if(exact)return exact;
 // Match Chinese script before region: zh-Hant-CN remains Traditional Chinese.
 if(/^zh(?:-|$)/i.test(code)){
  const parts=code.toLowerCase().split('-');
  const script=parts.includes('hant')?'zh-Hant':parts.includes('hans')?'zh-Hans':parts.some(part=>['tw','hk','mo'].includes(part))?'zh-Hant':'zh-Hans';
  return Object.hasOwn(languages,script)?script:null;
 }
 return Object.keys(languages).find(key=>key.toLowerCase()===code.split('-')[0].toLowerCase())??null;
}
export function resolveLanguage({storage,browserLanguages=[]}={}){
 try{const saved=storage?.getItem(LANGUAGE_STORAGE_KEY);if(saved&&supportedLanguage(saved))return supportedLanguage(saved);}catch{}
 return browserLanguages.map(supportedLanguage).find(Boolean)??'en';
}
export function setLanguage(language,{storage,document:doc,persist=true}={}){
 const selected=supportedLanguage(language)??'en';
 locale=selected;
 if(persist)try{storage?.setItem(LANGUAGE_STORAGE_KEY,selected);}catch{}
 if(doc){doc.documentElement.lang=selected;doc.title=t('page.title',{},selected);doc.querySelector?.('meta[name="description"]')?.setAttribute('content',t('page.description',{},selected));}
 for(const listener of listeners)listener();
 return selected;
}
export function initializeLanguage(){
 if(typeof window==='undefined')return;
 let storage;try{storage=window.localStorage;}catch{}
 setLanguage(resolveLanguage({storage,browserLanguages:navigator.languages??[navigator.language]}),{document,persist:false});
}
export function t(key,values={},language=locale){
 const fallback=languages.en.messages[key];
 let message=languages[language]?.messages[key]??fallback;
 if(message&&typeof message==='object'){
  const form=new Intl.PluralRules(language).select(Number(values.count));
  message=message[form]??message.other??fallback?.[form]??fallback?.other;
 }
 if(typeof message!=='string')message=typeof fallback==='string'?fallback:fallback?.other;
 if(typeof message!=='string')return key;
 // A malformed/incomplete translation falls back to the whole English sentence.
 const expected=[...String(typeof fallback==='string'?fallback:fallback?.other??'').matchAll(/\{([a-zA-Z][\w]*)\}/g)].map(m=>m[1]);
 const supplied=[...message.matchAll(/\{([a-zA-Z][\w]*)\}/g)].map(m=>m[1]);
 if(expected.some(name=>!message.includes(`{${name}}`))||supplied.some(name=>!expected.includes(name)))message=typeof fallback==='string'?fallback:fallback?.other??message;
 return message.replace(/\{([a-zA-Z][\w]*)\}(%?)/g,(placeholder,name,percent)=>{
  if(!Object.hasOwn(values,name))return placeholder;
  const raw=values[name],numeric=typeof raw==='number'?raw:typeof raw==='string'&&/^[+-]?[\d,]+(?:\.\d+)?$/.test(raw)?Number(raw.replaceAll(',','')):null;
  if(percent&&numeric!==null)return formatPercent(numeric,{},language);
  const starNotation=name==='starProgression'||name==='progression'&&/^[0-5]\.[0-5]$/.test(String(raw))||name==='target'&&/^[0-5]\.[0-5]$/.test(String(raw))||/heroStars|stars|starInfo/.test(key)&&['current','target','bonus','label'].includes(name);
  if(numeric!==null&&!starNotation)return formatNumber(numeric,{useGrouping:!/(level|step|current|target|slot|number)/i.test(name)},language)+percent;
  return String(localizeKnownValue(raw,language))+percent;
 });
}
export const formatNumber=(value,options={},language=locale)=>new Intl.NumberFormat(language,{maximumFractionDigits:2,...options}).format(Number(value));
// Values throughout the engine are percentage points, e.g. 25 means 25%.
export const formatPercent=(value,options={},language=locale)=>new Intl.NumberFormat(language,{style:'percent',maximumFractionDigits:2,...options}).format(Number(value)/100);
export const entityName=(kind,id,englishName)=>t(`entities.${kind}.${id}`,{},locale)===`entities.${kind}.${id}`?englishName:t(`entities.${kind}.${id}`);

const escapeRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
let messageMatchers,englishKeys;
function compileMessages(){
 const entries=Object.entries(languages.en.messages).filter(([,text])=>typeof text==='string');
 englishKeys=new Map(entries.map(([key,text])=>[text,key]));
 messageMatchers=entries.filter(([,text])=>text.includes('{')&&text.replace(/\{[^}]+\}/g,'').replace(/[^a-z]/gi,'').length>=6).map(([key,text])=>{
  const names=[];let pattern='',cursor=0;for(const match of text.matchAll(/\{([a-zA-Z][\w]*)\}/g)){pattern+=escapeRegex(text.slice(cursor,match.index))+'(.*?)';names.push(match[1]);cursor=match.index+match[0].length;}
  pattern+=escapeRegex(text.slice(cursor));return {key,names,regex:new RegExp('^'+pattern+'$'),specificity:text.replace(/\{[^}]+\}/g,'').length};
 }).sort((a,b)=>b.specificity-a.specificity);
}
// Adapter for existing English messages emitted by the unchanged calculator.
// Nothing in this adapter is stored in a profile or affects comparison/ranking.
export function localizeText(text,language=locale,depth=0){
 if(typeof text!=='string'||!text||language==='en'||depth>12)return text;
 if(!englishKeys)compileMessages();
 const key=englishKeys.get(text);if(key)return t(key,{},language);
 for(const matcher of messageMatchers){const match=text.match(matcher.regex);if(!match)continue;const values=Object.fromEntries(matcher.names.map((name,index)=>[name,localizeText(match[index+1],language,depth+1)]));return t(matcher.key,values,language);}
 // A multi-sentence explanation is a list of complete catalog messages.
 const sentences=text.split(/(?<=[.!]) (?=[A-Z])/);if(sentences.length>1)return sentences.map(sentence=>localizeText(sentence,language,depth+1)).join(' ');
 return text;
}
function localizeKnownValue(value,language){
 if(typeof value!=='string')return value;
 const tokens={infantry:'troops.infantry',cavalry:'troops.cavalry',archer:'troops.archer',attack:'stats.attack',lethality:'stats.lethality'};
 if(tokens[value])return t(tokens[value],{},language);
 if(!englishKeys)compileMessages();
 const key=englishKeys.get(value);return key&&!languages.en.messages[key].includes('{')?t(key,{},language):value;
}
export {englishMessage} from './english-messages.mjs';
export const formatList=(items,options={})=>new Intl.ListFormat(locale,{style:'long',type:'conjunction',...options}).format(items);
