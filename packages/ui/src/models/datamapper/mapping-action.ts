import type { TargetNodeData } from './visualization';

/**
 * Enumeration of actions that can be performed on a target mapping node.
 * Used as keys returned by {@link MappingActionService.getAllowedActions} to
 * drive which UI controls are rendered for a given node.
 */
export enum MappingActionKind {
  ContextMenu = 'conditionMenu',
  ValueSelector = 'valueSelector',
  If = 'if',
  Choose = 'choose',
  ForEach = 'forEach',
  Delete = 'delete',
  When = 'when',
  Otherwise = 'otherwise',
  Comment = 'comment',
}

/**
 * Callbacks passed to {@link IMappingContextMenuAction.apply} so that action
 * handlers can trigger side effects uniformly — both immediate actions
 * (call service + `onUpdate`) and modal-based actions (`openModal`).
 */
export interface IMappingActionCallbacks {
  onUpdate: () => void;
  openModal: (kind: MappingActionKind) => void;
}

/**
 * Base definition for a mapping action in the action registry.
 * UI-only controls such as `ContextMenu` and `Delete` use this interface
 * directly; context menu items extend it via {@link IMappingContextMenuAction}.
 */
export interface IMappingAction {
  key: MappingActionKind;
  isAllowed: (nodeData: TargetNodeData) => boolean;
  isDisabled?: (nodeData: TargetNodeData) => boolean;
}

/**
 * Extended action definition for items that appear in the mapping context menu.
 * Each entry carries its own label, test ID, and apply callback so that the
 * full action definition lives in one place in the registry.
 */
export interface IMappingContextMenuAction extends IMappingAction {
  testId: string;
  getLabel: (nodeData: TargetNodeData) => string;
  apply: (nodeData: TargetNodeData, callbacks: IMappingActionCallbacks) => void;
}
