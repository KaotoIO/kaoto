import {
  MappingNodeData,
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
  OtherwiseItem,
  ValueSelector,
  WhenItem,
} from '../models/mapping';
import { IField, PrimitiveDocument } from '../models/document';
import { MappingService } from './mapping.service';

type MappingNodePairType = {
  sourceNode?: SourceNodeDataType;
  targetNode?: NodeData;
};

export class VisualizationService {
  static generateNodeDataChildren(nodeData: NodeData) {
    const isDocument = nodeData instanceof DocumentNodeData;
    const isPrimitive = isDocument && nodeData.document instanceof PrimitiveDocument;
    return isPrimitive
      ? VisualizationService.generatePrimitiveDocumentChildren(nodeData)
      : isDocument
        ? VisualizationService.generateStructuredDocumentChildren(nodeData)
        : VisualizationService.generateNonDocumentNodeDataChildren(nodeData);
  }
  static generatePrimitiveDocumentChildren(document: DocumentNodeData): NodeData[] {
    if (!document.mapping?.children) return [];
    return document.mapping.children.map((child) => new MappingNodeData(document, child));
  }

  static generateStructuredDocumentChildren(document: DocumentNodeData): NodeData[] {
    return VisualizationService.doGenerateNodeDataFromFields(
      document,
      document.document.fields,
      document.mapping?.children,
    );
  }

  private static doGenerateNodeDataFromFields(parent: NodeData, fields: IField[], mappings?: MappingItem[]) {
    const answer: NodeData[] =
      mappings?.filter((m) => m instanceof ValueSelector).map((m) => new MappingNodeData(parent, m)) ?? [];
    return fields.reduce((acc, field) => {
      const mappingsForField = mappings ? MappingService.filterMappingsForField(mappings, field) : [];
      if (mappingsForField.length === 0) {
        const fieldNodeData = new FieldNodeData(parent, field);
        acc.push(fieldNodeData);
        return acc;
      }
      mappingsForField
        .filter((mapping) => !VisualizationService.isExistingMapping(acc, mapping))
        .sort((left, right) => VisualizationService.sortMappingItem(left, right))
        .forEach((mapping) => {
          if (mapping instanceof FieldItem) {
            const fieldNodeData = new FieldNodeData(parent, field, mapping);
            acc.push(fieldNodeData);
          } else {
            acc.push(new MappingNodeData(parent, mapping));
          }
        });
      return acc;
    }, answer);
  }

  private static isExistingMapping(nodes: NodeData[], mapping: MappingItem) {
    return nodes.find((node) => 'mapping' in node && node.mapping === mapping);
  }

  private static sortMappingItem(left: MappingItem, right: MappingItem) {
    if (left instanceof WhenItem) return right instanceof OtherwiseItem ? -1 : 0;
    if (right instanceof WhenItem) return left instanceof OtherwiseItem ? 1 : 0;
    return 0;
  }

  static generateNonDocumentNodeDataChildren(parent: NodeData): NodeData[] {
    if (parent instanceof MappingNodeData) {
      return parent.mapping?.children
        ? parent.mapping.children
            .sort((left, right) => VisualizationService.sortMappingItem(left, right))
            .map((m) => VisualizationService.createNodeDataFromMappingItem(parent, m))
        : [];
    } else if (parent instanceof FieldNodeData) {
      return VisualizationService.doGenerateNodeDataFromFields(parent, parent.field.fields, parent.mapping?.children);
    } else {
      throw Error(`Unknown NodeData: ${parent.id}`);
    }
  }

  private static createNodeDataFromMappingItem(parent: NodeData, item: MappingItem): NodeData {
    return item instanceof FieldItem ? new FieldNodeData(parent, item.field, item) : new MappingNodeData(parent, item);
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

  static allowIfChoose(nodeData: NodeData) {
    if (nodeData instanceof MappingNodeData) {
      const mapping = nodeData.mapping;
      if (mapping instanceof ValueSelector || mapping instanceof WhenItem || mapping instanceof OtherwiseItem)
        return false;
    }
    return true;
  }

  static allowForEach(nodeData: NodeData) {
    return nodeData instanceof FieldNodeData && VisualizationService.isCollectionField(nodeData);
  }

  static isValueSelectorNode(nodeData: NodeData) {
    return nodeData instanceof MappingNodeData && nodeData.mapping instanceof ValueSelector;
  }

  static allowValueSelector(nodeData: NodeData) {
    const isChooseNode = nodeData instanceof MappingNodeData && nodeData.mapping instanceof ChooseItem;
    const isValueSelector = nodeData instanceof MappingNodeData && nodeData.mapping instanceof ValueSelector;
    return !isChooseNode && !isValueSelector;
  }

  static hasValueSelector(nodeData: NodeData) {
    return !!(
      (nodeData instanceof MappingNodeData && nodeData.mapping.children.find((c) => c instanceof ValueSelector)) ||
      (nodeData instanceof DocumentNodeData && nodeData.mapping?.children.find((c) => c instanceof ValueSelector))
    );
  }

  static deleteMappingItem(nodeData: NodeData) {
    if ('mapping' in nodeData && nodeData.mapping) MappingService.deleteMappingItem(nodeData.mapping);
  }

  static applyIf(nodeData: NodeData) {
    VisualizationService.doApplyCondition(nodeData, (parent) => new IfItem(parent));
  }

  static applyChoose(nodeData: NodeData) {
    VisualizationService.doApplyCondition(nodeData, (parent) => new ChooseItem(parent));
  }

  private static doApplyCondition(nodeData: NodeData, createItem: (parent: MappingParentType) => MappingItem) {
    if (nodeData instanceof DocumentNodeData && nodeData.mapping) {
      nodeData.mapping.children.push(createItem(nodeData.mapping));
    } else if ((nodeData instanceof MappingNodeData || nodeData instanceof FieldNodeData) && nodeData.mapping) {
      const item = createItem(nodeData.mapping.parent);
      item.children.push(nodeData.mapping);
      nodeData.mapping.parent.children = nodeData.mapping.parent.children.filter((m) => m !== nodeData.mapping);
      nodeData.mapping.parent.children.push(item);
      nodeData.mapping.parent = item;
    } else {
      throw Error(`Unsupported: ${nodeData.title}`);
    }
  }

  static isForEachNode(nodeData: NodeData) {
    return nodeData instanceof MappingNodeData && nodeData.mapping instanceof ForEachItem;
  }

  static applyForEach(nodeData: FieldNodeData) {
    const target = VisualizationService.isForEachNode(nodeData.parent)
      ? (nodeData.parent as MappingNodeData).parent
      : nodeData.parent;
    if (target.mapping) {
      target.mapping.children.push(new ForEachItem(target.mapping, nodeData.field));
    } else {
      throw Error(`Unsupported: ${nodeData.title}`);
    }
  }

  static applyValueSelector(nodeData: NodeData) {
    if (!nodeData.mapping) return;
    const existing = nodeData.mapping.children.find((c) => c instanceof ValueSelector);
    if (!existing) nodeData.mapping.children.push(new ValueSelector(nodeData.mapping));
  }

  static engageMapping(mappingTree: MappingTree, sourceNode: SourceNodeDataType, targetNode: NodeData) {
    const sourceItem = 'document' in sourceNode ? (sourceNode.document as PrimitiveDocument) : sourceNode.field;
    if (targetNode instanceof MappingNodeData) {
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
