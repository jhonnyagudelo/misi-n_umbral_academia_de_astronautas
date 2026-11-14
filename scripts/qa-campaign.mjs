import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = process.env.UMBRAL_QA_DIR ?? path.join(process.env.TEMP, 'mision-umbral-campaign-qa');
await fs.mkdir(output, { recursive: true });
const target = await (await fetch('http://127.0.0.1:9223/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0; let interceptedDrag = null; const pending = new Map(); const errors = []; const results = [];
ws.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const p = pending.get(message.id); if (!p) return; pending.delete(message.id); clearTimeout(p.timer);
    message.error ? p.reject(message.error) : p.resolve(message.result);
  } else if (message.method === 'Input.dragIntercepted') interceptedDrag = message.params.data;
  else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
};
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const current = ++id; const timer = setTimeout(() => { pending.delete(current); reject(new Error(`Timeout: ${method}`)); }, 20000);
    pending.set(current, { resolve, reject, timer }); ws.send(JSON.stringify({ id: current, method, params }));
  });
}
async function run(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await run(expression)) return;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error(`UI did not settle: ${expression}`);
}
async function click(text) {
  await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()===${JSON.stringify(text)})`);
  await run(`(()=>{const button=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!button)throw new Error('Missing button: '+${JSON.stringify(text)});if(button.disabled)throw new Error('Disabled button: '+${JSON.stringify(text)});button.click()})()`);
  await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
}
async function capture(name) {
  await run("document.querySelector('astro-dev-toolbar')?.remove()");
  await run('document.fonts.ready');
  const layout = await command('Page.getLayoutMetrics');
  const size = layout.cssContentSize;
  const shot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x:0, y:0, width:size.width, height:size.height, scale:1 } });
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
}
async function metrics(name) {
  const value = await run(`(()=>({name:${JSON.stringify(name)},width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,images:Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0),heading:document.querySelector('h1')?.textContent,font:getComputedStyle(document.querySelector('h1')).fontFamily}))()`);
  assert.ok(value.scrollWidth <= value.width, `Overflow: ${name}`); assert.ok(value.images, `Missing image: ${name}`); assert.ok(value.font.includes('Pixelify')); results.push(value);
}
await command('Runtime.enable'); await command('Page.enable');
await command('Emulation.setDeviceMetricsOverride', { width: 1366, height: 1000, deviceScaleFactor: 1, mobile: false });
await command('Page.navigate', { url: 'http://127.0.0.1:4321/juego' });
await wait("!!document.querySelector('astro-island') && !document.querySelector('astro-island').hasAttribute('ssr')");
await run("localStorage.removeItem('mision-umbral-campaign-v2'); document.querySelector('astro-dev-toolbar')?.remove()");
await metrics('intro-desktop'); await capture('01-intro-desktop');
await click('Recibir transmisión →'); await click('¿Hola? ¿Nos escuchan? →'); await capture('02-reclutamiento'); await click('¡Aquí estoy! →'); await click('Preparar mi traje →');
await wait("document.querySelectorAll('.card-select').length===6");
// Native mouse drag: exercise the browser's dragstart, then deliver intercepted drag data.
await run("document.querySelector('.card-select').scrollIntoView({block:'end'})");
const dragPoints = await run("(()=>{const a=document.querySelector('.card-select').getBoundingClientRect(),b=document.querySelector('[data-upgrade-slot=\"0\"]').getBoundingClientRect();return {from:{x:a.x+a.width/2,y:a.y+a.height/2},to:{x:b.x+b.width/2,y:b.y+b.height/2}}})()");
await command('Input.setInterceptDrags', { enabled: true });
await command('Input.dispatchMouseEvent', { type:'mouseMoved', ...dragPoints.from });
await command('Input.dispatchMouseEvent', { type:'mousePressed', ...dragPoints.from, button:'left', buttons:1, clickCount:1 });
for(let step=1;step<=12;step++) await command('Input.dispatchMouseEvent', { type:'mouseMoved', x:dragPoints.from.x+(dragPoints.to.x-dragPoints.from.x)*step/12, y:dragPoints.from.y+(dragPoints.to.y-dragPoints.from.y)*step/12, button:'left', buttons:1 });
for(let attempt=0;!interceptedDrag&&attempt<30;attempt++) await new Promise(r=>setTimeout(r,30));
assert.ok(interceptedDrag, 'Native drag must start');
for(const type of ['dragEnter','dragOver','drop']) await command('Input.dispatchDragEvent', { type, ...dragPoints.to, data:interceptedDrag });
await command('Input.dispatchMouseEvent', { type:'mouseReleased', ...dragPoints.to, button:'left', buttons:0, clickCount:1 });
await command('Input.setInterceptDrags', { enabled:false });
await wait("document.querySelectorAll('.equipment-slot.occupied').length===1");
// Exercise real DOM drag/drop bindings with a browser DataTransfer; no state shortcut.
for (const [upgrade, slot] of [['lung', 0], ['armor', 1], ['gloves', 2]]) {
  await run(`(()=>{const data=new DataTransfer();data.setData('text/plain','upgrade:${upgrade}');document.querySelector('[data-upgrade-slot="${slot}"]').dispatchEvent(new DragEvent('drop',{dataTransfer:data,bubbles:true,cancelable:true}))})()`);
}
await wait("document.querySelectorAll('.equipment-slot.occupied').length===3");
assert.equal(await run("document.querySelectorAll('.upgrade-card.is-equipped').length"), 3);
await metrics('equipment-desktop'); await capture('03-equipo-desktop');
// Move the same card to another slot: must never duplicate.
await run("(()=>{const data=new DataTransfer();data.setData('text/plain','upgrade:lung');document.querySelector('[data-upgrade-slot=\"1\"]').dispatchEvent(new DragEvent('drop',{dataTransfer:data,bubbles:true,cancelable:true}))})()");
await wait("document.querySelectorAll('.equipment-slot.occupied').length===2");
await run("(()=>{const data=new DataTransfer();data.setData('text/plain','upgrade:armor');document.querySelector('[data-upgrade-slot=\"0\"]').dispatchEvent(new DragEvent('drop',{dataTransfer:data,bubbles:true,cancelable:true}))})()");
await wait("document.querySelectorAll('.equipment-slot.occupied').length===3");
await click('¿Cómo funciona?');
assert.equal(await run("document.querySelector('dialog').open"), true);
await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await wait("!document.querySelector('dialog')");
await click('Confirmar equipo y elegir nave →');
await wait("document.querySelectorAll('.ship-card').length===2");
await metrics('ships-desktop'); await capture('04-naves-desktop');
await run("document.querySelectorAll('.ship-card')[1].click()");
await wait("document.querySelectorAll('.cargo-slots button').length===6");
for (const [cargo, slot] of [['water', 0], ['food', 1], ['battery', 2], ['water', 3], ['food', 4], ['water', 5]]) {
  await run(`(()=>{const data=new DataTransfer();data.setData('text/plain','cargo:${cargo}');document.querySelectorAll('.cargo-slots button')[${slot}].dispatchEvent(new DragEvent('drop',{dataTransfer:data,bubbles:true,cancelable:true}))})()`);
}
await click('Preparar refugio →');
await run("document.querySelectorAll('.package-card')[0].click()");
await run("document.querySelectorAll('.package-card')[1].click()");
await wait("!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Listos para despegar')).disabled");
await click('¡Listos para despegar! →');
await capture('05-despegue');
await click('Continuar lanzamiento →'); await click('Continuar lanzamiento →'); await click('Comenzar el viaje →');
await click('Consumo moderado');
await click('1. Leer diagnósticoPor comprobar'); await click('2. Aislar equipo auxiliarPor comprobar'); await click('3. Restablecer y comprobarPor comprobar');
await capture('05-diagnostico');
await click('Consumo moderado'); await click('Consumo moderado');
await click('Transferencia y descenso a la base →');
await wait("document.querySelectorAll('.station-machine').length===6");
// Access the existing module in the dev server solely to advance deterministic time in QA.
await run("(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/game/campaign-store.ts'))?.name;if(!url)throw new Error('Store module not loaded');window.qaStore=(await import(url)).campaignStore;return true})()");
await run("qaStore.setPaused(true)");
await wait("!!document.querySelector('.pause-dialog[open]')");
assert.equal(await run("document.querySelector('.pause-dialog').contains(document.activeElement)"), true, 'Pause must move focus into the modal');
await command('Input.dispatchKeyEvent', { type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9 });
await command('Input.dispatchKeyEvent', { type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9 });
assert.equal(await run("document.querySelector('.pause-dialog').contains(document.activeElement)"), true, 'Pause must trap focus');
await click('Continuar misión');
await run("document.querySelector('[aria-label=\"Abrir ayuda\"]').click()");
await wait("!!document.querySelector('dialog[open]')");
const beforeHelp = await run('qaStore.getSnapshot().campaign.base.activeMs');
await run('for(let i=0;i<30;i++)qaStore.tick(100)');
assert.equal(await run('qaStore.getSnapshot().campaign.base.activeMs'), beforeHelp, 'Reading must pause');
await click('Volver al juego');
await metrics('base-desktop'); await capture('06-base-desktop');
await click('Conectar B1');
assert.equal(await run('qaStore.getSnapshot().campaign.base.batteries.b1.station'), 'air');
await run("document.querySelector('.base-scene').focus()");
const initialX = await run('qaStore.getSnapshot().campaign.targetX');
await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
assert.ok(await run(`qaStore.getSnapshot().campaign.targetX>${initialX}`), 'Keyboard movement');
await click('Laboratorio: cambiar y recargar traje');
await wait("document.querySelectorAll('.card-select').length===6");
await run("document.querySelectorAll('.card-select')[5].click()");
await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await wait("document.querySelectorAll('.equipment-slot.occupied').length===3");
assert.ok(await run("qaStore.getSnapshot().campaign.upgrades.includes('radio')"), 'Keyboard slot placement');
await click('Guardar traje y volver a la base →');
await run('qaStore.setPaused(true)');
const checkpointBeforeReload = await run('JSON.parse(localStorage.getItem("mision-umbral-campaign-v2")).checkpoint');
assert.equal(checkpointBeforeReload.base.batteries.b1.station, 'air');
await command('Page.reload');
await wait("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Continuar misión guardada'))");
await click('Continuar misión guardada');
await wait("document.querySelectorAll('.station-machine').length===6");
await run("(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/game/campaign-store.ts'))?.name;window.qaStore=(await import(url)).campaignStore;return true})()");
assert.equal(await run('qaStore.getSnapshot().campaign.base.batteries.b1.station'), 'air');
assert.ok(await run("qaStore.getSnapshot().campaign.upgrades.includes('radio')"));

// Responsive equipment and ship layout, at normal zoom and a 200%-equivalent viewport.
await run("qaStore.dispatch({type:'restart'});qaStore.dispatch({type:'skip-intro'})");
for (const [width,height] of [[1366,768],[390,844],[320,480],[844,390],[683,384]]) {
  await command('Emulation.setDeviceMetricsOverride', { width,height,deviceScaleFactor:1,mobile:false });
  await metrics(`equipment-${width}x${height}`); await capture(`07-equipo-${width}x${height}`);
}
await command('Emulation.setDeviceMetricsOverride', { width:390,height:844,deviceScaleFactor:1,mobile:true });
await command('Emulation.setTouchEmulationEnabled', { enabled:true,maxTouchPoints:1 });
await run("document.querySelector('.card-select').scrollIntoView({block:'end'})");
const touchPoints = await run("(()=>{const a=document.querySelector('.card-select').getBoundingClientRect(),b=document.querySelector('[data-upgrade-slot=\"0\"]').getBoundingClientRect();return {from:{x:a.x+a.width/2,y:a.y+a.height/2},to:{x:b.x+b.width/2,y:b.y+b.height/2}}})()");
await command('Input.dispatchTouchEvent', { type:'touchStart',touchPoints:[{...touchPoints.from,id:1,radiusX:4,radiusY:4,force:1}] });
for(let step=1;step<=10;step++) {
  await command('Input.dispatchTouchEvent', { type:'touchMove',touchPoints:[{x:touchPoints.from.x+(touchPoints.to.x-touchPoints.from.x)*step/10,y:touchPoints.from.y+(touchPoints.to.y-touchPoints.from.y)*step/10,id:1,radiusX:4,radiusY:4,force:1}] });
}
await command('Input.dispatchTouchEvent', { type:'touchEnd',touchPoints:[] });
await wait("document.querySelectorAll('.equipment-slot.occupied').length===1");
assert.ok(await run("qaStore.getSnapshot().campaign.upgrades.includes('lung')"), 'Native touch drag');
await command('Emulation.setTouchEmulationEnabled', { enabled:false });
await run("for(const [slot,id] of ['lung','armor','gloves'].entries())qaStore.dispatch({type:'equip',id,slot});qaStore.dispatch({type:'confirm-equipment'})");
for (const [width,height] of [[1366,768],[390,844],[320,480]]) {
  await command('Emulation.setDeviceMetricsOverride', { width,height,deviceScaleFactor:1,mobile:false });
  await metrics(`ships-${width}x${height}`); await capture(`08-naves-${width}x${height}`);
}
await command('Emulation.setDeviceMetricsOverride', { width:1366,height:900,deviceScaleFactor:1,mobile:false });
// Drive the same public actions through one whole winning game; shorten waits with explicit ticks.
await run(`(()=>{
 const d=qaStore.dispatch;d({type:'choose-ship',ship:'orion'});
 ['water','food','battery','water','food','water'].forEach((cargo,slot)=>d({type:'cargo',cargo,slot}));
 d({type:'confirm-ship'});d({type:'shelter',ids:['light','supplies']});d({type:'launch'});
 for(let i=0;i<3;i++)d({type:'advance-flight'});for(let i=0;i<3;i++){if(i===1)for(let control=0;control<3;control++)d({type:'flight-control',control});d({type:'travel',mode:'eco'});}d({type:'land'});
 for(const [batteryId,stationId] of [['b1','air'],['b2','water'],['b3','thermal'],['b4','lab']])d({type:'base-action',action:{type:'place-battery',batteryId,stationId}});
 d({type:'walk',x:71});for(let i=0;i<100;i++)qaStore.tick(100);
})()`);
await wait("document.querySelectorAll('.station-machine').length===6");
await run("document.querySelectorAll('.station-machine')[4].click()");
await run('for(let i=0;i<10;i++)qaStore.tick(100)');
await click('Realizar actividad AVATAR');
for(const [index,value] of ['model','flight','control'].entries()) {
  await run(`(()=>{const select=document.querySelectorAll('.avatar-question select')[${index}];select.value=${JSON.stringify(value)};select.dispatchEvent(new Event('change',{bubbles:true}))})()`);
}
await click('Comprobar comparación');
assert.equal(await run('qaStore.getSnapshot().campaign.base.avatar.interactionDone'), true);
await capture('09-avatar'); await click('Volver al juego');
await run("qaStore.dispatch({type:'excursion',site:'relay',route:'long'});for(let i=0;i<100;i++)qaStore.tick(100)");
await wait("!!document.querySelector('.surface-scene')");
await metrics('outside-desktop'); await capture('10-salida-desktop');
await command('Emulation.setDeviceMetricsOverride', { width:390,height:844,deviceScaleFactor:1,mobile:false });
await metrics('outside-mobile'); await capture('10-salida-mobile');
await command('Emulation.setDeviceMetricsOverride', { width:1366,height:900,deviceScaleFactor:1,mobile:false });
await run(`(()=>{
 const d=qaStore.dispatch;
 for(let i=0;i<1800&&qaStore.getSnapshot().campaign.excursion&&qaStore.getSnapshot().campaign.phase==='base';i++){
  const s=qaStore.getSnapshot().campaign;
  if(s.excursion.stage==='work'&&s.excursion.progress===0)d({type:'work'});
  if(s.repairs.relay&&s.excursion.stage==='work')d({type:'return-outside'});
  qaStore.tick(100);
 }
 const s=qaStore.getSnapshot().campaign;if(s.phase!=='base'||!s.repairs.relay)throw new Error(s.cause||'relay not complete');
 d({type:'base-action',action:{type:'place-battery',batteryId:'b4',stationId:'comms'}});
 d({type:'base-action',action:{type:'set-shelter-presence',inside:true}});
 for(let i=0;i<1500&&qaStore.getSnapshot().campaign.base.solar.status!=='resolved';i++)qaStore.tick(100);
})()`);
assert.equal(await run('qaStore.getSnapshot().campaign.phase'), 'base');
await capture('11-refugio');
await run(`(()=>{
 const d=qaStore.dispatch;d({type:'base-action',action:{type:'set-shelter-presence',inside:false}});
 d({type:'base-action',action:{type:'place-battery',batteryId:'b4',stationId:'greenhouse'}});
 d({type:'open-lab'});d({type:'confirm-equipment'});d({type:'excursion',site:'recycler',route:'long'});
 for(let i=0;i<1500&&qaStore.getSnapshot().campaign.excursion&&qaStore.getSnapshot().campaign.phase==='base';i++){
  const s=qaStore.getSnapshot().campaign;
  if(s.excursion.stage==='work'&&s.excursion.progress===0)d({type:'work'});
  if(s.repairs.recycler&&s.excursion.stage==='work')d({type:'return-outside'});
  qaStore.tick(100);
 }
 for(let i=0;i<1500&&qaStore.getSnapshot().campaign.phase==='base';i++)qaStore.tick(100);
})()`);
assert.equal(await run('qaStore.getSnapshot().campaign.phase'), 'return', await run('qaStore.getSnapshot().campaign.cause'));
await wait("document.querySelector('h1')?.textContent.includes('base vuelve')");
await capture('12-regreso'); await click('¿Qué aprendimos? →');
await metrics('debrief-desktop'); await capture('13-reflexion');
assert.equal(errors.length, 0, errors.join('\n'));
await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ results, errors, flow: 'intro → equipment → ship → cargo → shelter → launch → travel → base → repair → shelter → repair → return → debrief', saveReload: true, keyboard: true, nativeMouseDrag: true, nativeTouchDrag:true, domDragDrop: true, readingPause: true }, null, 2));
console.log(JSON.stringify({ output, viewports: results.length, errors, passed: true }, null, 2));
await command('Page.close'); ws.close();
