import {useLayoutEffect,useRef} from 'react';
import {createNarrator,type VoicePort} from '../game/narration';
import {spokenText} from '../content/spoken-text';

type Announcement={text:string;priority:number;scope?:string};
export function coalesceAnnouncement(previous:Announcement|null,next:Announcement):Announcement{
  return !previous||next.scope!==previous.scope||next.priority>=previous.priority?next:previous;
}
export function announce(text:string,priority=1,scope?:string){window.dispatchEvent(new CustomEvent('mission-narrate',{detail:{text,priority,scope}}));}
export function repeatNarration(){window.dispatchEvent(new Event('mission-repeat'));}

// Browsers may deliver onend/onerror after cancel, or deliver both callbacks.
export function createBrowserVoicePort(synth:Pick<SpeechSynthesis,'speak'|'cancel'|'getVoices'>,Utterance:typeof SpeechSynthesisUtterance,speaking:(value:boolean)=>void):VoicePort{
  let active:SpeechSynthesisUtterance|undefined;
  return {
    cancel(){active=undefined;speaking(false);synth.cancel();},
    speak(text,onDone){
      const speech=new Utterance(spokenText(text));active=speech;speech.lang='es-CO';speech.rate=.9;
      const spanish=synth.getVoices().find(v=>v.lang.startsWith('es'));if(spanish)speech.voice=spanish;
      speech.onstart=()=>{if(active===speech)speaking(true);};
      const finish=()=>{if(active!==speech)return;active=undefined;speaking(false);onDone();};
      speech.onend=finish;speech.onerror=finish;
      try{synth.speak(speech);}catch{finish();}
    },
  };
}

export function useNarration(message:string,paused:boolean,scope='scene',enabled=true){
  const narrator=useRef<ReturnType<typeof createNarrator>|null>(null);
  const settings=useRef({message,paused,scope,enabled});settings.current={message,paused,scope,enabled};
  const scheduled=useRef(0),pending=useRef<Announcement|null>(null);
  useLayoutEffect(()=>{
    if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window))return;
    const speaking=(value:boolean)=>window.dispatchEvent(new CustomEvent('mission-speaking',{detail:value}));
    const voice=createNarrator(createBrowserVoicePort(window.speechSynthesis,window.SpeechSynthesisUtterance,speaking));
    narrator.current=voice;
    const initial=settings.current;voice.setEnabled(initial.enabled);voice.pause(initial.paused||document.hidden);voice.update(initial.message,initial.scope);
    // Layout setup precedes children's passive announcements, including intro.
    const activate=()=>{if(navigator.userActivation&&!navigator.userActivation.hasBeenActive)return;voice.activate();};
    const contextual=(event:Event)=>{
      const item=(event as CustomEvent<Announcement>).detail;if(typeof item?.text!=='string')return;
      pending.current=coalesceAnnouncement(pending.current,item);
      if(scheduled.current)return;
      scheduled.current=requestAnimationFrame(()=>{
        scheduled.current=0;const next=pending.current;pending.current=null;
        if(next)voice.update(next.text,next.scope,next.priority);
      });
    };
    const repeat=()=>{
      // A repeat on the same gesture as a new panel reads the pending panel.
      if(pending.current){const next=pending.current;pending.current=null;cancelAnimationFrame(scheduled.current);scheduled.current=0;voice.update(next.text,next.scope,next.priority);}
      voice.activate();voice.repeat();
    };
    const visibility=()=>voice.pause(settings.current.paused||document.hidden);
    window.addEventListener('pointerup',activate);window.addEventListener('keydown',activate);
    window.addEventListener('mission-narrate',contextual);window.addEventListener('mission-repeat',repeat);
    document.addEventListener('visibilitychange',visibility);
    if(navigator.userActivation?.hasBeenActive)voice.activate();
    return()=>{
      cancelAnimationFrame(scheduled.current);scheduled.current=0;pending.current=null;voice.dispose();narrator.current=null;
      window.removeEventListener('pointerup',activate);window.removeEventListener('keydown',activate);
      window.removeEventListener('mission-narrate',contextual);window.removeEventListener('mission-repeat',repeat);document.removeEventListener('visibilitychange',visibility);
    };
  },[]);
  useLayoutEffect(()=>{
    // Discard queued announcements from a scene that was closed this render.
    cancelAnimationFrame(scheduled.current);scheduled.current=0;pending.current=null;
    narrator.current?.update(message,scope);
  },[message,scope]);
  useLayoutEffect(()=>narrator.current?.pause(paused||document.hidden),[paused]);
  useLayoutEffect(()=>{
    if(!enabled){cancelAnimationFrame(scheduled.current);scheduled.current=0;pending.current=null;}
    narrator.current?.setEnabled(enabled);
  },[enabled]);
  return ()=>{window.dispatchEvent(new Event('mission-repeat'));};
}
