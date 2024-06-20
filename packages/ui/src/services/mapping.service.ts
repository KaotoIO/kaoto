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
  ForEachItem,
  ExpressionItem,
} from '../models/mapping';
import { IDocument, IField, PrimitiveDocument } from '../models/document';
import { DocumentService } from './document.service';
import { XPathService } from './xpath/xpath.service';
import { IMappingLink } from '../models/visualization';
import { DocumentType } from '../models/path';

export class MappingService {
  static filterMappingsForField(mappings: MappingItem[], field: IField): MappingItem[] {
    if (!mappings) return [];
    return mappings.filter((mapping) => {
      if (mapping instanceof FieldItem) {
        return mapping.field === field;
      } else if (mapping instanceof ValueSelector) {
        return false;
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
    } else if (
      mapping instanceof IfItem ||
      mapping instanceof WhenItem ||
      mapping instanceof OtherwiseItem ||
      mapping instanceof ForEachItem
    ) {
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
      MappingService.doRemoveAllMappingsForTargetDocument(mappingTree);
    } else {
      MappingService.doRemoveAllMappingsForSourceDocument(mappingTree, documentType, documentId);
    }
    return mappingTree;
  }

  private static doRemoveAllMappingsForTargetDocument(mappingTree: MappingTree) {
    mappingTree.children = [];
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

  static wrapWithItem(wrapped: MappingItem, wrapper: MappingItem) {
    wrapper.children.push(wrapped);
    wrapped.parent.children = wrapped.parent.children.filter((m) => m !== wrapped);
    wrapped.parent.children.push(wrapper);
    wrapped.parent = wrapper;
  }

  static wrapWithForEach(mappingTree: MappingTree, field: IField) {
    const fieldItem = MappingService.getOrCreateFieldItem(mappingTree, field) as FieldItem;
    const forEach = new ForEachItem(fieldItem.parent, field);
    MappingService.wrapWithItem(fieldItem, forEach);
  }

  static wrapWithIf(wrapped: MappingItem) {
    MappingService.wrapWithItem(wrapped, new IfItem(wrapped.parent));
  }

  static wrapWithChooseWhenOtherwise(wrapped: MappingItem) {
    const parent = wrapped.parent;
    MappingService.addChooseWhenOtherwise(parent, wrapped);
    parent.children = parent.children.filter((c) => c !== wrapped);
  }

  static addChooseWhenOtherwise(parent: MappingParentType, mapping?: MappingItem) {
    const chooseItem = new ChooseItem(parent, mapping && mapping instanceof FieldItem ? mapping.field : undefined);
    parent.children.push(chooseItem);
    const whenItem = MappingService.addWhen(chooseItem);
    if (mapping) {
      whenItem.children = [mapping];
      mapping.parent = whenItem;
    }
    MappingService.addOtherwise(chooseItem);
  }

  static addWhen(item: ChooseItem) {
    const whenItem = new WhenItem(item);
    item.field && whenItem.children.push(new FieldItem(whenItem, item.field));
    item.children.push(whenItem);
    return whenItem;
  }

  static addOtherwise(item: ChooseItem) {
    const newChildren = item.children.filter((c) => !(c instanceof OtherwiseItem));
    const otherwiseItem = new OtherwiseItem(item);
    item.field && otherwiseItem.children.push(new FieldItem(otherwiseItem, item.field));
    newChildren.push(otherwiseItem);
    item.children = newChildren;
    return otherwiseItem;
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
    const targetFieldItem = item ? item : MappingService.getOrCreateFieldItem(mappingTree, targetField);
    let valueSelector = targetFieldItem?.children.find((child) => child instanceof ValueSelector) as ValueSelector;
    if (!valueSelector) {
      valueSelector = new ValueSelector(targetFieldItem);
      targetFieldItem.children.push(valueSelector);
    }
    valueSelector.expression = XPathService.addSource(valueSelector.expression, source);
  }

  static getOrCreateFieldItem(mappingTree: MappingTree, targetField: IField): FieldItem | MappingTree {
    const fieldStack = DocumentService.getFieldStack(targetField, true);
    return fieldStack.reduceRight((mapping: MappingTree | MappingItem, field) => {
      const existing = mapping.children.find((c) => c instanceof FieldItem && c.field === field) as FieldItem;
      if (existing) {
        return existing;
      } else {
        const fieldItem = new FieldItem(mapping, field);
        mapping.children.push(fieldItem);
        return fieldItem;
      }
    }, mappingTree) as MappingTree | FieldItem;
  }

  static deleteMappingItem(item: MappingParentType) {
    item instanceof MappingItem && MappingService.deleteFromParent(item);
  }

  private static deleteFromParent(item: MappingItem) {
    item.parent.children = item.parent.children.filter((child) => child !== item);
    item.parent instanceof FieldItem &&
      item.parent.children.length === 0 &&
      MappingService.deleteFromParent(item.parent);
  }

  static sortMappingItem(left: MappingItem, right: MappingItem) {
    if (left instanceof ValueSelector) return -1;
    if (right instanceof ValueSelector) return 1;
    if (left instanceof WhenItem) return right instanceof OtherwiseItem ? -1 : 0;
    if (right instanceof WhenItem) return left instanceof OtherwiseItem ? 1 : 0;
    return 0;
  }

  static extractMappingLinks(
    item: MappingTree | MappingItem,
    sourceParameterMap: Map<string, IDocument>,
    sourceBody: IDocument,
  ): IMappingLink[] {
    const answer = [] as IMappingLink[];
    const targetNodePath = item.path.toString();
    if (item instanceof ExpressionItem) {
      answer.push(
        ...MappingService.doExtractMappingLinks(item.expression, targetNodePath, sourceParameterMap, sourceBody),
      );
    }
    if ('children' in item) {
      item.children.map((child) => {
        if (
          item instanceof FieldItem &&
          !(item.field.ownerDocument instanceof PrimitiveDocument) &&
          child instanceof ValueSelector
        ) {
          answer.push(
            ...MappingService.doExtractMappingLinks(child.expression, targetNodePath, sourceParameterMap, sourceBody),
          );
        } else {
          answer.push(...MappingService.extractMappingLinks(child, sourceParameterMap, sourceBody));
        }
      });
    }
    return answer;
  }

  private static doExtractMappingLinks(
    sourceXPath: string,
    targetNodePath: string,
    sourceParameterMap: Map<string, IDocument>,
    sourceBody: IDocument,
  ) {
    return XPathService.extractFieldPaths(sourceXPath).reduce((acc, xpath) => {
      const { paramName, segments } = XPathService.parsePath(xpath);
      const document = paramName ? sourceParameterMap.get(paramName) : sourceBody;
      const sourcePath = document && DocumentService.getFieldFromPathSegments(document, segments)?.path;
      sourcePath && acc.push({ sourceNodePath: sourcePath.toString(), targetNodePath: targetNodePath });
      return acc;
    }, [] as IMappingLink[]);
  }
}
