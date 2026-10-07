import React,{useEffect,useId,useRef,useState} from 'react';
import {useLanguage} from './use-language.jsx';
import {languages} from './locales/registry.mjs';
import {t} from './i18n.mjs';
import {welcomeDismissed,saveWelcomeDismissal} from './welcome-preference.mjs';

const sources=[['Kingshot Wiki','https://kingshotwiki.com/'],['Kingshot Optimizer','https://kingshotoptimizer.com/'],['Frakinator','https://frakinator.streamlit.app/']];
export function WelcomeModal({initiallyOpen}={}){
 const {locale,select}=useLanguage();
 const [open,setOpen]=useState(()=>initiallyOpen??(typeof window!=='undefined'&&!welcomeDismissed()));
 const [checked,setChecked]=useState(false);
 const dialog=useRef(null),title=useRef(null),previousFocus=useRef(null);
 const titleId=useId(),languageId=useId();
 useEffect(()=>{
  if(!open)return;
  const element=dialog.current;
  previousFocus.current=document.activeElement;
  element.showModal();title.current.focus();
  return ()=>{
   element.close();
   const previous=previousFocus.current;
   if(previous&&previous!==document.body&&previous.isConnected)previous.focus();
   else document.getElementById('app-language')?.focus();
  };
 },[open]);
 const close=()=>{saveWelcomeDismissal(checked);setOpen(false);};
 const trapFocus=event=>{
  if(event.key!=='Tab')return;
  const items=[...dialog.current.querySelectorAll('a[href],button,input,select')].filter(element=>!element.disabled);
  const first=items[0],last=items.at(-1),active=document.activeElement;
  if(event.shiftKey&&(active===first||active===title.current)){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(active===last||active===title.current)){event.preventDefault();first.focus();}
 };
 if(!open)return null;
 return <dialog className="welcome-modal" ref={dialog} aria-labelledby={titleId} onCancel={event=>{event.preventDefault();close();}} onKeyDown={trapFocus}>
  <div className="welcome-shell">
   <header className="welcome-header"><h2 id={titleId} ref={title} tabIndex={-1}>{t('welcome.title')}</h2><div className="field welcome-language"><label htmlFor={languageId}>{t('language.label')}</label><select id={languageId} value={locale} onChange={event=>select(event.target.value)}>{Object.entries(languages).map(([id,language])=><option key={id} value={id} lang={id}>{language.name}</option>)}</select></div></header>
   <div className="welcome-content">
    <p>{t('welcome.introduction')}</p>
    <p>{t('welcome.estimates')}</p>
    <p>{t('welcome.privacy')}</p>
    <p>{t('welcome.sources.prefix')}{sources.map(([name,url],index)=><React.Fragment key={name}>{index===0?'':index===1?t('welcome.sources.separator'):t('welcome.sources.lastSeparator')}<a href={url} target="_blank" rel="noopener noreferrer">{name}</a></React.Fragment>)}{t('welcome.sources.suffix')}</p>
    <p>{t('welcome.contact')} <strong>[RED]/[evl]Remu</strong>.</p>
   </div>
   <footer className="welcome-footer"><label><input type="checkbox" checked={checked} onChange={event=>setChecked(event.target.checked)}/><span>{t('welcome.dismiss')}</span></label><button type="button" className="secondary" onClick={close}>{t('welcome.close')}</button></footer>
  </div>
 </dialog>;
}
