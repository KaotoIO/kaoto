import { IField, PrimitiveDocument } from '../../models/datamapper/document';
import {
  ChooseItem,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingItem,
  MappingTree,
  OtherwiseItem,
  UnknownMappingItem,
  ValueSelector,
  WhenItem,
} from '../../models/datamapper/mapping';
import { IMappingAction, IMappingContextMenuAction, MappingActionKind } from '../../models/datamapper/mapping-action';
import {
  AddMappingNodeData,
  ChoiceFieldNodeData,
  FieldItemNodeData,
  MappingNodeData,
  SourceNodeDataType,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { MappingService } from '../mapping/mapping.service';
import { VisualizationUtilService } from './visualization-util.service';

/**
 * Static service for mapping mutations and the action registry in the
 * DataMapper visualization layer.
 *
 * Owns every operation that modifies the {@link MappingTree} — applying
 * conditions (`if`, `choose/when/otherwise`, `for-each`), engaging and
 * deleting mappings, and adding value selectors — as well as the
 * registry-based capability checks that determine which actions are
 * available for a given target node.
 *
 * Depends on {@link MappingService} for low-level mapping tree manipulation
 * and on {@link VisualizationUtilService} for node-type inspection,
 * but has no dependency on {@link VisualizationService}.
 */
export class MappingActionService {
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
  static applyForEach(nodeData: TargetFieldNodeData | FieldItemNodeData | AddMappingNodeData) {
    const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
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
        ? MappingActionService.getOrCreateFieldItem(nodeData)
        : nodeData.mapping;
    if (!mapping) return;
    if (!mapping.children.some((c: MappingItem) => c instanceof ValueSelector)) {
      const valueSelector = MappingService.createValueSelector(mapping);
      mapping.children.push(valueSelector);
      useDocumentTreeStore.getState().requestXPathInputFocus(mapping.nodePath.toString());
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
        const item = MappingActionService.getOrCreateFieldItem(targetNode);
        MappingService.mapToField(sourceNode.field, item);
      } else {
        MappingActionService.createChooseFromChoice(sourceNode.field, targetNode);
      }
      return;
    }

    if (targetNode instanceof TargetFieldNodeData || targetNode instanceof FieldItemNodeData) {
      const item = MappingActionService.getOrCreateFieldItem(targetNode);
      MappingService.mapToField(sourceField, item);
    } else if (targetNode instanceof MappingNodeData) {
      MappingService.mapToCondition(targetNode.mapping, sourceField);
    } else if (targetNode instanceof TargetDocumentNodeData) {
      MappingService.mapToDocument(mappingTree, sourceField);
    }
  }

  /**
   * Creates a new {@link FieldItem} mapping for an {@link AddMappingNodeData} placeholder node.
   * This is used when the user explicitly adds an additional mapping for a collection field.
   * @param nodeData - The placeholder node representing the "add mapping" action.
   */
  static addMapping(nodeData: AddMappingNodeData) {
    const parentItem = MappingActionService.getOrCreateFieldItem(nodeData.parent);
    MappingService.createFieldItem(parentItem, nodeData.field);
  }

  private static createChooseFromChoice(sourceField: IField, targetNode: TargetNodeData) {
    const targetItem = MappingActionService.getOrCreateFieldItem(targetNode);
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
    if (fieldNodeData instanceof TargetChoiceFieldNodeData && !fieldNodeData.choiceField) {
      return MappingActionService.getOrCreateFieldItem(fieldNodeData.parent);
    }
    if (fieldNodeData instanceof TargetAbstractFieldNodeData && !fieldNodeData.abstractField) {
      return MappingActionService.getOrCreateFieldItem(fieldNodeData.parent);
    }
    const parentItem = MappingActionService.getOrCreateFieldItem(fieldNodeData.parent);
    return MappingService.createFieldItem(parentItem, fieldNodeData.field);
  }

  private static isFieldNode(n: TargetNodeData): n is FieldItemNodeData | TargetFieldNodeData {
    return n instanceof FieldItemNodeData || n instanceof TargetFieldNodeData;
  }

  private static isMappingNode(n: TargetNodeData): n is MappingNodeData {
    return n instanceof MappingNodeData;
  }

  private static mappingIsOneOf(...types: Array<abstract new (...args: never[]) => MappingItem>) {
    return (n: TargetNodeData): boolean =>
      MappingActionService.isMappingNode(n) && types.some((t) => n.mapping instanceof t);
  }

  private static isFieldInsideForEach(n: TargetNodeData): boolean {
    return (
      MappingActionService.isFieldNode(n) &&
      n.parent instanceof MappingNodeData &&
      n.parent.mapping instanceof ForEachItem
    );
  }

  private static isContextMenuAction(def: IMappingAction): def is IMappingContextMenuAction {
    return 'getLabel' in def;
  }

  private static readonly ACTION_REGISTRY: (IMappingAction | IMappingContextMenuAction)[] = [
    {
      key: MappingActionKind.ContextMenu,
      isAllowed: (n) => {
        if (n instanceof AddMappingNodeData || n instanceof TargetDocumentNodeData) return true;
        if (MappingActionService.isFieldNode(n)) return !MappingActionService.isFieldInsideForEach(n);
        return (
          MappingActionService.isMappingNode(n) &&
          !MappingActionService.mappingIsOneOf(
            ValueSelector,
            WhenItem,
            OtherwiseItem,
            ForEachItem,
            UnknownMappingItem,
          )(n)
        );
      },
    },
    {
      key: MappingActionKind.Delete,
      isAllowed: (n) => {
        if (n instanceof AddMappingNodeData) return false;
        if (MappingActionService.isFieldNode(n) || n instanceof TargetDocumentNodeData)
          return MappingActionService.hasValueSelector(n);
        return MappingActionService.isMappingNode(n);
      },
    },
    {
      key: MappingActionKind.Comment,
      testId: 'transformation-actions-comment',
      getLabel: (n) => (n.mapping instanceof MappingItem && n.mapping.comment ? 'Edit Comment' : 'Add Comment'),
      apply: (_n, { openModal }) => openModal(MappingActionKind.Comment),
      isAllowed: (n) => n.mapping instanceof MappingItem,
    },
    {
      key: MappingActionKind.ValueSelector,
      testId: 'transformation-actions-selector',
      getLabel: () => 'Add selector expression',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyValueSelector(n);
        onUpdate();
      },
      isAllowed: (n) => {
        if (n instanceof AddMappingNodeData) return false;
        if (!MappingActionService.isMappingNode(n)) return true;
        return !MappingActionService.mappingIsOneOf(ValueSelector, ForEachItem, ChooseItem, UnknownMappingItem)(n);
      },
      isDisabled: (n) => MappingActionService.hasValueSelector(n),
    },
    {
      key: MappingActionKind.When,
      testId: 'transformation-actions-when',
      getLabel: () => 'Add "when"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyWhen(n);
        onUpdate();
      },
      isAllowed: MappingActionService.mappingIsOneOf(ChooseItem),
    },
    {
      key: MappingActionKind.Otherwise,
      testId: 'transformation-actions-otherwise',
      getLabel: () => 'Add "otherwise"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyOtherwise(n);
        onUpdate();
      },
      isAllowed: (n) =>
        MappingActionService.isMappingNode(n) && n.mapping instanceof ChooseItem && !n.mapping.otherwise,
    },
    {
      key: MappingActionKind.ForEach,
      testId: 'transformation-actions-foreach',
      getLabel: () => 'Wrap with "for-each"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyForEach(n as TargetFieldNodeData | FieldItemNodeData | AddMappingNodeData);
        onUpdate();
      },
      isAllowed: (n) =>
        n instanceof AddMappingNodeData ||
        (MappingActionService.isFieldNode(n) && VisualizationUtilService.isCollectionField(n)),
    },
    {
      key: MappingActionKind.If,
      testId: 'transformation-actions-if',
      getLabel: () => 'Wrap with "if"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyIf(n);
        onUpdate();
      },
      isAllowed: (n) =>
        !MappingActionService.isMappingNode(n) ||
        !MappingActionService.mappingIsOneOf(ValueSelector, WhenItem, OtherwiseItem, IfItem, ChooseItem)(n),
    },
    {
      key: MappingActionKind.Choose,
      testId: 'transformation-actions-choose',
      getLabel: () => 'Wrap with "choose-when-otherwise"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyChooseWhenOtherwise(n);
        onUpdate();
      },
      isAllowed: (n) =>
        !MappingActionService.isMappingNode(n) ||
        !MappingActionService.mappingIsOneOf(ValueSelector, WhenItem, OtherwiseItem, IfItem, ChooseItem)(n),
    },
  ];

  /**
   * Returns the set of {@link MappingActionKind} values permitted for the given
   * target node. Callers should convert the result to a `Set` for O(1) membership
   * tests when rendering multiple action controls.
   *
   * @param nodeData - The target node whose capabilities are evaluated.
   * @returns An array of allowed action identifiers for this node.
   */
  static getAllowedActions(nodeData: TargetNodeData): MappingActionKind[] {
    return MappingActionService.ACTION_REGISTRY.filter((def) => def.isAllowed(nodeData)).map((def) => def.key);
  }

  /**
   * Returns the context menu action definitions that are allowed for the given
   * target node. Each returned entry carries its label, testId, and apply callback.
   *
   * @param nodeData - The target node whose menu items are evaluated.
   * @returns An array of allowed context menu action definitions.
   */
  static getMappingContextMenuItems(nodeData: TargetNodeData): IMappingContextMenuAction[] {
    return MappingActionService.ACTION_REGISTRY.filter(
      (def): def is IMappingContextMenuAction =>
        MappingActionService.isContextMenuAction(def) && def.isAllowed(nodeData),
    );
  }
}
