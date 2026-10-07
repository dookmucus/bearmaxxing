import {useSyncExternalStore} from 'react';
import {currentLanguage,subscribeLanguage,initializeLanguage,setLanguage} from './i18n.mjs';
initializeLanguage();
export function useLanguage(){
 const locale=useSyncExternalStore(subscribeLanguage,currentLanguage,()=> 'en');
 const select=language=>{let storage;try{storage=window.localStorage;}catch{}setLanguage(language,{storage,document});};
 return {locale,select};
}
