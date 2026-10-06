import { OverlayEntry } from './overlay-entries';
import { OverlayTarget } from './overlay-targets';

export interface OverlayPresentationAction {
  entryId: string;
  target: OverlayTarget;
  actionId: string;
}

export interface OverlayEntryPresentationProps<E extends OverlayEntry> {
  entry: E;
  onAction?: (action: OverlayPresentationAction) => void;
}

/** Remount interaction state when its target or available actions change. */
export const overlayInteractionKey = (entry: Exclude<OverlayEntry, { kind: 'highlight' }>) =>
  JSON.stringify([entry.id, entry.target.kind, entry.target.id, entry.interaction.contextMenu]);
