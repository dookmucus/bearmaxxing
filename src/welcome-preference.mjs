// Separate from player profiles: closing unchecked never writes a preference.
export const WELCOME_DISMISSAL_KEY='bearmaxxing:welcome-dismissed';
export function welcomeStorage(){
 try{return typeof window==='undefined'?null:window.localStorage;}catch{return null;}
}
export function welcomeDismissed(storage=welcomeStorage()){
 try{return storage?.getItem(WELCOME_DISMISSAL_KEY)==='true';}catch{return false;}
}
export function saveWelcomeDismissal(checked,storage=welcomeStorage()){
 if(!checked)return false;
 try{if(!storage)return false;storage.setItem(WELCOME_DISMISSAL_KEY,'true');return true;}catch{return false;}
}
