import {oxygenCapacity,repairDuration,type Snapshot} from '../game/campaign';
import type {UpgradeId} from './equipment';
export const UPGRADE_CARD_GAINS:Record<UpgradeId,string>={lung:'×2 aire',shield:'Quita polvo',armor:'Conserva abrigo',gloves:'×2 rapidez',boots:'Sujeta en metal',radio:'Enlace 12 → 3 s'};
export function upgradePreview(id:UpgradeId,s:Snapshot){
  const without=s.upgrades.filter(x=>x!==id);const withUpgrade=[...without,id];
  switch(id){
    case 'lung':return {metric:'El doble de aire',detail:`${oxygenCapacity({...s,upgrades:without})} → ${oxygenCapacity({...s,upgrades:withUpgrade})} unidades para la salida.`};
    case 'shield':return {metric:'El polvo baja al activarlo',detail:'Sin escudo se acumula; encendido lo retira y gasta energía.'};
    case 'armor':return {metric:'70 % menos pérdida de abrigo',detail:'Conservas más calor afuera, pero reparar cuesta el doble.'};
    case 'gloves':return {metric:'Herramienta en la mitad de tiempo',detail:`${repairDuration(without,true)} s → ${repairDuration(withUpgrade,true)} s con energía. El enlace de radio lleva tiempo aparte.`};
    case 'boots':return {metric:'Abre la tarea de la plataforma',detail:'También permite el atajo metálico si tu mochila cabe.'};
    case 'radio':return {metric:'Enlace: 12 s → 3 s',detail:'En el repetidor, apunta la antena hacia 90°. La reparación lleva tiempo aparte.'};
  }
}
