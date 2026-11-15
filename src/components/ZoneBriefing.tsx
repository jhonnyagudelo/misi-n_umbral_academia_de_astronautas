import {useEffect,useRef} from 'react';
import {campaignStore as store} from '../game/campaign-store';
import {ZONE_GUIDES,type Zone} from '../content/orientation';
import {announce} from '../hooks/useNarration';
import {AudioControls} from './AudioControls';
export default function ZoneBriefing({zone}:{zone:Zone}){
  const ref=useRef<HTMLDialogElement>(null);const guide=ZONE_GUIDES[zone];
  useEffect(()=>{
    const prior=store.getSnapshot().paused;store.setPaused(true);ref.current?.showModal();
    announce(guide.title+'. '+guide.goal+' '+guide.rules.join(' '),3,'guide:'+zone);
    return()=>store.setPaused(prior);
  },[zone]);
  const start=()=>store.markBriefingSeen(zone);
  return <dialog ref={ref} className="mission-dialog zone-briefing game-ui" aria-labelledby="zone-title" onCancel={e=>{e.preventDefault();start();}}>
    <header className="dialog-heading"><h2 id="zone-title">{guide.title}</h2></header>
    <div className="briefing-content"><p className="briefing-goal">🎯 {guide.goal}</p><ul>{guide.rules.map(rule=><li key={rule}>{rule}</li>)}</ul><small>El reloj está detenido mientras lees.</small><AudioControls repeatLabel="Repetir explicación de la zona"/><button autoFocus className="pixel-button primary" onClick={start}>{guide.start} →</button></div>
  </dialog>;
}
