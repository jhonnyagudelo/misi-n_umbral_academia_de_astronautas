import {describe,it,expect} from 'vitest';
import {createLanguageStore,createTranslator} from './locale';
describe('presentation language',()=>{
  it('defaults to English and persists Spanish separately from progress',()=>{
    const data=new Map<string,string>();const port={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};
    const store=createLanguageStore(port);expect(store.get()).toBe('en');store.set('es');
    expect(createLanguageStore(port).get()).toBe('es');expect([...data.keys()]).toEqual(['mision-umbral-language']);
  });
  it('survives blocked storage and ignores unsupported preferences',()=>{
    expect(createLanguageStore({getItem:()=> 'fr',setItem:()=>{}}).get()).toBe('en');
    const store=createLanguageStore({getItem:()=>{throw Error();},setItem:()=>{throw Error();}});store.set('es');expect(store.get()).toBe('es');
  });
  it('translates complete and composed messages without changing values or substring IDs',()=>{
    const translate=createTranslator({'Aire':'Air','Me quedo aquí.':'I stay here.','Recargar oxígeno':'Refill oxygen'},[]);
    expect(translate('Aire (6): 70/140. Me quedo aquí.')).toBe('Air (6): 70/140. I stay here.');
    expect(translate(' Recargar oxígeno ')).toBe(' Refill oxygen ');
    expect(translate('aircraft Aire')).toBe('aircraft Air');
  });
});
