import { IField, PrimitiveDocument } from '../../models/datamapper/document';
import {
  ChooseItem,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  IfItem,
  MappingItem,
  MappingParentType,
  MappingTree,
  ValueSelector,
  ValueType,
} from '../../models/datamapper/mapping';
import { Types } from '../../models/datamapper/types';
import {
  AddMappingNodeData,
  ChoiceFieldNodeData,
  FieldItemNodeData,
  ForEachCapableNodeData,
  MappingNodeData,
  SourceNodeDataType,
  SourceVariableNodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  TargetSequenceFieldNodeData,
} from '../../models/datamapper/visualization';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { DocumentService } from '../document/document.service';
import { FieldMatchingService } from '../mapping/field-matching.service';
import { MappingService } from '../mapping/mapping.service';
import { VisualizationUtilService } from './visualization-util.service';

/**
 * Static service for mapping mutations in the DataMapper visualization layer.
 *
 * Owns every operation that modifies the {@link MappingTree} — applying
 * conditions (`if`, `choose/when/otherwise`, `for-each`), engaging and
 * deleting mappings, and adding value selectors.
 *
 * Depends on {@link MappingService} for low-level mapping tree manipulation
 * and on {@link VisualizationUtilService} for node-type inspection,
 * but has no dependency on {@link VisualizationService}.
 *
 * The action registry that determines which actions are available for a
 * given target node lives in {@link MappingActionRegistryService}.
 */
export class MappingActionService {
  /**
   * Returns `true` if the node's mapping already has a {@link ValueSelector} child.
   * @param nodeData - The target node to inspect.
   */
  static hasValueSelector(nodeData: TargetNodeData) {
    return nodeData.mapping?.children.some((c) => c instanceof ValueSelector) ?? false;
  }

  static hasValueOfSelector(nodeData: TargetNodeData) {
    return (
      nodeData.mapping?.children.some(
        (c) => c instanceof ValueSelector && (c.valueType === ValueType.VALUE || c.valueType === ValueType.ATTRIBUTE),
      ) ?? false
    );
  }

  /**
   * Removes the mapping item associated with the node from the mapping tree.
   * No-op if the node has no mapping.
   * @param nodeData - The target node whose mapping should be deleted.
   */
  static deleteMappingItem(nodeData: TargetNodeData) {
    if (nodeData.mapping) {
      MappingService.deleteMappingItem(nodeData.mapping);
    }
  }

  /**
   * Wraps or adds an {@link IfItem} condition to the node's mapping.
   * For document nodes, adds the if directly to the mapping tree.
   * For field and mapping nodes, creates the field item if needed before wrapping.
   * @param nodeData - The target node to apply the condition to.
   */
  static applyIf(nodeData: TargetNodeData) {
    if (nodeData instanceof TargetDocumentNodeData) {
      const valueSelector = nodeData.mappingTree.children.find((c) => c instanceof ValueSelector);
      MappingService.addIf(nodeData.mappingTree, valueSelector);
    } else if (nodeData instanceof AddMappingNodeData) {
      const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
      MappingService.wrapWithIf(fieldItem);
    } else if (nodeData instanceof MappingNodeData || nodeData instanceof TargetFieldNodeData) {
      const createdFieldItem =
        nodeData instanceof TargetFieldNodeData ? MappingActionService.getOrCreateFieldItem(nodeData) : undefined;
      const mapping = nodeData.mapping ?? createdFieldItem;
      if (!mapping) return;
      MappingService.wrapWithIf(mapping);
    }
  }

  /**
   * Wraps or adds a {@link ChooseItem} with `when`/`otherwise` branches to the node's mapping.
   * No-op if the node already contains a `ChooseItem`.
   * For field and mapping nodes, creates the field item if needed before wrapping.
   * @param nodeData - The target node to apply the choose/when/otherwise structure to.
   */
  static applyChooseWhenOtherwise(nodeData: TargetNodeData) {
    if (nodeData instanceof TargetDocumentNodeData) {
      if (nodeData.mappingTree.children.some((c) => c instanceof ChooseItem)) return;

      const valueSelector = nodeData.mappingTree.children.find((c) => c instanceof ValueSelector);
      MappingService.addChooseWhenOtherwise(nodeData.mappingTree, valueSelector);
    } else if (nodeData instanceof AddMappingNodeData) {
      const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
      MappingService.wrapWithChooseWhenOtherwise(fieldItem);
    } else if (nodeData instanceof MappingNodeData || nodeData instanceof TargetFieldNodeData) {
      if (nodeData.mapping?.children.some((c) => c instanceof ChooseItem)) return;

      const createdFieldItem =
        nodeData instanceof TargetFieldNodeData ? MappingActionService.getOrCreateFieldItem(nodeData) : undefined;
      const mapping = nodeData.mapping ?? createdFieldItem;
      if (!mapping) return;
      MappingService.wrapWithChooseWhenOtherwise(mapping);
    }
  }

  /**
   * Appends a new {@link WhenItem} to the {@link ChooseItem} mapping of the node.
   * For "inner" choose structures (where choose is inside a FieldItem with the same field),
   * does not pass the field to avoid creating duplicate field elements.
   * @param nodeData - The target node whose mapping is a `ChooseItem`.
   */
  static applyWhen(nodeData: TargetNodeData) {
    const chooseItem = nodeData.mapping as ChooseItem;
    // Check if this is an "inner" choose by checking if any ancestor FieldItem has the same field
    const isInnerChoose = MappingActionService.isInnerChoose(chooseItem);
    // For inner choose, don't pass the field to avoid creating duplicate field elements
    MappingService.addWhen(chooseItem, undefined, isInnerChoose ? undefined : chooseItem.field);
  }

  /**
   * Sets the {@link OtherwiseItem} on the {@link ChooseItem} mapping of the node.
   * For "inner" choose structures (where choose is inside a FieldItem with the same field),
   * does not pass the field to avoid creating duplicate field elements.
   * @param nodeData - The target node whose mapping is a `ChooseItem`.
   */
  static applyOtherwise(nodeData: TargetNodeData) {
    const chooseItem = nodeData.mapping as ChooseItem;
    // Check if this is an "inner" choose by checking if any ancestor FieldItem has the same field
    const isInnerChoose = MappingActionService.isInnerChoose(chooseItem);
    // For inner choose, don't pass the field to avoid creating duplicate field elements
    MappingService.addOtherwise(chooseItem, undefined, isInnerChoose ? undefined : chooseItem.field);
  }

  /**
   * Checks if a ChooseItem is an "inner" choose by looking up the ancestor tree
   * to find a FieldItem with the same field. This handles cases where the choose
   * is nested inside other instructions like ForEachItem or ForEachGroupItem.
   * @param chooseItem - The choose item to check
   * @returns true if this is an inner choose, false otherwise
   */
  private static isInnerChoose(chooseItem: ChooseItem): boolean {
    if (!chooseItem.field) return false;

    // Walk up the parent tree to find a FieldItem with the same field
    let current: MappingItem | MappingTree = chooseItem.parent;
    while (!(current instanceof MappingTree)) {
      if (current instanceof FieldItem && current.field === chooseItem.field) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Wraps the target field's mapping item with a {@link ForEachItem}.
   * Creates the field item first if it does not yet exist.
   * @param nodeData - The target field node to wrap.
   */
  static applyForEach(nodeData: ForEachCapableNodeData) {
    const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
    MappingService.wrapWithForEach(fieldItem);
  }

  /**
   * Wraps the target field's mapping item with a {@link ForEachGroupItem}.
   * Creates the field item first if it does not yet exist.
   * @param nodeData - The target field node to wrap.
   */
  static applyForEachGroup(nodeData: ForEachCapableNodeData) {
    const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
    MappingService.wrapWithForEachGroup(fieldItem);
  }

  /**
   * Wraps the target field with a {@link ForEachItem} whose select expression is `current-group()`.
   * Only meaningful inside a `for-each-group` context.
   * @param nodeData - The target field node to wrap.
   */
  static applyForEachCurrentGroup(nodeData: ForEachCapableNodeData) {
    const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
    MappingService.wrapWithForEach(fieldItem);
    const forEachItem = fieldItem.parent;
    if (forEachItem instanceof ForEachItem) {
      forEachItem.expression = 'current-group()';
    }
  }

  /**
   * Adds a {@link ForEachItem} as a child inside the target field's mapping item or inside an existing for-each.
   * This creates an "inner" for-each where the for-each is nested
   * inside the field element rather than wrapping it.
   * Creates the field item first if it does not yet exist.
   * @param nodeData - The target field node or for-each node to add the inner for-each to.
   */
  static applyInnerForEach(nodeData: ForEachCapableNodeData | TargetNodeData) {
    // If applying to a ForEachItem or ForEachGroupItem node, use the mapping directly
    if (VisualizationUtilService.isMappingNode(nodeData)) {
      const mapping = (nodeData as MappingNodeData).mapping;
      if (mapping instanceof ForEachItem || mapping instanceof ForEachGroupItem) {
        MappingService.addInnerForEach(mapping);
        return;
      }
    }

    // Otherwise, get or create the field item
    const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
    MappingService.addInnerForEach(fieldItem);
  }

  /**
   * Adds a {@link ForEachGroupItem} as a child inside the target field's mapping item or inside an existing for-each/for-each-group.
   * Creates the field item first if it does not yet exist.
   * @param nodeData - The target field node or for-each node to add the inner for-each-group to.
   */
  static applyInnerForEachGroup(nodeData: ForEachCapableNodeData | TargetNodeData) {
    if (VisualizationUtilService.isMappingNode(nodeData)) {
      const mapping = (nodeData as MappingNodeData).mapping;
      if (mapping instanceof ForEachItem || mapping instanceof ForEachGroupItem) {
        MappingService.addInnerForEachGroup(mapping);
        return;
      }
    }

    const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
    MappingService.addInnerForEachGroup(fieldItem);
  }

  /**
   * Adds an inner {@link ForEachItem} with `current-group()` as its select expression.
   * Only meaningful inside a `for-each-group` context.
   * @param nodeData - The target node to add the inner for-each current-group() to.
   */
  static applyInnerForEachCurrentGroup(nodeData: ForEachCapableNodeData | TargetNodeData) {
    if (VisualizationUtilService.isMappingNode(nodeData)) {
      const mapping = (nodeData as MappingNodeData).mapping;
      if (mapping instanceof ForEachItem || mapping instanceof ForEachGroupItem) {
        MappingService.addInnerForEach(mapping).expression = 'current-group()';
        return;
      }
    }

    const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
    MappingService.addInnerForEach(fieldItem).expression = 'current-group()';
  }

  static applyInnerChooseWhenOtherwise(nodeData: TargetNodeData) {
    const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
    const field = fieldItem instanceof FieldItem ? fieldItem.field : undefined;
    MappingService.addInnerChooseWhenOtherwise(fieldItem, field);
  }

  /**
   * Adds an {@link IfItem} as a child inside the target field's mapping item or inside an existing if.
   * This creates an "inner" if where the if structure is nested
   * inside the field element rather than wrapping it.
   * Creates the field item first if it does not yet exist.
   * @param nodeData - The target field node or if node to add the inner if to.
   */
  static applyInnerIf(nodeData: TargetNodeData) {
    // If applying to an IfItem node, use the mapping directly
    if (VisualizationUtilService.isMappingNode(nodeData)) {
      const mapping = nodeData.mapping;
      if (mapping instanceof IfItem) {
        MappingService.addInnerIf(mapping);
        return;
      }
    }

    // Otherwise, get or create the field item
    const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
    MappingService.addInnerIf(fieldItem);
  }

  /**
   * Adds a {@link ValueSelector} child to the node's mapping.
   * Creates the underlying field item first if the node is a {@link TargetFieldNodeData} without a mapping.
   * No-op if a `ValueSelector` already exists.
   * @param nodeData - The target node to add the value selector to.
   */
  static applyValueSelector(nodeData: TargetNodeData) {
    const mapping =
      nodeData instanceof TargetFieldNodeData && !nodeData.mapping
        ? MappingActionService.getOrCreateFieldItem(nodeData)
        : nodeData.mapping;
    if (!mapping) return;
    if (!mapping.children.some((c: MappingItem) => c instanceof ValueSelector)) {
      const valueSelector = MappingService.createValueSelector(mapping);
      mapping.children.push(valueSelector);
      useDocumentTreeStore.getState().requestXPathInputFocus(mapping.nodePath.toString());
    }
  }

  static applyValueOfSelector(nodeData: TargetNodeData) {
    const mapping =
      nodeData instanceof TargetFieldNodeData && !nodeData.mapping
        ? MappingActionService.getOrCreateFieldItem(nodeData)
        : nodeData.mapping;
    if (!mapping) return;
    const hasExisting = mapping.children.some(
      (c) => c instanceof ValueSelector && (c.valueType === ValueType.VALUE || c.valueType === ValueType.ATTRIBUTE),
    );
    if (hasExisting) return;
    const valueType =
      nodeData instanceof TargetFieldNodeData && nodeData.field.isAttribute ? ValueType.ATTRIBUTE : ValueType.VALUE;
    const valueSelector = new ValueSelector(mapping, valueType);
    mapping.children.push(valueSelector);
    useDocumentTreeStore.getState().requestXPathInputFocus(mapping.nodePath.toString());
  }

  static applyCopyOfSelector(nodeData: TargetNodeData) {
    const mapping =
      nodeData instanceof TargetFieldNodeData && !nodeData.mapping
        ? MappingActionService.getOrCreateFieldItem(nodeData)
        : nodeData.mapping;
    if (!mapping) return;
    const copyOfSelector = new ValueSelector(mapping, ValueType.CONTAINER_NODE);
    mapping.children.push(copyOfSelector);
    useDocumentTreeStore.getState().requestXPathInputFocus(mapping.nodePath.toString());
  }

  /**
   * Creates a mapping connection from a source node to a target node in the mapping tree.
   * Handles choice-to-field mappings (auto-generating choose/when/otherwise) as well as
   * field-to-field, field-to-condition, and field-to-document mappings.
   * @param mappingTree - The root mapping tree.
   * @param sourceNode - The source node being mapped from.
   * @param targetNode - The target node being mapped to.
   */
  static engageMapping(mappingTree: MappingTree, sourceNode: SourceNodeDataType, targetNode: TargetNodeData) {
    if (sourceNode instanceof SourceVariableNodeData) {
      MappingActionService.engageVariableMapping(sourceNode, targetNode, mappingTree);
      return;
    }

    const sourceField = 'document' in sourceNode ? (sourceNode.document as PrimitiveDocument) : sourceNode.field;

    if (sourceNode instanceof ChoiceFieldNodeData && VisualizationUtilService.isFieldNode(targetNode)) {
      MappingActionService.engageChoiceMapping(sourceNode, targetNode, sourceField);
      return;
    }

    if (MappingActionService.tryEngageContainerMapping(sourceNode, targetNode)) return;

    if (VisualizationUtilService.isFieldNode(targetNode)) {
      const item = MappingActionService.getOrCreateFieldItem(targetNode);
      MappingActionService.removeParentContainerCopyOf(item);
      MappingService.mapToField(sourceField, item);
    } else if (targetNode instanceof MappingNodeData) {
      MappingService.mapToCondition(targetNode.mapping, sourceField);
    } else if (targetNode instanceof TargetDocumentNodeData) {
      MappingService.mapToDocument(mappingTree, sourceField);
    }
  }

  private static engageVariableMapping(
    sourceNode: SourceVariableNodeData,
    targetNode: TargetNodeData,
    mappingTree: MappingTree,
  ) {
    // TODO(#2362-content-form): CONTAINER for condition/document targets not yet handled
    const valueType = sourceNode.variable.children.length > 0 ? ValueType.CONTAINER : ValueType.VALUE;
    const pathExpr = MappingService.variablePathExpression(sourceNode.variable.name);
    const target = MappingActionService.resolveTarget(targetNode, mappingTree);
    if (target) MappingService.applyMapping(pathExpr, target, valueType);
  }

  private static engageChoiceMapping(
    sourceNode: ChoiceFieldNodeData,
    targetNode: TargetFieldNodeData | FieldItemNodeData,
    sourceField: IField,
  ) {
    if (sourceNode.choiceField) {
      const item = MappingActionService.getOrCreateFieldItem(targetNode);
      MappingService.mapToField(sourceField, item);
    } else if (
      VisualizationUtilService.isCollectionField(sourceNode) &&
      VisualizationUtilService.isCollectionField(targetNode)
    ) {
      MappingActionService.createForEachWithChooseFromChoice(sourceNode.field, targetNode);
    } else {
      MappingActionService.createChooseFromChoice(sourceNode.field, targetNode);
    }
  }

  /**
   * Creates a new {@link FieldItem} mapping for an {@link AddMappingNodeData} placeholder node.
   * This is used when the user explicitly adds an additional mapping for a collection field.
   * @param nodeData - The placeholder node representing the "add mapping" action.
   */
  static addMapping(nodeData: AddMappingNodeData) {
    MappingActionService.createUserFieldItem(nodeData.parent, nodeData.field);
  }

  /**
   * Duplicates an {@link IfItem}, preserving child field mappings and value selectors
   * but clearing the condition expression. Sibling conditionals must have different
   * conditions — forcing the user to enter a new one prevents copy-paste errors and
   * matches XSLT best practices for conditional branching.
   */
  static duplicateIf(nodeData: TargetNodeData): void {
    const ifItem = nodeData.mapping as IfItem;
    const parent = ifItem.parent;
    const cloned = ifItem.clone() as IfItem;
    cloned.parent = parent;
    cloned.expression = '';
    const index = parent.children.indexOf(ifItem);
    parent.children.splice(index + 1, 0, cloned);
  }

  static duplicateFieldNode(nodeData: FieldItemNodeData | TargetFieldNodeData): void {
    MappingActionService.createUserFieldItem(nodeData.parent, nodeData.field);
  }

  private static createUserFieldItem(parent: TargetNodeData, field: IField): FieldItem {
    const parentItem = MappingActionService.getOrCreateFieldItem(parent);
    const fieldItem = MappingService.createFieldItem(parentItem, field);
    fieldItem.isUserCreated = true;
    return fieldItem;
  }

  static getOrCreateParentMapping(nodeData: TargetNodeData): MappingParentType | undefined {
    if (nodeData instanceof TargetDocumentNodeData) return nodeData.mappingTree;
    if (
      nodeData instanceof AddMappingNodeData ||
      nodeData instanceof TargetFieldNodeData ||
      nodeData instanceof FieldItemNodeData
    ) {
      return MappingActionService.getOrCreateFieldItem(nodeData);
    }
    if (nodeData instanceof MappingNodeData) return nodeData.mapping;
    return undefined;
  }

  private static tryEngageContainerMapping(sourceNode: SourceNodeDataType, targetNode: TargetNodeData): boolean {
    if (
      !('field' in sourceNode) ||
      !sourceNode.field ||
      !(targetNode instanceof TargetFieldNodeData || targetNode instanceof FieldItemNodeData)
    ) {
      return false;
    }
    const sourceFieldFromNode = sourceNode.field;
    const targetFieldFromNode = targetNode.field;
    const sourceHasChildren = DocumentService.hasChildren(sourceFieldFromNode);
    const targetHasChildren = DocumentService.hasChildren(targetFieldFromNode);
    const anyTypeInvolved = sourceFieldFromNode.type === Types.AnyType || targetFieldFromNode.type === Types.AnyType;

    if (!sourceHasChildren && !targetHasChildren && !anyTypeInvolved) {
      return false;
    }

    if (anyTypeInvolved && (!sourceHasChildren || !targetHasChildren)) {
      const item = MappingActionService.getOrCreateFieldItem(targetNode);
      MappingService.mapToFieldWithValueType(sourceFieldFromNode, item, ValueType.CONTAINER_NODE);
      return true;
    }

    if (!sourceHasChildren || !targetHasChildren) {
      return false;
    }

    const item = MappingActionService.getOrCreateFieldItem(targetNode);
    const bothCollections =
      VisualizationUtilService.isCollectionField(sourceNode) && VisualizationUtilService.isCollectionField(targetNode);

    if (bothCollections) {
      const guardResult = MappingActionService.guardExistingForEach(item);
      if (guardResult !== undefined) return guardResult;

      MappingActionService.createCollectionForEach(item, sourceFieldFromNode, targetFieldFromNode);
    } else {
      MappingService.applyContainerMapping(sourceFieldFromNode, targetFieldFromNode, item);
    }
    return true;
  }

  /**
   * Checks whether a container auto-mapping ForEachItem already exists for this target field.
   * Returns `true` (handled), `false` (defer to regular mapping), or `undefined` (proceed with auto-mapping).
   */
  private static guardExistingForEach(item: MappingItem): boolean | undefined {
    if (item.children.some((c) => c instanceof ForEachItem)) return true;
    if (item.parent instanceof ForEachItem) return false;
    if (item.parent.children.some((c) => c !== item && c instanceof ForEachItem)) {
      const idx = item.parent.children.indexOf(item);
      if (idx !== -1) item.parent.children.splice(idx, 1);
      return true;
    }
    return undefined;
  }

  private static createCollectionForEach(item: MappingItem, sourceField: IField, targetField: IField): void {
    const parentOfItem = item.parent;
    const index = parentOfItem.children.indexOf(item);
    if (index !== -1) parentOfItem.children.splice(index, 1);

    const forEachItem = new ForEachItem(parentOfItem);
    MappingService.mapToCondition(forEachItem, sourceField);

    const innerFieldItem = MappingService.createFieldItem(forEachItem, targetField);
    if (FieldMatchingService.canUseCopyOf(sourceField, targetField)) {
      const valueType = MappingService.getContainerValueType(sourceField, targetField);
      MappingService.mapToFieldWithValueType(sourceField, innerFieldItem, valueType);
    } else {
      MappingService.generateAutoChildMappings(sourceField, targetField, innerFieldItem);
    }

    parentOfItem.children.push(forEachItem);
  }

  private static createChooseFromChoice(sourceField: IField, targetNode: TargetNodeData) {
    const targetItem = MappingActionService.getOrCreateFieldItem(targetNode);
    if (targetItem.children.some((c) => c instanceof ChooseItem)) return;
    targetItem.children = targetItem.children.filter((c) => !(c instanceof ValueSelector));

    const chooseItem = MappingActionService.buildChooseFromChoiceMembers(targetItem, sourceField, targetItem);
    targetItem.children.push(chooseItem);
  }

  private static createForEachWithChooseFromChoice(sourceField: IField, targetNode: TargetNodeData) {
    const targetItem = MappingActionService.getOrCreateFieldItem(targetNode);
    if (targetItem.children.some((c) => c instanceof ForEachItem)) return;
    targetItem.children = targetItem.children.filter((c) => !(c instanceof ValueSelector));

    const forEachItem = new ForEachItem(targetItem);
    MappingService.mapToCondition(forEachItem, sourceField);

    const chooseItem = MappingActionService.buildChooseFromChoiceMembers(forEachItem, sourceField, targetItem);
    forEachItem.children.push(chooseItem);
    targetItem.children.push(forEachItem);
  }

  private static buildChooseFromChoiceMembers(
    parent: MappingItem,
    sourceField: IField,
    targetItem: MappingItem,
  ): ChooseItem {
    const chooseItem = new ChooseItem(parent, targetItem instanceof FieldItem ? targetItem.field : undefined);
    for (const member of sourceField.fields ?? []) {
      const whenItem = MappingService.addWhen(chooseItem);
      MappingService.mapToCondition(whenItem, member);
      MappingService.mapToField(member, whenItem);
    }
    MappingService.addOtherwise(chooseItem);
    return chooseItem;
  }

  /**
   * Resolves the {@link MappingItem} or {@link MappingTree} that a target node maps to.
   * Used by {@link engageMapping} to decouple source-type dispatch from target-type dispatch.
   * Returns `undefined` for unhandled target types (e.g. unrecognized wrappers).
   */
  private static resolveTarget(
    targetNode: TargetNodeData,
    mappingTree: MappingTree,
  ): MappingItem | MappingTree | undefined {
    if (targetNode instanceof TargetDocumentNodeData) return mappingTree;
    if (targetNode instanceof TargetFieldNodeData || targetNode instanceof FieldItemNodeData) {
      return MappingActionService.getOrCreateFieldItem(targetNode);
    }
    if (targetNode instanceof MappingNodeData) return targetNode.mapping;
    return undefined;
  }

  /**
   * Ensures a {@link FieldItem} exists in the {@link MappingTree} for the given
   * visualization node, creating the full ancestor chain as needed.
   *
   * The visualization tree includes schema-structural nodes (xs:sequence,
   * unselected xs:choice/abstract wrappers) that have no XSLT element
   * counterpart. This method and {@link getOrCreateParentFieldItem} skip
   * those nodes so the mapping tree reflects only the actual XML output
   * structure. The split between the two methods exists because wrapper
   * skipping must only happen during ancestor resolution — the entry-point
   * node itself is always materialized (except xs:sequence, which is purely
   * structural at every level).
   */
  static getOrCreateFieldItem(nodeData: TargetNodeData): MappingItem {
    if (nodeData.mapping) return nodeData.mapping as MappingItem;
    const fieldNodeData = nodeData as TargetFieldNodeData;
    if (fieldNodeData instanceof TargetSequenceFieldNodeData) {
      return MappingActionService.getOrCreateParentFieldItem(fieldNodeData.parent);
    }
    const parentItem = MappingActionService.getOrCreateParentFieldItem(fieldNodeData.parent);
    return MappingService.createFieldItem(parentItem, fieldNodeData.field);
  }

  /**
   * Recursively resolves or creates ancestor {@link FieldItem}s for a node's
   * parent chain, skipping schema-structural nodes that produce no XML element:
   * unselected xs:choice wrappers, unselected abstract wrappers, and
   * xs:sequence containers.
   */
  private static getOrCreateParentFieldItem(nodeData: TargetNodeData): MappingItem {
    if (nodeData.mapping) return nodeData.mapping as MappingItem;
    const fieldNodeData = nodeData as TargetFieldNodeData;
    if (fieldNodeData instanceof TargetChoiceFieldNodeData && !fieldNodeData.choiceField) {
      return MappingActionService.getOrCreateParentFieldItem(fieldNodeData.parent);
    }
    if (fieldNodeData instanceof TargetAbstractFieldNodeData && !fieldNodeData.abstractField) {
      return MappingActionService.getOrCreateParentFieldItem(fieldNodeData.parent);
    }
    if (fieldNodeData instanceof TargetSequenceFieldNodeData) {
      return MappingActionService.getOrCreateParentFieldItem(fieldNodeData.parent);
    }
    const parentItem = MappingActionService.getOrCreateParentFieldItem(fieldNodeData.parent);
    return MappingService.createFieldItem(parentItem, fieldNodeData.field);
  }

  private static removeParentContainerCopyOf(item: MappingItem): void {
    const parent = item.parent;
    if (!(parent instanceof MappingItem)) return;
    parent.children = parent.children.filter(
      (c) => !(c instanceof ValueSelector && c.valueType === ValueType.CONTAINER),
    );
  }
}
