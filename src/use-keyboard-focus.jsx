import {useEffect} from 'react';

// Automatic and pointer focus stay quiet; Tab opts into visible keyboard focus.
export function useKeyboardFocus(){
 useEffect(()=>{
  const root=document.documentElement;
  const keyboard=event=>{
   if(event.key==='Tab'&&!event.altKey&&!event.ctrlKey&&!event.metaKey)root.setAttribute('data-keyboard-focus','true');
  };
  const pointer=()=>root.removeAttribute('data-keyboard-focus');
  document.addEventListener('keydown',keyboard,true);
  document.addEventListener('pointerdown',pointer,true);
  return ()=>{
   document.removeEventListener('keydown',keyboard,true);
   document.removeEventListener('pointerdown',pointer,true);
   root.removeAttribute('data-keyboard-focus');
  };
 },[]);
}
