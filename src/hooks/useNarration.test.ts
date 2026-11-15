import {describe,it,expect} from 'vitest';
import {createBrowserVoicePort} from './useNarration';
it('traduce la misión dinámica y el pensamiento concatenados antes de narrar en inglés',()=>{
  const utterances:SpeechSynthesisUtterance[]=[];
  const synth={getVoices:()=>[],speak:(u:SpeechSynthesisUtterance)=>utterances.push(u),cancel:()=>{}};
  const Utterance=class{constructor(public text:string){}} as typeof SpeechSynthesisUtterance;
  const port=createBrowserVoicePort(synth,Utterance,()=>{});
  port.speak('Consola (2): comprueba el control 1 de 3. Estamos en sombra. Voy a revisar la consola antes de seguir.',()=>{});
  expect(utterances[0].text).toBe('Console: check control 1 of 3. We are in shadow. I will check the console before moving on.');
});
it('traduce pensamientos de batería y pistas dentro de mensajes compuestos',()=>{
  const utterances:SpeechSynthesisUtterance[]=[];
  const synth={getVoices:()=>[],speak:(u:SpeechSynthesisUtterance)=>utterances.push(u),cancel:()=>{}};
  const Utterance=class{constructor(public text:string){}} as typeof SpeechSynthesisUtterance;
  const port=createBrowserVoicePort(synth,Utterance,()=>{});
  for(const text of ['Regresa a la base. Me fijo en esto: Me acerco a aire.','Regresa a la base. Ya recogí B1. Esta estación ya no tiene energía.','Regresa a la base. ¡Listo! Aire tiene energía!'])port.speak(text,()=>{});
  expect(utterances.map(u=>u.text)).toEqual(['Return to base. I notice this: I am walking over to air.','Return to base. I picked up B1. This station no longer has power.','Return to base. Ready! Air has power!']);
  port.speak('Regresa a la base. Dejé la batería en el estante.',()=>{});
  expect(utterances.at(-1)?.text).toBe('Return to base. I put down the battery on the shelf.');
});
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
  expect(next.lang).toBe('en-US');
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
