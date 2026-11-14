import { describe, expect, it } from 'vitest';
import { createCampaign, actCampaign as act, tickCampaign as tick, repairDuration, encodeCheckpoint, decodeCheckpoint } from './campaign';
import type { Campaign, UpgradeId } from './campaign';

function equipped(ids: UpgradeId[] = ['lung', 'armor', 'gloves']) {
  let s = act(createCampaign(), { type: 'skip-intro' });
  ids.forEach((id, slot) => { s = act(s, { type: 'equip', id, slot }); });
  return s;
}
function launched(ship: 'apollo' | 'orion' = 'orion', ids?: UpgradeId[]) {
  let s = act(equipped(ids), { type: 'confirm-equipment' });
  s = act(s, { type: 'choose-ship', ship });
  ['water', 'food', 'battery', 'water', ...(ship === 'orion' ? ['food', 'water'] : [])].forEach((cargo, slot) => {
    s = act(s, { type: 'cargo', cargo: cargo as 'water' | 'food' | 'battery', slot });
  });
  s = act(s, { type: 'confirm-ship' });
  s = act(s, { type: 'shelter', ids: ['light', 'supplies'] });
  s = act(s, { type: 'launch' });
  return s;
}
function arrived(ship: 'apollo' | 'orion' = 'orion', ids?: UpgradeId[]) {
  let s = launched(ship, ids);
  for (let i = 0; i < 3; i++) s = act(s, { type: 'advance-flight' });
  for (let i = 0; i < 3; i++) {
    if (s.travel.leg === 1) for (let control = 0; control < 3; control++) s = act(s, { type: 'flight-control', control });
    s = act(s, { type: 'travel', mode: 'eco' });
  }
  return act(s, { type: 'land' });
}
function advance(s: Campaign, ms: number) {
  for (let i = 0; i < ms / 100; i++) s = tick(s, 100);
  return s;
}

describe('preparación de la campaña', () => {
  it('permite caminar en el hangar sin gastar reservas ni adelantar la operación', () => {
    let s = act(createCampaign(), { type: 'skip-intro' });
    s = act(s, { type: 'walk', x: 80 });
    const next = tick(s, 250);
    expect(next.playerX).toBeGreaterThan(s.playerX);
    expect(next.base.activeMs).toBe(0);
    expect(next.base.reserves).toEqual(s.base.reserves);
  });
  it('exige tres mejoras y no duplica ni permite una cuarta', () => {
    let s = act(createCampaign(), { type: 'skip-intro' });
    expect(act(s, { type: 'confirm-equipment' }).phase).toBe('equipment');
    s = act(s, { type: 'equip', id: 'lung', slot: 0 });
    s = act(s, { type: 'equip', id: 'lung', slot: 1 });
    expect(s.upgrades.filter(x => x === 'lung')).toHaveLength(1);
    s = act(s, { type: 'equip', id: 'armor', slot: 0 });
    s = act(s, { type: 'equip', id: 'gloves', slot: 2 });
    expect(act(s, { type: 'equip', id: 'radio', slot: 3 }).upgrades).toEqual(s.upgrades);
    expect(act(s, { type: 'confirm-equipment' }).phase).toBe('ship');
  });
  it('rechaza selecciones y ranuras inválidas sin romper el juego', () => {
    const s = equipped();
    expect(act(s, { type: 'equip', id: 'invented' as UpgradeId, slot: 0 }).upgrades).toEqual(s.upgrades);
    expect(act(s, { type: 'equip', id: 'radio', slot: -1 }).upgrades).toEqual(s.upgrades);
  });
  it('permite cambiar mejoras ya aceptadas antes del despegue conservando nave, carga y refugio', () => {
    const prepared = launched();
    for (const phase of ['ship','shelter'] as const) {
      const before = {...prepared, phase, checkpoint:null};
      let s = act(before, {type:'reopen-equipment'});
      expect(s.phase).toBe('equipment'); expect(s.editingBase).toBe(false);
      expect(s.upgrades).toEqual(['lung','armor','gloves']);
      s = act(s, {type:'equip',id:'radio',slot:0});
      s = act(s, {type:'confirm-equipment'});
      expect(s.phase).toBe('ship'); expect(s.upgrades).toEqual(['radio','armor','gloves']);
      expect(s.ship).toBe(before.ship); expect(s.cargo).toEqual(before.cargo);
      expect(s.base).toEqual(before.base); expect(s.checkpoint).toBeNull();
      expect(s.suit.oxygen).toBe(70);
    }
  });
  it('al revisar el traje exige confirmar tres mejoras y no permite cambiarlo durante el vuelo', () => {
    let s = act(act(equipped(),{type:'confirm-equipment'}),{type:'reopen-equipment'});
    s = act(s,{type:'equip',id:'armor',slot:0});
    expect(s.upgrades.filter(Boolean)).toHaveLength(2);
    expect(act(s,{type:'confirm-equipment'}).phase).toBe('equipment');
    expect(act(s,{type:'launch'}).phase).toBe('equipment');
    const launch = launched(); expect(act(launch,{type:'reopen-equipment'})).toBe(launch);
    const travel = act(act(act(launch,{type:'advance-flight'}),{type:'advance-flight'}),{type:'advance-flight'});
    expect(act(travel,{type:'reopen-equipment'})).toBe(travel);
    const base = arrived(); expect(act(base,{type:'reopen-equipment'})).toBe(base);
  });
  it('conserva refugio y diferencia nave normal y difícil', () => {
    const easy = arrived('orion'); const hard = arrived('apollo');
    expect(easy.phase).toBe('base');
    expect(easy.base.shelter.chosen).toEqual(['light', 'supplies']);
    expect(easy.cargo).toHaveLength(6); expect(hard.cargo).toHaveLength(4);
    expect(hard.base.reserves.air).toBeLessThan(easy.base.reserves.air);
    expect(hard.travel.reactants).toBeLessThan(100);
    expect(easy.travel.water).toBeLessThan(100);
  });
  it('no permite despegar sin carga y refugio válidos', () => {
    const s = act(act(equipped(), { type: 'confirm-equipment' }), { type: 'choose-ship', ship: 'apollo' });
    expect(act(s, { type: 'confirm-ship' }).phase).toBe('ship');
    expect(act(createCampaign(), { type: 'launch' }).phase).toBe('intro');
  });
  it('no altera reservas ni reloj mientras se leen preparación y viaje', () => {
    const s = equipped(); expect(tick(s, 250)).toBe(s);
    const flight = launched(); const animated = tick(flight, 250);
    expect(animated.base.activeMs).toBe(0); expect(animated.base.reserves).toEqual(flight.base.reserves);
  });
  it('conserva la actividad AVATAR hecha en viaje y espera energía de laboratorio', () => {
    let s = launched(); for (let i = 0; i < 3; i++) s = act(s, { type: 'advance-flight' });
    s = act(s, { type: 'avatar-study' });
    expect(s.base.avatar.interactionDone).toBe(true); expect(s.base.avatar.done).toBe(false);
    for (let i = 0; i < 3; i++) {
      if (s.travel.leg === 1) for (let control = 0; control < 3; control++) s = act(s, { type: 'flight-control', control });
      s = act(s, { type: 'travel', mode: 'eco' });
    }
    s = act(s, { type: 'land' });
    expect(s.base.avatar.interactionDone).toBe(true); expect(s.base.avatar.done).toBe(false);
    s = act(s, { type: 'base-action', action: { type: 'place-battery', batteryId: 'b4', stationId: 'lab' } });
    s = advance(s, 20100); expect(s.base.avatar.done).toBe(true);
  });
  it('exige comprobar tres controles en orden antes del segundo tramo sin castigar la lectura', () => {
    let s = launched(); for (let i = 0; i < 3; i++) s = act(s, { type: 'advance-flight' });
    s = act(s, { type: 'travel', mode: 'eco' });
    expect(act(s, { type: 'travel', mode: 'eco' }).travel.leg).toBe(1);
    const wrong = act(s, { type: 'flight-control', control: 2 }); expect(wrong.flightCheck).toBe(0);
    for (let control = 0; control < 3; control++) s = act(s, { type: 'flight-control', control });
    expect(s.flightCheck).toBe(3);
    expect(act(s, { type: 'travel', mode: 'eco' }).travel.leg).toBe(2);
  });
});

describe('mejoras y consecuencias', () => {
  it('combina armadura y asistencia sin regalar reparación instantánea', () => {
    expect(repairDuration(['armor'], false)).toBeGreaterThan(repairDuration([], false));
    expect(repairDuration(['gloves'], true)).toBeLessThan(repairDuration([], true));
    expect(repairDuration(['armor', 'gloves'], false)).toBe(repairDuration(['armor'], false));
    expect(repairDuration(['armor', 'gloves'], true)).toBe(repairDuration([], true));
  });
  it('la mochila grande impide atajo y las botas necesitan metal', () => {
    const s = arrived('orion', ['lung', 'boots', 'radio']);
    expect(act(s, { type: 'excursion', site: 'crater', route: 'short' }).excursion).toBeNull();
    const plain = arrived('orion', ['armor', 'radio', 'gloves']);
    expect(act(plain, { type: 'excursion', site: 'platform', route: 'short' }).excursion).toBeNull();
  });
  it('el escudo retira polvo pero consume energía y no protege de radiación', () => {
    let s = arrived('orion', ['shield', 'gloves', 'radio']);
    s = act(s, { type: 'excursion', site: 'recycler', route: 'long' });
    s = act(s, { type: 'toggle-shield' });
    const after = advance(s, 5000);
    expect(after.suit.energy).toBeLessThan(s.suit.energy);
    expect(after.suit.dust).toBeLessThanOrEqual(s.suit.dust);
    expect(after.base.inShelter).toBe(false);
  });
  it('agotar oxígeno causa fracaso y reintentar restaura el punto seguro completo', () => {
    const safe = arrived();
    const outside = act(safe, { type: 'excursion', site: 'crater', route: 'long' });
    const lost = advance({ ...outside, suit: { ...outside.suit, oxygen: 0.1 } }, 300);
    expect(lost.phase).toBe('failed');
    const retried = act(lost, { type: 'retry' });
    expect(retried.phase).toBe('base');
    expect(retried.suit.oxygen).toBe(safe.suit.oxygen);
    expect(retried.base.activeMs).toBe(safe.base.activeMs);
    expect(retried.upgrades).toEqual(safe.upgrades);
    expect(retried.excursion).toBeNull();
  });
  it('permite cambiar equipo en el laboratorio pero nunca fuera ni durante una alerta', () => {
    let s = arrived();
    s = act(s, { type: 'open-lab' }); expect(s.phase).toBe('equipment');
    s = act(s, { type: 'equip', id: 'radio', slot: 0 });
    s = act(s, { type: 'confirm-equipment' }); expect(s.phase).toBe('base'); expect(s.upgrades[0]).toBe('radio');
    const outside = act(s, { type: 'excursion', site: 'recycler', route: 'long' });
    expect(act(outside, { type: 'open-lab' }).phase).toBe('base');
    const alarm = { ...s, base: { ...s.base, solar: { ...s.base.solar, status: 'active' as const } } };
    expect(act(alarm, { type: 'open-lab' }).phase).toBe('base');
    const critical = { ...s, base: { ...s.base, reserves: { ...s.base.reserves, air: 3 } } };
    expect(act(critical, { type: 'open-lab' }).checkpoint).toBe(critical.checkpoint);
  });
  it('ignora saltos de reloj no finitos y congela una partida terminada', () => {
    const s = arrived(); expect(tick(s, NaN)).toBe(s); expect(tick(s, -1)).toBe(s);
    const ended = { ...s, phase: 'failed' as const }; expect(tick(ended, 100)).toBe(ended);
  });
  it('exige soltar los imanes antes de caminar de regreso', () => {
    let s = arrived('orion', ['boots', 'armor', 'gloves']);
    s = act(s, { type: 'excursion', site: 'platform', route: 'long' });
    s = advance(s, 16000); s = act(s, { type: 'toggle-magnets' });
    expect(s.suit.magnets).toBe(true);
    expect(act(s, { type: 'return-outside' }).excursion?.stage).toBe('work');
    s = act(s, { type: 'toggle-magnets' });
    expect(act(s, { type: 'return-outside' }).excursion?.stage).toBe('return');
  });
  it('los equipos de observación ofrecen una recompensa con mayor consumo', () => {
    let s = launched('orion');
    for (let i = 0; i < 3; i++) s = act(s, { type: 'advance-flight' });
    const eco = act(s, { type: 'travel', mode: 'eco' });
    const observing = act(s, { type: 'travel', mode: 'fast' });
    expect(observing.travel.energy).toBeLessThan(eco.travel.energy);
    expect(observing.travel.observations).toBe(1);
    expect(eco.travel.observations).toBe(0);
  });
});

describe('guardado seguro', () => {
  it('restaura una copia y rechaza JSON roto, versión antigua y estados manipulados', () => {
    const s = arrived(); const restored = decodeCheckpoint(encodeCheckpoint(s));
    expect(restored?.phase).toBe('base'); expect(restored?.base).toEqual(s.base);
    expect(restored?.base).not.toBe(s.base);
    expect(decodeCheckpoint('{')).toBeNull(); expect(decodeCheckpoint('{}')).toBeNull();
    const bad = JSON.parse(encodeCheckpoint(s)); bad.version = 0;
    expect(decodeCheckpoint(JSON.stringify(bad))).toBeNull();
    const corrupt = JSON.parse(encodeCheckpoint(s)); corrupt.checkpoint.base.batteries.b1.station = 'unknown';
    expect(decodeCheckpoint(JSON.stringify(corrupt))).toBeNull();
    corrupt.checkpoint.base.batteries.b1.station = null; corrupt.checkpoint.upgrades = ['lung', 'lung', 'lung'];
    expect(decodeCheckpoint(JSON.stringify(corrupt))).toBeNull();
  });
  it('rechaza un reloj de lanzamiento manipulado y conserva los guardados que no lo tenían', () => {
    const save = JSON.parse(encodeCheckpoint(arrived()));
    delete save.checkpoint.flightElapsed;
    expect(decodeCheckpoint(JSON.stringify(save))).not.toBeNull();
    for(const value of [-1, 5000, 'corrupto', null]) {
      save.checkpoint.flightElapsed = value;
      expect(decodeCheckpoint(JSON.stringify(save))).toBeNull();
    }
  });
  it('restaura estaciones conectadas y el estado de avería sin perder sus relaciones', () => {
    let s = arrived();
    s = act(s, { type: 'base-action', action: { type: 'place-battery', batteryId: 'b1', stationId: 'air' } });
    s = { ...s, base: { ...s.base, failure: { status: 'resolved', batteryId: 'b1', endsAtMs: 225000 } } };
    s = act(act(s, { type: 'open-lab' }), { type: 'confirm-equipment' });
    const restored = decodeCheckpoint(encodeCheckpoint(s));
    expect(restored?.base.batteries.b1.station).toBe('air');
    expect(restored?.base.failure.batteryId).toBe('b1');
  });
  it('rechaza fases incoherentes, objetivos omitidos y reservas fuera de rango', () => {
    const raw = encodeCheckpoint(arrived());
    for (const change of [
      (s: any) => { delete s.base.missionGoals; },
      (s: any) => { s.base.missionGoals.recycler = true; },
      (s: any) => { s.base.phase = 'ended'; },
      (s: any) => { s.base.activeMs = -1; },
      (s: any) => { s.suit.thermal = -1; },
      (s: any) => { s.suit.dust = 10000; },
      (s: any) => { s.base.greenhouse.harvests = -1; },
    ]) {
      const save = JSON.parse(raw); change(save.checkpoint);
      expect(decodeCheckpoint(JSON.stringify(save))).toBeNull();
    }
  });
});

describe('recorridos completos de rescate', () => {
  for (const ship of ['orion', 'apollo'] as const) {
    it(`permite completar ${ship} con reparaciones, AVATAR, cosecha y emergencias`, () => {
      let s = arrived(ship, ['lung', 'armor', 'gloves']);
      for (const [batteryId, stationId] of [['b1', 'air'], ['b2', 'water'], ['b3', 'thermal'], ['b4', 'lab']] as const) {
        s = act(s, { type: 'base-action', action: { type: 'place-battery', batteryId, stationId } });
      }
      s = act(s, { type: 'base-action', action: { type: 'avatar-interaction' } });
      function sortie(site: 'relay' | 'recycler') {
        s = act(s, { type: 'excursion', site, route: 'long' });
        for (let step = 0; s.excursion && s.phase === 'base' && step < 2000; step++) {
          if (s.excursion.stage === 'work' && s.excursion.progress === 0) s = act(s, { type: 'work' });
          if (s.repairs[site] && s.excursion?.stage === 'work') s = act(s, { type: 'return-outside' });
          s = tick(s, 100);
        }
        expect(s.phase, s.cause).toBe('base'); expect(s.repairs[site]).toBe(true); expect(s.excursion).toBeNull();
      }
      sortie('relay');
      s = act(s, { type: 'base-action', action: { type: 'place-battery', batteryId: 'b4', stationId: 'comms' } });
      s = act(s, { type: 'base-action', action: { type: 'set-shelter-presence', inside: true } });
      for (let i = 0; i < 1500 && s.base.solar.status !== 'resolved' && s.phase === 'base'; i++) s = tick(s, 100);
      expect(s.base.solar.status).toBe('resolved');
      s = act(s, { type: 'base-action', action: { type: 'set-shelter-presence', inside: false } });
      s = act(s, { type: 'base-action', action: { type: 'place-battery', batteryId: 'b4', stationId: 'greenhouse' } });
      s = act(act(s, { type: 'open-lab' }), { type: 'confirm-equipment' });
      sortie('recycler');
      for (let i = 0; i < 1500 && s.phase === 'base'; i++) s = tick(s, 100);
      expect(s.phase, s.cause).toBe('return');
      expect(s.base.avatar.done).toBe(true); expect(s.base.comms.transmitted).toBe(true);
      expect(s.base.greenhouse.harvests).toBeGreaterThan(0); expect(s.base.failure.status).toBe('resolved');
      expect(Object.values(s.base.reserves).every(n => n > 0)).toBe(true);
      s = act(s, { type: 'finish-return' }); expect(s.phase).toBe('debrief');
    });
  }
});
