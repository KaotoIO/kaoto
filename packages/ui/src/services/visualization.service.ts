import xmlFormat from 'xml-formatter';

import { IField, PrimitiveDocument } from '../models/datamapper/document';
import {
  ChooseItem,
  FieldItem,
  ForEachItem,
  IExpressionHolder,
  IfItem,
  isExpressionHolder,
  MappingItem,
  MappingTree,
  OtherwiseItem,
  UnknownMappingItem,
  ValueSelector,
  VariableItem,
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
  UnknownMappingNodeData,
  VariableNodeData,
} from '../models/datamapper/visualization';
import { DocumentService } from './document.service';
import { DocumentUtilService } from './document-util.service';
import { MappingService } from './mapping.service';

// Regex patterns for DnD ID generation
const FORWARD_SLASH_REGEX = /\//g;
const COLON_REGEX = /:/g;

/**
 * Static utility service for the DataMapper visualization layer.
 *
 * Provides methods for generating {@link NodeData} hierarchies from document
 * and mapping models, inspecting node characteristics, and applying mapping
 * operations (if, forEach, choose/when/otherwise, value selectors).
 */
export class VisualizationService {
  /**
   * Dispatches to the correct child-generation strategy based on node type.
   * @param nodeData - The parent node whose children should be generated.
   * @returns An array of child {@link NodeData} instances.
   */
  static generateNodeDataChildren(nodeData: NodeData): NodeData[] {
    const isDocument = nodeData instanceof DocumentNodeData;
    const isPrimitive = nodeData.isPrimitive;

    if (isDocument && isPrimitive) {
      return VisualizationService.generatePrimitiveDocumentChildren(nodeData);
    }
    if (isDocument && !isPrimitive) {
      return VisualizationService.generateStructuredDocumentChildren(nodeData);
    }
    return VisualizationService.generateNonDocumentNodeDataChildren(nodeData);
  }

  /**
   * Returns {@link MappingNodeData} children for a primitive target document.
   * Only non-{@link ValueSelector} mapping children are included.
   * @param document - The primitive document node.
   * @returns An array of child {@link NodeData} instances, or an empty array if not applicable.
   */
  static generatePrimitiveDocumentChildren(document: DocumentNodeData): NodeData[] {
    if (!(document instanceof TargetDocumentNodeData) || !document.mapping?.children) return [];
    return document.mapping.children
      .filter((child) => !(child instanceof ValueSelector))
      .map((child) => VisualizationService.createNodeDataFromMappingItem(document, child));
  }

  /**
   * Returns field-based children for a structured (non-primitive) document node.
   * For target documents, existing mappings are correlated with document fields.
   * @param document - The structured document node.
   * @returns An array of child {@link NodeData} instances.
   */
  static generateStructuredDocumentChildren(document: DocumentNodeData): NodeData[] {
    return VisualizationService.doGenerateNodeDataFromFields(
      document,
      document.document.fields,
      document instanceof TargetDocumentNodeData ? document.mappingTree.children : undefined,
    );
  }

  /**
   * Creates a {@link ChoiceFieldNodeData} or {@link TargetChoiceFieldNodeData} for a choice wrapper field.
   *
   * When no member is selected (`field.selectedMemberIndex === undefined`), the returned node's
   * `field` is the choice wrapper itself and `choiceField` is `undefined`. {@link createNodeTitle}
   * recognises this state and returns the member label string (e.g. `"(email | phone)"`), while
   * {@link NodeTitle} renders it alongside a `<Label>choice</Label>` badge.
   *
   * When a member is selected, the returned node's `field` is the selected member and `choiceField`
   * is set to the choice wrapper. {@link createNodeTitle} returns the member's own display name in
   * that case, and {@link NodeTitle} renders it as a plain field title without the choice badge.
   */
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
    if (mappings) {
      let filterPriorityMappingItem = (m: MappingItem) => m instanceof UnknownMappingItem || m instanceof VariableItem;
      if (parent.isPrimitive) {
        filterPriorityMappingItem = (m: MappingItem) => m instanceof UnknownMappingItem || m instanceof ValueSelector;
      }
      for (const m of mappings.filter(filterPriorityMappingItem)) {
        answer.push(VisualizationService.createNodeDataFromMappingItem(parent as TargetNodeData, m));
      }
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
        for (const mapping of mappingsForField
          .filter((mapping) => !VisualizationService.isExistingMapping(acc as TargetNodeData[], mapping))
          .sort((left, right) => MappingService.sortMappingItem(left, right))) {
          acc.push(VisualizationService.createNodeDataFromMappingItem(parent as TargetNodeData, mapping));
        }
        if (DocumentService.isCollectionField(field)) {
          acc.push(new AddMappingNodeData(parent as TargetNodeData, field));
        }
      }
      return acc;
    }, answer);
  }

  private static isExistingMapping(nodes: TargetNodeData[], mapping: MappingItem) {
    return nodes.some((node) => 'mapping' in node && node.mapping === mapping);
  }

  private static resolveChoiceNodeFields(field: IField): IField[] {
    if (!field.isChoice) {
      DocumentUtilService.resolveTypeFragment(field);
      return field.fields;
    }
    const selectedMember =
      field.selectedMemberIndex === undefined ? undefined : field.fields?.[field.selectedMemberIndex];
    return selectedMember ? [field] : field.fields;
  }

  /**
   * Resolves mapping children for a choice wrapper node. Unselected target choice wrappers
   * have no mapping tree counterpart, so we walk up through any nested unselected choice
   * wrappers to find the nearest real ancestor that carries mapping children.
   */
  private static resolveChoiceNodeMappings(
    parent: ChoiceFieldNodeData | TargetChoiceFieldNodeData,
  ): MappingItem[] | undefined {
    if (!(parent instanceof TargetChoiceFieldNodeData) || parent.choiceField) {
      return 'mapping' in parent ? parent.mapping?.children : undefined;
    }
    let ancestor: TargetNodeData = parent.parent;
    while (ancestor instanceof TargetChoiceFieldNodeData && !ancestor.choiceField) {
      ancestor = ancestor.parent;
    }
    return ancestor.mapping?.children;
  }

  /**
   * Returns children for choice, field, and mapping nodes (i.e. non-document nodes).
   * Resolves type fragments for complex fields before generating children.
   * @param parent - The non-document parent node.
   * @returns An array of child {@link NodeData} instances.
   */
  static generateNonDocumentNodeDataChildren(parent: NodeData): NodeData[] {
    if (parent instanceof ChoiceFieldNodeData || parent instanceof TargetChoiceFieldNodeData) {
      return VisualizationService.doGenerateNodeDataFromFields(
        parent,
        VisualizationService.resolveChoiceNodeFields(parent.field),
        VisualizationService.resolveChoiceNodeMappings(parent),
      );
    }
    if (parent instanceof FieldNodeData || parent instanceof FieldItemNodeData) {
      DocumentUtilService.resolveTypeFragment(parent.field);
      return VisualizationService.doGenerateNodeDataFromFields(
        parent,
        parent.field.fields,
        'mapping' in parent ? parent.mapping?.children : undefined,
      );
    }
    if (parent instanceof MappingNodeData) {
      if (!parent.mapping?.children) return [];
      const sorted = [...parent.mapping.children].sort((left, right) => MappingService.sortMappingItem(left, right));
      return sorted.map((m) => VisualizationService.createNodeDataFromMappingItem(parent, m));
    }
    return [];
  }

  private static createNodeDataFromMappingItem(parent: TargetNodeData, mapping: MappingItem): MappingNodeData {
    if (mapping instanceof FieldItem) return new FieldItemNodeData(parent, mapping);
    if (mapping instanceof UnknownMappingItem) return new UnknownMappingNodeData(parent, mapping);
    if (mapping instanceof VariableItem) return new VariableNodeData(parent, mapping);
    return new MappingNodeData(parent, mapping);
  }

  /**
   * Returns `true` if the node is a {@link DocumentNodeData}.
   * @param nodeData - The node to test.
   */
  static isDocumentNode(nodeData: NodeData) {
    return nodeData instanceof DocumentNodeData;
  }

  /**
   * Returns `true` if the node wraps a {@link PrimitiveDocument}.
   * @param nodeData - The node to test.
   */
  static isPrimitiveDocumentNode(nodeData: NodeData) {
    return nodeData instanceof DocumentNodeData && nodeData.document instanceof PrimitiveDocument;
  }

  /**
   * Returns `true` if the node's field is a collection (array/repeating element).
   * @param nodeData - The node to test.
   */
  static isCollectionField(nodeData: NodeData) {
    return (
      (nodeData instanceof FieldNodeData || nodeData instanceof FieldItemNodeData) &&
      DocumentService.isCollectionField(nodeData.field)
    );
  }

  /**
   * Returns `true` if the node's field is an XML attribute.
   * @param nodeData - The node to test.
   */
  static isAttributeField(nodeData: NodeData) {
    return nodeData instanceof FieldNodeData && nodeData.field?.isAttribute;
  }

  static getField(nodeData: NodeData): IField | undefined {
    if (nodeData instanceof FieldNodeData || nodeData instanceof FieldItemNodeData) {
      return nodeData.field;
    }
    return undefined;
  }

  /**
   * Returns `true` if the node is a choice field (union/anyOf member selection), on either source or target side.
   * @param nodeData - The node to test.
   */
  static isChoiceField(nodeData: NodeData) {
    return nodeData instanceof ChoiceFieldNodeData || nodeData instanceof TargetChoiceFieldNodeData;
  }

  /**
   * Returns `true` if the node represents a recursive field reference (self-referencing type).
   * @param nodeData - The node to test.
   */
  static isRecursiveField(nodeData: NodeData) {
    return nodeData instanceof FieldNodeData && DocumentService.isRecursiveField(nodeData.field);
  }

  /**
   * Returns `true` if the node has renderable children in the visualization tree.
   * @param nodeData - The node to inspect.
   */
  static hasChildren(nodeData: NodeData) {
    if (nodeData instanceof DocumentNodeData) {
      if (DocumentService.hasFields(nodeData.document)) return true;
      const isPrimitiveDocument = nodeData instanceof TargetDocumentNodeData && nodeData.isPrimitive;
      const isPrimitiveDocumentWithConditionItem =
        isPrimitiveDocument && nodeData.mapping.children.some((m) => !(m instanceof ValueSelector));
      if (isPrimitiveDocumentWithConditionItem) return true;
    }
    if (nodeData instanceof FieldNodeData) return DocumentService.hasChildren(nodeData.field);
    if (nodeData instanceof FieldItemNodeData)
      return (
        DocumentService.hasChildren(nodeData.field) ||
        nodeData.mapping.children.some((m) => !(m instanceof ValueSelector))
      );
    if (nodeData instanceof MappingNodeData) return nodeData.mapping.children.length > 0;
    return false;
  }

  /**
   * Returns `true` if the node should be collapsed on initial render.
   * Document nodes are never collapsed; recursive fields and nodes beyond the expanded rank threshold are.
   * @param nodeData - The node to evaluate.
   * @param initialExpandedRank - The maximum depth rank that should be auto-expanded.
   * @param rank - The current depth rank of the node.
   */
  static shouldCollapseByDefault(nodeData: NodeData, initialExpandedRank: number, rank: number) {
    if (nodeData instanceof DocumentNodeData) return false;
    const isRecursiveField = VisualizationService.isRecursiveField(nodeData);
    return isRecursiveField || rank > initialExpandedRank;
  }

  /**
   * Returns `true` if an "if" or "choose" condition can be added to the node.
   * Nodes that are already `ValueSelector`, `WhenItem`, `OtherwiseItem`, `IfItem`, or `ChooseItem` mappings are excluded.
   * @param nodeData - The target node to evaluate.
   */
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

  /**
   * Returns `true` if a `forEach` wrapper can be applied to the node.
   * Applicable to {@link AddMappingNodeData} placeholders and collection field nodes.
   * @param nodeData - The target node to evaluate.
   */
  static allowForEach(nodeData: TargetNodeData) {
    return (
      nodeData instanceof AddMappingNodeData ||
      ((nodeData instanceof TargetFieldNodeData || nodeData instanceof FieldItemNodeData) &&
        VisualizationService.isCollectionField(nodeData))
    );
  }

  /**
   * Returns `true` if the node's mapping is a {@link ForEachItem}.
   * @param nodeData - The target node to test.
   */
  static isForEachNode(nodeData: TargetNodeData) {
    return nodeData instanceof MappingNodeData && nodeData.mapping instanceof ForEachItem;
  }

  /**
   * Returns `true` if the node's mapping is a {@link ValueSelector}.
   * @param nodeData - The target node to test.
   */
  static isValueSelectorNode(nodeData: TargetNodeData) {
    return nodeData instanceof MappingNodeData && nodeData.mapping instanceof ValueSelector;
  }

  /**
   * Returns `true` if the node's mapping is a {@link ChooseItem}.
   * @param nodeData - The target node to test.
   */
  static isChooseNode(nodeData: TargetNodeData) {
    return nodeData instanceof MappingNodeData && nodeData.mapping instanceof ChooseItem;
  }

  /**
   * Returns `true` if the mapping node can be removed from the mapping tree.
   * A node is deletable if it is a pure {@link MappingNodeData} (not a {@link FieldItemNodeData}),
   * or if it has an associated {@link ValueSelector} child.
   * @param nodeData - The target node to evaluate.
   */
  static isDeletableNode(nodeData: TargetNodeData) {
    if (nodeData instanceof MappingNodeData && !(nodeData instanceof FieldItemNodeData)) return true;
    return VisualizationService.getFieldValueSelector(nodeData) !== undefined;
  }

  /**
   * Returns the {@link IExpressionHolder} (or a {@link ValueSelector} child acting as one) associated with the node.
   * Returns `undefined` if the node has no mapping or no applicable expression item.
   * @param nodeData - The target node to inspect.
   */
  static getExpressionItemForNode(nodeData: TargetNodeData) {
    if (!nodeData.mapping) return;
    if (nodeData.mapping instanceof MappingItem && isExpressionHolder(nodeData.mapping)) return nodeData.mapping;
    return VisualizationService.getFieldValueSelector(nodeData);
  }

  private static getFieldValueSelector(nodeData: TargetNodeData) {
    if (nodeData.mapping instanceof FieldItem || nodeData.mapping instanceof MappingTree) {
      return nodeData.mapping.children.find((c) => c instanceof ValueSelector) as ValueSelector;
    }
  }

  /**
   * Returns `true` if the condition context menu should be shown for the node.
   * Hidden for nodes that are direct children of a `forEach` mapping, and for `when`/`otherwise`/`forEach` mappings.
   * @param nodeData - The target node to evaluate.
   */
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
      !(mappingNodeData.mapping instanceof ForEachItem) &&
      !(mappingNodeData.mapping instanceof UnknownMappingItem)
    );
  }

  /**
   * Returns `true` if a value selector can be added to the node.
   * Excluded for {@link AddMappingNodeData} placeholders, choose nodes, existing value selector nodes, and forEach nodes.
   * @param nodeData - The target node to evaluate.
   */
  static allowValueSelector(nodeData: TargetNodeData) {
    return (
      !(nodeData instanceof AddMappingNodeData) &&
      !(nodeData instanceof UnknownMappingNodeData) &&
      !VisualizationService.isChooseNode(nodeData) &&
      !VisualizationService.isValueSelectorNode(nodeData) &&
      !VisualizationService.isForEachNode(nodeData)
    );
  }

  /**
   * Returns `true` if the node's mapping already has a {@link ValueSelector} child.
   * @param nodeData - The target node to inspect.
   */
  static hasValueSelector(nodeData: TargetNodeData) {
    return nodeData.mapping?.children.some((c) => c instanceof ValueSelector) ?? false;
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
    } else if (nodeData instanceof MappingNodeData || nodeData instanceof TargetFieldNodeData) {
      const createdFieldItem =
        nodeData instanceof TargetFieldNodeData ? VisualizationService.getOrCreateFieldItem(nodeData) : undefined;
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
    } else if (nodeData instanceof MappingNodeData || nodeData instanceof TargetFieldNodeData) {
      if (nodeData.mapping?.children.some((c) => c instanceof ChooseItem)) return;

      const createdFieldItem =
        nodeData instanceof TargetFieldNodeData ? VisualizationService.getOrCreateFieldItem(nodeData) : undefined;
      const mapping = nodeData.mapping ?? createdFieldItem;
      if (!mapping) return;
      MappingService.wrapWithChooseWhenOtherwise(mapping);
    }
  }

  /**
   * Appends a new {@link WhenItem} to the {@link ChooseItem} mapping of the node.
   * @param nodeData - The target node whose mapping is a `ChooseItem`.
   */
  static applyWhen(nodeData: TargetNodeData) {
    const chooseItem = nodeData.mapping as ChooseItem;
    MappingService.addWhen(chooseItem, undefined, chooseItem.field);
  }

  /**
   * Sets the {@link OtherwiseItem} on the {@link ChooseItem} mapping of the node.
   * @param nodeData - The target node whose mapping is a `ChooseItem`.
   */
  static applyOtherwise(nodeData: TargetNodeData) {
    const chooseItem = nodeData.mapping as ChooseItem;
    MappingService.addOtherwise(chooseItem, undefined, chooseItem.field);
  }

  /**
   * Wraps the target field's mapping item with a {@link ForEachItem}.
   * Creates the field item first if it does not yet exist.
   * @param nodeData - The target field node to wrap.
   */
  static applyForEach(nodeData: TargetFieldNodeData) {
    const fieldItem = VisualizationService.getOrCreateFieldItem(nodeData);
    MappingService.wrapWithForEach(fieldItem);
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
        ? VisualizationService.getOrCreateFieldItem(nodeData)
        : nodeData.mapping;
    if (!mapping) return;
    if (!mapping.children.some((c: MappingItem) => c instanceof ValueSelector)) {
      const valueSelector = MappingService.createValueSelector(mapping);
      mapping.children.push(valueSelector);
    }
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
    const sourceField = 'document' in sourceNode ? (sourceNode.document as PrimitiveDocument) : sourceNode.field;

    if (
      sourceNode instanceof ChoiceFieldNodeData &&
      (targetNode instanceof TargetFieldNodeData || targetNode instanceof FieldItemNodeData)
    ) {
      if (sourceNode.choiceField) {
        const item = VisualizationService.getOrCreateFieldItem(targetNode);
        MappingService.mapToField(sourceNode.field, item);
      } else {
        VisualizationService.createChooseFromChoice(sourceNode.field, targetNode);
      }
      return;
    }

    if (targetNode instanceof TargetFieldNodeData || targetNode instanceof FieldItemNodeData) {
      const item = VisualizationService.getOrCreateFieldItem(targetNode);
      MappingService.mapToField(sourceField, item);
    } else if (targetNode instanceof MappingNodeData) {
      MappingService.mapToCondition(targetNode.mapping, sourceField);
    } else if (targetNode instanceof TargetDocumentNodeData) {
      MappingService.mapToDocument(mappingTree, sourceField);
    }
  }

  private static createChooseFromChoice(sourceField: IField, targetNode: TargetNodeData) {
    const targetItem = VisualizationService.getOrCreateFieldItem(targetNode);
    if (targetItem.children.some((c) => c instanceof ChooseItem)) return;
    targetItem.children = targetItem.children.filter((c) => !(c instanceof ValueSelector));
    const chooseItem = new ChooseItem(targetItem);

    for (const member of sourceField.fields ?? []) {
      const whenItem = MappingService.addWhen(chooseItem);
      MappingService.mapToCondition(whenItem, member);
      MappingService.mapToField(member, whenItem);
    }

    MappingService.addOtherwise(chooseItem);
    targetItem.children.push(chooseItem);
  }

  private static getOrCreateFieldItem(nodeData: TargetNodeData): MappingItem {
    if (nodeData.mapping) return nodeData.mapping as MappingItem;
    const fieldNodeData = nodeData as TargetFieldNodeData;
    // Skip unselected choice wrappers — they are artificial document nodes with no
    // mapping tree counterpart. Go straight to their parent so the FieldItem is
    // created at the correct mapping tree level.
    if (fieldNodeData instanceof TargetChoiceFieldNodeData && !fieldNodeData.choiceField) {
      return VisualizationService.getOrCreateFieldItem(fieldNodeData.parent);
    }
    const parentItem = VisualizationService.getOrCreateFieldItem(fieldNodeData.parent);
    return MappingService.createFieldItem(parentItem, fieldNodeData.field);
  }

  static formatXml(element: Element): string {
    const rawXml = new XMLSerializer().serializeToString(element);
    try {
      return xmlFormat(rawXml);
    } catch {
      return rawXml;
    }
  }

  /**
   * Returns the member label string (e.g. `"(email | phone | fax)"`) for a choice wrapper node.
   * Nested choice members are labeled `'choice'` when there is only one nested choice sibling,
   * or `'choice1'`, `'choice2'`, ... when there are multiple.
   * @param node - The choice wrapper node whose members should be described.
   */
  static getChoiceMemberLabel(node: ChoiceFieldNodeData | TargetChoiceFieldNodeData): string {
    const members = node.field.fields ?? [];
    const nestedChoiceCount = members.filter((m) => m.isChoice).length;
    let choiceIndex = 0;
    const labels = members.map((m) => {
      if (!m.isChoice) return m.displayName ?? m.name;
      return nestedChoiceCount > 1 ? `choice${++choiceIndex}` : 'choice';
    });
    if (labels.length === 0) return '(empty)';
    const maxVisible = 3;
    if (labels.length > maxVisible) {
      return `(${labels.slice(0, maxVisible).join(' | ')} | +${labels.length - maxVisible} more)`;
    }
    return `(${labels.join(' | ')})`;
  }

  /**
   * Returns the display title for a node, delegating to {@link getChoiceMemberLabel} for
   * unselected choice wrapper nodes so the member list is rendered separately from the label.
   * @param nodeData - The node whose title should be resolved.
   */
  static createNodeTitle(nodeData: NodeData): string {
    if (
      (nodeData instanceof ChoiceFieldNodeData || nodeData instanceof TargetChoiceFieldNodeData) &&
      !nodeData.choiceField
    ) {
      return VisualizationService.getChoiceMemberLabel(nodeData);
    }
    return nodeData.title;
  }

  /**
   * Generates a stable drag-and-drop identifier string for a node.
   * Document nodes use their `id`; field nodes derive the ID from their path with `/` and `:` replaced by `-`.
   * @param nodeData - The node for which to generate the DnD ID.
   * @returns A string identifier unique within the current document side (source vs target).
   */
  static generateDndId(nodeData: NodeData) {
    // Use full path with documentType to ensure unique IDs between source and target
    return nodeData instanceof DocumentNodeData
      ? nodeData.id
      : nodeData.path.toString().replace(FORWARD_SLASH_REGEX, '-').replace(COLON_REGEX, '-');
  }

  /**
   * Creates a new {@link FieldItem} mapping for an {@link AddMappingNodeData} placeholder node.
   * This is used when the user explicitly adds an additional mapping for a collection field.
   * @param nodeData - The placeholder node representing the "add mapping" action.
   */
  static addMapping(nodeData: AddMappingNodeData) {
    const parentItem = VisualizationService.getOrCreateFieldItem(nodeData.parent);
    MappingService.createFieldItem(parentItem, nodeData.field);
  }
}
