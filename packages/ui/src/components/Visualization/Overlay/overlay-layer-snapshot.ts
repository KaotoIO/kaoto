import { OverlayLayer } from './overlay-entries';

type DeepReadonly<T> = { readonly [Key in keyof T]: DeepReadonly<T[Key]> };

/** Cached React view; every nested record is read-only and frozen at runtime. */
export type OverlayStoreSnapshot = DeepReadonly<readonly OverlayLayer[]>;

/** Freeze detached layer copies, never the caller's entries or the store's mutable maps. */
export function createOverlayLayerSnapshot(layers: readonly OverlayLayer[]): OverlayStoreSnapshot {
  return Object.freeze(
    layers.map((layer) =>
      Object.freeze({
        ...layer,
        entries: Object.freeze(
          layer.entries.map((entry) => {
            Object.freeze(entry.target);
            if (entry.kind === 'annotation') Object.freeze(entry.interaction);
            return Object.freeze(entry);
          }),
        ),
      }),
    ),
  );
}
