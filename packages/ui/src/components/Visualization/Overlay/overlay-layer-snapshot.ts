import { OverlayLayer } from './overlay-entries';

type DeepReadonly<T> = { readonly [Key in keyof T]: DeepReadonly<T[Key]> };

/** Cached React view; every nested record is read-only and frozen at runtime. */
export type OverlayStoreSnapshot = DeepReadonly<readonly OverlayLayer[]>;

/** Freeze detached presentation entries without freezing the caller's input. */
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

/** Stable identity across owners and layers for entries selected by a renderer. */
export interface CanvasOverlay {
  readonly key: string;
  readonly entry: OverlayStoreSnapshot[number]['entries'][number];
}
