import { IField, PrimitiveDocument } from '../models/datamapper/document';
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
import {
  AddMappingNodeData,
  ChoiceFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  NodeData,
  SourceNodeDataType,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  TargetNodeDataType,
} from '../models/datamapper/visualization';
import { DocumentService } from './document.service';
import { DocumentUtilService } from './document-util.service';
import { MappingService } from './mapping.service';

// Regex patterns for DnD ID generation
const FORWARD_SLASH_REGEX = /\//g;
const COLON_REGEX = /:/g;

type MappingNodePairType = {
  sourceNode?: SourceNodeDataType;
  targetNode?: TargetNodeDataType;
};

export class VisualizationService {
  static generateNodeDataChildren(nodeData: NodeData): NodeData[] {
    const isDocument = nodeData instanceof DocumentNodeData;
    const isPrimitive = nodeData.isPrimitive;

    if (isDocument && isPrimitive) {
      return VisualizationService.generatePrimitiveDocumentChildren(nodeData);
    } else if (isDocument && !isPrimitive) {
      return VisualizationService.generateStructuredDocumentChildren(nodeData);
    } else {
      return VisualizationService.generateNonDocumentNodeDataChildren(nodeData);
    }
  }

  static generatePrimitiveDocumentChildren(document: DocumentNodeData): NodeData[] {
    if (!(document instanceof TargetDocumentNodeData) || !document.mapping?.children) return [];
    return document.mapping.children
      .filter((child) => !(child instanceof ValueSelector))
      .map((child) => new MappingNodeData(document, child));
  }

  static generateStructuredDocumentChildren(document: DocumentNodeData): NodeData[] {
    return VisualizationService.doGenerateNodeDataFromFields(
      document,
      document.document.fields,
      document instanceof TargetDocumentNodeData ? document.mappingTree.children : undefined,
    );
  }

  private static doGenerateNodeDataFromChoiceField(
    parent: NodeData,
    field: IField,
    mappings?: MappingItem[],
  ): NodeData {
    const selectedMember =
      field.selectedMemberIndex === undefined ? undefined : field.fields?.[field.selectedMemberIndex];
    const nodeField = selectedMember ?? field;
    if (parent.isSource) {
      const choiceNodeData = new ChoiceFieldNodeData(parent, nodeField);
      if (selectedMember) choiceNodeData.choiceField = field;
      return choiceNodeData;
    }

    const mappingsForMember =
      selectedMember && mappings ? MappingService.filterMappingsForField(mappings, selectedMember) : [];
    const mapping = mappingsForMember.find((m) => m instanceof FieldItem) as FieldItem;
    const choiceNodeData = new TargetChoiceFieldNodeData(parent as TargetNodeData, nodeField, mapping);
    if (selectedMember) choiceNodeData.choiceField = field;
    return choiceNodeData;
  }

  private static doGenerateNodeDataFromFields(
    parent: NodeData,
    fields: IField[],
    mappings?: MappingItem[],
  ): NodeData[] {
    const answer: NodeData[] = [];
    if (parent.isPrimitive && mappings) {
      mappings
        .filter((m) => m instanceof ValueSelector)
        .forEach((m) => answer.push(new MappingNodeData(parent as TargetNodeData, m)));
    }
    return fields.reduce((acc, field) => {
      if (field.isChoice) {
        acc.push(VisualizationService.doGenerateNodeDataFromChoiceField(parent, field, mappings));
        return acc;
      }

      const mappingsForField = mappings ? MappingService.filterMappingsForField(mappings, field) : [];
      if (mappingsForField.length === 0) {
        const fieldNodeData = parent.isSource
          ? new FieldNodeData(parent, field)
          : new TargetFieldNodeData(parent as TargetNodeData, field);
        acc.push(fieldNodeData);
      } else {
        mappingsForField
          .filter((mapping) => !VisualizationService.isExistingMapping(acc as TargetNodeData[], mapping))
          .sort((left, right) => MappingService.sortMappingItem(left, right))
          .forEach((mapping) =>
            acc.push(VisualizationService.createNodeDataFromMappingItem(parent as TargetNodeData, mapping)),
          );
        if (DocumentService.isCollectionField(field)) {
          acc.push(new AddMappingNodeData(parent as TargetNodeData, field));
        }
      }
      return acc;
    }, answer);
  }

  private static isExistingMapping(nodes: TargetNodeData[], mapping: MappingItem) {
    return nodes.find((node) => 'mapping' in node && node.mapping === mapping);
  }

  static generateNonDocumentNodeDataChildren(parent: NodeData): NodeData[] {
    if (parent instanceof ChoiceFieldNodeData || parent instanceof TargetChoiceFieldNodeData) {
      let fields: IField[];
      if (parent.field.isChoice && parent.field.selectedMemberIndex !== undefined) {
        fields = [parent.field].filter(Boolean);
      } else if (parent.field.isChoice) {
        fields = parent.field.fields;
      } else {
        DocumentUtilService.resolveTypeFragment(parent.field);
        fields = parent.field.fields;
      }
      return VisualizationService.doGenerateNodeDataFromFields(
        parent,
        fields,
        'mapping' in parent ? parent.mapping?.children : undefined,
      );
    }
    if (parent instanceof FieldNodeData || parent instanceof FieldItemNodeData) {
      DocumentUtilService.resolveTypeFragment(parent.field);
      return VisualizationService.doGenerateNodeDataFromFields(
        parent,
        parent.field.fields,
        'mapping' in parent ? parent.mapping?.children : undefined,
      );
    } else if (parent instanceof MappingNodeData) {
      return parent.mapping?.children
        ? parent.mapping.children
            .sort((left, right) => MappingService.sortMappingItem(left, right))
            .map((m) => VisualizationService.createNodeDataFromMappingItem(parent, m))
        : [];
    }
    return [];
  }

  private static createNodeDataFromMappingItem(parent: TargetNodeData, mapping: MappingItem): MappingNodeData {
    return mapping instanceof FieldItem ? new FieldItemNodeData(parent, mapping) : new MappingNodeData(parent, mapping);
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
    return (
      (nodeData instanceof FieldNodeData || nodeData instanceof FieldItemNodeData) &&
      DocumentService.isCollectionField(nodeData.field)
    );
  }

  static isAttributeField(nodeData: NodeData) {
    return nodeData instanceof FieldNodeData && nodeData.field?.isAttribute;
  }

  static getField(nodeData: NodeData): IField | undefined {
    if (nodeData instanceof FieldNodeData || nodeData instanceof FieldItemNodeData) {
      return nodeData.field;
    }
    return undefined;
  }

  static isChoiceField(nodeData: NodeData) {
    return nodeData instanceof ChoiceFieldNodeData || nodeData instanceof TargetChoiceFieldNodeData;
  }

  static isRecursiveField(nodeData: NodeData) {
    return nodeData instanceof FieldNodeData && DocumentService.isRecursiveField(nodeData.field);
  }

  static hasChildren(nodeData: NodeData) {
    if (nodeData instanceof DocumentNodeData) {
      if (DocumentService.hasFields(nodeData.document)) return true;
      const isPrimitiveDocument = nodeData instanceof TargetDocumentNodeData && nodeData.isPrimitive;
      const isPrimitiveDocumentWithConditionItem =
        isPrimitiveDocument && !!nodeData.mapping.children.find((m) => !(m instanceof ValueSelector));
      if (isPrimitiveDocumentWithConditionItem) return true;
    }
    if (nodeData instanceof FieldNodeData) return DocumentService.hasChildren(nodeData.field);
    if (nodeData instanceof FieldItemNodeData)
      return (
        DocumentService.hasChildren(nodeData.field) ||
        nodeData.mapping.children.filter((m) => !(m instanceof ValueSelector)).length > 0
      );
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
    return (
      nodeData instanceof AddMappingNodeData ||
      ((nodeData instanceof TargetFieldNodeData || nodeData instanceof FieldItemNodeData) &&
        VisualizationService.isCollectionField(nodeData))
    );
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
    if (nodeData instanceof MappingNodeData && !(nodeData instanceof FieldItemNodeData)) return true;
    return VisualizationService.getFieldValueSelector(nodeData) !== undefined;
  }

  static getExpressionItemForNode(nodeData: TargetNodeData) {
    if (!nodeData.mapping) return;
    if (nodeData.mapping instanceof ExpressionItem) return nodeData.mapping as ExpressionItem;
    return VisualizationService.getFieldValueSelector(nodeData);
  }

  private static getFieldValueSelector(nodeData: TargetNodeData) {
    if (nodeData.mapping instanceof FieldItem || nodeData.mapping instanceof MappingTree) {
      return nodeData.mapping.children.find((c) => c instanceof ValueSelector) as ValueSelector;
    }
  }

  static allowConditionMenu(nodeData: TargetNodeData) {
    if (
      nodeData instanceof TargetFieldNodeData ||
      nodeData instanceof TargetDocumentNodeData ||
      nodeData instanceof FieldItemNodeData
    ) {
      const isForEachField =
        'parent' in nodeData &&
        nodeData.parent instanceof MappingNodeData &&
        nodeData.parent.mapping instanceof ForEachItem;
      return !isForEachField;
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
      !(nodeData instanceof AddMappingNodeData) &&
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
      const valueSelector = nodeData.mappingTree.children.find((c) => c instanceof ValueSelector);
      MappingService.addIf(nodeData.mappingTree, valueSelector);
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

      const valueSelector = nodeData.mappingTree.children.find((c) => c instanceof ValueSelector);
      MappingService.addChooseWhenOtherwise(nodeData.mappingTree, valueSelector);
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

  static applyWhen(nodeData: TargetNodeData) {
    const chooseItem = nodeData.mapping as ChooseItem;
    MappingService.addWhen(chooseItem, undefined, chooseItem.field);
  }

  static applyOtherwise(nodeData: TargetNodeData) {
    const chooseItem = nodeData.mapping as ChooseItem;
    MappingService.addOtherwise(chooseItem, undefined, chooseItem.field);
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
    if (targetNode instanceof TargetFieldNodeData || targetNode instanceof FieldItemNodeData) {
      const item = VisualizationService.getOrCreateFieldItem(targetNode);
      MappingService.mapToField(sourceField, item as MappingItem);
    } else if (targetNode instanceof MappingNodeData) {
      MappingService.mapToCondition(targetNode.mapping, sourceField);
    } else if (targetNode instanceof TargetDocumentNodeData) {
      MappingService.mapToDocument(mappingTree, sourceField);
    }
  }

  private static getOrCreateFieldItem(nodeData: TargetNodeData): MappingItem {
    if (nodeData.mapping) return nodeData.mapping as MappingItem;
    const fieldNodeData = nodeData as TargetFieldNodeData;
    const parentItem = VisualizationService.getOrCreateFieldItem(fieldNodeData.parent);
    return MappingService.createFieldItem(parentItem, fieldNodeData.field);
  }

  static generateDndId(nodeData: NodeData) {
    // Use full path with documentType to ensure unique IDs between source and target
    return nodeData instanceof DocumentNodeData
      ? nodeData.id
      : nodeData.path.toString().replace(FORWARD_SLASH_REGEX, '-').replace(COLON_REGEX, '-');
  }

  static addMapping(nodeData: AddMappingNodeData) {
    const parentItem = VisualizationService.getOrCreateFieldItem(nodeData.parent);
    MappingService.createFieldItem(parentItem, nodeData.field);
  }
}
