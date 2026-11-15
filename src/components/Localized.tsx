import {Children,cloneElement,isValidElement,useEffect,useMemo,useSyncExternalStore,type ReactNode} from 'react';
import {getLanguage,initializeLanguage,subscribeLanguage,t,type Language} from '../i18n/locale';
export function useLanguage(){const language=useSyncExternalStore(subscribeLanguage,getLanguage,()=>'en' as Language);useEffect(initializeLanguage,[]);return language;}
// Translate presentation only: values, rule IDs, links and saved state stay intact.
export function localizeTree(node:ReactNode,language:Language):ReactNode{
  if(typeof node==='string')return t(node,language);
  if(Array.isArray(node)){
    const result:ReactNode[]=[];let text='';
    const flush=()=>{if(text){result.push(t(text,language));text='';}};
    for(const child of Children.toArray(node)){if(typeof child==='string'||typeof child==='number')text+=String(child);else{flush();result.push(localizeTree(child,language));}}
    flush();return result;
  }
  if(!isValidElement<Record<string,unknown>>(node)||node.props['data-no-translate'])return node;
  const props:Record<string,unknown>={};
  if(typeof node.type==='string')for(const name of ['aria-label','aria-description','title','alt','placeholder','label'])if(typeof node.props[name]==='string')props[name]=t(node.props[name] as string,language);
  if(Object.hasOwn(node.props,'children'))props.children=localizeTree(node.props.children as ReactNode,language);
  return cloneElement(node,props);
}
export default function Localized({children}:{children:ReactNode}){const language=useLanguage();return useMemo(()=>localizeTree(children,language),[children,language]);}
