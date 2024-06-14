import {
  FieldItem,
  MappingTree,
  MappingItem,
  ChooseItem,
  WhenItem,
  OtherwiseItem,
  ConditionItem,
  IfItem,
  ValueSelector,
  MappingParentType,
} from '../models/mapping';
import { BODY_DOCUMENT_ID, DocumentType, IDocument, IField, PrimitiveDocument } from '../models/document';
import { DocumentService } from './document.service';
import { XPathService } from './xpath/xpath.service';
import { IMappingLink } from '../models/visualization';
import { NodePath } from '../models/path';

export class MappingService {
  static filterMappingsForField(mappings: MappingItem[], field: IField): MappingItem[] {
    if (!mappings) return [];
    return mappings.filter((mapping) => {
      if (mapping instanceof FieldItem) {
        return mapping.field === field;
      } else {
        return MappingService.getConditionalFields(mapping as ConditionItem & MappingItem).includes(field);
      }
    });
  }

  private static getConditionalFields(mapping: ConditionItem & MappingItem): IField[] {
    if (mapping instanceof ChooseItem) {
      return [...mapping.when, mapping.otherwise].reduce((acc, branch) => {
        branch && acc.push(...MappingService.getConditionalFields(branch));
        return acc;
      }, [] as IField[]);
    } else if (mapping instanceof IfItem || mapping instanceof WhenItem || mapping instanceof OtherwiseItem) {
      return mapping.children.reduce((acc, child) => {
        child instanceof FieldItem && acc.push(child.field);
        return acc;
      }, [] as IField[]);
    } else {
      throw Error(`Unknown mapping item ${mapping.name}`);
    }
  }

  static removeAllMappingsForDocument(mappingTree: MappingTree, documentType: DocumentType, documentId: string) {
    if (documentType === DocumentType.TARGET_BODY) {
      MappingService.doRemoveAllMappingsForTargetDocument(mappingTree, documentId);
    } else {
      MappingService.doRemoveAllMappingsForSourceDocument(mappingTree, documentType, documentId);
    }
    return mappingTree;
  }

  private static doRemoveAllMappingsForTargetDocument(item: MappingTree | MappingItem, documentId: string) {
    item.children = item.children?.reduce((acc, child) => {
      MappingService.doRemoveAllMappingsForTargetDocument(child, documentId);
      if (child instanceof FieldItem && documentId !== child.field.ownerDocument.documentId) {
        acc.push(child);
      } else if (!('isCondition' in child) || child.children.length > 0) {
        acc.push(child);
      }
      return acc;
    }, [] as MappingItem[]);
  }

  private static doRemoveAllMappingsForSourceDocument(
    item: MappingTree | MappingItem,
    documentType: DocumentType,
    documentId: string,
  ) {
    item.children = item.children?.reduce((acc, child) => {
      MappingService.doRemoveAllMappingsForSourceDocument(child, documentType, documentId);
      if (
        'expression' in child &&
        !MappingService.hasStaleSourceDocument(child.expression as string, documentType, documentId)
      ) {
        acc.push(child);
      }
      return acc;
    }, [] as MappingItem[]);
  }

  private static hasStaleSourceDocument(expression: string, documentType: DocumentType, documentId: string) {
    const stalePath = XPathService.extractFieldPaths(expression).find((xpath) => {
      const parsedPath = XPathService.parsePath(xpath);
      return (
        (documentType === DocumentType.SOURCE_BODY && !parsedPath.paramName) ||
        (documentType === DocumentType.PARAM && parsedPath.paramName === documentId)
      );
    });
    return !!stalePath;
  }

  static removeStaleMappingsForDocument(mappingTree: MappingTree, document: IDocument) {
    if (document.documentType === DocumentType.TARGET_BODY) {
      MappingService.doRemoveStaleMappingsForTargetDocument(mappingTree, document);
    } else {
      MappingService.doRemoveStaleMappingsForSourceDocument(mappingTree, document);
    }
    return mappingTree;
  }

  private static doRemoveStaleMappingsForTargetDocument(item: MappingTree | MappingItem, document: IDocument) {
    item.children = item.children?.reduce((acc, child) => {
      MappingService.doRemoveStaleMappingsForTargetDocument(child, document);
      if (child instanceof FieldItem && DocumentService.hasField(document, child.field)) {
        acc.push(child);
      } else if (!('isCondition' in child) || child.children.length > 0) {
        acc.push(child);
      }
      return acc;
    }, [] as MappingItem[]);
  }

  private static doRemoveStaleMappingsForSourceDocument(item: MappingTree | MappingItem, document: IDocument) {
    item.children = item.children?.reduce((acc, child) => {
      MappingService.doRemoveStaleMappingsForSourceDocument(child, document);
      if ('expression' in child && !MappingService.hasStaleSourceField(child.expression as string, document)) {
        acc.push(child);
      }
      return acc;
    }, [] as MappingItem[]);
  }

  private static hasStaleSourceField(expression: string, document: IDocument) {
    const stalePath = XPathService.extractFieldPaths(expression).find((xpath) => {
      const parsedPath = XPathService.parsePath(xpath);
      if (
        (document.documentType === DocumentType.SOURCE_BODY && !parsedPath.paramName) ||
        (document.documentType === DocumentType.PARAM && parsedPath.paramName === document.documentId)
      ) {
        return !DocumentService.getFieldFromPathSegments(document, parsedPath.segments);
      }
    });
    return !!stalePath;
  }

  static addWhen(item: ChooseItem) {
    item.when.push(new WhenItem(item));
  }

  static addOtherwise(item: ChooseItem) {
    item.otherwise = new OtherwiseItem(item);
  }

  static mapToCondition(condition: MappingItem, source: PrimitiveDocument | IField) {
    if ('expression' in condition) {
      condition.expression = XPathService.addSource(condition.expression as string, source);
    }
  }

  static mapToDocument(mappingTree: MappingTree, source: PrimitiveDocument | IField) {
    let valueSelector = mappingTree.children.find((mapping) => mapping instanceof ValueSelector) as ValueSelector;
    if (!valueSelector) {
      valueSelector = new ValueSelector(mappingTree);
      mappingTree.children.push(valueSelector);
    }
    valueSelector.expression = XPathService.addSource(valueSelector.expression, source);
  }

  static mapToField(
    targetField: IField,
    mappingTree: MappingTree,
    item: MappingItem | undefined,
    source: PrimitiveDocument | IField,
  ) {
    const targetFieldItem = item ? item : MappingService.createFieldItem(mappingTree, targetField);
    let valueSelector = targetFieldItem?.children.find((child) => child instanceof ValueSelector) as ValueSelector;
    if (!valueSelector) {
      valueSelector = new ValueSelector(targetFieldItem);
      targetFieldItem.children.push(valueSelector);
    }
    valueSelector.expression = XPathService.addSource(valueSelector.expression, source);
  }

  static createFieldItem(mappingTree: MappingTree, targetField: IField): FieldItem | MappingTree {
    const fieldStack = DocumentService.getFieldStack(targetField, true);
    return fieldStack.reduce((mapping: MappingTree | MappingItem, field) => {
      const fieldItem = new FieldItem(mapping, field);
      mapping.children.push(fieldItem);
      return fieldItem;
    }, mappingTree);
  }

  static deleteMappingItem(item: MappingParentType) {
    if (item instanceof FieldItem && item.children) {
      item.children = item.children.filter((child) => !(child instanceof ValueSelector)) as ValueSelector[];
      item.children.length === 0 && MappingService.deleteFromParent(item);
    } else {
      item instanceof MappingItem && MappingService.deleteFromParent(item);
    }
  }

  private static deleteFromParent(item: MappingItem) {
    item.parent.children = item.parent.children.filter((child) => child !== item);
    item.parent instanceof MappingItem &&
      item.parent.children.length === 0 &&
      MappingService.deleteFromParent(item.parent);
  }

  static extractMappingLinks(item: MappingTree | MappingItem): IMappingLink[] {
    const answer = [] as IMappingLink[];
    if ('expression' in item) {
      const targetPath = item.path.toString();
      XPathService.extractFieldPaths(item.expression as string).map((sourcePath) =>
        answer.push({ sourceNodePath: sourcePath, targetNodePath: targetPath }),
      );
    }
    if ('children' in item) {
      item.children.map((child) => {
        if (child instanceof ValueSelector) {
          const targetPath = item.path.toString();
          XPathService.extractFieldPaths(child.expression as string).forEach((sourcePath) => {
            const { paramName, segments } = XPathService.parsePath(sourcePath);
            const documentType = paramName ? DocumentType.PARAM : DocumentType.SOURCE_BODY;
            const documentId = paramName ? paramName : BODY_DOCUMENT_ID;
            const nodePath = NodePath.fromDocument(documentType, documentId);
            nodePath.pathSegments = segments;
            answer.push({ sourceNodePath: nodePath.toString(), targetNodePath: targetPath });
          });
        } else {
          answer.push(...MappingService.extractMappingLinks(child));
        }
      });
    }
    return answer;
  }
}
