import { IField } from '../../../models/document';
import { MappingItem } from '../../../models/mapping';
import { ConditionNodeData, DocumentNodeData, FieldNodeData, NodeData } from '../../../models/visualization';

export class NodeHelper {
  static generateNodeDataChildren(parent: NodeData): NodeData[] {
    if (parent instanceof DocumentNodeData) {
    }
    if (parent instanceof ConditionNodeData) {
      return parent.mapping?.children
        ? parent.mapping.children.map((m) => NodeHelper.createNodeDataFromMappingItem(m))
        : [];
    }

    return parent.children.reduce((acc, field) => {
      const conditions = !mappingChildren
        ? []
        : mappingChildren.reduce((conditionsAcc, item) => {
            if (NodeHelper.getConditionedFields(item).includes(field) && !conditionsAcc.includes(item)) {
              conditionsAcc.push(item);
            }
            return conditionsAcc;
          }, [] as MappingItem[]);
      conditions.length > 1 ? conditions.forEach((c) => !acc.includes(c) && acc.push(c)) : acc.push(field);
      return acc;
    }, [] as DocumentNodeData[]);
  }

  static createNodeDataFromMappingItem(item: MappingItem): NodeData {}

  static getConditionedFields(item: MappingItem): IField[] {
    return 'containedFields' in item ? (item.containedFields as IField[]) : [];
  }

  static isCollectionField(nodeData: NodeData) {
    return nodeData instanceof FieldNodeData && nodeData.field?.maxOccurs && nodeData.field.maxOccurs > 1;
  }

  static isAttributeField(nodeData: NodeData) {
    return nodeData instanceof FieldNodeData && nodeData.field?.isAttribute;
  }
}
