import { useSyncExternalStore } from 'react';

import { createOverlayLayerSnapshot, OverlayStoreSnapshot } from './overlay-layer-snapshot';
import { OverlayLayerStore } from './overlay-layer-store';

const empty = createOverlayLayerSnapshot([]);
const getEmptySnapshot = () => empty;
const subscribeToNothing = () => () => undefined;

/** Subscribe to a supplied client-side store without taking ownership of its lifetime. */
export function useOverlayLayers(store: OverlayLayerStore | undefined): OverlayStoreSnapshot {
  return useSyncExternalStore(store?.subscribe ?? subscribeToNothing, store?.getSnapshot ?? getEmptySnapshot);
}
