import {afterEach,describe,it,expect,vi} from 'vitest';
import {createSpaceMusic} from './useSpaceMusic';
class FakeAudio {
  static instances:FakeAudio[]=[];
  state:AudioContextState='running';currentTime=0;destination={};tones=0;gainValues:number[]=[];
  operations:{kind:'resume'|'suspend';finish:()=>void}[]=[];
  constructor(){FakeAudio.instances.push(this);}
  createGain(){return {gain:{value:0,setValueAtTime:()=>{},linearRampToValueAtTime:()=>{},setTargetAtTime:(v:number)=>this.gainValues.push(v)},connect:()=>{},disconnect:()=>{}};}
  createOscillator(){this.tones++;return {frequency:{value:0},type:'sine',connect:()=>{},disconnect:()=>{},start:()=>{},stop:()=>{},onended:null};}
  suspend(){return new Promise<void>(resolve=>this.operations.push({kind:'suspend',finish:()=>{this.state='suspended';resolve();}}));}
  resume(){return new Promise<void>(resolve=>this.operations.push({kind:'resume',finish:()=>{this.state='running';resolve();}}));}
  close(){this.state='closed';return Promise.resolve();}
}
const settings={enabled:true,paused:false,hidden:false,speaking:false};
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
function setup(){vi.useFakeTimers();FakeAudio.instances=[];const player=createSpaceMusic(FakeAudio as unknown as typeof AudioContext);player.update(settings);player.activate();return{player,audio:FakeAudio.instances[0]};}
afterEach(()=>vi.useRealTimers());
describe('banda sonora serial',()=>{
 it('reconcilia activar mientras suspend todavía está pendiente sin dejar música apagada',async()=>{
   const {player,audio}=setup();player.update({...settings,enabled:false});expect(audio.operations.map(v=>v.kind)).toEqual(['suspend']);
   player.update(settings);expect(audio.operations).toHaveLength(1);audio.operations[0].finish();await flush();
   expect(audio.operations.map(v=>v.kind)).toEqual(['suspend','resume']);audio.operations[1].finish();await flush();expect(audio.state).toBe('running');player.dispose();
 });
 it('apaga si una reanudación antigua termina después de silenciar u ocultar',async()=>{
   const {player,audio}=setup();player.update({...settings,paused:true});audio.operations[0].finish();await flush();
   player.update(settings);player.update({...settings,hidden:true});expect(audio.operations).toHaveLength(2);
   audio.operations[1].finish();await flush();expect(audio.operations.map(v=>v.kind)).toEqual(['suspend','resume','suspend']);
   audio.operations[2].finish();await flush();expect(audio.state).toBe('suspended');player.dispose();
 });
 it('reactivar conserva los tonos suspendidos y no crea otro acorde encima',async()=>{
   const {player,audio}=setup();expect(audio.tones).toBe(3);
   player.update({...settings,enabled:false});audio.operations[0].finish();await flush();
   player.update(settings);audio.operations[1].finish();await flush();player.activate();expect(audio.tones).toBe(3);
   audio.currentTime=4.6;vi.advanceTimersByTime(4500);expect(audio.tones).toBe(6);expect(FakeAudio.instances).toHaveLength(1);player.dispose();
 });
 it('reduce el volumen bajo la voz y limpia el contexto sin más tonos al desmontar',async()=>{
   const {player,audio}=setup();player.update({...settings,speaking:true});expect(audio.gainValues.at(-1)).toBeLessThan(.015);
   player.update(settings);expect(audio.gainValues.at(-1)).toBe(.035);player.dispose();audio.currentTime=40;vi.advanceTimersByTime(10000);
   expect(audio.tones).toBe(3);expect(audio.state).toBe('closed');
 });
});
