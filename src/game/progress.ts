import { decodeCheckpoint, CAMPAIGN_VERSION, validCargo, type Campaign, type Snapshot } from './campaign';
import { SHIPS, SITES, UPGRADE_IDS } from '../content/equipment';
import { BALANCE, BATTERY_IDS, STATION_IDS, PACKAGES, RULES_VERSION, shelterDwellMs } from './rules/balance';
import { objectives } from './rules/engine';
import type { GameState } from './rules/types';

// Separate from the legacy safe-point format: this contains the current moment
// AND its retry point, never a wall-clock timestamp to catch up on reload.
export const PROGRESS_VERSION = 1;
export const BRIEFING_IDS = ['hangar', 'travel', 'base', 'outside'] as const;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const range = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const integer = (v: unknown, lo: number, hi: number): v is number => range(v, lo, hi) && Number.isInteger(v);
const member = <T extends string>(v: unknown, ids: readonly T[]): v is T => typeof v === 'string' && ids.includes(v as T);
const bool = (v: unknown): v is boolean => typeof v === 'boolean';
const exactKeys = (v: Record<string, unknown>, keys: readonly string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v,k));
const unique = (v: unknown[]) => new Set(v).size === v.length;

function validBase(v: unknown): v is GameState {
  if (!record(v) || v.rulesVersion !== RULES_VERSION || !member(v.phase,['prelaunch','base','ended']) || !member(v.outcome,['playing','won','lost']) || !integer(v.seed,0,0xffffffff) || !range(v.activeMs,0,BALANCE.operationMs) || !bool(v.inShelter)) return false;
  if (!(v.lostCause === null || member(v.lostCause,['reserve-zero','solar-unprotected','timeout']))) return false;
  if ((v.outcome === 'lost') !== (v.lostCause !== null) || (v.phase === 'ended') !== (v.outcome !== 'playing')) return false;
  if (!record(v.reserves) || !exactKeys(v.reserves,['air','water','thermal']) || !Object.values(v.reserves).every(n => range(n,0,100))) return false;
  if (!record(v.avatar) || !bool(v.avatar.interactionDone) || !bool(v.avatar.done) || (v.avatar.done && !v.avatar.interactionDone)) return false;
  if (!record(v.greenhouse) || !integer(v.greenhouse.harvests,0,BALANCE.operationMs/BALANCE.greenhouse.needsMs) || !record(v.comms) || !bool(v.comms.transmitted)) return false;
  if (!record(v.solar) || !member(v.solar.status,['pending','active','resolved']) || !range(v.solar.dwellMs,0,35_250) || !range(v.solar.requiredDwellMs,20_000,35_000) || ![20_000,25_000,35_000].includes(v.solar.requiredDwellMs)) return false;
  if (!record(v.failure) || !member(v.failure.status,['pending','active','resolved']) || !(v.failure.batteryId === null || member(v.failure.batteryId,BATTERY_IDS)) || !range(v.failure.endsAtMs,0,BALANCE.operationMs)) return false;
  if (!record(v.shelter) || !Array.isArray(v.shelter.chosen) || v.shelter.chosen.length > 2 || !v.shelter.chosen.every(id => member(id,['light','supplies','reinforced'])) || !unique(v.shelter.chosen)) return false;
  const mass = v.shelter.chosen.reduce((sum: number,id: keyof typeof PACKAGES) => sum+PACKAGES[id].mass,0);
  if (v.shelter.mass !== mass || v.shelter.protection !== mass || mass > BALANCE.shelter.maxMass || v.solar.requiredDwellMs !== shelterDwellMs(mass || 3)) return false;
  if (!record(v.stations) || !exactKeys(v.stations,STATION_IDS) || !record(v.batteries) || !exactKeys(v.batteries,BATTERY_IDS)) return false;
  for (const id of STATION_IDS) {
    const station=v.stations[id];
    if (!record(station) || !(station.batteryId === null || member(station.batteryId,BATTERY_IDS)) || !range(station.progressMs,0,BALANCE.operationMs) || !range(station.energyMs,0,BALANCE.lab.needsMs)) return false;
    if (station.batteryId !== null) {
      const battery=v.batteries[station.batteryId]; if (!record(battery) || battery.station !== id) return false;
    }
  }
  for (const id of BATTERY_IDS) {
    const battery=v.batteries[id];
    if (!record(battery) || !(battery.station === null || member(battery.station,STATION_IDS))) return false;
    if (battery.station !== null) { const station=v.stations[battery.station]; if (!record(station) || station.batteryId !== id) return false; }
  }
  if (v.missionGoals !== undefined && (!record(v.missionGoals) || !bool(v.missionGoals.recycler) || !bool(v.missionGoals.relay))) return false;
  return true;
}

function validSnapshot(v: unknown): v is Snapshot {
  if (!record(v) || !member(v.phase,['intro','equipment','ship','shelter','launch','travel','base','return','debrief','failed'])) return false;
  if (!integer(v.introStep,0,3) || !bool(v.editingBase) || !integer(v.flightStep,0,2) || !integer(v.flightCheck,0,3)) return false;
  if (!Array.isArray(v.upgrades) || v.upgrades.length !== 3 || !v.upgrades.every(id => id === null || member(id,UPGRADE_IDS)) || !unique(v.upgrades.filter(id => id !== null))) return false;
  if (!(v.ship === null || member(v.ship,['apollo','orion'])) || !Array.isArray(v.cargo) || !v.cargo.every(c => c === null || member(c,['water','food','battery'])) || v.cargo.length !== (v.ship ? SHIPS[v.ship].slots : 0)) return false;
  const cargo=v.cargo;
  if (!record(v.travel) || !integer(v.travel.leg,0,3) || !range(v.travel.energy,0,100) || !range(v.travel.water,0,100) || !range(v.travel.reactants,0,100) || !integer(v.travel.observations,0,v.travel.leg)) return false;
  if (!validBase(v.base) || !record(v.suit) || !range(v.suit.oxygen,0,v.upgrades.includes('lung') || v.phase === 'equipment' ? 140 : 70) || !range(v.suit.energy,0,100) || !range(v.suit.thermal,0,100) || !range(v.suit.dust,0,100) || !range(v.suit.antenna,0,180) || !bool(v.suit.shield) || !bool(v.suit.magnets)) return false;
  if (!record(v.repairs) || !exactKeys(v.repairs,Object.keys(SITES)) || !Object.values(v.repairs).every(bool)) return false;
  if (!range(v.playerX,0,94) || !range(v.targetX,0,94) || (v.playerDeck !== undefined && !range(v.playerDeck,0,3)) || (v.targetDeck !== undefined && !range(v.targetDeck,0,3)) || (v.flightElapsed !== undefined && !range(v.flightElapsed,0,3200))) return false;
  if (typeof v.message !== 'string' || v.message.length > 2000 || typeof v.cause !== 'string' || v.cause.length > 2000 || !Array.isArray(v.quiz) || v.quiz.length !== 3 || !v.quiz.every(n => n === null || integer(n,0,2))) return false;
  if (v.tutorialSeen !== undefined && (!Array.isArray(v.tutorialSeen) || !v.tutorialSeen.every(id=>member(id,BRIEFING_IDS)) || !unique(v.tutorialSeen))) return false;
  if (v.excursion !== null) {
    const e=v.excursion;
    if (!record(e) || !member(e.site,['recycler','relay','platform','crater']) || !member(e.stage,['outbound','work','return']) || !member(e.route,['long','short']) || !range(e.distance,0,100) || !range(e.elapsed,0,e.stage === 'work' ? 0 : e.distance) || !range(e.progress,0,1) || (e.startX !== undefined && !range(e.startX,12,65))) return false;
    if (!['base','failed'].includes(v.phase) || v.base.phase === 'prelaunch' || v.base.inShelter || !v.ship || (e.route === 'short' && (!v.upgrades.includes('boots') || v.upgrades.includes('lung'))) || (e.site === 'platform' && !v.upgrades.includes('boots'))) return false;
    const routeDistance=(e.route === 'short' ? 9 : SITES[e.site].seconds) * (v.upgrades.includes('lung') ? 1.25 : 1) * (v.ship === 'apollo' ? 1.2 : 1);
    if (e.stage === 'return' ? e.distance > routeDistance : Math.abs(e.distance-routeDistance)>1e-8) return false;
    if (v.suit.magnets && (e.site !== 'platform' || e.stage !== 'work' || !v.upgrades.includes('boots'))) return false;
  } else if (v.suit.magnets || v.suit.shield) return false;
  if (v.suit.shield && (!v.upgrades.includes('shield') || v.suit.energy <= 0)) return false;
  const prelaunch=['intro','equipment','ship','shelter'].includes(v.phase) && !v.editingBase;
  if (prelaunch && (v.base.phase !== 'prelaunch' || v.base.activeMs !== 0 || v.travel.leg !== 0 || v.excursion !== null)) return false;
  if (v.editingBase && (v.phase !== 'equipment' || v.base.phase !== 'base' || v.travel.leg !== 3 || v.excursion !== null)) return false;
  if (v.phase === 'intro' && (v.ship !== null || v.upgrades.some(id=>id!==null))) return false;
  if (v.phase !== 'intro' && v.phase !== 'equipment' && v.upgrades.some(id=>id===null)) return false;
  if (['launch','travel','base','return','debrief','failed'].includes(v.phase) && (!v.ship || cargo.some(c=>c===null) || !['water','food','battery'].every(c=>cargo.includes(c)))) return false;
  if (v.phase === 'launch' && (v.base.phase !== 'prelaunch' || v.travel.leg !== 0)) return false;
  if (v.phase === 'travel' && v.base.phase !== 'prelaunch') return false;
  if (v.travel.leg >= 2 && v.flightCheck !== 3) return false;
  if (['base','return','debrief'].includes(v.phase) || v.editingBase || (v.phase === 'failed' && v.base.phase !== 'prelaunch')) {
    if (v.travel.leg !== 3 || !v.base.missionGoals || v.base.missionGoals.recycler !== v.repairs.recycler || v.base.missionGoals.relay !== v.repairs.relay) return false;
  }
  if (v.phase === 'base') {
    const operating=v.base.phase === 'base' && v.base.outcome === 'playing';
    // The base can finish while the astronaut is outside. Campaign return is
    // deferred until re-entry, including its one-frame excursion:null boundary.
    const awaitingReturn=v.base.phase === 'ended' && v.base.outcome === 'won' && objectives(v.base).all;
    if (!operating && !awaitingReturn) return false;
  }
  if (['return','debrief'].includes(v.phase) && (v.base.phase !== 'ended' || v.base.outcome !== 'won' || !objectives(v.base).all)) return false;
  if (v.phase === 'failed' && !v.cause) return false;
  if (['shelter','launch','travel','base','return','debrief','failed'].includes(v.phase) && v.ship) {
    // The structure above is validated; this rule shares the actual cargo limits.
    if (!validCargo(v as unknown as Snapshot)) return false;
  }
  if (['launch','travel','base','return','debrief','failed'].includes(v.phase) && v.base.shelter.chosen.length !== 2) return false;
  return true;
}

function validCampaign(v: unknown): v is Campaign {
  if (!validSnapshot(v) || !record(v)) return false;
  const checkpoint=v.checkpoint;
  if (checkpoint === null) return !v.editingBase && ['intro','equipment','ship','shelter'].includes(v.phase);
  if (!record(checkpoint) || Object.hasOwn(checkpoint,'checkpoint')) return false;
  // Retain the established legacy validation for safe retry points, then apply
  // the stricter schema also used for active progress.
  if (!validSnapshot(checkpoint)) return false;
  // A resumed climb can stop between decks. Legacy checkpoints only accepted
  // integer destinations; adapt that one field for its validation, retaining
  // the actual stopped position in the new format and leaving v2 unchanged.
  const legacyPoint=checkpoint.targetDeck !== undefined && checkpoint.targetDeck === checkpoint.playerDeck ? {...checkpoint,targetDeck:Math.round(checkpoint.targetDeck)} : checkpoint;
  if (!decodeCheckpoint(JSON.stringify({version:CAMPAIGN_VERSION,checkpoint:legacyPoint}))) return false;
  if (v.ship !== checkpoint.ship || JSON.stringify(v.cargo) !== JSON.stringify(checkpoint.cargo) || checkpoint.base.activeMs > v.base.activeMs) return false;
  if (checkpoint.phase === 'base' && v.base.phase === 'prelaunch') return false;
  if (checkpoint.phase === 'return' && !['return','debrief'].includes(v.phase)) return false;
  return true;
}

export function encodeProgress(campaign: Campaign): string {
  if (!validCampaign(campaign)) throw new Error('Invalid campaign progress');
  return JSON.stringify({version:PROGRESS_VERSION,campaign});
}
export function decodeProgress(raw: string): Campaign | null {
  try {
    if (raw.length > 100_000) return null;
    const value: unknown=JSON.parse(raw);
    return record(value) && value.version === PROGRESS_VERSION && validCampaign(value.campaign) ? structuredClone(value.campaign) : null;
  } catch { return null; }
}
