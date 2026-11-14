import { useEffect, useState } from 'react';
import { EQUIPMENT, SITES } from '../content/equipment';
import { has, oxygenCapacity, workSeconds, type Campaign, type CampaignAction, type SiteId } from '../game/campaign';
import { BALANCE, BATTERY_IDS, STATION_IDS } from '../game/rules/balance';
import type { BatteryId, StationId } from '../game/rules/types';
import { Astronaut, PixelIcon } from './GameArt';

export function Gauge({ label, value, max = 100, tone = 'cyan' }: { label: string; value: number; max?: number; tone?: string }) {
  const percent = Math.max(0, Math.min(100, value / max * 100));
  return <div className={`gauge tone-${percent < 25 ? 'danger' : tone}`}><div><span>{label}</span><strong>{Math.ceil(value)}<small> / {max}</small></strong></div><meter min="0" max={max} value={value} aria-label={label}/><div className="gauge-track" aria-hidden="true"><i style={{ width: `${percent}%` }}/></div></div>;
}
const names: Record<StationId, string> = { air: 'Aire', water: 'Agua', thermal: 'Calor', greenhouse: 'Invernadero', lab: 'AVATAR', comms: 'Comunicaciones' };
const icons: Record<StationId, string> = { air: 'air', water: 'water', thermal: 'thermal', greenhouse: 'food', lab: 'lab', comms: 'comms' };
const xPosition = (id: StationId) => 15 + STATION_IDS.indexOf(id) * 14;
type Props = { state: Campaign; send: (a: CampaignAction) => void; explain: (id: string) => void; blocked: boolean };

export function BaseMission({ state, send, explain, blocked }: Props) {
  const [battery, selectBattery] = useState<BatteryId>('b1');
  const [station, selectStation] = useState<StationId>('air');
  const solar = state.base.solar.status === 'active';
  const outside = !!state.excursion;
  const near = Math.abs(state.playerX - xPosition(station)) < 8;
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const el = event.target as HTMLElement;
      if (blocked || el.closest('input,textarea,select,button,a,[role="dialog"]') || outside) return;
      if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D', 'e', 'E'].includes(event.key)) event.preventDefault();
      if (['ArrowLeft', 'a', 'A'].includes(event.key)) send({ type: 'walk', x: state.targetX - 7 });
      if (['ArrowRight', 'd', 'D'].includes(event.key)) send({ type: 'walk', x: state.targetX + 7 });
      if (event.key.toLowerCase() === 'e') {
        const nearest = STATION_IDS.reduce((best, id) => Math.abs(state.playerX - xPosition(id)) < Math.abs(state.playerX - xPosition(best)) ? id : best, 'air' as StationId);
        selectStation(nearest);
        if (Math.abs(state.playerX - xPosition(nearest)) < 8) document.getElementById('station-control')?.focus();
      }
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [state.playerX, state.targetX, outside, blocked, send]);
  const ms = BALANCE.operationMs - state.base.activeMs;
  const goals = [['Reciclador', state.repairs.recycler], ['Repetidor', state.repairs.relay], ['Cosecha', state.base.greenhouse.harvests > 0], ['AVATAR', state.base.avatar.done], ['Informe', state.base.comms.transmitted], ['Refugio solar', state.base.solar.status === 'resolved'], ['Avería superada', state.base.failure.status === 'resolved']] as const;
  return <section className="base-screen screen-enter" aria-labelledby="screen-title">
    <div className="screen-heading"><div><span className="eyebrow">07 / RESCATE EN LA BASE LUNAR</span><h1 id="screen-title">Pequeñas decisiones. Base a salvo.</h1></div><div className="mission-clock" aria-label="Tiempo restante">{Math.floor(ms / 60000)}:{String(Math.floor(ms / 1000) % 60).padStart(2, '0')}<small>operación</small></div></div>
    <div className="reserve-grid"><Gauge label="Aire de la base" value={state.base.reserves.air}/><Gauge label="Agua de la base" value={state.base.reserves.water}/><Gauge label="Confort de la base" value={state.base.reserves.thermal} tone="gold"/></div>
    {solar && <div className="alarm-banner" role="status"><PixelIcon kind="shelter"/><div><strong>ALERTA DE PARTÍCULAS SOLARES</strong><p>{state.base.inShelter ? `Permanece en el refugio: ${Math.max(0, Math.ceil((state.base.solar.requiredDwellMs - state.base.solar.dwellMs) / 1000))} s.` : `Entra al refugio. Margen del entrenamiento: ${Math.max(0, Math.ceil((BALANCE.solar.alarmAtMs + BALANCE.solar.entryWindowMs - state.base.activeMs) / 1000))} s.`}</p></div></div>}
    {state.base.failure.status === 'active' && <p className="warning">⚠ La batería {state.base.failure.batteryId?.toUpperCase()} está averiada temporalmente. Prioriza aire, agua y calor.</p>}
    <div className="objective-strip" aria-label="Objetivos">{goals.map(([label, done]) => <span key={label} className={done ? 'done' : ''}>{done ? '✓' : '○'} {label}</span>)}</div>
    {!outside ? <>
      <div className="base-scene" tabIndex={0} role="group" aria-label="Escena lateral. Flechas o A y D para caminar; E para la estación cercana.">
        <div className="base-window"><div className="stars"/><span className="earth"/></div><div className="base-beam"/><span className="base-wall-label">SVF / LUNAR OUTPOST</span>
        <div className="station-machines">{STATION_IDS.map(id => {
          const b = state.base.stations[id].batteryId; const powered = !!b && !(state.base.failure.status === 'active' && state.base.failure.batteryId === b);
          return <button className={`station-machine ${powered ? 'powered' : ''} ${station === id ? 'selected' : ''}`} key={id} aria-label={`Ir a ${names[id]}. ${powered ? 'Con energía' : 'Sin energía'}`} onClick={() => { selectStation(id); send({ type: 'walk', x: xPosition(id) }); }}><span className="station-lamp"/><PixelIcon kind={icons[id]} size={44}/><strong>{names[id]}</strong><small>{powered ? '● ACTIVA' : '○ SIN ENERGÍA'}</small></button>;
        })}</div>
        <div className="base-floor"/><div className="player-sprite" style={{ left: `${state.playerX}%` }}><Astronaut upgrades={state.upgrades}/></div>
      </div>
      <p className="interaction-hint">Haz clic en una estación para caminar, o usa ← → / A D y E. Cuatro baterías no alcanzan para seis estaciones a la vez.</p>
      <div className="base-control-grid"><div className="station-controls pixel-panel"><div className="screen-heading"><h2>{names[station]}</h2><span>{near ? 'Al alcance' : 'Camina hasta la estación'}</span></div>
        <div className="battery-picker" role="group" aria-label="Batería que vas a mover">{BATTERY_IDS.map(id => <button className={battery === id ? 'selected-chip' : ''} key={id} aria-pressed={battery === id} onClick={() => selectBattery(id)}><PixelIcon kind="battery" size={24}/><strong>{id.toUpperCase()}</strong><small>{state.base.batteries[id].station ? names[state.base.batteries[id].station!] : 'Libre'}{state.base.failure.status === 'active' && state.base.failure.batteryId === id ? ' · averiada' : ''}</small></button>)}</div>
        <div className="action-row"><button id="station-control" className="pixel-button primary compact" disabled={!near || solar || state.base.inShelter || !!state.base.stations[station].batteryId} onClick={() => send({ type: 'base-action', action: { type: 'place-battery', batteryId: battery, stationId: station } })}>Conectar {battery.toUpperCase()}</button><button className="secondary-button" disabled={!near || solar || state.base.inShelter || !state.base.stations[station].batteryId} onClick={() => { const id = state.base.stations[station].batteryId; if (id) send({ type: 'base-action', action: { type: 'remove-battery', batteryId: id } }); }}>Retirar batería</button></div>
        <p className="small-note">{station === 'greenhouse' ? `Cosechas: ${state.base.greenhouse.harvests}. Próxima: ${Math.floor(state.base.stations.greenhouse.progressMs / 300)}%. Consume agua al funcionar.` : station === 'lab' ? `Energía del experimento: ${Math.floor(state.base.stations.lab.energyMs / 200)}%. Completa también AVATAR.` : station === 'comms' ? `Informe: ${Math.floor(state.base.stations.comms.progressMs / 200)}%. Necesita AVATAR terminado.` : 'Con batería recupera reservas. Sin batería, la reserva disminuye.'}</p>
        {station === 'lab' && <button className="science-button" disabled={!near || state.base.inShelter} onClick={() => explain('avatar')}>{state.base.avatar.interactionDone ? 'Revisar AVATAR' : 'Realizar actividad AVATAR'}</button>}
      </div><div className="base-utilities pixel-panel"><h2>Antes de volver a salir</h2><div className="equipped-mini">{state.upgrades.map(id => id && <span key={id}><PixelIcon kind={id} size={25}/>{EQUIPMENT[id].name}</span>)}</div><button className="secondary-button" disabled={solar || state.base.inShelter} onClick={() => send({ type: 'open-lab' })}>Laboratorio: cambiar y recargar traje</button><button className={`shelter-button ${solar ? 'urgent' : ''}`} disabled={solar && state.base.inShelter} onClick={() => send({ type: 'base-action', action: { type: 'set-shelter-presence', inside: !state.base.inShelter } })}><PixelIcon kind="shelter" size={28}/>{state.base.inShelter ? (solar ? 'Permanece protegido' : 'Salir del refugio') : 'Entrar en el refugio'}</button><p className="small-note">Tu traje no sustituye el refugio frente a partículas solares.</p></div></div>
      <div className="excursion-heading"><h2>Salidas a la superficie</h2><span>Planifica ida, trabajo y vuelta.</span></div>
      <div className="site-grid">{(Object.keys(SITES) as SiteId[]).map(id => <article className={`site-card ${state.repairs[id] ? 'completed' : ''}`} key={id}><PixelIcon kind={SITES[id].icon} size={40}/><span className="eyebrow">{state.repairs[id] ? '✓ COMPLETADA' : SITES[id].required ? 'OBJETIVO DE RESCATE' : 'EXPLORACIÓN OPCIONAL'}</span><h3>{SITES[id].name}</h3><p>{SITES[id].description}</p><p className="small-note">{id === 'crater' ? 'Ruta larga. Más autonomía puede ser decisiva.' : id === 'platform' ? 'Necesitas Botas de Plomo Magnéticas.' : 'Revisa las reservas y la próxima alerta antes de salir.'}</p><div className="action-row"><button className="secondary-button" disabled={solar || state.base.inShelter || state.repairs[id] || (id === 'platform' && !has(state, 'boots'))} onClick={() => send({ type: 'excursion', site: id, route: 'long' })}>Salir por ruta larga</button>{id === 'crater' && <button className="text-button" disabled={solar || state.base.inShelter || state.repairs[id]} onClick={() => send({ type: 'excursion', site: id, route: 'short' })}>Atajo metálico</button>}</div></article>)}</div>
    </> : <Exterior state={state} send={send} explain={explain}/>}
    <p className="formal small-note">Reservas y tiempos: reglas del entrenamiento. Baterías de estaciones, energía de accesorios y soporte vital son sistemas diferenciados.</p>
  </section>;
}

function Exterior({ state, send, explain }: Omit<Props, 'blocked'>) {
  const trip = state.excursion!; const site = SITES[trip.site]; const done = state.repairs[trip.site];
  const progress = trip.stage === 'work' ? trip.progress * 100 : trip.distance ? trip.elapsed / trip.distance * 100 : 100;
  return <div className="exterior pixel-panel"><div className="screen-heading"><div><span className="eyebrow">SALIDA EXTERIOR</span><h2>{site.name}</h2></div><span>{trip.stage === 'outbound' ? 'Camino de ida' : trip.stage === 'return' ? 'Regresando' : done ? 'Trabajo terminado' : 'En el lugar de trabajo'}</span></div>
    <div className="suit-gauges"><Gauge label="Oxígeno de salida" value={state.suit.oxygen} max={oxygenCapacity(state)}/><Gauge label="Energía de mejoras" value={state.suit.energy}/><Gauge label="Confort del traje" value={state.suit.thermal} tone="gold"/><Gauge label="Polvo acumulado" value={state.suit.dust} tone={state.suit.dust > 65 ? 'danger' : 'gold'}/></div>
    <div className="surface-scene"><div className="stars"/><span className="surface-earth"/><div className="surface-ground"/><div className={`surface-machine ${trip.site === 'platform' ? 'metallic' : ''}`}><PixelIcon kind={site.icon} size={90}/><span>{done ? '✓ SISTEMA LISTO' : 'PUNTO DE TRABAJO'}</span></div><div className={`surface-player ${state.suit.shield ? 'shield-active' : ''}`} style={{ left: `${trip.stage === 'outbound' ? 10 + progress * .38 : trip.stage === 'return' ? 48 - progress * .38 : 48}%` }}><Astronaut upgrades={state.upgrades}/></div>{trip.site === 'platform' && <span className="metal-plate">PLACA FERROMAGNÉTICA</span>}</div>
    <div className="trip-progress"><span>{trip.stage === 'work' ? (done ? 'Completado' : `Trabajo · referencia ${Math.ceil(workSeconds(state))} s`) : 'Trayecto'}</span><progress max="100" value={progress} aria-label="Progreso de salida"/></div>
    <div className="accessory-controls">{has(state, 'shield') && <button className={`secondary-button ${state.suit.shield ? 'selected-chip' : ''}`} disabled={state.suit.energy <= 0} aria-pressed={state.suit.shield} onClick={() => send({ type: 'toggle-shield' })}>Electro-Escudo: {state.suit.shield ? 'encendido' : 'apagado'}</button>}{has(state, 'boots') && trip.site === 'platform' && <button className="secondary-button" disabled={trip.stage !== 'work'} aria-pressed={state.suit.magnets} onClick={() => send({ type: 'toggle-magnets' })}>{state.suit.magnets ? 'Soltar imanes' : 'Sujetar botas a la placa'}</button>}{has(state, 'gloves') && <span className="status-chip">Guantes: {state.suit.energy > 0 ? 'asistencia disponible' : 'sin asistencia'}</span>}</div>
    {has(state, 'radio') && trip.site === 'relay' && trip.stage === 'work' && <div className="antenna-control"><label htmlFor="antenna-heading">Orienta la antena: {state.suit.antenna}°</label><input id="antenna-heading" type="range" min="0" max="180" step="15" value={state.suit.antenna} onChange={e => send({ type: 'antenna', angle: Number(e.target.value) })}/><span>{Math.abs(state.suit.antenna - 90) <= 15 ? '✓ Enlace alineado' : 'Busca la marca central de 90°'}</span></div>}
    <div className="action-row"><button className="pixel-button primary" disabled={trip.stage !== 'work' || done || trip.progress > 0} onClick={() => send({ type: 'work' })}>{done ? '✓ Tarea completada' : trip.progress > 0 ? 'Trabajando…' : 'Comenzar trabajo'}</button><button className="secondary-button" disabled={trip.stage === 'return'} onClick={() => send({ type: 'return-outside' })}>Regresar a la base</button><button className="science-button" onClick={() => explain('outside')}>Ayuda de salida</button></div>
    <p className="small-note">El regreso consume reservas. Si interrumpes un trabajo antes de terminarlo, tendrás que empezarlo de nuevo en la próxima salida.</p>
  </div>;
}
