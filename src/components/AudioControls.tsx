import Localized from './Localized';
import LanguageSelector from './LanguageSelector';
import {createContext,useContext} from 'react';
type SoundSettings={voiceEnabled:boolean;toggleVoice:()=>void;musicEnabled:boolean;toggleMusic:()=>void;repeat:()=>void};
export const AudioSettingsContext=createContext<SoundSettings|null>(null);
export function AudioControls({repeatLabel='Repetir mensaje de voz'}:{repeatLabel?:string}){
  const sound=useContext(AudioSettingsContext);if(!sound)return null;
  return <Localized><div className="audio-controls" role="group" aria-label="Sonido">
    <LanguageSelector/>
    <button type="button" className="toolbar-button" title={sound.musicEnabled?'Silenciar música':'Activar música'} aria-label={sound.musicEnabled?'Silenciar música':'Activar música'} aria-pressed={sound.musicEnabled} onClick={sound.toggleMusic}><span aria-hidden="true">♫</span><span className="audio-state">{sound.musicEnabled?'✓':'×'}</span></button>
    <button type="button" className="toolbar-button audio-voice" title={sound.voiceEnabled?'Silenciar voz':'Activar voz'} aria-label={sound.voiceEnabled?'Silenciar voz':'Activar voz'} aria-pressed={sound.voiceEnabled} onClick={sound.toggleVoice}>Voz <span aria-hidden="true">{sound.voiceEnabled?'✓':'×'}</span></button>
    <button type="button" className="toolbar-button" title="Escuchar otra vez" aria-label={repeatLabel} onClick={sound.repeat} disabled={!sound.voiceEnabled}>↻</button>
  </div></Localized>;
}
