import {describe,it,expect} from 'vitest';
import {spokenText} from './spoken-text';
describe('localizadores solo visuales',()=>{
  it('omite números de sitio sin borrar reservas, tiempos ni pasos de una tarea',()=>{
    expect(spokenText('Ventana (1): continúa el tramo 3 de 3.')).toBe('Ventana: continúa el tramo 3 de 3.');
    expect(spokenText('Baterías (4): lleva una a Aire (6).')).toBe('Baterías: lleva una a Aire.');
    expect(spokenText('Sitio 10 · ¿Para qué sirve?')).toBe('¿Para qué sirve?');
    expect(spokenText('Place 10 · What is it for?')).toBe('What is it for?');
    expect(spokenText('Oxígeno: 70 de 140. Espera 25 segundos. Control 2 de 3.')).toBe('Oxígeno: 70 de 140. Espera 25 segundos. Control 2 de 3.');
  });
});
