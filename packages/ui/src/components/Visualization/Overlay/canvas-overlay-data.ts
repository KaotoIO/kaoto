import type { OverlayStoreSnapshot } from './overlay-layer-snapshot';

/** Transient renderer metadata; never part of the Camel definition. */
export interface CanvasOverlay {
  readonly key: string;
  readonly entry: OverlayStoreSnapshot[number]['entries'][number];
}

export interface CanvasOverlayData {
  overlays?: readonly CanvasOverlay[];
}
