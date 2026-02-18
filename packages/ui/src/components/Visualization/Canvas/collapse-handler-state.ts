/**
 * Controller state for persisting which group nodes are collapsed.
 * Mirrors the pattern used by SelectionHandlerState (selectedIds).
 * When the controller is updated via fromModel() (e.g. empty or new nodes/edges),
 * this state is used to re-apply collapse so expanded/collapsed state is preserved.
 */
export const COLLAPSE_STATE = 'collapsedIds';

export interface CollapseHandlerState {
  [COLLAPSE_STATE]?: string[];
}
