import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const output=path.join(process.env.TEMP,'umbral-habitat-qa');await fs.mkdir(output,{recursive:true});
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
 await cmd('Page.enable');await cmd('Runtime.enable');
 await cmd('Page.addScriptToEvaluateOnNewDocument',{source:"window.voiceRequests=[];if('speechSynthesis'in window){const original=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=u=>{voiceRequests.push(u.text);original(u)}}"});
 await cmd('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});await cmd('Page.navigate',{url:'http://127.0.0.1:4321/juego'});
 await wait("!!document.querySelector('.pg-field')&&!document.querySelector('astro-island').hasAttribute('ssr')");
 await frames();const voiceButton=await run("(()=>{const r=document.querySelector('[aria-label=\"Repetir mensaje de voz\"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await cmd('Input.dispatchMouseEvent',{type:'mousePressed',...voiceButton,button:'left',clickCount:1});await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',...voiceButton,button:'left',clickCount:1});
 assert.equal(await run('navigator.userActivation.hasBeenActive'),true);await wait('voiceRequests.length>0');
 const first=await run('voiceRequests.length');await run("document.querySelector('[aria-label=\"Repetir mensaje de voz\"]').click()");assert.ok(await run('voiceRequests.length')>first);assert.equal(await run("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Voz: no'))"),false);
 await run("(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/game/campaign-store.ts')).name;window.qaStore=(await import(url)).campaignStore;qaStore.dispatch({type:'restart'});qaStore.dispatch({type:'skip-intro'});for(const [slot,id]of ['lung','armor','gloves'].entries())qaStore.dispatch({type:'equip',id,slot});qaStore.dispatch({type:'confirm-equipment'});qaStore.dispatch({type:'choose-ship',ship:'orion'});for(const [slot,cargo]of ['water','food','battery','water','food','water'].entries())qaStore.dispatch({type:'cargo',cargo,slot});qaStore.dispatch({type:'confirm-ship'});qaStore.dispatch({type:'shelter',ids:['light','supplies']});qaStore.dispatch({type:'launch'});for(let i=0;i<3;i++)qaStore.dispatch({type:'advance-flight'});qaStore.dispatch({type:'travel',mode:'eco'});for(let control=0;control<3;control++)qaStore.dispatch({type:'flight-control',control});qaStore.dispatch({type:'travel',mode:'eco'});qaStore.dispatch({type:'travel',mode:'eco'});qaStore.dispatch({type:'land'})})()");
 await wait("!!document.querySelector('.habitat-drawing')");assert.equal(await run("document.querySelectorAll('.habitat-floor-label').length"),4);
 await run("document.querySelector('[aria-label=\"Ir a Radio\"]').click()");await frames();await run('qaStore.tick(100)');assert.equal(await run('qaStore.getSnapshot().campaign.playerDeck'),1,'Primero camina hasta la escalera');await run('for(let i=0;i<135;i++)qaStore.tick(100)');await frames();assert.equal(await run('qaStore.getSnapshot().campaign.playerDeck'),0);
 await go('Baterías');assert.equal(await run('qaStore.getSnapshot().campaign.playerDeck'),1);assert.ok(await run("!!document.querySelector('.pg-carried')"));
 await go('Aire');assert.equal(await run('qaStore.getSnapshot().campaign.playerDeck'),2);assert.equal(await run('qaStore.getSnapshot().campaign.base.batteries.b1.station'),'air');
 await go('Cultivo',160);assert.equal(await run('qaStore.getSnapshot().campaign.playerDeck'),3);
 const views=[];
 for(const [width,height]of [[1366,768],[1024,600],[390,844],[320,480],[844,390],[568,320]]){
  await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await frames();await run("document.querySelector('astro-dev-toolbar')?.remove()");
  const fits=await run('document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight');assert.ok(fits,`${width}x${height}`);views.push({width,height});await shot(`habitat-${width}x${height}`);
  assert.ok(await run("(()=>{const p=document.querySelector('.pg-player').getBoundingClientRect(),o=document.querySelector('[aria-label=\"Ir a Cultivo\"]').getBoundingClientRect();return Math.abs((p.x+p.width/2)-(o.x+o.width/2))<3})()"),'El jugador debe llegar a la posición visual del cultivo en cada formato');
 }
 await run("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Pausa').click()");await frames();assert.equal(await run('qaStore.getSnapshot().paused'),true);
 const count=await run('voiceRequests.length');await run("document.querySelector('[aria-label=\"Repetir mensaje de voz\"]').click()");assert.equal(await run('voiceRequests.length'),count,'Pausa sin narración en segundo plano');
 await run("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Continuar misión').click()");await frames();assert.ok(await run('voiceRequests.length')>count);
 await go('Refugio');await run("while(qaStore.getSnapshot().campaign.base.activeMs<90000)qaStore.tick(100)");await frames();await wait("voiceRequests.some(text=>text.includes('¡Alerta solar!'))");assert.ok(await run("voiceRequests.some(text=>text.includes('¡Alerta solar!'))"),'La emergencia también se anuncia por voz');
 assert.equal(errors.length,0,errors.join('\n'));await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,voiceRequests:await run('voiceRequests'),views,errors},null,2));console.log(JSON.stringify({output,passed:true,viewports:views.length,voiceRequested:true}));
}finally{await cmd('Page.close');ws.close();}
