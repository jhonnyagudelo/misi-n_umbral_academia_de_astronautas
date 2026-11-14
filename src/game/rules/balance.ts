/**
 * Todos los números del juego en un solo lugar.
 *
 * Cada valor proviene del documento de dirección §03–§04 y es una
 * "Regla del juego": son unidades del juego, no mediciones médicas,
 * eléctricas ni de ingeniería NASA.
 */

export const RULES_VERSION = '1.0.0';

export const RESERVE_IDS = ['air', 'water', 'thermal'] as const;

export const STATION_IDS = ['air', 'water', 'thermal', 'greenhouse', 'lab', 'comms'] as const;

export const BATTERY_IDS = ['b1', 'b2', 'b3', 'b4'] as const;

export const PACKAGES = {
  light: { mass: 1, protection: 1 },
  supplies: { mass: 2, protection: 2 },
  reinforced: { mass: 3, protection: 3 }
} as const;

export const BALANCE = {
  /** §03 · tres reservas entre 0 y 100, comienzan en 60. */
  reserveStart: 60,
  reserveMin: 0,
  reserveMax: 100,
  /** §03 · bajo 25 aparece un aviso de prioridad. */
  priorityWarningBelow: 25,

  /** §03 · cada 10 s activos: +2 con batería, −3 sin ella. */
  supportPerSecondPowered: 0.2,
  supportPerSecondUnpowered: -0.3,

  /** §03 · invernadero: 30 s con energía completan una cosecha. */
  greenhouse: {
    needsMs: 30_000,
    /** Cada 10 s encendido consume 2 unidades de agua. */
    waterPerSecond: 0.2
  },

  /** §03 · laboratorio: 20 s de energía habilitan el informe AVATAR. */
  lab: { needsMs: 20_000 },

  /** §03 · comunicaciones: 20 s de energía transmiten el informe. */
  comms: { needsMs: 20_000 },

  /** §03 · la operación dura 5 minutos activos. */
  operationMs: 300_000,

  /** §03 · preparación del refugio: dos de tres paquetes, masa máxima 5. */
  shelter: {
    maxMass: 5,
    /** Cada unidad de masa reduce en 3 el agua inicial de la base. */
    waterCostPerMass: 3,
    /** Protección total 3 → 35 s; 4 → 25 s; 5 → 20 s. */
    dwellMsByProtection: { 3: 35_000, 4: 25_000, 5: 20_000 }
  },

  /** §04 · Evento A: alerta a los 90 s activos con 20 s para entrar. */
  solar: {
    alarmAtMs: 90_000,
    entryWindowMs: 20_000
  },

  /** §04 · Evento B: a los 180 s una batería conectada falla 45 s. */
  failure: {
    atMs: 180_000,
    durationMs: 45_000
  },

  /** Nada de esto se evalúa en salud real: la simulación se documenta. */
  educationalDisclaimer:
    'Representación educativa. Las reglas y los tiempos son del juego, no mediciones reales de NASA.'
} as const;

export function shelterDwellMs(protection: number): number {
  const table = BALANCE.shelter.dwellMsByProtection as Record<number, number>;
  return table[protection] ?? table[5];
}
