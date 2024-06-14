import {
  ConditionNodeData,
  DocumentNodeData,
  FieldNodeData,
  NodeData,
  SourceNodeDataType,
} from '../models/visualization';
import {
  ChooseItem,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingItem,
  MappingParentType,
  MappingTree,
  ValueSelector,
} from '../models/mapping';
import { IField, PrimitiveDocument } from '../models/document';
import { MappingService } from './mapping.service';

type MappingNodePairType = {
  sourceNode?: SourceNodeDataType;
  targetNode?: NodeData;
};

export class VisualizationService {
  static generatePrimitiveDocumentChildren(document: DocumentNodeData): NodeData[] {
    if (!document.mappingTree?.children) return [];
    return document.mappingTree.children
      .filter((child) => !(child instanceof ValueSelector))
      .map((child) => new ConditionNodeData(document, child));
  }

  static generateStructuredDocumentChildren(document: DocumentNodeData): NodeData[] {
    return VisualizationService.doGenerateNodeDataFromFields(
      document,
      document.document.fields,
      document.mappingTree?.children,
    );
  }

  private static doGenerateNodeDataFromFields(parent: NodeData, fields: IField[], mappings?: MappingItem[]) {
    return fields.reduce((acc, field) => {
      const mappingsForField = mappings ? MappingService.filterMappingsForField(mappings, field) : [];
      if (mappingsForField.length === 0) {
        const fieldNodeData = new FieldNodeData(parent, field);
        acc.push(fieldNodeData);
        return acc;
      }
      mappingsForField
        .filter((mapping) => !VisualizationService.isExistingMapping(acc, mapping))
        .forEach((mapping) => {
          if (mapping instanceof FieldItem) {
            const fieldNodeData = new FieldNodeData(parent, field, mapping);
            acc.push(fieldNodeData);
          } else if (mapping instanceof ChooseItem) {
            acc.push(new ConditionNodeData(parent, mapping));
          } else {
            acc.push(new ConditionNodeData(parent, mapping));
          }
        });
      return acc;
    }, [] as NodeData[]);
  }

  private static isExistingMapping(nodes: NodeData[], mapping: MappingItem) {
    return nodes.find((node) => 'mapping' in node && node.mapping === mapping);
  }

  static generateNodeDataChildren(parent: NodeData): NodeData[] {
    if (parent instanceof ConditionNodeData) {
      return parent.mapping?.children
        ? parent.mapping.children.map((m) => VisualizationService.createNodeDataFromMappingItem(parent, m))
        : [];
    } else if (parent instanceof FieldNodeData) {
      return VisualizationService.doGenerateNodeDataFromFields(parent, parent.field.fields, parent.mapping?.children);
    } else {
      throw Error(`Unknown NodeData: ${parent.id}`);
    }
  }

  private static createNodeDataFromMappingItem(parent: NodeData, item: MappingItem): NodeData {
    return item instanceof FieldItem
      ? new FieldNodeData(parent, item.field, item)
      : new ConditionNodeData(parent, item);
  }

  static testNodePair(fromNode: NodeData, toNode: NodeData): MappingNodePairType {
    const answer: MappingNodePairType = {};
    if ((fromNode.isSource && toNode.isSource) || (!fromNode.isSource && !toNode.isSource)) return answer;

    const sourceNode = (fromNode.isSource ? fromNode : toNode) as SourceNodeDataType;
    const targetNode = fromNode.isSource ? toNode : fromNode;
    return { sourceNode, targetNode };
  }

  static isCollectionField(nodeData: NodeData) {
    return nodeData instanceof FieldNodeData && nodeData.field?.maxOccurs && nodeData.field.maxOccurs > 1;
  }

  static isAttributeField(nodeData: NodeData) {
    return nodeData instanceof FieldNodeData && nodeData.field?.isAttribute;
  }

  static allowForEach(nodeData: NodeData) {
    return nodeData instanceof FieldNodeData && VisualizationService.isCollectionField(nodeData);
  }

  static deleteMappingItem(nodeData: NodeData) {
    if ('mapping' in nodeData) MappingService.deleteMappingItem(nodeData.mapping as MappingItem);
    else if ('mappingTree' in nodeData) MappingService.deleteMappingItem(nodeData.mappingTree as MappingTree);
  }

  static applyIf(nodeData: NodeData) {
    VisualizationService.doApplyCondition(nodeData, (parent) => new IfItem(parent));
  }

  static applyChoose(nodeData: NodeData) {
    VisualizationService.doApplyCondition(nodeData, (parent) => new ChooseItem(parent));
  }

  private static doApplyCondition(nodeData: NodeData, createItem: (parent: MappingParentType) => MappingItem) {
    if (nodeData instanceof DocumentNodeData && nodeData.mappingTree) {
      nodeData.mappingTree.children.push(createItem(nodeData.mappingTree));
    } else if ((nodeData instanceof ConditionNodeData || nodeData instanceof FieldNodeData) && nodeData.mapping) {
      nodeData.mapping.children.push(createItem(nodeData.mapping));
    } else {
      throw Error(`Unsupported: ${nodeData.title}`);
    }
  }

  static isForEachNode(nodeData: NodeData) {
    return nodeData instanceof ConditionNodeData && nodeData.mapping instanceof ForEachItem;
  }

  static applyForEach(nodeData: FieldNodeData) {
    const target = VisualizationService.isForEachNode(nodeData.parent)
      ? (nodeData.parent as ConditionNodeData).parent
      : nodeData.parent;
    if (target instanceof DocumentNodeData && target.mappingTree) {
      target.mappingTree.children.push(new ForEachItem(target.mappingTree, nodeData.field));
    } else if ((target instanceof ConditionNodeData || target instanceof FieldNodeData) && target.mapping) {
      target.mapping.children.push(new ForEachItem(target.mapping, nodeData.field));
    } else {
      throw Error(`Unsupported: ${nodeData.title}`);
    }
  }

  static engageMapping(mappingTree: MappingTree, sourceNode: SourceNodeDataType, targetNode: NodeData) {
    const sourceItem = 'document' in sourceNode ? (sourceNode.document as PrimitiveDocument) : sourceNode.field;
    if (targetNode instanceof ConditionNodeData) {
      MappingService.mapToCondition(targetNode.mapping, sourceItem);
    } else if (targetNode instanceof DocumentNodeData) {
      MappingService.mapToDocument(mappingTree, sourceItem);
    } else if (targetNode instanceof FieldNodeData) {
      MappingService.mapToField(targetNode.field, mappingTree, targetNode.mapping, sourceItem);
    } else {
      throw Error(`Unsupported: ${targetNode.title}`);
    }
  }
}
