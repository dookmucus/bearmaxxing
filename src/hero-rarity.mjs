// Rarity groups from https://kingshotdata.com/category/heroes/ .
const rare=new Set(['Forrest','Seth','Edwin','Olive']);
const epic=new Set(['Howard','Gordon','Quinn','Chenko','Diana','Amane','Yeonwoo','Fahd']);
const mythic=new Set(['Helga','Amadeus','Jabel','Saul','Zoe','Hilde','Marlin','Eric','Petra','Jaeger','Alcar','Margot','Rosa','Long Fei','Thrud','Vivian','Triton','Sophia','Yang','Charles','Ava','Wee & Woo','Diego','Liz','Luna']);
export function heroRarity(name){return rare.has(name)?'r':epic.has(name)?'sr':mythic.has(name)?'ssr':'unknown';}
