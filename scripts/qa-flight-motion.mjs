import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const output=path.join(process.env.TEMP,'umbral-flight-motion-qa');await fs.mkdir(output,{recursive:true});
const target=await(await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let serial=0;const pending=new Map(),errors=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);};
const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>reject(new Error(method)),20000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
async function run(expression){const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(expression){for(let i=0;i<350;i++){if(await run(expression))return;await sleep(40);}throw new Error(expression);}
async function shot(name){await run("document.querySelector('astro-dev-toolbar')?.remove()");const s=await cmd('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(output,name+'.png'),Buffer.from(s.data,'base64'));}
async function key(type,key='ArrowRight',repeat=false){await cmd('Input.dispatchKeyEvent',{type,key,code:key==='ArrowRight'?'ArrowRight':'ArrowLeft',windowsVirtualKeyCode:key==='ArrowRight'?39:37,autoRepeat:repeat});}
try {
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await cmd('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});await cmd('Page.navigate',{url:'http://127.0.0.1:4321/juego'});
 await wait("!!document.querySelector('.pg-field')&&!document.querySelector('astro-island').hasAttribute('ssr')");
 await run("(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/game/campaign-store.ts')).name;window.qaStore=(await import(url)).campaignStore;qaStore.dispatch({type:'restart'});qaStore.dispatch({type:'skip-intro'});document.querySelector('.pg-field').focus()})()");
 const start=await run('qaStore.getSnapshot().campaign.playerX');await key('keyDown');await sleep(85);await key('keyUp');await sleep(60);const released=await run('qaStore.getSnapshot().campaign.playerX');await sleep(600);const stopped=await run('qaStore.getSnapshot().campaign.playerX');
 const motion={start,released,stopped,distance:stopped-start,coast:stopped-released};console.log(JSON.stringify({motion}));await fs.writeFile(path.join(output,'tap.json'),JSON.stringify(motion,null,2));
 assert.ok(motion.distance>0&&motion.distance<2.5,'Una pulsación breve debe mover poco');assert.ok(motion.coast<.15,'Al soltar debe detenerse');
 assert.equal(await run("!!document.querySelector('.pg-walking')"),false,'Los pasos visuales también se detienen');
 const touch=await run("(()=>{const r=document.querySelector('[aria-label=\"Caminar a la derecha\"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await sleep(140);await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(70);const touchStop=await run('qaStore.getSnapshot().campaign.playerX');await sleep(300);assert.equal(await run('qaStore.getSnapshot().campaign.playerX'),touchStop,'Al soltar la flecha táctil debe detenerse');
 await run("document.querySelector('.pg-field').focus()");
 // A repeat storm cannot queue a long walk beyond the held interval.
 await key('keyDown');for(let i=0;i<12;i++)await key('keyDown','ArrowRight',true);await sleep(120);await key('keyUp');await sleep(60);const repeatStop=await run('qaStore.getSnapshot().campaign.playerX');await sleep(400);assert.ok(Math.abs(await run('qaStore.getSnapshot().campaign.playerX')-repeatStop)<.15);
 await key('keyDown');await sleep(150);await run("window.dispatchEvent(new Event('blur'))");await sleep(60);const blurred=await run('qaStore.getSnapshot().campaign.playerX');await sleep(300);assert.ok(Math.abs(await run('qaStore.getSnapshot().campaign.playerX')-blurred)<.15,'Perder foco detiene el movimiento');await key('keyUp');
 // Pausing while holding a key must not restart movement on resume.
 await key('keyDown');await sleep(100);await run('qaStore.setPaused(true)');await sleep(50);const paused=await run('qaStore.getSnapshot().campaign.playerX');await key('keyUp');await run('qaStore.setPaused(false)');await sleep(300);assert.equal(await run('qaStore.getSnapshot().campaign.playerX'),paused);
 await shot('hangar');
 await run("qaStore.dispatch({type:'walk',x:50});window.positions=[];window.sampler=qaStore.subscribe(()=>positions.push({t:performance.now(),x:qaStore.getSnapshot().campaign.playerX}))");await sleep(1200);
 const frame=await run('(()=>{sampler();const p=positions.filter((p,i)=>i>0&&p.x!==positions[i-1].x);return {updates:p.length}})()');
 const gaps=await run('positions.slice(1).filter((p,i)=>p.x!==positions[i].x).map((p,i,a)=>i?p.t-a[i-1].t:0).filter(x=>x>0)');gaps.sort((a,b)=>a-b);frame.p95=gaps[Math.floor(gaps.length*.95)]??0;assert.ok(frame.updates>25,'El personaje necesita más de diez actualizaciones por segundo');
 // Configure through public game actions, then let the actual launch play.
 await run("for(const [slot,id]of ['lung','armor','gloves'].entries())qaStore.dispatch({type:'equip',id,slot});qaStore.dispatch({type:'confirm-equipment'});qaStore.dispatch({type:'choose-ship',ship:'orion'});for(const [slot,cargo]of ['water','food','battery','water','food','water'].entries())qaStore.dispatch({type:'cargo',cargo,slot});qaStore.dispatch({type:'confirm-ship'});qaStore.dispatch({type:'shelter',ids:['light','supplies']});qaStore.dispatch({type:'launch'})");
 await wait("!!document.querySelector('.launch-scene')");await sleep(900);await shot('launch-earth');
 const before=await run("document.querySelector('.launch-vehicle').getBoundingClientRect().y");await sleep(650);const after=await run("document.querySelector('.launch-vehicle').getBoundingClientRect().y");assert.notEqual(before,after,'El cohete debe ascender visiblemente');
 await run('qaStore.setPaused(true)');await sleep(100);const animBefore=await run("document.querySelector('.launch-vehicle').getBoundingClientRect().y");await sleep(700);assert.equal(await run("document.querySelector('.launch-vehicle').getBoundingClientRect().y"),animBefore,'La animación se pausa');await run('qaStore.setPaused(false)');
 await wait("qaStore.getSnapshot().campaign.flightStep===1");await sleep(500);await shot('launch-separation');
 await wait("qaStore.getSnapshot().campaign.flightStep===2");await sleep(600);await shot('launch-space');
 await wait("qaStore.getSnapshot().campaign.phase==='travel'");assert.ok(await run("!!document.querySelector('.pg-flight .space-earth')"));assert.equal(await run("document.querySelectorAll('.pg-flight .pg-dock').length"),0);await shot('space-cabin');
 for(const [width,height]of [[390,844],[568,320],[1366,768]]){await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await sleep(100);assert.ok(await run('document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight'));await shot('space-'+width+'x'+height);}
 await run("qaStore.dispatch({type:'travel',mode:'eco'});for(let control=0;control<3;control++)qaStore.dispatch({type:'flight-control',control});qaStore.dispatch({type:'travel',mode:'eco'});qaStore.dispatch({type:'travel',mode:'eco'});qaStore.dispatch({type:'land'});document.querySelector('.pg-field').focus()");
 const baseBefore=await run('qaStore.getSnapshot().campaign.base.activeMs');await key('keyDown');await sleep(150);await key('keyUp');const baseStop=await run('qaStore.getSnapshot().campaign.playerX');await sleep(300);assert.equal(await run('qaStore.getSnapshot().campaign.playerX'),baseStop);assert.ok(await run('qaStore.getSnapshot().campaign.base.activeMs')>baseBefore,'El reloj de reservas sigue avanzando una sola vez');await shot('base-colors');
 // Second ship and reduced-motion mode: stable illustrations, same automatic progression.
 await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await run("qaStore.dispatch({type:'restart'});qaStore.dispatch({type:'skip-intro'});for(const [slot,id]of ['shield','armor','radio'].entries())qaStore.dispatch({type:'equip',id,slot});qaStore.dispatch({type:'confirm-equipment'});qaStore.dispatch({type:'choose-ship',ship:'apollo'});for(const [slot,cargo]of ['water','food','battery','water'].entries())qaStore.dispatch({type:'cargo',cargo,slot});qaStore.dispatch({type:'confirm-ship'});qaStore.dispatch({type:'shelter',ids:['light','supplies']});qaStore.dispatch({type:'launch'})");
 await wait("!!document.querySelector('.rocket-apollo')");assert.equal(await run("document.querySelectorAll('.rocket-apollo .launch-booster').length"),0);assert.equal(await run("getComputedStyle(document.querySelector('.launch-vehicle')).animationName"),'none');
 await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await shot('launch-mobile');
 await cmd('Emulation.setDeviceMetricsOverride',{width:568,height:320,deviceScaleFactor:1,mobile:false});await shot('launch-landscape');
 await wait("qaStore.getSnapshot().campaign.flightStep===2");assert.equal(await run("document.querySelectorAll('.craft-apollo .solar-wings').length"),0);await shot('apollo-space-reduced');
 await wait("qaStore.getSnapshot().campaign.phase==='travel'");
 assert.equal(errors.length,0,errors.join('\n'));await fs.writeFile(path.join(output,'results.json'),JSON.stringify({motion,frame,errors,passed:true},null,2));console.log(JSON.stringify({output,frame,passed:true}));
} finally {await cmd('Page.close');ws.close();}
