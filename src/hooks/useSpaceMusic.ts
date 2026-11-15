import {useEffect,useRef,useState} from 'react';
type MusicSettings={enabled:boolean;paused:boolean;hidden:boolean;speaking:boolean};

// Audio time stops during suspend, so resuming preserves the scheduled chord.
export function createSpaceMusic(Audio:typeof AudioContext){
  let context:AudioContext|undefined,master:GainNode|undefined,timer:ReturnType<typeof setInterval>|undefined;
  let desired:MusicSettings={enabled:true,paused:false,hidden:false,speaking:false};
  let unlocked=false,disposed=false,syncing=false,revision=0,step=0,nextChordAt=-1;
  const chords=[[130.81,196,261.63],[110,164.81,220],[174.61,220,261.63],[146.83,196,293.66]];
  const shouldRun=()=>unlocked&&desired.enabled&&!desired.paused&&!desired.hidden&&!disposed;
  function chord(){
    if(!context||!master||context.state!=='running'||!shouldRun()||context.currentTime<nextChordAt)return;
    const now=context.currentTime;nextChordAt=now+4.5;
    for(const frequency of chords[step++%chords.length]){
      const tone=context.createOscillator(),envelope=context.createGain();tone.type='sine';tone.frequency.value=frequency;
      envelope.gain.setValueAtTime(0,now);envelope.gain.linearRampToValueAtTime(.22,now+1.5);envelope.gain.linearRampToValueAtTime(0,now+6);
      tone.connect(envelope);envelope.connect(master!);tone.start(now);tone.stop(now+6.1);
      tone.onended=()=>{tone.disconnect();envelope.disconnect();};
    }
  }
  async function reconcile(){
    if(syncing||disposed)return;syncing=true;
    try{
      while(!disposed){
        const seen=revision;
        if(!context&&shouldRun()){
          context=new Audio();master=context.createGain();master.gain.value=.035;master.connect(context.destination);timer=setInterval(chord,4500);
        }
        if(!context||!master)break;
        master.gain.setTargetAtTime(shouldRun()?(desired.speaking?.007:.035):0,context.currentTime,.12);
        try{
          if(shouldRun()&&context.state==='suspended')await context.resume();
          else if(!shouldRun()&&context.state==='running')await context.suspend();
        }catch{/* Autoplay restrictions leave visible controls usable. */}
        // A newer toggle wins even if the old browser operation finished later.
        if(seen!==revision)continue;
        chord();break;
      }
    }catch{/* Unsupported Web Audio must not interrupt play. */}
    finally{syncing=false;}
  }
  function sync(){revision++;void reconcile();}
  return {
    update(value:MusicSettings){desired={...value};sync();},
    activate(){if(disposed)return;unlocked=true;sync();},
    dispose(){disposed=true;clearInterval(timer);void context?.close().catch(()=>{});},
  };
}

// Original, quiet ambient soundtrack. One context, released on unmount.
export function useSpaceMusic(paused:boolean){
  const [enabled,setEnabled]=useState(true);
  const settings=useRef({enabled,paused});settings.current={enabled,paused};
  const sync=useRef<()=>void>(()=>{});
  useEffect(()=>{
    if(!window.AudioContext)return;
    const player=createSpaceMusic(window.AudioContext);let speaking=false;
    const update=()=>player.update({...settings.current,hidden:document.hidden,speaking});
    const activate=()=>{update();if(!navigator.userActivation||navigator.userActivation.hasBeenActive)player.activate();};
    const duck=(event:Event)=>{speaking=!!(event as CustomEvent).detail;update();};
    sync.current=update;
    window.addEventListener('pointerup',activate);window.addEventListener('keydown',activate);window.addEventListener('mission-speaking',duck);document.addEventListener('visibilitychange',update);activate();
    return()=>{player.dispose();sync.current=()=>{};window.removeEventListener('pointerup',activate);window.removeEventListener('keydown',activate);window.removeEventListener('mission-speaking',duck);document.removeEventListener('visibilitychange',update);};
  },[]);
  useEffect(()=>sync.current(),[enabled,paused]);
  return {enabled,toggle:()=>setEnabled(value=>!value)};
}
