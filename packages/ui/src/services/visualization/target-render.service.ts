import { IField } from '../../models/datamapper/document';
import {
  CopyOfSelector,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  IExpressionHolder,
  IfItem,
  InstructionItem,
  MappingItem,
  MappingParentType,
  MappingTree,
  ValueOfSelector,
  ValueSelector,
  VariableItem,
} from '../../models/datamapper/mapping';
import { NodePath } from '../../models/datamapper/nodepath';
import {
  CopyOfFieldNodeData,
  CopyOfRenderPlacement,
  ExpressionHolderNodeData,
  FieldItemNodeData,
  ISourceDocumentContext,
  MappingNodeData,
  TargetRenderIndex,
} from '../../models/datamapper/visualization';
import { CopyOfPlacementService } from '../mapping/copy-of-placement.service';
import { MappingService } from '../mapping/mapping.service';
import { WrapperAutoDetectionService } from '../mapping/wrapper-auto-detection.service';
import { VisualizationUtilService } from './visualization-util.service';

/**
 * Meant to be the single owner of what the DataMapper target tree renders. Today it owns the
 * decisions that depend on optional guards being see-through: which `xsl:if` guards are absorbed
 * into their field's row, and, because absorption changes paths, the target path every mapping
 * line ends on. Row paths are still built by node creation, so for a selected wrapper member the
 * two can differ; moving them here is a follow-up.
 *
 * Decisions are made once per structural snapshot of the mapping tree, never per keystroke, and are
 * recorded in a {@link TargetRenderIndex} that node creation, mapping links and row actions all
 * read. Mapping lines therefore follow the expression the user is typing but end on the snapshot's
 * paths, and rows change only when a commit, drop or menu action refreshes the tree structurally. A
 * commit or drop that changes a decision is detected by {@link hasDecisionChanged}, so its caller
 * refreshes structurally at that moment rather than leaving the change to some unrelated later
 * rebuild.
 *
 * Depends only on models, `services/mapping` and {@link VisualizationUtilService}, so that mutation
 * services such as `MappingActionService` can use it without depending on the tree builder.
 */
export class TargetRenderService {
  private static readonly warnedItems = new WeakSet<MappingItem>();
  private static lastGeneration = 0;

  /**
   * The see-through rule: an `xsl:if` is see-through when it guards exactly one optional target field
   * mapped by a single simple path equal to its test
   * ({@link WrapperAutoDetectionService.matchSimpleOptionalGuard}), and that path is an optional
   * source: it resolves to exactly one source field and selects at most one node in its context
   * ({@link isOptionalSourceSelector}). Comments play no part in it.
   * @param ifItem - the `xsl:if` to evaluate
   * @param sourceContext - the source documents to resolve against; without them nothing is optional
   * @param test - a candidate test to evaluate instead of the `if`'s own, without writing it
   * @returns the field the guard is absorbed into, or `undefined` when it is not see-through
   */
  static computeSeeThroughField(
    ifItem: IfItem,
    sourceContext: ISourceDocumentContext | undefined,
    test: string = ifItem.expression,
  ): FieldItem | CopyOfSelector | undefined {
    const guarded = WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem, test);
    const selector = guarded instanceof CopyOfSelector ? guarded : guarded?.soleSelector;
    if (!guarded || !selector) return undefined;
    return TargetRenderService.isOptionalSourceSelector(selector, sourceContext) ? guarded : undefined;
  }

  /**
   * Whether `selector` resolves to exactly one source field and its path is an optional source, by
   * the same {@link WrapperAutoDetectionService.isOptionalSourcePath} rule drag-and-drop applies to
   * the dropped field: the path selects at most one node in the selector's context, and that node may
   * be absent. An expression that doesn't resolve to exactly one field is treated as not optional,
   * because its optionality can't be confirmed.
   * @param selector - the field's single selector
   * @param sourceContext - the source documents to resolve against; without them nothing is optional
   */
  static isOptionalSourceSelector(
    selector: ValueOfSelector | CopyOfSelector,
    sourceContext: ISourceDocumentContext | undefined,
  ): boolean {
    if (!sourceContext) return false;
    const resolved = MappingService.resolveSourceFields(
      selector,
      sourceContext.sourceParameterMap,
      sourceContext.sourceBody,
    );
    return (
      resolved.length === 1 && WrapperAutoDetectionService.isOptionalSourcePath(resolved[0].field, resolved[0].path)
    );
  }

  /**
   * Whether "Add optional guard" would give `nodeData`'s field a see-through guard: the target side
   * ({@link WrapperAutoDetectionService.getHiddenGuardSelector}: not under an `if`, an optional
   * target, a single simple selector) and an optional source, checked against the source documents
   * of the node's snapshot. The menu shows the action only when this holds.
   * @param nodeData - the field row the action would apply to
   */
  static canAddOptionalGuard(nodeData: FieldItemNodeData | CopyOfFieldNodeData): boolean {
    const selector = WrapperAutoDetectionService.getHiddenGuardSelector(nodeData.mapping);
    return !!selector && TargetRenderService.isOptionalSourceSelector(selector, nodeData.renderIndex.sourceContext);
  }

  /**
   * Makes the render decisions for one structural snapshot: every see-through guard with the field
   * it is absorbed into, and the target path the lines of every other item end on. Values are
   * resolved now, because the items are shared with the live tree and mutated in place while the
   * user types.
   * @param mappingTree - the structural snapshot of the mapping tree
   * @param sourceContext - the source documents the decisions are made against
   */
  static buildIndex(mappingTree: MappingTree, sourceContext: ISourceDocumentContext): TargetRenderIndex {
    const absorbedFields = new Map<IfItem, FieldItem | CopyOfSelector>();
    const targetPaths = new Map<MappingItem, string>();
    const copyOfPlacements = new Map<CopyOfSelector, CopyOfRenderPlacement>();
    const visit = (item: MappingItem, parentPath: NodePath): void => {
      const absorbingField =
        item instanceof IfItem ? TargetRenderService.computeSeeThroughField(item, sourceContext) : undefined;
      let path = parentPath;
      if (item instanceof IfItem && absorbingField) {
        absorbedFields.set(item, absorbingField);
      } else {
        path = TargetRenderService.childTargetPath(item, parentPath);
        targetPaths.set(item, path.toString());
      }
      if (item instanceof CopyOfSelector) copyOfPlacements.set(item, TargetRenderService.getCopyOfPlacement(item));
      for (const child of item.children) {
        visit(child, path);
      }
    };
    for (const child of mappingTree.children) {
      visit(child, mappingTree.nodePath);
    }
    TargetRenderService.lastGeneration += 1;
    return new TargetRenderIndex(
      absorbedFields,
      targetPaths,
      sourceContext,
      TargetRenderService.lastGeneration,
      copyOfPlacements,
    );
  }

  /**
   * The target path a mapping line for `item` ends on. It comes from the snapshot, so it doesn't move
   * while the user is typing. It names the item's row, except that node creation names the row of
   * some selected wrapper members by the mapping id. The root is resolved by its `nodePath`,
   * because a new root shell is created on every refresh, and an absorbed guard resolves to its
   * parent's path.
   *
   * An item missing from a real snapshot was added without a structural refresh. Its path is then
   * computed from the live tree, using the snapshot's absorption, and development builds warn once
   * per item that always gets a row, so the skipped refresh can be found.
   * @param item - the mapping item a line ends on
   * @param renderIndex - the render index of the snapshot the target tree was built from
   */
  static getTargetPath(item: MappingTree | MappingItem, renderIndex: TargetRenderIndex): string {
    if (item instanceof MappingTree) return item.nodePath.toString();
    if (renderIndex.isAbsorbed(item)) return TargetRenderService.getTargetPath(item.parent, renderIndex);
    const snapshotPath = renderIndex.getSnapshotPath(item);
    if (snapshotPath !== undefined) return snapshotPath;
    if (renderIndex.hasSnapshot) TargetRenderService.warnMissingRow(item);
    return TargetRenderService.computeTargetPath(item, renderIndex).toString();
  }

  /**
   * Bridges a mapping tree {@link NodePath} (no choice/abstract wrapper segments) to the
   * visual document tree {@link NodePath} (with wrapper segments) by inserting
   * intermediate wrapper IDs from the {@link IField} parent chain.
   *
   * The mapping tree mirrors the XSLT output structure where `xs:choice` and abstract
   * element wrappers have no counterpart, while the visual tree renders these wrappers
   * as nodes with their own path segments. This method reconciles the two so that
   * mapping link target paths match the connection port paths registered in the DOM.
   * A see-through guard absorbed into its field's row has no row of its own and adds no segment.
   * @param item - the mapping item to compute the path for
   * @param renderIndex - the render index whose absorption decisions apply
   */
  static computeTargetPath(item: MappingTree | MappingItem, renderIndex: TargetRenderIndex): NodePath {
    if (item instanceof MappingTree) return item.nodePath;
    const parentPath = TargetRenderService.computeTargetPath(item.parent, renderIndex);
    return renderIndex.isAbsorbed(item) ? parentPath : TargetRenderService.childTargetPath(item, parentPath);
  }

  /**
   * The child fields `fieldItem` renders: its direct `FieldItem` children, the copy-ofs drawn on a field row, plus the fields absorbed
   * from see-through guard children, which are shown as plain field rows.
   * @param fieldItem - the container field item
   * @param renderIndex - the render index whose absorption decisions apply
   */
  static getRenderedChildFields(fieldItem: FieldItem, renderIndex: TargetRenderIndex): (FieldItem | CopyOfSelector)[] {
    const fields: (FieldItem | CopyOfSelector)[] = [];
    for (const child of fieldItem.children) {
      if (child instanceof FieldItem) {
        fields.push(child);
      } else if (child instanceof CopyOfSelector && CopyOfPlacementService.getInlineField(child)) {
        fields.push(child);
      } else if (child instanceof IfItem) {
        const absorbedField = renderIndex.getAbsorbingField(child);
        if (absorbedField) fields.push(absorbedField);
      }
    }
    return fields;
  }

  /**
   * Whether `item` is an instruction rendered as a row of its own, i.e. not an absorbed guard.
   * @param item - the mapping item or tree to test
   * @param renderIndex - the render index whose absorption decisions apply
   */
  static isRenderedInstruction(item: MappingParentType, renderIndex: TargetRenderIndex): boolean {
    return item instanceof InstructionItem && !renderIndex.isAbsorbed(item);
  }

  /**
   * Whether an edit to `item` changed a see-through decision recorded in `renderIndex`, so the caller
   * must refresh the tree structurally now. It re-evaluates the guards whose decision can depend on
   * `item`: `item` itself, every guard on its ancestor chain (a guard depends on its field's
   * selector), and for a `for-each`/`for-each-group` the guards in its body (relative tests resolve
   * against the loop's `select`). Every other input of a decision changes only through paths that
   * already refresh structurally.
   * @param item - the mapping item an edit or drop just changed
   * @param renderIndex - the render index of the snapshot currently on screen
   */
  static hasDecisionChanged(item: MappingTree | MappingItem, renderIndex: TargetRenderIndex): boolean {
    let current: MappingParentType = item;
    while (current instanceof MappingItem) {
      if (TargetRenderService.isDecisionChanged(current, renderIndex)) return true;
      current = current.parent;
    }
    if (item instanceof ForEachItem || item instanceof ForEachGroupItem) {
      return TargetRenderService.hasChangedDescendant(item, renderIndex);
    }
    return false;
  }

  /**
   * The field row whose see-through guard an edit or delete on `nodeData` belongs to: `nodeData`
   * itself when it is the field's row, or its parent when `nodeData` is the separate row of the
   * field's value-of or copy-of selector. Callers read the guard the row absorbed in its snapshot
   * rather than live state, because an edit may already have changed the expression.
   * @param nodeData - the row that was edited or deleted
   * @param mapping - the mapping item or expression holder the row represents
   */
  static findGuardOwner(
    nodeData: ExpressionHolderNodeData,
    mapping: MappingParentType | IExpressionHolder | undefined,
  ): FieldItemNodeData | CopyOfFieldNodeData | undefined {
    if (nodeData instanceof FieldItemNodeData || nodeData instanceof CopyOfFieldNodeData) return nodeData;
    if (
      nodeData instanceof MappingNodeData &&
      nodeData.parent instanceof FieldItemNodeData &&
      mapping instanceof ValueSelector &&
      mapping.parent === nodeData.parent.mapping
    ) {
      return nodeData.parent;
    }
    return undefined;
  }

  /**
   * The mapping item whose row hosts `fieldItem`'s XPath input: the field itself when its selector is
   * edited inline, otherwise the selector, which gets a row of its own.
   * @param fieldItem - the field whose XPath input to find
   */
  static getSelectorInputOwner(fieldItem: FieldItem): MappingItem {
    const selector = fieldItem.soleSelector;
    return selector && !VisualizationUtilService.isInlineValueSelector(selector) ? selector : fieldItem;
  }

  private static getCopyOfPlacement(selector: CopyOfSelector): CopyOfRenderPlacement {
    const anchorFields = [...CopyOfPlacementService.getAnchorFields(selector)].sort(
      (a, b) => a.parent.fields.indexOf(a) - b.parent.fields.indexOf(b),
    );
    return {
      field: CopyOfPlacementService.getInlineField(selector),
      anchor: anchorFields[0],
      leads: CopyOfPlacementService.isLeadingCopyOf(selector),
    };
  }

  private static isDecisionChanged(item: MappingItem, renderIndex: TargetRenderIndex): boolean {
    if (item instanceof CopyOfSelector) {
      const snapshot = renderIndex.getCopyOfPlacement(item);
      if (!snapshot) return renderIndex.hasSnapshot;
      const live = TargetRenderService.getCopyOfPlacement(item);
      return snapshot.field !== live.field || snapshot.anchor !== live.anchor || snapshot.leads !== live.leads;
    }
    if (!(item instanceof IfItem)) return false;
    const isSeeThrough = !!TargetRenderService.computeSeeThroughField(item, renderIndex.sourceContext);
    return isSeeThrough !== renderIndex.isAbsorbed(item);
  }

  private static hasChangedDescendant(item: MappingItem, renderIndex: TargetRenderIndex): boolean {
    for (const child of item.children) {
      if (
        TargetRenderService.isDecisionChanged(child, renderIndex) ||
        TargetRenderService.hasChangedDescendant(child, renderIndex)
      ) {
        return true;
      }
    }
    return false;
  }

  private static childTargetPath(item: MappingItem, parentPath: NodePath): NodePath {
    if (!(item instanceof FieldItem)) return NodePath.childOf(parentPath, item.id);
    let path = parentPath;
    for (const segment of TargetRenderService.getIntermediateWrapperSegments(item.field)) {
      path = NodePath.childOf(path, segment);
    }
    const nodeId = VisualizationUtilService.isSelectedWrapperField(item.field.parent) ? item.field.id : item.id;
    return NodePath.childOf(path, nodeId);
  }

  /**
   * Collects the IDs of consecutive `wrapperKind` ancestor wrapper
   * fields, ordered from outermost to innermost. Only includes **unselected**
   * wrappers (no member selected) because selected wrappers are
   * not rendered as visual nodes — the selected member replaces them in the tree.
   * Returns an empty array when the field has no unselected wrapper ancestors, or when a wrapper
   * repeats, since a repeating wrapper renders its members at their own per-instance paths.
   */
  private static getIntermediateWrapperSegments(field: IField): string[] {
    const segments: string[] = [];
    let current = field.parent;
    while (VisualizationUtilService.isWrapperField(current)) {
      if (current.maxOccurs !== 1) {
        return [];
      }
      if (!VisualizationUtilService.isSelectedWrapperField(current)) {
        segments.push(current.id);
      }
      current = current.parent;
    }
    segments.reverse();
    return segments;
  }

  private static warnMissingRow(item: MappingItem): void {
    const isDevBuild = import.meta.env?.DEV === true && import.meta.env.MODE !== 'test';
    if (!isDevBuild || TargetRenderService.warnedItems.has(item) || !TargetRenderService.alwaysHasRow(item)) return;
    TargetRenderService.warnedItems.add(item);
    console.warn(
      `DataMapper: ${item.name} (${item.id}) is missing from the target render snapshot; a structural refresh was skipped.`,
    );
  }

  private static alwaysHasRow(item: MappingItem): boolean {
    if (item instanceof ValueSelector) return !VisualizationUtilService.isInlineValueSelector(item);
    return item instanceof FieldItem || item instanceof InstructionItem || item instanceof VariableItem;
  }
}
