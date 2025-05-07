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

  static getConditionalFields(mapping: ConditionItem): IField[] {
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
      let compatibleField: IField | undefined = undefined;
      if (child instanceof FieldItem) {
        compatibleField = DocumentService.getCompatibleField(document, child.field);
        if (compatibleField) {
          child = MappingService.updateFieldItemField(child, compatibleField);
        }
      }
      if (compatibleField && child.children.length > 0) {
        acc.push(child);
      } else if (child.parent instanceof ConditionItem || child instanceof ConditionItem) {
        acc.push(child);
      }
      return acc;
    }, [] as MappingItem[]);
  }

  private static updateFieldItemField(item: FieldItem, newField: IField): FieldItem {
    const updated = MappingService.createFieldItem(item.parent, newField);
    MappingService.adaptChildren(item, updated);
    item.parent.children = item.parent.children.map((child) => (child === item ? updated : child));
    return updated;
  }

  private static adaptChildren(from: MappingItem, to: MappingItem) {
    to.children = from.children.map((child) => {
      child.parent = to;
      return child;
    });
  }

  private static doRemoveStaleMappingsForSourceDocument(item: MappingTree | MappingItem, document: IDocument) {
    item.children = item.children.reduce((acc, child) => {
      MappingService.doRemoveStaleMappingsForSourceDocument(child, document);
      if (child instanceof ExpressionItem && MappingService.hasStaleSourceField(child, document)) {
        return acc;
      }
      if (!(child.parent instanceof ConditionItem) && child instanceof FieldItem && child.children.length === 0) {
        return acc;
      }
      acc.push(child);
      return acc;
    }, [] as MappingItem[]);
  }

  private static hasStaleSourceField(expressionItem: ExpressionItem, document: IDocument) {
    const stalePath = XPathService.extractFieldPaths(expressionItem.expression).find((xpath) => {
      const absPath = MappingService.getAbsolutePath(expressionItem, xpath);
      const parsedPath = new Path(absPath);
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
    const otherwiseWrapped = wrapped.clone();
    otherwiseWrapped.parent = otherwiseItem;
    otherwiseItem.children = [otherwiseWrapped];
    parent.children = parent.children.map((m) => (m !== wrapped ? m : chooseItem));
  }

  static addIf(parent: MappingParentType, mapping?: MappingItem) {
    const ifItem = new IfItem(parent);
    parent.children.push(ifItem);
    ifItem.children.push(mapping ? mapping : MappingService.createValueSelector(ifItem));
  }

  static addChooseWhenOtherwise(parent: MappingParentType, mapping?: MappingItem) {
    const chooseItem = new ChooseItem(parent, mapping && mapping instanceof FieldItem ? mapping.field : undefined);
    MappingService.addWhen(chooseItem, mapping);
    MappingService.addOtherwise(chooseItem, mapping?.clone());
    if (mapping) {
      parent.children = parent.children.map((m) => (m !== mapping ? m : chooseItem));
    }
    if (!parent.children.includes(chooseItem)) parent.children.push(chooseItem);
  }

  static addWhen(chooseItem: ChooseItem, mapping?: MappingItem, field?: IField) {
    const whenItem = new WhenItem(chooseItem);

    if (mapping) {
      whenItem.children.push(mapping);
    } else {
      if (field) {
        MappingService.createFieldItem(whenItem, field);
      } else {
        whenItem.children.push(MappingService.createValueSelector(whenItem));
      }
    }
    chooseItem.children.push(whenItem);
    return whenItem;
  }

  static addOtherwise(chooseItem: ChooseItem, mapping?: MappingItem, field?: IField) {
    const newChildren = chooseItem.children.filter((c) => !(c instanceof OtherwiseItem));
    const otherwiseItem = new OtherwiseItem(chooseItem);
    if (mapping) {
      otherwiseItem.children.push(mapping);
    } else {
      if (field) {
        MappingService.createFieldItem(otherwiseItem, field);
      } else {
        otherwiseItem.children.push(MappingService.createValueSelector(otherwiseItem));
      }
    }
    newChildren.push(otherwiseItem);
    chooseItem.children = newChildren;
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

  static getAbsolutePath(condition: MappingItem, xpath: string): string {
    return condition.contextPath && !xpath.startsWith('$') && !xpath.startsWith('/')
      ? condition.contextPath + '/' + xpath
      : xpath;
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

  static createFieldItem(parentItem: MappingParentType, field: IField) {
    const fieldItem = new FieldItem(parentItem, field);
    parentItem.children.push(fieldItem);
    return fieldItem;
  }

  private static registerNamespaceFromField(mappingTree: MappingTree, field: IField) {
    if (DocumentService.isNonPrimitiveField(field.parent)) {
      MappingService.registerNamespaceFromField(mappingTree, field.parent as IField);
    }
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
    item.children = item.children.filter((child) => !(child instanceof ValueSelector));
    const isConditionItem = item instanceof ConditionItem;
    const isParentFieldItem = 'parent' in item && item.parent instanceof FieldItem;
    if (isConditionItem || isParentFieldItem) {
      MappingService.deleteFromParent(item);
    }
  }

  private static deleteFromParent(item: MappingItem) {
    item.parent.children = item.parent.children.filter((child) => child !== item);
    const isParentFieldItem = item.parent instanceof FieldItem;
    const isParentParentFieldItem = 'parent' in item.parent && item.parent.parent instanceof FieldItem;
    const areNoChildren = item.parent.children.length === 0;
    if (isParentFieldItem && isParentParentFieldItem && areNoChildren) {
      MappingService.deleteFromParent(item.parent as FieldItem);
    }
  }

  static sortMappingItem(left: MappingItem, right: MappingItem) {
    if (left instanceof ValueSelector) return -1;
    if (right instanceof ValueSelector) return 1;
    if (left instanceof WhenItem) return right instanceof OtherwiseItem ? -1 : 0;
    if (right instanceof WhenItem) return left instanceof OtherwiseItem ? 1 : 0;
    return 0;
  }
}
