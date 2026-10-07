import {heroDisplayName} from './entity-display.mjs';
import {useLanguage} from './use-language.jsx';
import {languages} from './locales/registry.mjs';
import {canonicalHeroId} from './hero-identity.mjs';
import {canonicalPetId} from './pet-identity.mjs';
import {t as tr,formatNumber,formatPercent,localizeText,entityName,englishMessage} from './i18n.mjs';
import {useCalculations,diagnosticText} from './use-calculations.jsx';
import {heroPlanGuidance,heroFieldGuidance,gearFieldGuidance,masterFieldGuidance,masterResearchGuidance,petGuidance} from './player-guidance.mjs';
import {tooltipPosition} from './tooltip-position.mjs';
import {hostingBonusCopy,improvementCopy,joiningHeroCopy,rallyCapacityCopy} from './results-copy.mjs';
import {actionableImprovements,hostingChoiceExplanation} from './results-improvements.mjs';
import {activeGearInventory,activeGearLabel} from './active-gear.mjs';
import {orderHeroes} from './hero-order.mjs';
import {petOwned,setPetLevel,setPetAdvancement} from './pet-inputs.mjs';
import {refinementQuality,petPortraitColor} from './pet-refinement-quality.mjs';
import {maximumMarchSize,setMarchSizeByType} from './march-capacity-inputs.mjs';
import React, {useEffect, useId, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {TYPES, gearOffense, validateProfile} from './engine.mjs';
import {mergeApi} from './profile.mjs';
import {migrateProfile} from './data/roster.mjs';
import {readPlayerResponse} from './player-response.mjs';
import {LABELS, SLOTS, accountEffects, calculate, known} from './calculator.mjs';
import {MASTER_SKILLS,masterEffects,masterInputDetails,masterSquadInputValue,masterAffinityDefinition} from './master-effects.mjs';
import {TROOP_TIERS,tierFor} from './troop-inventory.mjs';
import {heroContributions,heroReference,heroHasWidget,heroProgression} from './hero-effects.mjs';
import {STAR_OPTIONS,starStageParts} from './star-progression.mjs';
import {levelInfo} from './hero-tooltips.mjs';
import {applySkillDefaults,skillConflict,starSkillLimit} from './hero-skill-unlocks.mjs';
import {commonSkillValue,setCommonSkillLevel,expeditionSlots} from './hero-skills-control.mjs';
import {heroRarity} from './hero-rarity.mjs';
import {heroCatalogueOptions,setProfileHeroPresence} from './hero-roster-presence.mjs';
import {GEAR_QUALITY,IMBUEMENT_GATES,gearIssues,gearLevelLabel,gearProgression,normalizeGearQuality,gearSlotEffect} from './gear-progression.mjs';
import {PET_MAX_LEVEL,petLevelEffect,petRefinementEffect,replaceCombinedRefinement,petBuffDetails,petBuffDescription} from './pet-effects.mjs';
import {heroPortraitFile,PET_PORTRAITS} from './portrait-assets.mjs';
import {MAIN_TABS,SETUP_STEPS,PLAN_STEPS,planStepIndex,navigatePlanStep,essentialSetupError,persistAppState,restoreAppState} from './setup-state.mjs';
import './styles.css';

const tabs = MAIN_TABS;
const developmentToolsEnabled=import.meta.env.DEV&&import.meta.env.VITE_DEVELOPMENT_TOOLS==='true';
const typeOptions = TYPES.map(t => ({value: t, label: LABELS[t]}));
const decimal = n => Number(Number(n).toFixed(2));
const fmt = n => formatNumber(n,{maximumFractionDigits:0});
const heroName = heroDisplayName;
const portraitName = (name,kind) => entityName(kind==='pet'?'pets':kind==='master'?'masters':'heroes',kind==='pet'?canonicalPetId(name):kind==='master'?`master-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`:canonicalHeroId(name),name);
const pageName = name => tr(`navigation.${name.toLowerCase()}`);
const deviceStorage=()=>{try{return typeof window==='undefined'?null:window.localStorage;}catch{return null;}};
function InfoTooltip({label,children}) {
  const [open,setOpen]=useState(false);
  const id=useId();
  const button=useRef(null);
  const mouseOver=useRef(false);
  const popover=useRef(null);
  const [position,setPosition]=useState(null);
  const anchor=open?button.current?.getBoundingClientRect():null;
  const popoverStyle=anchor?position??tooltipPosition(anchor,0,window.innerWidth,window.innerHeight):undefined;
  useEffect(()=>{
    if(!open)return;
    const update=()=>{
      if(button.current&&popover.current)setPosition(tooltipPosition(button.current.getBoundingClientRect(),popover.current.scrollHeight+2,window.innerWidth,window.innerHeight));
    };
    update();
    window.addEventListener('resize',update);
    window.addEventListener('scroll',update,true);
    return ()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
  },[open]);
  return <span className="info-tooltip" onPointerEnter={e=>{if(e.pointerType==='mouse'){mouseOver.current=true;setOpen(true);}}} onPointerLeave={e=>{if(e.pointerType==='mouse'){mouseOver.current=false;if(document.activeElement!==button.current)setOpen(false);}}}>
    <button ref={button} type="button" className="info-button" aria-label={tr("main.InfoTooltip.about", {label: label})} aria-expanded={open} aria-controls={id} aria-describedby={open?id:undefined}
      onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))setOpen(true);}}
      onBlur={()=>setOpen(false)}
      onClick={e=>{if(e.detail>0&&!mouseOver.current)setOpen(value=>!value);else setOpen(true);}}
      onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.stopPropagation();}}}>{tr("main.InfoTooltip.i")}</button>
    {open&&<span ref={popover} id={id} role="tooltip" className="info-popover" style={popoverStyle}>{typeof children==='string'?localizeText(children):children}</span>}
  </span>;
}
function FieldHeader({id,label,displayLabel,info}) {
  return <div className="field-label"><label htmlFor={id}>{localizeText(displayLabel??label)}</label>{info&&<InfoTooltip label={label}>{info}</InfoTooltip>}</div>;
}
function Field({label, displayLabel, value, onChange, hint, info, type = 'number', step = 1, min = 0, max, placeholder, disabled=false, hideVisibleLabel=false}) {
  const id=useId();
  return <div className={`field${hideVisibleLabel?' visually-hidden-label':''}`}><FieldHeader id={id} label={label} displayLabel={displayLabel} info={hideVisibleLabel?undefined:info??hint}/><input id={id} aria-label={localizeText(label)} type={type} value={value ?? (type==='number'?min:'')} step={step} min={min} max={max} disabled={disabled} placeholder={placeholder ?? (type === 'number' ? String(min) : '')} onChange={e => onChange(type === 'number' ? (e.target.value === '' ? min : Number(e.target.value)) : e.target.value)}/>{hideVisibleLabel&&(info??hint)&&<InfoTooltip label={label}>{info??hint}</InfoTooltip>}</div>;
}
function PetRefinementControl({pet,troop,onChange}) {
  const id=useId(),descriptionId=useId();
  const [open,setOpen]=useState(false);
  const quality=refinementQuality(pet,pet.refinement?.[troop]);
  const owned=petOwned(pet),label=tr('fields.petRefinement',{pet:pet.name,troop:LABELS[troop]});
  return <div className="field visually-hidden-label pet-refinement-control" tabIndex={owned?undefined:0} aria-label={owned?undefined:label} aria-describedby={owned?undefined:descriptionId} style={{'--refinement-color':quality.color}} onPointerEnter={e=>{if(e.pointerType==='mouse')setOpen(true);}} onPointerLeave={e=>{if(e.pointerType==='mouse')setOpen(false);}} onPointerUp={e=>{if(e.pointerType!=='mouse')setOpen(true);}} onClick={()=>setOpen(true)} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)}>
    <FieldHeader id={id} label={label} displayLabel={tr("main.PetRefinementControl.let", {troop: LABELS[troop]})}/>
    <input id={id} aria-label={label} aria-describedby={descriptionId} type="number" min="0" step="any" disabled={!owned} value={pet.refinement?.[troop]??0} onClick={()=>setOpen(true)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}} onChange={e=>onChange(e.target.value===''?0:e.target.value)}/>
    <span id={descriptionId} className="pet-refinement-tooltip" role="tooltip" hidden={!open}>{owned?`${Number(pet.refinement?.[troop])>0?tr("main.PetRefinementControl.bear.offense.lethality", {percentage: decimal(pet.refinement[troop]), troop: LABELS[troop]}):''}${quality.quality?localizeText(quality.description):tr("main.PetRefinementControl.provisional.color.indicator")}`:tr("main.PetRefinementControl.not.owned.refinement.is.excluded")}</span>
  </div>;
}
function Select({label, displayLabel, hideVisibleLabel=false, value, onChange, options, hint, info, empty, disabled=false}) {
  const id=useId();
  return <div className={`field${hideVisibleLabel?' visually-hidden-label':''}`}><FieldHeader id={id} label={label} displayLabel={displayLabel} info={hideVisibleLabel?undefined:info??hint}/><select id={id} aria-label={label} value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value)}>{empty && (empty!=='Unknown'||value==null||value==='') && <option value="" disabled={empty==='Unknown'}>{empty==='Unknown'?tr("main.Select.review.saved.value"):empty}</option>}{value!=null&&value!==''&&!options.some(o=>String(o.value)===String(value))&&<option value={value} disabled>{tr("main.Select.saved")}{value}{tr("main.Select.review")}</option>}{options.map(o => <option key={o.value} value={o.value} style={o.style} disabled={o.disabled}>{typeof o.label==='number'?formatNumber(o.label,{useGrouping:false}):/^[0-9]+$/.test(String(o.label))?formatNumber(Number(o.label),{useGrouping:false}):localizeText(o.label)}</option>)}</select>{hideVisibleLabel&&(info??hint)&&<InfoTooltip label={label}>{info??hint}</InfoTooltip>}</div>;
}
function ControlInfo({show,label,info}) {
  return show&&info?<InfoTooltip label={label}>{info}</InfoTooltip>:<span className="control-tooltip-spacer" aria-hidden="true"/>;
}
function HeroControl({label,displayLabel,info,offensive=false,showTooltip=true,...props}) {
  return <div className={`hero-control${offensive?' bear-offense-field':''}`}><Select label={label} displayLabel={displayLabel} hideVisibleLabel {...props}/><ControlInfo show={showTooltip} label={label} info={info}/></div>;
}
function MasterControl({label,displayLabel,info,offensive=false,showTooltip=true,...props}) {
  return <div className={`master-control${offensive?' bear-offense-field':''}`}><Select label={label} displayLabel={displayLabel} hideVisibleLabel {...props}/><ControlInfo show={showTooltip} label={label} info={info}/></div>;
}
function MasterSquadControl({master,onChange,info,offensive=false,showTooltip=true}) {
  const id=useId();
  const displayLabel=masterAffinityDefinition(master.name)?.label;
  return <div className={`master-control${offensive?' bear-offense-field':''}`}><div className="field visually-hidden-label"><FieldHeader id={id} label={tr("main.MasterSquadControl.message", {hero: master.name, displayLabel: displayLabel})} displayLabel={tr("main.MasterSquadControl.atk.or.lth")}/><input id={id} aria-label={tr("main.MasterSquadControl.message", {hero: master.name, displayLabel: displayLabel})} type="number" min="0" step="any" value={masterSquadInputValue(master)} placeholder={tr("main.MasterSquadControl.0")} onChange={e=>onChange(e.target.value===''?0:e.target.value)}/></div><ControlInfo show={showTooltip} label={tr("main.MasterSquadControl.message", {hero: master.name, displayLabel: displayLabel})} info={info}/></div>;
}
function GearControl({label,displayLabel,info,offensive=false,showTooltip=true,...props}) {
  return <div className={`gear-control${offensive?' bear-offense-field':''}`}><Select label={label} displayLabel={displayLabel} {...props}/><ControlInfo show={showTooltip} label={label} info={info}/></div>;
}
function GearIcon({troop,slot,quality}) {
  const name=entityName('gear',`set-${troop}-${slot}`,`${LABELS[troop]??troop} ${slot}`);
  const [open,setOpen]=useState(false);
  return <button type="button" className={`gear-icon${open?' is-open':''}`} aria-label={tr("main.GearIcon.show.name", {name: name})} aria-expanded={open} onClick={()=>setOpen(value=>!value)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}><img src={`/figma-gear/${troop}-${slot}${['red','purple'].includes(normalizeGearQuality(quality))?`-${normalizeGearQuality(quality)}`:''}.png`} alt=""/><span className="gear-icon-name">{name}</span></button>;
}
function IdentityPortrait({name,src,kind='hero',tooltip}) {
  const [open,setOpen]=useState(false);
  return <button type="button" className={`${kind}-portrait${open?' is-open':''}${kind==='pet'?` pet-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`:''}`} aria-label={tr("main.IdentityPortrait.show.name", {name: name})} aria-expanded={open} onClick={()=>setOpen(value=>!value)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>
    {src?<img src={src} alt=""/>:<span aria-hidden="true">{name.split(' ').map(word=>word[0]).slice(0,2).join('')}</span>}
    <span className="portrait-name">{tooltip?localizeText(tooltip):portraitName(name,kind)}</span>
  </button>;
}
function MasterPortrait({name}) {
  const [open,setOpen]=useState(false);
  const file=name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  return <button type="button" className={`master-portrait${open?' is-open':''}`} aria-label={tr("main.MasterPortrait.master", {name: name})} aria-expanded={open} onClick={()=>setOpen(value=>!value)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>
    <img src={`/figma-masters/${file}.png`} alt=""/><span className="master-portrait-name">{portraitName(name,'master')}</span>
  </button>;
}
function Section({title, hint, children}) {
  return <section className="input-section" aria-label={title}>{children}</section>;
}
function BoolField({label, displayLabel, value, onChange, hint, info}) {
  return <Select label={label} displayLabel={displayLabel} value={typeof value === 'boolean' ? String(value) : ''} onChange={v => onChange(v === '' ? null : v === 'true')} empty={tr("main.BoolField.choose")} options={[{value: 'true', label: tr("main.BoolField.yes")}, {value: 'false', label: tr("main.BoolField.no")}]} hint={hint} info={info}/>;
}
export function App({initialTab, initialProfile} = {}) {
  const {locale,select:selectLanguage}=useLanguage();
  const [restored] = useState(() => restoreAppState(deviceStorage(),initialProfile));
  const [profile, setProfile] = useState(restored.profile);
  const [setup,setSetup]=useState(restored.setup);
  const [storageError,setStorageError]=useState(restored.storageError);
  const [tab, setTab] = useState(initialTab&&tabs.includes(initialTab)?initialTab:'Home');
  const [notice, setNotice] = useState('');
  const [importSummary, setImportSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [heroPickerOpen,setHeroPickerOpen]=useState(false);
  const heroPickerRef=useRef(null);
  useEffect(()=>{
    if(!heroPickerOpen)return;
    const closeOutside=e=>{
      if(!heroPickerRef.current?.contains(e.target))setHeroPickerOpen(false);
    };
    document.addEventListener('pointerdown',closeOutside);
    return ()=>document.removeEventListener('pointerdown',closeOutside);
  },[heroPickerOpen]);
  const p = profile;
  async function copyDiagnostics() {
    if (!developmentToolsEnabled) return;
    try {
      setNotice('Preparing diagnostics…');
      await navigator.clipboard.writeText(await diagnosticText(p));
      setNotice('Diagnostics copied.');
    } catch {
      setNotice('Could not copy diagnostics. Check clipboard access and try again.');
    }
  }
  useEffect(()=>{setStorageError(!persistAppState(deviceStorage(),profile,setup));},[profile,setup]);
  const {results,improvements:supportedImprovements,status:calculationStatus,retry:retryCalculation}=useCalculations(p);
  function change(fn) { setProfile(previous => fn(previous)); }
  function heroChange(id,key,value) { change(x=>({...x,heroes:x.heroes.map(h=>h.id===id?key==='included'&&value===true?applySkillDefaults({...h,included:true}):{...h,[key]:value,provenance:{...h.provenance,[key]:'user-confirmed'}}:h)})); }
  function heroStarStep(id,value){const stage=starStageParts(value);change(x=>({...x,heroes:x.heroes.map(h=>h.id===id?applySkillDefaults({...h,stars:stage?.stars??null,starStep:stage?.step??null,starStepSource:'user-confirmed',starStepEncoding:'sixth-step-index-v1',provenance:{...h.provenance,stars:'user-confirmed',starStep:'user-confirmed'}}):h)}));}
  function heroCommonSkillLevel(id,value){change(x=>({...x,heroes:x.heroes.map(h=>h.id===id?setCommonSkillLevel(h,Number(value)):h)}));}
  function heroRosterPresence(id,present){change(x=>setProfileHeroPresence(x,id,present));}
  const update = (key, value) => change(x => ({...x, [key]: value,assumedInputs:{...x.assumedInputs,[key]:'user-confirmed'}}));
  const row = (section, id, key, value) => change(x => ({...x, [section]: x[section].map(item => item.id === id ? {...item, [key]: value,provenance:{...(typeof item.provenance==='object'?item.provenance:{}),[key]:'user-confirmed'}} : item)}));
  const nested = (section, troop, key, value) => change(x => ({...x, [section]: {...x[section], [troop]: {...x[section][troop], [key]: value}}}));
  const masterSkill=(id,slot,value)=>change(x=>({...x,masters:x.masters.map(m=>m.id===id?{...m,skillLevels:{...m.skillLevels,[slot]:value}}:m)}));
  const petRefinement=(id,t,value)=>change(x=>({...x,pets:x.pets.map(pet=>pet.id===id?{...pet,refinement:{...pet.refinement,[t]:value}}:pet)}));
  const troopValue=(troop,key,value)=>change(x=>{
    const current=x.troops[troop];
    const updated={...current,[key]:value};
    if(key==='tier'||key==='tg'){
      const tier=key==='tier'?value:updated.tier, tg=key==='tg'?value:updated.tg;
      updated.progressionNeedsConfirmation=!(tier!==null&&tier!==''&&Number.isInteger(Number(tier))&&tg!==null&&tg!==''&&Number.isInteger(Number(tg)));
    }
    return {...x,troops:{...x.troops,[troop]:updated}};
  });
  async function lookup() {
    if (!/^\d{5,15}$/.test(p.playerId)) return;
    setBusy(true); setNotice('');
    try {
      const response = await fetch(`/api/player/${encodeURIComponent(p.playerId)}`);
      const body = await readPlayerResponse(response);
      change(x => mergeApi(x, body));
      const heroes = Array.isArray(body.player?.heroes) ? body.player.heroes : Array.isArray(body.heroes) ? body.heroes : [];
      const pieces = heroes.reduce((sum, h) => sum + (Array.isArray(h.gear) ? h.gear.filter(g => SLOTS.includes(String(g.slot).toLowerCase())).length : 0), 0);
      setImportSummary(englishMessage("main.lookup.public.profile.arena.defense.heroes.equipped.gear.pieces.imported", {name: body.player?.nick_name || 'Player', length: heroes.length, pieces: pieces}));
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }
  function heroPicker() {
    const options=heroCatalogueOptions(p);
    const visibleIds=new Set(p.heroes.filter(h=>h.included!==false&&h.owned!==false).map(h=>h.id));
    return <>
      {options.length>0&&<div className="heroes-add" ref={heroPickerRef} onKeyDown={e=>{if(e.key==='Escape')setHeroPickerOpen(false);}}><button type="button" className="hero-picker-trigger" aria-expanded={heroPickerOpen} aria-controls="hero-picker-options" onClick={()=>setHeroPickerOpen(open=>!open)}>{tr("main.heroPicker.heros")}<span aria-hidden="true">{heroPickerOpen?'▴':'▾'}</span></button>{heroPickerOpen&&<fieldset className="hero-picker" aria-label={tr("main.heroPicker.hero.selection")}><div className="hero-picker-options" id="hero-picker-options">{options.map(h=>{const rarity=heroRarity(h.name),color=rarity==='r'?'#3ba2f5':rarity==='sr'?'#a374f4':'var(--accent-yellow)';return <label key={h.id} style={{'--hero-rarity':color}}><input type="checkbox" checked={visibleIds.has(h.id)} onChange={e=>heroRosterPresence(h.id,e.target.checked)}/><span>{heroName(h)}</span></label>;})}</div></fieldset>}</div>}
    </>;
  }
  function heroEditor() {
    const visible=orderHeroes(p.heroes.filter(h=>h.included!==false&&h.owned!==false));
    const best=new Set((results.hosting.team??[]).map(entry=>entry.hero.id));
    const icons={infantry:'infantry.png',cavalry:'cavalry.png',archer:'archer.png'};
    return <div className="heroes-design">


      {visible.some(h=>TYPES.includes(h.troop))&&<div className="heroes-columns" aria-hidden="true"><span></span><span></span><span></span><span>{tr("main.heroEditor.stars")}</span><span>{tr("main.heroEditor.level")}</span><span>{tr("main.heroEditor.skills")}</span><span>{tr("main.heroEditor.widget")}</span></div>}
      {TYPES.filter(t=>visible.some(h=>h.troop===t)).map(t=><div className="hero-class" key={t}><div className="hero-class-title"><img src={`/figma-heroes/${icons[t]}`} alt="" /><span>{tr(`troops.${t}`)}</span></div>
        {visible.filter(h=>h.troop===t).map(h=>{const ref=heroReference(h),derived=heroContributions(h),rarity=heroRarity(h.name),commonValue=commonSkillValue(h),skillValue=commonValue==='locked'?'0':/^[0-5]$/.test(commonValue)?commonValue:'',slots=expeditionSlots(h.name,h),skillMax=starSkillLimit(h.starStep)??5,isBest=best.has(h.id);return <div className={`hero-compact-row rarity-${rarity}`} key={h.id}>
          <div className="hero-class-spacer"></div>
          <div className="hero-best">{isBest&&<InfoTooltip label={tr("main.heroEditor.recommended.hosting.team", {hero: h.name})}>{heroPlanGuidance(h,results)}</InfoTooltip>}</div>
          <div className="hero-identity"><IdentityPortrait name={h.name} src={heroPortraitFile(h)&&`/figma-heroes/${heroPortraitFile(h)}`}/></div>
          <HeroControl offensive={Boolean(heroProgression(h)?.starAttack)} label={tr("main.heroEditor.stars.2", {hero: h.name})} displayLabel={tr("main.heroEditor.stars")} value={String(h.starStep??'')} empty="Unknown" options={STAR_OPTIONS.map(stage=>({value:String(stage.step),label:stage.label}))} onChange={v=>heroStarStep(h.id,v?Number(v):null)} info={heroFieldGuidance(h,'stars',results)}/>
          <HeroControl showTooltip={false} label={tr("main.heroEditor.level.2", {hero: h.name})} displayLabel={tr("main.heroEditor.level")} value={String(h.level??'')} empty="Unknown" options={Array.from({length:80},(_,i)=>({value:String(i+1),label:String(i+1)}))} onChange={v=>heroChange(h.id,'level',v?Number(v):null)} info={levelInfo(h)}/>
          <HeroControl offensive={derived.modeledEffects.some(e=>!['inherentAttack','widgetLethality','widgetRallyLethality','widgetRallyAttack'].includes(e.name))||derived.unresolvedOffensive.some(e=>e.stat&&e.value!=null)} label={tr("main.heroEditor.skills.2", {hero: h.name})} displayLabel={tr("main.heroEditor.skills")} value={skillValue} options={[...(skillValue===''?[{value:'',label:'',disabled:true}]:[]),...Array.from({length:skillMax+1},(_,i)=>({value:String(i),label:String(i)}))]} onChange={v=>{if(/^\d$/.test(v))heroCommonSkillLevel(h.id,v);}} info={heroFieldGuidance(h,'skills',results)}/>
          {heroHasWidget(h)?<HeroControl offensive={Boolean(heroProgression(h)?.widgetLethality)} label={tr("main.heroEditor.widget.2", {hero: h.name})} displayLabel={tr("main.heroEditor.widget")} value={String(h.widget??0)} options={Array.from({length:11},(_,i)=>({value:String(i),label:String(i)}))} onChange={v=>heroChange(h.id,'widget',Number(v))} info={heroFieldGuidance(h,'widget',results)}/>:<span className="no-widget" aria-label={tr("main.heroEditor.has.no.widget.slot", {hero: h.name})}></span>}
          {(h.importedStarsRaw!=null||h.legacyStars!=null||h.legacyStarStep!=null||known(h.advancedAttack)||known(h.advancedLethality))&&<p className="hero-review">{tr("main.heroEditor.saved.progression.or.legacy.percentage.overrides.need.review.existing")}</p>}
          {slots.some(slot=>skillConflict(h,slot))&&<small className="hero-review">{tr("main.heroEditor.a.saved.skill.exceeds.its.unlocked.cap.and.is")}</small>}
        </div>;})}
      </div>)}
      {visible.filter(h=>!TYPES.includes(h.troop)).map(h=><div key={h.id} className="hero-review">{tr('heroes.needsClass',{hero:heroName(h)})}<Select label={tr("main.heroEditor.troop.class", {hero: h.name})} value={h.troop} empty={tr("main.heroEditor.confirm.class")} options={typeOptions} onChange={v=>heroChange(h.id,'troop',v)}/></div>)}

    </div>;
  }
  function petEffectsTooltip() {
    const totals=petRefinementEffect(p);
    return <InfoTooltip label={tr("main.petEffectsTooltip.pet.effects")}>{tr('pets.effects',{refinements:TYPES.map(t=>tr("main.petEffectsTooltip.refinement", {t: LABELS[t], percentage: decimal(totals[t])})).join(' · ')})}</InfoTooltip>;
  }

  function petEditor() {
    const pending=p.petRefinementMode==='combined';
    return <div className="pets-design">
      {pending&&<div className="pet-refinement-review" role="status"><span>{tr("main.petEditor.enter.per.pet.refinements.then.confirm.to.replace.saved")}</span><button type="button" className="secondary" onClick={()=>change(replaceCombinedRefinement)}>{tr("main.petEditor.use.entered.refinements")}</button></div>}
      <div className="pet-columns"><span aria-hidden="true"></span><span>{tr("main.petEditor.level")}<InfoTooltip label={tr("main.petEditor.pet.levels")}>{tr("main.petEditor.0.means.not.owned.higher.levels.increase.passive.attack")}</InfoTooltip></span><span>{tr("main.petEditor.advancement")}<InfoTooltip label={tr("main.petEditor.pet.advancement")}>{tr("main.petEditor.select.yes.if.you.completed.advancement.at.this.level")}</InfoTooltip></span>{TYPES.map(t=><span key={t}>{tr('main.PetRefinementControl.let',{troop:LABELS[t]})}<InfoTooltip label={tr("main.petEditor.pet.refinement", {t: LABELS[t]})}>{tr('pets.refinementHelp',{troop:LABELS[t]})}</InfoTooltip></span>)}</div>
      <div className="pets-rows">{p.pets.map(pet=>{
        const effect=petLevelEffect(pet),maxLevel=PET_MAX_LEVEL[pet.name];
        const levelOptions=Number.isInteger(maxLevel)?Array.from({length:maxLevel+1},(_,i)=>({value:String(i),label:String(i)})):[];
        if(pet.level!=null&&!levelOptions.some(option=>option.value===String(pet.level)))levelOptions.unshift({value:String(pet.level),label:tr("main.petEditor.saved.review", {level: pet.level})});
        const levelInfo=petGuidance(pet,supportedImprovements);
        return <div className="pet-compact-row" key={pet.id} style={{'--pet-border':petPortraitColor(pet.name)}}>
          <IdentityPortrait name={pet.name} kind="pet" tooltip={levelInfo} src={PET_PORTRAITS[pet.name]&&`/figma-pets/${PET_PORTRAITS[pet.name]}`}/>
          {Number.isInteger(maxLevel)?<Select hideVisibleLabel label={tr("main.petEditor.level.2", {pet: pet.name})} displayLabel={tr("main.petEditor.level")} value={String(pet.level??'')} empty="Unknown" options={levelOptions} onChange={v=>change(x=>({...x,pets:x.pets.map(item=>item.id===pet.id?setPetLevel(item,v===''?0:Number(v)):item)}))}/>:<Field hideVisibleLabel displayLabel={tr("main.petEditor.level")} min={0} label={tr("main.petEditor.level.2", {pet: pet.name})} value={pet.level} onChange={v=>change(x=>({...x,pets:x.pets.map(item=>item.id===pet.id?setPetLevel(item,v):item)}))}/>}

          <div className="pet-advancement-cell">{petOwned(pet)&&effect.checkpoint===true&&<Select hideVisibleLabel label={tr("main.petEditor.level.advanced.at.this.level", {pet: pet.name, level: pet.level})} displayLabel={tr("main.petEditor.advanced.at.this.level")} value={String(pet.advancementConfirmed===true)} options={[{value:'false',label:tr("main.petEditor.no")},{value:'true',label:tr("main.petEditor.yes")}]} onChange={v=>change(x=>({...x,pets:x.pets.map(item=>item.id===pet.id?setPetAdvancement(item,v==='true'):item)}))} info={tr("main.petEditor.bear.offense.advancing.at.level.raises.passive.attack.from", {level: pet.level, percentage: decimal(petLevelEffect({...pet,advancementConfirmed:false}).attack), percentage2: decimal(petLevelEffect({...pet,advancementConfirmed:true}).attack)})}/>}</div>
          {TYPES.map(t=><PetRefinementControl key={t} pet={pet} troop={t} onChange={v=>petRefinement(pet.id,t,v)}/>)}

        </div>;
      })}</div>
    </div>;
  }
  function troopInventory() {
    return <div className="troop-editor">
      <div className="troop-columns"><span aria-hidden="true"></span><span>{tr("main.troopInventory.quantity")}</span><span>{tr("main.troopInventory.tier")}<InfoTooltip label={tr("main.troopInventory.troop.tier")}>{tr("main.troopInventory.select.the.tier.of.your.troops.in.this.class")}</InfoTooltip></span><span>{tr("main.troopInventory.building.tg")}<InfoTooltip label={tr("main.troopInventory.building.tg")}>{tr("main.troopInventory.enter.the.last.fully.completed.building.truegold.level")}</InfoTooltip></span></div>
      <div className="troop-compact-rows">{TYPES.map(t=>{
        const troop=p.troops[t],review=troop.progressionNeedsConfirmation===true;
        return <div className={`troop-compact-row${review?' needs-progression-confirmation':''}`} key={t}>
          <div className="troop-class"><img src={`/figma-heroes/${t}.png`} alt=""/><span>{tr(`troops.${t}`)}</span></div>
          <Field hideVisibleLabel displayLabel={tr("main.troopInventory.quantity")} label={tr("main.troopInventory.quantity.2", {t: LABELS[t]})} value={troop.count} onChange={v=>troopValue(t,'count',v)}/>
          <Select hideVisibleLabel displayLabel={tr("main.troopInventory.tier")} label={tr("main.troopInventory.tier.2", {t: LABELS[t]})} value={String(troop.tier??tierFor(p,t))} options={TROOP_TIERS.map(n=>({value:String(n),label:tr('troops.tierValue',{level:n})}))} onChange={v=>troopValue(t,'tier',Number(v))}/>
          <Field hideVisibleLabel displayLabel={tr("main.troopInventory.building.tg")} label={tr("main.troopInventory.building.tg.2", {t: LABELS[t]})} value={troop.tg} onChange={v=>troopValue(t,'tg',v)}/>
        </div>;
      })}</div>
    </div>;
  }
  function troopMarchSetup() {
    const ratio=TYPES.map(t=>p.ratios[t]).join('/');
    return <section className="troop-march-setup">
      <div className="troop-strategy"><span>{ratio}</span><InfoTooltip label={tr("main.troopMarchSetup.march.strategy")}>{tr('troops.formation',{mix:TYPES.map(t=>tr("main.troopMarchSetup.message",{t:p.ratios[t],t2:LABELS[t]})).join(', ')})}</InfoTooltip></div>
      <div className="troop-primary-capacity">
        <div className="field-label"><span>{tr("main.troopMarchSetup.maximum.march.size")}</span></div>
        <div className="troop-march-size-fields">{TYPES.map(t=><Field key={t} label={tr("main.troopMarchSetup.maximum.march.count", {t: LABELS[t]})} displayLabel={LABELS[t]} value={p.marchSizeByType?.[t]??0} onChange={v=>change(x=>setMarchSizeByType(x,t,v))}/>)}</div>
        <div className="troop-march-size-total" role="status">{tr(!Object.hasOwn(p,'marchSizeByType')&&maximumMarchSize(p)!==null?'common.savedTotal':'common.total',{count:maximumMarchSize(p)??0})}</div>
      </div>


    </section>;
  }
  function gearPiece(g) {
    const quality=normalizeGearQuality(g.quality),effect=gearProgression(g),issues=gearIssues(g),label=entityName('gear',g.id,activeGearLabel(g));
    const band=GEAR_QUALITY[quality];
    const limit=band?.max;
    const levels=band?.min==null?[]:Array.from({length:Math.max(0,limit-band.min+1)},(_,i)=>band.min+i);
    const savedLevel=Number(g.enhancement);
    const savedLevelLabel=quality==='red'&&savedLevel<100?tr('gear.savedBelowLegendary',{level:g.enhancement}):tr('gear.savedIncompatible',{level:gearLevelLabel(quality,g.enhancement)});
    const levelOptions=[...(!levels.includes(savedLevel)&&g.enhancement!=null?[{value:String(g.enhancement),label:savedLevelLabel,disabled:true}]:[]),...levels.map(level=>({value:String(level),label:gearLevelLabel(quality,level)}))];
    const minimumMastery=0;
    const masteries=Array.from({length:21},(_,i)=>i).filter(level=>level>=minimumMastery);
    const masteryOptions=[...(!masteries.includes(Number(g.forge))&&g.forge!=null?[{value:String(g.forge),label:tr("main.gearPiece.saved.incompatible", {forge: g.forge}),disabled:true}]:[]),...masteries.map(level=>({value:String(level),label:String(level)}))];
    const qualityOptions=[...(!GEAR_QUALITY[quality]?[{value:String(quality??''),label:tr("main.gearPiece.saved.review", {bonus: quality||'unknown'}),disabled:true}]:[]),...Object.entries(GEAR_QUALITY).map(([value,item])=>({value,label:item.label}))];
    const slotEffect=gearSlotEffect(g),offensive=slotEffect?.ordinary==='lethality';
    const milestone=quality==='red'&&[120,160,200].includes(Number(g.enhancement))&&(([120,200].includes(Number(g.enhancement))&&['helmet','armor'].includes(g.slot))||(Number(g.enhancement)===160&&['gloves','boots'].includes(g.slot)))?Number(g.enhancement):null;
    return <div className={`gear-compact-row gear-quality-${quality}`} key={g.id}>
      <div className="gear-class-spacer"></div>
      {TYPES.includes(g.troop)&&SLOTS.includes(g.slot)?<GearIcon troop={g.troop} slot={g.slot} quality={g.quality}/>:<span className="gear-icon-fallback">{g.name||tr("main.gearPiece.gear")}</span>}
      <Select label={tr("main.gearPiece.type", {label: label})} displayLabel={tr("main.gearPiece.type.2")} value={quality} options={qualityOptions} onChange={v=>row('gear',g.id,'quality',v)}/>
      {quality==='none'||quality==='purple'?<span className="gear-empty-cell"></span>:<GearControl showTooltip={offensive||!slotEffect} offensive={offensive} label={tr("main.gearPiece.mastery", {label: label})} displayLabel={tr("main.gearPiece.mastery.2")} value={String(g.forge??'')} empty="Unknown" options={masteryOptions} onChange={v=>row('gear',g.id,'forge',v===''?null:Number(v))} info={gearFieldGuidance(g,'mastery',supportedImprovements)}/>}
      {quality==='none'?<span className="gear-empty-cell"></span>:<GearControl showTooltip={offensive||!slotEffect||Boolean(effect?.attack)||Boolean(effect?.effectStatuses.length)} offensive={offensive||(quality==='red'&&Boolean(Object.keys(slotEffect?.attackMilestones??{}).length))} label={tr("main.gearPiece.level", {label: label})} displayLabel={tr("main.gearPiece.level.2")} value={String(g.enhancement??'')} empty="Unknown" options={levelOptions} onChange={v=>row('gear',g.id,'enhancement',v===''?null:Number(v))} info={gearFieldGuidance(g,'level',supportedImprovements)}/>}
      {milestone&&<label className="gear-milestone"><input type="checkbox" checked={g.imbuementConfirmed?.[milestone]===true} onChange={e=>row('gear',g.id,'imbuementConfirmed',{...g.imbuementConfirmed,[milestone]:e.target.checked})}/>{tr('gear.imbuementComplete',{level:milestone-100})}</label>}
      {issues.length>0&&<small className="gear-review">{issues.map(issue=>localizeText(issue)).join(' ')}</small>}
      {(known(g.lethality)||known(g.imbuementAttack))&&<small className="gear-review">{tr("main.gearPiece.saved.manual.percentages.are.kept.in.the.profile.for")}</small>}
    </div>;
  }
  const gearEditor = <div className="gear-design"><div className="gear-columns"><span></span><span></span><span>{tr("main.App.type")}</span><span>{tr("main.App.mastery")}<InfoTooltip label={tr("main.App.gear.mastery")}>{tr("main.App.mastery.increases.this.piece.s.main.stat.enter.level")}</InfoTooltip></span><span>{tr("main.App.level")}<InfoTooltip label={tr("main.App.gear.level")}>{tr("main.App.legendary.0.to.100.follows.mythic.level.100.confirm")}</InfoTooltip></span></div>
    {TYPES.map(t=><div className="gear-class" key={t}><div className="gear-class-title"><img src={`/figma-heroes/${t==='archer'?'archer':t}.png`} alt=""/><span>{tr(`troops.${t}`)}</span></div>{SLOTS.map(slot=>{const g=activeGearInventory(p).find(x=>x.id===`set-${t}-${slot}`);const matches=activeGearInventory(p).filter(x=>x.id===`set-${t}-${slot}`);return matches.length>1?<p key={slot} className="gear-review">{tr('gear.duplicate',{troop:LABELS[t],slot:tr(`gear.slot.${slot}`)})}</p>:g?gearPiece(g):null;})}</div>)}
  </div>;
  const currentTab=setup.completed?tab:SETUP_STEPS[setup.step];
  const currentStep=planStepIndex(setup,currentTab);
  function navigateStep(index,validate=false){
    if(validate&&index>currentStep){
      const error=essentialSetupError(p,SETUP_STEPS.indexOf(currentTab));
      if(error){setNotice(error);return;}
    }
    setNotice('');
    const next=navigatePlanStep(setup,currentTab,index);
    setSetup(next.setup);setTab(next.tab);
  }
  return <main className="calculator">
    <header className="page-header"><h1 className="brand-logo"><img src="/logo.png" alt="BearMaxxing"/></h1><div className="header-import"><Field hideVisibleLabel label={tr("main.App.kingshot.id.optional")} type="text" value={p.playerId} placeholder={tr("main.App.kingshot.id")} onChange={v => update('playerId', v)}/><button className="secondary" disabled={busy || !/^\d{5,15}$/.test(p.playerId)} onClick={lookup}>{busy ? tr("main.App.importing") : tr("main.App.import")}</button><div className="field visually-hidden-label header-language"><FieldHeader id="app-language" label={tr('language.label')}/><select id="app-language" aria-label={tr('language.label')} value={locale} onChange={e=>selectLanguage(e.target.value)}>{Object.entries(languages).map(([id,language])=><option key={id} value={id} lang={id}>{language.name}</option>)}</select></div></div></header>
    {importSummary && <p className="import-summary" role="status">{localizeText(importSummary)}</p>}
    {storageError&&<p className="notice" role="status">{tr("main.App.browser.storage.is.unavailable.you.can.keep.using.this")}</p>}
    <nav className={`setup-progress${setup.completed?' completed-navigation':''}`} aria-label={setup.completed?tr("main.App.bearmaxxing.pages"):tr("main.App.bear.plan.progress")}>{!setup.completed&&<div><strong>{tr("main.App.your.bear.plan")}</strong><span>{tr('wizard.progress',{currentStep:currentStep+1,stepCount:SETUP_STEPS.length,page:pageName(currentTab)})}</span></div>}<ol role="tablist" aria-label={setup.completed?tr("main.App.bearmaxxing.pages"):tr("main.App.bear.plan.steps")}>{(setup.completed?PLAN_STEPS:SETUP_STEPS).map((name,index)=><li key={name} className={name===currentTab?'current':!setup.completed&&index<currentStep?'done':''} aria-current={name===currentTab?(setup.completed?'page':'step'):undefined}><button type="button" role="tab" id={`tab-${name.toLowerCase()}`} aria-selected={name===currentTab} aria-controls="calculator-tabpanel" onClick={()=>navigateStep(PLAN_STEPS.indexOf(name))}>{pageName(name)}</button></li>)}</ol></nav>

    <div id="calculator-tabpanel" className="tab-panel" role="tabpanel" aria-labelledby={`tab-${currentTab.toLowerCase()}`} tabIndex={0}>
      {currentTab!=='Home'&&<div className="editor-page-heading"><h2 className="editor-page-title">{pageName(currentTab)}{currentTab==='Pets'&&<span className="pet-title-info">{petEffectsTooltip()}</span>}</h2>{currentTab==='Heroes'&&heroPicker()}</div>}
      {currentTab === 'Home' && <HomeDashboard profile={p} results={results} improvements={supportedImprovements} status={calculationStatus} retry={retryCalculation}/>}
      {currentTab === 'Heroes' && <section className="panel heroes-panel"><section className="input-section">{heroEditor()}</section></section>}
      {currentTab === 'Gear' && <section className="panel gear-panel"><Section title={tr("main.App.gear")}>{gearEditor}</Section></section>}
      {currentTab === 'Masters' && <section className="panel masters-panel"><Section title={tr("main.App.masters")}>
        <div className="master-columns" aria-hidden="true"><span></span><span>{tr("main.App.level")}</span><span>{tr("main.App.talent")}</span><span>{tr("main.App.atk.or.lth")}</span><span>{tr("main.App.skill.1")}</span><span>{tr("main.App.skill.2")}</span><span>{tr("main.App.skill.3")}</span><span>{tr("main.App.skill.4")}</span></div>
        <div className="master-list">{p.masters.map(m=>{
          const model=MASTER_SKILLS[m.name],details=masterInputDetails(m);
          const enteredInfo=masterFieldGuidance(m);
          const levelInfo=masterResearchGuidance(m);
          const talentInfo=<>{tr("main.App.enter.the.talent.level.shown.in.game", {name: details.talentValue===null?tr("main.App.the.app.has.no.verified.talent.value.for.at", {hero: m.name, talentLevel: m.talentLevel}):m.name==='Valora'?tr("main.App.personal.bear.points.this.does.not.increase.rally.damage", {percentage: decimal(details.talentValue)}):tr("main.App.personal.march.capacity.this.does.not.increase.bear.hunt", {bonus: details.talentValue})})}</>;
          const squadInfo=<>{enteredInfo}</>;


          return <article className="master-compact-row" key={m.id} aria-label={m.name}>
            <MasterPortrait name={m.name}/>
            <MasterControl showTooltip={['Pan','Roman'].includes(m.name)&&Number(m.specialResearchProgress)>0} label={tr("main.App.level.2", {hero: m.name})} displayLabel={tr("main.App.level")} value={String(m.affinityLevel??'')} empty="Unknown" options={Array.from({length:100},(_,i)=>({value:String(i+1),label:String(i+1)}))} info={levelInfo} onChange={v=>row('masters',m.id,'affinityLevel',v===''?null:Number(v))}/>
            {['Valora','Cassia'].includes(m.name)?<MasterControl showTooltip={false} label={tr("main.App.talent.2", {hero: m.name, talent: model.talent})} displayLabel={tr("main.App.talent")} value={String(m.talentLevel??'')} empty="Unknown" options={Array.from({length:12},(_,i)=>({value:String(i),label:String(i)}))} info={talentInfo} onChange={v=>row('masters',m.id,'talentLevel',v===''?null:Number(v))}/>:<span className="master-empty-cell master-talent-empty" aria-hidden="true"/>}
            {masterAffinityDefinition(m.name)?.label?<MasterSquadControl showTooltip={['attack','lethality'].includes(details.affinityKind)&&(details.affinityValue>0||details.affinityValue===null)} offensive={['attack','lethality'].includes(details.affinityKind)} master={m} info={squadInfo} onChange={v=>row('masters',m.id,'squadBonus',v)}/>:<span className="master-empty-cell" aria-hidden="true"/>}
            {model?.skills.length===0?[1,2,3,4].map(slot=><span key={slot} className="master-empty-cell" aria-hidden="true"/>):details.skills.map(skill=>skill.presentation.relevance==='irrelevant'?<span key={skill.slot} className="master-empty-cell" data-skill-slot={skill.slot} aria-hidden="true"/>:<MasterControl showTooltip={(['attack','lethality'].includes(skill.kind)||skill.presentation.relevance==='unknown')&&(skill.value===null||skill.value>0)} offensive={['attack','lethality'].includes(skill.kind)} key={skill.slot} label={tr("main.App.skill", {hero: m.name, slot: skill.slot})} displayLabel={tr("main.App.skill.5", {slot: skill.slot})} value={String(skill.level??'')} empty="Unknown" options={Array.from({length:m.name==='Cassia'?21:11},(_,n)=>({value:String(n),label:String(n)}))} info={masterFieldGuidance(m,skill)} onChange={v=>masterSkill(m.id,skill.slot,v===''?null:Number(v))}/>)}
          </article>;
        })}
        </div>
      </Section></section>}
      {currentTab === 'Pets' && <section className="panel pets-panel"><Section title={tr("main.App.pets")}>{petEditor()}</Section></section>}
      {currentTab === 'Troops' && <section className="panel troops-panel"><Section title={tr("main.App.troops")} hint={tr("main.App.enter.total.available.troops.for.each.class.plus.its")}>{troopInventory()}</Section>{troopMarchSetup()}</section>}
    </div>
    {notice&&<p className="notice" role="alert">{localizeText(notice)}</p>}
    {!setup.completed&&<div className="setup-actions"><button type="button" className="secondary" disabled={currentStep===0} onClick={()=>navigateStep(currentStep-1)}>{tr("main.App.back")}</button><button type="button" className="primary" disabled={currentStep===PLAN_STEPS.length-1} onClick={()=>navigateStep(currentStep+1,true)}>{tr("main.App.continue")}</button></div>}
    {developmentToolsEnabled&&<details className="home-calculations"><summary>Development tools</summary><button type="button" className="text-button" onClick={copyDiagnostics}>Copy diagnostics</button></details>}
  </main>;
}
function ImprovementImage({item,profile}) {
  const piece=profile.gear.find(g=>g.id===item.gearId);
  const hero=profile.heroes.find(h=>h.id===(item.heroId??item.skillHeroId)||item.id===`${h.id}-stars`||item.id===`${h.id}-widget`);
  const pet=(profile.pets??[]).find(p=>item.id===`${p.id}-passive`);
  const master=(profile.masters??[]).find(m=>item.id.startsWith(`${m.id}-skill-`)||(item.id==='valora-personal'&&m.name==='Valora'));
  return <div className="improvement-image">
    {piece?<GearIcon troop={piece.troop} slot={piece.slot} quality={piece.quality}/>:hero?<IdentityPortrait name={hero.name} src={heroPortraitFile(hero)&&`/figma-heroes/${heroPortraitFile(hero)}`}/>:pet?<span style={{'--pet-border':petPortraitColor(pet.name)}}><IdentityPortrait name={pet.name} kind="pet" src={PET_PORTRAITS[pet.name]&&`/figma-pets/${PET_PORTRAITS[pet.name]}`}/></span>:master?<MasterPortrait name={master.name}/>:<svg viewBox="0 0 48 48" role="img" aria-label={tr("main.ImprovementImage.troop.improvement")}><path d="M10 37V26h7v11m4 0V20h7v17m4 0V14h7v23M9 17l12-8 8 3 10-7m-8 0h8v8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/></svg>}
  </div>;
}
function HomeDashboard({profile,results,improvements,status='ready',retry}) {
  if(status==='loading'||status==='error')return <div className="home-dashboard" aria-live="polite"><section className="panel"><h2>{tr("main.HomeDashboard.results")}</h2><p className="hint">{status==='error'?tr("main.HomeDashboard.calculations.could.not.finish.your.saved.inputs.are.unchanged"):tr("main.HomeDashboard.calculating.your.current.plan")}</p>{status==='error'&&<button type="button" onClick={retry}>{tr("main.HomeDashboard.retry.calculations")}</button>}</section></div>;
  const joint=results.hosting.joint??results.joining.joint,plan=joint?.canRecommend===false?null:results.joining.plan,host=results.hosting.team;
  const exactGaps=results.hosting.modelGaps??[];
  const rallyInfo=rallyCapacityCopy(profile,results.hosting.shared?.rally);
  const blockingValidation=results.hosting.blockingValidation??results.hosting.missing??[];
  return <div className="home-dashboard" aria-live="polite">
    <section className="panel home-priority"><div className="home-section-heading"><h2>{tr("main.HomeDashboard.next.improvements")}</h2></div>{improvements.length?improvements.map((item,index)=>{const copy=improvementCopy(item,profile);return <React.Fragment key={item.id}>{index>0&&<hr className="improvement-divider"/>}<article className="improvement-row"><ImprovementImage item={item} profile={profile}/><div className="improvement-text"><div className="home-section-heading"><h3>{localizeText(copy.title)}</h3></div><p>{localizeText(copy.benefit)}<InfoTooltip bounded label={tr("main.HomeDashboard.details", {title: copy.title})}>{copy.detail}</InfoTooltip></p>{item.modelComparison?.selectionDependent&&<p className="hint">{tr("main.HomeDashboard.conditional.hero.investment")}</p>}</div></article></React.Fragment>;}):<p className="hint">{status==='improvements'?tr("main.HomeDashboard.checking.your.next.improvements"):tr("main.HomeDashboard.no.supported.next.improvement.identified.from.the.entered.data")}</p>}</section>
    <section className="panel"><div className="home-section-heading"><div className="home-heading-with-info"><h2>{tr("main.HomeDashboard.hosting.march")}</h2>{joint?.canRecommend&&<InfoTooltip label={tr("main.HomeDashboard.estimated.recommendation")}>{localizeText(joint.recommendationUncertainty.replace(/^Provisional: /,'')).replace(/^\p{Ll}/u,letter=>letter.toUpperCase())}</InfoTooltip>}</div></div>
      {joint&&!joint.canRecommend&&<p className="hint">{tr('results.noRecommendation',{reason:localizeText(joint.recommendationUncertainty)})}</p>}
      {host?.length===3?<><div className="home-hero-grid">{host.map(entry=>{const {hero,gear}=entry,why=hostingChoiceExplanation(entry,results.hosting);return <article className="home-hero" key={hero.id}><div className="home-hero-title"><IdentityPortrait name={hero.name} src={heroPortraitFile(hero)&&`/figma-heroes/${heroPortraitFile(hero)}`}/><div><strong>{heroName(hero)}</strong><small>{hostingBonusCopy(entry,why.summary)}<InfoTooltip bounded label={tr("main.HomeDashboard.comparison.figures", {hero: hero.name})}>{why.detail}</InfoTooltip></small></div></div><div className="home-assigned-gear">{gear.map(g=><GearIcon key={g.id} troop={g.troop} slot={g.slot} quality={g.quality}/>)}</div>{!gear.length&&<small>{tr("main.HomeDashboard.no.gear.entered")}</small>}</article>;})}</div></>:<div className="hint">{blockingValidation.length?tr("main.HomeDashboard.host.comparison.is.blocked.by.profile.validation"):exactGaps.length?tr("main.HomeDashboard.host.comparison.is.unavailable.for.the.entered.progression"):joint?.canRecommend===false?tr("main.HomeDashboard.a.supported.hosting.recommendation.is.not.established"):tr("main.HomeDashboard.include.an.eligible.hero.from.each.class.in.heroes")}{blockingValidation.length>0&&<ul>{blockingValidation.map(reason=><li key={reason}>{localizeText(reason)}</li>)}</ul>}{!blockingValidation.length&&exactGaps.length>0&&<InfoTooltip bounded label={tr("main.HomeDashboard.host.formula.gaps")}>{tr("main.HomeDashboard.provisional.a.reliable.hosting.recommendation.is.not.established.for")}</InfoTooltip>}</div>}
      {rallyInfo&&<div className="home-rally-capacity"><span>{tr('results.rallyCapacity',{capacity:results.hosting.shared.rally})}</span><InfoTooltip bounded label={tr("main.HomeDashboard.hosting.rally.capacity")}>{rallyInfo}</InfoTooltip></div>}
    </section>
    <section className="panel"><div className="home-section-heading"><h2>{tr("main.HomeDashboard.joining.marches")}</h2></div><div className="home-joins">{plan?.marches.filter(m=>m.joinIndex!=null&&m.heroes?.[0]).map(m=><article className="home-join" key={m.name}><h3>{tr('results.joinTitle',{number:m.joinIndex+1})}</h3><div className="home-squad">{[0,1,2].map(slot=>{const hero=m.heroes?.[slot],why=joiningHeroCopy(hero,slot,m.equivalent?.[slot]??[],m.manual?.[slot]===true,m.leaderRole,m.basis==='derived');return <div key={slot} className="home-squad-member">{hero?<IdentityPortrait name={hero.name} src={heroPortraitFile(hero)&&`/figma-heroes/${heroPortraitFile(hero)}`}/>:<span className="home-empty-portrait" aria-hidden="true">?</span>}<span>{hero?heroName(hero):tr("main.HomeDashboard.unassigned")}<small>{localizeText(why.summary)}<InfoTooltip bounded label={tr("main.HomeDashboard.joining.reason", {name: hero?.name??tr("main.HomeDashboard.slot", {bonus: slot+1})})}>{why.detail}</InfoTooltip></small></span></div>;})}</div>{m.heroes.some(h=>!h)&&<small>{tr("main.HomeDashboard.complete.the.available.roster.in.heroes")}</small>}</article>)}</div>{!plan&&<p className="hint">{tr("main.HomeDashboard.joining.squads.are.unavailable.while.the.current.plan.cannot")}</p>}</section>
  </div>;
}
if (typeof document !== 'undefined') {
  const rootElement = document.getElementById('root');
  if (rootElement) createRoot(rootElement).render(<App/>);
}
