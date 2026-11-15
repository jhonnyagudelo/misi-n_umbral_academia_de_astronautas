import { actCampaign, createCampaign, tickCampaign, decodeCheckpoint, type CampaignAction, type Campaign } from './campaign';
import { BRIEFING_IDS, decodeProgress, encodeProgress } from './progress';
import { objectives } from './rules/engine';
export const SAVE_KEY = 'mision-umbral-campaign-v2';
export const PROGRESS_KEY = 'mision-umbral-progress-v1';
export const META_KEY = 'mision-umbral-meta-v1';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
const SAVE_ERROR = 'No se pudo guardar en este navegador. Puedes seguir jugando en esta pestaña.';
const normalCompleted = (campaign: Campaign) => campaign.ship==='orion' &&
  (campaign.phase==='return' || campaign.phase==='debrief') && campaign.base.phase==='ended' &&
  campaign.base.outcome==='won' && objectives(campaign.base).all;

export function createCampaignStore() {
  let view = { campaign: createCampaign(), paused: false, hidden: false, persistenceMessage: '', savedMessage: '', hardUnlocked: false, unlockNotice: '' };
  let storage: StoragePort | undefined;
  let direction: -1 | 0 | 1 = 0;
  let started = false;
  let activeSinceSave = 0;
  let lastWritten = '';
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());
  const persistUnlock = () => {
    try {
      if (!storage) throw new Error('No storage');
      storage.setItem(META_KEY,JSON.stringify({version:1,hardUnlocked:true}));
      view={...view,unlockNotice:'¡Artemis normal superado! Apolo difícil está desbloqueado en este navegador.'};
    } catch {
      view={...view,unlockNotice:'¡Apolo difícil desbloqueado! Está disponible en esta sesión, pero no se pudo guardar el logro en este navegador.'};
    }
  };
  const unlockFrom = (campaign: Campaign) => {
    if (view.hardUnlocked || !normalCompleted(campaign)) return;
    view={...view,hardUnlocked:true}; persistUnlock();
  };
  const save = (explicit = false): boolean => {
    // A fresh mount/intro must preserve an earlier mission until the player
    // starts or explicitly restarts; lifecycle saves may run before that.
    if (!started) return false;
    // A blocked storage port must not be retried on every animation frame.
    activeSinceSave = 0;
    try {
      if (!storage) throw new Error('No storage');
      const raw = encodeProgress(view.campaign);
      if (explicit || raw !== lastWritten) storage.setItem(PROGRESS_KEY,raw);
      lastWritten = raw; activeSinceSave = 0;
      view = { ...view, persistenceMessage: '', savedMessage: explicit ? 'Progreso guardado en este navegador.' : view.savedMessage === SAVE_ERROR ? '' : view.savedMessage };
      return true;
    } catch {
      view = { ...view, persistenceMessage: SAVE_ERROR, savedMessage: explicit ? SAVE_ERROR : '' };
      return false;
    }
  };
  const readSaved = (): Campaign | null => {
    const current = storage?.getItem(PROGRESS_KEY);
    const progress = current ? decodeProgress(current) : null;
    if (progress) return progress;
    const legacy = storage?.getItem(SAVE_KEY);
    return legacy ? decodeCheckpoint(legacy) : null;
  };
  return {
    getSnapshot: () => view,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    connectStorage(port?: StoragePort) {
      storage = port; lastWritten = '';
      let persisted=false;
      try {
        const raw=storage?.getItem(META_KEY);
        const meta=raw && raw.length<1000 ? JSON.parse(raw) : null;
        persisted=!!(meta && typeof meta==='object' && !Array.isArray(meta) && Object.keys(meta).length===2 && meta.version===1 && meta.hardUnlocked===true);
        if (persisted) view={...view,hardUnlocked:true};
      } catch { /* Invalid or unavailable metadata never grants access. */ }
      if (view.hardUnlocked && !persisted) persistUnlock();
      // Inspect both validated formats: an unfinished current mission must not
      // hide a completed normal mission in the older safe-point slot.
      for (const [key,decode] of [[PROGRESS_KEY,decodeProgress],[SAVE_KEY,decodeCheckpoint]] as const) {
        if (view.hardUnlocked) break;
        try { const raw=storage?.getItem(key); const campaign=raw ? decode(raw) : null; if (campaign) unlockFrom(campaign); }
        catch { /* Storage availability does not prevent this session playing. */ }
      }
      emit();
    },
    saveProgress(): boolean { const result=save(true); emit(); return result; },
    hasSavedProgress(): boolean { try { return !!readSaved(); } catch { return false; } },
    markBriefingSeen(id: string) {
      if (!(BRIEFING_IDS as readonly string[]).includes(id) || view.campaign.tutorialSeen?.includes(id)) return;
      view = { ...view, campaign: {...view.campaign,tutorialSeen:[...(view.campaign.tutorialSeen??[]),id]}, savedMessage:'' };
      save(); emit();
    },
    dispatch(action: CampaignAction) {
      if ((view.paused || view.hidden) && action.type !== 'restart') return;
      if (action.type==='choose-ship' && action.ship==='apollo' && !view.hardUnlocked) {
        view={...view,campaign:{...view.campaign,message:'Completa Artemis en modo normal para desbloquear Apolo difícil.'}};
        emit(); return;
      }
      if (action.type === 'walk' || action.type === 'restart' || action.type === 'retry') direction = 0;
      const prior=view.campaign;
      let campaign=actCampaign(prior,action);
      if (campaign === prior) return;
      if (action.type === 'retry' && prior.tutorialSeen) campaign={...campaign,tutorialSeen:[...prior.tutorialSeen],targetX:campaign.playerX,targetDeck:campaign.playerDeck};
      if (action.type === 'restart' || campaign.phase !== 'intro') started=true;
      view = { ...view, campaign, paused: action.type === 'restart' ? false : view.paused, savedMessage:'' };
      unlockFrom(campaign);
      // Destinations are transient input. Decisions and scene transitions are
      // durable immediately; motion is sampled every five active seconds.
      if (action.type !== 'walk' && (campaign.phase !== 'intro' || action.type === 'restart')) save();
      emit();
    },
    tick(delta: number) {
      if (view.paused || view.hidden) return;
      const prior=view.campaign;
      const campaign=tickCampaign(prior,delta,direction);
      if (campaign === prior) return;
      view = { ...view, campaign };
      unlockFrom(campaign);
      if (Number.isFinite(delta) && delta>0) activeSinceSave+=Math.min(delta,250);
      if (campaign.checkpoint !== prior.checkpoint || campaign.phase !== prior.phase || campaign.excursion?.stage !== prior.excursion?.stage || activeSinceSave >= 5000) save();
      emit();
    },
    setDirection(next: -1 | 0 | 1) {
      direction = view.paused || view.hidden ? 0 : next;
      if (view.campaign.targetX !== view.campaign.playerX) {
        view = { ...view, campaign: { ...view.campaign, targetX: view.campaign.playerX } }; emit();
      }
    },
    setPaused(paused: boolean) {
      if (view.paused !== paused) { direction=0; view={...view,paused}; if(paused)save(); emit(); }
    },
    setHidden(hidden: boolean) {
      if (view.hidden !== hidden) { direction=0; view={...view,hidden}; if(hidden)save(); emit(); }
    },
    restore(): boolean {
      try {
        const campaign=readSaved();
        if (!campaign) { view={...view,persistenceMessage:'No hay un guardado compatible. Puedes empezar una misión nueva.',savedMessage:''}; emit(); return false; }
        direction=0; activeSinceSave=0; started=true; lastWritten='';
        view={...view,campaign:{...campaign,targetX:campaign.playerX,targetDeck:campaign.playerDeck},paused:false,persistenceMessage:'',savedMessage:''};
        unlockFrom(campaign);
        emit(); return true;
      } catch { view={...view,persistenceMessage:'El almacenamiento está bloqueado. Puedes jugar sin guardado.',savedMessage:''}; emit(); return false; }
    },
  };
}
export const campaignStore = createCampaignStore();
