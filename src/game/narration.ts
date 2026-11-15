export type VoicePort = {speak:(text:string,onDone:()=>void)=>void;cancel:()=>void};
type Message = {text:string;scope:string;priority:number};
// Speech is presentation only. One active phrase and at most one newer hint.
export function createNarrator(port:VoicePort) {
  let activated=false,enabled=true,paused=false,disposed=false,scope='',generation=0;
  let latest:Message|undefined,current:Message|undefined,pending:Message|undefined,last='';
  const key=(item:Message)=>JSON.stringify([item.scope,item.text]);
  const ready=()=>activated&&enabled&&!paused&&!disposed;
  function cancel(){
    pending=undefined;
    if(!current)return;
    // Invalidate before native cancel: some browsers finish synchronously here.
    generation++;current=undefined;
    try{port.cancel();}catch{/* Text remains available. */}
  }
  function start(item:Message,force=false){
    if(!ready()||current||(!force&&key(item)===last))return;
    const token=++generation;current=item;last=key(item);
    const done=()=>{
      if(token!==generation||!current)return;
      current=undefined;const next=pending;pending=undefined;
      if(next)start(next);
    };
    try{port.speak(item.text,done);}catch{done();}
  }
  function setScope(next:string){
    if(next===scope)return;
    cancel();scope=next;latest=undefined;last='';
  }
  return {
    update(text:string,nextScope=scope,priority=0){
      if(disposed)return;
      setScope(nextScope);
      text=text.replace(/\s+/g,' ').trim();if(!text)return;
      const item={text,scope,priority};latest=item;
      if(!ready())return;
      if(current&&key(current)===key(item)){pending=undefined;return;}
      if(current&&priority>=5){cancel();start(item);return;}
      if(current){pending=item;return;}
      start(item);
    },
    setScope,
    activate(){if(activated||disposed)return;activated=true;if(latest)start(latest);},
    setEnabled(value:boolean){
      if(value===enabled||disposed)return;
      enabled=value;
      if(!value){cancel();last='';}else if(latest)start(latest,true);
    },
    repeat(){
      if(!latest||!ready()||current&&key(current)===key(latest))return;
      cancel();start(latest,true);
    },
    refresh(){if(!latest||disposed)return;cancel();start(latest,true);},
    pause(value:boolean){
      if(paused===value||disposed)return;
      paused=value;if(value){cancel();last='';}else if(latest)start(latest,true);
    },
    dispose(){cancel();disposed=true;activated=false;latest=undefined;},
  };
}
