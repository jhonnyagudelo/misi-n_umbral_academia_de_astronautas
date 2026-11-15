import Localized from './Localized';
﻿import {useEffect,useState} from 'react';
import {announce} from '../hooks/useNarration';
import {PixelIcon} from './GameArt';
const QUESTIONS=[
  {question:'1. ¿Qué estudiamos?',choices:[['model','Un modelo de tejido: un grupo de células'],['rock','Una roca de Marte']]},
  {question:'2. ¿Cuál hace el viaje?',choices:[['flight','La muestra de vuelo'],['control','La muestra que queda en Tierra']]},
  {question:'3. ¿Con cuál la comparamos?',choices:[['control','Con la muestra de control en Tierra'],['flight','Solo con ella misma']]},
];
const EXPLANATION='AVATAR nos ayuda a investigar cómo afecta el espacio a las células, las pequeñas piezas que forman el cuerpo. Un tejido es un grupo de células que trabajan juntas. Una muestra viaja y otra parecida se queda en la Tierra. Al compararlas, los científicos buscan cambios. Aquí preparas esa comparación; no sacamos células de tu personaje.';
export default function AvatarActivity({onComplete,done,scope='panel:avatar'}:{onComplete:()=>void;done:boolean;scope?:string}){
  const [answers,setAnswers]=useState(['','','']);const [checked,setChecked]=useState(false);const [questionIndex,setQuestionIndex]=useState(0);
  const correct=answers.every((answer,i)=>answer===['model','flight','control'][i]);
  useEffect(()=>announce(EXPLANATION,3,scope),[scope]);
  useEffect(()=>{if(checked)announce(correct?'¡Comparación preparada! Ahora una batería en el laboratorio permitirá terminar el informe.':'Una viaja y otra queda en Tierra. Revisa la comparación y vuelve a intentarlo.',3,scope);},[checked,correct,scope]);
  return <Localized><div className="avatar-activity">
    <p className="activity-purpose"><strong>¿Para qué sirve?</strong> Investigar cómo afecta el espacio a las células, las pequeñas piezas que forman el cuerpo.</p>
    <div className="sample-comparison" aria-label="Dos muestras para comparar"><div><PixelIcon kind="lab" size={35}/><b>TIERRA</b><span>Muestra de control</span><small>Se queda aquí</small></div><span aria-hidden="true">↔</span><div><PixelIcon kind="lab" size={35}/><b>ESPACIO</b><span>Muestra de vuelo</span><small>Hace el viaje</small></div></div>
    <p className="sample-explanation">Una <strong>muestra</strong> es una pequeña porción para estudiar. Compara una que viaja con otra parecida que queda en Tierra.</p>
    <div className="sample-steps" aria-label="Pasos de la comparación">{QUESTIONS.map((_,i)=><button key={i} aria-pressed={questionIndex===i} onClick={()=>setQuestionIndex(i)}>{i+1}{answers[i]?' ✓':''}</button>)}</div>
    {QUESTIONS.filter((_,i)=>i===questionIndex).map(({question,choices})=><fieldset className="sample-question" key={question}><legend>{question}</legend>{choices.map(([value,label])=><button type="button" className={answers[questionIndex]===value?'sample-selected':''} aria-pressed={answers[questionIndex]===value} key={value} onClick={()=>{const next=[...answers];next[questionIndex]=value;setAnswers(next);setChecked(false);setQuestionIndex(Math.min(2,questionIndex+1));announce(label,3,scope);}}>{label}</button>)}</fieldset>)}
    <button className="pixel-button primary" disabled={answers.some(answer=>!answer)} onClick={()=>{setChecked(true);if(correct)onComplete();}}>Preparar comparación</button>
    {checked&&<p role="status" className={correct?'success':'warning'}>{correct?'¡Listo! Conecta una batería al laboratorio para completar el informe.':'Recuerda: estudiamos células, una muestra viaja y la comparamos con otra en Tierra.'}</p>}
    {done&&<p className="success">✓ Comparación registrada.</p>}
    <details className="formal small-note"><summary>¿Qué hay dentro de la muestra?</summary><p>AVATAR usa modelos de tejido con células. Aquí preparas la comparación; no tomamos células del personaje ni inventamos resultados. <a href="https://science.nasa.gov/biological-physical/investigations/avatar/" target="_blank" rel="noreferrer">Fuente NASA: AVATAR ↗</a></p></details>
  </div></Localized>;
}
