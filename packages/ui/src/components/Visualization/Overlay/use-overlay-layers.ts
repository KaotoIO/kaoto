import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { OverlayState, OverlayStore } from '../../../store/overlay.store';
import { createOverlayLayerSnapshot } from './overlay-layer-snapshot';

const emptyStore = createStore(() => ({ layers: createOverlayLayerSnapshot([]) }));
const selectLayers = (state: Pick<OverlayState, 'layers'>) => state.layers;

/** Zustand owns React subscriptions; the caller owns the supplied store's lifetime. */
export function useOverlayLayers(store: OverlayStore | undefined) {
  return useStore(store ?? emptyStore, selectLayers);
}
