import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { campaignStore as store, SAVE_KEY } from '../game/campaign-store';
import Playground from './Playground';
import MissionDialog from './MissionDialog';
import {useNarration} from '../hooks/useNarration';
import {AudioSettingsContext,AudioControls} from './AudioControls';
import {useSpaceMusic} from '../hooks/useSpaceMusic';

export default function GameRoot() {
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const state = view.campaign;
  const [modal, setModal] = useState<string | null>(null);
  const [manualPause, setManualPause] = useState(false);
  const [voiceEnabled,setVoiceEnabled]=useState(true);
  const scope=`scene:${state.phase}:${state.travel.leg}:${state.excursion?.stage??''}`;
  const repeatVoice=useNarration('',manualPause||view.hidden,scope,voiceEnabled);
  const music=useSpaceMusic(manualPause||view.hidden);
  const [saveAvailable, setSaveAvailable] = useState(false);
  useEffect(() => {
    try { store.connectStorage(window.localStorage); setSaveAvailable(store.hasSavedProgress()); } catch { store.connectStorage(); }
    let last = performance.now(); let frame = 0;
    const animate = (now: number) => {
      const delta = now - last; last = now;
      // One clock for movement, launch and resources. Never catch up a hidden tab.
      if (delta <= 250) store.tick(delta);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    const visibility = () => { last = performance.now(); store.setHidden(document.hidden); };
    const pageHide=()=>store.saveProgress();window.addEventListener('pagehide',pageHide);
    document.addEventListener('visibilitychange', visibility); visibility();
    return () => { window.removeEventListener('pagehide',pageHide);cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility); store.setDirection(0); store.setHidden(false); };
  }, []);
  return <AudioSettingsContext.Provider value={{voiceEnabled,toggleVoice:()=>setVoiceEnabled(value=>!value),musicEnabled:music.enabled,toggleMusic:music.toggle,repeat:repeatVoice}}><div className="mission-app pg-app game-ui">
    <header className="mission-header"><a href="/" className="home-link" aria-label="Volver a la portada">←</a><div className="mission-brand"><span className="brand-full">MISIÓN </span>UMBRAL</div><nav aria-label="Controles"><button className="toolbar-button" onClick={()=>setModal('help')} aria-label="Abrir ayuda">?</button><AudioControls/><button className="toolbar-button" onClick={()=>{setManualPause(!view.paused);store.setPaused(!view.paused);}} aria-pressed={view.paused}>{view.paused?'Continuar':'Pausa'}</button><button className="toolbar-button" disabled={state.phase==='intro'} onClick={()=>store.saveProgress()} aria-label="Guardar progreso" title={state.phase==='intro'?'Empieza la misión para guardar':'Guardar progreso'}>💾</button><button className="toolbar-button sources-toolbar" aria-label="Fuentes científicas" onClick={()=>setModal('sources')}>ⓘ</button></nav></header>
    {view.unlockNotice&&<p className="unlock-notice" role="status">{view.unlockNotice}</p>}
    {(view.savedMessage||view.persistenceMessage)&&<p className="save-status" role="status">{view.persistenceMessage||view.savedMessage}</p>}
    {state.phase === 'intro' && saveAvailable && <button className="pg-resume secondary-button" onClick={() => { store.restore(); setSaveAvailable(false); }}>Continuar misión guardada</button>}
    <Playground state={state} blocked={view.paused || view.hidden || !!modal} explain={setModal}/>
    {view.paused && !modal && manualPause && <PauseDialog resume={() => { setManualPause(false); store.setPaused(false); }}/>}
    {modal && <MissionDialog id={modal} state={state} close={() => setModal(null)}/>}
  </div></AudioSettingsContext.Provider>;
}
function PauseDialog({ resume }: { resume: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return <dialog ref={ref} className="mission-dialog pause-dialog game-ui" aria-labelledby="pause-title" onCancel={event => { event.preventDefault(); resume(); }}><h2 id="pause-title">Misión en pausa</h2><p>Las reservas y el reloj están detenidos.</p><AudioControls/><button className="secondary-button" onClick={()=>store.saveProgress()}>Guardar progreso</button><button autoFocus className="pixel-button primary" onClick={resume}>Continuar misión</button></dialog>;
}
