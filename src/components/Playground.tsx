import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { campaignStore as store } from '../game/campaign-store';
import { EQUIPMENT, SITES, SHIPS, UPGRADE_IDS, type UpgradeId } from '../content/equipment';
import { cargoMass, has, oxygenCapacity, validCargo, type Campaign, type CampaignAction, type CargoId, type ShipId, type SiteId } from '../game/campaign';
import type { BatteryId, PackageId, StationId } from '../game/rules/types';
import { STATION_IDS, BATTERY_IDS } from '../game/rules/balance';
import { Astronaut, PixelIcon, Rocket } from './GameArt';
import AvatarActivity from './AvatarActivity';
import { LaunchSequence, SpaceWindow } from './SpaceScene';

const labels: Record<StationId, string> = { air:'Aire', water:'Agua', thermal:'Calor', greenhouse:'Cultivo', lab:'AVATAR', comms:'Radio' };
const icons: Record<StationId, string> = { air:'air', water:'water', thermal:'thermal', greenhouse:'food', lab:'lab', comms:'comms' };
const objectColors:Record<string,string>={equipment:'#e1ae55',ship:'#ef9978',air:'#83ccd3',water:'#8eabdf',thermal:'#e9a067',greenhouse:'#9ecc89',lab:'#bb9cdb',comms:'#e4b57d',batteries:'#e9c36b',shelter:'#a5b9ad',exit:'#d79083',travel:'#e5c9a0',check:'#9dc5b8',avatar:'#c3aadf',work:'#e4bd79'};
type Point = { id: string; x: number; label: string; icon: string };
// Modal decisions are paused, but individual validated actions still reach the sole store.
function perform(action: CampaignAction) { const paused = store.getSnapshot().paused; store.setPaused(false); store.dispatch(action); store.setPaused(paused); }
function aim(s: Campaign) {
  if (s.phase === 'intro') return '¡La base lunar necesita tu ayuda!';
  if (s.phase === 'equipment') return 'Acércate al traje y elige tres mejoras.';
  if (s.phase === 'ship' || s.phase === 'shelter') return 'Acércate al cohete para preparar tu nave.';
  if (s.phase === 'launch') return '¡Despegamos! Las etapas se van separando.';
  if (s.phase === 'travel') return s.travel.leg === 3 ? 'Llegamos. Acércate a la puerta de descenso.' : s.travel.leg === 1 && s.flightCheck < 3 ? 'Revisa la consola antes de seguir.' : 'Acércate a la ventana para decidir cómo seguir.';
  if (s.base.solar.status === 'active') return s.base.inShelter ? 'Quédate protegido hasta que termine la alerta.' : '¡Al refugio! La armadura no detiene esta alerta.';
  if (s.excursion) return s.repairs[s.excursion.site] ? '¡Listo! Vuelve a la base.' : s.excursion.stage === 'outbound' ? 'Camino al trabajo. Recuerda guardar aire para volver.' : s.excursion.stage === 'return' ? 'De vuelta a la base.' : 'Acércate al equipo y repáralo.';
  if (!s.base.stations.air.batteryId) return 'Recoge una batería y llévala a Aire.';
  if (!s.base.stations.water.batteryId) return 'Lleva otra batería a Agua.';
  if (!s.base.stations.thermal.batteryId) return 'Conecta una batería al Calor.';
  if (!s.repairs.recycler) return 'Sal por la esclusa y repara el reciclador.';
  if (!s.repairs.relay) return 'Repara el repetidor para recuperar la señal.';
  if (!s.base.avatar.done) return 'Lleva energía al laboratorio AVATAR.';
  if (!s.base.comms.transmitted) return 'Conecta una batería a Radio para enviar el informe.';
  if (!s.base.greenhouse.harvests) return 'Dale energía al cultivo: ¡faltan lechugas!';
  return 'Cuida la base hasta superar las emergencias.';
}

export default function Playground({ state:s, blocked, explain }: {state:Campaign; blocked:boolean; explain:(id:string)=>void}) {
  const [panel, setPanel] = useState<string|null>(null);
  const [pending, setPending] = useState<Point|null>(null);
  const [hint, setHint] = useState('Toca el suelo para caminar. Acércate a algo y pulsa E.');
  const [quizIndex,setQuizIndex] = useState(0);
  // A selected existing battery, never a second resource inventory.
  const [carrying,setCarrying] = useState<BatteryId|null>(null);
  const carried = carrying && s.base.batteries[carrying].station === null ? carrying : null;
  const field = useRef<HTMLDivElement>(null);
  const held = useRef(new Set<string>());
  const [movingDirection,setMovingDirection] = useState<-1|0|1>(0);
  const hangar = ['intro','equipment','ship','shelter','launch'].includes(s.phase) && !s.editingBase;
  const flight = s.phase === 'travel';
  const outside = !!s.excursion;
  const points:Point[] = hangar ? [{id:'equipment',x:22,label:'Traje',icon:'armor'},{id:'ship',x:70,label:'Nave',icon:'shelter'}] : flight ? [{id:'travel',x:25,label:s.travel.leg===3?'Descender':'Ventana',icon:'shelter'},{id:'check',x:55,label:'Consola',icon:'comms'},{id:'avatar',x:82,label:'AVATAR',icon:'lab'}] : outside ? [{id:'work',x:70,label:SITES[s.excursion!.site].name,icon:SITES[s.excursion!.site].icon}] : [
    {id:'equipment',x:7,label:'Traje',icon:'armor'},{id:'batteries',x:12,label:'Baterías',icon:'battery'},...STATION_IDS.map((id,i)=>({id,x:20+i*11,label:labels[id],icon:icons[id]})),{id:'shelter',x:86,label:'Refugio',icon:'shelter'},{id:'exit',x:96,label:'Salir',icon:'boots'}];
  const nearest = points.reduce((best,p)=>Math.abs(p.x-s.playerX)<Math.abs(best.x-s.playerX)?p:best,points[0]);
  function interact(point:Point) {
    if(blocked||panel) return;
    if(point.id==='equipment') {
      if(s.phase==='base') { store.dispatch({type:'open-lab'}); if(store.getSnapshot().campaign.phase!=='equipment'){setHint(store.getSnapshot().campaign.message);return;} }
      else if(s.phase==='ship'||s.phase==='shelter') store.dispatch({type:'reopen-equipment'});
      if(store.getSnapshot().campaign.phase!=='equipment'){setHint('Acércate al laboratorio para cambiar el traje.');return;}
    }
    if(point.id==='ship'&&s.phase==='equipment'){setHint('Primero elige las tres mejoras en el traje.');return;}
    if(point.id==='shelter') {if(s.base.inShelter && s.base.solar.status==='active'){setHint('Quédate en el refugio hasta terminar la alerta.');return;}store.dispatch({type:'base-action',action:{type:'set-shelter-presence',inside:!s.base.inShelter}});return;}
    if(point.id==='avatar'){explain('avatar');return;}
    if(s.phase==='base'&&(point.id==='batteries'||STATION_IDS.includes(point.id as StationId))){
      if(s.base.solar.status==='active'||s.base.inShelter){setHint('Primero protégete en el refugio. Ahora no podemos mover baterías.');return;}
      if(point.id==='batteries'){
        if(carried){setCarrying(null);setHint('Dejaste la batería en el estante.');return;}
        const free=BATTERY_IDS.find(id=>s.base.batteries[id].station===null);
        if(free){setCarrying(free);setHint(`Llevas ${free.toUpperCase()}. Camina a una estación y pulsa E para conectarla.`);}else setHint('Todas están conectadas. Puedes recoger una de otra estación.');return;
      }
      const id=point.id as StationId;const attached=s.base.stations[id].batteryId;
      if(carried){if(attached){setHint('Aquí ya hay una batería. Busca una estación vacía.');return;}store.dispatch({type:'base-action',action:{type:'place-battery',batteryId:carried,stationId:id}});setCarrying(null);setHint(`¡${labels[id]} tiene energía!`);return;}
      if(id==='lab'){setPanel('lab');return;}
      if(attached){store.dispatch({type:'base-action',action:{type:'remove-battery',batteryId:attached}});setCarrying(attached);setHint(`Recogiste ${attached.toUpperCase()}. Esta estación ya no tiene energía.`);return;}
      setHint('Necesitas una batería. Recoge una del estante amarillo.');return;
    }
    if(point.id==='work'){store.dispatch({type:'work'});setHint(store.getSnapshot().campaign.message);return;}
    if(point.id==='check'&&s.travel.leg!==1){setHint('La consola está lista. Decide el siguiente tramo en la ventana.');return;}
    setPanel(point.id);
  }
  function approach(p:Point) { if(blocked||panel||s.phase==='intro'||s.phase==='launch')return;if(outside){if(s.excursion?.stage==='work')interact(p);return;}setPending(p);store.dispatch({type:'walk',x:Math.min(94,p.x)});setHint(`Vamos a ${p.label.toLowerCase()}…`); }
  useEffect(()=>{if(pending&&!blocked&&!panel&&Math.abs(s.playerX-Math.min(94,pending.x))<2){setPending(null);interact(pending);}},[s.playerX,pending,blocked,panel]);
  useEffect(()=>{setHint(s.message);},[s.message]);
  const input = useRef({blocked, panel, outside, nearest, state:s, interact});
  input.current = {blocked, panel, outside, nearest, state:s, interact};
  useEffect(()=>{held.current.clear();store.setDirection(0);setMovingDirection(0);setPending(null);},[blocked,panel,s.phase]);
  useEffect(()=>{
    const movementKey=(key:string)=>['arrowleft','arrowright','a','d'].includes(key);
    const update=()=>{const keys=held.current;const left=keys.has('arrowleft')||keys.has('a');const right=keys.has('arrowright')||keys.has('d');const dir=left===right?0:left?-1:1;store.setDirection(dir);setMovingDirection(dir);};
    const down=(e:KeyboardEvent)=>{
      const {blocked,panel,outside,nearest,state,interact}=input.current;
      if(blocked||panel||(e.target as HTMLElement).closest('input,select,dialog,a'))return;
      const key=e.key.toLowerCase();
      if(movementKey(key)){e.preventDefault();if(e.repeat||held.current.has(key))return;held.current.add(key);setPending(null);update();}
      if(key==='e'&&!e.repeat){e.preventDefault();if(outside?state.excursion?.stage==='work':Math.abs(nearest.x-state.playerX)<10)interact(nearest);}
    };
    const up=(e:KeyboardEvent)=>{const key=e.key.toLowerCase();if(movementKey(key)&&held.current.has(key)){held.current.delete(key);update();}};
    const stop=()=>{held.current.clear();store.setDirection(0);setMovingDirection(0);};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',stop);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',stop);stop();};
  },[]);
  const playerX = outside ? s.excursion!.stage==='work'?65:s.excursion!.stage==='outbound'?12+Math.min(1,s.excursion!.elapsed/Math.max(.1,s.excursion!.distance))*53:65-Math.min(1,s.excursion!.elapsed/Math.max(.1,s.excursion!.distance))*53 : s.playerX;
  const ended=['failed','return','debrief'].includes(s.phase);
  const values = outside ? [['Aire',s.suit.oxygen/oxygenCapacity(s)*100,'air'],['Energía',s.suit.energy,'battery'],['Abrigo',s.suit.thermal,'thermal']] : flight ? [['Energía',s.travel.energy,'battery'],['Agua',s.travel.water,'water']] : [['Aire',s.base.reserves.air,'air'],['Agua',s.base.reserves.water,'water'],['Calor',s.base.reserves.thermal,'thermal']];
  function close(){const current=store.getSnapshot().campaign;if(current.editingBase&&current.phase==='equipment')perform({type:'cancel-equipment'});setPanel(null);setPending(null);field.current?.focus();}
  return <div className="playground">
    <div className={`pg-mission ${s.base.solar.status==='active'?'pg-alert':''}`} role="status"><span>★</span><strong>{ended?s.phase==='failed'?'Podemos intentarlo otra vez.':'¡Rescate completado!':aim(s)}</strong>{s.phase==='base'&&<small>{Math.max(0,Math.ceil((300000-s.base.activeMs)/1000))} s</small>}</div>
    <div className="pg-hud">{(s.phase==='base'||flight)&&values.map(([name,value,icon])=><div key={name} className="pg-meter"><PixelIcon kind={String(icon)} size={23}/><span>{name}</span><meter min="0" max="100" value={Number(value)} aria-label={String(name)}/><b>{Math.ceil(Number(value))}</b></div>)}<span className="pg-place">{s.phase==='launch'?(s.flightStep===2?'ESPACIO':'DESPEGUE · TIERRA'):hangar?'HANGAR · TIERRA':flight?'EN VIAJE':outside?'SUPERFICIE LUNAR':'BASE LUNAR'}</span></div>
    <div className={`pg-field ${s.phase==='launch'?'pg-launch':hangar?'pg-hangar':flight?'pg-flight':outside?'pg-outside':'pg-base'}`} ref={field} tabIndex={0} role="group" aria-label="Zona de juego. Flechas para caminar y E para interactuar." onClick={e=>{if(blocked||panel||ended||s.phase==='intro'||s.phase==='launch')return;field.current?.focus();const r=e.currentTarget.getBoundingClientRect();setPending(null);store.dispatch({type:'walk',x:(e.clientX-r.left)/r.width*100});}}>
      {s.phase==='launch'?<LaunchSequence ship={s.ship??'orion'} step={s.flightStep} paused={blocked||!!panel}/>:<><div className="pg-window">{flight||outside||!hangar?<SpaceWindow leg={flight?s.travel.leg:3}/>:<><div className="pg-day-clouds"/><span className="pg-planet"/></>}</div><div className="pg-light"/><div className="pg-floor"/></>}
      {hangar&&s.phase!=='launch'&&<><div className="pg-dock"><Rocket ship={s.ship??'orion'}/></div><div className="pg-suit-display"><Astronaut upgrades={s.upgrades}/></div></>}
      {!ended&&s.phase!=='intro'&&s.phase!=='launch'&&points.map(p=><button key={p.id} className={`pg-object ${pending?.id===p.id?'pg-target':''} ${s.phase==='base'&&STATION_IDS.includes(p.id as StationId)&&s.base.stations[p.id as StationId].batteryId?'pg-powered':''}`} style={{left:`${p.x}%`,'--object-color':objectColors[p.id]??'#c9ae89'} as CSSProperties} aria-label={`Ir a ${p.label}`} onClick={e=>{e.stopPropagation();approach(p);}}><PixelIcon kind={p.icon} size={hangar?52:36}/><span>{p.label}</span><i>{s.phase==='base'&&STATION_IDS.includes(p.id as StationId)?s.base.stations[p.id as StationId].batteryId?.toUpperCase()??'Sin energía':'↓'}</i></button>)}
      {s.phase!=='launch'&&<div className="pg-player-track" style={{transform:`translate3d(${playerX}%,0,0)`}}><div className={`pg-player ${s.targetX!==s.playerX||movingDirection?'pg-walking':''}`}><Astronaut upgrades={s.upgrades}/>{carried&&<div className="pg-carried"><PixelIcon kind="battery" size={31}/></div>}<span>{carried?`LLEVAS ${carried.toUpperCase()}`:'TÚ'}</span></div></div>}
      {s.phase==='intro'&&<div className="pg-story"><div className="pg-tv"><Astronaut grumpy/><strong>¡Tierra, necesitamos ayuda!</strong><p>Se congeló el reciclador… y no quedan lechugas.</p></div><button className="pixel-button primary" onClick={e=>{e.stopPropagation();store.dispatch({type:'skip-intro'});}}>¡Voy al rescate! →</button></div>}
      {s.base.inShelter&&s.phase==='base'&&<div className="pg-sheltered"><PixelIcon kind="shelter" size={56}/><strong>{s.base.solar.status==='active'?'Quédate aquí. Estás protegido.':'Refugio preparado.'}</strong>{s.base.solar.status!=='active'&&<button onClick={e=>{e.stopPropagation();store.dispatch({type:'base-action',action:{type:'set-shelter-presence',inside:false}});}}>Salir del refugio</button>}</div>}
      {ended&&<div className="pg-ending" onClick={e=>e.stopPropagation()}><h1>{s.phase==='failed'?'¡Probemos otra estrategia!':'¡Volvieron las lechugas!'}</h1>{s.phase==='failed'?<><p>{s.cause}</p><button className="pixel-button primary" onClick={()=>store.dispatch({type:'retry'})}>Volver al punto seguro</button></>:s.phase==='return'?<><p>Tu equipo y tus decisiones ayudaron a la tripulación.</p><button className="pixel-button primary" onClick={()=>store.dispatch({type:'finish-return'})}>¿Qué aprendimos?</button></>:<><p>{['¿Por qué no funcionan seis estaciones a la vez?','¿Qué estudia AVATAR?','¿Qué nos protege en una alerta solar?'][quizIndex]}</p>{[['Tenemos cuatro baterías.','La Luna no permite electricidad.'],['Modelos de tejido con células.','Un chip dentro de tu cuerpo.'],['El refugio preparado.','Las botas magnéticas.']][quizIndex].map((answer,i)=><button key={answer} className="secondary-button" onClick={()=>{if(i===0){if(quizIndex<2)setQuizIndex(quizIndex+1);else store.dispatch({type:'restart'});}else setHint('Mira las pistas de lo que hiciste en la misión e inténtalo otra vez.');}}>{answer}</button>)}</>}</div>}
    </div>
    {outside&&<div className="pg-tools">{has(s,'shield')&&<button aria-pressed={s.suit.shield} onClick={()=>store.dispatch({type:'toggle-shield'})}><PixelIcon kind="shield" size={25}/> {s.suit.shield?'Apagar':'Limpiar polvo'}</button>}{has(s,'boots')&&s.excursion?.site==='platform'&&<button onClick={()=>store.dispatch({type:'toggle-magnets'})}>{s.suit.magnets?'Soltar botas':'Sujetar botas'}</button>}{has(s,'radio')&&s.excursion?.site==='relay'&&s.excursion.stage==='work'&&<label>Antena <input aria-label="Orientar antena" type="range" min="0" max="180" step="15" value={s.suit.antenna} onChange={e=>store.dispatch({type:'antenna',angle:Number(e.target.value)})}/></label>}{s.excursion?.stage==='work'&&!s.repairs[s.excursion.site]&&<button onClick={()=>store.dispatch({type:'work'})}>🔧 Reparar {Math.round(s.excursion.progress*100)}%</button>}<button onClick={()=>store.dispatch({type:'return-outside'})}>← Volver</button></div>}
    <div className="pg-bottom"><div className="pg-buddy"><img src="/images/astronauta-guia.png" alt="Tu guía"/><p role="status">{store.getSnapshot().persistenceMessage||hint}</p></div><div className="pg-movement">{movementButton(-1)}<button className="pg-use" disabled={blocked||!!panel||ended||s.phase==='intro'||s.phase==='launch'||(outside?s.excursion?.stage!=='work':Math.abs(nearest.x-s.playerX)>10)} onClick={()=>interact(nearest)}>E · {outside?'Reparar':nearest.label}</button>{movementButton(1)}</div></div>
    {panel&&<SmallPanel title={panel==='equipment'?'Elige tres mejoras':panel==='ship'?'Prepara tu nave':panel==='exit'?'¿A dónde vamos?':panel==='travel'?'Decide el viaje':panel==='check'?'Revisa los controles':labels[panel as StationId]??'Laboratorio'} close={close}>
      {panel==='equipment'?<CompactEquipment state={s} done={close} explain={explain}/>:panel==='ship'?<CompactShip state={s} done={close}/>:panel==='exit'?<div className="pg-destinations">{(Object.keys(SITES) as SiteId[]).map(id=><button className="secondary-button" disabled={s.repairs[id]} key={id} onClick={()=>{perform({type:'excursion',site:id,route:'long'});setHint(store.getSnapshot().campaign.message);close();}}><PixelIcon kind={SITES[id].icon}/>{SITES[id].name}{s.repairs[id]?' ✓':''}</button>)}<button className="text-button" onClick={()=>{perform({type:'excursion',site:'crater',route:'short'});setHint(store.getSnapshot().campaign.message);close();}}>Atajo metálico al cráter</button></div>:panel==='travel'?<><p>{s.travel.leg===3?'El descenso es parte de esta misión futura de entrenamiento.':s.travel.leg===1?'Estamos en sombra. Hay que cuidar la batería.':'Podemos ahorrar energía o registrar una observación.'}</p>{s.travel.leg===3?<button className="pixel-button primary" onClick={()=>{perform({type:'land'});close();}}>Descender a la base</button>:<><button className="pixel-button primary" onClick={()=>{perform({type:'travel',mode:'eco'});setHint(store.getSnapshot().campaign.message);close();}}>Ahorrar energía y continuar</button><button className="secondary-button" onClick={()=>{perform({type:'travel',mode:'fast'});close();}}>Observar · gasta más energía</button></>}</>:panel==='check'?<><p>{s.ship==='apollo'?'Baja las palancas en orden.':'Comprueba los botones en orden.'}</p><div className={`pg-checks ${s.ship==='apollo'?'manual-check':'digital-check'}`}>{['Leer','Ajustar','Comprobar'].map((label,control)=><button key={label} className={control<s.flightCheck?'pg-checked':''} onClick={()=>perform({type:'flight-control',control})}><span className="control-drawing"/>{control+1}. {label}{control<s.flightCheck?' ✓':''}</button>)}</div>{s.flightCheck===3&&<button className="pixel-button primary" onClick={close}>¡Todo listo!</button>}<small>Procedimiento simplificado del juego.</small></>:STATION_IDS.includes(panel as StationId)?<StationPanel state={s} station={panel as StationId} take={() => { const battery = s.base.stations[panel as StationId].batteryId; if(battery) { perform({type: 'base-action', action: {type: 'remove-battery', batteryId: battery}}); setCarrying(battery); close(); } }}/>:null}
    </SmallPanel>}
  </div>;
  function movementButton(direction:-1|1) {
    const stop=()=>{store.setDirection(0);setMovingDirection(0);};
    return <button aria-label={`Caminar a la ${direction===-1?'izquierda':'derecha'}`} disabled={blocked||!!panel||ended||s.phase==='intro'||s.phase==='launch'||outside} onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);setPending(null);store.setDirection(direction);setMovingDirection(direction);}} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onClick={e=>{if(e.detail===0){setPending(null);store.dispatch({type:'walk',x:store.getSnapshot().campaign.playerX+direction*1.2});}}}>{direction===-1?'←':'→'}</button>;
  }
}

function SmallPanel({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const prior=store.getSnapshot().paused;const focused=document.activeElement as HTMLElement;store.setPaused(true);ref.current?.showModal();return()=>{store.setPaused(prior);focused?.focus();};},[]);
  return <dialog ref={ref} className="pg-panel game-ui" aria-label={title} onCancel={e=>{e.preventDefault();close();}}><header><h2>{title}</h2><button aria-label="Cerrar decisión" onClick={close}>×</button></header><div className="pg-panel-body">{children}</div></dialog>;
}
function CompactEquipment({state:s,done,explain}:{state:Campaign;done:()=>void;explain:(id:string)=>void}){
  const [selected,setSelected]=useState<UpgradeId>('lung');const [touch,setTouch]=useState<UpgradeId|null>(null);
  function place(id:UpgradeId,slot:number){perform({type:'equip',id,slot});}
  function drop(e:DragEvent,slot:number){e.preventDefault();const id=e.dataTransfer.getData('text/plain') as UpgradeId;if(UPGRADE_IDS.includes(id))place(id,slot);}
  const item=EQUIPMENT[selected];
  return <><p className="pg-tiny">Arrastra tres tarjetas. También puedes tocar tarjeta y espacio.</p><div className="pg-upgrade-slots">{s.upgrades.map((id,slot)=><button key={slot} data-pg-slot={slot} onClick={()=>place(selected,slot)} onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,slot)} aria-label={`Espacio ${slot+1}: ${id?EQUIPMENT[id].name:'vacío'}`}>{id?<PixelIcon kind={id} size={42}/>:<b>+</b>}<small>{id?EQUIPMENT[id].name:'Aquí'}</small></button>)}</div><div className="pg-upgrades">{UPGRADE_IDS.map(id=><button className={selected===id?'pg-selected':''} key={id} draggable onDragStart={e=>e.dataTransfer.setData('text/plain',id)} onClick={()=>setSelected(id)} onPointerDown={e=>{if(e.pointerType!=='mouse'){e.currentTarget.setPointerCapture(e.pointerId);setTouch(id);setSelected(id);}}} onPointerUp={e=>{if(touch){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-pg-slot]');if(target)place(touch,Number(target.dataset.pgSlot));setTouch(null);}}} onPointerCancel={()=>setTouch(null)}><PixelIcon kind={id} size={36}/><span>{EQUIPMENT[id].name}</span>{s.upgrades.includes(id)&&<b>✓</b>}</button>)}</div><div className="pg-item-info"><strong>{item.name}</strong><p className="benefit">+ {item.short}</p><p className="cost">− {selected==='lung'?'Más lenta y no cabe por el atajo.':selected==='shield'?'Gasta energía al limpiar.':selected==='armor'?'Reparar cuesta más tiempo.':selected==='gloves'?'La ayuda necesita batería.':selected==='boots'?'Debes soltarlas para caminar.':'Hay que apuntar la antena.'}</p></div><button className="pixel-button primary" disabled={s.upgrades.filter(Boolean).length!==3} onClick={()=>{perform({type:'confirm-equipment'});done();}}>¡Traje listo!</button><button className="text-button" onClick={()=>{done();explain(selected);}}>¿Cómo funciona?</button></>;
}
function CompactShip({state:s,done}:{state:Campaign;done:()=>void}){
  const [packages,setPackages]=useState<PackageId[]>(()=>s.base.shelter.chosen.length===2?[...s.base.shelter.chosen]:['light','supplies']);
  function choose(ship:ShipId){perform({type:'choose-ship',ship});const items:CargoId[]=ship==='apollo'?['water','food','battery','water']:['water','food','battery','water','food','water'];items.forEach((cargo,slot)=>perform({type:'cargo',cargo,slot}));}
  return <><div className="pg-ship-choices">{(['apollo','orion'] as const).map(id=><button key={id} className={s.ship===id?'pg-selected':''} onClick={()=>choose(id)}><Rocket ship={id}/><strong>{SHIPS[id].name}</strong><span>{SHIPS[id].difficulty}</span><small>{id==='apollo'?'Menos espacio. Fabrica agua al generar energía.':'Más espacio. Usa el Sol; cuida tu agua.'}</small></button>)}</div>{s.ship&&<><p className="pg-tiny">Tu carga. Toca una bolsa para cambiarla.</p><div className="pg-cargo">{s.cargo.map((id,slot)=><button key={slot} aria-label={`Cambiar carga ${slot+1}`} onClick={()=>{const options:CargoId[]=['water','food','battery'];perform({type:'cargo',slot,cargo:options[(options.indexOf(id!)+1)%3]});}}><PixelIcon kind={id??'water'} size={28}/></button>)}</div><p className="pg-tiny">Masa {cargoMass(s)}/{SHIPS[s.ship].mass} · lleva agua, comida y batería.</p><p className="pg-tiny">Elige dos protecciones para tu refugio:</p><div className="pg-package-choices">{(['light','supplies','reinforced'] as PackageId[]).map((id,i)=><button key={id} aria-pressed={packages.includes(id)} className={packages.includes(id)?'pg-selected':''} onClick={()=>setPackages(packages.includes(id)?packages.filter(x=>x!==id):packages.length<2?[...packages,id]:[packages[1],id])}><PixelIcon kind={i===0?'shelter':i===1?'water':'armor'} size={27}/>{['Ligero','Suministros','Refuerzo'][i]}</button>)}</div><button className="pixel-button primary" disabled={!validCargo(s)||packages.length!==2} onClick={()=>{perform({type:'confirm-ship'});perform({type:'shelter',ids:packages});perform({type:'launch'});done();}}>¡Despegar!</button></>}</>;
}
function StationPanel({state:s,station,take}:{state:Campaign;station:StationId;take:()=>void}){
  const attached=s.base.stations[station].batteryId;
  return <><p>{attached?'El laboratorio tiene energía.':'Trae una batería del estante para dar energía al laboratorio.'}</p><AvatarActivity done={s.base.avatar.interactionDone} onComplete={()=>perform({type:'avatar-study'})}/>{attached && <button className="secondary-button" disabled={s.base.solar.status === 'active' || s.base.inShelter} onClick={take}>Recoger batería</button>}</>;
}
