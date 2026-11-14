/**
 * Tipos del estado de partida.
 *
 * Regla de arquitectura (documento de dirección §05): este estado es el ÚNICO
 * que calcula reservas, tareas y eventos. Phaser y React solo leen y envían
 * acciones. Nada de este archivo importa Phaser ni React.
 */

export type ReserveId = 'air' | 'water' | 'thermal';

export type StationId = 'air' | 'water' | 'thermal' | 'greenhouse' | 'lab' | 'comms';

export type BatteryId = 'b1' | 'b2' | 'b3' | 'b4';

export type PackageId = 'light' | 'supplies' | 'reinforced';

export type Phase = 'prelaunch' | 'base' | 'ended';

export type Outcome = 'playing' | 'won' | 'lost';

export type LostCause =
  | 'reserve-zero'
  | 'solar-unprotected'
  | 'timeout';

export interface StationState {
  batteryId: BatteryId | null;
  /** Milisegundos acumulados con energía (invernadero y comunicaciones). */
  progressMs: number;
  /** Milisegundos acumulados con energía en el laboratorio AVATAR. */
  energyMs: number;
}

export interface SolarEventState {
  status: 'pending' | 'active' | 'resolved';
  dwellMs: number;
  requiredDwellMs: number;
}

export interface BatteryFailureState {
  status: 'pending' | 'active' | 'resolved';
  batteryId: BatteryId | null;
  endsAtMs: number;
}

export interface ShelterState {
  chosen: PackageId[];
  mass: number;
  protection: number;
}

export interface GameState {
  /** Additional campaign objectives; absent preserves the original engine behavior. */
  missionGoals?: { recycler: boolean; relay: boolean };
  rulesVersion: string;
  phase: Phase;
  /** Tiempo activo de la operación en la base. Congelado al pausar. */
  activeMs: number;
  reserves: Record<ReserveId, number>;
  stations: Record<StationId, StationState>;
  batteries: Record<BatteryId, { station: StationId | null }>;
  shelter: ShelterState;
  avatar: { interactionDone: boolean; done: boolean };
  greenhouse: { harvests: number };
  comms: { transmitted: boolean };
  solar: SolarEventState;
  failure: BatteryFailureState;
  /** Semilla estable: la avería debe ser reproducible. */
  seed: number;
  /** Presencia del astronauta en el refugio, informada por la escena. */
  inShelter: boolean;
  outcome: Outcome;
  lostCause: LostCause | null;
}

export type Action =
  | { type: 'choose-shelter'; packageIds: PackageId[] }
  | { type: 'start-mission' }
  | { type: 'place-battery'; batteryId: BatteryId; stationId: StationId }
  | { type: 'remove-battery'; batteryId: BatteryId }
  | { type: 'avatar-interaction' }
  | { type: 'set-shelter-presence'; inside: boolean }
  | { type: 'restart' };
