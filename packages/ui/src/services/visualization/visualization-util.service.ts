import { IField } from '../../models/datamapper/document';
import {
  AbstractFieldNodeData,
  AddMappingNodeData,
  ChoiceFieldNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  NodeData,
  SequenceFieldNodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetFieldNodeData,
  TargetSequenceFieldNodeData,
} from '../../models/datamapper/visualization';
import { DocumentService } from '../document/document.service';

/**
 * Static utility service for inspecting {@link NodeData} properties in the
 * DataMapper visualization layer.
 *
 * Provides node-type checks (`is*Field`) and field extraction helpers that
 * both {@link VisualizationService} (node data generation),
 * {@link MappingActionService} (mapping mutations), and
 * {@link MappingActionRegistryService} (action registry) depend on,
 * without any of those services needing to know about each other.
 */
export class VisualizationUtilService {
  /**
   * Returns `true` if the node's field is a collection (array/repeating element).
   * Also checks the choice wrapper field for collection status when the node is a selected choice member.
   * For unselected choice members (children of a collection choice wrapper), the collection status
   * is inherited from the parent wrapper via DocumentService.isCollectionField().
   * @param nodeData - The node to test.
   */
  static isCollectionField(nodeData: NodeData) {
    if (!(nodeData instanceof FieldNodeData || nodeData instanceof FieldItemNodeData)) return false;
    if (nodeData instanceof FieldItemNodeData && nodeData.wrapperField) {
      return DocumentService.isCollectionField(nodeData.wrapperField);
    }
    if (DocumentService.isCollectionField(nodeData.field)) return true;
    if (VisualizationUtilService.isChoiceField(nodeData)) {
      return !!nodeData.choiceField && DocumentService.isCollectionField(nodeData.choiceField);
    }
    if (VisualizationUtilService.isAbstractField(nodeData)) {
      return !!nodeData.abstractField && DocumentService.isCollectionField(nodeData.abstractField);
    }
    return false;
  }

  /**
   * Returns `true` if the node's field is an XML attribute.
   * @param nodeData - The node to test.
   */
  static isAttributeField(nodeData: NodeData) {
    return VisualizationUtilService.getField(nodeData)?.isAttribute ?? false;
  }

  /**
   * Returns `true` if the node is a choice field (union/anyOf member selection), on either source or target side.
   * @param nodeData - The node to test.
   */
  /**
   * Type predicate — enables TypeScript to narrow `nodeData` to
   * `ChoiceFieldNodeData | TargetChoiceFieldNodeData` in the calling scope,
   * eliminating the need for unsafe `as` casts after the check.
   */
  static isChoiceField(nodeData: NodeData): nodeData is ChoiceFieldNodeData | TargetChoiceFieldNodeData {
    return nodeData instanceof ChoiceFieldNodeData || nodeData instanceof TargetChoiceFieldNodeData;
  }

  /**
   * Returns `true` if the node is a choice field with a selected member (choiceField is set).
   * Delegates to {@link isChoiceField} for the type check to avoid duplicating `instanceof` guards.
   * @param nodeData - The node to test.
   */
  static isSelectedChoiceField(nodeData: NodeData): nodeData is ChoiceFieldNodeData | TargetChoiceFieldNodeData {
    return VisualizationUtilService.isChoiceField(nodeData) && !!nodeData.choiceField;
  }

  /**
   * Returns `true` if the node is a choice field without a selected member — i.e. the wrapper
   * is showing all choice options. Also matches target-only unselected wrapper instances:
   * a {@link FieldItemNodeData} whose field still points at the wrapper itself, or an
   * {@link AddMappingNodeData} for a choice wrapper field.
   * @param nodeData - The node to test.
   */
  static isUnselectedChoiceField(nodeData: NodeData): boolean {
    if (VisualizationUtilService.isChoiceField(nodeData) && !nodeData.choiceField) return true;
    if (
      nodeData instanceof FieldItemNodeData &&
      nodeData.wrapperField?.wrapperKind === 'choice' &&
      nodeData.field === nodeData.wrapperField
    )
      return true;
    if (nodeData instanceof AddMappingNodeData && nodeData.field.wrapperKind === 'choice') return true;
    return false;
  }

  /**
   * Returns `true` if the node is a selected choice whose selected member is itself
   * a choice wrapper (nested choice). This occurs when an `xs:choice` contains another
   * `xs:choice` as one of its members — the outer wrapper has a selected member
   * (`choiceField` is set), and that member's `wrapperKind` is `'choice'`, meaning
   * it is an inner choice that can be further expanded. Used by {@link FieldNodeTitle}
   * to show a green "choice" badge, distinguishing this state from a plain selected
   * member (which only shows the green choice icon).
   * @param nodeData - The node to test.
   */
  static isSelectedNestedChoice(nodeData: NodeData): boolean {
    return VisualizationUtilService.isSelectedChoiceField(nodeData) && nodeData.field.wrapperKind === 'choice';
  }

  /**
   * Walks up from `wrapper` through ancestor choice fields that also have a selection,
   * returning the outermost selected wrapper and the number of levels traversed.
   */
  static resolveOutermostSelectedWrapper(wrapper: IField | undefined): {
    outermost: IField | undefined;
    depth: number;
  } {
    let depth = 1;
    let current = wrapper;
    while (
      current?.parent &&
      'wrapperKind' in current.parent &&
      current.parent.wrapperKind === 'choice' &&
      current.parent.selectedMemberIndex !== undefined
    ) {
      depth++;
      current = current.parent;
    }
    return { outermost: current, depth };
  }

  /**
   * Returns the number of resolved choice wrapper levels for a selected choice node.
   * A simple selected choice returns 1. A flattened nested choice (both outer and inner
   * selected) returns 2+, indicating how many wrapper levels were collapsed.
   * Returns 0 for non-choice nodes.
   */
  static getSelectedChoiceDepth(nodeData: NodeData): number {
    if (!VisualizationUtilService.isSelectedChoiceField(nodeData)) return 0;
    return VisualizationUtilService.resolveOutermostSelectedWrapper(nodeData.choiceField).depth;
  }

  /**
   * Returns `true` if the node is an abstract field, on either source or target side.
   * @param nodeData - The node to test.
   */
  static isAbstractField(nodeData: NodeData): nodeData is AbstractFieldNodeData | TargetAbstractFieldNodeData {
    return nodeData instanceof AbstractFieldNodeData || nodeData instanceof TargetAbstractFieldNodeData;
  }

  /**
   * Returns `true` if the node is an abstract field with a selected substitution member.
   * @param nodeData - The node to test.
   */
  static isSelectedAbstractField(nodeData: NodeData): nodeData is AbstractFieldNodeData | TargetAbstractFieldNodeData {
    return VisualizationUtilService.isAbstractField(nodeData) && !!nodeData.abstractField;
  }

  /**
   * Returns `true` if the node is an abstract field without a selected substitution member.
   * Also matches target-only unsubstituted wrapper instances: a {@link FieldItemNodeData}
   * whose field still points at the wrapper itself, or an {@link AddMappingNodeData} for
   * an abstract wrapper field.
   * @param nodeData - The node to test.
   */
  static isUnselectedAbstractField(nodeData: NodeData): boolean {
    if (VisualizationUtilService.isAbstractField(nodeData) && !nodeData.abstractField) return true;
    if (
      nodeData instanceof FieldItemNodeData &&
      nodeData.wrapperField?.wrapperKind === 'abstract' &&
      nodeData.field === nodeData.wrapperField
    )
      return true;
    if (nodeData instanceof AddMappingNodeData && nodeData.field.wrapperKind === 'abstract') return true;
    return false;
  }

  /**
   * Identifies a per-instance member of a maxOccurs>1 abstract wrapper — a FieldItem
   * that holds an independent substitution selection, as opposed to the document-level
   * `selectedMemberQName` model used for maxOccurs=1. Target-side only by construction:
   * both `FieldItemNodeData` and `TargetAbstractFieldNodeData` are target-only types.
   */
  static isAbstractWrapperMember(nodeData: NodeData): boolean {
    if (!(nodeData instanceof FieldItemNodeData)) return false;
    return nodeData.parent instanceof TargetAbstractFieldNodeData || nodeData.wrapperField?.wrapperKind === 'abstract';
  }

  /** Choice-wrapper counterpart of {@link isAbstractWrapperMember}. */
  static isChoiceWrapperMember(nodeData: NodeData): boolean {
    if (!(nodeData instanceof FieldItemNodeData)) return false;
    return nodeData.parent instanceof TargetChoiceFieldNodeData || nodeData.wrapperField?.wrapperKind === 'choice';
  }

  /**
   * Returns `true` if the node is a sequence wrapper field, on either source or target side.
   * @param nodeData - The node to test.
   */
  static isSequenceField(nodeData: NodeData): nodeData is SequenceFieldNodeData | TargetSequenceFieldNodeData {
    return nodeData instanceof SequenceFieldNodeData || nodeData instanceof TargetSequenceFieldNodeData;
  }

  /**
   * Returns `true` if the node represents a recursive field reference (self-referencing type).
   * @param nodeData - The node to test.
   */
  static isRecursiveField(nodeData: NodeData) {
    const field = VisualizationUtilService.getField(nodeData);
    return field ? DocumentService.isRecursiveField(field) : false;
  }

  /**
   * Returns `true` if the node's field is a terminal/primitive field (has no schema children).
   * Terminal fields can still contain XSLT instructions like for-each, choose, if, etc.
   * @param nodeData - The node to test.
   */
  static isTerminalField(nodeData: NodeData): boolean {
    const field = VisualizationUtilService.getField(nodeData);
    if (!field) return false;
    return !DocumentService.hasChildren(field);
  }

  /**
   * Returns the underlying {@link IField} for field-backed nodes, or `undefined` for
   * document and pure mapping nodes.
   * @param nodeData - The node to extract the field from.
   */
  static getField(nodeData: NodeData): IField | undefined {
    if (nodeData instanceof FieldNodeData || nodeData instanceof FieldItemNodeData) {
      return nodeData.field;
    }
    return undefined;
  }

  static isFieldNode(nodeData: NodeData): nodeData is FieldItemNodeData | TargetFieldNodeData {
    return nodeData instanceof FieldItemNodeData || nodeData instanceof TargetFieldNodeData;
  }

  static isMappingNode(nodeData: NodeData): nodeData is MappingNodeData {
    return nodeData instanceof MappingNodeData;
  }

  /**
   * Resolves the full choice context for a given node — which wrapper it belongs to,
   * whether it's a selected member, a per-instance wrapper member, etc. Pure read,
   * no side effects. Used by {@link useChoiceContextMenu} to determine what menu
   * actions to offer.
   */
  static resolveChoiceNodeInfo(nodeData: NodeData): ChoiceNodeInfo {
    const field = VisualizationUtilService.getField(nodeData);
    const isChoiceWrapper = field?.wrapperKind === 'choice';
    const isSelectedChoice = VisualizationUtilService.isSelectedChoiceField(nodeData);

    const choiceMemberField =
      VisualizationUtilService.isChoiceField(nodeData) && nodeData.choiceField ? nodeData.choiceField : field;
    const choiceMemberParent =
      choiceMemberField?.parent && 'wrapperKind' in choiceMemberField.parent ? choiceMemberField.parent : undefined;
    const isChoiceMember = choiceMemberParent?.wrapperKind === 'choice';
    const parentChoiceWrapperField = isChoiceMember ? choiceMemberParent : undefined;
    const choiceMemberIndex =
      isChoiceMember && parentChoiceWrapperField && choiceMemberField
        ? parentChoiceWrapperField.fields.indexOf(choiceMemberField)
        : undefined;

    let choiceWrapperField: IField | undefined;
    if (isSelectedChoice) {
      choiceWrapperField = VisualizationUtilService.resolveOutermostSelectedWrapper(nodeData.choiceField).outermost;
    } else if (isChoiceWrapper) {
      choiceWrapperField = field;
    }
    const activeChoiceWrapperForMembers = isSelectedChoice && isChoiceWrapper ? field : choiceWrapperField;

    const isChoiceWrapperMember = VisualizationUtilService.isChoiceWrapperMember(nodeData);
    const choiceWrapperMemberField =
      isChoiceWrapperMember && nodeData instanceof FieldItemNodeData
        ? (nodeData.wrapperField ?? ((nodeData.parent as TargetChoiceFieldNodeData).field as IField))
        : undefined;
    const effectiveChoiceWrapper = isChoiceWrapperMember ? choiceWrapperMemberField : activeChoiceWrapperForMembers;

    return {
      isChoiceWrapper,
      isSelectedChoice,
      isChoiceMember,
      isChoiceWrapperMember,
      activeChoiceWrapperForMembers,
      effectiveChoiceWrapper,
      choiceWrapperField,
      choiceWrapperMemberField,
      choiceMemberField,
      parentChoiceWrapperField,
      choiceMemberIndex,
    };
  }
}

export interface ChoiceNodeInfo {
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
