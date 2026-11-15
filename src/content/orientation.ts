import type {Campaign} from '../game/campaign';
export type Zone='hangar'|'travel'|'base'|'outside';
export function zoneFor(s:Campaign):Zone|null{
  if(s.phase==='travel')return 'travel';
  if(s.phase==='equipment'||s.phase==='ship'||s.phase==='shelter')return s.editingBase?'base':'hangar';
  if(s.phase==='base')return s.excursion?'outside':'base';
  return null;
}
const NUMBERS:Record<Zone,Record<string,number>>={hangar:{equipment:1,ship:2},travel:{travel:1,check:2,avatar:3},base:{equipment:1,lab:2,comms:3,batteries:4,thermal:5,air:6,water:7,exit:8,greenhouse:9,shelter:10},outside:{work:1}};
export function pointNumber(zone:Zone,id:string){return NUMBERS[zone][id]??1;}
export function missionProgress(s:Campaign){
  if(s.phase==='travel')return {label:'VIAJE',current:s.travel.leg===0?1:s.travel.leg===1?(s.flightCheck<3?2:3):s.travel.leg===2?4:5,total:5};
  if(s.phase==='equipment'||s.phase==='ship'||s.phase==='shelter')return {label:'PREPARAR',current:s.phase==='equipment'?1:2,total:2};
  if(s.phase==='launch')return {label:'DESPEGUE',current:s.flightStep+1,total:3};
  if(s.excursion)return {label:'SALIDA',current:s.excursion.stage==='outbound'?1:s.excursion.stage==='work'?2:3,total:3};
  if(s.phase==='base'){
    const tasks=[!!s.base.stations.air.batteryId,!!s.base.stations.water.batteryId,!!s.base.stations.thermal.batteryId,s.repairs.recycler,s.repairs.relay,s.base.avatar.done,s.base.comms.transmitted,s.base.greenhouse.harvests>0];
    const missing=tasks.findIndex(done=>!done);return {label:'BASE',current:missing<0?9:missing+1,total:9};
  }
  return {label:'MISIÓN',current:1,total:1};
}
export const ZONE_GUIDES:Record<Zone,{title:string;goal:string;rules:string[];start:string}>={
  hangar:{title:'Antes de salir: prepara tu rescate',goal:'Tu traje y tu nave deben ayudarte a llegar con reservas.',rules:['Traje (1): arrastra tres mejoras. Cada ventaja tiene un costo.','Nave (2): elige agua, comida, batería y dos protecciones de refugio. Puedes cambiar el traje antes de despegar.'],start:'Preparar mi misión'},
  travel:{title:'Tu misión durante el viaje',goal:'Llegar a Marte con agua y energía.',rules:['Ventana (1): recorre tres tramos. El número de paso cambia cuando avanzas.','Consola (2): en el segundo tramo, revisa tres controles en orden. AVATAR (3) te enseña a comparar muestras.'],start:'Entrar a la cabina'},
  base:{title:'Tu misión en la base',goal:'Repara agua y radio, completa AVATAR y consigue una cosecha. Después vuelve con la tripulación.',rules:['Las barras BASE son de todos. TRAJE es tu mochila: recárgala junto a Aire, Baterías o Calor.','Tienes cuatro baterías para seis estaciones. Muévelas para cuidar aire, agua y calor. Si una reserva llega a cero, puedes reintentar.','Supera una alerta solar y una avería. Ante la alerta, baja al Refugio (10). Tienes cinco minutos de juego activo; leer aquí no gasta reservas.'],start:'Ayudar a la tripulación'},
  outside:{title:'Antes de caminar por Marte',goal:'Repara el equipo (1) y vuelve con reservas.',rules:['Tu aire debe alcanzar para ir, reparar y regresar. Volver también gasta aire.','Afuera no recargas: vuelve a Aire para oxígeno, Baterías para energía y Calor para abrigo. Quédate junto al punto y comprueba su suministro.'],start:'Comenzar la salida'},
};
export const PLACE_HELP:Record<string,string>={
  equipment:'Aquí eliges tres ventajas y limpias el traje. Para recargar oxígeno, energía o abrigo debes visitar sus puntos en la base.',ship:'Aquí eliges nave, suministros y refugio antes de despegar.',travel:'Aquí eliges el siguiente tramo. Ahorrar conserva energía; observar registra una observación y gasta más.',check:'Aquí revisas la nave: primero lees, luego ajustas y al final compruebas.',avatar:'Aquí comparas una muestra que viaja con otra que se queda en la Tierra.',lab:'Aquí preparas la comparación AVATAR. Con energía, el laboratorio termina el informe.',comms:'Envía el informe cuando AVATAR esté listo. Necesita una batería.',batteries:'Recoge una de las cuatro baterías para encender una estación. Aquí también recargas las herramientas del traje si hay una batería libre que funcione.',thermal:'Con batería mantiene calor en la base. Quédate junto a este punto para recuperar el abrigo del traje.',air:'Con batería mantiene el aire de la base. Quédate junto a este punto para rellenar el oxígeno del traje; si está apagado no recarga.',water:'Con una batería recupera agua; al retirarla, la reserva baja poco a poco.',exit:'Elige qué equipo reparar afuera. Guarda aire para el regreso.',greenhouse:'Con agua y una batería las plantas crecen. Una cosecha da alimento a la tripulación.',shelter:'Protege a la tripulación durante la alerta solar. Quédate dentro hasta que termine.',work:'Prepara tus mejoras, repara y vuelve a la base antes de agotar reservas.',
};
