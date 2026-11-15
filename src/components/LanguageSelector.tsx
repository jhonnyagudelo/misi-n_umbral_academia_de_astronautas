import {setLanguage,type Language} from '../i18n/locale';
import {useEffect} from 'react';
import {useLanguage} from './Localized';
export default function LanguageSelector(){const language=useLanguage();useEffect(()=>{document.title=language==='en'?'Your mission | Mission Umbral':'Tu misión | Misión Umbral';},[language]);return <label className="language-selector" data-no-translate="true"><span>{language==='en'?'Language':'Idioma'}</span><select aria-label={language==='en'?'Language':'Idioma'} value={language} onChange={event=>setLanguage(event.target.value as Language)}><option value="en">English</option><option value="es">Español</option></select></label>;}
