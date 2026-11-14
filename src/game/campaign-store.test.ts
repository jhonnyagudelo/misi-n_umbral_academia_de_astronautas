import { describe, it, expect } from 'vitest';
import { createCampaignStore } from './campaign-store';
function baseStore() {
  const store = createCampaignStore(); const d = store.dispatch;
  d({ type: 'skip-intro' });
  (['lung', 'armor', 'gloves'] as const).forEach((id, slot) => d({ type: 'equip', id, slot }));
  d({ type: 'confirm-equipment' }); d({ type: 'choose-ship', ship: 'orion' });
  (['water', 'food', 'battery', 'water', 'food', 'water'] as const).forEach((cargo, slot) => d({ type: 'cargo', cargo, slot }));
  d({ type: 'confirm-ship' }); d({ type: 'shelter', ids: ['light', 'supplies'] }); d({ type: 'launch' });
  for (let i = 0; i < 3; i++) d({ type: 'advance-flight' });
  for (let i = 0; i < 3; i++) {
    if (i === 1) for (let control = 0; control < 3; control++) d({ type: 'flight-control', control });
    d({ type: 'travel', mode: 'eco' });
  }
  d({ type: 'land' }); return store;
}
describe('reloj y persistencia de campaña', () => {
  it('camina solo durante el tiempo mantenido y se detiene al soltar, sin destinos acumulados', () => {
    const store = createCampaignStore(); store.dispatch({type:'skip-intro'});
    store.setDirection(1); store.tick(80); store.setDirection(0);
    const released = store.getSnapshot().campaign.playerX;
    expect(released).toBeGreaterThan(12); expect(released).toBeLessThan(14.5);
    store.tick(250); expect(store.getSnapshot().campaign.playerX).toBe(released);
    store.setDirection(-1); store.tick(80); store.setDirection(0);
    expect(store.getSnapshot().campaign.playerX).toBeCloseTo(12);
  });
  it('pausar u ocultar cancela una tecla mantenida y no la reactiva al volver', () => {
    const store = createCampaignStore(); store.dispatch({type:'skip-intro'});
    store.setDirection(1); store.tick(100); store.setPaused(true);
    const paused = store.getSnapshot().campaign.playerX;
    store.setPaused(false); store.tick(200); expect(store.getSnapshot().campaign.playerX).toBe(paused);
    store.setDirection(1); store.tick(100); store.setHidden(true);
    const hidden = store.getSnapshot().campaign.playerX;
    store.setHidden(false); store.tick(200); expect(store.getSnapshot().campaign.playerX).toBe(hidden);
  });
  it('el lanzamiento avanza con el único reloj, se pausa y acaba en el espacio sin movimiento pendiente', () => {
    const store = baseStore(); store.dispatch({type:'restart'}); const d=store.dispatch;
    d({type:'skip-intro'}); (['lung','armor','gloves'] as const).forEach((id,slot)=>d({type:'equip',id,slot}));
    d({type:'confirm-equipment'});d({type:'choose-ship',ship:'apollo'});
    (['water','food','battery','water'] as const).forEach((cargo,slot)=>d({type:'cargo',cargo,slot}));
    d({type:'confirm-ship'});d({type:'shelter',ids:['light','supplies']});d({type:'launch'});
    for(let i=0;i<12;i++)store.tick(250);
    expect(store.getSnapshot().campaign.phase).toBe('launch');
    store.setPaused(true);for(let i=0;i<20;i++)store.tick(250);
    expect(store.getSnapshot().campaign.flightStep).toBe(0);
    store.setPaused(false);for(let i=0;i<28;i++)store.tick(250);
    expect(store.getSnapshot().campaign.phase).toBe('travel');
    expect(store.getSnapshot().campaign.playerX).toBe(store.getSnapshot().campaign.targetX);
    expect(store.getSnapshot().campaign.base.activeMs).toBe(0);
  });
  it('pausa sin acumular tiempo y mantiene la identidad del snapshot sin cambios', () => {
    const store = createCampaignStore(); const initial = store.getSnapshot();
    expect(store.getSnapshot()).toBe(initial);
    store.setPaused(true); store.tick(200);
    expect(store.getSnapshot().campaign).toBe(initial.campaign);
    store.setPaused(false); store.setHidden(true);
    store.dispatch({ type: 'skip-intro' });
    expect(store.getSnapshot().campaign.phase).toBe('intro');
    store.setHidden(false); store.dispatch({ type: 'skip-intro' });
    expect(store.getSnapshot().campaign.phase).toBe('equipment');
  });
  it('un almacenamiento bloqueado o corrupto no impide empezar', () => {
    const store = createCampaignStore();
    store.connectStorage({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } });
    expect(store.restore()).toBe(false);
    expect(store.getSnapshot().persistenceMessage).toMatch(/guardar|guardado|almacenamiento/i);
    store.dispatch({ type: 'skip-intro' });
    expect(store.getSnapshot().campaign.phase).toBe('equipment');
    store.connectStorage({ getItem: () => '{broken', setItem: () => {} });
    expect(store.restore()).toBe(false);
  });
  it('congela reloj y reservas reales de la base por pausa y ocultación sin recuperar tiempo después', () => {
    const store = baseStore(); store.tick(100);
    const running = store.getSnapshot().campaign;
    expect(running.base.activeMs).toBe(100);
    store.setPaused(true); store.tick(200);
    expect(store.getSnapshot().campaign).toBe(running);
    store.setPaused(false); store.setHidden(true); store.tick(200);
    expect(store.getSnapshot().campaign).toBe(running);
    store.setHidden(false); store.tick(100);
    expect(store.getSnapshot().campaign.base.activeMs).toBe(200);
    expect(store.getSnapshot().campaign.base.reserves.air).toBeCloseTo(65 - .3 * .2);
  });
  it('un fallo al escribir un punto seguro no pierde la partida en memoria', () => {
    const store = baseStore();
    store.connectStorage({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
    store.dispatch({ type: 'open-lab' }); store.dispatch({ type: 'confirm-equipment' });
    expect(store.getSnapshot().campaign.phase).toBe('base');
    expect(store.getSnapshot().campaign.checkpoint).not.toBeNull();
    expect(store.getSnapshot().persistenceMessage).toMatch(/No se pudo guardar/);
  });
});
