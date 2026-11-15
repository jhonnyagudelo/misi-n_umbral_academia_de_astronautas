import { describe, expect, it } from 'vitest';
import { createCampaign, actCampaign } from './campaign';
import { encodeProgress, decodeProgress } from './progress';

describe('codec de progreso validado', () => {
  const prepared=()=>actCampaign(actCampaign(createCampaign(),{type:'skip-intro'}),{type:'equip',id:'radio',slot:1});
  it('conserva preparación incompleta y usa versión propia', () => {
    const state=prepared(); const raw=encodeProgress(state); expect(JSON.parse(raw).version).toBe(1); expect(decodeProgress(raw)).toEqual(state);
  });
  it.each([
    (s:any)=>{s.upgrades=['radio','radio',null];},
    (s:any)=>{s.suit.oxygen=1000;},
    (s:any)=>{s.travel.leg=4;},
    (s:any)=>{s.base.stations.air.batteryId='b1';},
    (s:any)=>{s.base.batteries.b1.station='invented';},
    (s:any)=>{s.quiz=[null,9,null];},
    (s:any)=>{s.tutorialSeen=['invented'];},
    (s:any)=>{s.phase='base';},
    (s:any)=>{s.excursion={site:'recycler',stage:'outbound',elapsed:0,distance:9,progress:0,route:'short'};},
    (s:any)=>{s.base.shelter.chosen=['light'];s.base.shelter.mass=99;},
    (s:any)=>{s.suit.shield='yes';},
    (s:any)=>{s.base.solar.requiredDwellMs='35000';},
    (s:any)=>{s.base.failure.batteryId='alien';},
    (s:any)=>{s.base.reserves.air=-1;},
    (s:any)=>{s.base.stations.extra={batteryId:null,progressMs:0,energyMs:0};},
    (s:any)=>{s.checkpoint={...s,checkpoint:undefined};},
  ])('rechaza valores corruptos o incoherentes (%#)', mutate => {
    const state=prepared(); mutate(state); expect(decodeProgress(JSON.stringify({version:1,campaign:state}))).toBeNull();
  });
  it('rechaza JSON, versiones y tamaños incompatibles', () => {
    for(const raw of ['null','[]','{','{"version":2,"campaign":{}}',' '.repeat(100001)]) expect(decodeProgress(raw)).toBeNull();
  });
});
