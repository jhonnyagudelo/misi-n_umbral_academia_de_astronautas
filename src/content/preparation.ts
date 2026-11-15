import {arrivalWater,cargoMass,type Campaign} from '../game/campaign';
import {dispatch} from '../game/rules/engine';
import {PACKAGES,shelterDwellMs} from '../game/rules/balance';
import type {PackageId} from '../game/rules/types';
export function preparationPreview(s:Campaign,packages:PackageId[]){
  const base=dispatch(dispatch(s.base,{type:'choose-shelter',packageIds:packages}),{type:'start-mission'});
  const shelterMass=packages.reduce((sum,id)=>sum+PACKAGES[id].mass,0);
  return {counts:{water:s.cargo.filter(id=>id==='water').length,food:s.cargo.filter(id=>id==='food').length,battery:s.cargo.filter(id=>id==='battery').length},cargoMass:cargoMass(s),shelterMass,water:arrivalWater(base.reserves.water,s.cargo),shelterSeconds:shelterDwellMs(shelterMass)/1000};
}
export const CARGO_INFO={
  water:{name:'Agua',effect:'Cada bolsa añade 5 de agua al llegar a la base.',mass:1},
  food:{name:'Comida',effect:'Necesitas al menos una para el viaje. Las raciones extra aún no dan otra ventaja.',mass:1},
  battery:{name:'Batería',effect:'Necesitas al menos una para el viaje. Las extra no aumentan las cuatro baterías de la base.',mass:2},
} as const;
