import {
  MappingNodeData,
  DocumentNodeData,
  FieldNodeData,
  NodeData,
  SourceNodeDataType,
  TargetDocumentNodeData,
  TargetNodeData,
  TargetFieldNodeData,
  TargetNodeDataType,
} from '../models/datamapper/visualization';
import {
  ChooseItem,
  ExpressionItem,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingItem,
  MappingTree,
  OtherwiseItem,
  ValueSelector,
  WhenItem,
} from '../models/datamapper/mapping';
import { IField, PrimitiveDocument } from '../models/datamapper/document';
import { MappingService } from './mapping.service';
import { DocumentService } from './document.service';

type MappingNodePairType = {
  sourceNode?: SourceNodeDataType;
  targetNode?: TargetNodeDataType;
};

export class VisualizationService {
  static generateNodeDataChildren(nodeData: NodeData) {
    const isDocument = nodeData instanceof DocumentNodeData;
    const isPrimitive = nodeData.isPrimitive;
    return isDocument
      ? isPrimitive
        ? VisualizationService.generatePrimitiveDocumentChildren(nodeData as DocumentNodeData)
        : VisualizationService.generateStructuredDocumentChildren(nodeData as DocumentNodeData)
      : VisualizationService.generateNonDocumentNodeDataChildren(nodeData);
  }
  static generatePrimitiveDocumentChildren(document: DocumentNodeData): NodeData[] {
    if (!(document instanceof TargetDocumentNodeData) || !document.mapping?.children) return [];
    return document.mapping.children.map((child) => new MappingNodeData(document, child));
  }

  static generateStructuredDocumentChildren(document: DocumentNodeData): NodeData[] {
    return VisualizationService.doGenerateNodeDataFromFields(
      document,
      document.document.fields,
      document instanceof TargetDocumentNodeData ? document.mappingTree.children : undefined,
    );
  }

  private static doGenerateNodeDataFromFields(parent: NodeData, fields: IField[], mappings?: MappingItem[]) {
    const answer: NodeData[] = [];
    if (parent.isPrimitive && mappings) {
      mappings
        .filter((m) => m instanceof ValueSelector)
        .forEach((m) => answer.push(new MappingNodeData(parent as TargetNodeData, m)));
    }
    return fields.reduce((acc, field) => {
      const mappingsForField = mappings ? MappingService.filterMappingsForField(mappings, field) : [];
      if (mappingsForField.length === 0) {
        const fieldNodeData = parent.isSource
          ? new FieldNodeData(parent, field)
          : new TargetFieldNodeData(parent as TargetNodeData, field);
        acc.push(fieldNodeData);
        return acc;
      }
      mappingsForField
        .filter((mapping) => !VisualizationService.isExistingMapping(acc as TargetNodeData[], mapping))
        .sort((left, right) => MappingService.sortMappingItem(left, right))
        .forEach((mapping) => {
          if (mapping instanceof FieldItem) {
            const fieldNodeData = new TargetFieldNodeData(parent as TargetNodeData, field, mapping);
            acc.push(fieldNodeData);
          } else {
            acc.push(new MappingNodeData(parent as TargetNodeData, mapping));
          }
        });
      return acc;
    }, answer);
  }

  private static isExistingMapping(nodes: TargetNodeData[], mapping: MappingItem) {
    return nodes.find((node) => 'mapping' in node && node.mapping === mapping);
  }

  static generateNonDocumentNodeDataChildren(parent: NodeData): NodeData[] {
    if (parent instanceof MappingNodeData) {
      return parent.mapping?.children
        ? parent.mapping.children
            .sort((left, right) => MappingService.sortMappingItem(left, right))
            .map((m) => VisualizationService.createNodeDataFromMappingItem(parent, m))
        : [];
    } else if (parent instanceof FieldNodeData) {
      DocumentService.resolveTypeFragment(parent.field);
      return VisualizationService.doGenerateNodeDataFromFields(
        parent,
        parent.field.fields,
        parent instanceof TargetFieldNodeData ? parent.mapping?.children : undefined,
      );
    }
    return [];
  }

  private static createNodeDataFromMappingItem(parent: TargetNodeData, item: MappingItem): NodeData {
    return item instanceof FieldItem
      ? new TargetFieldNodeData(parent, item.field, item)
      : new MappingNodeData(parent, item);
  }

  static testNodePair(fromNode: NodeData, toNode: NodeData): MappingNodePairType {
    const answer: MappingNodePairType = {};
    if ((fromNode.isSource && toNode.isSource) || (!fromNode.isSource && !toNode.isSource)) return answer;

    const sourceNode = (fromNode.isSource ? fromNode : toNode) as SourceNodeDataType;
    const targetNode = (fromNode.isSource ? toNode : fromNode) as TargetNodeDataType;
    return { sourceNode, targetNode };
  }

  static isDocumentNode(nodeData: NodeData) {
    return nodeData instanceof DocumentNodeData;
  }

  static isPrimitiveDocumentNode(nodeData: NodeData) {
    return nodeData instanceof DocumentNodeData && nodeData.document instanceof PrimitiveDocument;
  }

  static isCollectionField(nodeData: NodeData) {
    return nodeData instanceof FieldNodeData && nodeData.field?.maxOccurs && nodeData.field.maxOccurs > 1;
  }

  static isAttributeField(nodeData: NodeData) {
    return nodeData instanceof FieldNodeData && nodeData.field?.isAttribute;
  }

  static isRecursiveField(nodeData: NodeData) {
    return nodeData instanceof FieldNodeData && DocumentService.isRecursiveField(nodeData.field);
  }

  static hasChildren(nodeData: NodeData) {
    if (nodeData instanceof DocumentNodeData) return DocumentService.hasFields(nodeData.document);
    if (nodeData instanceof FieldNodeData) return DocumentService.hasChildren(nodeData.field);
    if (nodeData instanceof MappingNodeData) return nodeData.mapping.children.length > 0;
    return false;
  }

  static shouldCollapseByDefault(nodeData: NodeData, initialExpandedRank: number, rank: number) {
    if (nodeData instanceof DocumentNodeData) return false;
    const isRecursiveField = VisualizationService.isRecursiveField(nodeData);
    return isRecursiveField || rank > initialExpandedRank;
  }

  static allowIfChoose(nodeData: TargetNodeData) {
    if (nodeData instanceof MappingNodeData) {
      const mapping = nodeData.mapping;
      if (
        mapping instanceof ValueSelector ||
        mapping instanceof WhenItem ||
        mapping instanceof OtherwiseItem ||
        mapping instanceof IfItem ||
        mapping instanceof ChooseItem
      )
        return false;
    }
    return true;
  }

  static allowForEach(nodeData: TargetNodeData) {
    return nodeData instanceof TargetFieldNodeData && VisualizationService.isCollectionField(nodeData);
  }

  static isForEachNode(nodeData: TargetNodeData) {
    return nodeData instanceof MappingNodeData && nodeData.mapping instanceof ForEachItem;
  }

  static isValueSelectorNode(nodeData: TargetNodeData) {
    return nodeData instanceof MappingNodeData && nodeData.mapping instanceof ValueSelector;
  }

  static isChooseNode(nodeData: TargetNodeData) {
    return nodeData instanceof MappingNodeData && nodeData.mapping instanceof ChooseItem;
  }

  static isDeletableNode(nodeData: TargetNodeData) {
    if (nodeData instanceof MappingNodeData) return true;
    return VisualizationService.getFieldValueSelector(nodeData) !== undefined;
  }

  static getExpressionItemForNode(nodeData: TargetNodeData) {
    if (!nodeData.mapping) return;
    if (nodeData.mapping instanceof ExpressionItem) return nodeData.mapping as ExpressionItem;
    return VisualizationService.getFieldValueSelector(nodeData);
  }

  private static getFieldValueSelector(nodeData: TargetNodeData) {
    if (nodeData.mapping instanceof FieldItem) {
      return nodeData.mapping.children.find((c) => c instanceof ValueSelector) as ValueSelector;
    }
  }

  static allowConditionMenu(nodeData: TargetNodeData) {
    if (nodeData instanceof TargetFieldNodeData || nodeData instanceof TargetDocumentNodeData) {
      const isForEachField =
        'parent' in nodeData &&
        nodeData.parent instanceof MappingNodeData &&
        nodeData.parent.mapping instanceof ForEachItem;
      return !isForEachField && !VisualizationService.getExpressionItemForNode(nodeData);
    }
    const mappingNodeData = nodeData as MappingNodeData;
    return (
      !(mappingNodeData.mapping instanceof WhenItem) &&
      !(mappingNodeData.mapping instanceof OtherwiseItem) &&
      !(mappingNodeData.mapping instanceof ForEachItem)
    );
  }

  static allowValueSelector(nodeData: TargetNodeData) {
    return (
      !VisualizationService.isChooseNode(nodeData) &&
      !VisualizationService.isValueSelectorNode(nodeData) &&
      !VisualizationService.isForEachNode(nodeData)
    );
  }

  static hasValueSelector(nodeData: TargetNodeData) {
    return !!(nodeData.mapping && nodeData.mapping.children.find((c) => c instanceof ValueSelector));
  }

  static deleteMappingItem(nodeData: TargetNodeData) {
    if (nodeData.mapping) {
      MappingService.deleteMappingItem(nodeData.mapping);
    }
  }

  static applyIf(nodeData: TargetNodeData) {
    if (nodeData instanceof TargetDocumentNodeData) {
      nodeData.mappingTree.children.push(new IfItem(nodeData.mappingTree));
    } else if (nodeData instanceof MappingNodeData || nodeData instanceof TargetFieldNodeData) {
      const mapping = nodeData.mapping
        ? nodeData.mapping
        : nodeData instanceof TargetFieldNodeData
          ? (VisualizationService.getOrCreateFieldItem(nodeData) as FieldItem)
          : undefined;
      if (!mapping) return;
      MappingService.wrapWithIf(mapping);
    }
  }

  static applyChooseWhenOtherwise(nodeData: TargetNodeData) {
    if (nodeData instanceof TargetDocumentNodeData) {
      if (nodeData.mappingTree.children.find((c) => c instanceof ChooseItem)) return;

      const existingValueSelector = nodeData.mappingTree.children.find((c) => c instanceof ValueSelector);
      MappingService.addChooseWhenOtherwise(nodeData.mappingTree, existingValueSelector);
    } else if (nodeData instanceof MappingNodeData || nodeData instanceof TargetFieldNodeData) {
      if (nodeData.mapping && nodeData.mapping.children.find((c) => c instanceof ChooseItem)) return;

      const mapping = nodeData.mapping
        ? nodeData.mapping
        : nodeData instanceof TargetFieldNodeData
          ? (VisualizationService.getOrCreateFieldItem(nodeData) as FieldItem)
          : undefined;
      if (!mapping) return;
      MappingService.wrapWithChooseWhenOtherwise(mapping);
    }
  }

  static applyForEach(nodeData: TargetFieldNodeData) {
    const fieldItem = VisualizationService.getOrCreateFieldItem(nodeData);
    MappingService.wrapWithForEach(fieldItem as MappingItem);
  }

  static applyValueSelector(nodeData: TargetNodeData) {
    const mapping =
      nodeData instanceof TargetFieldNodeData && !nodeData.mapping
        ? VisualizationService.getOrCreateFieldItem(nodeData)
        : nodeData.mapping;
    if (!mapping) return;
    const existing = mapping.children.find((c: MappingItem) => c instanceof ValueSelector);
    if (!existing) {
      const valueSelector = MappingService.createValueSelector(mapping);
      mapping.children.push(valueSelector);
    }
  }

  static engageMapping(mappingTree: MappingTree, sourceNode: SourceNodeDataType, targetNode: TargetNodeData) {
    const sourceField = 'document' in sourceNode ? (sourceNode.document as PrimitiveDocument) : sourceNode.field;
    if (targetNode instanceof MappingNodeData) {
      MappingService.mapToCondition(targetNode.mapping, sourceField);
    } else if (targetNode instanceof TargetDocumentNodeData) {
      MappingService.mapToDocument(mappingTree, sourceField);
    } else if (targetNode instanceof TargetFieldNodeData) {
      const item = VisualizationService.getOrCreateFieldItem(targetNode);
      MappingService.mapToField(sourceField, item as MappingItem);
    }
  }

  private static getOrCreateFieldItem(nodeData: TargetNodeData): MappingItem {
    if (nodeData.mapping) return nodeData.mapping as MappingItem;
    const fieldNodeData = nodeData as TargetFieldNodeData;
    const parentItem = VisualizationService.getOrCreateFieldItem(fieldNodeData.parent);
    return MappingService.createFieldItem(parentItem, fieldNodeData.field);
  }
}
