import { DocumentType, IDocument, IField, PrimitiveDocument } from '../models/datamapper/document';
import {
  ChooseItem,
  ConditionItem,
  ExpressionItem,
  FieldItem,
  ForEachItem,
  IfItem,
  IFunctionDefinition,
  MappingItem,
  MappingParentType,
  MappingTree,
  OtherwiseItem,
  ValueSelector,
  ValueType,
  WhenItem,
} from '../models/datamapper/mapping';
import { DocumentService } from './document.service';
import { DocumentUtilService } from './document-util.service';
import { XPathService } from './xpath/xpath.service';

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
        if (child instanceof FieldItem) {
          acc.push(child);
        } else if (child instanceof ConditionItem) {
          acc.push(...MappingService.getConditionalFieldItems(child));
        }
        return acc;
      }, [] as FieldItem[]);
    }
    return [];
  }

  static getConditionalFields(mapping: ConditionItem): IField[] {
    return MappingService.getConditionalFieldItems(mapping).map((item) => item.field);
  }

  /**
   * Removes all mappings for the specified document. When the document is a {@link DocumentType.PARAM},
   * the 3rd argument {@link documentReferenceId} should indicate the parameter's document reference ID.
   * Note that it could be different from document ID. For example, JSON document has a suffix `-x`.
   * @param mappingTree
   * @param documentType
   * @param documentReferenceId
   */
  static removeAllMappingsForDocument(
    mappingTree: MappingTree,
    documentType: DocumentType,
    documentReferenceId?: string,
  ) {
    if (documentType === DocumentType.TARGET_BODY) {
      MappingService.doRemoveAllMappingsForTargetDocument(mappingTree);
    } else {
      MappingService.doRemoveAllMappingsForSourceDocument(mappingTree, documentType, documentReferenceId);
    }
    return mappingTree;
  }

  private static doRemoveAllMappingsForTargetDocument(mappingTree: MappingTree) {
    mappingTree.children = [];
  }

  private static doRemoveAllMappingsForSourceDocument(
    item: MappingTree | MappingItem,
    documentType: DocumentType,
    documentReferenceId?: string,
  ) {
    item.children = item.children.reduce((acc, child) => {
      MappingService.doRemoveAllMappingsForSourceDocument(child, documentType, documentReferenceId);
      if (
        child instanceof ExpressionItem &&
        MappingService.hasStaleSourceDocument(child, documentType, documentReferenceId)
      ) {
        return acc;
      }
      if (child instanceof FieldItem && child.children.length === 0) return acc;
      acc.push(child);
      return acc;
    }, [] as MappingItem[]);
  }

  private static hasStaleSourceDocument(
    expressionItem: ExpressionItem,
    documentType: DocumentType,
    documentReferenceId?: string,
  ) {
    let stalePath = undefined;
    try {
      stalePath = XPathService.extractFieldPaths(expressionItem.expression, expressionItem.contextPath).find(
        (xpath) => {
          return (
            (documentType === DocumentType.SOURCE_BODY && !xpath.documentReferenceName) ||
            (documentType === DocumentType.PARAM &&
              documentReferenceId &&
              xpath.documentReferenceName === documentReferenceId)
          );
        },
      );
      /* eslint-disable @typescript-eslint/no-explicit-any */
    } catch (error: any) {
      // Field path extraction failed, there might be xpath parse error. Since the same error should be shown
      // on xpath input field, just ignoring here.
    }
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

  private static hasStaleSourceField(expressionItem: ExpressionItem, document: IDocument): boolean {
    const namespaces = expressionItem.mappingTree.namespaceMap;
    let fieldPaths = [];
    try {
      fieldPaths = XPathService.extractFieldPaths(expressionItem.expression);
    } catch (error: any) {
      // Field path extraction failed, there might be xpath parse error. Since the same error should be shown
      // on xpath input field, just ignoring here.
      return false;
    }

    const stalePath = fieldPaths.find((xpath) => {
      xpath.contextPath = expressionItem.parent.contextPath;
      xpath.isRelative = !!xpath.contextPath;
      const absPath = XPathService.toAbsolutePath(xpath);
      if (
        (document.documentType === DocumentType.SOURCE_BODY && !absPath.documentReferenceName) ||
        (document.documentType === DocumentType.PARAM &&
          absPath.documentReferenceName === document.getReferenceId(namespaces))
      ) {
        const referredField = DocumentService.getFieldFromPathSegments(
          expressionItem.mappingTree.namespaceMap,
          document,
          absPath.pathSegments,
        );
        return !referredField;
      }
    });
    return !!stalePath;
  }

  static wrapWithItem(wrapped: MappingItem, wrapper: MappingItem) {
    wrapper.children.push(wrapped);
    wrapped.parent.children = wrapped.parent.children.map((m) => (m !== wrapped ? m : wrapper));
    wrapped.parent = wrapper;
  }

  /**
   * Renames a parameter in all mappings within the mapping tree.
   * This updates XPath expressions that reference the old parameter name.
   */
  static renameParameterInMappings(
    item: MappingTree | MappingItem,
    oldDocumentId: string,
    newDocumentId: string,
  ): void {
    for (const child of item.children) {
      MappingService.renameParameterInMappings(child, oldDocumentId, newDocumentId);
      // Update XPath expressions in the item
      if (child instanceof ExpressionItem) {
        child.expression = child.expression.replace(new RegExp(`\\$${oldDocumentId}\\b`, 'g'), `$${newDocumentId}`);
      }
    }
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
    const pathExpression = XPathService.toPathExpression(
      condition.mappingTree.namespaceMap,
      source,
      condition.parent.contextPath,
    );
    if (condition instanceof ForEachItem) {
      condition.expression = XPathService.toXPathString(pathExpression);
    } else if (condition instanceof ExpressionItem) {
      condition.expression = XPathService.addSource(condition.expression, pathExpression);
    }
  }

  static mapToDocument(mappingTree: MappingTree, source: PrimitiveDocument | IField) {
    let valueSelector = mappingTree.children.find((mapping) => mapping instanceof ValueSelector) as ValueSelector;
    if (!valueSelector) {
      valueSelector = MappingService.createValueSelector(mappingTree);
      mappingTree.children.push(valueSelector);
    }
    MappingService.registerNamespaceFromField(mappingTree, source);
    const path = XPathService.toPathExpression(mappingTree.namespaceMap, source);
    valueSelector.expression = XPathService.addSource(valueSelector.expression, path);
  }

  static mapToField(source: PrimitiveDocument | IField, targetFieldItem: MappingItem) {
    let valueSelector = targetFieldItem?.children.find((child) => child instanceof ValueSelector) as ValueSelector;
    if (!valueSelector) {
      valueSelector = MappingService.createValueSelector(targetFieldItem);
      targetFieldItem.children.push(valueSelector);
    }
    MappingService.registerNamespaceFromField(targetFieldItem.mappingTree, source);
    const relativePath = XPathService.toPathExpression(
      targetFieldItem.mappingTree.namespaceMap,
      source,
      valueSelector.contextPath,
    );
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
      const prefix = field.namespacePrefix ?? DocumentUtilService.generateNamespacePrefix(mappingTree.namespaceMap);
      mappingTree.namespaceMap[prefix] = field.namespaceURI;
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
    const isParentParentFieldItem =
      'parent' in item.parent && (item.parent.parent instanceof FieldItem || item.parent.parent instanceof MappingTree);
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
