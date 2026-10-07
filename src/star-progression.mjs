// Kingshot's 31 sourced Expedition rows represent 0★ through 5★, with
// five intermediate sixth-steps between consecutive full stars.
export const STAR_OPTIONS=Array.from({length:31},(_,i)=>{
  const step=i+1,stars=Math.floor(i/6),substep=i%6;
  return {step,stars,substep,label:substep===0?`${stars}★`:`${stars}.${substep}`};
});
export function starStageFromStars(stars){
  return Number.isInteger(stars)&&stars>=0&&stars<=5?stars*6+1:null;
}
export function starStageParts(step){
  return Number.isInteger(step)&&step>=1&&step<=31?STAR_OPTIONS[step-1]:null;
}
export function starStageLabel(step){return starStageParts(step)?.label??null;}
