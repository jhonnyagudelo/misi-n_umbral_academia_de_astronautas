import { describe, expect, it } from 'vitest';
import { actCampaign as act, createCampaign, tickCampaign as tick, type Campaign } from './campaign';

function depleted(): Campaign {
  const initial = createCampaign();
  return { ...initial, phase: 'base', ship: 'orion', upgrades: ['lung', 'armor', 'gloves'],
    playerX: 24, targetX: 24, playerDeck: 2, targetDeck: 2,
    base: { ...initial.base, phase: 'base' },
    suit: { ...initial.suit, oxygen: 10, energy: 10, thermal: 10 } };
}

function powered() {
  let s = depleted();
  s = act(s, { type: 'base-action', action: { type: 'place-battery', batteryId: 'b1', stationId: 'air' } });
  return act(s, { type: 'base-action', action: { type: 'place-battery', batteryId: 'b2', stationId: 'thermal' } });
}

describe('recarga física de las reservas del traje', () => {
  it('recupera aire en su piso con batería funcional y conserva las otras reservas', () => {
    const s = powered();
    const next = tick(s, 250);
    expect(next.suit.oxygen).toBeCloseTo(17);
    expect(next.suit.energy).toBe(10);
    expect(next.suit.thermal).toBe(10);
    expect(s.suit.oxygen).toBe(10);
  });

  it('recupera abrigo en Calor y energía en el estante con una batería libre', () => {
    const s = powered();
    const warm = tick({ ...s, playerX: 76, targetX: 76, playerDeck: 1, targetDeck: 1 }, 200);
    expect(warm.suit.thermal).toBe(15);
    expect(warm.suit.oxygen).toBe(10);
    const energy = tick({ ...s, playerDeck: 1, targetDeck: 1 }, 200);
    expect(energy.suit.energy).toBe(15);
    expect(energy.suit.thermal).toBe(10);
  });

  it.each([
    ['lejos', (s: Campaign) => ({ ...s, playerX: 31, targetX: 31 })],
    ['en otro piso', (s: Campaign) => ({ ...s, playerDeck: 3, targetDeck: 3 })],
    ['en la escalera', (s: Campaign) => ({ ...s, playerDeck: 1.99, targetDeck: 2 })],
    ['caminando a un destino', (s: Campaign) => ({ ...s, targetX: 25 })],
    ['en alerta', (s: Campaign) => ({ ...s, base: { ...s.base, solar: { ...s.base.solar, status: 'active' as const } } })],
    ['dentro del refugio', (s: Campaign) => ({ ...s, base: { ...s.base, inShelter: true } })],
    ['fuera', (s: Campaign) => act(s, { type: 'excursion', site: 'recycler', route: 'long' })],
    ['sin batería en Aire', (s: Campaign) => act(s, { type: 'base-action', action: { type: 'remove-battery', batteryId: 'b1' } })],
    ['con batería averiada', (s: Campaign) => ({ ...s, base: { ...s.base, failure: { status: 'active' as const, batteryId: 'b1' as const, endsAtMs: 225000 } } })],
  ])('no recupera oxígeno %s', (_label, change) => {
    const s = change(powered());
    expect(tick(s, 100).suit.oxygen).toBeLessThanOrEqual(10);
  });

  it('no recupera oxígeno mientras se mantiene una dirección ni en el tick de llegada', () => {
    const s = powered();
    expect(tick(s, 100, 1).suit.oxygen).toBe(10);
    expect(tick({ ...s, playerX: 23, targetX: 24 }, 100).suit.oxygen).toBe(10);
  });

  it('no recarga herramientas si todas las baterías están asignadas o solo queda una averiada libre', () => {
    let s = powered();
    s = act(s, { type: 'base-action', action: { type: 'place-battery', batteryId: 'b3', stationId: 'water' } });
    s = act(s, { type: 'base-action', action: { type: 'place-battery', batteryId: 'b4', stationId: 'lab' } });
    s = { ...s, playerDeck: 1, targetDeck: 1 };
    expect(tick(s, 100).suit.energy).toBe(10);
    s = act(s, { type: 'base-action', action: { type: 'remove-battery', batteryId: 'b4' } });
    s = { ...s, base: { ...s.base, failure: { status: 'active', batteryId: 'b4', endsAtMs: 225000 } } };
    expect(tick(s, 100).suit.energy).toBe(10);
  });

  it('respeta la capacidad del traje y el mismo límite temporal del reloj', () => {
    let s = powered();
    for (let i = 0; i < 20; i++) s = tick(s, 250);
    expect(s.suit.oxygen).toBe(140);
    expect(s.base.activeMs).toBe(5000);
    const limited = tick(powered(), 60000);
    expect(limited.suit.oxygen).toBe(17);
    expect(limited.base.activeMs).toBe(250);
  });

  it('el mantenimiento limpia y cambia mejoras sin rellenar reservas, y conserva el punto seguro', () => {
    let s = powered();
    s = { ...s, suit: { ...s.suit, oxygen: 40, energy: 27, thermal: 38, dust: 63, shield: true, magnets: true } };
    s = act(s, { type: 'open-lab' });
    s = act(s, { type: 'equip', id: 'radio', slot: 0 });
    s = act(s, { type: 'confirm-equipment' });
    expect(s.suit).toMatchObject({ oxygen: 40, energy: 27, thermal: 38, dust: 0, shield: false, magnets: false });
    expect(s.checkpoint?.suit).toEqual(s.suit);
    s = act(s, { type: 'open-lab' });
    s = act(s, { type: 'equip', id: 'lung', slot: 0 });
    s = act(s, { type: 'confirm-equipment' });
    expect(s.suit.oxygen).toBe(40);
  });

  it('retirar la mochila grande limita oxígeno a la nueva capacidad sin rellenar', () => {
    let s = powered();
    s = { ...s, suit: { ...s.suit, oxygen: 112 } };
    s = act(s, { type: 'open-lab' });
    s = act(s, { type: 'equip', id: 'radio', slot: 0 });
    s = act(s, { type: 'confirm-equipment' });
    expect(s.suit.oxygen).toBe(70);
  });
});
