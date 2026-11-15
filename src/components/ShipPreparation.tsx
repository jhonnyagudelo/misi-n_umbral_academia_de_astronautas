import {useEffect,useState} from 'react';
import {campaignStore as store} from '../game/campaign-store';
import {SHIPS} from '../content/equipment';
import {preparationPreview,CARGO_INFO} from '../content/preparation';
import {validCargo,type Campaign,type CampaignAction,type CargoId,type ShipId} from '../game/campaign';
import {PACKAGES} from '../game/rules/balance';
import type {PackageId} from '../game/rules/types';
import {PixelIcon,Rocket} from './GameArt';
import {announce} from '../hooks/useNarration';
function perform(action:CampaignAction){const paused=store.getSnapshot().paused;store.setPaused(false);store.dispatch(action);store.setPaused(paused);}
const PACKAGE_LABELS:Record<PackageId,string>={light:'Ligero',supplies:'Suministros',reinforced:'Refuerzo'};
const COMBINATIONS:PackageId[][]=[['light','supplies'],['light','reinforced'],['supplies','reinforced']];
export default function ShipPreparation({state:s,done}:{state:Campaign;done:()=>void}){
  const [packages,setPackages]=useState<PackageId[]>(()=>s.base.shelter.chosen.length===2?[...s.base.shelter.chosen]:['light','supplies']);
  const [cargoDetail,setCargoDetail]=useState<CargoId>('water');
  const hardUnlocked=store.getSnapshot().hardUnlocked;
  const preview=preparationPreview(s,packages);
  useEffect(()=>announce(s.ship?`${SHIPS[s.ship].name}. ${SHIPS[s.ship].benefit} ${SHIPS[s.ship].cost} Cada bolsa de agua aumenta la reserva de llegada. Más protección exige dejar parte del agua. Elige dos paquetes y mira la comparación.`:hardUnlocked?'Elige Artemis normal o Apolo difícil. Después prepara la carga y compara las protecciones del refugio.':'Primero supera una misión en modo normal con Artemis. Así desbloqueas Apolo, el modo difícil.',3,'panel:ship'),[s.ship,hardUnlocked]);
  function choose(ship:ShipId){
    if(ship==='apollo'&&!hardUnlocked)return;
    perform({type:'choose-ship',ship});
    const items:CargoId[]=ship==='apollo'?['water','food','battery','water']:['water','food','battery','water','food','water'];
    items.forEach((cargo,slot)=>perform({type:'cargo',cargo,slot}));
  }
  function changePackage(id:PackageId){
    const next=packages.includes(id)?packages.filter(value=>value!==id):packages.length<2?[...packages,id]:[packages[1],id];
    setPackages(next);
    if(next.length===2){const result=preparationPreview(s,next);announce(`Con esta combinación llegas con ${result.water} de agua. Durante la alerta debes permanecer ${result.shelterSeconds} segundos en el refugio.`,3,'panel:ship');}
  }
  return <>
    <div className={`pg-ship-choices ${s.ship?'ship-chosen':''}`}>{(['apollo','orion'] as const).map(id=><button key={id} disabled={id==='apollo'&&!hardUnlocked} className={`${s.ship===id?'pg-selected':''} ${id==='apollo'&&!hardUnlocked?'ship-locked':''}`} onClick={()=>choose(id)}><Rocket ship={id}/><strong>{SHIPS[id].name}</strong><span>{id==='apollo'&&!hardUnlocked?'🔒 Difícil':SHIPS[id].difficulty}</span><small>{id==='apollo'?hardUnlocked?'Menos espacio y más consumo exterior. Genera agua con sus celdas.':'Supera primero el modo normal.':'Comienza aquí. Más espacio y paneles solares; cuida el agua.'}</small></button>)}</div>
    {s.ship&&<>
      <div className="prep-section-heading"><h3>1. Tu carga</h3><span>Peso {preview.cargoMass}/{SHIPS[s.ship].mass}</span></div>
      <p className="prep-note">Lleva agua, comida y batería. Toca una bolsa para cambiarla.</p>
      <div className="pg-cargo">{s.cargo.map((id,slot)=><button key={slot} aria-label={`Cambiar carga ${slot+1}: ${id?CARGO_INFO[id].name:'vacía'}`} title="Toca para cambiar" onClick={()=>{const options:CargoId[]=['water','food','battery'];const next=options[(options.indexOf(id!)+1)%3];perform({type:'cargo',slot,cargo:next});setCargoDetail(next);announce(CARGO_INFO[next].name+'. '+CARGO_INFO[next].effect,3,'panel:ship');}}><PixelIcon kind={id??'water'} size={28}/><small>{id?CARGO_INFO[id].name:'Vacío'}</small></button>)}</div>
      <div className="cargo-explanation" aria-live="polite"><div className="cargo-tabs" role="group" aria-label="Explicar cargas">{(['water','food','battery'] as CargoId[]).map(id=><button key={id} onClick={()=>{setCargoDetail(id);announce(CARGO_INFO[id].name+'. '+CARGO_INFO[id].effect,3,'panel:ship');}} aria-pressed={cargoDetail===id}>{CARGO_INFO[id].name} ×{preview.counts[id]}</button>)}</div><p><strong>{CARGO_INFO[cargoDetail].name}:</strong> {CARGO_INFO[cargoDetail].effect} <small>Pesa {CARGO_INFO[cargoDetail].mass}.</small></p></div>
      <div className="prep-section-heading"><h3>2. Tu refugio</h3><span>Elige dos</span></div>
      <div className="pg-package-choices">{(['light','supplies','reinforced'] as PackageId[]).map((id,i)=><button key={id} aria-pressed={packages.includes(id)} className={packages.includes(id)?'pg-selected':''} onClick={()=>changePackage(id)}><PixelIcon kind={i===0?'shelter':i===1?'water':'armor'} size={25}/><b>{PACKAGE_LABELS[id]}</b><small>Masa {PACKAGES[id].mass} · protección {PACKAGES[id].protection}</small></button>)}</div>
      <p className="prep-note">Más protección: menos tiempo en refugio, pero llegas con menos agua.</p>

      <details className="prep-comparison"><summary>Comparar las tres combinaciones</summary><table><thead><tr><th>Paquetes</th><th>Agua</th><th>Refugio</th></tr></thead><tbody>{COMBINATIONS.map(ids=>{const result=preparationPreview(s,ids);return <tr key={ids.join()} className={ids.every(id=>packages.includes(id))?'comparison-selected':''}><td>{ids.map(id=>PACKAGE_LABELS[id]).join(' + ')}</td><td>{result.water}</td><td>{result.shelterSeconds} s</td></tr>;})}</tbody></table><small>Valores del juego, no medidas de seguridad NASA. El peso de los paquetes ocupa capacidad que podríamos dedicar al agua.</small></details>
      <div className="prep-actions">{packages.length===2?<div className="prep-outcome" role="status"><span>💧 Agua al llegar <strong>{preview.water}/100</strong></span><span>🛡️ Dentro del refugio <strong>{preview.shelterSeconds} s</strong></span></div>:<p className="prep-note warning">Elige dos paquetes diferentes para comparar y despegar.</p>}<button className="pixel-button primary" disabled={!validCargo(s)||packages.length!==2} onClick={()=>{perform({type:'confirm-ship'});perform({type:'shelter',ids:packages});perform({type:'launch'});done();}}>¡Despegar!</button>{!validCargo(s)&&<small className="warning">Necesitas al menos una carga de cada tipo y no superar el peso.</small>}</div>
    </>}
  </>;
}
