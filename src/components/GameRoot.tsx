import { useSyncExternalStore } from "react";
import { store } from "../game/store";

const subscribe = (notify: () => void) =>
  store.subscribe(() => notify());

const getSnapshot = () => store.getState();

export default function GameRoot() {
  const estado = useSyncExternalStore(subscribe, getSnapshot);

  return (
    <section className="mt-8 rounded-xl border border-white/20 p-6">
      <h2 className="text-xl font-bold">Reservas de la base</h2>

      <ul className="mt-4 space-y-2">
        <li>Aire: {estado.reserves.air}</li>
        <li>Agua: {estado.reserves.water}</li>
        <li>Confort térmico: {estado.reserves.thermal}</li>
      </ul>
    </section>
  );
}