import type { TargetNodeData } from './visualization';

/**
 * Enumeration of actions that can be performed on a target mapping node.
 * Used as keys returned by {@link MappingActionRegistryService.getAllowedActions} to
 * drive which UI controls are rendered for a given node.
 */
export enum MappingActionKind {
  ContextMenu = 'conditionMenu',
  ValueSelector = 'valueSelector',
  CopyOfSelector = 'copyOfSelector',
  If = 'if',
  Choose = 'choose',
  ForEach = 'forEach',
  InnerForEach = 'innerForEach',
  InnerChoose = 'innerChoose',
  InnerIf = 'innerIf',
  ForEachGroup = 'forEachGroup',
  Delete = 'delete',
  When = 'when',
  Otherwise = 'otherwise',
  Comment = 'comment',
  Sort = 'sort',
  Variable = 'variable',
  RenameVariable = 'renameVariable',
  ForEachGroupConfig = 'forEachGroupConfig',
  ForEachCurrentGroup = 'forEachCurrentGroup',
  InnerForEachGroup = 'innerForEachGroup',
  InnerForEachCurrentGroup = 'innerForEachCurrentGroup',
  Duplicate = 'duplicate',
  AddField = 'addField',
}

/**
 * Groups related context menu actions into flyout submenus.
 *
 * "Wrap with Instruction" vs "Inner Instruction" reflects the structural
 * difference: wrap actions enclose the current field's mapping with an
 * instruction element, while inner actions insert a new instruction inside
 * the current instruction scope.
 *
 * Flyout submenus were chosen over a flat `DropdownGroup` to reduce visual
 * noise when up to 17 items are shown simultaneously, and to align with
 * the future Carbon Design System migration (Carbon's `Menu` component
 * uses the same flyout submenu pattern natively).
 *
 * The component derives groups from visible actions rather than referencing
 * concrete group names, so adding a new group only requires an enum value
 * and `group` on the registry entry.
 */
export enum MappingActionGroup {
  WrapWithInstruction = 'Wrap with Instruction',
  InnerInstruction = 'Inner Instruction',
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
  group?: MappingActionGroup;
  getLabel: (nodeData: TargetNodeData) => string;
  apply: (nodeData: TargetNodeData, callbacks: IMappingActionCallbacks) => void;
}
