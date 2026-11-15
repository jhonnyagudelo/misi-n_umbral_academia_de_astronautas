import { createInitialState, dispatch as baseAct, tick as baseTick, isValidShelter, objectives } from './rules/engine';
import { BATTERY_IDS, STATION_IDS, PACKAGES, RULES_VERSION, BALANCE } from './rules/balance';
import type { Action, GameState, PackageId, StationId } from './rules/types';
import { SHIPS, SITES, UPGRADE_IDS, type UpgradeId } from '../content/equipment';
import { SUIT_SERVICE_POINTS, suitServiceStatus } from './suit-service';
export type { UpgradeId } from '../content/equipment';
export type ShipId = keyof typeof SHIPS;
export type SiteId = keyof typeof SITES;
export type CargoId = 'water' | 'food' | 'battery';
export type CampaignPhase = 'intro' | 'equipment' | 'ship' | 'shelter' | 'launch' | 'travel' | 'base' | 'return' | 'debrief' | 'failed';
export type Excursion = { site: SiteId; stage: 'outbound' | 'work' | 'return'; elapsed: number; distance: number; progress: number; route: 'long' | 'short';startX?:number };
export interface Snapshot {
  tutorialSeen?: string[];
  phase: CampaignPhase; introStep: number; upgrades: (UpgradeId | null)[]; editingBase: boolean;
  ship: ShipId | null; cargo: (CargoId | null)[]; flightStep: number; flightCheck: number; flightElapsed?: number;
  travel: { leg: number; energy: number; water: number; reactants: number; observations: number };
  base: GameState; suit: { oxygen: number; energy: number; thermal: number; dust: number; shield: boolean; magnets: boolean; antenna: number };
  excursion: Excursion | null; repairs: Record<SiteId, boolean>; playerX: number; targetX: number;
  playerDeck?:number;targetDeck?:number;
  message: string; cause: string; quiz: (number | null)[];
}
export interface Campaign extends Snapshot { checkpoint: Snapshot | null }
export type CampaignAction =
  | { type: 'next-intro' | 'skip-intro' | 'reopen-equipment' | 'confirm-equipment' | 'confirm-ship' | 'launch' | 'advance-flight' | 'land' | 'open-lab' | 'cancel-equipment' | 'return-outside' | 'work' | 'toggle-shield' | 'toggle-magnets' | 'retry' | 'restart' | 'finish-return' | 'avatar-study' }
  | { type: 'equip'; id: UpgradeId; slot: number }
  | { type: 'unequip'; slot: number }
  | { type: 'choose-ship'; ship: ShipId }
  | { type: 'cargo'; cargo: CargoId | null; slot: number }
  | { type: 'shelter'; ids: PackageId[] }
  | { type: 'travel'; mode: 'eco' | 'fast' }
  | { type: 'flight-control'; control: number }
  | { type: 'excursion'; site: SiteId; route: 'long' | 'short' }
  | { type: 'antenna'; angle: number }
  | { type: 'base-action'; action: Action }
  | { type: 'walk'; x: number; deck?:number }
  | { type: 'quiz'; index: number; answer: number };

// Units and multipliers below are adjustable training rules, never NASA measurements.
export const CAMPAIGN_VERSION = 2;
const clamp = (n: number, max = 100) => Math.max(0, Math.min(max, n));
export const has = (s: Snapshot, id: UpgradeId) => s.upgrades.includes(id);
export const walkingSpeed = (s: Snapshot) => 24 * (has(s,'lung')?.8:1);
export function excursionX(s:Snapshot){
  if(!s.excursion)return s.playerX;
  const e=s.excursion;if(e.stage==='work')return 65;
  const fraction=e.distance>0?Math.min(1,e.elapsed/e.distance):1;
  return e.stage==='outbound'?12+fraction*53:(e.startX??65)-fraction*((e.startX??65)-12);
}
export const oxygenCapacity = (s: Snapshot) => has(s, 'lung') ? 140 : 70;
export function freshSuit(s: Snapshot): Snapshot['suit'] {
  return { oxygen: oxygenCapacity(s), energy: 100, thermal: 100, dust: 0, shield: false, magnets: false, antenna: 0 };
}
export function createCampaign(): Campaign {
  return { phase: 'intro', introStep: 0, upgrades: [null, null, null], editingBase: false, ship: null, cargo: [], flightStep: 0, flightCheck: 0,
    travel: { leg: 0, energy: 100, water: 100, reactants: 100, observations: 0 }, base: createInitialState(),
    suit: { oxygen: 70, energy: 100, thermal: 100, dust: 0, shield: false, magnets: false, antenna: 0 },
    excursion: null, repairs: { recycler: false, relay: false, platform: false, crater: false },
    playerX: 12, targetX: 12, message: 'Una llamada llega desde Marte…', cause: '', quiz: [null, null, null], checkpoint: null };
}
function snapshot(s: Campaign): Snapshot { const { checkpoint: _, ...rest } = s; return structuredClone(rest); }
function safe(s: Campaign): Campaign { return { ...s, checkpoint: snapshot(s) }; }
function say(s: Campaign, message: string): Campaign { return { ...s, message }; }
function fail(s: Campaign, cause: string): Campaign { return { ...s, phase: 'failed', cause, message: 'La simulación se ha detenido. Puedes volver a tu punto seguro.' }; }
export function repairDuration(ids: (UpgradeId | null)[], powered: boolean): number {
  return 8 * (ids.includes('armor') ? 2 : 1) * (ids.includes('gloves') && powered ? 0.5 : 1);
}
export function cargoMass(s: Snapshot): number { return s.cargo.reduce((n, c) => n + (c === 'battery' ? 2 : c ? 1 : 0), 0); }
export function arrivalWater(baseWater: number, cargo: (CargoId | null)[]): number {
  return clamp(baseWater + cargo.filter(c => c === 'water').length * 5);
}
export function validCargo(s: Snapshot): boolean {
  return !!s.ship && s.cargo.length === SHIPS[s.ship].slots && s.cargo.every(Boolean) &&
    ['water', 'food', 'battery'].every(c => s.cargo.includes(c as CargoId)) && cargoMass(s) <= SHIPS[s.ship].mass;
}
function changingAllowed(s: Campaign) { return s.phase === 'equipment'; }
export function actCampaign(s: Campaign, a: CampaignAction): Campaign {
  switch (a.type) {
    case 'restart': return createCampaign();
    case 'next-intro':
      if (s.phase !== 'intro') return s;
      return s.introStep >= 3 ? { ...s, phase: 'equipment', message: 'Elige tres mejoras. Cada ventaja tiene un costo.' } : { ...s, introStep: s.introStep + 1 };
    case 'skip-intro': return s.phase === 'intro' ? { ...s, phase: 'equipment' } : s;
    case 'reopen-equipment':
      return s.phase === 'ship' || s.phase === 'shelter' ? { ...s, phase: 'equipment', editingBase: false, message: 'Puedes cambiar tus tres mejoras. Tu nave y tu carga se conservan.' } : s;
    case 'equip': {
      if (!changingAllowed(s) || !UPGRADE_IDS.includes(a.id) || !Number.isInteger(a.slot) || a.slot < 0 || a.slot > 2) return s;
      const upgrades = s.upgrades.map(id => id === a.id ? null : id); upgrades[a.slot] = a.id;
      return { ...s, upgrades, message: 'Mejora colocada. Puedes cambiarla antes de confirmar.' };
    }
    case 'unequip': {
      if (!changingAllowed(s) || a.slot < 0 || a.slot > 2) return s;
      return { ...s, upgrades: s.upgrades.map((x, i) => i === a.slot ? null : x) };
    }
    case 'confirm-equipment': {
      if (s.phase !== 'equipment' || s.upgrades.filter(Boolean).length !== 3 || new Set(s.upgrades).size !== 3) return say(s, 'Completa los tres espacios con mejoras distintas.');
      const suit = s.editingBase ? { ...s.suit, oxygen: clamp(s.suit.oxygen, oxygenCapacity(s)), dust: 0, shield: false, magnets: false, antenna: 0 } : freshSuit(s);
      const next: Campaign = { ...s, phase: s.editingBase ? 'base' : 'ship', editingBase: false, suit, message: s.editingBase ? 'Equipo cambiado y polvo retirado. Recarga oxígeno en Aire, herramientas en Baterías y abrigo en Calor. Punto seguro actualizado.' : '¡Traje listo! Puedes volver a cambiarlo aquí antes de despegar.' };
      return s.editingBase ? safe(next) : next;
    }
    case 'cancel-equipment':
      if (!s.editingBase || !s.checkpoint) return s;
      return { ...s, phase: 'base', editingBase: false, upgrades: [...s.checkpoint.upgrades], message: 'Conservas tu equipo anterior.' };
    case 'choose-ship':
      return s.phase === 'ship' && a.ship in SHIPS ? { ...s, ship: a.ship, cargo: Array(SHIPS[a.ship].slots).fill(null) } : s;
    case 'cargo': {
      if (s.phase !== 'ship' || !s.ship || !Number.isInteger(a.slot) || a.slot < 0 || a.slot >= s.cargo.length || (a.cargo !== null && !['water', 'food', 'battery'].includes(a.cargo))) return s;
      const cargo = [...s.cargo]; cargo[a.slot] = a.cargo; return { ...s, cargo };
    }
    case 'confirm-ship':
      return s.phase === 'ship' && validCargo(s) ? { ...s, phase: 'shelter', message: 'Prepara el refugio: elige dos paquetes diferentes.' } : say(s, 'Llena la carga: al menos agua, alimento y una batería. Revisa el límite de masa.');
    case 'shelter':
      return s.phase === 'shelter' && a.ids.every(id => id in PACKAGES) ? { ...s, base: baseAct(s.base, { type: 'choose-shelter', packageIds: a.ids }) } : s;
    case 'launch':
      return s.phase === 'shelter' && validCargo(s) && isValidShelter(s.base.shelter.chosen) ? safe({ ...s, phase: 'launch', flightStep: 0, message: 'Preparados para despegar. Los tiempos del entrenamiento están abreviados.' }) : s;
    case 'advance-flight':
      if (s.phase !== 'launch') return s;
      return s.flightStep === 2 ? { ...s, phase: 'travel', flightElapsed: 0, playerX: 12, targetX: 12, message: '¡Ya estamos en el espacio! Mira la Tierra por la ventana. Ahora viajan la cápsula y su módulo de servicio.' } : { ...s, flightStep: s.flightStep + 1, flightElapsed: 0 };
    case 'travel': {
      if (s.phase !== 'travel' || s.travel.leg >= 3 || !s.ship) return s;
      if (s.travel.leg === 1 && s.flightCheck !== 3) return say(s, 'Antes de continuar, completa las tres comprobaciones en orden. Puedes leer sin gastar recursos.');
      const travel = { ...s.travel, leg: s.travel.leg + 1, observations: s.travel.observations + (a.mode === 'fast' ? 1 : 0) }; const demand = a.mode === 'fast' ? 48 : 22;
      if (s.ship === 'apollo') {
        travel.reactants = clamp(travel.reactants - (a.mode === 'fast' ? 38 : 24));
        travel.energy = clamp(travel.energy + (s.travel.reactants >= 24 ? 25 : 0) - demand);
        travel.water = clamp(travel.water - 12 + (s.travel.reactants >= 24 ? 5 : 0));
      } else {
        const sunlight = s.travel.leg !== 1;
        travel.energy = clamp(travel.energy + (sunlight ? 28 : 0) - demand);
        travel.water = clamp(travel.water - 12);
      }
      const next = { ...s, travel, message: travel.leg === 3 ? 'Viaje completado. Prepararemos una transferencia a la superficie.' : 'Revisa las reservas antes del siguiente tramo.' };
      return travel.energy <= 0 || travel.reactants <= 0 || travel.water <= 0 ? fail(next, 'Gastaste las reservas del viaje. Reduce el consumo y revisa lo que tu nave puede generar.') : next;
    }
    case 'flight-control':
      if (s.phase !== 'travel' || s.travel.leg !== 1 || s.flightCheck >= 3 || !Number.isInteger(a.control) || a.control < 0 || a.control > 2) return s;
      return { ...s, flightCheck: a.control === s.flightCheck ? s.flightCheck + 1 : 0, message: a.control === s.flightCheck ? 'Comprobación registrada. Sigue el procedimiento indicado.' : 'Revisa el orden: primero identifica, después ajusta y al final comprueba. Puedes intentarlo de nuevo.' };
    case 'land': {
      if (s.phase !== 'travel' || s.travel.leg !== 3 || !s.ship) return s;
      const base = baseAct(s.base, { type: 'start-mission' });
      base.reserves = { air: s.ship === 'apollo' ? 50 : 65, water: arrivalWater(base.reserves.water, s.cargo), thermal: s.ship === 'apollo' ? 50 : 65 };
      base.missionGoals = { recycler: false, relay: false };
      return safe({ ...s, phase: 'base', base, playerDeck:1,targetDeck:1, suit: freshSuit(s), message: 'Base de cuatro pisos: lleva energía al aire, al agua y al calor. Usa la escalera para subir y bajar.' });
    }
    case 'open-lab':
      if (s.phase !== 'base' || s.excursion || s.base.solar.status === 'active' || s.base.inShelter) return say(s, 'Vuelve al interior y espera a que termine la alerta para cambiar el traje.');
      if (Object.values(s.base.reserves).some(n => n < 30)) return say(s, 'Estabiliza primero la base: aire, agua y calor deben estar al menos en 30 para crear un punto seguro en el laboratorio.');
      return { ...safe(s), phase: 'equipment', editingBase: true, message: 'El laboratorio cambia mejoras y retira polvo. Para recargar, quédate junto a Aire, Baterías o Calor.' };
    case 'base-action': {
      if (s.phase !== 'base' || s.excursion || a.action.type === 'restart' || a.action.type === 'choose-shelter' || a.action.type === 'start-mission') return s;
      if (s.base.inShelter && a.action.type !== 'set-shelter-presence') return say(s, 'Durante el refugio no puedes operar estaciones.');
      const base = baseAct(s.base, a.action); return { ...s, base, message:a.action.type==='set-shelter-presence'?(a.action.inside?'Dentro del refugio. Espera a que termine la alerta.':'Ya puedes seguir trabajando en la base.'):s.message };
    }
    case 'avatar-study':
      if ((s.phase !== 'travel' && s.phase !== 'base') || s.excursion || s.base.inShelter) return s;
      return { ...s, base: { ...s.base, avatar: { ...s.base.avatar, interactionDone: true } }, message: 'Comparación AVATAR preparada. El laboratorio de la base completará el informe cuando tenga energía.' };
    case 'walk':
      if(a.deck!==undefined&&(!Number.isInteger(a.deck)||a.deck<0||a.deck>3))return s;
      return ['equipment', 'ship', 'shelter', 'travel', 'base'].includes(s.phase) && !s.excursion && !s.base.inShelter && Number.isFinite(a.x) ? { ...s, targetX: clamp(a.x, 94),...(s.phase==='base'?{targetDeck:a.deck??Math.round(s.playerDeck??1)}:{}) } : s;
    case 'excursion': {
      if (s.phase !== 'base' || s.excursion || s.base.inShelter || s.base.solar.status === 'active' || !(a.site in SITES)) return say(s, 'No puedes salir ahora. Revisa la alerta y el refugio.');
      if (a.site === 'platform' && !has(s, 'boots')) return say(s, 'Esta tarea exige sujeción magnética sobre una placa ferromagnética. Cambia el traje en el laboratorio.');
      if (a.route === 'short' && (!has(s, 'boots') || has(s, 'lung'))) return say(s, has(s, 'lung') ? 'La mochila grande no cabe por el paso estrecho.' : 'El atajo requiere botas magnéticas sobre la estructura metálica.');
      const factor = s.ship === 'apollo' ? 1.2 : 1;
      const distance = (a.route === 'short' ? 9 : SITES[a.site].seconds) * (has(s, 'lung') ? 1.25 : 1) * factor;
      return { ...s, excursion: { site: a.site, stage: 'outbound', elapsed: 0, distance, progress: 0, route: a.route }, suit: { ...s.suit, magnets: false }, message: 'Salida iniciada. Puedes regresar antes de completar la tarea.' };
    }
    case 'return-outside':
      if (s.suit.magnets) return say(s, 'Suelta los imanes de las botas antes de caminar de regreso.');
      return s.excursion && s.excursion.stage !== 'return' ? { ...s, excursion: { ...s.excursion, stage: 'return', elapsed: 0,startX:excursionX(s), distance: s.excursion.stage === 'outbound' ? Math.min(s.excursion.elapsed, s.excursion.distance) : s.excursion.distance }, suit: { ...s.suit, magnets: false }, message: 'Regresando a la esclusa. Aún necesitas reservas para llegar.' } : s;
    case 'toggle-shield': return s.excursion && has(s, 'shield') && s.suit.energy > 0 ? { ...s, suit: { ...s.suit, shield: !s.suit.shield } } : s;
    case 'toggle-magnets': return s.excursion?.stage === 'work' && has(s, 'boots') && s.excursion.site === 'platform' ? { ...s, suit: { ...s.suit, magnets: !s.suit.magnets } } : s;
    case 'antenna': return s.excursion?.stage === 'work' && has(s, 'radio') && Number.isFinite(a.angle) ? { ...s, suit: { ...s.suit, antenna: clamp(a.angle, 180) } } : s;
    case 'work': {
      if (!s.excursion || s.excursion.stage !== 'work') return s;
      if (s.repairs[s.excursion.site]) return say(s, 'La tarea está completa. Regresa a la base.');
      if (s.excursion.site === 'platform' && !s.suit.magnets) return say(s, 'Activa la sujeción magnética antes de trabajar en la plataforma.');
      return { ...s, excursion: { ...s.excursion, progress: Math.max(0.01, s.excursion.progress) }, message: 'Trabajo iniciado. Vigila las reservas y recuerda el camino de regreso.' };
    }
    case 'retry': return s.phase === 'failed' && s.checkpoint ? { ...structuredClone(s.checkpoint), checkpoint: structuredClone(s.checkpoint), message: 'Punto seguro restaurado. Puedes cambiar tu estrategia.' } : s;
    case 'finish-return': return s.phase === 'return' ? { ...s, phase: 'debrief' } : s;
    case 'quiz': {
      if (s.phase !== 'debrief' || a.index < 0 || a.index > 2 || ![0, 1, 2].includes(a.answer)) return s;
      const quiz = [...s.quiz]; quiz[a.index] = a.answer; return { ...s, quiz };
    }
    default: return s;
  }
}

export function workSeconds(s: Snapshot): number {
  if (!s.excursion) return 0;
  const tools = repairDuration(s.upgrades, s.suit.energy > 0);
  const dust = s.excursion.site === 'relay' && !s.suit.shield ? 8 : 0;
  const aligned = has(s, 'radio') && Math.abs(s.suit.antenna - 90) <= 15;
  const link = s.excursion.site === 'relay' ? (aligned ? 3 : 12) : 0;
  return tools + dust + link;
}
export function tickCampaign(s: Campaign, deltaMs: number, direction: -1 | 0 | 1 = 0): Campaign {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return s;
  if (s.phase === 'launch') {
    const elapsed = (s.flightElapsed ?? 0) + Math.min(deltaMs, 250);
    return elapsed >= 3200 ? actCampaign({ ...s, flightElapsed: 0 }, {type:'advance-flight'}) : { ...s, flightElapsed: elapsed };
  }
  if (direction && ['equipment','ship','shelter','travel'].includes(s.phase)) {
    const speed = walkingSpeed(s);
    const playerX = clamp(s.playerX + direction * Math.min(deltaMs, 250) / 1000 * speed, 94);
    s = { ...s, playerX, targetX: playerX };
  }
  if (['equipment', 'ship', 'shelter', 'travel'].includes(s.phase)) {
    const distance = s.targetX - s.playerX;
    if (Math.abs(distance) < .01) return s;
    const step = Math.min(deltaMs, 250) / 1000 * walkingSpeed(s);
    return { ...s, playerX: Math.abs(distance) <= step ? s.targetX : s.playerX + Math.sign(distance) * step };
  }
  if (s.phase !== 'base') return s;
  const dt = Math.min(deltaMs, 250) / 1000;
  let base = baseTick(s.base, Math.min(deltaMs, 250));
  const speed = walkingSpeed(s)/.72;
  let playerDeck=s.playerDeck??1;let targetDeck=s.targetDeck??playerDeck;
  // A restored climb rests on the ladder until input. Reach a floor before
  // allowing a horizontal step, rather than walking through the gap.
  if(direction&&Math.abs(targetDeck-playerDeck)<.001&&Math.abs(playerDeck-Math.round(playerDeck))>.001)targetDeck=Math.round(playerDeck);
  const climbing=Math.abs(targetDeck-playerDeck)>.001;
  const destination=climbing?50:s.targetX;
  const difference = destination - s.playerX;
  let playerX=s.playerX;
  if(!s.base.inShelter&&!s.excursion){
    if(climbing&&Math.abs(difference)<=speed*dt){playerX=50;const step=dt*1.6;playerDeck=Math.abs(targetDeck-playerDeck)<=step?targetDeck:playerDeck+Math.sign(targetDeck-playerDeck)*step;}
    else if(!climbing&&direction)playerX=clamp(playerX+direction*speed*dt,94);
    else playerX=Math.abs(difference)<speed*dt?destination:playerX+Math.sign(difference)*speed*dt;
  }
  let next: Campaign = { ...s, base, playerX,playerDeck,targetDeck,...(!climbing&&direction?{targetX:playerX}:{}) };
  if(base.solar.status!==s.base.solar.status)next.message=base.solar.status==='active'?'¡Alerta de partículas solares! Entra al refugio del piso cuatro.':'La alerta terminó. Puedes salir del refugio.';
  else if(base.failure.status!==s.base.failure.status)next.message=base.failure.status==='active'?'Una batería está averiada. Reorganiza las otras para cuidar aire, agua y calor.':'La batería averiada ya está disponible otra vez.';
  if (base.outcome === 'lost') {
    const explanations = { 'reserve-zero': 'Una reserva de la base llegó a cero. Reparte energía entre aire, agua y calor.', 'solar-unprotected': 'No llegaste al refugio a tiempo. Las mejoras del traje no sustituyen el refugio solar.', timeout: 'Terminó el tiempo de operación sin completar los objetivos. Reorganiza tus prioridades.' };
    return fail(next, explanations[base.lostCause ?? 'timeout']);
  }
  if (s.excursion) {
    let excursion = { ...s.excursion }; const suit = { ...s.suit };
    const difficulty = s.ship === 'apollo' ? 1.2 : 1;
    // Compress only the walking presentation; charge the original route cost.
    const span=excursion.stage==='return'?Math.max(0,(excursion.startX??65)-12):53;
    const routeRate=excursion.stage==='work'?1:span>0?excursion.distance*walkingSpeed(s)/span:0;
    const suitDt=excursion.stage==='work'?dt:Math.min(Math.max(0,excursion.distance-excursion.elapsed),dt*routeRate);
    suit.oxygen = clamp(suit.oxygen - suitDt * difficulty, oxygenCapacity(s));
    suit.thermal = clamp(suit.thermal - suitDt * (has(s, 'armor') ? 0.3 : 1) * difficulty);
    const shielding = suit.shield && suit.energy > 0;
    suit.dust = clamp(suit.dust + suitDt * (shielding ? -2 : 0.7) * difficulty);
    if (shielding) suit.energy = clamp(suit.energy - suitDt * 1.2);
    if (suit.energy <= 0) suit.shield = false;
    if (excursion.stage === 'work' && excursion.progress > 0 && !s.repairs[excursion.site]) {
      if (excursion.site !== 'platform' || suit.magnets) {
        const duration = workSeconds({ ...s, suit });
        excursion.progress = clamp(excursion.progress + dt / duration, 1);
        if (has(s, 'gloves') && suit.energy > 0) suit.energy = clamp(suit.energy - dt * 2);
        if (excursion.progress >= 1) {
          const repairs = { ...s.repairs, [excursion.site]: true };
          base = { ...base, missionGoals: { recycler: repairs.recycler, relay: repairs.relay } };
          next = { ...next, repairs, base, message: 'Tarea completada. Regresa a la base para continuar.' };
        }
      }
    } else if (excursion.stage !== 'work') {
      excursion.elapsed += suitDt;
      if (excursion.elapsed >= excursion.distance) {
        if (excursion.stage === 'return') {
          next = { ...next, excursion: null, suit: { ...suit, shield: false, magnets: false }, message: 'De vuelta en la base. Quédate junto a Aire para oxígeno, Baterías para herramientas o Calor para abrigo. El laboratorio cambia mejoras y limpia polvo.' };
          if (suit.oxygen <= 0 || suit.thermal <= 0 || suit.dust >= 100) return fail(next, 'La salida agotó una reserva del traje antes de entrar en la base. Planea también el regreso.');
          return next;
        }
        excursion = { ...excursion, stage: 'work', elapsed: 0 };
        next.message = 'Llegaste. Prepara tus mejoras y comienza el trabajo.';
      }
    }
    next = { ...next, excursion, suit };
    if (suit.oxygen <= 0) return fail(next, 'Se agotó el oxígeno de la salida. Elige más autonomía o regresa antes: el camino de vuelta también consume.');
    if (suit.thermal <= 0) return fail(next, 'El confort térmico salió del margen del entrenamiento. Acorta la salida o prepara más aislamiento.');
    if (suit.dust >= 100) return fail(next, 'La acumulación de polvo superó el límite del entrenamiento. Usa el sistema de limpieza o regresa antes.');
  }
  // A full idle tick is required: arriving or holding a direction never refills.
  if (!s.excursion && direction === 0 && Math.abs(s.targetX - s.playerX) < .001 &&
      Math.abs((s.targetDeck ?? s.playerDeck ?? 1) - (s.playerDeck ?? 1)) < .001) {
    const service = suitServiceStatus(next);
    const suit = { ...next.suit };
    for (const resource of ['oxygen', 'energy', 'thermal'] as const) {
      if (service[resource].available && service[resource].atStation)
        suit[resource] = clamp(suit[resource] + SUIT_SERVICE_POINTS[resource].perSecond * dt, resource === 'oxygen' ? oxygenCapacity(next) : 100);
    }
    next = { ...next, suit };
  }
  if (base.outcome === 'won' && !next.excursion) return safe({ ...next, phase: 'return', message: '¡Base estabilizada! La tripulación tiene agua, calor y una cosecha. Regresamos a casa.' });
  return next;
}

export function encodeCheckpoint(s: Campaign): string { return JSON.stringify({ version: CAMPAIGN_VERSION, checkpoint: s.checkpoint }); }

// Saved checkpoints are untrusted input. Validate structural fields before allowing a resume.
function sameShape(value: unknown, model: unknown): boolean {
  if (model === null) return value === null;
  if (typeof model === 'number') return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 1e12;
  if (typeof model !== 'object') return typeof value === typeof model;
  if (!value || typeof value !== 'object' || Array.isArray(value) !== Array.isArray(model)) return false;
  return Object.entries(model).every(([key, item]) => sameShape((value as Record<string, unknown>)[key], item));
}
function validSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Snapshot;
  if (!['launch', 'base', 'return'].includes(s.phase) || !s.ship || !['apollo', 'orion'].includes(s.ship)) return false;
  if (!Array.isArray(s.upgrades) || s.upgrades.length !== 3 || !s.upgrades.every(id => id && UPGRADE_IDS.includes(id)) || new Set(s.upgrades).size !== 3) return false;
  const model = snapshot(createCampaign());
  // Fields that legitimately vary from the initial shape are checked explicitly below.
  const { upgrades: _u, ship: _s, cargo: _c, base: _b, ...fixedModel } = model;
  if (!sameShape(s, fixedModel) || s.excursion !== null || s.editingBase) return false;
  if (!Array.isArray(s.cargo) || !s.cargo.every(c => c === null || ['water', 'food', 'battery'].includes(c)) || !validCargo(s)) return false;
  const { stations: _stations, batteries: _batteries, failure: _failure, ...baseModel } = createInitialState();
  if (!s.base || !sameShape(s.base, baseModel) || !s.base.stations || !s.base.batteries || !s.base.failure) return false;
  if (!sameShape(s.base.failure, { status: '', endsAtMs: 0 })) return false;
  if (!['prelaunch', 'base', 'ended'].includes(s.base.phase) || !['playing', 'won', 'lost'].includes(s.base.outcome) || s.base.outcome === 'lost') return false;
  if (s.base.rulesVersion !== RULES_VERSION || s.base.activeMs < 0 || s.base.activeMs > BALANCE.operationMs || s.base.greenhouse.harvests < 0 || !Number.isInteger(s.base.greenhouse.harvests)) return false;
  if (s.phase === 'launch' && (s.base.phase !== 'prelaunch' || s.base.outcome !== 'playing' || s.travel.leg !== 0 || s.base.activeMs !== 0)) return false;
  if (s.phase === 'base' && (s.base.phase !== 'base' || s.base.outcome !== 'playing' || s.travel.leg !== 3)) return false;
  if (s.phase === 'return' && (s.base.phase !== 'ended' || s.base.outcome !== 'won' || s.travel.leg !== 3 || !objectives(s.base).all)) return false;
  if (s.phase !== 'launch' && (!s.base.missionGoals || typeof s.base.missionGoals.recycler !== 'boolean' || typeof s.base.missionGoals.relay !== 'boolean' || s.base.missionGoals.recycler !== s.repairs.recycler || s.base.missionGoals.relay !== s.repairs.relay)) return false;
  if (!isValidShelter(s.base.shelter.chosen) || s.base.shelter.chosen.some(id => !(id in PACKAGES))) return false;
  if (!['pending', 'active', 'resolved'].includes(s.base.solar.status) || !['pending', 'active', 'resolved'].includes(s.base.failure.status)) return false;
  if (s.base.failure.batteryId !== null && !BATTERY_IDS.includes(s.base.failure.batteryId)) return false;
  for (const id of BATTERY_IDS) {
    if (!s.base.batteries[id]) return false;
    const station = s.base.batteries[id].station;
    if (station !== null && (!STATION_IDS.includes(station) || s.base.stations[station].batteryId !== id)) return false;
  }
  for (const id of STATION_IDS) {
    if (!sameShape(s.base.stations[id], { progressMs: 0, energyMs: 0 })) return false;
    if (s.base.stations[id].progressMs < 0 || s.base.stations[id].energyMs < 0 || s.base.stations[id].energyMs > BALANCE.lab.needsMs || s.base.stations[id].progressMs > BALANCE.operationMs) return false;
    const battery = s.base.stations[id].batteryId;
    if (battery !== null && (!BATTERY_IDS.includes(battery) || s.base.batteries[battery].station !== id)) return false;
  }
  const within = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;
  if (s.flightElapsed !== undefined && !within(s.flightElapsed, 0, 3200)) return false;
  if(s.playerDeck!==undefined&&!within(s.playerDeck,0,3))return false;
  if(s.targetDeck!==undefined&&(!within(s.targetDeck,0,3)||!Number.isInteger(s.targetDeck)))return false;
  if (Object.values(s.base.reserves).some(n => !within(n, 0, 100))) return false;
  if (!within(s.suit.energy, 0, 100) || !within(s.suit.oxygen, 0, oxygenCapacity(s)) || !within(s.suit.thermal, 0, 100) || !within(s.suit.dust, 0, 100) || !within(s.suit.antenna, 0, 180)) return false;
  if (!within(s.playerX, 0, 94) || !within(s.targetX, 0, 94) || !Number.isInteger(s.introStep) || !within(s.introStep, 0, 3) || !Number.isInteger(s.flightStep) || !within(s.flightStep, 0, 2)) return false;
  if (!Number.isInteger(s.flightCheck) || !within(s.flightCheck, 0, 3) || (s.phase !== 'launch' && s.flightCheck !== 3)) return false;
  if (!within(s.travel.energy, 0, 100) || !within(s.travel.water, 0, 100) || !within(s.travel.reactants, 0, 100) || !Number.isInteger(s.travel.observations) || !within(s.travel.observations, 0, 3)) return false;
  if (s.base.solar.dwellMs < 0 || s.base.solar.requiredDwellMs <= 0 || s.base.failure.endsAtMs < 0) return false;
  return true;
}
export function decodeCheckpoint(raw: string): Campaign | null {
  try {
    if (raw.length > 50_000) return null;
    const save = JSON.parse(raw);
    if (save.version !== CAMPAIGN_VERSION || !validSnapshot(save.checkpoint)) return null;
    return { ...structuredClone(save.checkpoint), checkpoint: structuredClone(save.checkpoint), message: 'Punto seguro recuperado. La simulación espera tu siguiente decisión.' };
  } catch { return null; }
}
