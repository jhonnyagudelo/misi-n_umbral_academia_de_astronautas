import type { CSSProperties } from 'react';
import { EQUIPMENT, type UpgradeId } from '../content/equipment';
import type { ShipId } from '../game/campaign';

const drawings: Record<string, React.ReactNode> = {
  lung: <><path d="M10 5h12v4h3v17H7V9h3z" fill="#70c4e3"/><path d="M10 10h12v12H10z" fill="#d4f7ff"/><path d="M5 13h4v4H5zm18 0h4v4h-4zM12 2h8v4h-8z" fill="#efb85d"/><path d="M11 14h10v3H11zm0 6h10v3H11z" fill="#386780"/></>,
  shield: <><path d="M16 3l11 4v12l-4 6-7 5-7-5-4-6V7z" fill="#f4cf67"/><path d="M16 7l7 3v8l-3 5-4 3-4-3-3-5v-8z" fill="#377d97"/><path d="M17 9l-6 9h5l-1 7 7-11h-6z" fill="#fff0ac"/></>,
  armor: <><path d="M10 4h4v4h4V4h4l6 8-4 5-2-2v13H10V15l-2 2-4-5z" fill="#efb34e"/><path d="M12 11h8v12h-8z" fill="#ffe49c"/><path d="M13 14h6v3h-6zm0 5h6v2h-6z" fill="#b47a38"/></>,
  gloves: <><path d="M5 14V9h3v5h2V7h3v7h2V8h3v10l-2 8H7l-3-6v-6zm17-1V7h3v7h2v-4h3v11l-3 5h-7l-2-7v-6z" fill="#f69a71"/><path d="M7 24h9v5H7zm13 0h8v5h-8z" fill="#60d1db"/><path d="M9 16h4v6H9zm13 1h3v4h-3z" fill="#ffe29c"/></>,
  boots: <><path d="M5 5h9v15h3v8H3v-7h2zm15 0h9v15h2v8H18v-7h2z" fill="#c59dec"/><path d="M7 8h5v8H7zm15 0h5v8h-5z" fill="#ffe49c"/><path d="M3 25h14v4H3zm15 0h13v4H18z" fill="#69d4e2"/></>,
  radio: <><path d="M9 6h13l5 6v13H5V12z" fill="#91c7a7"/><path d="M10 10h12l3 5v7H7v-7z" fill="#194257"/><path d="M9 14h4v4H9zm8 0h4v4h-4z" fill="#8fe8e4"/><path d="M21 2h3v7h-3zm3 0h5v3h-5z" fill="#f8d574"/></>,
  water: <><path d="M14 3h4v4h3v4h3v5h3v8l-5 5H10l-5-5v-8h3v-5h3V7h3z" fill="#78d6ed"/><path d="M9 18h4v7H9z" fill="#defbff"/></>,
  food: <><path d="M5 12l4-7 6 3 5-5 7 6-2 9-9 11L5 20z" fill="#89d6a3"/><path d="M14 11h3v15h-3zM8 13l7 6 8-8v4l-8 8-7-6z" fill="#3d946d"/></>,
  battery: <><path d="M12 3h8v4h5v22H7V7h5z" fill="#e4bf67"/><path d="M10 10h12v16H10z" fill="#77d7bc"/><path d="M17 11l-5 8h4l-1 6 6-9h-5z" fill="#203d52"/></>,
  air: <><path d="M4 11h18V8h-4V5h6l4 4v4l-4 3H4zm0 8h21v3h-7v5h-5v-3h2v-2H4z" fill="#90e1ec"/></>,
  thermal: <><path d="M16 2l3 9 5-4 4 11-2 8-7 4H11l-6-6-1-7 5-7 1 8 5-5z" fill="#ecb45a"/><path d="M17 17l4 6-3 5h-5l-3-5 4-4v4z" fill="#fff0bd"/></>,
  lab: <><path d="M10 3h12v4h-3v8l8 10v4H5v-4l8-10V7h-3z" fill="#afabe3"/><path d="M12 19h8l5 7H7z" fill="#7de3da"/><path d="M15 8h2v8h-2z" fill="#eaf5f2"/></>,
  comms: <><path d="M5 4l18 18-5 5-9-4-5-9z" fill="#8edaa9"/><path d="M18 14l7-7 3 3-7 7zM13 25h4v4H7v-3h6z" fill="#eac36e"/><path d="M20 3h7v3h-7zm7 3h3v7h-3z" fill="#8edee9"/></>,
  shelter: <><path d="M3 16l13-12 13 12v14H3z" fill="#83b8c7"/><path d="M10 17h12v13H10z" fill="#28445b"/><path d="M13 20h6v3h-6z" fill="#f8d479"/></>,
};
export function PixelIcon({ kind, size = 40 }: { kind: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" className="pixel-icon" aria-hidden="true" shapeRendering="crispEdges">{drawings[kind] ?? drawings.lab}</svg>;
}
export function Astronaut({ upgrades = [], className = '', grumpy = false }: { upgrades?: (UpgradeId | null)[]; className?: string; grumpy?: boolean }) {
  return <div className={`astronaut ${className} ${grumpy ? 'grumpy' : ''}`}>
    {upgrades.includes('lung') && <span className="suit-backpack" aria-hidden="true"/>}
    <img src="/images/astronauta-guia.png" width="128" height="160" alt={grumpy ? 'Astronauta en Modo Gruñón' : 'Astronauta con traje dorado y visor cian'} draggable="false"/>
    {grumpy && <><span className="grumpy-face" aria-hidden="true"><i/><i/><b/></span><span className="crossed-arms" aria-hidden="true"><i/><i/></span></>}
    {upgrades.includes('armor') && <span className="suit-chest" aria-hidden="true"/>}
    {upgrades.includes('radio') && <span className="suit-antenna" aria-hidden="true"/>}
    {upgrades.includes('shield') && <span className="suit-electrodes" aria-hidden="true"/>}
    <div className="suit-badges" aria-label="Mejoras instaladas">{upgrades.filter((x): x is UpgradeId => !!x).map(id => <span key={id} title={EQUIPMENT[id].name} style={{ '--accent': EQUIPMENT[id].color } as CSSProperties}><PixelIcon kind={id} size={22}/></span>)}</div>
  </div>;
}
export function Rocket({ ship, firing = false }: { ship: ShipId; firing?: boolean }) {
  return <svg viewBox="0 0 120 240" className={`rocket-art ${firing ? 'firing' : ''}`} role="img" aria-label={ship === 'apollo' ? 'Cohete Saturno V' : 'Cohete SLS'} shapeRendering="crispEdges">
    <g fill="#53798d"><path d="M7 32h7v175H7zm99 0h7v175h-7z"/><path d="M7 57h32v5H7zm73 0h33v5H80zM7 120h28v5H7zm78 0h28v5H85zM7 186h25v5H7zm81 0h25v5H88z"/></g>
    {ship === 'apollo' ? <><path d="M57 8h6v21h-6zM51 30h18l9 23H42z" fill="#d8e1e2"/><path d="M42 53h36v137H42z" fill="#e4e7df"/><path d="M42 78h36v16H42zm0 42h36v19H42zm0 45h36v17H42z" fill="#304556"/><path d="M40 190h40l10 24H30z" fill="#b8c7ca"/><path d="M38 210h10v13H38zm17 0h10v13H55zm17 0h10v13H72z" fill="#203746"/><path d="M48 58h5v14h-5zm13 0h5v14h-5z" fill="#8ea6ad"/></> : <><path d="M57 6h6v24h-6zM50 29h20l8 22H42z" fill="#e8e9db"/><path d="M46 51h28v149H46z" fill="#cb864a"/><path d="M46 66h28v9H46zm0 99h28v7H46z" fill="#e6ad66"/><path d="M26 97h12v112H26zm56 0h12v112H82z" fill="#e7e7dd"/><path d="M26 97l6-16 6 16zm56 0l6-16 6 16z" fill="#d5e4e5"/><path d="M26 135h12v7H26zm56 0h12v7H82z" fill="#4b6274"/><path d="M44 199h32l6 17H38zM24 207h16v9H24zm56 0h16v9H80z" fill="#263d4e"/></>}
    {firing && <g className="rocket-flame"><path d="M41 216h38l-7 17H48z" fill="#ef9957"/><path d="M49 216h22l-11 24z" fill="#ffe39a"/></g>}
    <path d="M15 223h90v5H15z" fill="#72b9cb"/>
  </svg>;
}
export function RoomDecor() {
  return <div className="room-decor" aria-hidden="true"><div className="pipe pipe-left"/><div className="pipe pipe-right"/><div className="room-monitor left-monitor"><span>O₂</span><i/><i/><i/></div><div className="room-monitor right-monitor"><span>BASE / LINK</span><i/><i/></div><div className="room-console console-left"/><div className="room-console console-right"/></div>;
}
