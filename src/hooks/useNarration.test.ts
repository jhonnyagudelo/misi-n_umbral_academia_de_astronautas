import {describe,it,expect} from 'vitest';
import {createBrowserVoicePort} from './useNarration';
it('un callback nativo antiguo no termina ni eleva el volumen sobre la voz nueva',()=>{
  const utterances:SpeechSynthesisUtterance[]=[],duck:boolean[]=[],finished:string[]=[];
  const synth={getVoices:()=>[],speak:(u:SpeechSynthesisUtterance)=>utterances.push(u),cancel:()=>utterances.at(-1)?.onend?.({} as SpeechSynthesisEvent)};
  const Utterance=class{constructor(public text:string){}} as typeof SpeechSynthesisUtterance;
  const port=createBrowserVoicePort(synth,Utterance,value=>duck.push(value));
  port.speak('Anterior',()=>finished.push('anterior'));const old=utterances[0];old.onstart?.({} as SpeechSynthesisEvent);
  port.cancel();port.speak('Nueva',()=>finished.push('nueva'));const next=utterances[1];next.onstart?.({} as SpeechSynthesisEvent);
  old.onend?.({} as SpeechSynthesisEvent);old.onerror?.({} as SpeechSynthesisErrorEvent);
  expect(duck.at(-1)).toBe(true);expect(finished).toEqual([]);
  next.onend?.({} as SpeechSynthesisEvent);next.onerror?.({} as SpeechSynthesisErrorEvent);
  expect(duck.at(-1)).toBe(false);expect(finished).toEqual(['nueva']);
  expect(next.lang).toBe('es-CO');
});
import {coalesceAnnouncement} from './useNarration';
describe('avisos en el mismo fotograma',()=>{
  it('al cerrar un panel conserva el aviso de la escena nueva aunque tenga menor prioridad',()=>{
    expect(coalesceAnnouncement({text:'Una mejora',priority:4,scope:'panel:equipment'},{text:'Camina a la nave',priority:1,scope:'hangar'})).toEqual({text:'Camina a la nave',priority:1,scope:'hangar'});
  });
  it('en el mismo panel conserva la explicación específica frente al título genérico',()=>{
    expect(coalesceAnnouncement({text:'Efecto de la mejora',priority:4,scope:'panel:equipment'},{text:'Elige tres mejoras',priority:2,scope:'panel:equipment'})).toEqual({text:'Efecto de la mejora',priority:4,scope:'panel:equipment'});
  });
});
