import { describe, expect, it } from 'vitest';

import { BALANCE, shelterDwellMs } from './balance';
import { createInitialState, dispatch, objectives, tick } from './engine';
import type { Action, BatteryId, GameState, PackageId, StationId } from './types';

/** Estado listo para operar la base, con el refugio ya elegido. */
function base(shelter: PackageId[] = ['light', 'supplies']): GameState {
  const chosen = dispatch(createInitialState(), { type: 'choose-shelter', packageIds: shelter });
  return dispatch(chosen, { type: 'start-mission' });
}

function act(state: GameState, action: Action): GameState {
  return dispatch(state, action);
}

const power = (state: GameState, batteryId: BatteryId, stationId: StationId) =>
  act(state, { type: 'place-battery', batteryId, stationId });

/** Avanza en pasos de 100 ms, como haría el loop del juego. */
function advance(state: GameState, ms: number, stepMs = 100): GameState {
  let next = state;
  for (let elapsed = 0; elapsed < ms; elapsed += stepMs) {
    next = tick(next, Math.min(stepMs, ms - elapsed));
  }
  return next;
}

/** Las cuatro baterías repartidas: tres de soporte y el laboratorio. */
function liftoffPlan(state: GameState): GameState {
  let next = power(state, 'b1', 'air');
  next = power(next, 'b2', 'water');
  next = power(next, 'b3', 'thermal');
  return power(next, 'b4', 'lab');
}

describe('refugio y reservas iniciales', () => {
  it('las tres reservas comienzan en 60 y el agua paga la masa del refugio', () => {
    const state = base(['light', 'supplies']);

    expect(state.reserves.air).toBe(60);
    expect(state.reserves.thermal).toBe(60);
    expect(state.reserves.water).toBe(51);
  });

  it('rechaza dos paquetes iguales, tres paquetes o masa sobre el límite', () => {
    const initial = createInitialState();

    expect(act(initial, { type: 'choose-shelter', packageIds: ['light', 'light'] })).toBe(initial);
    expect(
      act(initial, { type: 'choose-shelter', packageIds: ['light', 'supplies', 'reinforced'] })
    ).toBe(initial);

    const chosen = act(initial, { type: 'choose-shelter', packageIds: ['light', 'supplies'] });
    expect(chosen.shelter.mass).toBe(3);
    expect(chosen.shelter.mass).toBeLessThanOrEqual(BALANCE.shelter.maxMass);
  });

  it('cada protección obliga a distinto tiempo de refugio', () => {
    expect(base(['light', 'supplies']).shelter.protection).toBe(3);
    expect(base(['light', 'reinforced']).shelter.protection).toBe(4);
    expect(base(['supplies', 'reinforced']).shelter.protection).toBe(5);
    expect(base(['supplies', 'reinforced']).shelter.chosen).toHaveLength(2);

    expect(shelterDwellMs(3)).toBe(35_000);
    expect(shelterDwellMs(4)).toBe(25_000);
    expect(shelterDwellMs(5)).toBe(20_000);
  });
});

describe('soporte vital', () => {
  it('una estación alimentada recupera 2 por cada 10 s', () => {
    const state = advance(power(base(), 'b1', 'air'), 10_000);

    expect(state.reserves.air).toBeCloseTo(62, 5);
  });

  it('una estación sin batería pierde 3 por cada 10 s', () => {
    const state = advance(base(), 10_000);

    expect(state.reserves.air).toBeCloseTo(57, 5);
    expect(state.reserves.thermal).toBeCloseTo(57, 5);
  });

  it('las reservas nunca salen del rango 0–100', () => {
    let high = base(['supplies', 'reinforced']);
    high = { ...high, reserves: { air: 99.5, water: 99.5, thermal: 99.5 } };
    high = advance(power(power(power(high, 'b1', 'air'), 'b2', 'water'), 'b3', 'thermal'), 10_000);

    expect(high.reserves.air).toBeLessThanOrEqual(100);
    expect(high.reserves.water).toBeLessThanOrEqual(100);
    expect(high.reserves.thermal).toBeLessThanOrEqual(100);
    expect(high.reserves.air).toBe(100);
  });

  it('quitar la batería detiene la recuperación de esa reserva', () => {
    const powered = power(base(), 'b1', 'air');
    const withoutBattery = act(powered, { type: 'remove-battery', batteryId: 'b1' });
    const state = advance(withoutBattery, 10_000);

    expect(withoutBattery.reserves.air).toBe(60);
    expect(state.reserves.air).toBeCloseTo(57, 5);
  });
});

describe('baterías y estaciones', () => {
  it('una estación admite una sola batería y las cuatro nunca se duplican', () => {
    let state = power(base(), 'b1', 'air');
    state = power(state, 'b2', 'air');

    expect(state.stations.air.batteryId).toBe('b1');

    const placed = liftoffPlan(base());
    const connected = Object.values(placed.batteries).filter((battery) => battery.station !== null);
    expect(Object.keys(placed.batteries)).toHaveLength(4);
    expect(connected).toHaveLength(4);
    expect(new Set(connected.map((battery) => battery.station)).size).toBe(4);
  });
});

describe('tareas de la base', () => {
  it('el invernadero completa una cosecha a los 30 s con energía y consume 2 de agua por 10 s', () => {
    const state = power(base(), 'b4', 'greenhouse');

    const after10 = advance(state, 10_000);
    expect(after10.greenhouse.harvests).toBe(0);
    expect(after10.reserves.water).toBeCloseTo(51 - 2 - 3, 5);

    const after30 = advance(state, 30_000);
    expect(after30.greenhouse.harvests).toBe(1);
  });

  it('el laboratorio AVATAR necesita la interacción y 20 s de energía', () => {
    const withoutInteraction = advance(power(base(), 'b4', 'lab'), 20_000);
    expect(withoutInteraction.avatar.done).toBe(false);

    const withInteraction = advance(act(power(base(), 'b4', 'lab'), { type: 'avatar-interaction' }), 20_000);
    expect(withInteraction.avatar.done).toBe(true);
  });

  it('comunicaciones requiere AVATAR y 20 s de energía', () => {
    const withoutAvatar = advance(power(base(), 'b4', 'comms'), 25_000);
    expect(withoutAvatar.comms.transmitted).toBe(false);

    let ready = act(power(base(), 'b4', 'lab'), { type: 'avatar-interaction' });
    ready = advance(ready, 20_000);
    ready = advance(power(ready, 'b4', 'comms'), 20_000);

    expect(ready.avatar.done).toBe(true);
    expect(ready.comms.transmitted).toBe(true);
  });
});

describe('fin de partida', () => {
  it('una reserva en cero detiene la simulación y explica la causa', () => {
    const almostDry: GameState = {
      ...base(['supplies', 'reinforced']),
      reserves: { air: 0.2, water: 45, thermal: 60 }
    };
    const state = advance(almostDry, 1_000);

    expect(state.outcome).toBe('lost');
    expect(state.lostCause).toBe('reserve-zero');
    expect(state.reserves.air).toBe(0);
  });

  it('no gana antes de superar las dos emergencias', () => {
    let state = liftoffPlan(base());
    state = act(state, { type: 'avatar-interaction' });
    state = advance(state, 20_000);
    state = advance(power(state, 'b4', 'comms'), 20_000);
    state = advance(power(state, 'b4', 'greenhouse'), 30_000);

    expect(objectives(state).tasks).toBe(true);
    expect(state.solar.status).toBe('pending');
    expect(state.failure.status).toBe('pending');
    expect(state.outcome).toBe('playing');
  });

  it('la operación termina a los 300 s y solo se gana con todo completo', () => {
    let state = power(power(power(base(), 'b1', 'air'), 'b2', 'water'), 'b3', 'thermal');

    while (state.solar.status !== 'active' && state.outcome === 'playing') {
      state = tick(state, 100);
    }
    state = act(state, { type: 'set-shelter-presence', inside: true });
    while (state.solar.status === 'active' && state.outcome === 'playing') {
      state = tick(state, 100);
    }
    expect(state.solar.status).toBe('resolved');
    expect(state.comms.transmitted).toBe(false);

    while (state.outcome === 'playing') {
      state = tick(state, 100);
    }

    expect(state.activeMs).toBe(BALANCE.operationMs);
    expect(state.outcome).toBe('lost');
    expect(state.lostCause).toBe('timeout');
  });
});

describe('emergencias', () => {
  it('durante la alerta solar no se mueven baterías', () => {
    const state = advance(liftoffPlan(base()), BALANCE.solar.alarmAtMs);
    expect(state.solar.status).toBe('active');

    expect(act(state, { type: 'place-battery', batteryId: 'b4', stationId: 'comms' })).toBe(state);
    expect(act(state, { type: 'remove-battery', batteryId: 'b1' })).toBe(state);
  });

  it('la alerta solar exige estar en el refugio dentro de 20 s', () => {
    let state = advance(liftoffPlan(base()), BALANCE.solar.alarmAtMs);
    state = advance(state, BALANCE.solar.entryWindowMs + 200);

    expect(state.outcome).toBe('lost');
    expect(state.lostCause).toBe('solar-unprotected');
  });

  it('refugiarse el tiempo que da la protección resuelve la alerta', () => {
    let state = advance(liftoffPlan(base()), BALANCE.solar.alarmAtMs);
    state = act(state, { type: 'set-shelter-presence', inside: true });
    state = advance(state, 35_000);

    expect(state.solar.status).toBe('resolved');
    expect(state.inShelter).toBe(true);
    expect(state.outcome).toBe('playing');
  });

  it('la avería de batería es reproducible y libera la batería al terminar', () => {
    const withoutSolar = (state: GameState): GameState => ({
      ...state,
      solar: {
        status: 'resolved',
        dwellMs: shelterDwellMs(state.shelter.protection),
        requiredDwellMs: shelterDwellMs(state.shelter.protection)
      }
    });

    const first = advance(withoutSolar(liftoffPlan(base())), BALANCE.failure.atMs);
    const second = advance(withoutSolar(liftoffPlan(base())), BALANCE.failure.atMs);

    expect(first.failure.status).toBe('active');
    expect(first.failure.batteryId).toBe(second.failure.batteryId);
    expect(first.failure.batteryId).not.toBeNull();

    const station = first.batteries[first.failure.batteryId!].station;
    expect(station).not.toBeNull();
    expect(first.stations[station!].batteryId).toBe(first.failure.batteryId);

    const after = advance(first, BALANCE.failure.durationMs + 100);
    expect(after.failure.status).toBe('resolved');
  });
});

describe('partida completa', () => {
  it('existe una estrategia ganadora sencilla sin exponer la tripulación', () => {
    let state = liftoffPlan(base(['light', 'supplies']));
    state = act(state, { type: 'avatar-interaction' });

    state = advance(state, 20_000);
    expect(state.avatar.done).toBe(true);

    state = advance(power(state, 'b4', 'comms'), 20_000);
    expect(state.comms.transmitted).toBe(true);

    state = advance(power(state, 'b4', 'greenhouse'), 30_000);
    expect(state.greenhouse.harvests).toBe(1);

    while (state.solar.status !== 'active' && state.outcome === 'playing') {
      state = tick(state, 100);
    }
    state = act(state, { type: 'set-shelter-presence', inside: true });
    while (state.solar.status === 'active' && state.outcome === 'playing') {
      state = tick(state, 100);
    }
    expect(state.solar.status).toBe('resolved');

    while (state.outcome === 'playing') {
      state = tick(state, 100);
    }

    expect(state.outcome).toBe('won');
    expect(state.activeMs).toBeLessThanOrEqual(BALANCE.operationMs);
    expect(Object.values(state.reserves).every((reserve) => reserve > 0)).toBe(true);
  });
});
