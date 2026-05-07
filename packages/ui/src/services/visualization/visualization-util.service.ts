import { IField } from '../../models/datamapper/document';
import {
  AbstractFieldNodeData,
  ChoiceFieldNodeData,
  FieldItemNodeData,
  FieldNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
} from '../../models/datamapper/visualization';
import { DocumentService } from '../document/document.service';

/**
 * Static utility service for inspecting {@link NodeData} properties in the
 * DataMapper visualization layer.
 *
 * Provides node-type checks (`is*Field`) and field extraction helpers that
 * both {@link VisualizationService} (node data generation) and
 * {@link MappingActionService} (mapping mutations) depend on, without either
 * service needing to know about the other.
 */
export class VisualizationUtilService {
  /**
   * Returns `true` if the node's field is a collection (array/repeating element).
   * Also checks the choice wrapper field for collection status when the node is a selected choice member.
   * @param nodeData - The node to test.
   */
  static isCollectionField(nodeData: NodeData) {
    if (!(nodeData instanceof FieldNodeData || nodeData instanceof FieldItemNodeData)) return false;
    if (DocumentService.isCollectionField(nodeData.field)) return true;
    if (VisualizationUtilService.isChoiceField(nodeData)) {
      return !!nodeData.choiceField && DocumentService.isCollectionField(nodeData.choiceField);
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
   * is showing all choice options. Used by the context menu to decide which actions to offer.
   * @param nodeData - The node to test.
   */
  static isUnselectedChoiceField(nodeData: NodeData): nodeData is ChoiceFieldNodeData | TargetChoiceFieldNodeData {
    return VisualizationUtilService.isChoiceField(nodeData) && !nodeData.choiceField;
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
   * Returns `true` if the node represents a recursive field reference (self-referencing type).
   * @param nodeData - The node to test.
   */
  static isRecursiveField(nodeData: NodeData) {
    const field = VisualizationUtilService.getField(nodeData);
    return field ? DocumentService.isRecursiveField(field) : false;
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
}
