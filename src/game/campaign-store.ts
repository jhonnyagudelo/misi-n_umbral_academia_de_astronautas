import { actCampaign, createCampaign, tickCampaign, encodeCheckpoint, decodeCheckpoint, type CampaignAction } from './campaign';
export const SAVE_KEY = 'mision-umbral-campaign-v2';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export function createCampaignStore() {
  let view = { campaign: createCampaign(), paused: false, hidden: false, persistenceMessage: '' };
  let storage: StoragePort | undefined;
  // Ephemeral input, never saved in a checkpoint or treated as another position.
  let direction: -1 | 0 | 1 = 0;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());
  const save = () => {
    if (!storage || !view.campaign.checkpoint) return;
    try {
      storage.setItem(SAVE_KEY, encodeCheckpoint(view.campaign));
      if (view.persistenceMessage) view = { ...view, persistenceMessage: '' };
    } catch { view = { ...view, persistenceMessage: 'No se pudo guardar en este navegador. Puedes seguir jugando en esta pestaña.' }; }
  };
  return {
    getSnapshot: () => view,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    connectStorage(port?: StoragePort) { storage = port; },
    dispatch(action: CampaignAction) {
      if ((view.paused || view.hidden) && action.type !== 'restart') return;
      if (action.type === 'walk' || action.type === 'restart') direction = 0;
      const campaign = actCampaign(view.campaign, action);
      if (campaign === view.campaign) return;
      const prior = view.campaign.checkpoint;
      view = { ...view, campaign, paused: action.type === 'restart' ? false : view.paused };
      if (campaign.checkpoint !== prior) save();
      emit();
    },
    tick(delta: number) {
      if (view.paused || view.hidden) return;
      const campaign = tickCampaign(view.campaign, delta, direction);
      if (campaign === view.campaign) return;
      const prior = view.campaign.checkpoint;
      view = { ...view, campaign };
      if (campaign.checkpoint !== prior) save();
      emit();
    },
    setDirection(next: -1 | 0 | 1) {
      direction = view.paused || view.hidden ? 0 : next;
      if (view.campaign.targetX !== view.campaign.playerX) {
        view = { ...view, campaign: { ...view.campaign, targetX: view.campaign.playerX } }; emit();
      }
    },
    setPaused(paused: boolean) { if (view.paused !== paused) { direction = 0; view = { ...view, paused }; emit(); } },
    setHidden(hidden: boolean) { if (view.hidden !== hidden) { direction = 0; view = { ...view, hidden }; emit(); } },
    restore(): boolean {
      try {
        const raw = storage?.getItem(SAVE_KEY);
        const campaign = raw ? decodeCheckpoint(raw) : null;
        if (!campaign) { view = { ...view, persistenceMessage: 'No hay un guardado compatible. Puedes empezar una misión nueva.' }; emit(); return false; }
        view = { ...view, campaign, paused: false, persistenceMessage: '' }; emit(); return true;
      } catch { view = { ...view, persistenceMessage: 'El almacenamiento está bloqueado. Puedes jugar sin guardado.' }; emit(); return false; }
    },
  };
}
export const campaignStore = createCampaignStore();
