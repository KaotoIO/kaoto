import { IField, IParentType } from '../../models/datamapper/document';
import { FieldCardinality } from '../../models/datamapper/field-cardinality';
import { CopyOfSelector, FieldItem, MappingItem, ValueOfSelector } from '../../models/datamapper/mapping';
import {
  AbstractFieldNodeData,
  AddMappingNodeData,
  ChoiceFieldNodeData,
  CopyOfFieldNodeData,
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
import { WrapperSelectionService } from '../document/wrapper-selection.service';

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
   * Returns the cardinality of the field a tree row shows, with its own and its effective occurrence. It delegates
   * to {@link DocumentService.getCardinality}, which reads only the field's ancestor chain, so the answer is the
   * same for every node class that shows the field, whichever wrapper back-reference it carries.
   * @param nodeData - The node to resolve.
   * @returns the cardinality, or `undefined` for a node that shows no field
   */
  static getCardinality(nodeData: NodeData): FieldCardinality | undefined {
    const field = VisualizationUtilService.getField(nodeData);
    if (!field) return undefined;
    return DocumentService.getCardinality(field);
  }

  /**
   * Returns `true` if the row repeats ({@link FieldCardinality.isRepeating}). Drives the collection icon, the
   * collection-gated mapping actions and the automatic `for-each` on a field-to-field drop.
   * @param nodeData - The node to test.
   */
  static isCollectionField(nodeData: NodeData): boolean {
    return VisualizationUtilService.getCardinality(nodeData)?.isRepeating ?? false;
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
   * Returns the enclosing choice wrapper of a node that represents a *selected* choice branch,
   * or `undefined`. Both {@link ChoiceFieldNodeData} (a directly selected member) and
   * {@link SequenceFieldNodeData} (an xs:sequence selected as one choice branch) carry this
   * back-reference in their `choiceField`; this helper is the single place that knows which node
   * types do, so the selection/menu code does not need per-type `instanceof` chains.
   * @param nodeData - The node to inspect.
   */
  static getSelectedChoiceWrapper(nodeData: NodeData): IField | undefined {
    if (VisualizationUtilService.isChoiceField(nodeData)) return nodeData.choiceField;
    if (VisualizationUtilService.isSequenceField(nodeData)) return nodeData.choiceField;
    return undefined;
  }

  /**
   * Returns `true` if the node represents a choice branch that has a member selected. This is
   * true for a {@link ChoiceFieldNodeData} with `choiceField` set, and also for a
   * {@link SequenceFieldNodeData} rendered as the selected branch of an xs:choice — both cases
   * are detected via {@link getSelectedChoiceWrapper}.
   * @param nodeData - The node to test.
   */
  static isSelectedChoiceField(nodeData: NodeData): boolean {
    return !!VisualizationUtilService.getSelectedChoiceWrapper(nodeData);
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
    return (
      VisualizationUtilService.isSelectedChoiceField(nodeData) &&
      VisualizationUtilService.getField(nodeData)?.wrapperKind === 'choice'
    );
  }

  /**
   * Returns the number of resolved choice wrapper levels for a selected choice node.
   * A simple selected choice returns 1. A flattened nested choice (both outer and inner
   * selected) returns 2+, indicating how many wrapper levels were collapsed.
   * Returns 0 for non-choice nodes.
   */
  static getSelectedChoiceDepth(nodeData: NodeData): number {
    const choiceWrapper = VisualizationUtilService.getSelectedChoiceWrapper(nodeData);
    if (!choiceWrapper) return 0;
    return WrapperSelectionService.resolveOutermostSelectedWrapper(choiceWrapper).depth;
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
   * Returns `true` if the node is a choice or abstract wrapper without a selected member (see
   * {@link isUnselectedChoiceField} and {@link isUnselectedAbstractField}). Such a wrapper writes no element of
   * its own.
   * @param nodeData - The node to test.
   */
  static isUnselectedWrapperField(nodeData: NodeData): boolean {
    return (
      VisualizationUtilService.isUnselectedChoiceField(nodeData) ||
      VisualizationUtilService.isUnselectedAbstractField(nodeData)
    );
  }

  /**
   * Identifies a per-instance member of a maxOccurs>1 abstract wrapper — a FieldItem
   * that holds an independent substitution selection, as opposed to the document-level
   * `selectedMemberQName` model used for a wrapper that is not a collection. Target-side only by construction:
   * both `FieldItemNodeData` and `TargetAbstractFieldNodeData` are target-only types.
   *
   * Only a parent that is the unselected wrapper counts. The row of a selected substitute is an ordinary element,
   * so a FieldItem under it maps a child of that element.
   */
  static isAbstractWrapperMember(nodeData: NodeData): boolean {
    if (!(nodeData instanceof FieldItemNodeData)) return false;
    return (
      VisualizationUtilService.isUnselectedAbstractField(nodeData.parent) ||
      nodeData.wrapperField?.wrapperKind === 'abstract'
    );
  }

  /**
   * Choice-wrapper counterpart of {@link isAbstractWrapperMember}. Only a parent that is the unselected wrapper
   * counts; a FieldItem under a selected member maps a child of that member.
   */
  static isChoiceWrapperMember(nodeData: NodeData): boolean {
    if (!(nodeData instanceof FieldItemNodeData)) return false;
    return (
      VisualizationUtilService.isUnselectedChoiceField(nodeData.parent) ||
      nodeData.wrapperField?.wrapperKind === 'choice'
    );
  }

  /**
   * Returns `true` if the node is a sequence wrapper field, on either source or target side.
   * @param nodeData - The node to test.
   */
  static isSequenceField(nodeData: NodeData): nodeData is SequenceFieldNodeData | TargetSequenceFieldNodeData {
    return nodeData instanceof SequenceFieldNodeData || nodeData instanceof TargetSequenceFieldNodeData;
  }

  /**
   * Returns `true` if the node should render as an xs:sequence (i.e. show the "sequence" badge
   * instead of a title). Unlike {@link isSequenceField}, this also matches a per-instance
   * {@link FieldItemNodeData} whose own field is a sequence — the shape a repeating (maxOccurs>1)
   * choice's selected sequence branch takes (built directly in generateCollectionWrapperNodes,
   * bypassing {@link SequenceFieldNodeData}). Both must render identically as a bare "sequence"
   * badge, since a sequence's synthetic `displayName` ("sequence") is never a meaningful title and
   * its children are already shown as individual sub-nodes.
   * @param nodeData - The node to test.
   */
  static isSequenceNode(nodeData: NodeData): boolean {
    return VisualizationUtilService.getField(nodeData)?.wrapperKind === 'sequence';
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
    if (
      nodeData instanceof FieldNodeData ||
      nodeData instanceof FieldItemNodeData ||
      nodeData instanceof CopyOfFieldNodeData
    ) {
      return nodeData.field;
    }
    return undefined;
  }

  static isFieldNode(nodeData: NodeData): nodeData is FieldItemNodeData | TargetFieldNodeData | CopyOfFieldNodeData {
    return (
      nodeData instanceof FieldItemNodeData ||
      nodeData instanceof TargetFieldNodeData ||
      nodeData instanceof CopyOfFieldNodeData
    );
  }

  static isMappingNode(nodeData: NodeData): nodeData is MappingNodeData {
    return nodeData instanceof MappingNodeData;
  }

  /**
   * Returns the {@link CopyOfSelector} drawn on a field row, for {@link FieldNodeTitle} to render the
   * "copy" badge on container fields, or `undefined` for any other node.
   */
  static getInlineContainerCopyOf(nodeData: NodeData): CopyOfSelector | undefined {
    return nodeData instanceof CopyOfFieldNodeData ? nodeData.mapping : undefined;
  }

  /**
   * Returns the inline {@link ValueOfSelector} for a {@link FieldItemNodeData} whose mapping is a
   * {@link FieldItem} with child fields, or `undefined` if there is none. Used by {@link FieldNodeTitle}
   * to render the "value" badge on container fields, to tell it apart from the inline "copy" badge.
   */
  static getInlineContainerValueOf(nodeData: NodeData): ValueOfSelector | undefined {
    if (!(nodeData instanceof FieldItemNodeData)) return undefined;
    return nodeData.mapping.children.find(VisualizationUtilService.isContainerValueOf);
  }

  /**
   * Whether `item` is a {@link ValueOfSelector} directly under a {@link FieldItem} whose field has
   * children, i.e. a text mapping on a container rather than on a leaf.
   */
  static isContainerValueOf(item: MappingItem): item is ValueOfSelector {
    return (
      item instanceof ValueOfSelector &&
      item.parent instanceof FieldItem &&
      DocumentService.hasChildren(item.parent.field)
    );
  }

  /**
   * Whether `item` is a selector edited inline in its parent's row rather than rendered as a row of
   * its own. A row never needs two inputs because of where each selector lives. A value-of is a child of
   * the {@link FieldItem} and is drawn on that field's row. A copy-of drawn inline on a field's row is held
   * by that field's parent, in place of a FieldItem for the field, while a copy-of nested in the FieldItem
   * is drawn on a child row or as its own row, so it can sit next to the value-of.
   * Lives here rather than in {@link VisualizationService} so that services which must not depend on
   * the tree builder, such as {@link TargetRenderService}, can ask the same question.
   * @param item - the mapping item to test
   */
  static isInlineValueSelector(item: MappingItem): item is ValueOfSelector {
    return item instanceof ValueOfSelector;
  }

  /**
   * Whether `node` is an `xs:choice` or abstract-element wrapper field.
   * @param node - the schema node to test
   */
  static isWrapperField(node: IParentType): node is IField {
    return 'wrapperKind' in node && !!node.wrapperKind;
  }

  /**
   * Whether `node` is a wrapper field with a member selected, so the selected member is rendered in
   * the wrapper's place instead of the wrapper itself.
   * @param node - the schema node to test
   */
  static isSelectedWrapperField(node: IParentType): boolean {
    if (!VisualizationUtilService.isWrapperField(node)) return false;
    if (node.wrapperKind === 'abstract') return node.selectedMemberQName !== undefined;
    return node.selectedMemberIndex !== undefined;
  }
}
