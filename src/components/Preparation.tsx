import { useRef, useState, type CSSProperties, type DragEvent, type PointerEvent } from 'react';
import { EQUIPMENT, SHIPS, UPGRADE_IDS, type UpgradeId } from '../content/equipment';
import { cargoMass, validCargo, type Campaign, type CampaignAction, type CargoId, type ShipId } from '../game/campaign';
import { PACKAGES } from '../game/rules/balance';
import type { PackageId } from '../game/rules/types';
import { Astronaut, PixelIcon, Rocket, RoomDecor } from './GameArt';
type Props = { state: Campaign; send: (action: CampaignAction) => void; explain: (id: string) => void };

const intro = [
  { label: 'CENTRO DE CONTROL · TIERRA', title: 'Una llamada desde la Luna', text: 'En la base de la Tierra, una televisión recibe una señal urgente. Algo no va bien en la base lunar…', button: 'Recibir transmisión' },
  { label: 'TRANSMISIÓN / BASE LUNAR', title: '¡Necesitamos relevo!', text: '¡Tierra, necesitamos relevo urgente! Se nos congeló el reciclador y… ¡bzzzt!… traigan más baterías y…', button: '¿Hola? ¿Nos escuchan?' },
  { label: 'SEÑAL PERDIDA', title: '¡RECLUTA SELECCIONADO!', text: 'Un momento… ¿ese recluta eres tú? ¡La garra de traslado ya viene!', button: '¡Aquí estoy!' },
  { label: 'TRASLADO AL LABORATORIO', title: 'Tu misión empieza ahora', text: '¡Eres nuestra última esperanza de rescate! Elige tus 3 mejoras, alista tu nave y prepárate para acudir al auxilio de la base.', button: 'Preparar mi traje' },
];
export function Intro({ state, send }: Props) {
  const frame = intro[state.introStep];
  return <section className="intro-screen screen-enter" aria-labelledby="screen-title">
    <div className="eyebrow">01 / LA LLAMADA</div>
    <div className={`television pixel-panel frame-${state.introStep}`}>
      <div className="tv-top"><span className="signal-dot"/> {frame.label}<span>CH 07</span></div>
      <div className="tv-scene"><RoomDecor/>
        {state.introStep < 2 ? <><Astronaut className={`veteran ${state.introStep === 1 ? 'shivering' : ''}`}/><span className="helmet-ice" aria-label="Hielo sobre el casco">❄</span><Astronaut className="background-astronaut" grumpy/><span className="grumpy-label">MODO GRUÑÓN<br/>Sin lechugas.</span><div className="tv-interference"/></> : <div className="recruit-scene"><div className={`robot-claw ${state.introStep === 3 ? 'descending' : ''}`} aria-hidden="true"><i/><b>╲ ╱</b></div><Astronaut/>{state.introStep === 2 && <strong className="recruit-stamp">¡RECLUTA<br/>SELECCIONADO!</strong>}</div>}
      </div>
      <div className="tv-bottom"><span>ENTRENAMIENTO DE MISIÓN</span><span>◉ ● ●</span></div>
    </div>
    <div className="dialogue-box pixel-panel"><h1 id="screen-title">{frame.title}</h1><p>{frame.text}</p></div>
    <div className="action-row"><button className="pixel-button primary" onClick={() => send({ type: 'next-intro' })}>{frame.button} <span aria-hidden="true">→</span></button><button className="text-button" onClick={() => send({ type: 'skip-intro' })}>Saltar introducción</button></div>
  </section>;
}

export function EquipmentWorkshop({ state, send, explain }: Props) {
  const [selected, setSelected] = useState<UpgradeId | null>(null);
  const [dragging, setDragging] = useState<{ id: UpgradeId; x: number; y: number } | null>(null);
  const slotsRef = useRef<HTMLDivElement>(null);
  const count = state.upgrades.filter(Boolean).length;
  function place(id: UpgradeId, slot: number) { send({ type: 'equip', id, slot }); setSelected(null); }
  function drop(event: DragEvent, slot: number) {
    event.preventDefault(); const id = event.dataTransfer.getData('text/plain').replace('upgrade:', '') as UpgradeId;
    if (UPGRADE_IDS.includes(id)) place(id, slot);
  }
  function touchStart(event: PointerEvent<HTMLButtonElement>, id: UpgradeId) {
    if (event.pointerType === 'mouse') return;
    event.currentTarget.setPointerCapture(event.pointerId); setSelected(id); setDragging({ id, x: event.clientX, y: event.clientY });
  }
  function touchEnd(event: PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-upgrade-slot]');
    if (target) place(dragging.id, Number(target.dataset.upgradeSlot));
    setDragging(null);
  }
  return <section className="workshop screen-enter" aria-labelledby="screen-title">
    <div className="screen-heading"><div><span className="eyebrow">02 / EQUIPAMIENTO</span><h1 id="screen-title">Laboratorio de trajes</h1></div><span className="counter">{count}<small> / 3 mejoras</small></span></div>
    <p className="screen-lead">Tu traje ya tiene lo básico. <strong>Arrastra tres mejoras</strong> a los espacios. Cada ventaja cambia tu estrategia.</p>
    <div className="workshop-stage"><RoomDecor/><div className="holo-arch"/><div className="holo-label">{state.editingBase ? 'MANTENIMIENTO / BASE LUNAR' : 'TRAJE DE ENTRENAMIENTO'}</div><Astronaut upgrades={state.upgrades} className="workshop-astronaut"/><div className="holo-platform"/><span className="platform-label">MISIÓN UMBRAL</span></div>
    <div className="equipment-slots" ref={slotsRef} aria-label="Tres espacios de mejoras">
      {state.upgrades.map((id, slot) => <div className={`equipment-slot ${id ? 'occupied' : ''}`} key={slot} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, slot)}>
        <button data-upgrade-slot={slot} className="slot-target" aria-label={`Espacio ${slot + 1}${id ? `: ${EQUIPMENT[id].name}` : ': vacío'}${selected ? `; colocar ${EQUIPMENT[selected].name}` : ''}`} onClick={() => selected ? place(selected, slot) : id ? setSelected(id) : undefined}>
          <span className="slot-number">0{slot + 1}</span>{id ? <><PixelIcon kind={id} size={38}/><span>{EQUIPMENT[id].name}</span></> : <><span className="slot-plus">+</span><span>Arrastra aquí</span></>}
        </button>{id && <button className="remove-upgrade" aria-label={`Quitar ${EQUIPMENT[id].name}`} onClick={() => send({ type: 'unequip', slot })}>×</button>}
      </div>)}
    </div>
    <p className="interaction-hint" role="status">{selected ? `${EQUIPMENT[selected].name} seleccionada. Elige un espacio para colocarla.` : 'También puedes seleccionar una tarjeta y después un espacio, usando Tab y Enter.'}</p>
    <div className="upgrade-catalog" aria-label="Seis mejoras disponibles">
      {UPGRADE_IDS.map((id, index) => {
        const item = EQUIPMENT[id]; const equipped = state.upgrades.includes(id);
        return <article className={`upgrade-card ${equipped ? 'is-equipped' : ''} ${selected === id ? 'is-selected' : ''}`} key={id} style={{ '--accent': item.color } as CSSProperties}>
          <button className="card-select" draggable onDragStart={event => { event.dataTransfer.setData('text/plain', `upgrade:${id}`); event.dataTransfer.effectAllowed = 'move'; }}
            onPointerDown={event => touchStart(event, id)} onPointerMove={event => { if (dragging?.id === id) setDragging({ id, x: event.clientX, y: event.clientY }); }} onPointerUp={touchEnd} onPointerCancel={() => setDragging(null)}
            aria-pressed={selected === id} onClick={() => { setSelected(id); slotsRef.current?.querySelector<HTMLButtonElement>(`[data-upgrade-slot="${Math.max(0, state.upgrades.indexOf(null))}"]`)?.focus(); }}>
            <span className="card-order">0{index + 1}</span><PixelIcon kind={id} size={52}/><h2>{item.name}</h2><span className="upgrade-tag">{equipped ? '✓ EQUIPADA' : item.short}</span>
          </button>
          <p className="benefit"><span>+</span> {item.benefit}</p><p className="cost"><span>−</span> {item.cost}</p><button className="science-button" onClick={() => explain(id)}>¿Cómo funciona?</button>
        </article>;
      })}
    </div>
    {dragging && <div className="drag-ghost" style={{ left: dragging.x, top: dragging.y }}><PixelIcon kind={dragging.id} size={54}/></div>}
    <div className="action-row"><button className="pixel-button primary" disabled={count !== 3} onClick={() => send({ type: 'confirm-equipment' })}>{state.editingBase ? 'Guardar traje y volver a la base' : 'Confirmar equipo y elegir nave'} →</button>{state.editingBase && <button className="text-button" onClick={() => send({ type: 'cancel-equipment' })}>Conservar equipo anterior</button>}</div>
    <p className="formal small-note">Tecnología real y prototipos documentados. Compatibilidad, capacidades y tiempos adaptados al entrenamiento.</p>
  </section>;
}

export function ShipSelection({ state, send, explain }: Props) {
  const [cargo, setCargo] = useState<CargoId>('water');
  const ship = state.ship && SHIPS[state.ship];
  return <section className="ship-screen screen-enter" aria-labelledby="screen-title">
    <div className="screen-heading"><div><span className="eyebrow">03 / ELIGE TU NAVE</span><h1 id="screen-title">Dos naves. Dos desafíos.</h1></div><button className="science-button" onClick={() => explain('ships')}>Conoce la ciencia</button></div>
    <p className="screen-lead">Piensa en tu viaje: <strong>espacio, agua y energía.</strong> La dificultad cambia las reservas y el margen para equivocarte.</p>
    <div className="ship-options">{(Object.keys(SHIPS) as ShipId[]).map(id => {
      const item = SHIPS[id]; return <button className={`ship-card ${state.ship === id ? 'chosen' : ''}`} key={id} style={{ '--accent': item.color } as CSSProperties} aria-pressed={state.ship === id} onClick={() => send({ type: 'choose-ship', ship: id })}>
        <span className="ship-era">{id === 'apollo' ? 'EL CLÁSICO' : 'LA MODERNA'}</span><Rocket ship={id}/><div className="ship-info"><h2>{item.name}</h2><span>{item.subtitle}</span><strong className="difficulty">{id === 'apollo' ? '★★★' : '★★'} {item.difficulty}</strong><p className="benefit">+ {item.benefit}</p><p className="cost">− {item.cost}</p><span className="ship-capacity">{item.slots} espacios · masa máxima {item.mass}</span></div>
      </button>;
    })}</div>
    {ship && <div className="cargo-workshop pixel-panel"><div className="screen-heading"><div><h2>Organiza la carga</h2><p>Incluye agua, alimentos y una batería. Llena todos los espacios.</p></div><span className={cargoMass(state) > ship.mass ? 'warning' : ''}>Masa: {cargoMass(state)} / {ship.mass}</span></div>
      <div className="cargo-palette">{(['water', 'food', 'battery'] as CargoId[]).map(id => <button key={id} className={cargo === id ? 'selected-chip' : ''} aria-pressed={cargo === id} draggable onDragStart={event => event.dataTransfer.setData('text/plain', `cargo:${id}`)} onClick={() => setCargo(id)}><PixelIcon kind={id} size={30}/>{id === 'water' ? 'Agua' : id === 'food' ? 'Alimento' : 'Batería'}<small>Masa {id === 'battery' ? 2 : 1}</small></button>)}</div>
      <div className="cargo-slots">{state.cargo.map((id, slot) => <button key={slot} aria-label={`Carga ${slot + 1}: ${id ?? 'vacía'}. Colocar ${cargo}`} onClick={() => send({ type: 'cargo', cargo, slot })} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain').replace('cargo:', '') as CargoId; if (['water', 'food', 'battery'].includes(id)) send({ type: 'cargo', cargo: id, slot }); }}><span>{slot + 1}</span>{id ? <PixelIcon kind={id}/> : <b>+</b>}</button>)}</div>
      <div className="action-row"><button className="pixel-button primary" disabled={!validCargo(state)} onClick={() => send({ type: 'confirm-ship' })}>Preparar refugio →</button><span className="formal small-note">Ranuras y masa: unidades del juego, no capacidades NASA.</span></div>
    </div>}
  </section>;
}

export function ShelterWorkshop({ state, send }: Props) {
  const chosen = state.base.shelter.chosen;
  const names = { light: 'Paquete ligero', supplies: 'Suministros', reinforced: 'Refuerzo' };
  const [selection, setSelection] = useState<PackageId[]>(chosen);
  function toggle(id: PackageId) {
    const next = selection.includes(id) ? selection.filter(x => x !== id) : selection.length < 2 ? [...selection, id] : [selection[1], id];
    setSelection(next); if (next.length === 2) send({ type: 'shelter', ids: next });
  }
  return <section className="shelter-screen screen-enter"><span className="eyebrow">04 / PREPARA TU REFUGIO</span><h1 id="screen-title">Protegerse también se planea</h1><p className="screen-lead">Elige dos paquetes distintos. Más protección ocupa más capacidad de carga y deja menos agua inicial en la base.</p>
    <div className="shelter-illustration"><PixelIcon kind="shelter" size={110}/><div className="supply-stack"><PixelIcon kind="water" size={50}/><PixelIcon kind="food" size={50}/></div></div>
    <div className="package-grid">{(Object.keys(PACKAGES) as PackageId[]).map(id => <button className={`package-card pixel-panel ${selection.includes(id) ? 'chosen' : ''}`} key={id} aria-pressed={selection.includes(id)} onClick={() => toggle(id)}><PixelIcon kind={id === 'light' ? 'shelter' : id === 'supplies' ? 'water' : 'armor'} size={54}/><h2>{names[id]}</h2><p>Masa {PACKAGES[id].mass} · Protección {PACKAGES[id].protection}</p><span>{selection.includes(id) ? '✓ Seleccionado' : 'Elegir'}</span></button>)}</div>
    <div className="shelter-summary pixel-panel"><p>Masa total: <strong>{selection.reduce((n, id) => n + PACKAGES[id].mass, 0)} / 5</strong></p><p>Agua inicial de base: <strong>{Math.round(state.base.reserves.water)}</strong></p><p>Tiempo de refugio: <strong>{state.base.solar.requiredDwellMs / 1000} s</strong></p></div>
    <p className="formal small-note">Protección, masa y duración son reglas educativas. Los suministros pueden ayudar a reducir exposición a partículas solares; no dan protección absoluta.</p>
    <button className="pixel-button primary" disabled={selection.length !== 2} onClick={() => send({ type: 'launch' })}>¡Listos para despegar! →</button>
  </section>;
}

export function Flight({ state, send, explain }: Props) {
  const ship = state.ship ?? 'orion'; const launchText = ['Cuenta atrás: sistemas preparados', 'Primera separación de etapas', 'La nave continúa su viaje'];
  if (state.phase === 'launch') return <section className="flight-screen screen-enter"><span className="eyebrow">05 / DESPEGUE</span><h1 id="screen-title">{launchText[state.flightStep]}</h1><div className={`launch-scene launch-step-${state.flightStep}`}><div className="stars"/><Rocket ship={ship} firing/><div className="launch-smoke"/></div><p className="screen-lead">{state.flightStep === 0 ? 'El cohete impulsa la nave. Revisa que toda la tripulación esté preparada.' : state.flightStep === 1 ? 'Las etapas que terminan su trabajo se separan. La nave continúa con menos masa.' : 'El cohete y la nave cumplen funciones distintas. Ahora cuidaremos los recursos de la nave.'}</p><button className="pixel-button primary" onClick={() => send({ type: 'advance-flight' })}>{state.flightStep === 2 ? 'Comenzar el viaje' : 'Continuar lanzamiento'} →</button></section>;
  const complete = state.travel.leg === 3; const sunny = state.travel.leg !== 1;
  return <section className="travel-screen screen-enter"><span className="eyebrow">06 / VIAJE</span><h1 id="screen-title">{complete ? 'La Luna, a la vista' : `Tramo ${state.travel.leg + 1} de 3 · ${sunny ? 'luz solar' : 'paso por sombra'}`}</h1>
    <div className="travel-window"><div className="stars"/><img className="travel-moon" src="/images/planeta-destino.png" width="128" height="128" alt="Destino lunar del entrenamiento"/><div className="travel-capsule">{ship === 'orion' && <><i/><i/></>}<PixelIcon kind="shelter" size={80}/></div></div>
    <div className="travel-resources"><p>Energía <strong>{Math.round(state.travel.energy)}%</strong></p><p>Agua <strong>{Math.round(state.travel.water)}%</strong></p>{ship === 'apollo' && <p>Reactivos <strong>{Math.round(state.travel.reactants)}%</strong></p>}<p>Observaciones <strong>{state.travel.observations}</strong></p></div>
    <div className="dialogue-box pixel-panel"><p>{complete ? 'La transferencia y el descenso siguientes son parte de nuestra misión futura de entrenamiento. Artemis II no alunizó y Columbia no era el módulo lunar.' : ship === 'apollo' ? 'Tus celdas generan electricidad y agua, pero consumen reactivos. Usar más energía acelera su agotamiento.' : sunny ? 'Los paneles reciben luz. Generan electricidad con potencia limitada y ayudan a cargar la batería. El agua viene de tanques.' : 'Sin luz solar, la batería debe sostener los equipos. Es buen momento para reducir el consumo.'}</p></div>
    {state.travel.leg === 1 && <div className={`flight-check pixel-panel ${ship === 'apollo' ? 'manual-check' : 'digital-check'}`}><div className="screen-heading"><h2>{ship === 'apollo' ? 'Panel de palancas' : 'Diagnóstico de sistemas'}</h2><span>{state.flightCheck} / 3</span></div><p>{ship === 'apollo' ? 'Acciona las palancas en orden: 1 identificar, 2 ajustar, 3 comprobar.' : 'Sigue el diagnóstico en orden: 1 leer estado, 2 aislar equipo auxiliar, 3 restablecer y comprobar.'}</p><div className="flight-check-controls">{(ship === 'apollo' ? ['Identificar circuito', 'Conectar reserva', 'Comprobar indicador'] : ['Leer diagnóstico', 'Aislar equipo auxiliar', 'Restablecer y comprobar']).map((label, control) => <button key={label} className={control < state.flightCheck ? 'check-complete' : ''} disabled={state.flightCheck === 3} onClick={() => send({ type: 'flight-control', control })}><span className="control-drawing" aria-hidden="true"/><strong>{control + 1}. {label}</strong><small>{control < state.flightCheck ? '✓ Comprobado' : 'Por comprobar'}</small></button>)}</div><p className="formal small-note">Procedimiento simplificado del entrenamiento, no instrucciones operativas de una nave real. Los controles mecánicos también pueden fallar; Orion combina pantallas con mandos e interruptores.</p></div>}
    <div className="action-row">{complete ? <button className="pixel-button primary" onClick={() => send({ type: 'land' })}>Transferencia y descenso a la base →</button> : <><button className="pixel-button primary" disabled={state.travel.leg === 1 && state.flightCheck !== 3} onClick={() => send({ type: 'travel', mode: 'eco' })}>Consumo moderado</button><button className="secondary-button" disabled={state.travel.leg === 1 && state.flightCheck !== 3} onClick={() => send({ type: 'travel', mode: 'fast' })}>Registrar una observación · mayor consumo</button></>}<button className="science-button" onClick={() => explain('avatar')}>Investigar con AVATAR</button></div>
    <p className="formal small-note">Reservas y tramos abreviados: reglas del entrenamiento, no simulación física del vuelo.</p>
  </section>;
}
