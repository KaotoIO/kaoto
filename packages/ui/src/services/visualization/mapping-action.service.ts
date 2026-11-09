import { IField, PrimitiveDocument } from '../../models/datamapper/document';
import {
  ChooseItem,
  CopyOfSelector,
  CopyOfType,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  IExpressionHolder,
  IfItem,
  MappingItem,
  MappingParentType,
  MappingTree,
  OtherwiseItem,
  ValueOfSelector,
  ValueSelector,
  VariableItem,
  WhenItem,
} from '../../models/datamapper/mapping';
import { XPathCommitResult } from '../../models/datamapper/mapping-action';
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
import { CopyOfPlacementService } from '../mapping/copy-of-placement.service';
import { FieldMatchingService } from '../mapping/field-matching.service';
import { MappingService } from '../mapping/mapping.service';
import { WrapperAutoDetectionService } from '../mapping/wrapper-auto-detection.service';
import { TargetRenderService } from './target-render.service';
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
  /** Whether a separate copy-of rendered first at its last commit, to rebuild the tree only when that changes. */
  private static readonly committedCopyOfLeads = new WeakMap<CopyOfSelector, boolean>();

  /**
   * Returns `true` if the node's mapping already has a {@link ValueSelector} child.
   * @param nodeData - The target node to inspect.
   */
  static hasValueSelector(nodeData: TargetNodeData) {
    return nodeData.mapping?.children.some((c) => c instanceof ValueSelector) ?? false;
  }

  static hasValueOfSelector(nodeData: TargetNodeData) {
    return nodeData.mapping?.children.some((c) => c instanceof ValueOfSelector) ?? false;
  }

  /**
   * Removes the mapping item associated with the node from the mapping tree. A see-through optional
   * guard the row absorbed is removed first ({@link removeOptionalGuard}), so deleting a mapping never
   * leaves its guard behind as an empty `if`; an `if` that is visible is the user's own and is kept.
   * No-op if the node has no mapping.
   * @param nodeData - The target node whose mapping should be deleted.
   */
  static deleteMappingItem(nodeData: TargetNodeData) {
    if (!nodeData.mapping) return;
    const guardOwner = TargetRenderService.findGuardOwner(nodeData, nodeData.mapping);
    if (guardOwner) MappingActionService.removeOptionalGuard(guardOwner);
    MappingService.deleteMappingItem(nodeData.mapping);
  }

  /**
   * Removes the see-through optional guard that `nodeData`'s row absorbed, keeping the field in the
   * guard's place. The guard's comment moves onto the field, ahead of the field's own comment since
   * it belonged to the outer element, so removing a guard never loses it. Every guard removal goes
   * through here: deleting a row's mapping, "Remove optional guard" and the for-each wraps.
   * @param nodeData - the field row whose guard to remove
   * @returns the field item, or `undefined` when the row has no see-through guard
   */
  static removeOptionalGuard(nodeData: FieldItemNodeData): FieldItem | undefined {
    const guard = nodeData.autoOptionalIfItem;
    if (!guard) return undefined;
    const field = nodeData.mapping;
    if (MappingService.unwrapItem(guard) !== field) return undefined;
    const comments = [guard.comment, field.comment].filter((comment): comment is string => !!comment);
    field.comment = comments.length > 0 ? comments.join('\n') : undefined;
    return field;
  }

  /**
   * Settles an XPath edit when the user commits it: on blur, on Enter, or when the XPath editor
   * closes. The expression itself was already written on every keystroke; what remains is the
   * optional guard of the edited row, which the target tree kept unchanged while the user typed.
   *
   * If the row shows a see-through guard and the committed path is a simple path to an optional
   * source, the guard's test follows the new path, so the guard stays see-through. Any other path
   * leaves the guard untouched, and the rebuilt tree shows it as a regular `if`. A visible `if` is
   * never edited here. Whether the tree must be rebuilt is decided by
   * {@link TargetRenderService.hasDecisionChanged}, which also covers a visible `if` whose test the
   * edit now matches exactly, and a `for-each` whose `select` the edit changed.
   * @param nodeData - the row whose XPath was edited
   * @param expressionItem - the expression holder that was edited
   * @returns what the caller must refresh
   */
  static commitExpression(
    nodeData: TargetNodeData,
    expressionItem: IExpressionHolder & MappingItem,
  ): XPathCommitResult {
    const resynced = MappingActionService.resyncOptionalGuard(nodeData, expressionItem);
    if (MappingActionService.reclassifyCopyOf(expressionItem)) return 'structural-update';
    if (TargetRenderService.hasDecisionChanged(expressionItem, nodeData.renderIndex)) return 'structural-update';
    return resynced ? 'update' : 'none';
  }

  /**
   * Moves a committed `xsl:copy-of` to where {@link CopyOfPlacementService.classify} puts it: inline
   * on the child field it selects when 1-to-1, as a separate node otherwise. This runs on commit,
   * not per keystroke, because the target tree is only rebuilt on structural refreshes. A copy-of
   * directly under `xsl:template` (no enclosing field) is left alone.
   * @param expressionItem - the expression holder that was edited
   * @returns `true` when the copy-of moved or, as a separate node, may need to change its row position,
   * so the target tree must be rebuilt
   */
  private static reclassifyCopyOf(expressionItem: IExpressionHolder & MappingItem): boolean {
    if (!(expressionItem instanceof CopyOfSelector)) return false;

    const owner = expressionItem.parent;
    const inlineIn =
      owner instanceof FieldItem && expressionItem.valueType === CopyOfType.CONTAINER ? owner : undefined;
    const outputParent: MappingParentType = inlineIn ? inlineIn.parent : owner;
    const contextField = CopyOfPlacementService.getContextField(outputParent);
    if (!contextField) return false;

    const namespaceMap = expressionItem.mappingTree.namespaceMap;
    const placement = CopyOfPlacementService.classify(
      expressionItem.expression,
      contextField,
      (prefix) => namespaceMap[prefix],
      outputParent,
    );

    if (placement.kind === 'child' && CopyOfPlacementService.canHostFieldItem(outputParent)) {
      if (inlineIn?.field === placement.field) return false;
      MappingActionService.detachCopyOf(expressionItem, inlineIn);
      const target = MappingActionService.findCopyOfHost(outputParent, placement.field);
      if (target) {
        expressionItem.parent = target;
        expressionItem.valueType = CopyOfType.CONTAINER;
        target.children.push(expressionItem);
        MappingActionService.committedCopyOfLeads.delete(expressionItem);
        return true;
      }
      // The field already has content and can't repeat: a second element would be invalid output, so the
      // copy-of stays a separate node.
      expressionItem.parent = outputParent;
      expressionItem.valueType = CopyOfType.CONTAINER_NODE;
      outputParent.children.push(expressionItem);
      MappingActionService.committedCopyOfLeads.set(
        expressionItem,
        CopyOfPlacementService.isLeadingCopyOf(expressionItem),
      );
      return true;
    }

    // Still a separate node, but an empty copy-of renders first and any other one last, so the row only
    // moves when that changes. What the previous commit left is remembered; with no record the tree is
    // rebuilt to be safe.
    if (inlineIn) {
      MappingActionService.detachCopyOf(expressionItem, inlineIn);
      expressionItem.parent = outputParent;
      expressionItem.valueType = CopyOfType.CONTAINER_NODE;
      outputParent.children.push(expressionItem);
      MappingActionService.committedCopyOfLeads.set(
        expressionItem,
        CopyOfPlacementService.isLeadingCopyOf(expressionItem),
      );
      return true;
    }
    const leads = CopyOfPlacementService.isLeadingCopyOf(expressionItem);
    const leadsBefore = MappingActionService.committedCopyOfLeads.get(expressionItem);
    MappingActionService.committedCopyOfLeads.set(expressionItem, leads);
    return leadsBefore !== leads;
  }

  /**
   * The {@link FieldItem} of `field` under `parent` that can take a copy-of, created when missing. Only an
   * empty one is reused: a copy-of next to other content would no longer be the field's whole body, and
   * serialization would nest it inside the field's element. When a populated one exists and the field
   * can't repeat, there is no valid host and `undefined` is returned.
   */
  private static findCopyOfHost(parent: MappingParentType, field: IField): FieldItem | undefined {
    const sameField = parent.children.filter((c): c is FieldItem => c instanceof FieldItem && c.field === field);
    const empty = sameField.find((c) => c.children.length === 0);
    if (empty) return empty;
    if (sameField.length > 0 && field.maxOccurs === 1) return undefined;
    return MappingService.createFieldItem(parent, field);
  }

  /** Removes the copy-of from where it sits, dropping the {@link FieldItem} that only carried it. */
  private static detachCopyOf(selector: CopyOfSelector, inlineIn: FieldItem | undefined) {
    const holder: MappingParentType = inlineIn ?? selector.parent;
    holder.children = holder.children.filter((child) => child !== selector);
    if (inlineIn?.children.length === 0) {
      inlineIn.parent.children = inlineIn.parent.children.filter((child) => child !== inlineIn);
    }
  }

  /**
   * When committing an `if` row's XPath makes that `if` see-through, the row the user was editing
   * disappears with the rebuild. Asks the XPath input of the field that absorbs the `if` to take focus
   * after the rebuild, but only if focus was lost meanwhile, so focus isn't taken back from outside
   * the page.
   *
   * Call it only when focus isn't moving to a control that survives the rebuild, one outside the
   * edited row. During a blur the browser hasn't moved focus yet, so the lost-focus check can't
   * tell; a caller on a blur decides from where the blur sends focus, as `TargetNodeActions` does.
   *
   * Only a field whose own row hosts its XPath input is asked: that row takes the `if` row's place,
   * so it is mounted after the rebuild. A selector edited in a row of its own may not be mounted
   * then (its field collapsed, beyond the parse frontier or outside the visible window), and a request
   * that no input takes must not fire later, when that row scrolls into view.
   * @param nodeData - the row whose XPath was committed
   * @param expressionItem - the expression holder that was edited
   */
  static restoreFocusAfterAbsorb(nodeData: TargetNodeData, expressionItem: IExpressionHolder & MappingItem) {
    if (!(expressionItem instanceof IfItem)) return;
    const field = TargetRenderService.computeSeeThroughField(expressionItem, nodeData.renderIndex.sourceContext);
    if (!field || TargetRenderService.getSelectorInputOwner(field) !== field) return;
    useDocumentTreeStore.getState().requestXPathInputFocus(field.nodePath.toString(), nodeData.renderIndex.generation);
  }

  private static resyncOptionalGuard(nodeData: TargetNodeData, expressionItem: IExpressionHolder & MappingItem) {
    const guard = TargetRenderService.findGuardOwner(nodeData, expressionItem)?.autoOptionalIfItem;
    if (!guard) return false;
    const path = expressionItem instanceof ValueSelector ? expressionItem.sourcePath : expressionItem.expression;
    if (path === guard.expression) return false;
    if (!TargetRenderService.computeSeeThroughField(guard, nodeData.renderIndex.sourceContext, path)) return false;
    guard.expression = path;
    return true;
  }

  /**
   * Wraps or adds an {@link IfItem} condition to the node's mapping.
   * For document nodes, adds the if directly to the mapping tree.
   * For field and mapping nodes, creates the field item if needed before wrapping.
   * On a field row with a see-through optional guard, the guard itself becomes the visible `if`: its
   * test `X` turns into `exists(X)`, which means the same in an `xsl:if` but isn't a simple path, so
   * the see-through rule doesn't hide it again, also after a reload. The user extends that condition
   * instead of getting a second `if`; setting the test back to `X` hides it again.
   * @param nodeData - The target node to apply the condition to.
   */
  static applyIf(nodeData: TargetNodeData) {
    if (nodeData instanceof TargetDocumentNodeData) {
      const valueSelector = nodeData.mappingTree.children.find((c) => c instanceof ValueSelector);
      MappingService.addIf(nodeData.mappingTree, valueSelector);
    } else if (nodeData instanceof AddMappingNodeData) {
      const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
      MappingService.wrapWithIf(fieldItem);
    } else if (nodeData instanceof FieldItemNodeData && nodeData.autoOptionalIfItem) {
      const guard = nodeData.autoOptionalIfItem;
      guard.expression = `exists(${guard.expression})`;
    } else if (nodeData instanceof MappingNodeData || nodeData instanceof TargetFieldNodeData) {
      const createdFieldItem =
        nodeData instanceof TargetFieldNodeData ? MappingActionService.getOrCreateFieldItem(nodeData) : undefined;
      const mapping = nodeData.mapping ?? createdFieldItem;
      if (!mapping) return;
      MappingService.wrapWithIf(mapping);
    }
  }

  /**
   * Manually wraps a field's single selector with an optional guard, using the selector's
   * {@link ValueSelector.sourcePath} as the `test`. No-op unless
   * {@link WrapperAutoDetectionService.getHiddenGuardSelector} accepts the field, so the guard always
   * has the shape {@link WrapperAutoDetectionService.matchSimpleOptionalGuard} recognises, regardless
   * of whether the caller gated on it first. The target tree shows it see-through once its source is
   * confirmed optional ({@link TargetRenderService}).
   * @param nodeData - the field node to wrap
   */
  static addOptionalGuard(nodeData: FieldItemNodeData): void {
    const fieldItem = nodeData.mapping;
    const selector = WrapperAutoDetectionService.getHiddenGuardSelector(fieldItem);
    if (!selector) return;

    MappingService.wrapWithIf(fieldItem);
    const ifItem = fieldItem.parent as IfItem;
    ifItem.expression = selector.sourcePath;
  }

  /**
   * Wraps or adds a {@link ChooseItem} with `when`/`otherwise` branches to the node's mapping.
   * No-op if the node already contains a `ChooseItem`.
   * For field and mapping nodes, creates the field item if needed before wrapping.
   * On a field row with a see-through optional guard, the guard's test becomes the first `when`'s
   * test and the guard is removed ({@link removeOptionalGuard}), so the existence check is explicit
   * and editable, and the `otherwise` branch is a real fallback for an absent source. The guard's
   * comment stays with the `when` branch's field; the `otherwise` copy keeps the field's own comment,
   * since the guard's comment describes the opposite case.
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

      if (nodeData instanceof FieldItemNodeData && nodeData.autoOptionalIfItem) {
        MappingActionService.wrapGuardedFieldWithChoose(nodeData, nodeData.autoOptionalIfItem);
        return;
      }
      const createdFieldItem =
        nodeData instanceof TargetFieldNodeData ? MappingActionService.getOrCreateFieldItem(nodeData) : undefined;
      const mapping = nodeData.mapping ?? createdFieldItem;
      if (!mapping) return;
      MappingService.wrapWithChooseWhenOtherwise(mapping);
    }
  }

  /**
   * {@link MappingService.wrapWithChooseWhenOtherwise} always puts the field into a new `when` and a
   * copy of it into a new `otherwise`, which the casts rely on.
   */
  private static wrapGuardedFieldWithChoose(nodeData: FieldItemNodeData, guard: IfItem) {
    const guardTest = guard.expression;
    const fieldComment = nodeData.mapping.comment;
    const field = MappingActionService.removeOptionalGuard(nodeData) ?? nodeData.mapping;
    MappingService.wrapWithChooseWhenOtherwise(field);
    const whenItem = field.parent as WhenItem;
    whenItem.expression = guardTest;
    const otherwiseItem = (whenItem.parent as ChooseItem).otherwise as OtherwiseItem;
    otherwiseItem.children[0].comment = fieldComment;
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
   * Creates the field item first if it does not yet exist. A see-through optional guard is removed
   * first ({@link removeOptionalGuard}), since the loop already writes nothing when its source is absent.
   * @param nodeData - The target field node to wrap.
   */
  static applyForEach(nodeData: ForEachCapableNodeData) {
    if (nodeData instanceof FieldItemNodeData) MappingActionService.removeOptionalGuard(nodeData);
    const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
    MappingService.wrapWithForEach(fieldItem);
  }

  /**
   * Wraps the target field's mapping item with a {@link ForEachGroupItem}.
   * Creates the field item first if it does not yet exist. A see-through optional guard is removed
   * first ({@link removeOptionalGuard}), since the loop already writes nothing when its source is absent.
   * @param nodeData - The target field node to wrap.
   */
  static applyForEachGroup(nodeData: ForEachCapableNodeData) {
    if (nodeData instanceof FieldItemNodeData) MappingActionService.removeOptionalGuard(nodeData);
    const fieldItem = MappingActionService.getOrCreateFieldItem(nodeData);
    MappingService.wrapWithForEachGroup(fieldItem);
  }

  /**
   * Wraps the target field with a {@link ForEachItem} whose select expression is `current-group()`.
   * Only meaningful inside a `for-each-group` context. A see-through optional guard is removed
   * first ({@link removeOptionalGuard}), since the loop already writes nothing when its source is absent.
   * @param nodeData - The target field node to wrap.
   */
  static applyForEachCurrentGroup(nodeData: ForEachCapableNodeData) {
    if (nodeData instanceof FieldItemNodeData) MappingActionService.removeOptionalGuard(nodeData);
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
   * Adds a {@link ValueOfSelector} child to the node's mapping.
   * Creates the underlying field item first if the node is a {@link TargetFieldNodeData} without a mapping.
   * Resolves the value type (VALUE vs ATTRIBUTE) via {@link MappingService.createValueOfSelector}.
   * No-op if a `ValueOfSelector` already exists.
   * @param nodeData - The target node to add the value selector to.
   */
  static applyValueOfSelector(nodeData: TargetNodeData) {
    const mapping =
      nodeData instanceof TargetFieldNodeData && !nodeData.mapping
        ? MappingActionService.getOrCreateFieldItem(nodeData)
        : nodeData.mapping;
    if (!mapping) return;
    if (mapping.children.some((c: MappingItem) => c instanceof ValueOfSelector)) return;
    const valueSelector = MappingService.createValueOfSelector(mapping);
    mapping.children.push(valueSelector);
    MappingActionService.requestValueOfSelectorFocus(mapping, valueSelector);
  }

  private static requestValueOfSelectorFocus(mapping: MappingParentType, valueSelector: ValueOfSelector) {
    const focusTarget =
      mapping instanceof FieldItem && DocumentService.hasChildren(mapping.field) ? valueSelector : mapping;
    useDocumentTreeStore.getState().requestXPathInputFocus(focusTarget.nodePath.toString());
  }

  static applyCopyOfSelector(nodeData: TargetNodeData) {
    const mapping =
      nodeData instanceof TargetFieldNodeData && !nodeData.mapping
        ? MappingActionService.getOrCreateFieldItem(nodeData)
        : nodeData.mapping;
    if (!mapping) return;
    const copyOfSelector = new CopyOfSelector(mapping, CopyOfType.CONTAINER_NODE);
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
   * @returns `true` when the target tree must be rebuilt: the mapping tree's shape changed (a
   * {@link MappingItem} such as a `FieldItem`/`ForEachItem`/`ChooseItem` or an optional guard was
   * added, removed, or replaced), or the drop changed whether an optional guard is see-through
   * ({@link TargetRenderService.hasDecisionChanged}) — e.g. a second source dropped onto a guarded
   * field appends to its selector, so the guard shows as a regular `if`. `false` when only an
   * expression changed and every row stays as it is.
   */
  static engageMapping(mappingTree: MappingTree, sourceNode: SourceNodeDataType, targetNode: TargetNodeData): boolean {
    if (MappingActionService.applyEngageMapping(mappingTree, sourceNode, targetNode)) return true;
    return TargetRenderService.hasDecisionChanged(targetNode.mapping ?? mappingTree, targetNode.renderIndex);
  }

  private static applyEngageMapping(
    mappingTree: MappingTree,
    sourceNode: SourceNodeDataType,
    targetNode: TargetNodeData,
  ): boolean {
    if (sourceNode instanceof SourceVariableNodeData) {
      return MappingActionService.engageVariableMapping(sourceNode, targetNode, mappingTree);
    }

    const sourceField = 'document' in sourceNode ? (sourceNode.document as PrimitiveDocument) : sourceNode.field;

    if (sourceNode instanceof ChoiceFieldNodeData && VisualizationUtilService.isFieldNode(targetNode)) {
      return MappingActionService.engageChoiceMapping(sourceNode, targetNode, sourceField);
    }

    const targetWasUnmapped = !targetNode.mapping;
    const containerResult = MappingActionService.tryEngageContainerMapping(sourceNode, targetNode);
    if (containerResult.handled) return containerResult.structural;

    if (VisualizationUtilService.isFieldNode(targetNode)) {
      const item = MappingActionService.getOrCreateFieldItem(targetNode);
      const wrapOrGuardChanged = MappingActionService.applyFieldMappingWithGuard(item, sourceField, () => {
        MappingActionService.removeParentContainerCopyOf(item);
        MappingService.mapToField(sourceField, item);
      });
      return targetWasUnmapped || wrapOrGuardChanged;
    } else if (targetNode instanceof MappingNodeData) {
      MappingService.mapToCondition(targetNode.mapping, sourceField);
      return false;
    } else if (targetNode instanceof TargetDocumentNodeData) {
      const hadRootValueSelector = mappingTree.children.some((c) => c instanceof ValueOfSelector);
      MappingService.mapToDocument(mappingTree, sourceField);
      return !hadRootValueSelector;
    }
    return false;
  }

  private static engageVariableMapping(
    sourceNode: SourceVariableNodeData,
    targetNode: TargetNodeData,
    mappingTree: MappingTree,
  ): boolean {
    const pathExpr = MappingService.variablePathExpression(sourceNode.variable.name);
    const structural =
      targetNode instanceof TargetDocumentNodeData
        ? !mappingTree.children.some((c) => c instanceof ValueOfSelector)
        : !targetNode.mapping;
    const target = MappingActionService.resolveTarget(targetNode, mappingTree);
    if (!target) return false;
    MappingService.applyMapping(pathExpr, target);
    return structural;
  }

  private static engageChoiceMapping(
    sourceNode: ChoiceFieldNodeData,
    targetNode: TargetFieldNodeData | FieldItemNodeData,
    sourceField: IField,
  ): boolean {
    if (sourceNode.choiceField) {
      const structural = !targetNode.mapping;
      const item = MappingActionService.getOrCreateFieldItem(targetNode);
      MappingService.mapToField(sourceField, item);
      return structural;
    } else if (
      VisualizationUtilService.isCollectionField(sourceNode) &&
      VisualizationUtilService.isCollectionField(targetNode)
    ) {
      return MappingActionService.createForEachWithChooseFromChoice(sourceNode.field, targetNode);
    } else {
      return MappingActionService.createChooseFromChoice(sourceNode.field, targetNode);
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

  /**
   * @returns `{ handled: false }` when this pair isn't a container mapping and the caller
   * should fall through to regular field/condition/document dispatch; otherwise
   * `{ handled: true, structural }`, where `structural` reports whether a new
   * {@link MappingItem} was materialized (see {@link engageMapping}).
   */
  private static tryEngageContainerMapping(
    sourceNode: SourceNodeDataType,
    targetNode: TargetNodeData,
  ): { handled: boolean; structural: boolean } {
    if (
      !('field' in sourceNode) ||
      !sourceNode.field ||
      !(targetNode instanceof TargetFieldNodeData || targetNode instanceof FieldItemNodeData)
    ) {
      return { handled: false, structural: false };
    }
    const sourceFieldFromNode = sourceNode.field;
    const targetFieldFromNode = targetNode.field;
    const sourceHasChildren = DocumentService.hasChildren(sourceFieldFromNode);
    const targetHasChildren = DocumentService.hasChildren(targetFieldFromNode);
    const anyTypeInvolved = sourceFieldFromNode.type === Types.AnyType || targetFieldFromNode.type === Types.AnyType;

    if (!sourceHasChildren && !targetHasChildren && !anyTypeInvolved) {
      return { handled: false, structural: false };
    }

    const structural = !targetNode.mapping;

    if (anyTypeInvolved && (!sourceHasChildren || !targetHasChildren)) {
      const item = MappingActionService.getOrCreateFieldItem(targetNode);
      const wrapOrGuardChanged = MappingActionService.applyFieldMappingWithGuard(item, sourceFieldFromNode, () => {
        MappingService.mapToFieldWithValueType(sourceFieldFromNode, item, CopyOfType.CONTAINER_NODE);
      });
      return { handled: true, structural: structural || wrapOrGuardChanged };
    }

    if (!sourceHasChildren || !targetHasChildren) {
      return { handled: false, structural: false };
    }

    const item = MappingActionService.getOrCreateFieldItem(targetNode);
    const bothCollections =
      VisualizationUtilService.isCollectionField(sourceNode) && VisualizationUtilService.isCollectionField(targetNode);

    if (bothCollections) {
      const guardResult = MappingActionService.guardExistingForEach(item);
      if (guardResult !== undefined) return guardResult;

      MappingActionService.createCollectionForEach(item, sourceFieldFromNode, targetFieldFromNode);
      return { handled: true, structural: true };
    }

    // generateAutoChildMappings (the non-copy-of branch of applyContainerMapping) always adds new
    // child FieldItems, so it's structural regardless of whether `item` itself pre-existed.
    const canUseCopyOf = FieldMatchingService.canUseCopyOf(sourceFieldFromNode, targetFieldFromNode);
    const wrapOrGuardChanged = MappingActionService.applyFieldMappingWithGuard(item, sourceFieldFromNode, () => {
      MappingService.applyContainerMapping(sourceFieldFromNode, targetFieldFromNode, item);
    });
    return { handled: true, structural: structural || !canUseCopyOf || wrapOrGuardChanged };
  }

  /**
   * Shared tail for every call site that engages a mapping onto a {@link FieldItem}: samples
   * {@link hasMappingContent} before `mutate` runs (afterwards new and pre-existing content can no
   * longer be told apart), runs `mutate`, then lets {@link MappingService.tryAutoOptionalIfWrap}
   * wrap the field in an optional guard. A drop onto a field that already has a see-through guard
   * appends to its selector, because {@link XPathService.addSource} always appends, so the guard no
   * longer matches and shows as a regular `if`; {@link engageMapping} reports that through
   * {@link TargetRenderService.hasDecisionChanged}.
   * @returns whether a guard was created, which changes the tree's shape
   */
  private static applyFieldMappingWithGuard(item: MappingItem, sourceField: IField, mutate: () => void): boolean {
    const hadExistingContent = MappingActionService.hasMappingContent(item);
    mutate();
    return !!MappingService.tryAutoOptionalIfWrap(item, sourceField, hadExistingContent);
  }

  /**
   * Whether the field item already carries output-producing mapping content. Sampled before a new
   * mapping is applied, since afterwards an appended multi-source expression is indistinguishable
   * from one the user typed, and newly generated children are indistinguishable from pre-existing
   * ones. Guards must not be created over content they do not own.
   *
   * An empty selector does not count: {@link applyValueOfSelector}/{@link applyCopyOfSelector}
   * create one and focus the XPath input, so dropping a source onto it is a fresh 1-to-1 mapping.
   * Nor does a node-scoped {@link VariableItem}, which produces no output of its own.
   * @param item - the target field item about to be mapped onto
   */
  private static hasMappingContent(item: MappingItem): boolean {
    return item.children.some(
      (child) => !(child instanceof VariableItem) && !(child instanceof ValueSelector && !child.expression),
    );
  }

  /**
   * Checks whether a container auto-mapping ForEachItem already exists for this target field.
   * Returns `{ handled: true, structural }` (fully handled here — either a no-op reuse or a
   * stray sibling `ForEachItem` wrapping the same target field was removed), `{ handled: false,
   * structural: false }` (defer to regular mapping), or `undefined` (proceed with auto-mapping via
   * {@link createCollectionForEach}). A sibling `ForEachItem` wrapping a different field, e.g. another
   * repeating element under the same parent, does not count.
   */
  private static guardExistingForEach(item: MappingItem): { handled: boolean; structural: boolean } | undefined {
    if (item.children.some((c) => c instanceof ForEachItem)) return { handled: true, structural: false };
    if (item.parent instanceof ForEachItem) return { handled: false, structural: false };
    if (
      item instanceof FieldItem &&
      item.parent.children.some(
        (c) => c !== item && c instanceof ForEachItem && MappingService.getInstructionFields(c).includes(item.field),
      )
    ) {
      const idx = item.parent.children.indexOf(item);
      if (idx !== -1) item.parent.children.splice(idx, 1);
      return { handled: true, structural: true };
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

    MappingActionService.insertInTargetOrder(parentOfItem, forEachItem, targetField);
  }

  /**
   * Inserts a new loop among its siblings following the target schema order, so the serialized
   * XSLT (which preserves the authored order of instruction items) respects the target
   * `xs:sequence` regardless of the order the user dropped the mappings in. Siblings whose
   * position can't be determined (variables, conditions without a field) are skipped; if no
   * later sibling is found the loop is appended.
   */
  private static insertInTargetOrder(parent: MappingParentType, newItem: ForEachItem, targetField: IField) {
    const newPath = MappingActionService.getFieldOrderPath(targetField);
    const index = parent.children.findIndex((sibling) => {
      const siblingField = MappingActionService.getFirstTargetField(sibling);
      return (
        !!siblingField &&
        MappingActionService.compareOrderPaths(MappingActionService.getFieldOrderPath(siblingField), newPath) > 0
      );
    });
    if (index === -1) parent.children.push(newItem);
    else parent.children.splice(index, 0, newItem);
  }

  private static getFirstTargetField(item: MappingItem): IField | undefined {
    if (item instanceof FieldItem) return item.field;
    for (const child of item.children) {
      const field = MappingActionService.getFirstTargetField(child);
      if (field) return field;
    }
    return undefined;
  }

  /** Index of the field within each ancestor's `fields`, from the document root down. */
  private static getFieldOrderPath(field: IField): number[] {
    const path: number[] = [];
    let current: IField = field;
    while (current.parent?.fields) {
      path.unshift(current.parent.fields.indexOf(current));
      if (!('parent' in current.parent) || current.parent === current) break;
      current = current.parent as IField;
    }
    return path;
  }

  private static compareOrderPaths(a: number[], b: number[]): number {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
  }

  /** @returns whether a new `ChooseItem` was created (`false` if one already existed — a no-op). */
  private static createChooseFromChoice(sourceField: IField, targetNode: TargetNodeData): boolean {
    const targetItem = MappingActionService.getOrCreateFieldItem(targetNode);
    if (targetItem.children.some((c) => c instanceof ChooseItem)) return false;
    targetItem.children = targetItem.children.filter((c) => !(c instanceof ValueSelector));

    const chooseItem = MappingActionService.buildChooseFromChoiceMembers(targetItem, sourceField, targetItem);
    targetItem.children.push(chooseItem);
    return true;
  }

  /** @returns whether a new `ForEachItem` was created (`false` if one already existed — a no-op). */
  private static createForEachWithChooseFromChoice(sourceField: IField, targetNode: TargetNodeData): boolean {
    const targetItem = MappingActionService.getOrCreateFieldItem(targetNode);
    if (targetItem.children.some((c) => c instanceof ForEachItem)) return false;
    targetItem.children = targetItem.children.filter((c) => !(c instanceof ValueSelector));

    const forEachItem = new ForEachItem(targetItem);
    MappingService.mapToCondition(forEachItem, sourceField);

    const chooseItem = MappingActionService.buildChooseFromChoiceMembers(forEachItem, sourceField, targetItem);
    forEachItem.children.push(chooseItem);
    targetItem.children.push(forEachItem);
    return true;
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

  /**
   * Drops the enclosing container's wholesale copy-of once one of its children is mapped
   * explicitly, since otherwise the output both copies the subtree and emits the child.
   *
   * Walks to the owning container rather than reading `item.parent`: after an auto-optional wrap
   * the immediate parent is the guard, and scanning its children finds nothing.
   */
  private static removeParentContainerCopyOf(item: MappingItem): void {
    const container = MappingService.findEnclosingFieldItem(item);
    if (!(container instanceof FieldItem)) return;
    container.children = container.children.filter(
      (c) => !(c instanceof CopyOfSelector && c.valueType === CopyOfType.CONTAINER),
    );
  }
}
