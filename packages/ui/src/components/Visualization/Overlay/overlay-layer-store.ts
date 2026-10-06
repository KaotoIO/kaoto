import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import {
  OverlayBatchResult,
  OverlayEntry,
  OverlayLayer,
  OverlayRemovalResult,
  OverlayWriteRejection,
} from './overlay-entries';
import { cloneOverlayEntry, validateOverlayEntries } from './overlay-entry-validation';
import { createOverlayLayerSnapshot, OverlayStoreSnapshot } from './overlay-layer-snapshot';
import { createOverlayTargetIndex, OverlayScope, OverlayTargetSnapshot } from './overlay-targets';

export interface OverlayOwner {
  readonly ownerId: string;
  replaceLayer(scope: OverlayScope, layerId: string, entries: readonly OverlayEntry[]): OverlayBatchResult;
  upsertEntries(scope: OverlayScope, layerId: string, entries: readonly OverlayEntry[]): OverlayBatchResult;
  removeEntries(scope: OverlayScope, layerId: string, entryIds: readonly string[]): OverlayRemovalResult;
  clearLayer(scope: OverlayScope, layerId: string): OverlayRemovalResult;
  dispose(): void;
}

export interface OverlayLayerStore {
  createOwner(): OverlayOwner | undefined;
  getLayers(): readonly OverlayLayer[];
  /** Stable, deeply immutable view until a visible layer change. */
  getSnapshot(): OverlayStoreSnapshot;
  /** Called after atomic changes; unsubscribe is idempotent. No immediate callback. */
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

type Entries = Map<string, OverlayEntry>;

/** One model scope, with local owner capabilities. The lifecycle adapter must dispose on model replacement. */
export function createOverlayLayerStore(snapshot: OverlayTargetSnapshot): OverlayLayerStore {
  const scope = { ...snapshot.scope };
  let index: ReturnType<typeof createOverlayTargetIndex> | undefined = createOverlayTargetIndex(snapshot);
  const owners = new Map<string, Map<string, Entries>>();
  let disposed = false;
  const listeners = new Set<() => void>();
  let currentSnapshot = createOverlayLayerSnapshot([]);

  const getLayers = (): OverlayLayer[] => {
    const result: OverlayLayer[] = [];
    owners.forEach((layers, ownerId) => {
      layers.forEach((entries, layerId) => {
        result.push({ ownerId, layerId, entries: Array.from(entries.values(), cloneOverlayEntry) });
      });
    });
    return result;
  };

  const publish = () => {
    currentSnapshot = createOverlayLayerSnapshot(getLayers());
    // Snapshot listeners so subscribing/unsubscribing during a notification is safe.
    const pendingListeners = [...listeners];
    for (const listener of pendingListeners) {
      if (!listeners.has(listener)) continue;
      try {
        listener();
      } catch (error) {
        // An observer failure must not roll back a committed write or starve other subscribers.
        queueMicrotask(() => {
          throw error;
        });
      }
    }
  };

  return {
    createOwner() {
      if (disposed) return undefined;
      const ownerId = uuidv4();
      const layers = new Map<string, Entries>();
      owners.set(ownerId, layers);
      let ownerDisposed = false;

      const reject = (requestScope: OverlayScope, layerId: string): OverlayWriteRejection | undefined => {
        if (disposed || ownerDisposed) return { status: 'disposed' };
        if (
          requestScope.canvasId !== scope.canvasId ||
          requestScope.documentId !== scope.documentId ||
          requestScope.modelRevision !== scope.modelRevision
        ) {
          return { status: 'stale' };
        }
        if (!layerId) return { status: 'invalid', reason: 'A layer ID is required' };
        return undefined;
      };

      const commitLayer = (layerId: string, entries: Entries) => {
        const previous = Array.from(layers.get(layerId)?.values() ?? []);
        if (isEqual(previous, Array.from(entries.values()))) return;
        if (entries.size === 0) layers.delete(layerId);
        else layers.set(layerId, entries);
        publish();
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

        const next = replace ? new Map<string, OverlayEntry>() : new Map(layers.get(layerId));
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
            // A failed replacement must not leave the entry's previous target decorated.
            next.delete(entry.id);
            result.unresolved.push({ entryId: entry.id, reason: resolution.status });
          }
        }
        commitLayer(layerId, next);
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
          const next = new Map(layers.get(layerId));
          const removed = entryIds.filter((id) => next.delete(id));
          commitLayer(layerId, next);
          return { status: 'applied', removed };
        },
        clearLayer(requestScope, layerId) {
          const rejected = reject(requestScope, layerId);
          if (rejected) return rejected;
          const removed = Array.from(layers.get(layerId)?.keys() ?? []);
          commitLayer(layerId, new Map());
          return { status: 'applied', removed };
        },
        dispose() {
          if (ownerDisposed) return;
          ownerDisposed = true;
          const hadLayers = layers.size > 0;
          layers.clear();
          owners.delete(ownerId);
          if (hadLayers) publish();
        },
      };
    },
    getLayers,
    getSnapshot: () => currentSnapshot,
    subscribe(listener) {
      if (disposed) return () => undefined;
      // Separate registrations of the same callback have independent lifetimes.
      const subscription = () => {
        listener();
      };
      listeners.add(subscription);
      return () => {
        listeners.delete(subscription);
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      owners.forEach((layers) => {
        layers.clear();
      });
      owners.clear();
      index = undefined;
      if (currentSnapshot.length > 0) publish();
      listeners.clear();
    },
  };
}
