import { DocumentType, IDocument, IField, PrimitiveDocument } from '../../models/datamapper/document';
import {
  ChooseItem,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  IExpressionHolder,
  IfItem,
  IFunctionDefinition,
  InstructionItem,
  isExpressionHolder,
  MappingItem,
  MappingParentType,
  MappingTree,
  OtherwiseItem,
  ValueSelector,
  ValueType,
  VariableItem,
  WhenItem,
} from '../../models/datamapper/mapping';
import { DocumentService } from '../document/document.service';
import { ensureNamespaceRegistered } from '../namespace-util';
import { XPathService } from '../xpath/xpath.service';

/**
 * All-static utility service for manipulating the in-memory {@link MappingTree}/{@link MappingItem}
 * model that corresponds to the main data mappings body placed in `<xsl:template match="/">` in the generated XSLT.
 */
export class MappingService {
  /**
   * Recursively descends into {@link InstructionItem} children to find nested field references,
   * not just top-level matches.
   * @param mappings - the flat list of mapping items to search through
   * @param field - the target field to match against
   * @returns filtered mappings that reference the given field at any nesting depth
   */
  static filterMappingsForField(mappings: MappingItem[], field: IField): MappingItem[] {
    if (!mappings) return [];
    return mappings.filter((mapping) => {
      if (mapping instanceof FieldItem) {
        return mapping.field === field;
      } else if (mapping instanceof ValueSelector) {
        return false;
      } else if (mapping instanceof InstructionItem) {
        return MappingService.getInstructionFields(mapping).includes(field);
      } else {
        return false;
      }
    });
  }

  private static getInstructionFieldItems(mapping: InstructionItem): FieldItem[] {
    if (mapping instanceof ChooseItem) {
      return [...mapping.when, mapping.otherwise].reduce((acc, branch) => {
        branch && acc.push(...MappingService.getInstructionFieldItems(branch));
        return acc;
      }, [] as FieldItem[]);
    } else if (
      mapping instanceof IfItem ||
      mapping instanceof WhenItem ||
      mapping instanceof OtherwiseItem ||
      mapping instanceof ForEachItem ||
      mapping instanceof ForEachGroupItem
    ) {
      return mapping.children.reduce((acc, child) => {
        if (child instanceof FieldItem) {
          acc.push(child);
        } else if (child instanceof InstructionItem) {
          acc.push(...MappingService.getInstructionFieldItems(child));
        }
        return acc;
      }, [] as FieldItem[]);
    }
    return [];
  }

  /**
   * Recursively unwraps nested instruction structures (choose/when/otherwise/if/foreach)
   * to collect all referenced target fields.
   * @param mapping - the instruction item to extract fields from
   * @returns all target fields found at any depth within the instruction
   */
  static getInstructionFields(mapping: InstructionItem): IField[] {
    return MappingService.getInstructionFieldItems(mapping).map((item) => item.field);
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
        isExpressionHolder(child) &&
        MappingService.hasStaleSourceDocument(child, documentType, documentReferenceId)
      ) {
        return acc;
      }
      if (!(child.parent instanceof InstructionItem) && child instanceof FieldItem && child.children.length === 0)
        return acc;
      acc.push(child);
      return acc;
    }, [] as MappingItem[]);
  }

  private static hasStaleSourceDocument(
    expressionItem: IExpressionHolder & MappingItem,
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
      console.debug('XPath field path extraction failed:', error);
    }
    return !!stalePath;
  }

  /**
   * For target documents, attempts field migration via {@link DocumentService.getCompatibleField}
   * before removing. For source documents, removes XPath references that no longer resolve,
   * gracefully handling XPath parse errors.
   * @param mappingTree - the mapping tree to clean up
   * @param document - the document whose fields may have changed
   * @returns the modified mapping tree
   */
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
      if (
        (compatibleField && child.children.length > 0) ||
        child.parent instanceof InstructionItem ||
        child instanceof InstructionItem ||
        child instanceof ValueSelector
      ) {
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
      if (isExpressionHolder(child) && MappingService.hasStaleSourceField(child, document)) {
        return acc;
      }
      if (!(child.parent instanceof InstructionItem) && child instanceof FieldItem && child.children.length === 0) {
        return acc;
      }
      acc.push(child);
      return acc;
    }, [] as MappingItem[]);
  }

  private static hasStaleSourceField(expressionItem: IExpressionHolder & MappingItem, document: IDocument): boolean {
    const namespaces = expressionItem.mappingTree.namespaceMap;
    let fieldPaths = [];
    try {
      fieldPaths = XPathService.extractFieldPaths(expressionItem.expression);
    } catch (error: any) {
      // Field path extraction failed, there might be xpath parse error. Since the same error should be shown
      // on xpath input field, just ignoring here.
      console.debug('XPath field path extraction failed:', error);
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

  /**
   * Mutates the tree in-place: replaces the wrapped item in its parent's children array
   * with the wrapper, then reparents the wrapped item under the wrapper.
   * @param wrapped - the existing mapping item to be wrapped
   * @param wrapper - the new parent item that will contain the wrapped item
   */
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
      if (isExpressionHolder(child)) {
        // Escape regex metacharacters in oldDocumentId to prevent regex injection
        const escapedOldDocumentId = oldDocumentId.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
        // Use function callback to ensure literal replacement (avoid $1, $$, etc. interpretation)
        child.expression = child.expression.replace(
          new RegExp(String.raw`\$${escapedOldDocumentId}\b`, 'g'),
          `$${newDocumentId}`,
        );
      }
    }
  }

  /**
   * Convenience wrapper around {@link wrapWithItem} using a {@link ForEachItem}.
   * @param wrapped - the mapping item to wrap with a for-each loop
   */
  static wrapWithForEach(wrapped: MappingItem) {
    MappingService.wrapWithItem(wrapped, new ForEachItem(wrapped.parent));
  }

  /**
   * Convenience wrapper around {@link wrapWithItem} using a {@link ForEachGroupItem}.
   * @param wrapped - the mapping item to wrap with a for-each loop
   */
  static wrapWithForEachGroup(wrapped: MappingItem) {
    MappingService.wrapWithItem(wrapped, new ForEachGroupItem(wrapped.parent));
  }

  /**
   * Convenience wrapper around {@link wrapWithItem} using an {@link IfItem}.
   * @param wrapped - the mapping item to wrap with a conditional
   */
  static wrapWithIf(wrapped: MappingItem) {
    MappingService.wrapWithItem(wrapped, new IfItem(wrapped.parent));
  }

  /**
   * Clones the wrapped item for the Otherwise branch so When and Otherwise
   * receive independent copies.
   * @param wrapped - the mapping item to wrap with a choose/when/otherwise structure
   */
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

  /**
   * When no mapping is provided, creates an empty {@link ValueSelector} as a placeholder child.
   * @param parent - the parent container to add the if-item to
   * @param mapping - optional existing mapping to place inside the if-item
   */
  static addIf(parent: MappingParentType, mapping?: MappingItem) {
    const ifItem = new IfItem(parent);
    parent.children.push(ifItem);
    ifItem.children.push(mapping ?? MappingService.createValueSelector(ifItem));
  }

  /**
   * When a mapping is provided, it replaces that mapping in the parent's children with the new
   * {@link ChooseItem}. The mapping is cloned for the Otherwise branch so each branch gets
   * an independent copy.
   * @param parent - the parent container
   * @param mapping - optional existing mapping to distribute across When/Otherwise branches
   */
  static addChooseWhenOtherwise(parent: MappingParentType, mapping?: MappingItem) {
    const chooseItem = new ChooseItem(parent, mapping && mapping instanceof FieldItem ? mapping.field : undefined);
    MappingService.addWhen(chooseItem, mapping);
    MappingService.addOtherwise(chooseItem, mapping?.clone());
    if (mapping) {
      parent.children = parent.children.map((m) => (m !== mapping ? m : chooseItem));
    }
    if (!parent.children.includes(chooseItem)) parent.children.push(chooseItem);
  }

  /**
   * Content is resolved by priority: mapping argument, then field argument,
   * then a default empty {@link ValueSelector}.
   * @param chooseItem - the choose item to add a when-branch to
   * @param mapping - optional existing mapping for the when content
   * @param field - optional field to create a {@link FieldItem} for
   * @returns the created when item
   */
  static addWhen(chooseItem: ChooseItem, mapping?: MappingItem, field?: IField) {
    const whenItem = new WhenItem(chooseItem);

    if (mapping) {
      whenItem.children.push(mapping);
    } else if (field) {
      MappingService.createFieldItem(whenItem, field);
    } else {
      whenItem.children.push(MappingService.createValueSelector(whenItem));
    }
    chooseItem.children.push(whenItem);
    return whenItem;
  }

  /**
   * Replaces any existing {@link OtherwiseItem} in the {@link ChooseItem},
   * ensuring at most one Otherwise per Choose.
   * @param chooseItem - the choose item to add an otherwise-branch to
   * @param mapping - optional existing mapping for the otherwise content
   * @param field - optional field to create a {@link FieldItem} for
   * @returns the created otherwise item
   */
  static addOtherwise(chooseItem: ChooseItem, mapping?: MappingItem, field?: IField) {
    const newChildren = chooseItem.children.filter((c) => !(c instanceof OtherwiseItem));
    const otherwiseItem = new OtherwiseItem(chooseItem);
    if (mapping) {
      otherwiseItem.children.push(mapping);
    } else if (field) {
      MappingService.createFieldItem(otherwiseItem, field);
    } else {
      otherwiseItem.children.push(MappingService.createValueSelector(otherwiseItem));
    }
    newChildren.push(otherwiseItem);
    chooseItem.children = newChildren;
    return otherwiseItem;
  }

  /**
   * Wraps the existing expression with function-call syntax, e.g. `expr` becomes `fn(expr)`.
   * @param condition - the expression holder whose expression will be wrapped
   * @param func - the function definition providing the function name
   */
  static wrapWithFunction(condition: IExpressionHolder, func: IFunctionDefinition) {
    condition.expression = `${func.name}(${condition.expression})`;
  }

  /**
   * {@link ForEachItem} replaces the expression entirely (it is a loop source),
   * while other condition types append the source via {@link XPathService.addSource}.
   * @param condition - the condition item to map the source to
   * @param source - the source field or primitive document to map from
   */
  static mapToCondition(condition: MappingItem, source: PrimitiveDocument | IField) {
    MappingService.registerNamespaceFromField(condition.mappingTree, source);
    const pathExpression = XPathService.toPathExpression(
      condition.mappingTree.namespaceMap,
      source,
      condition.parent.contextPath,
    );
    if (condition instanceof ForEachItem) {
      condition.expression = XPathService.toXPathString(pathExpression);
    } else if (isExpressionHolder(condition)) {
      condition.expression = XPathService.addSource(condition.expression, pathExpression);
    }
  }

  /**
   * Reuses an existing {@link ValueSelector} at the tree root if one exists
   * instead of creating a new one.
   * @param mappingTree - the mapping tree representing the target document root
   * @param source - the source field or primitive document to map from
   */
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

  /**
   * Uses relative XPath based on the {@link ValueSelector}'s contextPath, not absolute paths.
   * @param source - the source field or primitive document to map from
   * @param targetFieldItem - the target mapping item to map the source to
   */
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

  /**
   * Creates a {@link FieldItem} and appends it to the parent's children.
   * @param parentItem - the parent container
   * @param field - the target field for the new item
   * @returns the created field item
   */
  static createFieldItem(parentItem: MappingParentType, field: IField) {
    const fieldItem = new FieldItem(parentItem, field);
    parentItem.children.push(fieldItem);
    return fieldItem;
  }

  private static registerNamespaceFromField(mappingTree: MappingTree, field: IField) {
    if (DocumentService.isNonPrimitiveField(field.parent)) {
      MappingService.registerNamespaceFromField(mappingTree, field.parent as IField);
    }
    ensureNamespaceRegistered(field.namespaceURI, mappingTree.namespaceMap, field.namespacePrefix ?? undefined);
  }

  /**
   * {@link ValueType} is inferred from the parent's target field context: ATTRIBUTE for attribute fields,
   * CONTAINER for fields with children, VALUE otherwise. {@link MappingTree} root defaults to VALUE.
   * @param parent - the parent container that determines the value type
   * @returns the created value selector
   */
  static createValueSelector(parent: MappingParentType) {
    const valueType = parent instanceof MappingTree ? ValueType.VALUE : MappingService.getValueTypeFor(parent);
    return new ValueSelector(parent, valueType);
  }

  /**
   * Variables are prepended (unshift) to children, matching the XSLT requirement
   * that `xsl:variable` declarations precede other instructions.
   * @param parent - the parent container
   * @param name - the variable name
   * @param expression - optional initial XPath expression
   * @returns the created variable item
   */
  static addVariable(parent: MappingParentType, name: string, expression?: string): VariableItem {
    const variable = new VariableItem(parent, name);
    if (expression) {
      variable.expression = expression;
    }
    parent.children.unshift(variable);
    return variable;
  }

  /**
   * Also cleans up empty parent {@link FieldItem} chains via recursive deletion.
   * @param variable - the variable item to remove
   */
  static removeVariable(variable: VariableItem): void {
    MappingService.deleteFromParent(variable);
  }

  /**
   * In-place update of name and expression on an existing {@link VariableItem}.
   * @param variable - the variable item to update
   * @param name - the new variable name
   * @param expression - the new XPath expression
   */
  static updateVariable(variable: VariableItem, name: string, expression: string): void {
    variable.name = name;
    variable.expression = expression;
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

  /**
   * First removes {@link ValueSelector} children, then for {@link InstructionItem}/{@link VariableItem}
   * or items under {@link FieldItem} parents, removes the item and recursively cleans up
   * empty FieldItem ancestors.
   * @param item - the mapping item to delete
   */
  static deleteMappingItem(item: MappingParentType) {
    item.children = item.children.filter((child) => !(child instanceof ValueSelector));
    const isInstructionItem = item instanceof InstructionItem;
    const isVariableItem = item instanceof VariableItem;
    const isParentFieldItem = 'parent' in item && item.parent instanceof FieldItem;
    if (isInstructionItem || isVariableItem || isParentFieldItem) {
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

  /**
   * {@link Array.sort} comparator establishing XSLT output order:
   * {@link ValueSelector} first, {@link WhenItem} before {@link OtherwiseItem}.
   * @param left - first item to compare
   * @param right - second item to compare
   * @returns negative if left should come first, positive if right should, zero if equal
   */
  static sortMappingItem(left: MappingItem, right: MappingItem) {
    if (left instanceof ValueSelector) return -1;
    if (right instanceof ValueSelector) return 1;
    if (left instanceof WhenItem) return right instanceof OtherwiseItem ? -1 : 0;
    if (right instanceof WhenItem) return left instanceof OtherwiseItem ? 1 : 0;
    return 0;
  }
}
