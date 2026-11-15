import {describe,it,expect} from 'vitest';
import {createCampaign} from '../game/campaign';
import {missionText} from './presentation';
import {pointNumber,missionProgress,ZONE_GUIDES} from './orientation';
describe('orientación para la partida',()=>{
  it('distingue tramos y empareja destino con número de sitio',()=>{
    const s=createCampaign();s.phase='travel';
    const first=missionText(s);expect(first).toContain('(1)');expect(first).toContain('1 de 3');
    s.travel.leg=2;expect(missionText(s)).not.toBe(first);expect(missionText(s)).toContain('3 de 3');
    expect(missionProgress(s).current).toBe(4);expect(pointNumber('travel','travel')).toBe(1);
    s.travel.leg=1;s.flightCheck=0;expect(missionText(s)).toContain('(2)');expect(missionProgress(s).current).toBe(2);
  });
  it('sitúa estaciones y explica el fin antes de usar cada zona',()=>{
    expect(pointNumber('base','batteries')).toBe(4);expect(pointNumber('base','air')).toBe(6);
    for(const guide of Object.values(ZONE_GUIDES)){expect(guide.goal.length).toBeGreaterThan(10);expect(guide.rules.length).toBeGreaterThan(0);}
    expect(ZONE_GUIDES.base.rules.join(' ')).toMatch(/cuatro baterías/i);
  });
});
