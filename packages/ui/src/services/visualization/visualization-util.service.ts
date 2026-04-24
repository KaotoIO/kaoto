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
    const choiceField = (nodeData as ChoiceFieldNodeData | TargetChoiceFieldNodeData).choiceField;
    return !!choiceField && DocumentService.isCollectionField(choiceField);
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
  static isChoiceField(nodeData: NodeData) {
    return nodeData instanceof ChoiceFieldNodeData || nodeData instanceof TargetChoiceFieldNodeData;
  }

  /**
   * Returns `true` if the node is a choice field with a selected member (choiceField is set).
   * @param nodeData - The node to test.
   */
  static isSelectedChoiceField(nodeData: NodeData) {
    return (
      (nodeData instanceof ChoiceFieldNodeData || nodeData instanceof TargetChoiceFieldNodeData) &&
      !!nodeData.choiceField
    );
  }

  /**
   * Returns `true` if the node is an abstract field, on either source or target side.
   * @param nodeData - The node to test.
   */
  static isAbstractField(nodeData: NodeData) {
    return nodeData instanceof AbstractFieldNodeData || nodeData instanceof TargetAbstractFieldNodeData;
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
