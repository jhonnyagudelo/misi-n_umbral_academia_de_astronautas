import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { campaignStore as store, SAVE_KEY } from '../game/campaign-store';
import Playground from './Playground';
import MissionDialog from './MissionDialog';

export default function GameRoot() {
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const state = view.campaign;
  const [modal, setModal] = useState<string | null>(null);
  const [manualPause, setManualPause] = useState(false);
  const [audio, setAudio] = useState(false);
  const [saveAvailable, setSaveAvailable] = useState(false);
  useEffect(() => {
    try { store.connectStorage(window.localStorage); setSaveAvailable(!!window.localStorage.getItem(SAVE_KEY)); } catch { store.connectStorage(); }
    let last = performance.now(); let frame = 0;
    const animate = (now: number) => {
      const delta = now - last; last = now;
      // One clock for movement, launch and resources. Never catch up a hidden tab.
      if (delta <= 250) store.tick(delta);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    const visibility = () => { last = performance.now(); store.setHidden(document.hidden); };
    document.addEventListener('visibilitychange', visibility); visibility();
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility); store.setDirection(0); store.setHidden(false); };
  }, []);
  useEffect(() => {
    if (!audio || state.phase !== 'intro' || !('speechSynthesis' in window)) return;
    const lines = ['Una llamada desde la Luna. Algo no va bien en la base.', '¡Tierra, necesitamos relevo urgente! Se nos congeló el reciclador. Traigan más baterías y…', '¡Recluta seleccionado!', '¡Eres nuestra última esperanza de rescate! Elige tus tres mejoras, alista tu nave y prepárate para acudir al auxilio de la base.'];
    const speech = new SpeechSynthesisUtterance(lines[state.introStep]); speech.lang = 'es-CO'; speech.rate = .9;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(speech);
    return () => window.speechSynthesis.cancel();
  }, [audio, state.phase, state.introStep]);
  function toggleAudio() {
    if (audio) { window.speechSynthesis?.cancel(); setAudio(false); return; }
    setAudio(true);
    try {
      const context = new AudioContext(); const buffer = context.createBuffer(1, Math.floor(context.sampleRate * .22), context.sampleRate);
      const samples = buffer.getChannelData(0); for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * .025 * (1 - i / samples.length);
      const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination); source.start(); source.onended = () => { void context.close(); };
    } catch { /* Optional audio: subtitles remain available. */ }
  }
  return <div className="mission-app pg-app game-ui">
    <header className="mission-header"><a href="/" className="home-link" aria-label="Volver a la portada">←</a><div className="mission-brand"><span>MISIÓN UMBRAL</span></div><nav aria-label="Controles"><button className="toolbar-button" onClick={() => setModal('help')} aria-label="Abrir ayuda">?</button><button className="toolbar-button" onClick={toggleAudio} aria-pressed={audio}>{audio ? 'Voz: sí' : 'Voz: no'}</button><button className="toolbar-button" onClick={() => { setManualPause(!view.paused); store.setPaused(!view.paused); }} aria-pressed={view.paused}>{view.paused ? 'Continuar' : 'Pausa'}</button><button className="toolbar-button" aria-label="Fuentes científicas" onClick={() => setModal('sources')}>ⓘ</button></nav></header>
    {state.phase === 'intro' && saveAvailable && <button className="pg-resume secondary-button" onClick={() => { store.restore(); setSaveAvailable(false); }}>Continuar misión guardada</button>}
    <Playground state={state} blocked={view.paused || view.hidden || !!modal} explain={setModal}/>
    {view.paused && !modal && manualPause && <PauseDialog resume={() => { setManualPause(false); store.setPaused(false); }}/>}
    {modal && <MissionDialog id={modal} state={state} close={() => setModal(null)}/>}
  </div>;
}
function PauseDialog({ resume }: { resume: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return <dialog ref={ref} className="mission-dialog pause-dialog game-ui" aria-labelledby="pause-title" onKeyDown={event => { if (event.key === 'Tab') { event.preventDefault(); ref.current?.querySelector('button')?.focus(); } }} onCancel={event => { event.preventDefault(); resume(); }}><h2 id="pause-title">Misión en pausa</h2><p>Las reservas y el reloj están detenidos.</p><button autoFocus className="pixel-button primary" onClick={resume}>Continuar misión</button></dialog>;
}
