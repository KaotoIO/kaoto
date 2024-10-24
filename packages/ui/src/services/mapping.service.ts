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
  ValueType,
  IFunctionDefinition,
} from '../models/datamapper/mapping';
import { IDocument, IField, PrimitiveDocument } from '../models/datamapper/document';
import { DocumentService } from './document.service';
import { XPathService } from './xpath/xpath.service';
import { IMappingLink } from '../models/datamapper/visualization';
import { DocumentType, Path } from '../models/datamapper/path';

export class MappingService {
  static filterMappingsForField(mappings: MappingItem[], field: IField): MappingItem[] {
    if (!mappings) return [];
    return mappings.filter((mapping) => {
      if (mapping instanceof FieldItem) {
        return mapping.field === field;
      } else if (mapping instanceof ValueSelector) {
        return false;
      } else {
        return MappingService.getConditionalFields(mapping as ConditionItem).includes(field);
      }
    });
  }

  private static getConditionalFieldItems(mapping: ConditionItem): FieldItem[] {
    if (mapping instanceof ChooseItem) {
      return [...mapping.when, mapping.otherwise].reduce((acc, branch) => {
        branch && acc.push(...MappingService.getConditionalFieldItems(branch));
        return acc;
      }, [] as FieldItem[]);
    } else if (
      mapping instanceof IfItem ||
      mapping instanceof WhenItem ||
      mapping instanceof OtherwiseItem ||
      mapping instanceof ForEachItem
    ) {
      return mapping.children.reduce((acc, child) => {
        child instanceof FieldItem && acc.push(child);
        return acc;
      }, [] as FieldItem[]);
    }
    return [];
  }

  private static getConditionalFields(mapping: ConditionItem): IField[] {
    return MappingService.getConditionalFieldItems(mapping).map((item) => item.field);
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
    item.children = item.children.reduce((acc, child) => {
      MappingService.doRemoveAllMappingsForSourceDocument(child, documentType, documentId);
      if (
        child instanceof ExpressionItem &&
        MappingService.hasStaleSourceDocument(child.expression as string, documentType, documentId)
      ) {
        return acc;
      }
      if (child instanceof FieldItem && child.children.length === 0) return acc;
      acc.push(child);
      return acc;
    }, [] as MappingItem[]);
  }

  private static hasStaleSourceDocument(expression: string, documentType: DocumentType, documentId: string) {
    const stalePath = XPathService.extractFieldPaths(expression).find((xpath) => {
      const parsedPath = new Path(xpath);
      return (
        (documentType === DocumentType.SOURCE_BODY && !parsedPath.parameterName) ||
        (documentType === DocumentType.PARAM && parsedPath.parameterName === documentId)
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
    item.children = item.children.reduce((acc, child) => {
      MappingService.doRemoveStaleMappingsForTargetDocument(child, document);
      if (child instanceof FieldItem && DocumentService.hasField(document, child.field) && child.children.length > 0) {
        acc.push(child);
      } else if (child instanceof ConditionItem) {
        acc.push(child);
      }
      return acc;
    }, [] as MappingItem[]);
  }

  private static doRemoveStaleMappingsForSourceDocument(item: MappingTree | MappingItem, document: IDocument) {
    item.children = item.children.reduce((acc, child) => {
      MappingService.doRemoveStaleMappingsForSourceDocument(child, document);
      if ('expression' in child && MappingService.hasStaleSourceField(child.expression as string, document)) {
        return acc;
      }
      if (child instanceof FieldItem && child.children.length === 0) return acc;
      acc.push(child);
      return acc;
    }, [] as MappingItem[]);
  }

  private static hasStaleSourceField(expression: string, document: IDocument) {
    const stalePath = XPathService.extractFieldPaths(expression).find((xpath) => {
      const parsedPath = new Path(xpath);
      if (
        (document.documentType === DocumentType.SOURCE_BODY && !parsedPath.parameterName) ||
        (document.documentType === DocumentType.PARAM && parsedPath.parameterName === document.documentId)
      ) {
        return !DocumentService.getFieldFromPathSegments(
          document,
          parsedPath.pathSegments.map((seg) => seg.name),
        );
      }
    });
    return !!stalePath;
  }

  static wrapWithItem(wrapped: MappingItem, wrapper: MappingItem) {
    wrapper.children.push(wrapped);
    wrapped.parent.children = wrapped.parent.children.map((m) => (m !== wrapped ? m : wrapper));
    wrapped.parent = wrapper;
  }

  static wrapWithForEach(wrapped: MappingItem) {
    MappingService.wrapWithItem(wrapped, new ForEachItem(wrapped.parent));
  }

  static wrapWithIf(wrapped: MappingItem) {
    MappingService.wrapWithItem(wrapped, new IfItem(wrapped.parent));
  }

  static wrapWithChooseWhenOtherwise(wrapped: MappingItem) {
    const parent = wrapped.parent;
    const chooseItem = new ChooseItem(parent, wrapped && wrapped instanceof FieldItem ? wrapped.field : undefined);
    const whenItem = MappingService.addWhen(chooseItem);
    const otherwiseItem = MappingService.addOtherwise(chooseItem);
    whenItem.children = [wrapped];
    wrapped.parent = whenItem;
    otherwiseItem.children = [wrapped.clone()];
    parent.children = parent.children.map((m) => (m !== wrapped ? m : chooseItem));
  }

  static addChooseWhenOtherwise(parent: MappingParentType, mapping?: MappingItem) {
    const chooseItem = new ChooseItem(parent, mapping && mapping instanceof FieldItem ? mapping.field : undefined);
    const whenItem = MappingService.addWhen(chooseItem);
    const otherwiseItem = MappingService.addOtherwise(chooseItem);
    if (mapping) {
      whenItem.children = [mapping];
      mapping.parent = whenItem;
      otherwiseItem.children = [mapping.clone()];
      parent.children = parent.children.map((m) => (m !== mapping ? m : chooseItem));
    }
    if (!parent.children.includes(chooseItem)) parent.children.push(chooseItem);
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

  static wrapWithFunction(condition: ExpressionItem, func: IFunctionDefinition) {
    condition.expression = `${func.name}(${condition.expression})`;
  }

  static mapToCondition(condition: MappingItem, source: PrimitiveDocument | IField) {
    MappingService.registerNamespaceFromField(condition.mappingTree, source);
    const absPath = XPathService.toXPath(source, condition.mappingTree.namespaceMap);
    const relativePath = MappingService.getRelativePath(condition, absPath);
    if (condition instanceof ForEachItem) {
      condition.expression = relativePath;
    } else if (condition instanceof ExpressionItem) {
      condition.expression = XPathService.addSource(condition.expression as string, relativePath);
    }
  }

  private static getRelativePath(condition: MappingItem, absPath: string): string {
    const parentPath = condition.parent.contextPath?.toAbsolutePathString();
    if (!parentPath) return absPath;
    const index = absPath.indexOf(parentPath);
    return index == -1 ? absPath : absPath.substring(index + parentPath.length + 1);
  }

  static mapToDocument(mappingTree: MappingTree, source: PrimitiveDocument | IField) {
    let valueSelector = mappingTree.children.find((mapping) => mapping instanceof ValueSelector) as ValueSelector;
    if (!valueSelector) {
      valueSelector = MappingService.createValueSelector(mappingTree);
      mappingTree.children.push(valueSelector);
    }
    MappingService.registerNamespaceFromField(mappingTree, source);
    const path = XPathService.toXPath(source, mappingTree.namespaceMap);
    valueSelector.expression = XPathService.addSource(valueSelector.expression, path);
  }

  static mapToField(source: PrimitiveDocument | IField, targetFieldItem: MappingItem) {
    let valueSelector = targetFieldItem?.children.find((child) => child instanceof ValueSelector) as ValueSelector;
    if (!valueSelector) {
      valueSelector = MappingService.createValueSelector(targetFieldItem);
      targetFieldItem.children.push(valueSelector);
    }
    MappingService.registerNamespaceFromField(targetFieldItem.mappingTree, source);
    const absPath = XPathService.toXPath(source, targetFieldItem.mappingTree.namespaceMap);
    const relativePath = MappingService.getRelativePath(valueSelector, absPath);
    valueSelector.expression = XPathService.addSource(valueSelector.expression, relativePath);
  }

  static createFieldItem(parentItem: MappingItem, field: IField) {
    const fieldItem = new FieldItem(parentItem, field);
    parentItem.children.push(fieldItem);
    return fieldItem;
  }

  private static registerNamespaceFromField(mappingTree: MappingTree, field: IField) {
    if (!field.namespaceURI) return;
    const existingns = Object.entries(mappingTree.namespaceMap).find(
      ([_prefix, uri]) => field.namespaceURI && uri === field.namespaceURI,
    );
    if (!existingns && field.namespaceURI) {
      const prefix = field.namespacePrefix ?? MappingService.createNSPrefix(mappingTree);
      mappingTree.namespaceMap[prefix] = field.namespaceURI;
    }
  }

  private static createNSPrefix(mappingTree: MappingTree) {
    for (let index = 0; ; index++) {
      const prefix = `ns${index}`;
      if (!mappingTree.namespaceMap[prefix]) return prefix;
    }
  }

  static createValueSelector(parent: MappingParentType) {
    const valueType = parent instanceof MappingTree ? ValueType.VALUE : MappingService.getValueTypeFor(parent);
    return new ValueSelector(parent, valueType);
  }

  private static getValueTypeFor(mapping: MappingItem): ValueType {
    const field = MappingService.getTargetField(mapping);
    return field?.isAttribute
      ? ValueType.ATTRIBUTE
      : field?.fields?.length && field.fields.length > 0
        ? ValueType.CONTAINER
        : ValueType.VALUE;
  }

  private static getTargetField(mapping: MappingItem) {
    let item = mapping;
    while (!(item instanceof FieldItem) && !(item.parent instanceof MappingTree)) item = item.parent;
    if (item instanceof FieldItem) return item.field;
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
    const targetNodePath = item.nodePath.toString();
    if (item instanceof ExpressionItem) {
      answer.push(...MappingService.doExtractMappingLinks(item, targetNodePath, sourceParameterMap, sourceBody));
    }
    if ('children' in item) {
      item.children.map((child) => {
        if (
          item instanceof FieldItem &&
          !(item.field.ownerDocument instanceof PrimitiveDocument) &&
          child instanceof ValueSelector
        ) {
          answer.push(...MappingService.doExtractMappingLinks(child, targetNodePath, sourceParameterMap, sourceBody));
        } else {
          answer.push(...MappingService.extractMappingLinks(child, sourceParameterMap, sourceBody));
        }
      });
    }
    return answer;
  }

  private static doExtractMappingLinks(
    sourceExpressionItem: ExpressionItem,
    targetNodePath: string,
    sourceParameterMap: Map<string, IDocument>,
    sourceBody: IDocument,
  ) {
    const sourceXPath = sourceExpressionItem.expression;
    const validationResult = XPathService.validate(sourceXPath);
    if (!validationResult.getCst()) return [];
    const fieldPaths = XPathService.extractFieldPaths(sourceXPath);
    return fieldPaths.reduce((acc, xpath) => {
      const absolutePath =
        sourceExpressionItem.contextPath && !xpath.startsWith('$') && !xpath.startsWith('/')
          ? sourceExpressionItem.contextPath + '/' + xpath
          : xpath;
      const path = new Path(absolutePath);
      const document = path.parameterName ? sourceParameterMap.get(path.parameterName) : sourceBody;
      const sourceNodePath =
        document &&
        DocumentService.getFieldFromPathSegments(
          document,
          path.pathSegments.map((seg) => seg.name),
        )?.path;
      sourceNodePath && acc.push({ sourceNodePath: sourceNodePath.toString(), targetNodePath: targetNodePath });
      return acc;
    }, [] as IMappingLink[]);
  }
}
