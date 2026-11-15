import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const output=path.join(process.env.TEMP,'umbral-feedback-build-qa');await fs.mkdir(output,{recursive:true});
const target=await(await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let serial=0;const pending=new Map(),errors=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);};
const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>reject(new Error(method)),15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
async function run(expression){const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}
async function wait(expression){for(let i=0;i<200;i++){if(await run(expression))return;await new Promise(r=>setTimeout(r,40));}throw new Error(expression);}
async function frames(){await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');}
async function go(label,ticks=135){await run(`document.querySelector('[aria-label="Ir a ${label}"]').click()`);await frames();await run(`for(let i=0;i<${ticks};i++)qaStore.tick(100)`);await frames();}
async function shot(name){const r=await cmd('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(output,name+'.png'),Buffer.from(r.data,'base64'));}

try{
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await cmd('Page.addScriptToEvaluateOnNewDocument',{source:"window.voiceRequests=[];window.audioContexts=[];window.audioGains=[];const speak=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=u=>{voiceRequests.push(u.text);speak(u)};const Native=AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);audioContexts.push(this)}createGain(){const gain=super.createGain();audioGains.push(gain);return gain}}"});
 await cmd('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});await cmd('Page.navigate',{url:'http://127.0.0.1:4322/juego'});
 await wait("!!document.querySelector('.pg-field')&&!document.querySelector('astro-island').hasAttribute('ssr')");await frames();
 const button=await run("(()=>{const r=document.querySelector('[aria-label=\"Repetir mensaje de voz\"]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await cmd('Input.dispatchMouseEvent',{type:'mousePressed',...button,button:'left',clickCount:1});await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',...button,button:'left',clickCount:1});
 await wait('voiceRequests.length>0&&audioContexts.length===1&&audioContexts[0].state===\"running\"');assert.match(await run('voiceRequests.at(-1)'),/reciclador/);
 assert.ok(await run("document.querySelector('.pg-mission').textContent.includes('MISIÓN')"));assert.ok(await run("document.querySelector('.pg-thought').textContent.includes('LO QUE PIENSO')"));
 assert.notEqual(await run("document.querySelector('.pg-mission strong').textContent"),await run("document.querySelector('.pg-thought p').textContent"));
 await run("document.querySelector('[aria-label=\"Silenciar música\"]').click()");await wait("audioContexts[0].state==='suspended'");
 await run("document.querySelector('[aria-label=\"Activar música\"]').click()");await wait("audioContexts[0].state==='running'");
 await run("dispatchEvent(new CustomEvent('mission-speaking',{detail:true}))");await new Promise(r=>setTimeout(r,500));assert.ok(await run('audioGains[0].gain.value')<.015,'La música baja bajo la voz');
 await shot('build-entrada');assert.equal(errors.length,0);console.log(JSON.stringify({passed:true,build:true,voice:true,music:true}));}finally{await cmd('Page.close');ws.close();}
