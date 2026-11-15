import {describe,it,expect} from 'vitest';
import {createCampaign} from '../game/campaign';
import {missionText,characterThought,thoughtFeedback,importantFeedback} from './presentation';
describe('misión y pensamiento del protagonista',()=>{
  it('conserva rechazos y averías como pistas sin duplicar instrucciones normales',()=>{
    expect(importantFeedback('La mochila grande no cabe por el paso estrecho.')).toBe(true);
    expect(importantFeedback('Una batería está averiada. Reorganiza las otras.')).toBe(true);
    expect(importantFeedback('Salida iniciada. Puedes regresar antes de completar la tarea.')).toBe(false);
    expect(thoughtFeedback('Suelta los imanes de las botas antes de caminar de regreso.')).toContain('Necesito soltar');
  });
  it('conserva la misión al recoger batería pero cambia el pensamiento contextual',()=>{
    const initial=createCampaign();const s={...initial,phase:'base' as const};
    expect(missionText(s)).toContain('Aire');
    expect(missionText(s)).not.toBe(characterThought(s));
    expect(characterThought(s,'b1')).toContain('B1');
    expect(characterThought(s,'b1')).not.toBe(characterThought(s));
  });
  it('prioriza la emergencia y distingue el consejo dentro del refugio',()=>{
    const s=createCampaign();s.phase='base';s.base.solar.status='active';
    expect(missionText(s)).toMatch(/refugio/i);expect(characterThought(s)).toMatch(/piso cuatro/i);
    s.base.inShelter=true;expect(characterThought(s)).toMatch(/espero/i);
    expect(missionText(s)).not.toBe(characterThought(s));
  });
});
