export type UpgradeId = 'lung' | 'shield' | 'armor' | 'gloves' | 'boots' | 'radio';
export const EQUIPMENT: Record<UpgradeId, {
  name: string; short: string; color: string; benefit: string; cost: string;
  science: string; status: string; source: string;
}> = {
  lung: {
    name: 'Pulmón Gigante', short: 'Más autonomía', color: '#79d8ee',
    benefit: 'Llega más lejos con una mochila de soporte vital de mayor capacidad.',
    cost: 'Caminas más lento y la mochila no cabe por el paso estrecho.',
    science: 'La mochila proporciona oxígeno y ayuda a controlar temperatura y CO₂. Más oxígeno por sí solo no basta para alargar una salida.',
    status: 'Sistema real · capacidad adaptada al entrenamiento',
    source: 'https://www.nasa.gov/centers-and-facilities/johnson/spacewalk-spacesuit-basics/',
  },
  shield: {
    name: 'Electro-Escudo', short: 'Menos polvo', color: '#ffe17e',
    benefit: 'Actívalo para retirar polvo de la superficie de tu traje.',
    cost: 'Mientras funciona, gasta la energía de tus mejoras eléctricas.',
    science: 'Los escudos electrodinámicos mueven polvo con campos eléctricos. Se investiga su aplicación en trajes; no son burbujas ni escudos contra radiación.',
    status: 'Tecnología real · integración en traje experimental',
    source: 'https://www.nasa.gov/centers-and-facilities/kennedy/nasa-technology-helps-guard-against-lunar-dust/',
  },
  armor: {
    name: 'Armadura Dorada', short: 'Protección térmica', color: '#efbd5b',
    benefit: 'Pierdes menos confort térmico durante el trabajo exterior.',
    cost: 'La configuración más voluminosa vuelve más lenta la reparación.',
    science: 'Los trajes usan capas de aislamiento y protección frente a pequeños impactos. Ningún traje da inmunidad absoluta; el color dorado no es lo que protege.',
    status: 'Materiales reales · movilidad simplificada',
    source: 'https://www.nasa.gov/centers-and-facilities/johnson/spacewalk-spacesuit-basics/',
  },
  gloves: {
    name: 'Turbo-Guantes', short: 'Agarre asistido', color: '#ff957e',
    benefit: 'La ayuda robótica permite manejar la herramienta con menos esfuerzo.',
    cost: 'La asistencia consume energía. Sin carga, reparas sin ayuda.',
    science: 'Robo-Glove y SSRG investigan asistencia al agarre con sensores y actuadores. No reparan máquinas por sí solos ni usan una llave láser universal.',
    status: 'Prototipo real · integración educativa',
    source: 'https://technology.nasa.gov/patent/MSC-TOPS-80',
  },
  boots: {
    name: 'Botas de Plomo Magnéticas', short: 'Sujeción en metal', color: '#d59cf5',
    benefit: 'Sujétate a la plataforma metálica y usa el atajo preparado.',
    cost: 'Debes soltar los imanes para caminar. No se adhieren al suelo lunar.',
    science: 'Los imanes atraen ciertos materiales ferromagnéticos. Esta integración de botas es una propuesta del entrenamiento, no un traje lunar operativo verificado. No controlan la gravedad.',
    status: 'Principio físico real · integración propuesta',
    source: 'https://www.esa.int/About_Us/EAC/Moving_on_the_Moon',
  },
  radio: {
    name: 'Casco Sónico', short: 'Enlace dirigido', color: '#8edaa9',
    benefit: 'Orienta la antena para establecer antes el enlace del repetidor.',
    cost: 'Debes detenerte y apuntar. Una antena mal orientada no da ventaja.',
    science: 'Una antena de mayor ganancia requiere orientación. «Sónico» es el nombre: transmite radio, no sonido por el vacío. No elimina la demora entre planetas.',
    status: 'Principio real · configuración de casco propuesta',
    source: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter11-2/',
  },
};
export const UPGRADE_IDS = Object.keys(EQUIPMENT) as UpgradeId[];

export const SHIPS = {
  apollo: { name: 'Apolo 11', subtitle: 'Saturno V · Columbia', difficulty: 'Difícil', slots: 4, mass: 5, color: '#f6bd68',
    benefit: 'Sus celdas generan electricidad y también agua.', cost: 'Tienes menos espacio y los reactivos se agotan.',
    fact: 'Tres astronautas y unos 6,17 m³ habitables. Columbia no era el módulo lunar Eagle.' },
  orion: { name: 'Artemis II', subtitle: 'SLS · Orion', difficulty: 'Normal', slots: 6, mass: 8, color: '#7edce8',
    benefit: 'Más espacio y generación eléctrica con paneles solares.', cost: 'Debes cuidar el agua almacenada y la batería en sombra.',
    fact: 'Cuatro astronautas y unos 9,3 m³ habitables. Artemis II voló alrededor de la Luna, sin alunizar.' },
} as const;

export const SITES = {
  recycler: { name: 'Reciclador congelado', icon: 'water', seconds: 12, description: 'Llega hasta la válvula y restablece la circulación de agua.', required: true },
  relay: { name: 'Repetidor cubierto de polvo', icon: 'radio', seconds: 18, description: 'Retira el polvo, revisa el equipo y establece el enlace con la base.', required: true },
  platform: { name: 'Plataforma de mantenimiento', icon: 'boots', seconds: 15, description: 'Sujétate sobre la placa ferromagnética para reparar con estabilidad.', required: false },
  crater: { name: 'Observatorio del cráter', icon: 'lung', seconds: 38, description: 'La ruta larga exige mucha autonomía. El atajo metálico tiene un paso estrecho.', required: false },
} as const;
