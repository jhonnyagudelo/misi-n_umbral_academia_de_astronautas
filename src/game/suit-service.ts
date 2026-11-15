import type { Snapshot } from './campaign';
import { BATTERY_IDS } from './rules/balance';
import { isStationPowered } from './rules/engine';

// Positions and refill rates are training rules, not engineering measurements.
export const SUIT_SERVICE_POINTS = {
  oxygen: { x: 24, deck: 2, perSecond: 28 },
  energy: { x: 24, deck: 1, perSecond: 25 },
  thermal: { x: 76, deck: 1, perSecond: 25 },
} as const;
export type SuitServiceResource = keyof typeof SUIT_SERVICE_POINTS;
export type SuitServiceReason = 'ready' | 'inactive' | 'outside' | 'solar' | 'shelter' | 'unpowered' | 'no-battery';
export interface SuitServicePointStatus {
  /** Whether the source works; approach its point and stop to use it. */
  available: boolean;
  atStation: boolean;
  reason: SuitServiceReason;
  x: number;
  deck: number;
}

export function suitServiceStatus(s: Snapshot): Record<SuitServiceResource, SuitServicePointStatus> {
  const blocked: SuitServiceReason | null = s.phase !== 'base' || s.base.outcome !== 'playing' ? 'inactive'
    : s.excursion ? 'outside' : s.base.inShelter ? 'shelter' : s.base.solar.status === 'active' ? 'solar' : null;
  const freeBattery = BATTERY_IDS.some(id => s.base.batteries[id].station === null &&
    (s.base.failure.status !== 'active' || s.base.failure.batteryId !== id));
  const status = (resource: SuitServiceResource): SuitServicePointStatus => {
    const point = SUIT_SERVICE_POINTS[resource];
    const source = resource === 'energy' ? freeBattery : isStationPowered(s.base, resource === 'oxygen' ? 'air' : 'thermal');
    const reason = blocked ?? (source ? 'ready' : resource === 'energy' ? 'no-battery' : 'unpowered');
    const deck = s.playerDeck ?? 1;
    return { x: point.x, deck: point.deck, available: reason === 'ready', reason,
      atStation: !s.excursion && Math.abs(s.playerX - point.x) <= 6 && Math.abs(deck - point.deck) < .001 };
  };
  return { oxygen: status('oxygen'), energy: status('energy'), thermal: status('thermal') };
}
