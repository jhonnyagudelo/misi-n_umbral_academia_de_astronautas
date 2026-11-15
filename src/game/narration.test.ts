import {describe,it,expect} from 'vitest';
import {createNarrator} from './narration';
function setup(){
  const spoken:string[]=[],done:(()=>void)[]=[];let cancelled=0;
  const voice=createNarrator({speak:(text,onDone)=>{spoken.push(text);done.push(onDone);},cancel:()=>cancelled++});
  return {voice,spoken,done,get cancelled(){return cancelled;}};
}
describe('narración serial',()=>{
  it('termina la frase activa y conserva solo la última pista de una ráfaga',()=>{
    const t=setup();t.voice.update('Prepara el traje','hangar');t.voice.activate();
    t.voice.update('Una pista','hangar');t.voice.update('La última pista','hangar');t.voice.activate();
    expect(t.spoken).toEqual(['Prepara el traje']);expect(t.cancelled).toBe(0);
    t.done[0]();expect(t.spoken).toEqual(['Prepara el traje','La última pista']);
    t.done[1]();t.voice.update('La última pista','hangar');expect(t.spoken).toHaveLength(2);
  });
  it('cambia de escena una vez e ignora completados de la frase cancelada',()=>{
    const t=setup();t.voice.update('Despegamos','launch');t.voice.activate();
    t.voice.update('Una pista pendiente','launch');t.voice.update('Abre AVATAR','panel:avatar');
    t.voice.update('Compara muestras','panel:avatar');
    expect(t.cancelled).toBe(1);expect(t.spoken).toEqual(['Despegamos','Abre AVATAR']);
    t.done[0]();expect(t.spoken).toHaveLength(2);
    t.done[1]();expect(t.spoken.at(-1)).toBe('Compara muestras');
  });
  it('silenciar cancela, descarta la cola y al activar lee solo lo vigente',()=>{
    const t=setup();t.voice.update('Primero','base');t.voice.activate();t.voice.update('Pendiente','base');
    t.voice.setEnabled(false);t.done[0]();t.voice.update('Último','base');t.voice.activate();
    expect(t.spoken).toEqual(['Primero']);expect(t.cancelled).toBe(1);
    t.voice.setEnabled(true);expect(t.spoken).toEqual(['Primero','Último']);
  });
  it('una alerta urgente interrumpe una pista y descarta la pendiente anterior',()=>{
    const t=setup();t.voice.update('Mueve la batería','base');t.voice.activate();t.voice.update('Consejo','base');
    t.voice.update('¡Entra al refugio!','base',5);t.voice.update('¡Entra al refugio!','base',5);
    expect(t.cancelled).toBe(1);expect(t.spoken).toEqual(['Mueve la batería','¡Entra al refugio!']);
    t.done[0]();t.done[1]();expect(t.spoken).toHaveLength(2);
  });
  it('pausa sin leer en segundo plano y retoma el último mensaje',()=>{
    const t=setup();t.voice.update('Primero','base');t.voice.activate();t.voice.pause(true);t.voice.update('Último','base');
    expect(t.spoken).toEqual(['Primero']);t.voice.pause(false);expect(t.spoken).toEqual(['Primero','Último']);
  });
  it('repite después de terminar, sin cortar la misma frase al pulsar rápido',()=>{
    const t=setup();t.voice.update('Una frase','base');t.voice.activate();t.voice.repeat();t.voice.repeat();
    expect(t.spoken).toEqual(['Una frase']);t.done[0]();t.voice.repeat();expect(t.spoken).toEqual(['Una frase','Una frase']);
  });
  it('un navegador sin voz disponible no interrumpe la partida',()=>{
    const voice=createNarrator({speak:()=>{throw new Error('No voice');},cancel:()=>{}});
    expect(()=>{voice.update('Lee el texto');voice.activate();voice.repeat();voice.pause(true);voice.dispose();}).not.toThrow();
  });
});
