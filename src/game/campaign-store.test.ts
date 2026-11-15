import { describe, expect, it, vi } from 'vitest';
import { createCampaignStore, SAVE_KEY, PROGRESS_KEY, META_KEY } from './campaign-store';
import { actCampaign, tickCampaign, createCampaign, encodeCheckpoint, type CampaignAction, type Campaign } from './campaign';
import { encodeProgress, decodeProgress } from './progress';

function memory() {
  const data = new Map<string, string>();
  return { data, getItem: vi.fn((key: string) => data.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { data.set(key, value); }) };
}
type Driver={dispatch(action:CampaignAction):void;tick(delta:number):void;getSnapshot():{campaign:Campaign}};
function prepare(store: Driver, ship:'orion'|'apollo'='orion') {
  const actions: CampaignAction[] = [
    {type:'skip-intro'}, ...(['boots','armor','radio'] as const).map((id,slot) => ({type:'equip' as const,id,slot})),
    {type:'confirm-equipment'}, {type:'choose-ship',ship},
    ...(['water','food','battery','water',...(ship==='orion'?['food','water'] as const:[])] as const).map((cargo,slot) => ({type:'cargo' as const,cargo,slot})),
    {type:'confirm-ship'}, {type:'shelter',ids:['light','supplies']}, {type:'launch'},
    {type:'advance-flight'}, {type:'advance-flight'}, {type:'advance-flight'},
  ];
  actions.forEach(action => store.dispatch(action));
}
function land(store: Driver, ship:'orion'|'apollo'='orion') {
  prepare(store,ship);
  store.dispatch({type:'travel',mode:'eco'});
  for(let control=0;control<3;control++) store.dispatch({type:'flight-control',control});
  store.dispatch({type:'travel',mode:'eco'}); store.dispatch({type:'travel',mode:'eco'}); store.dispatch({type:'land'});
}
function serviceSuit(driver:Driver) {
  for(const [x,deck,waitMs] of [[24,2,5000],[76,1,4000]] as const) {
    driver.dispatch({type:'walk',x,deck});
    for(let i=0;i<200;i++) {
      const s=driver.getSnapshot().campaign;
      if(Math.abs(s.playerX-x)<.001&&s.playerDeck===deck)break;
      driver.tick(100);
    }
    expect(driver.getSnapshot().campaign.playerX).toBeCloseTo(x);expect(driver.getSnapshot().campaign.playerDeck).toBe(deck);
    for(let i=0;i<waitMs/100;i++)driver.tick(100);
  }
}

// Native engine strategy, then codec validation: no manufactured outcome fields.
function missionVictory(ship:'orion'|'apollo'='orion') {
  let campaign=createCampaign();
  const driver:Driver={dispatch(action){campaign=actCampaign(campaign,action);},tick(delta){campaign=tickCampaign(campaign,delta);},getSnapshot(){return {campaign};}};
  land(driver,ship);
  for(const [batteryId,stationId] of [['b1','air'],['b2','water'],['b3','thermal'],['b4','lab']] as const)driver.dispatch({type:'base-action',action:{type:'place-battery',batteryId,stationId}});
  driver.dispatch({type:'avatar-study'});
  const sortie=(site:'relay'|'recycler')=>{
    driver.dispatch({type:'excursion',site,route:'short'});
    for(let i=0;i<1500&&campaign.excursion&&campaign.phase==='base';i++){
      if(campaign.excursion.stage==='work'&&campaign.excursion.progress===0){driver.dispatch({type:'antenna',angle:90});driver.dispatch({type:'work'});}
      if(campaign.repairs[site]&&campaign.excursion?.stage==='work')driver.dispatch({type:'return-outside'});
      driver.tick(100);
    }
    expect(campaign.phase).toBe('base');expect(campaign.repairs[site]).toBe(true);
  };
  sortie('relay');
  driver.dispatch({type:'base-action',action:{type:'place-battery',batteryId:'b4',stationId:'comms'}});
  driver.dispatch({type:'base-action',action:{type:'set-shelter-presence',inside:true}});
  for(let i=0;i<1500&&campaign.base.solar.status!=='resolved';i++)driver.tick(100);
  driver.dispatch({type:'base-action',action:{type:'set-shelter-presence',inside:false}});
  driver.dispatch({type:'base-action',action:{type:'place-battery',batteryId:'b4',stationId:'greenhouse'}});
  driver.dispatch({type:'open-lab'});driver.dispatch({type:'confirm-equipment'});
  serviceSuit(driver);
  sortie('recycler');
  let beforeWin=campaign;
  for(let i=0;i<1500&&campaign.phase==='base';i++){beforeWin=campaign;driver.tick(100);}
  expect(campaign.phase).toBe('return');
  expect(decodeProgress(encodeProgress(campaign))).toEqual(campaign);
  expect(decodeProgress(encodeProgress(beforeWin))).toEqual(beforeWin);
  return {won:campaign,beforeWin};
}

describe('progreso local de la campaña', () => {
  it('desbloquea solo al completar normal y conserva el logro al reiniciar y recargar', () => {
    const {beforeWin}=missionVictory(); const port=memory();port.data.set(PROGRESS_KEY,encodeProgress(beforeWin));
    const store=createCampaignStore();store.connectStorage(port);expect(store.restore()).toBe(true);
    expect(store.getSnapshot().hardUnlocked).toBe(false);
    store.tick(100);expect(store.getSnapshot().campaign.phase).toBe('return');
    expect(store.getSnapshot().hardUnlocked).toBe(true);
    expect(port.data.has(META_KEY)).toBe(true);
    store.dispatch({type:'restart'});expect(store.getSnapshot().hardUnlocked).toBe(true);
    const reload=createCampaignStore();reload.connectStorage(port);expect(reload.getSnapshot().hardUnlocked).toBe(true);
    reload.dispatch({type:'skip-intro'});
    for(const [slot,id] of (['boots','armor','radio'] as const).entries())reload.dispatch({type:'equip',id,slot});
    reload.dispatch({type:'confirm-equipment'});reload.dispatch({type:'choose-ship',ship:'apollo'});
    expect(reload.getSnapshot().campaign.ship).toBe('apollo');
  });
  it.each(['progress','checkpoint'] as const)('migra victoria normal válida en %s al conectar sin restaurar la partida', format => {
    const {won}=missionVictory(); const port=memory();
    port.data.set(format==='progress'?PROGRESS_KEY:SAVE_KEY,format==='progress'?encodeProgress(won):encodeCheckpoint(won));
    const store=createCampaignStore();store.connectStorage(port);
    expect(store.getSnapshot().hardUnlocked).toBe(true);
    expect(store.getSnapshot().campaign.phase).toBe('intro');expect(port.data.has(META_KEY)).toBe(true);
    port.data.delete(PROGRESS_KEY);port.data.delete(SAVE_KEY);
    const reload=createCampaignStore();reload.connectStorage(port);expect(reload.getSnapshot().hardUnlocked).toBe(true);
  });
  it('conserva desbloqueo en sesión y avisa si el almacenamiento no acepta el logro', () => {
    const {beforeWin}=missionVictory();const port=memory();port.data.set(PROGRESS_KEY,encodeProgress(beforeWin));
    const store=createCampaignStore();store.connectStorage(port);store.restore();
    port.setItem.mockImplementation(()=>{throw Error('blocked');});
    store.tick(100);expect(store.getSnapshot().hardUnlocked).toBe(true);
    expect(store.getSnapshot().unlockNotice).toMatch(/sesión|pestaña/i);
    store.dispatch({type:'restart'});expect(store.getSnapshot().hardUnlocked).toBe(true);
    expect(port.data.has(META_KEY)).toBe(false);
  });
  it('no concede el logro por jugar difícil ni por una victoria normal incompleta o corrupta', () => {
    const {won:hardWon}=missionVictory('apollo');const {won,beforeWin}=missionVictory();
    const corrupt=structuredClone(won);corrupt.base.avatar.done=false;
    const corruptRaw=JSON.stringify({version:1,campaign:corrupt});expect(decodeProgress(corruptRaw)).toBeNull();
    for(const raw of [encodeProgress(hardWon),encodeProgress(beforeWin),corruptRaw]) {
      const port=memory();port.data.set(PROGRESS_KEY,raw);
      const store=createCampaignStore();store.connectStorage(port);
      expect(store.getSnapshot().hardUnlocked).toBe(false);expect(port.data.has(META_KEY)).toBe(false);
    }
  });
  it('migra el punto seguro ganador aunque exista una misión nueva sin terminar', () => {
    const {won}=missionVictory();const port=memory();port.data.set(PROGRESS_KEY,encodeProgress(createCampaign()));port.data.set(SAVE_KEY,encodeCheckpoint(won));
    const store=createCampaignStore();store.connectStorage(port);expect(store.getSnapshot().hardUnlocked).toBe(true);
  });
  it('bloquea Apolo en la tienda hasta completar normal, sin cambiar nave ni carga', () => {
    const store=createCampaignStore(); store.connectStorage(memory());
    store.dispatch({type:'skip-intro'});
    for(const [slot,id] of (['boots','armor','radio'] as const).entries())store.dispatch({type:'equip',id,slot});
    store.dispatch({type:'confirm-equipment'}); store.dispatch({type:'choose-ship',ship:'orion'});
    store.dispatch({type:'cargo',cargo:'water',slot:0});
    const prior=structuredClone(store.getSnapshot().campaign);
    store.dispatch({type:'choose-ship',ship:'apollo'});
    expect(store.getSnapshot().hardUnlocked).toBe(false);
    expect(store.getSnapshot().campaign.ship).toBe('orion');
    expect(store.getSnapshot().campaign.cargo).toEqual(prior.cargo);
    expect(store.getSnapshot().campaign.message).toMatch(/normal|Artemis/i);
  });
  it.each([
    '{"version":1,"hardUnlocked":false}', '{"version":1,"hardUnlocked":"true"}',
    '{"version":1,"hardUnlocked":1}', '{"version":2,"hardUnlocked":true}',
    '{"version":1,"hardUnlocked":true,"extra":true}', 'true', '{}', '{broken',
  ])('no desbloquea con metaprogreso no válido: %s', raw => {
    const port=memory(); port.data.set('mision-umbral-meta-v1',raw);
    const store=createCampaignStore();store.connectStorage(port);
    expect(store.getSnapshot().hardUnlocked).toBe(false);
  });
  it('recupera dos mejoras antes de confirmar y los briefings vistos', () => {
    const port=memory(); const store=createCampaignStore(); store.connectStorage(port);
    store.dispatch({type:'skip-intro'}); store.dispatch({type:'equip',id:'boots',slot:0}); store.dispatch({type:'equip',id:'radio',slot:2});
    store.markBriefingSeen('hangar');
    expect(store.saveProgress()).toBe(true); expect(store.getSnapshot().savedMessage).toMatch(/guardado/i);
    const reload=createCampaignStore(); reload.connectStorage(port);
    expect(reload.hasSavedProgress()).toBe(true); expect(reload.restore()).toBe(true);
    expect(reload.getSnapshot().campaign.upgrades).toEqual(['boots',null,'radio']);
    expect(reload.getSnapshot().campaign.tutorialSeen).toEqual(['hangar']);
    expect(reload.getSnapshot().campaign.phase).toBe('equipment');
  });
  it('recupera tramos y comprobaciones sin volver al lanzamiento', () => {
    const port=memory(); const store=createCampaignStore(); store.connectStorage(port); prepare(store);
    store.dispatch({type:'travel',mode:'fast'}); store.dispatch({type:'flight-control',control:0});
    const before=structuredClone(store.getSnapshot().campaign);
    const reload=createCampaignStore(); reload.connectStorage(port); expect(reload.restore()).toBe(true);
    expect(reload.getSnapshot().campaign.travel).toEqual(before.travel); expect(reload.getSnapshot().campaign.flightCheck).toBe(1);
    expect(reload.getSnapshot().campaign.checkpoint?.phase).toBe('launch');
  });
  it('recupera exterior exacto y mantiene un punto seguro para reintentar tras fallar', () => {
    const port=memory(); port.data.set(META_KEY,'{"version":1,"hardUnlocked":true}');
    const store=createCampaignStore(); store.connectStorage(port); land(store);
    store.dispatch({type:'excursion',site:'recycler',route:'short'}); store.tick(250); store.saveProgress();
    const before=structuredClone(store.getSnapshot().campaign);
    const reload=createCampaignStore(); reload.connectStorage(port); expect(reload.restore()).toBe(true);
    expect(reload.getSnapshot().campaign.excursion).toEqual(before.excursion); expect(reload.getSnapshot().campaign.suit).toEqual(before.suit);
    for(let i=0;i<800 && reload.getSnapshot().campaign.phase!=='failed';i++) reload.tick(250);
    expect(reload.getSnapshot().campaign.phase).toBe('failed');
    reload.saveProgress(); const failed=createCampaignStore(); failed.connectStorage(port); expect(failed.restore()).toBe(true);
    failed.dispatch({type:'retry'}); expect(failed.getSnapshot().campaign.phase).toBe('base'); expect(failed.getSnapshot().campaign.excursion).toBeNull();
    expect(failed.getSnapshot().hardUnlocked).toBe(true);
  });
  it('al retomar detiene dirección y destinos sin adelantar reloj ni caminar solo', () => {
    const port=memory(); const store=createCampaignStore(); store.connectStorage(port); land(store);
    store.dispatch({type:'walk',x:80,deck:3}); store.tick(250); store.saveProgress(); const saved=structuredClone(store.getSnapshot().campaign);
    store.setDirection(1); store.setPaused(true); expect(store.restore()).toBe(true);
    const restored=store.getSnapshot(); expect(restored.paused).toBe(false); expect(restored.campaign.base.activeMs).toBe(saved.base.activeMs);
    expect(restored.campaign.targetX).toBe(restored.campaign.playerX); expect(restored.campaign.targetDeck).toBe(restored.campaign.playerDeck);
    store.tick(100); expect(store.getSnapshot().campaign.playerX).toBe(restored.campaign.playerX);
  });
  it('no pisa la partida al montar ni al abrir la introducción; solo al empezar explícitamente', () => {
    const port=memory(); const first=createCampaignStore(); first.connectStorage(port); first.dispatch({type:'skip-intro'}); first.dispatch({type:'equip',id:'radio',slot:0});
    const prior=port.data.get(PROGRESS_KEY); const reload=createCampaignStore(); reload.connectStorage(port);
    reload.tick(250); reload.setHidden(true); reload.setPaused(true); reload.saveProgress();
    expect(port.data.get(PROGRESS_KEY)).toBe(prior);
    reload.setPaused(false); reload.setHidden(false); reload.dispatch({type:'next-intro'}); expect(port.data.get(PROGRESS_KEY)).toBe(prior);
    reload.dispatch({type:'skip-intro'}); expect(port.data.get(PROGRESS_KEY)).not.toBe(prior);
  });
  it('acota escrituras mientras camina y guarda al pausar y ocultar', () => {
    const port=memory(); const store=createCampaignStore(); store.connectStorage(port); land(store); const initial=port.setItem.mock.calls.length;
    for(let i=0;i<49;i++) store.tick(100);
    expect(port.setItem.mock.calls.length).toBe(initial); store.tick(100); expect(port.setItem.mock.calls.length).toBe(initial+1);
    store.tick(100); store.setPaused(true); expect(port.setItem.mock.calls.length).toBe(initial+2);
    store.setPaused(false); store.tick(100); store.setHidden(true); expect(port.setItem.mock.calls.length).toBe(initial+3);
    expect(store.getSnapshot().savedMessage).toBe('');
  });
  it('lee v2 y vuelve a él si el progreso nuevo está corrupto', () => {
    let campaign=createCampaign(); const helper=createCampaignStore(); const port=memory(); helper.connectStorage(port); land(helper); campaign=helper.getSnapshot().campaign;
    port.data.set(SAVE_KEY,encodeCheckpoint(campaign)); port.data.set(PROGRESS_KEY,'{"version":1,"campaign":{}}');
    const store=createCampaignStore(); store.connectStorage(port); expect(store.hasSavedProgress()).toBe(true); expect(store.restore()).toBe(true); expect(store.getSnapshot().campaign.phase).toBe('base');
  });
  it('informa almacenamiento bloqueado sin impedir jugar', () => {
    const store=createCampaignStore(); store.connectStorage({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
    expect(store.hasSavedProgress()).toBe(false); expect(store.restore()).toBe(false);
    store.dispatch({type:'skip-intro'}); expect(store.saveProgress()).toBe(false);
    expect(store.getSnapshot().campaign.phase).toBe('equipment'); expect(store.getSnapshot().persistenceMessage).toMatch(/guardar|bloqueado/i);
    expect(store.getSnapshot().savedMessage).not.toMatch(/^Progreso guardado/);
  });
  it('guarda y retoma una subida detenida, incluido el siguiente punto seguro del laboratorio', () => {
    const port=memory(); const store=createCampaignStore(); store.connectStorage(port); land(store);
    store.dispatch({type:'walk',x:50,deck:2});
    for(let i=0;i<6;i++)store.tick(250);
    expect(store.getSnapshot().campaign.playerDeck!%1).not.toBe(0);
    store.saveProgress(); const reload=createCampaignStore(); reload.connectStorage(port); expect(reload.restore()).toBe(true);
    const deck=reload.getSnapshot().campaign.playerDeck;
    reload.tick(100); expect(reload.getSnapshot().campaign.playerDeck).toBe(deck);
    reload.dispatch({type:'open-lab'}); reload.dispatch({type:'confirm-equipment'});
    expect(reload.saveProgress()).toBe(true);
    const again=createCampaignStore(); again.connectStorage(port); expect(again.restore()).toBe(true);
    expect(again.getSnapshot().campaign.playerDeck).toBe(deck);
  });
  it('mantiene la confirmación manual visible durante el avance y acota reintentos si falla el guardado', () => {
    const port=memory(); const store=createCampaignStore(); store.connectStorage(port); land(store);
    store.saveProgress(); store.tick(100); expect(store.getSnapshot().savedMessage).toMatch(/^Progreso guardado/);
    port.setItem.mockImplementation(()=>{throw Error('quota');});
    const initial=port.setItem.mock.calls.length;
    for(let i=0;i<101;i++)store.tick(100);
    expect(port.setItem.mock.calls.length-initial).toBe(2);
  });
  it.each([false,true])('valida un rescate completo y su cierre con salida opcional: %s', salidaAlCerrar => {
    const port=memory(); const store=createCampaignStore(); store.connectStorage(port); land(store);
    const roundTrip=()=>{const state=store.getSnapshot().campaign;expect(decodeProgress(encodeProgress(state))).toEqual(state);};
    for(const [batteryId,stationId] of [['b1','air'],['b2','water'],['b3','thermal'],['b4','lab']] as const)store.dispatch({type:'base-action',action:{type:'place-battery',batteryId,stationId}});
    store.dispatch({type:'avatar-study'});
    const tick=()=>{store.tick(100);roundTrip();};
    const sortie=(site:'relay'|'recycler')=>{
      store.dispatch({type:'excursion',site,route:'short'});roundTrip();
      for(let i=0;i<1500&&store.getSnapshot().campaign.excursion&&store.getSnapshot().campaign.phase==='base';i++){
        const s=store.getSnapshot().campaign;
        if(s.excursion?.stage==='work'&&s.excursion.progress===0){store.dispatch({type:'antenna',angle:90});store.dispatch({type:'work'});}
        if(s.repairs[site]&&s.excursion?.stage==='work')store.dispatch({type:'return-outside'});
        tick();
      }
      expect(store.getSnapshot().campaign.phase).toBe('base');expect(store.getSnapshot().campaign.repairs[site]).toBe(true);
    };
    sortie('relay');
    store.dispatch({type:'base-action',action:{type:'place-battery',batteryId:'b4',stationId:'comms'}});
    store.dispatch({type:'base-action',action:{type:'set-shelter-presence',inside:true}});
    for(let i=0;i<1500&&store.getSnapshot().campaign.base.solar.status!=='resolved';i++)tick();
    store.dispatch({type:'base-action',action:{type:'set-shelter-presence',inside:false}});
    store.dispatch({type:'base-action',action:{type:'place-battery',batteryId:'b4',stationId:'greenhouse'}});
    store.dispatch({type:'open-lab'});roundTrip();store.dispatch({type:'confirm-equipment'});
    serviceSuit(store);roundTrip();
    sortie('recycler');
    if(salidaAlCerrar){
      while(store.getSnapshot().campaign.base.activeMs<224900&&store.getSnapshot().campaign.phase==='base')tick();
      expect(store.getSnapshot().campaign.base.failure.status).toBe('active');
      store.dispatch({type:'excursion',site:'platform',route:'short'});
      store.tick(100);
      const state=store.getSnapshot().campaign;
      expect(state.phase).toBe('base');expect(state.base.phase).toBe('ended');expect(state.base.outcome).toBe('won');
      expect(store.getSnapshot().hardUnlocked).toBe(false);
      expect(state.excursion?.stage).toBe('outbound');roundTrip();
      expect(store.saveProgress()).toBe(true);
      const reload=createCampaignStore();reload.connectStorage(port);expect(reload.restore()).toBe(true);
      expect(reload.getSnapshot().campaign.excursion).toEqual(state.excursion);
      expect(reload.getSnapshot().campaign.base).toEqual(state.base);
      for(const mutate of [
        (s:typeof state)=>{s.base.avatar.done=false;},
        (s:typeof state)=>{s.base.outcome='lost';s.base.lostCause='reserve-zero';},
      ]){
        const corrupt=structuredClone(state);mutate(corrupt);
        expect(decodeProgress(JSON.stringify({version:1,campaign:corrupt}))).toBeNull();
      }
      const reloadTick=()=>{
        reload.tick(100);const current=reload.getSnapshot().campaign;
        expect(decodeProgress(encodeProgress(current))).toEqual(current);
      };
      for(let i=0;i<100&&reload.getSnapshot().campaign.excursion?.stage==='outbound';i++)reloadTick();
      expect(reload.getSnapshot().campaign.excursion?.stage).toBe('work');
      reload.dispatch({type:'return-outside'});
      for(let i=0;i<100&&reload.getSnapshot().campaign.excursion;i++)reloadTick();
      expect(reload.getSnapshot().campaign.excursion).toBeNull();
      expect(reload.getSnapshot().campaign.phase).toBe('base');
      expect(reload.saveProgress()).toBe(true);expect(reload.restore()).toBe(true);
      reloadTick();expect(reload.getSnapshot().campaign.phase).toBe('return');
      return;
    }
    for(let i=0;i<1500&&store.getSnapshot().campaign.phase==='base';i++)tick();
    expect(store.getSnapshot().campaign.phase).toBe('return');roundTrip();
    store.dispatch({type:'finish-return'});store.dispatch({type:'quiz',index:0,answer:1});roundTrip();
    expect(store.getSnapshot().campaign.phase).toBe('debrief');
  });
});
