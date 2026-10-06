import { OverlayTarget } from './overlay-targets';

export type HighlightTarget = OverlayTarget & { kind: 'node' | 'edge' };
export type OverlayTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';
export type OverlayEmphasis = 'normal' | 'strong' | 'subdued';

export interface OverlayInteraction {
  accessibleLabel: string;
  tooltip?: string;
}

interface OverlayEntryBase {
  id: string;
  tone?: OverlayTone;
  emphasis?: OverlayEmphasis;
}

/** Internal presentation data; contains no executable callbacks or runtime feature semantics. */
export type OverlayEntry = OverlayEntryBase &
  (
    | { kind: 'highlight'; target: HighlightTarget }
    | {
        kind: 'annotation';
        target: OverlayTarget;
        text: string;
        value?: number;
        unit?: string;
        interaction: OverlayInteraction;
      }
  );

export interface OverlayLayer {
  ownerId: string;
  layerId: string;
  entries: OverlayEntry[];
}

export type OverlayWriteRejection = { status: 'invalid'; reason: string } | { status: 'stale' | 'disposed' };
export type OverlayBatchResult =
  | { status: 'applied'; applied: string[]; unresolved: { entryId: string; reason: 'missing' | 'ambiguous' }[] }
  | OverlayWriteRejection;
export type OverlayRemovalResult = { status: 'applied'; removed: string[] } | OverlayWriteRejection;
