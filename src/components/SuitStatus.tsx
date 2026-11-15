import {useEffect,useRef} from 'react';
import {oxygenCapacity,type Campaign} from '../game/campaign';
import {suitServiceStatus} from '../game/suit-service';
import {PixelIcon} from './GameArt';
import {announce} from '../hooks/useNarration';
type Resource='oxygen'|'energy'|'thermal';
const LABELS:Record<Resource,string>={oxygen:'Oxígeno',energy:'Energía',thermal:'Abrigo'};
const PLACES:Record<Resource,string>={oxygen:'Aire',energy:'Baterías',thermal:'Calor'};
export default function SuitStatus({state:s,moving,scope,takeBattery,canTakeBattery}:{state:Campaign;moving:boolean;scope:string;takeBattery:()=>void;canTakeBattery:boolean}){
  const services=suitServiceStatus(s);const previous=useRef<Resource|null>(null);
  const resource=(['oxygen','energy','thermal'] as Resource[]).find(id=>services[id].atStation);
  const maximum=(id:Resource)=>id==='oxygen'?oxygenCapacity(s):100;
  const charging=resource&&services[resource].available&&!moving&&s.suit[resource]<maximum(resource)?resource:null;
  useEffect(()=>{
    if(charging)announce(`Estoy recargando ${LABELS[charging].toLowerCase()}. Me quedo junto a ${PLACES[charging]} hasta que suba mi reserva.`,2,scope);
    else if(previous.current&&resource===previous.current&&s.suit[resource]>=maximum(resource))announce(`¡${LABELS[resource]} del traje completo!`,2,scope);
    previous.current=charging;
  },[charging,resource,scope]);
  const source=resource?services[resource]:null;
  const removable=resource==='oxygen'?s.base.stations.air.batteryId:resource==='thermal'?s.base.stations.thermal.batteryId:null;
  return <div className="pg-suit-status" aria-label="Reservas del traje">
    <b>TRAJE</b>{(['oxygen','energy','thermal'] as Resource[]).map(id=><span key={id} className={charging===id?'suit-is-charging':''}><PixelIcon kind={id==='oxygen'?'air':id==='energy'?'battery':'thermal'} size={17}/><label>{LABELS[id]} <strong>{Math.ceil(s.suit[id]/maximum(id)*100)}%</strong></label></span>)}
    {source&&resource&&<small role="status">{charging?`↑ Recargando ${LABELS[resource].toLowerCase()}`:!source.available?source.reason==='no-battery'?'Necesito una batería libre para cargar.':source.reason==='unpowered'?'El generador necesita una batería que funcione.':source.reason==='solar'?'Ahora me protejo en el refugio.':'La recarga no está disponible.':moving?'Me detengo aquí para recargar.':`${LABELS[resource]} listo.`}</small>}
    {removable&&s.base.solar.status!=='active'&&!s.base.inShelter&&<button disabled={!canTakeBattery} title={canTakeBattery?'Recoger la batería del generador':'Ya llevas una batería'} onClick={takeBattery}>Recoger batería</button>}
  </div>;
}
