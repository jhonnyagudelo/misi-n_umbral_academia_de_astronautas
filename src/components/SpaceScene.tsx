import { memo } from 'react';
import type { ShipId } from '../game/campaign';

// Original illustrations. Distances and time are intentionally compressed for play.
export const Earth = memo(function Earth() {
  return <svg className="space-earth" viewBox="0 0 240 240" aria-label="La Tierra: océanos, continentes y nubes" role="img">
    <defs><radialGradient id="earth-ocean" cx="32%" cy="28%"><stop stopColor="#58cce7"/><stop offset=".65" stopColor="#2474ad"/><stop offset="1" stopColor="#0a214c"/></radialGradient><radialGradient id="earth-night" cx="24%" cy="30%" r="77%"><stop offset=".48" stopColor="#020b20" stopOpacity="0"/><stop offset="1" stopColor="#020b20" stopOpacity=".8"/></radialGradient><clipPath id="earth-disc"><circle cx="120" cy="120" r="108"/></clipPath></defs>
    <circle cx="120" cy="120" r="113" fill="#75dcf4" opacity=".35"/>
    <g clipPath="url(#earth-disc)"><circle cx="120" cy="120" r="108" fill="url(#earth-ocean)"/>
      <path d="M29 52l34-24 37 1 6 16-18 17 8 18-17 12-13-4-12 20-21-8-5-22-16-6zm52 50 22 13 13 27-10 21-9 34-16 21-7-27 5-25-14-22-1-25zm52-64 39-12 43 21 17 28-25 8-15-12-17 12-15-4-13 13-22-10 1-15-19-10zm5 55 28 2 17 30-9 25-18 19-14-17-6-28-10-18zm47 72 24-9 16 17-6 18-25 1-15-14z" fill="#68ad79"/>
      <path d="M49 49l29-9 13 6M125 45l42 8 36 18M51 109l26 5m72-1 16 12m-60 53-13 16" fill="none" stroke="#bdd58d" strokeWidth="6"/>
      <g fill="none" stroke="#eff7ee" strokeWidth="7" opacity=".8"><path d="M15 84q35-21 64-9m9-16q52-25 111 7M35 151q32-20 75 4m22 27q35-16 83-3M116 98q38-19 82 2"/></g>
      <path d="M63 18q52-14 98 0l-15 10-56 4zM67 219q53-9 99-6l-14 17H90z" fill="#e4f0e8"/>
      <circle cx="120" cy="120" r="108" fill="url(#earth-night)"/>
    </g>
  </svg>;
});

export const Spacecraft = memo(function Spacecraft({ship}:{ship:ShipId}) {
  return <svg className={`space-craft craft-${ship}`} viewBox="0 0 240 260" role="img" aria-label={ship==='orion'?'Cápsula Orion con módulo de servicio y cuatro alas solares':'Cápsula Apollo con módulo de servicio'} shapeRendering="crispEdges">
    {ship==='orion'&&<g className="solar-wings" stroke="#99b9d5" strokeWidth="3" fill="#324a82"><path d="M102 142 29 100 9 131 91 173zm36 0 73-42 20 31-82 42zM96 174 20 207 38 240 108 200zm48 0 76 33-18 33-70-40z"/><g fill="none" stroke="#8798bd" strokeWidth="2"><path d="m22 115 77 43M45 110l-15 31m37-20-15 31m113 0 54-37m-24-5 15 31m-37-20 15 31M32 224l68-36m-52 13 13 27m9-38 15 27m56-24 67 31m-15-23-13 27m-9-38-15 27"/></g></g>}
    <path d="M93 131h54v64H93z" fill="#b9c5cc"/><path d="M94 137h9v52h-9z" fill="#e1e7df"/><path d="M137 137h10v52h-10z" fill="#6f8192"/><path d="M91 195h58v9H91zM109 204h22l7 18h-36z" fill="#3f5062"/>
    <path d="M111 61h18l31 58v12H80v-12z" fill="#e7e3d6"/><path d="M111 61h8l-19 59H82z" fill="#fff4d5"/><path d="M129 61l29 58h-21l-11-58z" fill="#9aaaba"/><path d="M104 85h12v13h-12zm22 0h10v13h-10z" fill="#285071"/><path d="M79 124h82v10H79z" fill="#794f40"/><path d="M106 113h28v4h-28z" fill="#d2a765"/>
  </svg>;
});

const starPositions=Array.from({length:65},(_,i)=>({x:(i*137+29)%1000,y:(i*73+17)%500,r:i%8===0?1.7:.9}));
export const SpaceWindow = memo(function SpaceWindow({leg=0}:{leg?:number}) {
  return <div className={`space-view space-leg-${leg}`}><svg className="space-stars" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{starPositions.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={p.r} fill={i%5===0?'#f8dba7':'#e6ebff'} opacity={i%3===0?.55:1}/>)}</svg><Earth/><span className="space-moon space-mars"/><span className="space-location">{leg===3?'MARTE · DESTINO DEL ENTRENAMIENTO':'TIERRA · NUESTRO HOGAR'}</span></div>;
});

function LaunchRocket({ship}:{ship:ShipId}) {
  return <svg viewBox="0 0 180 380" className={`launch-rocket rocket-${ship}`} role="img" aria-label={ship==='orion'?'SLS despegando con Orion':'Saturno V despegando con Apollo'} shapeRendering="crispEdges">
    <g className="launch-main">
      <g className="launch-upper"><path d="M88 7h4v32h-4zM80 39h20l13 29H67z" fill="#e8e8dd"/><path d="M67 68h46v67H67z" fill="#e4e8e5"/><path d="M67 100h46v14H67z" fill="#34495b"/><path d="M77 50h9v12h-9zm17 0h8v12h-8z" fill="#275775"/></g>
      <g className="launch-core"><path d="M67 135h46v171H67z" fill={ship==='orion'?'#da9658':'#e8e8dc'}/>{ship==='apollo'?<path d="M67 175h46v22H67zm0 83h46v23H67z" fill="#263d51"/>:<path d="M67 159h46v10H67zm0 119h46v8H67z" fill="#f6c080"/>}<path d="M63 306h54l11 17H52z" fill="#465166"/><path d="M74 141h7v137h-7z" fill="#fff2d5" opacity=".45"/></g>
      {ship==='orion'&&<><g className="launch-booster booster-left"><path d="M36 149l9-24 9 24v163H36z" fill="#f1eee3"/><path d="M36 201h18v8H36zm0 61h18v8H36z" fill="#485361"/><path d="M33 312h24v13H33z" fill="#343b4b"/></g><g className="launch-booster booster-right"><path d="M126 149l9-24 9 24v163h-18z" fill="#f1eee3"/><path d="M126 201h18v8h-18zm0 61h18v8h-18z" fill="#485361"/><path d="M123 312h24v13h-24z" fill="#343b4b"/></g></>}
      <g className="launch-exhaust"><path d="M59 324h62l-10 37-21 18-21-18z" fill="#f58548"/><path d="M70 324h40l-9 30-11 17-11-17z" fill="#ffd67c"/><path d="M80 324h20l-10 28z" fill="#fff8d6"/></g>
    </g>
  </svg>;
}

export const LaunchSequence=memo(function LaunchSequence({ship,step,paused}:{ship:ShipId;step:number;paused:boolean}) {
  const captions=ship==='orion'?['3, 2, 1… ¡Despegamos!','Soltamos propulsores y etapas.','¡Orion continúa por el espacio!']:['3, 2, 1… ¡Despegamos!','Las etapas usadas se separan.','¡Apollo continúa por el espacio!'];
  return <section className={`launch-scene launch-step-${step} ${paused?'launch-paused':''}`} aria-label="Animación del despegue" key={step}>
    <div className="launch-sky"/><SpaceWindow/>
    <div className="launch-ground"><div className="launch-hills"/><div className="launch-pad"/><div className="launch-tower"><i/><i/><i/></div></div>
    <div className="launch-cloud cloud-one"/><div className="launch-cloud cloud-two"/>
    <div className="launch-smoke"><i/><i/><i/><i/></div>
    <div className="launch-vehicle">{step===2?<Spacecraft ship={ship}/>:<LaunchRocket ship={ship}/>}</div>
    {step===2&&<div className="launch-spent-stage" aria-hidden="true"/>}
    <div className="launch-caption" role="status"><small>{['TIERRA · PLATAFORMA','ASCENSO · SEPARACIÓN','ESPACIO · SIMULADOR DE VIAJE'][step]}</small><strong>{captions[step]}</strong><span>{step===0?'Mira cómo nos alejamos del suelo.':step===1?'Las partes que terminan su trabajo se desprenden.':'La cápsula y su módulo de servicio siguen juntos.'}</span></div>
    <span className="launch-note">Representación educativa · tiempo abreviado</span>
  </section>;
});
