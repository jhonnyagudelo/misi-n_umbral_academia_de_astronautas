import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const output=path.join(process.env.TEMP,'umbral-playground-qa');await fs.mkdir(output,{recursive:true});
const target=await(await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let serial=0;const pending=new Map();const errors=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);};
const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>reject(new Error(method)),15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
async function run(expression){const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}
async function wait(expression){for(let i=0;i<350;i++){if(await run(expression))return;await new Promise(r=>setTimeout(r,40));}throw new Error(expression);}
async function click(text){await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()===${JSON.stringify(text)})`);await run(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');}
async function shot(name){await run("document.querySelector('astro-dev-toolbar')?.remove()");const s=await cmd('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(output,name+'.png'),Buffer.from(s.data,'base64'));}
await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});await cmd('Page.navigate',{url:'http://127.0.0.1:4321/juego'});
await wait("!!document.querySelector('.pg-field')&&!document.querySelector('astro-island').hasAttribute('ssr')");
await run("(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/game/campaign-store.ts')).name;window.qaStore=(await import(url)).campaignStore;qaStore.dispatch({type:'restart'});return true})()");
await click('¡Voy al rescate! →');await click('Pausa');await click('Continuar misión');await run("document.querySelector('[aria-label=\"Ir a Traje\"]').click()");
await run('for(let i=0;i<60;i++)qaStore.tick(100)');await wait("!!document.querySelector('.pg-panel[open]')");
assert.equal(await run('qaStore.getSnapshot().paused'),true);
assert.equal(await run("document.querySelectorAll('dialog[open]').length"),1,'A decision must not open a second manual pause');
for(const [id,slot]of [['lung',0],['armor',1],['gloves',2]])await run(`(()=>{const d=new DataTransfer();d.setData('text/plain','${id}');document.querySelector('[data-pg-slot="${slot}"]').dispatchEvent(new DragEvent('drop',{dataTransfer:d,bubbles:true,cancelable:true}))})()`);
await shot('traje');
for(const [width,height]of [[390,844],[320,480],[568,320]]){await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');const p=await run('(()=>{const e=document.querySelector(".pg-panel");return {h:e.clientHeight,sh:e.scrollHeight,w:e.clientWidth,sw:e.scrollWidth}})()');assert.ok(p.sh<=p.h+2&&p.sw<=p.w+2,JSON.stringify({width,height,...p}));await shot('traje-'+width+'x'+height);}
await cmd('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});await click('¡Traje listo!');
// Reopen accepted gear by walking back to the suit, before choosing a ship.
await run("document.querySelector('[aria-label=\"Ir a Traje\"]').click()");await run('for(let i=0;i<60;i++)qaStore.tick(100)');await wait("!!document.querySelector('.pg-upgrades')");
assert.deepEqual(await run('qaStore.getSnapshot().campaign.upgrades'),['lung','armor','gloves']);
await run("(()=>{const d=new DataTransfer();d.setData('text/plain','shield');document.querySelector('[data-pg-slot=\"0\"]').dispatchEvent(new DragEvent('drop',{dataTransfer:d,bubbles:true,cancelable:true}))})()");await shot('traje-reabierto');await click('¡Traje listo!');
assert.deepEqual(await run('qaStore.getSnapshot().campaign.upgrades'),['shield','armor','gloves']);
await run("document.querySelector('[aria-label=\"Ir a Nave\"]').click()");await run('for(let i=0;i<80;i++)qaStore.tick(100)');await wait("!!document.querySelector('.pg-ship-choices')");
await run("document.querySelectorAll('.pg-ship-choices button')[1].click()");
await run("document.querySelector('[aria-label=\"Cambiar carga 6\"]').click()");const cargoBefore=await run('qaStore.getSnapshot().campaign.cargo');await click('×');
// Reopen after ship/cargo choice, replace gear, and return without resetting cargo.
await run("document.querySelector('[aria-label=\"Ir a Traje\"]').click()");await run('for(let i=0;i<80;i++)qaStore.tick(100)');await wait("!!document.querySelector('.pg-upgrades')");
await run("(()=>{const d=new DataTransfer();d.setData('text/plain','lung');document.querySelector('[data-pg-slot=\"0\"]').dispatchEvent(new DragEvent('drop',{dataTransfer:d,bubbles:true,cancelable:true}))})()");await click('¡Traje listo!');
assert.equal(await run('qaStore.getSnapshot().campaign.ship'),'orion');assert.deepEqual(await run('qaStore.getSnapshot().campaign.cargo'),cargoBefore);
await run("document.querySelector('[aria-label=\"Ir a Nave\"]').click()");await run('for(let i=0;i<80;i++)qaStore.tick(100)');await wait("!!document.querySelector('.pg-ship-choices')");
await click('¡Despegar!');await wait("qaStore.getSnapshot().campaign.phase==='travel'");
await run("document.querySelector('[aria-label=\"Ir a Ventana\"]').click()");await run('for(let i=0;i<90;i++)qaStore.tick(100)');await wait("!!document.querySelector('.pg-panel[open]')");await click('Ahorrar energía y continuar');
await run("document.querySelector('[aria-label=\"Ir a Consola\"]').click()");await run('for(let i=0;i<90;i++)qaStore.tick(100)');await wait("!!document.querySelector('.pg-checks')");
await run("document.querySelectorAll('.pg-checks button')[0].click()");await run("document.querySelectorAll('.pg-checks button')[1].click()");await run("document.querySelectorAll('.pg-checks button')[2].click()");await click('¡Todo listo!');
// Finish travel using public actions; movement and decision panels above are exercised through UI.
await run("qaStore.dispatch({type:'travel',mode:'eco'});qaStore.dispatch({type:'travel',mode:'eco'});qaStore.dispatch({type:'land'})");
await wait("document.querySelectorAll('.pg-base .pg-object').length===10");
const results=[];
for(const [width,height]of [[1366,768],[1024,600],[390,844],[320,480],[844,390],[568,320]]){
 await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 const m=await run('({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,scene:document.querySelector(".pg-field").getBoundingClientRect().height})');
 assert.ok(m.sw<=width&&m.sh<=height,JSON.stringify(m));assert.ok(m.scene>=100);results.push(m);await shot('base-'+width+'x'+height);
}
await cmd('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
await run("document.querySelector('[aria-label=\"Ir a Baterías\"]').click()");await run('for(let i=0;i<150;i++)qaStore.tick(100)');await wait("!!document.querySelector('.pg-carried')");
await run("document.querySelector('[aria-label=\"Ir a Aire\"]').click()");await run('for(let i=0;i<150;i++)qaStore.tick(100)');
assert.equal(await run('qaStore.getSnapshot().campaign.base.batteries.b1.station'),'air');
assert.equal(await run("!!document.querySelector('.pg-carried')"),false);
await run("document.querySelector('[aria-label=\"Ir a Traje\"]').click()");await run('for(let i=0;i<90;i++)qaStore.tick(100)');await wait("!!document.querySelector('.pg-upgrades')");
await click('×');assert.equal(await run('qaStore.getSnapshot().campaign.phase'),'base');assert.equal(await run('qaStore.getSnapshot().paused'),false);
await shot('base-desktop');
await run("qaStore.dispatch({type:'base-action',action:{type:'place-battery',batteryId:'b4',stationId:'lab'}});document.querySelector('[aria-label=\"Ir a AVATAR\"]').click()");await run('for(let i=0;i<150;i++)qaStore.tick(100)');await wait("!!document.querySelector('.avatar-activity')");
await click('Recoger batería');assert.equal(await run('qaStore.getSnapshot().campaign.base.batteries.b4.station'),null);assert.equal(await run("!!document.querySelector('.pg-carried')"),true);
await run("document.querySelector('[aria-label=\"Ir a Refugio\"]').click()");await run('for(let i=0;i<300;i++)qaStore.tick(100)');
assert.equal(await run('qaStore.getSnapshot().campaign.base.inShelter'),true);
await run("while(qaStore.getSnapshot().campaign.base.activeMs<115000&&qaStore.getSnapshot().campaign.phase==='base')qaStore.tick(100);document.querySelector('.pg-field').focus()");
await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'e',code:'KeyE',windowsVirtualKeyCode:69});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'e',code:'KeyE',windowsVirtualKeyCode:69});
assert.equal(await run('qaStore.getSnapshot().campaign.base.inShelter'),true,'E must not exit the refuge invisibly during an alert');
assert.equal(errors.length,0,errors.join('\n'));
await fs.writeFile(path.join(output,'results.json'),JSON.stringify({results,errors,movement:true,gear:true,ship:true,travel:true,station:true,labCancel:true},null,2));
console.log(JSON.stringify({output,passed:true,errors,viewports:results.length}));await cmd('Page.close');ws.close();
