import {uiEnglish,uiPatterns} from './ui-en';
import {domainEnglish,domainPatterns} from './domain-en';
import {publicEnglish} from './public-en';
export type Language='en'|'es';
export const LANGUAGE_KEY='mision-umbral-language';
type StoragePort=Pick<Storage,'getItem'|'setItem'>;
export function createLanguageStore(storage?:StoragePort){
  let language:Language='en';try{if(storage?.getItem(LANGUAGE_KEY)==='es')language='es';}catch{}
  const listeners=new Set<()=>void>();
  return {get:()=>language,subscribe(callback:()=>void){listeners.add(callback);return()=>{listeners.delete(callback);};},set(next:Language){if(next!=='en'&&next!=='es'||language===next)return;language=next;try{storage?.setItem(LANGUAGE_KEY,next);}catch{}listeners.forEach(callback=>callback());}};
}
export function createTranslator(catalog:Record<string,string>,patterns:Array<[RegExp,string]>){
  const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const keys=Object.keys(catalog).filter(key=>key.trim().length>=3).sort((a,b)=>b.length-a.length);
  const phrases=keys.length?new RegExp('(?<![\\p{L}\\p{N}])(?:'+keys.map(escape).join('|')+')(?![\\p{L}\\p{N}])','gu'):null;
  // Fixed templates with numeric/ID captures also occur inside composed speech.
  // Keep free-text/wildcard templates anchored to avoid consuming later sentences.
  const embedded=patterns.filter(([pattern])=>!pattern.source.includes('.+')&&!pattern.source.includes('.*')).map(([pattern,replacement])=>[new RegExp(pattern.source.replace(/^\^/,'').replace(/\$$/,''),'gu'),replacement] as [RegExp,string]);
  return (text:string):string=>{
    const normalized=text.replace(/\s+/g,' ').trim();if(!normalized)return text;
    const prefix=text.match(/^\s*/)?.[0]??'',suffix=text.match(/\s*$/)?.[0]??'';
    if(Object.hasOwn(catalog,normalized))return prefix+catalog[normalized]+suffix;
    let translated=normalized;
    for(const [pattern,replacement]of patterns){pattern.lastIndex=0;translated=translated.replace(pattern,replacement);}
    for(const [pattern,replacement]of embedded){pattern.lastIndex=0;translated=translated.replace(pattern,replacement);}
    if(phrases)translated=translated.replace(phrases,match=>catalog[match]);
    return prefix+translated+suffix;
  };
}
const translateEnglish=createTranslator({...domainEnglish,...uiEnglish,...publicEnglish},[...domainPatterns,...uiPatterns]);
let language:Language='en',initialized=false;
const listeners=new Set<()=>void>();
export const getLanguage=()=>language;
export const subscribeLanguage=(callback:()=>void)=>{listeners.add(callback);return()=>{listeners.delete(callback);};};
export function initializeLanguage(){
  if(initialized||typeof window==='undefined')return;initialized=true;
  try{if(window.localStorage.getItem(LANGUAGE_KEY)==='es')language='es';}catch{}
  document.documentElement.lang=language;listeners.forEach(callback=>callback());
}
export function setLanguage(next:Language){
  initializeLanguage();if(next!=='en'&&next!=='es'||next===language)return;language=next;
  try{window.localStorage.setItem(LANGUAGE_KEY,next);}catch{}
  if(typeof document!=='undefined')document.documentElement.lang=next;
  listeners.forEach(callback=>callback());
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('mission-language',{detail:next}));
}
export function t(text:string,selected:Language=language){return selected==='en'?translateEnglish(text):text;}
