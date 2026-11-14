/**
 * Puente entre el motor de reglas, Phaser y React.
 *
 * Un solo estado de partida (documento §05): React y Phaser leen de acá y
 * solo envían acciones. Nadie más calcula reservas.
 */

import { createInitialState, dispatch as reduce, tick as reduceTick } from './rules/engine';
import type { Action, GameState, PackageId } from './rules/types';

export type UpdateReason = 'action' | 'tick' | 'reset' | 'pause';

type Listener = (state: GameState, reason: UpdateReason) => void;

class GameStore {
  private state: GameState = createInitialState();
  private listeners = new Set<Listener>();
  private pausedByPlayer = false;
  private hidden = false;

  getState(): GameState {
    return this.state;
  }

  /** Una acción del jugador: nunca se descarta por pausa. */
  dispatch(action: Action): void {
    const next = reduce(this.state, action);
    if (next === this.state) return;
    this.state = next;
    this.emit('action');
  }

  /** Tiempo del juego: solo avanza si no está pausado ni oculto. */
  tick(deltaMs: number): void {
    if (this.isPaused()) return;
    const next = reduceTick(this.state, deltaMs);
    if (next === this.state) return;
    this.state = next;
    this.emit('tick');
  }

  isPaused(): boolean {
    return this.pausedByPlayer || this.hidden;
  }

  isPausedByPlayer(): boolean {
    return this.pausedByPlayer;
  }

  setPaused(paused: boolean): void {
    if (this.pausedByPlayer === paused) return;
    this.pausedByPlayer = paused;
    this.emit('pause');
  }

  setHidden(hidden: boolean): void {
    if (this.hidden === hidden) return;
    this.hidden = hidden;
    this.emit('pause');
  }

  chooseBoth(packageIds: PackageId[]): void {
    this.dispatch({ type: 'choose-shelter', packageIds });
  }

  startMission(): void {
    this.dispatch({ type: 'start-mission' });
  }

  restart(): void {
    const shelter = this.state.shelter.chosen;
    this.state = createInitialState();
    if (shelter.length === 2) {
      this.state = reduce(this.state, { type: 'choose-shelter', packageIds: shelter });
    }
    this.pausedByPlayer = false;
    this.emit('reset');
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(reason: UpdateReason): void {
    for (const listener of this.listeners) listener(this.state, reason);
  }
}

export const store = new GameStore();

/** La pestaña oculta congela el reloj, como pide el documento §03. */
export function watchVisibility(): () => void {
  if (typeof document === 'undefined') return () => {};
  const handler = () => store.setHidden(document.visibilityState === 'hidden');
  document.addEventListener('visibilitychange', handler);
  handler();
  return () => document.removeEventListener('visibilitychange', handler);
}
