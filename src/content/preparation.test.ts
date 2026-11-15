import {describe,it,expect} from 'vitest';
import {actCampaign as act,createCampaign,type CargoId} from '../game/campaign';
import {preparationPreview} from './preparation';
function prepared(){let s=act(createCampaign(),{type:'skip-intro'});(['lung','armor','gloves'] as const).forEach((id,slot)=>s=act(s,{type:'equip',id,slot}));s=act(s,{type:'confirm-equipment'});s=act(s,{type:'choose-ship',ship:'orion'});(['water','food','battery','water','food','water'] as CargoId[]).forEach((cargo,slot)=>s=act(s,{type:'cargo',cargo,slot}));return s;}
describe('comparación de preparación',()=>{
  it('expone el coste de agua y tiempo real de las tres combinaciones de refugio',()=>{
    const s=prepared();
    expect(preparationPreview(s,['light','supplies'])).toMatchObject({water:66,shelterSeconds:35,shelterMass:3});
    expect(preparationPreview(s,['light','reinforced'])).toMatchObject({water:63,shelterSeconds:25,shelterMass:4});
    expect(preparationPreview(s,['supplies','reinforced'])).toMatchObject({water:60,shelterSeconds:20,shelterMass:5});
    expect(preparationPreview(act(s,{type:'cargo',slot:0,cargo:'food'}),['light','supplies']).water).toBe(61);
  });
  it('cuenta sin inventar efectos de comida o baterías adicionales',()=>{
    const s=prepared();const preview=preparationPreview(s,['light','supplies']);
    expect(preview.counts).toEqual({water:3,food:2,battery:1});expect(preview.cargoMass).toBe(7);
    const extraBattery=preparationPreview(act(s,{type:'cargo',slot:4,cargo:'battery'}),['light','supplies']);
    expect(extraBattery.water).toBe(preview.water);expect(extraBattery.cargoMass).toBe(8);
  });
});
