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
import { Types } from '../../models/datamapper/types';
import { PathExpression } from '../../models/datamapper/xpath';
import { DocumentService } from '../document/document.service';
import { XmlSchemaField } from '../document/xml-schema/xml-schema-document.model';
import { ensureNamespaceRegistered } from '../namespace-util';
import { XPathService } from '../xpath/xpath.service';
import { FieldMatchingService } from './field-matching.service';

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
        (compatibleField && child instanceof FieldItem && child.isUserCreated) ||
        child.parent instanceof InstructionItem ||
        child instanceof InstructionItem ||
        child instanceof ValueSelector
      ) {
        acc.push(child);
      }
      return acc;
    }, [] as MappingItem[]);
  }

  static updateFieldItemField(item: FieldItem, newField: IField): FieldItem {
    const updated = new FieldItem(item.parent, newField);
    updated.isUserCreated = item.isUserCreated;
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
   * Adds a {@link ForEachItem} as a child inside the parent item.
   * This creates an "inner" for-each where the for-each is nested
   * inside the parent element rather than wrapping it.
   *
   * Behavior depends on the parent type:
   * - If parent is a ForEachItem: nests the new for-each inside it
   * - If parent is a FieldItem with existing ForEachItem children: adds as sibling
   * - Otherwise: moves existing children into the new for-each
   *
   * @param parent - the parent item to add the for-each inside
   * @param existingChildren - optional existing children to move inside the for-each
   */
  static addInnerForEach(parent: MappingItem, existingChildren?: MappingItem[]): ForEachItem {
    return MappingService.addInnerIterationItem(parent, new ForEachItem(parent), existingChildren);
  }

  /**
   * Adds a {@link ForEachGroupItem} as a child inside the parent item.
   * Same placement logic as {@link addInnerForEach} but creates a for-each-group node.
   *
   * @param parent - the parent item to add the for-each-group inside
   * @param existingChildren - optional existing children to move inside the for-each-group
   */
  static addInnerForEachGroup(parent: MappingItem, existingChildren?: MappingItem[]): ForEachGroupItem {
    return MappingService.addInnerIterationItem(parent, new ForEachGroupItem(parent), existingChildren);
  }

  private static addInnerIterationItem<T extends MappingItem>(
    parent: MappingItem,
    item: T,
    existingChildren?: MappingItem[],
  ): T {
    const ensureBodyPlaceholder = () => {
      if (item.children.length === 0) {
        item.children.push(MappingService.createValueSelector(item));
      }
    };

    // If parent is already a ForEachItem, nest inside it
    if (parent instanceof ForEachItem || parent instanceof ForEachGroupItem) {
      // Move existing children (except ValueSelector) into the new item
      const childrenToMove = existingChildren ?? parent.children.filter((c) => !(c instanceof ValueSelector));
      for (const child of childrenToMove) {
        child.parent = item;
        item.children.push(child);
      }

      // Replace parent's children with the new item and any ValueSelectors
      const valueSelectors = parent.children.filter((c) => c instanceof ValueSelector);
      ensureBodyPlaceholder();
      parent.children = [...valueSelectors, item];
    } else {
      // Parent is a FieldItem or other type
      // Check if there are already ForEachItem children
      const hasExistingForEach = parent.children.some((c) => c instanceof ForEachItem || c instanceof ForEachGroupItem);

      if (hasExistingForEach) {
        // If there are already for-each items, add the new one as a sibling (empty)
        const valueSelectors = parent.children.filter((c) => c instanceof ValueSelector);
        const otherChildren = parent.children.filter((c) => !(c instanceof ValueSelector));
        ensureBodyPlaceholder();
        parent.children = [...valueSelectors, ...otherChildren, item];
      } else {
        // First for-each: move existing children (except ValueSelector) into it
        const childrenToMove = existingChildren ?? parent.children.filter((c) => !(c instanceof ValueSelector));
        for (const child of childrenToMove) {
          child.parent = item;
          item.children.push(child);
        }

        // Replace parent's children with the new item and any ValueSelectors
        const valueSelectors = parent.children.filter((c) => c instanceof ValueSelector);
        ensureBodyPlaceholder();
        parent.children = [...valueSelectors, item];
      }
    }
    return item;
  }

  /**
   * Adds a {@link ChooseItem} with when/otherwise branches as a child inside the parent item.
   * This creates an "inner" choose where the choose structure is nested
   * inside the parent element rather than wrapping it.
   * @param parent - the parent item to add the choose inside
   * @param field - optional field for the choose item
   */
  static addInnerChooseWhenOtherwise(parent: MappingItem, field?: IField) {
    const chooseItem = new ChooseItem(parent, field);

    // Move existing children (except ValueSelector) into the when branch
    const childrenToMove = parent.children.filter((c) => !(c instanceof ValueSelector));
    const valueSelectors = parent.children.filter((c) => c instanceof ValueSelector);

    // Create when and otherwise branches
    const whenItem = MappingService.addWhen(chooseItem);
    const otherwiseItem = MappingService.addOtherwise(chooseItem);

    // Move existing children into the when branch
    if (childrenToMove.length > 0) {
      // Remove the default ValueSelector from when branch
      whenItem.children = whenItem.children.filter((c) => !(c instanceof ValueSelector));
      childrenToMove.forEach((child) => {
        child.parent = whenItem;
        whenItem.children.push(child);
      });

      // Clone children for otherwise branch
      const clonedChildren = childrenToMove.map((child) => {
        const cloned = child.clone();
        cloned.parent = otherwiseItem;
        return cloned;
      });
      otherwiseItem.children = otherwiseItem.children.filter((c) => !(c instanceof ValueSelector));
      otherwiseItem.children.push(...clonedChildren);
    }

    // Replace parent's children with the choose and any ValueSelectors
    parent.children = [...valueSelectors, chooseItem];
  }

  /**
   * Adds an {@link IfItem} as a child inside the parent item.
   * This creates an "inner" if where the if structure is nested
   * inside the parent element rather than wrapping it.
   *
   * Behavior:
   * - If the parent has any non-IfItem children (content to wrap):
   *   ALL children are moved into the new IfItem
   * - If the parent has only IfItem children (all content already wrapped):
   *   An empty IfItem is added as a sibling to existing IfItems
   *
   * This method supports nesting - you can call it on an existing IfItem to create
   * a nested if structure. The first nested if will contain all the IfItem's children,
   * and subsequent calls will add sibling IfItems.
   *
   * @param parent - the parent item to add the if inside (can be FieldItem, IfItem, etc.)
   */
  static addInnerIf(parent: MappingItem) {
    const ifItem = new IfItem(parent);

    // Get existing IfItems before we modify children
    const existingIfItems = parent.children.filter((c) => c instanceof IfItem);

    // Find children that are not IfItem
    const nonIfChildren = parent.children.filter((c) => !(c instanceof IfItem));

    if (nonIfChildren.length > 0) {
      // Parent has content to wrap - move ALL children into the new IfItem
      const allChildren = parent.children.slice();
      allChildren.forEach((child) => {
        child.parent = ifItem;
        ifItem.children.push(child);
      });
      parent.children = [ifItem];
    } else {
      // Parent has only IfItems - add empty IfItem as sibling
      parent.children = [...existingIfItems, ifItem];
    }
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
   * Single-dispatch target application of a pre-built {@link PathExpression}.
   *
   * Separates the two orthogonal concerns in mapping:
   * - **Source → PathExpression**: caller's responsibility (namespace registration, field stack, etc.)
   * - **PathExpression → Target**: this method's responsibility
   *
   * This eliminates the N×M explosion of `mapSourceTypeToTargetType` methods.
   * Adding a new source type only requires building a `PathExpression`; no new `mapTo*` overloads needed.
   *
   * @param pathExpr - the pre-built source path expression
   * @param target - where to apply: {@link MappingTree} (document root), or any {@link MappingItem}
   * @param valueType - value type for field-target {@link ValueSelector}; defaults to VALUE
   */
  static applyMapping(
    pathExpr: PathExpression,
    target: MappingItem | MappingTree,
    valueType: ValueType = ValueType.VALUE,
  ): void {
    if (target instanceof MappingTree) {
      let vs = target.children.find((c) => c instanceof ValueSelector) as ValueSelector;
      if (!vs) {
        vs = MappingService.createValueSelector(target);
        target.children.push(vs);
      }
      vs.expression = XPathService.addSource(vs.expression, pathExpr);
    } else if (target instanceof ForEachItem) {
      target.expression = XPathService.toXPathString(pathExpr);
    } else if (isExpressionHolder(target)) {
      target.expression = XPathService.addSource(target.expression, pathExpr);
    } else {
      const vs = MappingService.ensureValueSelector(target, valueType);
      vs.valueType = valueType;
      vs.expression = XPathService.addSource(vs.expression, pathExpr);
    }
  }

  /**
   * Builds an absolute {@link PathExpression} for a variable reference (`$varName`).
   * No namespace registration needed — variable names are local NCNames with no namespace URI.
   * @param variableName - the variable name without the `$` prefix
   */
  static variablePathExpression(variableName: string): PathExpression {
    const pathExpr = new PathExpression();
    pathExpr.isRelative = false;
    pathExpr.documentReferenceName = variableName;
    return pathExpr;
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
    MappingService.applyMapping(pathExpression, condition);
  }

  /**
   * Reuses an existing {@link ValueSelector} at the tree root if one exists
   * instead of creating a new one.
   * @param mappingTree - the mapping tree representing the target document root
   * @param source - the source field or primitive document to map from
   */
  static mapToDocument(mappingTree: MappingTree, source: PrimitiveDocument | IField) {
    MappingService.registerNamespaceFromField(mappingTree, source);
    const path = XPathService.toPathExpression(mappingTree.namespaceMap, source);
    MappingService.applyMapping(path, mappingTree);
  }

  /**
   * Uses relative XPath based on the {@link ValueSelector}'s contextPath, not absolute paths.
   * @param source - the source field or primitive document to map from
   * @param targetFieldItem - the target mapping item to map the source to
   */
  static mapToField(source: PrimitiveDocument | IField, targetFieldItem: MappingItem) {
    const valueSelector = MappingService.ensureValueSelector(targetFieldItem);
    MappingService.applySourceExpression(source, targetFieldItem, valueSelector);
  }

  /**
   * Like {@link mapToField} but sets an explicit {@link ValueType} on the selector.
   * Used for container copy-of scenarios where we need CONTAINER or CONTAINER_NODE.
   */
  static mapToFieldWithValueType(
    source: PrimitiveDocument | IField,
    targetFieldItem: MappingItem,
    valueType: ValueType,
  ) {
    const valueSelector = MappingService.ensureValueSelector(targetFieldItem, valueType);
    valueSelector.valueType = valueType;
    MappingService.applySourceExpression(source, targetFieldItem, valueSelector);
    if (valueType === ValueType.CONTAINER_NODE && !valueSelector.expression.endsWith('/node()')) {
      valueSelector.expression = `${valueSelector.expression}/node()`;
    }
  }

  private static ensureValueSelector(targetFieldItem: MappingItem, valueType?: ValueType): ValueSelector {
    let valueSelector = targetFieldItem?.children.find((child) => child instanceof ValueSelector) as ValueSelector;
    if (!valueSelector) {
      valueSelector =
        valueType == null
          ? MappingService.createValueSelector(targetFieldItem)
          : new ValueSelector(targetFieldItem, valueType);
      targetFieldItem.children.push(valueSelector);
    }
    return valueSelector;
  }

  private static applySourceExpression(
    source: PrimitiveDocument | IField,
    targetFieldItem: MappingItem,
    valueSelector: ValueSelector,
  ) {
    MappingService.registerNamespaceFromField(targetFieldItem.mappingTree, source);
    const relativePath = XPathService.toPathExpression(
      targetFieldItem.mappingTree.namespaceMap,
      source,
      valueSelector.contextPath,
    );
    valueSelector.expression = XPathService.addSource(valueSelector.expression, relativePath);
  }

  /**
   * Recursively generates child mappings for container fields that cannot use copy-of.
   * For each matching child pair from {@link FieldMatchingService.findMatchingChildren}:
   * - Both terminal → {@link mapToField} (value-of)
   * - Both container + copy-of eligible → {@link mapToFieldWithValueType} with CONTAINER/CONTAINER_NODE
   * - Both container + NOT copy-of eligible → recurse
   * - Kind mismatch (leaf↔container) → skipped (already filtered by findMatchingChildren)
   *
   * @param sourceField - Source container field
   * @param targetField - Target container field
   * @param parentItem - Parent mapping item to attach children to
   */
  static generateAutoChildMappings(sourceField: IField, targetField: IField, parentItem: MappingItem): void {
    const matchingPairs = FieldMatchingService.findMatchingChildren(sourceField, targetField);

    for (const pair of matchingPairs) {
      MappingService.processPair(pair.source, pair.target, parentItem);
    }
  }

  /**
   * Processes a single source-target field pair during auto-mapping.
   * Decides whether to create a terminal mapping, container copy-of, or recurse.
   * @param sourceChild - Source field from the pair
   * @param targetChild - Target field from the pair
   * @param parentItem - Parent mapping item to attach the new mapping to
   */
  private static processPair(sourceChild: IField, targetChild: IField, parentItem: MappingItem): void {
    const childFieldItem = MappingService.createFieldItem(parentItem, targetChild);

    if (!DocumentService.hasChildren(sourceChild)) {
      MappingService.mapToField(sourceChild, childFieldItem);
      return;
    }

    MappingService.applyContainerMapping(sourceChild, targetChild, childFieldItem);
  }

  /**
   * Applies container-to-container mapping: uses copy-of when eligible, otherwise recurses
   * into child mappings. Shared by auto-mapping ({@link processPair}) and drag-and-drop
   * ({@link MappingActionService.engageMapping}).
   */
  static applyContainerMapping(sourceField: IField, targetField: IField, parentItem: MappingItem): void {
    if (FieldMatchingService.canUseCopyOf(sourceField, targetField)) {
      const valueType = MappingService.getContainerValueType(sourceField, targetField);
      MappingService.mapToFieldWithValueType(sourceField, parentItem, valueType);
    } else {
      MappingService.generateAutoChildMappings(sourceField, targetField, parentItem);
    }
  }

  /**
   * Determines whether to use CONTAINER or CONTAINER_NODE based on xs:anyType involvement.
   * When xs:anyType is involved, CONTAINER_NODE is used to generate `xsl:copy-of select="path/node()"`,
   * which copies only children to avoid name mismatch between source and target wrapper elements.
   * @param sourceField - Source field
   * @param targetField - Target field
   * @returns CONTAINER_NODE if xs:anyType is involved, otherwise CONTAINER
   */
  static getContainerValueType(sourceField: IField, targetField: IField): ValueType {
    const anyTypeInvolved =
      (sourceField instanceof XmlSchemaField && sourceField.type === Types.AnyType) ||
      (targetField instanceof XmlSchemaField && targetField.type === Types.AnyType);

    return anyTypeInvolved ? ValueType.CONTAINER_NODE : ValueType.CONTAINER;
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
   * Recursively traverses the {@link MappingTree} and collects ALL {@link VariableItem} instances
   * at any nesting depth. Used for operations that need to find all variables regardless of scope,
   * such as reference cleanup ({@link removeVariableReferences}).
   * @param mappingTree - the mapping tree to traverse
   * @returns flat list of all variables from all nesting levels
   */
  static resolveVariableInScope(name: string, context: MappingItem): VariableItem | undefined {
    let current: MappingItem = context;
    while (true) {
      const parent: MappingParentType = current.parent;
      if (!parent?.children) break;
      const idx = parent.children.indexOf(current);
      for (let i = idx - 1; i >= 0; i--) {
        const sibling = parent.children[i];
        if (sibling instanceof VariableItem && sibling.name === name) return sibling;
      }
      if (parent instanceof MappingTree) break;
      current = parent;
    }
    return undefined;
  }

  static getAllVariables(mappingTree: MappingTree): VariableItem[] {
    const result: VariableItem[] = [];
    const collect = (children: MappingItem[]) => {
      for (const child of children) {
        if (child instanceof VariableItem) {
          result.push(child);
        }
        collect(child.children);
      }
    };

    collect(mappingTree.children);
    return result;
  }

  /**
   * Inserts the new variable after any existing {@link VariableItem} children, keeping all
   * variable declarations grouped at the front ahead of other instructions — consistent with
   * the XSLT requirement that `xsl:variable` declarations precede other instructions.
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
    const lastVariableIndex = parent.children.reduce((idx, child, i) => (child instanceof VariableItem ? i : idx), -1);
    parent.children.splice(lastVariableIndex + 1, 0, variable);
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
   * Removes expression holders referencing `$variableName` from the variable's
   * XSLT scope: only following siblings of the variable and their descendants.
   * Also prunes empty {@link FieldItem} chains left behind.
   * Call before {@link removeVariable}.
   */
  static removeVariableReferences(variable: VariableItem): void {
    const parent = variable.parent;
    if (!parent?.children) return;
    const idx = parent.children.indexOf(variable);
    if (idx === -1) return;
    const siblings = parent.children.slice(idx + 1);
    const cleaned: MappingItem[] = [];
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling instanceof VariableItem && sibling.name === variable.name) {
        if (MappingService.expressionReferencesVariable(sibling, variable.name)) {
          sibling.expression = '';
        }
        cleaned.push(...siblings.slice(i));
        break;
      }
      if (!MappingService.shouldRemoveItem(sibling, variable.name)) {
        cleaned.push(sibling);
      }
    }
    parent.children = [...parent.children.slice(0, idx + 1), ...cleaned];
  }

  private static shouldRemoveItem(item: MappingItem, variableName: string): boolean {
    let shadowed = false;
    item.children = item.children.reduce((acc, child) => {
      if (child instanceof VariableItem && child.name === variableName) {
        shadowed = true;
        if (MappingService.expressionReferencesVariable(child, variableName)) {
          child.expression = '';
        }
        acc.push(child);
        return acc;
      }
      if (shadowed) {
        acc.push(child);
        return acc;
      }
      if (MappingService.shouldRemoveItem(child, variableName)) {
        return acc;
      }
      acc.push(child);
      return acc;
    }, [] as MappingItem[]);

    if (isExpressionHolder(item) && MappingService.expressionReferencesVariable(item, variableName)) {
      if (item instanceof VariableItem) {
        item.expression = '';
        return false;
      }
      return true;
    }
    return !(item.parent instanceof InstructionItem) && item instanceof FieldItem && item.children.length === 0;
  }

  /**
   * Replaces `$oldName` with `$newName` in all expressions within the variable's
   * XSLT scope: only following siblings and their descendants.
   * Call before {@link updateVariable}.
   */
  static renameVariableReferences(variable: VariableItem, newName: string): void {
    const oldName = variable.name;
    for (const sibling of MappingService.followingSiblings(variable)) {
      if (sibling instanceof VariableItem && sibling.name === oldName) {
        MappingService.renameInExpression(sibling, oldName, newName);
        break;
      }
      MappingService.doRenameVariableReferences(sibling, oldName, newName);
    }
  }

  private static doRenameVariableReferences(item: MappingItem, oldName: string, newName: string): void {
    let shadowed = false;
    for (const child of item.children) {
      if (child instanceof VariableItem && child.name === oldName) {
        MappingService.renameInExpression(child, oldName, newName);
        shadowed = true;
        continue;
      }
      if (!shadowed) {
        MappingService.doRenameVariableReferences(child, oldName, newName);
      }
    }
    if (isExpressionHolder(item) && MappingService.expressionReferencesVariable(item, oldName)) {
      MappingService.renameInExpression(item, oldName, newName);
    }
  }

  private static renameInExpression(item: IExpressionHolder, oldName: string, newName: string): void {
    const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    item.expression = item.expression.replace(new RegExp(String.raw`\$${escaped}(?!\w)`, 'g'), `$${newName}`);
  }

  private static followingSiblings(variable: VariableItem): MappingItem[] {
    const parent = variable.parent;
    if (!parent?.children) return [];
    const idx = parent.children.indexOf(variable);
    if (idx === -1) return [];
    return parent.children.slice(idx + 1);
  }

  private static expressionReferencesVariable(item: IExpressionHolder & MappingItem, variableName: string): boolean {
    try {
      return XPathService.extractVariableNames(item.expression, item.contextPath).includes(variableName);
    } catch {
      return false;
    }
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
    const isUserCreatedFieldItem = item instanceof FieldItem && item.isUserCreated;
    if (isVariableItem) {
      MappingService.removeVariableReferences(item as VariableItem);
    }
    if (isInstructionItem || isVariableItem || isParentFieldItem || isUserCreatedFieldItem) {
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
