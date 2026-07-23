import type { ReactNode } from 'react';

import type { IField } from './document';
import type { IFieldSubstituteInfo } from './types';
import { Types } from './types';

// ── Menu rendering contracts ──

/**
 * Model-layer contract for a single field context menu item.
 * Mirrors the mapping side's `IMappingContextMenuAction` but carries
 * a pre-built `onClick` closure instead of a separate `apply` method,
 * because field actions need hook-scoped state (modal openers, document
 * updaters) that cannot be threaded through a static registry.
 */
export interface IFieldMenuAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  testId?: string;
}

/**
 * A logical group of field menu actions rendered with a visual separator
 * between groups. Empty groups are filtered out before rendering.
 */
export interface IFieldMenuGroup {
  actions: IFieldMenuAction[];
}

// ── Selection / candidate contracts ──

/**
 * Outcome of a user picking a member from a wrapper selection modal or inline
 * menu. `memberIndex` identifies the chosen field within the wrapper's
 * `fields` array. For abstract-in-choice selections, `substituteQName` carries
 * the concrete substitute so both the choice member and the abstract substitute
 * are applied in a single dispatch.
 */
export interface IMemberSelection {
  memberIndex: number;
  substituteQName?: string;
}

/**
 * Display-ready candidate for the wrapper selection modal or inline menu.
 * Built by {@link WrapperActionService} from schema fields; consumed by
 * {@link WrapperSelectionModal} and inline menu builders without further
 * transformation.
 */
export interface IWrapperCandidate {
  key: string;
  label: string;
  typeBadge: Types;
  description?: string;
  childrenPreview?: string[];
  selection: IMemberSelection;
}

// ── Resolved-state contracts ──

/**
 * Resolved abstract-field context for a visualization node. Pure read result
 * from {@link WrapperActionService.resolveAbstractFieldInfo} — classifies what
 * role the node plays relative to abstract wrappers so the hook can decide
 * which menu actions to offer without re-deriving wrapper relationships.
 */
export interface IAbstractFieldInfo {
  isAbstractWrapper: boolean;
  isAbstractWrapperMember: boolean;
  isSelectedSubstitution: boolean;
  isSubstitutionCandidate: boolean;
  abstractWrapperField: IField | undefined;
  field: IField | undefined;
  parentAbstractField: IField | undefined;
  candidateQName: string | undefined;
}

/**
 * Full choice context resolved for a given node. Each field captures one aspect
 * of the node's relationship to choice wrappers.
 *
 * @property isChoiceWrapper - The node's own field has `wrapperKind === 'choice'`
 * @property isSelectedChoice - The node is a choice field with a selected member (flattened view)
 * @property isChoiceMember - The node's field is a direct child of a choice wrapper
 * @property isChoiceWrapperMember - The node is a per-instance FieldItem belonging to a collection wrapper
 * @property activeChoiceWrapperForMembers - The choice wrapper whose members should be offered in the context menu
 * @property effectiveChoiceWrapper - The wrapper that governs this node (wrapper member takes priority)
 * @property choiceWrapperField - The outermost selected choice wrapper (walks up through nested choices)
 * @property choiceWrapperMemberField - The wrapper field from a per-instance FieldItem
 * @property choiceMemberField - The field representing this node as a choice member
 * @property parentChoiceWrapperField - The parent choice wrapper field if this node is a direct member
 * @property choiceMemberIndex - The 0-based index of this member within its parent choice
 */
export interface IChoiceNodeInfo {
  isChoiceWrapper: boolean;
  isSelectedChoice: boolean;
  isChoiceMember: boolean;
  isChoiceWrapperMember: boolean;
  activeChoiceWrapperForMembers: IField | undefined;
  effectiveChoiceWrapper: IField | undefined;
  choiceWrapperField: IField | undefined;
  choiceWrapperMemberField: IField | undefined;
  choiceMemberField: IField | undefined;
  parentChoiceWrapperField: IField | undefined;
  choiceMemberIndex: number | undefined;
}

// ── Menu builder configs ──

/**
 * Config for {@link WrapperActionService.buildMenuGroupsForAbstractNode}.
 * Hooks populate this with resolved state and pre-built action closures;
 * the service assembles groups without touching React state.
 *
 * `selectedIcon` and `unselectedIcon` are `ReactNode` values injected by
 * the hook — this keeps the `.ts` service file free of JSX while letting
 * inline menu items render selection indicators.
 */
export interface IAbstractMenuGroupsConfig {
  isAbstractWrapper: boolean;
  isAbstractWrapperMember: boolean;
  isInsideChoiceWrapper: boolean;
  isSelectedSubstitution: boolean;
  candidates: Record<string, IFieldSubstituteInfo>;
  selectedQName: string | undefined;
  memberSelectedQName: string | undefined;
  selectSelfAction: IFieldMenuAction | undefined;
  clearSubstitutionAction: IFieldMenuAction;
  changeSubstituteAction: IFieldMenuAction;
  onSelectSubstitution: (qname: string) => void;
  onOpenSubstitutionModal: () => void;
  selectedIcon: ReactNode;
  unselectedIcon: ReactNode;
}

/** Config for {@link WrapperActionService.buildMenuGroupsForChoiceNode}. See {@link IAbstractMenuGroupsConfig}. */
export interface IChoiceMenuGroupsConfig {
  isChoiceWrapper: boolean;
  isChoiceWrapperMember: boolean;
  isNestedSelectedChoice: boolean;
  isSelectedChoice: boolean;
  dissolved: IWrapperCandidate[];
  selectedModalKey: string | null;
  selectSelfAction: IFieldMenuAction | undefined;
  clearChoiceAction: IFieldMenuAction;
  changeMemberAction: IFieldMenuAction;
  onSelectChoiceMember: (selection: IMemberSelection) => void;
  onOpenChoiceModal: () => void;
  selectedIcon: ReactNode;
  unselectedIcon: ReactNode;
}
