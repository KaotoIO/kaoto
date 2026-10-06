import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { createStore } from 'zustand/vanilla';

import {
  OverlayBatchResult,
  OverlayEntry,
  OverlayRemovalResult,
  OverlayWriteRejection,
} from '../components/Visualization/Overlay/overlay-entries';
import {
  cloneOverlayEntry,
  validateOverlayEntries,
} from '../components/Visualization/Overlay/overlay-entry-validation';
import {
  createOverlayLayerSnapshot,
  OverlayStoreSnapshot,
} from '../components/Visualization/Overlay/overlay-layer-snapshot';
import {
  createOverlayTargetIndex,
  OverlayScope,
  OverlayTargetSnapshot,
} from '../components/Visualization/Overlay/overlay-targets';

export interface OverlayOwner {
  readonly ownerId: string;
  replaceLayer(scope: OverlayScope, layerId: string, entries: readonly OverlayEntry[]): OverlayBatchResult;
  upsertEntries(scope: OverlayScope, layerId: string, entries: readonly OverlayEntry[]): OverlayBatchResult;
  removeEntries(scope: OverlayScope, layerId: string, entryIds: readonly string[]): OverlayRemovalResult;
  clearLayer(scope: OverlayScope, layerId: string): OverlayRemovalResult;
  dispose(): void;
}

export interface OverlayState {
  readonly layers: OverlayStoreSnapshot;
  readonly disposed: boolean;
  createOwner(): OverlayOwner | undefined;
  dispose(): void;
}

export type OverlayStore = ReturnType<typeof createOverlayStore>;
const emptyLayers = createOverlayLayerSnapshot([]);

/** Pure layer transitions keep Zustand actions small and preserve unchanged references. */
function replaceLayerState(state: OverlayState, ownerId: string, layerId: string, entries: readonly OverlayEntry[]) {
  const previous = state.layers.find((layer) => layer.ownerId === ownerId && layer.layerId === layerId);
  if (isEqual(previous?.entries ?? [], entries)) return state;
  const replacement = createOverlayLayerSnapshot([{ ownerId, layerId, entries: [...entries] }])[0];
  const layers = state.layers.filter((layer) => layer !== previous);
  if (entries.length > 0) {
    const position = previous ? state.layers.indexOf(previous) : layers.length;
    layers.splice(position, 0, replacement);
  }
  return { layers: Object.freeze(layers) };
}

function removeOwnerLayers(state: OverlayState, ownerId: string) {
  const layers = state.layers.filter((layer) => layer.ownerId !== ownerId);
  return layers.length === state.layers.length ? state : { layers: Object.freeze(layers) };
}

/** One Zustand store per model scope. Consumers own their subscription cleanup. */
export function createOverlayStore(snapshot: OverlayTargetSnapshot) {
  const scope = { ...snapshot.scope };
  let index: ReturnType<typeof createOverlayTargetIndex> | undefined = createOverlayTargetIndex(snapshot);

  return createStore<OverlayState>()((set, get) => ({
    layers: emptyLayers,
    disposed: false,
    createOwner() {
      if (get().disposed) return undefined;
      const ownerId = uuidv4();
      let ownerDisposed = false;
      const getLayer = (layerId: string) =>
        get().layers.find((layer) => layer.ownerId === ownerId && layer.layerId === layerId);
      const reject = (requestScope: OverlayScope, layerId: string): OverlayWriteRejection | undefined => {
        if (get().disposed || ownerDisposed) return { status: 'disposed' };
        if (
          requestScope.canvasId !== scope.canvasId ||
          requestScope.documentId !== scope.documentId ||
          requestScope.modelRevision !== scope.modelRevision
        )
          return { status: 'stale' };
        if (!layerId) return { status: 'invalid', reason: 'A layer ID is required' };
        return undefined;
      };
      const commitLayer = (layerId: string, entries: readonly OverlayEntry[]) => {
        set((state) => replaceLayerState(state, ownerId, layerId, entries));
      };
      const write = (
        requestScope: OverlayScope,
        layerId: string,
        entries: readonly OverlayEntry[],
        replace: boolean,
      ): OverlayBatchResult => {
        const rejected = reject(requestScope, layerId);
        if (rejected) return rejected;
        const reason = validateOverlayEntries(entries);
        if (reason) return { status: 'invalid', reason };
        const next = new Map(replace ? [] : getLayer(layerId)?.entries.map((entry) => [entry.id, entry]));
        const result: Extract<OverlayBatchResult, { status: 'applied' }> = {
          status: 'applied',
          applied: [],
          unresolved: [],
        };
        for (const entry of entries) {
          const resolution = index!.resolve(scope, entry.target);
          if (resolution.status === 'resolved') {
            next.set(entry.id, cloneOverlayEntry(entry));
            result.applied.push(entry.id);
          } else if (resolution.status === 'missing' || resolution.status === 'ambiguous') {
            next.delete(entry.id);
            result.unresolved.push({ entryId: entry.id, reason: resolution.status });
          }
        }
        commitLayer(layerId, Array.from(next.values()));
        return result;
      };
      return {
        ownerId,
        replaceLayer: (requestScope, layerId, entries) => write(requestScope, layerId, entries, true),
        upsertEntries: (requestScope, layerId, entries) => write(requestScope, layerId, entries, false),
        removeEntries(requestScope, layerId, entryIds) {
          const rejected = reject(requestScope, layerId);
          if (rejected) return rejected;
          if (entryIds.some((id) => !id) || new Set(entryIds).size !== entryIds.length) {
            return { status: 'invalid', reason: 'Entry IDs must be nonempty and unique within a batch' };
          }
          const next = new Map(getLayer(layerId)?.entries.map((entry) => [entry.id, entry]));
          const removed = entryIds.filter((id) => next.delete(id));
          commitLayer(layerId, Array.from(next.values()));
          return { status: 'applied', removed };
        },
        clearLayer(requestScope, layerId) {
          const rejected = reject(requestScope, layerId);
          if (rejected) return rejected;
          const removed = getLayer(layerId)?.entries.map((entry) => entry.id) ?? [];
          commitLayer(layerId, []);
          return { status: 'applied', removed };
        },
        dispose() {
          if (ownerDisposed) return;
          ownerDisposed = true;
          set((state) => removeOwnerLayers(state, ownerId));
        },
      };
    },
    dispose() {
      if (get().disposed) return;
      index = undefined;
      set({ disposed: true, layers: emptyLayers });
    },
  }));
}
