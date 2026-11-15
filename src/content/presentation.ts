import {oxygenCapacity,type Campaign} from '../game/campaign';
import type {BatteryId} from '../game/rules/types';

export function missionText(s:Campaign):string{
  if(s.phase==='failed')return 'Vuelve al punto seguro y prueba otra estrategia.';
  if(s.phase==='return')return 'Regresa con la tripulación.';
  if(s.phase==='debrief')return 'Recuerda lo que aprendiste.';
  if(s.phase==='intro')return 'Rescata a la tripulación de Marte.';
  if(s.phase==='equipment')return 'Elige tres mejoras para tu traje.';
  if(s.phase==='ship'||s.phase==='shelter')return 'Prepara tu nave, tu carga y el refugio.';
  if(s.phase==='launch')return 'Observa el despegue y la separación de etapas.';
  if(s.phase==='travel')return s.travel.leg===3?'Ventana (1): desciende a la base de Marte.':s.travel.leg===1&&s.flightCheck<3?`Consola (2): comprueba el control ${s.flightCheck+1} de 3.`:`Ventana (1): continúa el tramo ${s.travel.leg+1} de 3.`;
  if(s.base.solar.status==='active')return s.base.inShelter?'¡Alerta solar! Espera en el refugio hasta que termine la alerta.':'¡Alerta solar! Entra al refugio del piso cuatro.';
  if(s.excursion)return s.repairs[s.excursion.site]||s.excursion.stage==='return'?'Regresa a la base.':s.excursion.stage==='outbound'?'Llega al equipo que necesita reparación.':'Repara el equipo y vuelve a la base.';
  if(!s.base.stations.air.batteryId)return 'Baterías (4) → lleva una a Aire (6).';
  if(!s.base.stations.water.batteryId)return 'Baterías (4) → lleva una a Agua (7).';
  if(!s.base.stations.thermal.batteryId)return 'Conecta una batería al Calor (5).';
  if(!s.repairs.recycler)return 'Salir (8): repara el reciclador exterior.';
  if(!s.repairs.relay)return 'Salir (8): repara el repetidor exterior.';
  if(!s.base.avatar.done)return 'AVATAR (2): compara muestras y dale energía.';
  if(!s.base.comms.transmitted)return 'Radio (3): envía el informe con energía.';
  if(!s.base.greenhouse.harvests)return 'Cultivo (9): consigue una cosecha.';
  return 'Mantén la base funcionando durante las emergencias.';
}

export function characterThought(s:Campaign,carried:BatteryId|null=null):string{
  if(s.phase==='failed')return 'Ya sé qué falló. Puedo cambiar mi estrategia y volver a intentarlo.';
  if(s.phase==='return')return '¡Qué alivio! La tripulación vuelve a tener agua, calor y lechugas.';
  if(s.phase==='debrief')return 'Quiero recordar qué decisiones ayudaron a la tripulación.';
  if(s.phase==='intro')return '¡Me necesitan! Primero voy a preparar mi traje y mi nave.';
  if(s.phase==='equipment')return '¿Más autonomía o menos polvo? Cada mejora me ayuda, pero también tiene un costo.';
  if(s.phase==='ship'||s.phase==='shelter')return 'Quiero llevar agua, comida y batería. Aún puedo volver al traje si cambio de idea.';
  if(s.phase==='launch')return ['¡Allá vamos! Me fijo en cómo nos alejamos del suelo.','Las etapas usadas se sueltan para que la nave siga más ligera.','¡Qué pequeña se ve la Tierra! La cápsula y su módulo siguen juntos.'][s.flightStep];
  if(s.phase==='travel')return ['Desde aquí veo la Tierra. Me conviene guardar energía para el resto del viaje.','Estamos en sombra. Voy a revisar la consola antes de seguir.','Quiero llegar con agua y batería; no todo lo que consumo se recupera.','Ya estamos cerca de Marte. Este descenso pertenece a nuestra misión futura simulada.'][s.travel.leg];
  if(s.base.solar.status==='active')return s.base.inShelter?'Aquí espero a que pase la alerta. No necesito salir a mover baterías.':'¡Mi prioridad es protegerme! El refugio está abajo, en el piso cuatro.';
  if(s.excursion)return s.excursion.stage==='return'?'Todavía necesito aire para llegar a la esclusa.':s.excursion.stage==='outbound'?'La caminata se ve abreviada, pero guardo aire para trabajar y volver.':s.excursion.progress>0?'Ya estoy reparando. Vigilo el aire mientras termino.':'Estoy frente al equipo. Puedo preparar mis mejoras antes de usar la herramienta.';
  if(s.suit.oxygen<oxygenCapacity(s)*.8)return 'Quiero rellenar el oxígeno del traje. Me quedo junto a Aire, en el piso de hielo y oxígeno, con su batería conectada.';
  if(s.suit.energy<70)return 'Mis herramientas necesitan energía. Me quedo en Baterías con una batería libre para cargarlas.';
  if(s.suit.thermal<75)return 'Voy a Calor para recuperar el abrigo del traje. Necesita su batería conectada.';
  if(carried)return `Tengo la batería ${carried.toUpperCase()}. Puedo llevarla a una estación que esté apagada.`;
  if(s.base.inShelter)return 'El refugio está listo. Puedo salir cuando no haya una alerta activa.';
  if(!s.base.stations.air.batteryId||!s.base.stations.water.batteryId||!s.base.stations.thermal.batteryId)return 'Veo las baterías en el piso dos. Los iconos me muestran qué estación sigue apagada.';
  if(!s.repairs.recycler||!s.repairs.relay)return 'La salida está en el piso tres. Antes de salir puedo revisar mi traje arriba.';
  if(!s.base.avatar.done)return 'Una muestra de vuelo necesita una comparación con una muestra en Tierra.';
  if(!s.base.comms.transmitted)return 'Tengo cuatro baterías para seis estaciones. Puedo cambiar una de sitio para enviar el informe.';
  if(!s.base.greenhouse.harvests)return 'Las plantas necesitan agua y energía. ¡La tripulación extraña las lechugas!';
  return 'Me fijo en las reservas y en los avisos. No necesito encender todo a la vez.';
}

export function thoughtFeedback(text:string):string{
  const value=text.trim();
  if(value.startsWith('Suelta los imanes'))return 'Necesito soltar los imanes de las botas antes de caminar de regreso.';
  if(value.startsWith('La mochila grande'))return 'Mi mochila grande no cabe por el paso estrecho. Puedo elegir la ruta larga.';
  if(value.startsWith('Estabiliza primero'))return 'Necesito recuperar aire, agua y calor hasta 30 antes de cambiar mi traje en el laboratorio.';
  if(value.startsWith('Una batería está averiada'))return '¡Veo una batería averiada! Puedo reorganizar las otras para cuidar aire, agua y calor.';
  if(value.startsWith('La batería averiada'))return '¡Mi batería vuelve a estar disponible!';
  if(value.startsWith('La alerta terminó'))return 'La alerta terminó. Ya puedo salir del refugio.';
  if(value.startsWith('Vamos a '))return value.replace('Vamos a ','Me acerco a ');
  if(value.startsWith('Llevas '))return value.replace('Llevas ','¡Tengo ').replace('. Camina a una estación y pulsa E para conectarla.','! Busco una estación apagada.');
  if(value.startsWith('Recogiste '))return value.replace('Recogiste ','Ya recogí ');
  if(value.startsWith('Dejaste '))return value.replace('Dejaste ','Dejé ');
  if(value.startsWith('Necesitas una batería'))return 'Me falta una batería. Recuerdo que están en el estante amarillo del piso dos.';
  if(value.startsWith('Aquí ya hay'))return 'Aquí ya hay una batería. Me conviene buscar otra estación que esté apagada.';
  if(value.startsWith('¡')&&value.includes('tiene energía'))return `¡Listo! ${value.slice(1)}`;
  if(value.startsWith('Primero elige'))return 'Antes de preparar la nave quiero completar los tres espacios del traje.';
  if(value.startsWith('Todas están'))return 'Todas las baterías están conectadas. Puedo recoger una de otra estación.';
  if(value.startsWith('Quédate')||value.startsWith('Primero protégete'))return 'Me quedo en el refugio hasta que pase la alerta. Las baterías pueden esperar.';
  return `Me fijo en esto: ${value}`;
}

export function importantFeedback(text:string):boolean{
  return /^(Completa los tres|Llena la carga|Antes de continuar|Vuelve al interior|Estabiliza primero|Durante el refugio|No puedes salir|Esta tarea exige|La mochila grande|El atajo requiere|Suelta los imanes|La tarea está completa|Activa la sujeción|Una batería está averiada|La batería averiada|La alerta terminó|Revisa el orden)/.test(text);
}

export const REFLECTIONS=[
  {question:'¿Por qué no funcionan seis estaciones a la vez?',answers:['Tenemos cuatro baterías.','Marte no permite electricidad.']},
  {question:'¿Qué estudia AVATAR?',answers:['Modelos de tejido con células.','Un chip dentro de tu cuerpo.']},
  {question:'¿Qué nos protege en una alerta solar?',answers:['El refugio preparado.','Las botas magnéticas.']},
];
