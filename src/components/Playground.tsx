import Localized from './Localized';
import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { campaignStore as store } from '../game/campaign-store';
import { EQUIPMENT, SITES, SHIPS, UPGRADE_IDS, type UpgradeId } from '../content/equipment';
import { cargoMass, has, oxygenCapacity, validCargo, excursionX, type Campaign, type CampaignAction, type CargoId, type ShipId, type SiteId } from '../game/campaign';
import type { BatteryId, PackageId, StationId } from '../game/rules/types';
import { STATION_IDS, BATTERY_IDS } from '../game/rules/balance';
import { Astronaut, PixelIcon, Rocket } from './GameArt';
import AvatarActivity from './AvatarActivity';
import { LaunchSequence, SpaceWindow } from './SpaceScene';
import {announce,repeatNarration} from '../hooks/useNarration';
import HabitatBackdrop from './HabitatBackdrop';
import {missionText,characterThought,thoughtFeedback,importantFeedback,REFLECTIONS} from '../content/presentation';
import {zoneFor,pointNumber,missionProgress,PLACE_HELP} from '../content/orientation';
import {upgradePreview,UPGRADE_CARD_GAINS} from '../content/suit-presentation';
import {workSeconds} from '../game/campaign';
import ZoneBriefing from './ZoneBriefing';
import {AudioControls} from './AudioControls';
import ShipPreparation from './ShipPreparation';
import SuitStatus from './SuitStatus';
import {suitServiceStatus} from '../game/suit-service';

const labels: Record<StationId, string> = { air:'Aire', water:'Agua', thermal:'Calor', greenhouse:'Cultivo', lab:'AVATAR', comms:'Radio' };
const icons: Record<StationId, string> = { air:'air', water:'water', thermal:'thermal', greenhouse:'food', lab:'lab', comms:'comms' };
const objectColors:Record<string,string>={equipment:'#e1ae55',ship:'#ef9978',air:'#83ccd3',water:'#8eabdf',thermal:'#e9a067',greenhouse:'#9ecc89',lab:'#bb9cdb',comms:'#e4b57d',batteries:'#e9c36b',shelter:'#a5b9ad',exit:'#d79083',travel:'#e5c9a0',check:'#9dc5b8',avatar:'#c3aadf',work:'#e4bd79'};
type Point = { id: string; x: number; label: string; icon: string;deck?:number };
// Modal decisions are paused, but individual validated actions still reach the sole store.
function perform(action: CampaignAction) { const paused = store.getSnapshot().paused; store.setPaused(false); store.dispatch(action); store.setPaused(paused); }
export default function Playground({ state:s, blocked, explain }: {state:Campaign; blocked:boolean; explain:(id:string)=>void}) {
  const [panel, setPanel] = useState<string|null>(null);
  const [pending, setPending] = useState<Point|null>(null);
  const [hint, setHint] = useState('');
  const firstUnanswered=s.quiz.findIndex(answer=>answer!==0);
  const quizIndex=firstUnanswered<0?2:firstUnanswered;
  // A selected existing battery, never a second resource inventory.
  const [carrying,setCarrying] = useState<BatteryId|null>(null);
  const carried = carrying && s.base.batteries[carrying].station === null ? carrying : null;
  const mission=missionText(s);
  const progress=missionProgress(s);
  const zone=zoneFor(s);
  const showBriefing=!!zone&&!s.tutorialSeen?.includes(zone);
  const sceneScope=`scene:${s.phase}:${s.travel.leg}:${s.excursion?.stage??''}`;
  const thought=s.base.solar.status==='active'?characterThought(s,carried):hint?thoughtFeedback(hint):characterThought(s,carried);
  const field = useRef<HTMLDivElement>(null);
  const held = useRef(new Set<string>());
  const [movingDirection,setMovingDirection] = useState<-1|0|1>(0);
  const hangar = ['intro','equipment','ship','shelter','launch'].includes(s.phase) && !s.editingBase;
  const flight = s.phase === 'travel';
  const outside = !!s.excursion;
  const habitat=!hangar&&!flight&&!outside;
  const deck=s.playerDeck??1;
  const points:Point[] = hangar ? [{id:'equipment',x:22,label:'Traje',icon:'armor'},{id:'ship',x:70,label:'Nave',icon:'shelter'}] : flight ? [{id:'travel',x:25,label:s.travel.leg===3?'Descender':'Ventana',icon:'shelter'},{id:'check',x:55,label:'Consola',icon:'comms'},{id:'avatar',x:82,label:'AVATAR',icon:'lab'}] : outside ? [{id:'work',x:70,label:SITES[s.excursion!.site].name,icon:SITES[s.excursion!.site].icon}] : [
    {id:'equipment',x:18,deck:0,label:'Traje',icon:'armor'},{id:'lab',x:35,deck:0,label:'AVATAR',icon:'lab'},{id:'comms',x:76,deck:0,label:'Radio',icon:'comms'},
    {id:'batteries',x:24,deck:1,label:'Baterías',icon:'battery'},{id:'thermal',x:76,deck:1,label:'Calor',icon:'thermal'},
    {id:'air',x:24,deck:2,label:'Aire',icon:'air'},{id:'water',x:72,deck:2,label:'Agua',icon:'water'},{id:'exit',x:90,deck:2,label:'Salir',icon:'boots'},
    {id:'greenhouse',x:24,deck:3,label:'Cultivo',icon:'food'},{id:'shelter',x:77,deck:3,label:'Refugio',icon:'shelter'}];
  const distance=(p:Point)=>Math.abs(p.x-s.playerX)+(habitat?Math.abs((p.deck??deck)-deck)*100:0);
  const nearest = points.reduce((best,p)=>distance(p)<distance(best)?p:best,points[0]);
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
      if(id==='air'||id==='thermal'){setHint(attached?(id==='air'?'Me quedo junto a Aire para rellenar el oxígeno de mi traje.':'Me quedo junto a Calor para recuperar el abrigo del traje.'):'El generador está apagado. Primero llevo una batería que funcione.');return;}
      if(attached){store.dispatch({type:'base-action',action:{type:'remove-battery',batteryId:attached}});setCarrying(attached);setHint(`Recogiste ${attached.toUpperCase()}. Esta estación ya no tiene energía.`);return;}
      setHint('Necesitas una batería. Recoge una del estante amarillo.');return;
    }
    if(point.id==='work'){store.dispatch({type:'work'});setHint(store.getSnapshot().campaign.message);return;}
    if(point.id==='check'&&s.travel.leg!==1){setHint('La consola está lista. Decide el siguiente tramo en la ventana.');return;}
    setPanel(point.id);
  }
  function approach(p:Point) { if(blocked||panel||s.phase==='intro'||s.phase==='launch')return;if(outside){if(s.excursion?.stage==='work')interact(p);return;}setPending(p);store.dispatch({type:'walk',x:Math.min(94,p.x),deck:p.deck});setHint(`Me acerco a ${p.label.toLowerCase()}. ${PLACE_HELP[p.id]??''}`); }
  useEffect(()=>{if(pending&&!blocked&&!panel&&Math.abs(s.playerX-Math.min(94,pending.x))<2&&(!habitat||Math.abs(deck-(pending.deck??deck))<.01)){setPending(null);interact(pending);}},[s.playerX,deck,pending,blocked,panel]);
  useEffect(()=>{setHint(importantFeedback(s.message)?s.message:'');},[s.message,s.phase]);
  useEffect(()=>{if(blocked||panel||showBriefing)return;const text=s.phase==='launch'?'¡Despegamos! Soltamos las etapas usadas y seguimos en la cápsula.':s.phase==='intro'?'¡Tierra, necesitamos ayuda! Se congeló el reciclador y no quedan lechugas. Tu misión es rescatar la base: repara agua y radio, prepara el estudio y consigue una cosecha. Cuida las reservas y usa el refugio ante la alerta.':s.phase==='debrief'?thought+' '+REFLECTIONS[quizIndex].question+' '+REFLECTIONS[quizIndex].answers.join(' O bien: '):mission+' '+(s.phase==='failed'?s.cause+' ':'')+thought;announce(text,s.base.solar.status==='active'?5:1,sceneScope);},[mission,thought,blocked,panel,quizIndex,showBriefing,sceneScope]);
  useEffect(()=>{if(panel==='check')announce(s.flightCheck===3?'¡Los tres controles están listos!':`Control ${s.flightCheck+1}: ${['Leer','Ajustar','Comprobar'][s.flightCheck]}. Pulsa los botones en orden.`,3,'panel:check');},[panel,s.flightCheck]);
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
      if((key==='arrowup'||key==='arrowdown')&&!e.repeat&&state.phase==='base'&&!state.excursion){e.preventDefault();setPending(null);store.dispatch({type:'walk',x:50,deck:Math.max(0,Math.min(3,Math.round(state.playerDeck??1)+(key==='arrowup'?-1:1)))});}
      if(key==='e'&&!e.repeat){e.preventDefault();if(outside?state.excursion?.stage==='work':Math.abs(nearest.x-state.playerX)<10&&Math.abs((nearest.deck??state.playerDeck??1)-(state.playerDeck??1))<.01)interact(nearest);}
    };
    const up=(e:KeyboardEvent)=>{const key=e.key.toLowerCase();if(movementKey(key)&&held.current.has(key)){held.current.delete(key);update();}};
    const stop=()=>{held.current.clear();store.setDirection(0);setMovingDirection(0);};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',stop);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',stop);stop();};
  },[]);
  const playerX = outside ? excursionX(s) : s.playerX;
  const ended=['failed','return','debrief'].includes(s.phase);
  const values = outside ? [['Aire',s.suit.oxygen/oxygenCapacity(s)*100,'air'],['Energía',s.suit.energy,'battery'],['Abrigo',s.suit.thermal,'thermal']] : flight ? [['Energía',s.travel.energy,'battery'],['Agua',s.travel.water,'water']] : [['Aire',s.base.reserves.air,'air'],['Agua',s.base.reserves.water,'water'],['Calor',s.base.reserves.thermal,'thermal']];
  function close(){const current=store.getSnapshot().campaign;if(current.editingBase&&current.phase==='equipment')perform({type:'cancel-equipment'});setPanel(null);setPending(null);field.current?.focus();}
  return <Localized><div className="playground">
    <div className={`pg-mission ${s.base.solar.status==='active'?'pg-alert':''}`} role="status"><span className="pg-mission-badge">{progress.label} {progress.current}/{progress.total}</span><strong>{mission}</strong>{s.phase==='base'&&<small>{Math.max(0,Math.ceil((300000-s.base.activeMs)/1000))} s</small>}</div>
    <div className="pg-hud">{s.phase==='base'&&!outside&&<b className="hud-source">BASE</b>}{(s.phase==='base'||flight)&&values.map(([name,value,icon])=><div key={name} className="pg-meter"><PixelIcon kind={String(icon)} size={23}/><span>{name}</span><meter min="0" max="100" value={Number(value)} aria-label={String(name)}/><b>{Math.ceil(Number(value))}</b></div>)}<span className="pg-place">{s.phase==='launch'?(s.flightStep===2?'ESPACIO':'DESPEGUE · TIERRA'):hangar?'HANGAR · TIERRA':flight?'EN VIAJE':outside?'SUPERFICIE MARCIANA':'BASE JEZERO · MARTE'}</span></div>
    {s.phase==='base'&&!outside&&<SuitStatus canTakeBattery={!carried} state={s} moving={!!movingDirection||Math.abs(s.targetX-s.playerX)>.01||Math.abs((s.targetDeck??deck)-deck)>.01} scope={sceneScope} takeBattery={()=>{const status=suitServiceStatus(s);const id=status.oxygen.atStation?'air':status.thermal.atStation?'thermal':null;const battery=id?s.base.stations[id].batteryId:null;if(battery&&!carried){store.dispatch({type:'base-action',action:{type:'remove-battery',batteryId:battery}});setCarrying(battery);setHint('Recogí la batería. El generador se apaga hasta que conecte otra.');}}}/>}
    <div className={`pg-field ${s.phase==='launch'?'pg-launch':hangar?'pg-hangar':flight?'pg-flight':outside?'pg-outside':'pg-base'}`} ref={field} tabIndex={0} role="group" aria-label="Zona de juego. Flechas para caminar, subir y bajar. E para interactuar." onClick={e=>{if(blocked||panel||ended||s.phase==='intro'||s.phase==='launch')return;field.current?.focus();const r=e.currentTarget.getBoundingClientRect();setPending(null);store.dispatch({type:'walk',x:habitat?(e.clientX-r.left-r.width*.14)/(r.width*.72)*100:(e.clientX-r.left)/r.width*100,deck:habitat?Math.max(0,Math.min(3,Math.floor((e.clientY-r.top)/r.height*4))):undefined});}}>
      {habitat?<><HabitatBackdrop/>{['Mando y radio','Energía','Hielo y oxígeno','Invernadero rosa'].map((name,index)=><button key={name} className="habitat-floor-label" style={{top:`${index*25+.5}%`}} onClick={e=>{e.stopPropagation();setPending(null);store.dispatch({type:'walk',x:50,deck:index});}}><b>{index+1}</b><span>{name}</span></button>)}</>:s.phase==='launch'?<LaunchSequence ship={s.ship??'orion'} step={s.flightStep} paused={blocked||!!panel}/>:<><div className="pg-window">{flight||outside||!hangar?<SpaceWindow leg={flight?s.travel.leg:3}/>:<><div className="pg-day-clouds"/><span className="pg-planet"/></>}</div><div className="pg-light"/><div className="pg-floor"/></>}
      {hangar&&s.phase!=='launch'&&<><div className="pg-dock"><Rocket ship={s.ship??'orion'}/></div><div className="pg-suit-display"><Astronaut upgrades={s.upgrades}/></div></>}
      {!ended&&s.phase!=='intro'&&s.phase!=='launch'&&points.map(p=><button key={p.id} className={`pg-object ${pending?.id===p.id?'pg-target':''} ${s.phase==='base'&&STATION_IDS.includes(p.id as StationId)&&s.base.stations[p.id as StationId].batteryId?'pg-powered':''}`} style={{left:`${habitat?14+p.x*.72:p.x}%`,...(habitat?{top:`${(p.deck!+.22)*25}%`,bottom:'auto'}:{}),'--point-x':(habitat?14+p.x*.72:p.x)+'%','--object-color':objectColors[p.id]??'#c9ae89'} as CSSProperties} aria-label={`Ir a ${p.label}`} onClick={e=>{e.stopPropagation();approach(p);}}><b className="pg-point-number">{pointNumber(zone??'base',p.id)}</b><PixelIcon kind={p.icon} size={hangar?52:36}/><span>{p.label}</span><i>{s.phase==='base'&&STATION_IDS.includes(p.id as StationId)?s.base.stations[p.id as StationId].batteryId?.toUpperCase()??'Sin energía':'↓'}</i></button>)}
      {s.phase!=='launch'&&<div className="pg-player-track" style={{transform:`translate3d(${habitat?14+playerX*.72:playerX}%,${habitat?(deck-3)*25:0}%,0)`}}><div className={`pg-player ${s.targetX!==s.playerX||movingDirection||(outside&&s.excursion?.stage!=='work')||Math.abs((s.targetDeck??deck)-deck)>.01?'pg-walking':''}`}><Astronaut upgrades={s.upgrades}/>{carried&&<div className="pg-carried"><PixelIcon kind="battery" size={31}/></div>}<span>{carried?`LLEVAS ${carried.toUpperCase()}`:'TÚ'}</span></div></div>}
      {s.phase==='intro'&&<div className="pg-story"><div className="pg-tv"><Astronaut grumpy/><strong>¡Tierra, necesitamos ayuda!</strong><p>Se congeló el reciclador… y no quedan lechugas.</p><div className="mission-purpose"><b>Tu meta: rescatar la base</b><p>Repara agua y radio, prepara AVATAR y consigue una cosecha.</p><small>Cuida aire, agua y calor. Supera la alerta solar y la avería para regresar con la tripulación.</small></div></div><button className="pixel-button primary" onClick={e=>{e.stopPropagation();store.dispatch({type:'skip-intro'});}}>¡Voy al rescate! →</button></div>}
      {s.base.inShelter&&s.phase==='base'&&<div className="pg-sheltered"><PixelIcon kind="shelter" size={56}/><strong>{s.base.solar.status==='active'?'Quédate aquí. Estás protegido.':'Refugio preparado.'}</strong>{s.base.solar.status!=='active'&&<button onClick={e=>{e.stopPropagation();store.dispatch({type:'base-action',action:{type:'set-shelter-presence',inside:false}});}}>Salir del refugio</button>}</div>}
      {ended&&<div className="pg-ending" onClick={e=>e.stopPropagation()}><h1>{s.phase==='failed'?'¡Probemos otra estrategia!':'¡Volvieron las lechugas!'}</h1>{s.phase==='failed'?<><p>{s.cause}</p><button className="pixel-button primary" onClick={()=>store.dispatch({type:'retry'})}>Volver al punto seguro</button></>:s.phase==='return'?<><p>Tu equipo y tus decisiones ayudaron a la tripulación.</p><button className="pixel-button primary" onClick={()=>store.dispatch({type:'finish-return'})}>¿Qué aprendimos?</button></>:<><p>{REFLECTIONS[quizIndex].question}</p>{REFLECTIONS[quizIndex].answers.map((answer,i)=><button key={answer} className="secondary-button" onClick={()=>{if(i===0){store.dispatch({type:'quiz',index:quizIndex,answer:i});if(quizIndex===2)store.dispatch({type:'restart'});}else {store.dispatch({type:'quiz',index:quizIndex,answer:i});setHint('Mira las pistas de lo que hice en la misión. Puedo intentarlo otra vez.');}}}>{answer}</button>)}</>}</div>}
    </div>
    {outside&&<div className="suit-effects" aria-label="Efectos de tu traje">{s.upgrades.filter(Boolean).map(id=><span key={id} className={id==='shield'&&!s.suit.shield||id==='gloves'&&s.suit.energy<=0?'effect-idle':'effect-active'}><PixelIcon kind={id!} size={19}/>{id==='lung'?'Aire ampliado':id==='armor'?'Menos pérdida de abrigo':id==='gloves'?(s.suit.energy>0?'Guantes asistidos':'Guantes sin energía'):id==='shield'?(s.suit.shield?'Retirando polvo':'Escudo apagado'):id==='boots'?(s.suit.magnets?'Botas sujetas':'Botas listas'):Math.abs(s.suit.antenna-90)<=15?'Antena orientada':'Apunta la antena'}</span>)}{s.excursion?.stage==='work'&&<strong>Reparación: {workSeconds(s)} s</strong>}</div>}
    {outside&&<div className="pg-tools">{has(s,'shield')&&<button aria-pressed={s.suit.shield} onClick={()=>store.dispatch({type:'toggle-shield'})}><PixelIcon kind="shield" size={25}/> {s.suit.shield?'Apagar':'Limpiar polvo'}</button>}{has(s,'boots')&&s.excursion?.site==='platform'&&<button onClick={()=>store.dispatch({type:'toggle-magnets'})}>{s.suit.magnets?'Soltar botas':'Sujetar botas'}</button>}{has(s,'radio')&&s.excursion?.site==='relay'&&s.excursion.stage==='work'&&<label>Antena <input aria-label="Orientar antena" type="range" min="0" max="180" step="15" value={s.suit.antenna} onChange={e=>store.dispatch({type:'antenna',angle:Number(e.target.value)})}/></label>}{s.excursion?.stage==='work'&&!s.repairs[s.excursion.site]&&<button onClick={()=>store.dispatch({type:'work'})}>🔧 Reparar {Math.round(s.excursion.progress*100)}%</button>}<button onClick={()=>store.dispatch({type:'return-outside'})}>← Volver</button></div>}
    <div className="pg-bottom"><div className="pg-buddy"><img src="/images/astronauta-guia.png" alt="Tu guía"/><div className="pg-thought"><span>LO QUE PIENSO</span>{s.phase!=='intro'&&s.phase!=='launch'&&<button className="place-explain" onClick={()=>explain('place:'+nearest.id)}>¿Qué hace {nearest.label}?</button>}<p role="status">{store.getSnapshot().persistenceMessage||thought}</p></div></div><div className="pg-movement">{habitat&&<button aria-label="Subir un piso" disabled={blocked||!!panel||s.base.inShelter||deck<=0} onClick={()=>{setPending(null);store.dispatch({type:"walk",x:50,deck:Math.max(0,Math.ceil(deck)-1)});}}>↑</button>}{movementButton(-1)}<button className="pg-use" disabled={blocked||!!panel||ended||s.phase==='intro'||s.phase==='launch'||(outside?s.excursion?.stage!=='work':Math.abs(nearest.x-s.playerX)>10||(habitat&&Math.abs((nearest.deck??deck)-deck)>.01))} onClick={()=>interact(nearest)}>E · {outside?'Reparar':nearest.label}</button>{movementButton(1)}{habitat&&<button aria-label="Bajar un piso" disabled={blocked||!!panel||s.base.inShelter||deck>=3} onClick={()=>{setPending(null);store.dispatch({type:"walk",x:50,deck:Math.min(3,Math.floor(deck)+1)});}}>↓</button>}</div></div>
    {showBriefing&&zone&&<ZoneBriefing zone={zone}/>}
    {panel&&<SmallPanel scopeKey={'panel:'+panel} title={panel==='equipment'?'Elige tres mejoras':panel==='ship'?'Prepara tu nave':panel==='exit'?'¿A dónde vamos?':panel==='travel'?'Decide el viaje':panel==='check'?'Revisa los controles':labels[panel as StationId]??'Laboratorio'} close={close}>
      {panel==='equipment'?<CompactEquipment state={s} done={close} explain={explain}/>:panel==='ship'?<ShipPreparation state={s} done={close}/>:panel==='exit'?<div className="pg-destinations">{(Object.keys(SITES) as SiteId[]).map(id=><button className="secondary-button" disabled={s.repairs[id]} key={id} onClick={()=>{perform({type:'excursion',site:id,route:'long'});setHint(store.getSnapshot().campaign.message);close();}}><PixelIcon kind={SITES[id].icon}/>{SITES[id].name}{s.repairs[id]?' ✓':''}</button>)}<button className="text-button" onClick={()=>{perform({type:'excursion',site:'crater',route:'short'});setHint(store.getSnapshot().campaign.message);close();}}>Atajo metálico al cráter</button></div>:panel==='travel'?<><p>{s.travel.leg===3?'El descenso es parte de esta misión futura de entrenamiento.':s.travel.leg===1?'Estamos en sombra. Hay que cuidar la batería.':'Podemos ahorrar energía o registrar una observación.'}</p>{s.travel.leg===3?<button className="pixel-button primary" onClick={()=>{perform({type:'land'});close();}}>Descender a la base</button>:<><button className="pixel-button primary" onClick={()=>{perform({type:'travel',mode:'eco'});setHint(store.getSnapshot().campaign.message);close();}}>Ahorrar energía y continuar</button><button className="secondary-button" onClick={()=>{perform({type:'travel',mode:'fast'});close();}}>Observar · gasta más energía</button></>}</>:panel==='check'?<><p>{s.ship==='apollo'?'Baja las palancas en orden.':'Comprueba los botones en orden.'}</p><div className={`pg-checks ${s.ship==='apollo'?'manual-check':'digital-check'}`}>{['Leer','Ajustar','Comprobar'].map((label,control)=><button key={label} className={control<s.flightCheck?'pg-checked':''} onClick={()=>perform({type:'flight-control',control})}><span className="control-drawing"/>{control+1}. {label}{control<s.flightCheck?' ✓':''}</button>)}</div>{s.flightCheck===3&&<button className="pixel-button primary" onClick={close}>¡Todo listo!</button>}<small>Procedimiento simplificado del juego.</small></>:STATION_IDS.includes(panel as StationId)?<StationPanel state={s} station={panel as StationId} take={() => { const battery = s.base.stations[panel as StationId].batteryId; if(battery) { perform({type: 'base-action', action: {type: 'remove-battery', batteryId: battery}}); setCarrying(battery); close(); } }}/>:null}
    </SmallPanel>}
  </div></Localized>;
  function movementButton(direction:-1|1) {
    const stop=()=>{store.setDirection(0);setMovingDirection(0);};
    return <Localized><button aria-label={`Caminar a la ${direction===-1?'izquierda':'derecha'}`} disabled={blocked||!!panel||ended||s.phase==='intro'||s.phase==='launch'||outside} onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);setPending(null);store.setDirection(direction);setMovingDirection(direction);}} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onClick={e=>{if(e.detail===0){setPending(null);store.dispatch({type:'walk',x:store.getSnapshot().campaign.playerX+direction*1.2});}}}>{direction===-1?'←':'→'}</button></Localized>;
  }
}

function SmallPanel({title,close,children,scopeKey}:{scopeKey:string;title:string;close:()=>void;children:React.ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const prior=store.getSnapshot().paused;const focused=document.activeElement as HTMLElement;store.setPaused(true);ref.current?.showModal();announce(title+'. '+(title==='Revisa los controles'?'Pulsa en orden: leer, ajustar y comprobar.':title==='Decide el viaje'?'Puedes ahorrar energía o hacer una observación que gasta más energía.':title==='¿A dónde vamos?'?'Elige qué equipo exterior quieres visitar. Guarda reservas para volver.':''),2,scopeKey);return()=>{store.setPaused(prior);focused?.focus();};},[]);
  return <Localized><dialog ref={ref} className="pg-panel game-ui" aria-label={title} onCancel={e=>{e.preventDefault();close();}}><header><h2>{title}</h2><AudioControls repeatLabel="Repetir voz de la decisión"/><button aria-label="Cerrar decisión" onClick={close}>×</button></header><div className="pg-panel-body">{children}</div></dialog></Localized>;
}
function CompactEquipment({state:s,done,explain}:{state:Campaign;done:()=>void;explain:(id:string)=>void}){
  const [selected,setSelected]=useState<UpgradeId>('lung');const [touch,setTouch]=useState<UpgradeId|null>(null);
  function place(id:UpgradeId,slot:number){perform({type:'equip',id,slot});announce(`${EQUIPMENT[id].name} en el espacio ${slot+1}. Puedo cambiarla antes de confirmar.`,4,'panel:equipment');}
  function drop(e:DragEvent,slot:number){e.preventDefault();const id=e.dataTransfer.getData('text/plain') as UpgradeId;if(UPGRADE_IDS.includes(id))place(id,slot);}
  const item=EQUIPMENT[selected];const preview=upgradePreview(selected,s);
  useEffect(()=>announce(`${item.name}. ${item.benefit} Ten en cuenta: ${item.cost}`,3,'panel:equipment'),[selected]);
  return <Localized><><p className="pg-tiny">Arrastra tres tarjetas. También puedes tocar tarjeta y espacio.</p><div className="pg-upgrade-slots">{s.upgrades.map((id,slot)=><button key={slot} data-pg-slot={slot} onClick={()=>place(selected,slot)} onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,slot)} aria-label={`Espacio ${slot+1}: ${id?EQUIPMENT[id].name:'vacío'}`}>{id?<PixelIcon kind={id} size={42}/>:<b>+</b>}<small>{id?EQUIPMENT[id].name:'Aquí'}</small></button>)}</div><div className="pg-upgrades">{UPGRADE_IDS.map(id=><button className={selected===id?'pg-selected':''} key={id} draggable onDragStart={e=>e.dataTransfer.setData('text/plain',id)} onClick={()=>setSelected(id)} onPointerDown={e=>{if(e.pointerType!=='mouse'){e.currentTarget.setPointerCapture(e.pointerId);setTouch(id);setSelected(id);}}} onPointerUp={e=>{if(touch){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-pg-slot]');if(target)place(touch,Number(target.dataset.pgSlot));setTouch(null);}}} onPointerCancel={()=>setTouch(null)}><PixelIcon kind={id} size={36}/><span>{EQUIPMENT[id].name}</span><small className="upgrade-card-gain">{UPGRADE_CARD_GAINS[id]}</small>{s.upgrades.includes(id)&&<b>✓</b>}</button>)}</div><div className="pg-item-info"><strong>{item.name}</strong><small className="training-rule">Comparación en el juego</small><p className="benefit upgrade-metric">✓ {preview.metric}</p><details className="upgrade-detail"><summary>Ver comparación</summary><p>{preview.detail}</p></details><p className="cost">− {selected==='lung'?'Más lenta y no cabe por el atajo.':selected==='shield'?'Gasta energía al limpiar.':selected==='armor'?'Reparar cuesta más tiempo.':selected==='gloves'?'La ayuda necesita batería.':selected==='boots'?'Debes soltarlas para caminar.':'Hay que apuntar la antena.'}</p></div><div className="gear-actions"><button className="pixel-button primary" disabled={s.upgrades.filter(Boolean).length!==3} onClick={()=>{perform({type:'confirm-equipment'});done();}}>¡Traje listo!</button><button className="text-button" onClick={()=>{done();explain(selected);}}>¿Cómo funciona?</button></div></></Localized>;
}
function StationPanel({state:s,station,take}:{state:Campaign;station:StationId;take:()=>void}){
  const attached=s.base.stations[station].batteryId;
  return <Localized><><p>{attached?'El laboratorio tiene energía.':'Trae una batería del estante para dar energía al laboratorio.'}</p><AvatarActivity scope="panel:lab" done={s.base.avatar.interactionDone} onComplete={()=>perform({type:'avatar-study'})}/>{attached && <button className="secondary-button" disabled={s.base.solar.status === 'active' || s.base.inShelter} onClick={take}>Recoger batería</button>}</></Localized>;
}
