/**
 * Motor de reglas de Misión Umbral.
 *
 * Funciones puras: reciben estado y devuelven estado nuevo. No tocan el DOM,
 * no usan timers propios y no dependen de Phaser. El tiempo entra como
 * delta explícito, así que pausar o una pestaña oculta se resuelve
 * simplemente no llamando a `tick`.
 */

import { BALANCE, BATTERY_IDS, PACKAGES, RESERVE_IDS, RULES_VERSION, STATION_IDS, shelterDwellMs } from './balance';
import type {
  Action,
  BatteryId,
  GameState,
  PackageId,
  ReserveId,
  StationId,
  StationState
} from './types';

/** Un delta mayor a esto es un salto (pestaña oculta o lag): se descarta. */
export const MAX_TICK_MS = 250;

export function createInitialState(seed = 20261114): GameState {
  const stations = {} as Record<StationId, StationState>;
  for (const stationId of STATION_IDS) {
    stations[stationId] = { batteryId: null, progressMs: 0, energyMs: 0 };
  }

  const batteries = {} as GameState['batteries'];
  for (const batteryId of BATTERY_IDS) {
    batteries[batteryId] = { station: null };
  }

  const reserves = {} as Record<ReserveId, number>;
  for (const reserveId of RESERVE_IDS) {
    reserves[reserveId] = BALANCE.reserveStart;
  }

  return {
    rulesVersion: RULES_VERSION,
    phase: 'prelaunch',
    activeMs: 0,
    reserves,
    stations,
    batteries,
    shelter: { chosen: [], mass: 0, protection: 0 },
    avatar: { interactionDone: false, done: false },
    greenhouse: { harvests: 0 },
    comms: { transmitted: false },
    solar: { status: 'pending', dwellMs: 0, requiredDwellMs: shelterDwellMs(3) },
    failure: { status: 'pending', batteryId: null, endsAtMs: 0 },
    seed,
    inShelter: false,
    outcome: 'playing',
    lostCause: null
  };
}

function clampReserve(value: number): number {
  if (value < BALANCE.reserveMin) return BALANCE.reserveMin;
  if (value > BALANCE.reserveMax) return BALANCE.reserveMax;
  return value;
}

function isStationPowered(state: GameState, stationId: StationId): boolean {
  const station = state.stations[stationId];
  if (station.batteryId === null) return false;
  return state.failure.batteryId !== station.batteryId || state.failure.status !== 'active';
}

/** ¿Hay dos paquetes distintos y la masa entra en el límite? */
export function isValidShelter(packageIds: PackageId[]): boolean {
  if (packageIds.length !== 2) return false;
  if (new Set(packageIds).size !== packageIds.length) return false;
  const mass = packageIds.reduce((total, id) => total + PACKAGES[id].mass, 0);
  return mass <= BALANCE.shelter.maxMass;
}

function shelterFrom(packageIds: PackageId[]) {
  const mass = packageIds.reduce((total, id) => total + PACKAGES[id].mass, 0);
  const protection = packageIds.reduce((total, id) => total + PACKAGES[id].protection, 0);
  return { chosen: [...packageIds], mass, protection };
}

/** PRNG determinista: la avería debe elegirse igual en cada partida. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** La avería pega sobre una batería conectada, elegida de forma reproducible. */
export function pickFailureBattery(state: GameState): BatteryId | null {
  const connected = BATTERY_IDS.filter((batteryId) => state.batteries[batteryId].station !== null);
  if (connected.length === 0) return null;
  const random = mulberry32(state.seed);
  const index = Math.floor(random() * connected.length);
  return connected[Math.min(index, connected.length - 1)];
}

export function objectives(state: GameState) {
  const harvest = state.greenhouse.harvests >= 1;
  const avatar = state.avatar.done;
  const transmitted = state.comms.transmitted;
  const solar = state.solar.status === 'resolved';
  const failure = state.failure.status === 'resolved';
  return {
    harvest,
    avatar,
    transmitted,
    solar,
    failure,
    tasks: harvest && avatar && transmitted && (!state.missionGoals || (state.missionGoals.recycler && state.missionGoals.relay)),
    all: harvest && avatar && transmitted && solar && failure && (!state.missionGoals || (state.missionGoals.recycler && state.missionGoals.relay))
  };
}

function withOutcome(state: GameState): GameState {
  const reservesSafe = RESERVE_IDS.every((reserveId) => state.reserves[reserveId] > 0);

  if (!reservesSafe) {
    return { ...state, outcome: 'lost', lostCause: 'reserve-zero', phase: 'ended' };
  }

  if (objectives(state).all) {
    return { ...state, outcome: 'won', phase: 'ended' };
  }

  if (state.activeMs >= BALANCE.operationMs) {
    return { ...state, outcome: 'lost', lostCause: 'timeout', phase: 'ended' };
  }

  return state;
}

export function dispatch(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'choose-shelter': {
      if (state.phase !== 'prelaunch') return state;
      if (!isValidShelter(action.packageIds)) return state;

      const shelter = shelterFrom(action.packageIds);
      const waterCost = shelter.mass * BALANCE.shelter.waterCostPerMass;

      return {
        ...state,
        shelter,
        solar: { ...state.solar, requiredDwellMs: shelterDwellMs(shelter.protection) },
        reserves: {
          ...state.reserves,
          water: clampReserve(BALANCE.reserveStart - waterCost)
        }
      };
    }

    case 'start-mission': {
      if (state.phase !== 'prelaunch') return state;
      if (state.shelter.chosen.length !== 2) return state;
      return { ...state, phase: 'base' };
    }

    case 'place-battery': {
      if (state.phase !== 'base') return state;
      /** §04 · durante la alerta solar no se cambian baterías. */
      if (state.solar.status === 'active') return state;

      const target = state.stations[action.stationId];
      if (target.batteryId !== null) return state;

      const current = state.batteries[action.batteryId].station;
      const stations = { ...state.stations };

      if (current !== null) {
        stations[current] = { ...stations[current], batteryId: null };
      }
      stations[action.stationId] = { ...stations[action.stationId], batteryId: action.batteryId };

      return {
        ...state,
        stations,
        batteries: { ...state.batteries, [action.batteryId]: { station: action.stationId } }
      };
    }

    case 'remove-battery': {
      if (state.phase !== 'base') return state;
      if (state.solar.status === 'active') return state;

      const current = state.batteries[action.batteryId].station;
      if (current === null) return state;

      return {
        ...state,
        stations: { ...state.stations, [current]: { ...state.stations[current], batteryId: null } },
        batteries: { ...state.batteries, [action.batteryId]: { station: null } }
      };
    }

    case 'avatar-interaction': {
      if (state.phase !== 'base') return state;
      if (state.avatar.interactionDone) return state;
      return { ...state, avatar: { ...state.avatar, interactionDone: true } };
    }

    case 'set-shelter-presence': {
      if (state.phase !== 'base') return state;
      if (state.inShelter === action.inside) return state;
      return { ...state, inShelter: action.inside };
    }

    case 'restart': {
      const fresh = createInitialState(state.seed);
      if (state.shelter.chosen.length === 2) {
        return dispatch(fresh, { type: 'choose-shelter', packageIds: state.shelter.chosen });
      }
      return fresh;
    }

    default:
      return state;
  }
}

/**
 * Avanza el tiempo activo. `deltaMs` sale del loop de Phaser, así que una
 * pestaña oculta no acumula tiempo: el navegador deja de llamar a `update`.
 */
export function tick(state: GameState, deltaMs: number): GameState {
  if (state.phase !== 'base' || state.outcome !== 'playing') return state;
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return state;

  const dt = Math.min(deltaMs, MAX_TICK_MS) / 1000;
  const activeMs = state.activeMs + Math.min(deltaMs, MAX_TICK_MS);
  const seconds = Math.min(deltaMs, MAX_TICK_MS) / 1000;

  const stations = { ...state.stations };
  const reserves = { ...state.reserves };

  const powered = {} as Record<StationId, boolean>;
  for (const stationId of STATION_IDS) {
    powered[stationId] = isStationPowered(state, stationId);
  }

  /** §03 · soporte vital: +2 con batería, −3 sin ella, cada 10 s activos. */
  for (const reserveId of RESERVE_IDS) {
    const rate = powered[reserveId]
      ? BALANCE.supportPerSecondPowered
      : BALANCE.supportPerSecondUnpowered;
    reserves[reserveId] = clampReserve(reserves[reserveId] + rate * seconds);
  }

  /** §03 · el invernadero consume agua mientras está encendido. */
  if (powered.greenhouse) {
    reserves.water = clampReserve(reserves.water - BALANCE.greenhouse.waterPerSecond * seconds);
  }

  const avatar = { ...state.avatar };
  const greenhouse = { ...state.greenhouse };
  const comms = { ...state.comms };

  /** §03 · invernadero: 30 s con energía completan una cosecha. */
  if (powered.greenhouse) {
    const progressMs = stations.greenhouse.progressMs + seconds * 1000;
    if (progressMs >= BALANCE.greenhouse.needsMs) {
      greenhouse.harvests += Math.floor(progressMs / BALANCE.greenhouse.needsMs);
      stations.greenhouse = {
        ...stations.greenhouse,
        progressMs: progressMs % BALANCE.greenhouse.needsMs
      };
    } else {
      stations.greenhouse = { ...stations.greenhouse, progressMs };
    }
  }

  /** §03 · laboratorio AVATAR: interacción + 20 s de energía. */
  if (powered.lab && !avatar.done) {
    const energyMs = Math.min(stations.lab.energyMs + seconds * 1000, BALANCE.lab.needsMs);
    stations.lab = { ...stations.lab, energyMs };
    if (avatar.interactionDone && energyMs >= BALANCE.lab.needsMs) {
      avatar.done = true;
    }
  }

  /** §03 · comunicaciones: requieren AVATAR resuelto. */
  if (powered.comms && avatar.done && !comms.transmitted) {
    const progressMs = Math.min(
      stations.comms.progressMs + seconds * 1000,
      BALANCE.comms.needsMs
    );
    stations.comms = { ...stations.comms, progressMs };
    if (progressMs >= BALANCE.comms.needsMs) {
      comms.transmitted = true;
    }
  }

  let solar = state.solar;
  let failure = state.failure;

  /** §04 · Evento A: alerta a los 90 s con 20 s para entrar al refugio. */
  if (solar.status === 'pending' && activeMs >= BALANCE.solar.alarmAtMs) {
    solar = { ...solar, status: 'active' };
  }

  if (solar.status === 'active') {
    if (state.inShelter) {
      solar = { ...solar, dwellMs: solar.dwellMs + seconds * 1000 };
      if (solar.dwellMs >= solar.requiredDwellMs) {
        solar = { ...solar, status: 'resolved' };
      }
    } else if (activeMs >= BALANCE.solar.alarmAtMs + BALANCE.solar.entryWindowMs) {
      return { ...state, outcome: 'lost', lostCause: 'solar-unprotected', phase: 'ended' };
    }
  }

  /** §04 · Evento B: una batería conectada falla 45 s. */
  if (failure.status === 'pending' && activeMs >= BALANCE.failure.atMs) {
    const batteryId = pickFailureBattery(state);
    failure =
      batteryId === null
        ? { ...failure, status: 'resolved' }
        : {
            status: 'active',
            batteryId,
            endsAtMs: activeMs + BALANCE.failure.durationMs
          };
  }

  if (failure.status === 'active' && activeMs >= failure.endsAtMs) {
    failure = { ...failure, status: 'resolved' };
  }

  const next: GameState = {
    ...state,
    activeMs,
    reserves,
    stations,
    avatar,
    greenhouse,
    comms,
    solar,
    failure
  };

  return withOutcome(next);
}
