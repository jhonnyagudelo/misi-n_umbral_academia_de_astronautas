import { useState } from 'react';
import { PixelIcon } from './GameArt';
export default function AvatarActivity({ onComplete, done }: { onComplete: () => void; done: boolean }) {
  const [answers, setAnswers] = useState(['', '', '']); const [checked, setChecked] = useState(false);
  const expected = ['model', 'flight', 'control']; const correct = answers.every((x, i) => x === expected[i]);
  return <div className="avatar-activity"><div className="avatar-illustration"><PixelIcon kind="lab" size={72}/><div className="cell-model" aria-label="Dibujo educativo de células"><i/><i/><i/><i/><i/></div><span>REPRESENTACIÓN EDUCATIVA</span></div><p>AVATAR estudia modelos de tejido con células. No es un chip implantado ni una pantalla que diagnostica el cuerpo del astronauta.</p><p>Relaciona cada paso para preparar la comparación:</p>
    {['¿Qué ponemos en el dispositivo?', '¿Qué muestra hace el viaje?', '¿Con qué comparamos?'].map((q, i) => <label className="avatar-question" key={q}>{q}<select value={answers[i]} onChange={e => { const next = [...answers]; next[i] = e.target.value; setAnswers(next); setChecked(false); }}><option value="">Elige una respuesta</option><option value="model">Un modelo de tejido con células</option><option value="flight">La muestra en condición de vuelo</option><option value="control">Una muestra de control en Tierra</option></select></label>)}
    <button className="pixel-button primary" onClick={() => { setChecked(true); if (correct) onComplete(); }}>Comprobar comparación</button>
    {checked && <p role="status" className={correct ? 'success' : 'warning'}>{correct ? '¡Comparación preparada! El laboratorio necesita también energía para completar el informe.' : 'Revisa: estudiamos tejido, enviamos una muestra y la comparamos con un control terrestre.'}</p>}{done && <p className="success">✓ Actividad registrada.</p>}
    <p className="formal small-note">No se presentan resultados inventados. <a href="https://science.nasa.gov/biological-physical/investigations/avatar/" target="_blank" rel="noreferrer">Fuente NASA: AVATAR</a>.</p>
  </div>;
}
