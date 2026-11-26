import xmlFormat from 'xml-formatter';
import { qname } from 'xml-name-validator';

import { IDocument, IField } from '../../models/datamapper/document';
import { FieldCardinality } from '../../models/datamapper/field-cardinality';
import {
  AttributeOutputBucket,
  CopyOfSelector,
  FieldItem,
  IExpressionHolder,
  IfItem,
  InstructionItem,
  isExpressionHolder,
  MappingItem,
  MappingItemOrderBucket,
  MappingParentType,
  MappingTree,
  UnknownMappingItem,
  ValueSelector,
  VariableItem,
} from '../../models/datamapper/mapping';
import {
  AbstractFieldNodeData,
  AddMappingNodeData,
  ChoiceFieldNodeData,
  CopyOfFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  NameValidation,
  NameValidationStatus,
  NodeData,
  SequenceFieldNodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  TargetSequenceFieldNodeData,
  UnknownMappingNodeData,
  VariableNodeData,
} from '../../models/datamapper/visualization';
import { DocumentService } from '../document/document.service';
import { DocumentUtilService } from '../document/document-util.service';
import { FROM_JSON_SOURCE_SUFFIX } from '../document/json-schema/json-schema-document.model';
import { WrapperSelectionService } from '../document/wrapper-selection.service';
import { CopyOfPlacementService } from '../mapping/copy-of-placement.service';
import { MappingService } from '../mapping/mapping.service';
import { TO_JSON_TARGET_VARIABLE } from '../mapping/mapping-serializer-json-addon';
import { VisualizationUtilService } from './visualization-util.service';

interface WrapperSpec {
  createSourceNode: (parent: NodeData, field: IField) => FieldNodeData;
  createTargetNode: (parent: TargetNodeData, field: IField, mapping?: FieldItem) => TargetFieldNodeData;
  setWrapperRef: (node: FieldNodeData, wrapperField: IField) => void;
  isTargetInstance: (node: NodeData) => boolean;
  hasWrapperRef: (node: NodeData) => boolean;
  isUnconfiguredTarget: (node: NodeData, mappings: MappingItem[] | undefined) => boolean;
}

/**
 * What one {@link VisualizationService} `doGenerateNodeDataFromFields` call knows about the rows it draws, computed
 * once per call so every helper classifies the mappings the same way.
 */
interface FieldRowContext {
  parent: NodeData;
  mappings: MappingItem[] | undefined;
  /** The standalone copy-ofs that write only children, keyed by the earliest field among `fields` they return. */
  anchored: Map<IField, CopyOfSelector[]>;
  /**
   * The items that write only attributes and have no attribute row of their own among the call's fields, with their
   * index in `mappings`, in authored order. They are interleaved with the attribute rows.
   */
  rowlessAttributeItems: { item: MappingItem; index: number }[];
  /** The items that can write both attributes and children, in authored order, drawn after the attribute rows. */
  mixedItems: MappingItem[];
  /**
   * Whether `item` is drawn before the element rows by the call that owns the mappings: a rowless attribute item or a
   * mixed item. Every other row-drawing step skips these. Among the items one field row or one wrapper would draw,
   * it removes exactly the mixed ones, since a rowless attribute item maps no element and no attribute among the
   * call's fields. In a call that borrows its mappings, the fields hold no attribute, so it also covers an
   * attribute-only instruction such as `xsl:if { xsl:attribute X }`, which the owning element draws on the `X` row.
   */
  isDrawnBeforeElementRows: (item: MappingItem) => boolean;
  /**
   * The authored position of each attribute field that has a row item: the index in `mappings` of the first item
   * drawn on its row ({@link MappingService.filterMappingsForField} without the mixed items).
   */
  attributeRowPositions: Map<IField, number>;
}

/** The mappings that touch a choice or abstract wrapper, as {@link VisualizationService} draws them. */
interface WrapperMappingItems {
  fieldItems: FieldItem[];
  instructionItems: InstructionItem[];
  /** Whether an item drawn before the element rows maps a member, so the wrapper still holds mappings. */
  heldByMovedItems: boolean;
}

const CHOICE_WRAPPER: WrapperSpec = {
  createSourceNode: (parent, field) => new ChoiceFieldNodeData(parent, field),
  createTargetNode: (parent, field, mapping) => new TargetChoiceFieldNodeData(parent, field, mapping),
  setWrapperRef: (node, wrapperField) => {
    (node as ChoiceFieldNodeData | TargetChoiceFieldNodeData).choiceField = wrapperField;
  },
  isTargetInstance: (node) => node instanceof TargetChoiceFieldNodeData,
  hasWrapperRef: (node) => !!(node as TargetChoiceFieldNodeData).choiceField,
  isUnconfiguredTarget: (node, mappings) => {
    if (node.isSource) return false;
    if (!(node instanceof TargetChoiceFieldNodeData)) return false;
    if (node.choiceField && node.mapping instanceof FieldItem) return false;
    if (!mappings) return true;
    const wrapperField = node.field;
    return !mappings.some(
      (m) =>
        (m instanceof FieldItem && (m.field === wrapperField || DocumentService.isDescendant(wrapperField, m.field))) ||
        (m instanceof InstructionItem &&
          MappingService.getInstructionFields(m).some(
            (f) => f === wrapperField || DocumentService.isDescendant(wrapperField, f),
          )),
    );
  },
};

const ABSTRACT_WRAPPER: WrapperSpec = {
  createSourceNode: (parent, field) => new AbstractFieldNodeData(parent, field),
  createTargetNode: (parent, field, mapping) => new TargetAbstractFieldNodeData(parent, field, mapping),
  setWrapperRef: (node, wrapperField) => {
    (node as AbstractFieldNodeData | TargetAbstractFieldNodeData).abstractField = wrapperField;
  },
  isTargetInstance: (node) => node instanceof TargetAbstractFieldNodeData,
  hasWrapperRef: (node) => !!(node as TargetAbstractFieldNodeData).abstractField,
  isUnconfiguredTarget: (node, mappings) => {
    if (node.isSource) return false;
    if (!(node instanceof TargetAbstractFieldNodeData)) return false;
    if (node.abstractField && node.mapping instanceof FieldItem) return false;
    if (!mappings) return true;
    const wrapperField = node.field;
    return !mappings.some(
      (m) =>
        (m instanceof FieldItem && (m.field === wrapperField || DocumentService.isDescendant(wrapperField, m.field))) ||
        (m instanceof InstructionItem &&
          MappingService.getInstructionFields(m).some(
            (f) => f === wrapperField || DocumentService.isDescendant(wrapperField, f),
          )),
    );
  },
};

const SEQUENCE_WRAPPER: WrapperSpec = {
  createSourceNode: (parent, field) => new SequenceFieldNodeData(parent, field),
  createTargetNode: (parent, field, mapping) => new TargetSequenceFieldNodeData(parent, field, mapping),
  // When a sequence is the selected member of an xs:choice, keep a reference to that choice
  // wrapper so the choice context menu recognises this node as a selected branch (change/clear).
  setWrapperRef: (node, wrapperField) => {
    (node as SequenceFieldNodeData | TargetSequenceFieldNodeData).choiceField = wrapperField;
  },
  isTargetInstance: (node) => node instanceof TargetSequenceFieldNodeData,
  // A sequence is never itself the mapped field — unlike a selected choice/abstract member,
  // it's a transparent container whose children are mapped independently. resolveWrapperNodeMappings
  // must keep walking up to the real mapped ancestor rather than treating the sequence's own
  // (nonexistent) mapping as the source of its children's mappings.
  hasWrapperRef: () => false,
  isUnconfiguredTarget: () => false,
};

// Regex patterns for DnD ID generation
const FORWARD_SLASH_REGEX = /\//g;
const COLON_REGEX = /:/g;

const CAMEL_RESERVED_PARAMETER_NAMES: ReadonlySet<string> = new Set(['exchange', 'in', 'out']);

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
    const isDocument = nodeData.isDocument;
    const isPrimitive = nodeData.isPrimitive;

    if (isDocument) {
      if (isPrimitive) {
        return VisualizationService.generatePrimitiveDocumentChildren(nodeData as DocumentNodeData);
      }
      return VisualizationService.generateStructuredDocumentChildren(nodeData as DocumentNodeData);
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
      .filter((child) => !VisualizationUtilService.isInlineValueSelector(child))
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
   * Returns the spec to recurse into when a wrapper's selected member is itself a nested
   * choice/abstract wrapper that should take over rendering (per {@link WrapperSelectionService.shouldFlattenNestedWrapper}),
   * or `undefined` when no recursion is needed (no selection, a non-wrapper member, or a sequence
   * branch — which renders in place). Keeps {@link doGenerateNodeDataFromWrapperField} flat.
   */
  private static resolveNestedWrapperSpec(field: IField, selectedMember: IField | undefined): WrapperSpec | undefined {
    if (!selectedMember?.wrapperKind || !field.wrapperKind) return undefined;
    if (selectedMember.wrapperKind === 'sequence') return undefined;
    if (!WrapperSelectionService.shouldFlattenNestedWrapper(field.wrapperKind, selectedMember)) return undefined;
    return selectedMember.wrapperKind === 'choice' ? CHOICE_WRAPPER : ABSTRACT_WRAPPER;
  }

  /**
   * Creates a {@link ChoiceFieldNodeData} or {@link TargetChoiceFieldNodeData} for a choice wrapper field.
   *
   * When no member is selected ({@link DocumentUtilService.getSelectedMember} returns `undefined`), the returned node's
   * `field` is the choice wrapper itself and `choiceField` is `undefined`. {@link createNodeTitle}
   * recognises this state and returns the member label string (e.g. `"(email | phone)"`), while
   * {@link NodeTitle} renders it alongside a `<Label>choice</Label>` badge.
   *
   * When a member is selected, the returned node's `field` is the selected member and `choiceField`
   * is set to the choice wrapper. {@link createNodeTitle} returns the member's own display name in
   * that case, and {@link NodeTitle} renders it as a plain field title without the choice badge.
   */
  private static doGenerateNodeDataFromWrapperField(
    parent: NodeData,
    field: IField,
    mappings: MappingItem[] | undefined,
    spec: WrapperSpec,
  ): NodeData | null {
    const selectedMember = DocumentUtilService.getSelectedMember(field);

    // When the selected member is itself a nested choice/abstract wrapper, it takes over rendering
    // via its own spec — recurse so it presents its own selection UI.
    const recurseSpec = VisualizationService.resolveNestedWrapperSpec(field, selectedMember);
    if (recurseSpec && selectedMember) {
      return VisualizationService.doGenerateNodeDataFromWrapperField(parent, selectedMember, mappings, recurseSpec);
    }

    // A selected xs:sequence renders in place as a sequence node that keeps a back-reference to
    // this choice wrapper (set by the spec's setWrapperRef in the shared tail below), so the
    // choice context menu can still change or clear the branch.
    const effectiveSpec = selectedMember?.wrapperKind === 'sequence' ? SEQUENCE_WRAPPER : spec;

    const nodeField = selectedMember ?? field;
    if (parent.isSource) {
      const node = effectiveSpec.createSourceNode(parent, nodeField);
      if (selectedMember) effectiveSpec.setWrapperRef(node, field);
      return node;
    }

    const mappingsForMember =
      selectedMember && mappings ? MappingService.filterMappingsForField(mappings, selectedMember) : [];
    const mapping = mappingsForMember.find((m) => m instanceof FieldItem) as FieldItem;
    if (mappingsForMember.length > 0 && !mapping) return null;
    const node = effectiveSpec.createTargetNode(parent as TargetNodeData, nodeField, mapping);
    if (selectedMember) effectiveSpec.setWrapperRef(node, field);
    return node;
  }

  private static generateCollectionWrapperNodes(
    ctx: FieldRowContext,
    field: IField,
    renderedNodes: NodeData[],
  ): NodeData[] {
    const mappings = ctx.mappings ?? [];
    const touchesWrapper = (m: InstructionItem) =>
      MappingService.getInstructionFields(m).some((f) => f === field || DocumentService.isDescendant(field, f));
    const fieldItems = mappings.filter(
      (m): m is FieldItem =>
        m instanceof FieldItem && (m.field === field || DocumentService.isDescendant(field, m.field)),
    );
    const instructionItems = mappings.filter(
      (m): m is InstructionItem =>
        m instanceof InstructionItem &&
        !ctx.isDrawnBeforeElementRows(m) &&
        !VisualizationService.isExistingMapping(renderedNodes as TargetNodeData[], m) &&
        touchesWrapper(m),
    );
    const heldByMovedItems = mappings.some(
      (m) => m instanceof InstructionItem && ctx.isDrawnBeforeElementRows(m) && touchesWrapper(m),
    );
    return VisualizationService.generateWrapperNodes(ctx, field, { fieldItems, instructionItems, heldByMovedItems });
  }

  private static doGenerateNodeDataFromFields(
    parent: NodeData,
    fields: IField[],
    mappings?: MappingItem[],
    owned = true,
  ): NodeData[] {
    const ctx = VisualizationService.createFieldRowContext(parent, fields, mappings);
    const answer: NodeData[] = [];
    VisualizationService.collectPriorityMappings(answer, parent, mappings);

    if (parent.isSource || !owned) {
      for (const field of fields) {
        VisualizationService.processField(answer, ctx, field);
      }
    } else {
      VisualizationService.processAttributeFields(
        answer,
        ctx,
        fields.filter((field) => field.isAttribute),
      );
      VisualizationService.collectMixedItems(answer, ctx);
      for (const field of fields.filter((f) => !f.isAttribute)) {
        VisualizationService.processField(answer, ctx, field);
      }
    }

    VisualizationService.collectUnrenderedMappings(answer, ctx);
    return answer;
  }

  /**
   * The rows of a choice or abstract wrapper among its element's rows: the wrapper row, or, when the wrapper repeats
   * or an instruction maps a member, its mapped items followed by an "Add" row for a repeating wrapper.
   *
   * An item drawn before the element rows (see {@link FieldRowContext.isDrawnBeforeElementRows}) still counts as a
   * mapping the wrapper holds, so moving it up leaves the wrapper's structure in place: a repeating wrapper keeps its
   * "Add" row, and a wrapper with other mapped members keeps drawing them. A repeating target wrapper is never
   * selected at document level (`ChoiceFieldService.dispatchChoiceSelection` routes it to per-instance
   * selection), so its wrapper row never stood for such a mapping. When nothing is left to draw and the wrapper
   * doesn't repeat itself, the wrapper row is drawn instead.
   */
  private static generateWrapperNodes(ctx: FieldRowContext, field: IField, items: WrapperMappingItems): NodeData[] {
    const { fieldItems, instructionItems, heldByMovedItems } = items;
    const holdsInstructions = instructionItems.length > 0 || heldByMovedItems;
    if (
      (fieldItems.length === 0 && !holdsInstructions) ||
      (!DocumentService.isCollectionField(field) && !holdsInstructions)
    ) {
      return VisualizationService.generateWrapperRow(ctx, field);
    }
    const nodes: NodeData[] = [];
    const allItems: MappingItem[] = [...fieldItems, ...instructionItems];
    for (const item of allItems.sort((left, right) => MappingService.sortMappingItem(left, right))) {
      if (item instanceof FieldItem) {
        nodes.push(new FieldItemNodeData(ctx.parent as TargetNodeData, item, field));
      } else {
        nodes.push(VisualizationService.createNodeDataFromMappingItem(ctx.parent as TargetNodeData, item));
      }
    }
    if (FieldCardinality.isCollection(field)) {
      nodes.push(new AddMappingNodeData(ctx.parent as TargetNodeData, field));
    }
    return nodes.length > 0 ? nodes : VisualizationService.generateWrapperRow(ctx, field);
  }

  private static generateWrapperRow(ctx: FieldRowContext, field: IField): NodeData[] {
    const wrapperSpec = field.wrapperKind === 'choice' ? CHOICE_WRAPPER : ABSTRACT_WRAPPER;
    const node = VisualizationService.doGenerateNodeDataFromWrapperField(ctx.parent, field, ctx.mappings, wrapperSpec);
    return node ? [node] : [];
  }

  private static createFieldRowContext(
    parent: NodeData,
    fields: IField[],
    mappings: MappingItem[] | undefined,
  ): FieldRowContext {
    const buckets = new Map<MappingItem, AttributeOutputBucket | undefined>();
    for (const item of mappings ?? []) {
      buckets.set(item, CopyOfPlacementService.getAttributeOutputBucket(item));
    }
    const context: FieldRowContext = {
      parent,
      mappings,
      anchored: VisualizationService.groupAnchoredCopyOfs(fields, mappings, buckets),
      rowlessAttributeItems: [],
      mixedItems: [],
      isDrawnBeforeElementRows: () => false,
      attributeRowPositions: new Map(),
    };
    if (!parent.isSource && mappings) {
      VisualizationService.classifyAttributeItems(context, fields, mappings, buckets);
    }
    return context;
  }

  private static classifyAttributeItems(
    context: FieldRowContext,
    fields: IField[],
    mappings: MappingItem[],
    buckets: Map<MappingItem, AttributeOutputBucket | undefined>,
  ): void {
    const isMixed = (item: MappingItem) => buckets.get(item) === MappingItemOrderBucket.ATTRIBUTES_AND_CHILDREN;
    const attributeRowItems = new Set<MappingItem>();
    for (const field of fields) {
      if (!field.isAttribute) continue;
      const rowItems = MappingService.filterMappingsForField(mappings, field).filter((item) => !isMixed(item));
      if (rowItems.length === 0) continue;
      context.attributeRowPositions.set(field, mappings.indexOf(rowItems[0]));
      for (const item of rowItems) {
        attributeRowItems.add(item);
      }
    }
    const drawnBeforeElementRows = new Set<MappingItem>();
    for (const [index, item] of mappings.entries()) {
      if (item instanceof FieldItem || !buckets.get(item) || attributeRowItems.has(item)) continue;
      if (isMixed(item)) {
        context.mixedItems.push(item);
      } else {
        context.rowlessAttributeItems.push({ item, index });
      }
      drawnBeforeElementRows.add(item);
    }
    context.isDrawnBeforeElementRows = (item) => drawnBeforeElementRows.has(item);
  }

  /**
   * Draws the attribute rows of an element in schema order, with the items that write only attributes and have no
   * row of their own placed among them by authored order: each goes just above the first attribute row whose items
   * it was authored before, otherwise below the last attribute row. The serializer keeps authored order among the
   * items that write only attributes, and the later attribute of the same name wins in XSLT, so this shows the same
   * winner as the stylesheet whenever the mapped attributes were authored in schema order. An attribute row held only
   * by an item that writes both has no position and pulls nothing.
   *
   * `attributeFields` is a new array: `FieldOrderService.getFieldOrderPath` reads the live `fields` arrays by index,
   * so they must not be reordered. Attribute fields that sit after the elements in `fields`, such as `xsi:nil` on an
   * inline nillable complex type or an imported attribute the schema doesn't declare, are drawn here too.
   */
  private static processAttributeFields(answer: NodeData[], ctx: FieldRowContext, attributeFields: IField[]): void {
    const pending = ctx.rowlessAttributeItems;
    let next = 0;
    for (const field of attributeFields) {
      const position = ctx.attributeRowPositions.get(field);
      while (position !== undefined && next < pending.length && pending[next].index < position) {
        answer.push(
          VisualizationService.createNodeDataFromMappingItem(ctx.parent as TargetNodeData, pending[next].item),
        );
        next++;
      }
      VisualizationService.processField(answer, ctx, field);
    }
    for (const { item } of pending.slice(next)) {
      answer.push(VisualizationService.createNodeDataFromMappingItem(ctx.parent as TargetNodeData, item));
    }
  }

  private static collectMixedItems(answer: NodeData[], ctx: FieldRowContext): void {
    for (const item of ctx.mixedItems) {
      answer.push(VisualizationService.createNodeDataFromMappingItem(ctx.parent as TargetNodeData, item));
    }
  }

  private static processField(answer: NodeData[], ctx: FieldRowContext, field: IField): void {
    // A copy-of of several fields that writes only children is written where the earliest of them sits in the
    // target's sequence.
    for (const copyOf of ctx.anchored.get(field) ?? []) {
      answer.push(VisualizationService.createNodeDataFromMappingItem(ctx.parent as TargetNodeData, copyOf));
    }
    if (VisualizationService.processWrapperField(answer, ctx, field)) return;
    VisualizationService.processRegularField(answer, ctx, field);
  }

  /**
   * The standalone copy-ofs that return fields among `fields` and write only children, keyed by the earliest field
   * they return, the one the serializer places them before. A copy-of that is 1-to-1 with a field is drawn on that
   * field's row instead, one that writes attributes is drawn with the attribute rows, and one that returns none of
   * `fields` stays after the fields.
   */
  private static groupAnchoredCopyOfs(
    fields: IField[],
    mappings: MappingItem[] | undefined,
    buckets: Map<MappingItem, AttributeOutputBucket | undefined>,
  ): Map<IField, CopyOfSelector[]> {
    const grouped = new Map<IField, CopyOfSelector[]>();
    for (const m of mappings ?? []) {
      if (!(m instanceof CopyOfSelector) || CopyOfPlacementService.isLeadingCopyOf(m)) continue;
      if (CopyOfPlacementService.getInlineField(m) || buckets.get(m)) continue;
      const anchor = CopyOfPlacementService.getAnchorFields(m)
        .filter((f) => fields.includes(f))
        .sort((a, b) => fields.indexOf(a) - fields.indexOf(b))[0];
      if (!anchor) continue;
      grouped.set(anchor, [...(grouped.get(anchor) ?? []), m]);
    }
    return grouped;
  }

  private static collectPriorityMappings(
    answer: NodeData[],
    parent: NodeData,
    mappings: MappingItem[] | undefined,
  ): void {
    if (!mappings) return;
    // Only an empty copy-of leads. Any other separate copy-of is drawn with the attribute rows when it writes
    // attributes, at its anchor field, or after the fields, where the serializer emits it.
    let filterPriorityMappingItem: (m: MappingItem) => boolean = (m) =>
      m instanceof UnknownMappingItem || m instanceof VariableItem || CopyOfPlacementService.isLeadingCopyOf(m);
    if (parent.isPrimitive) {
      filterPriorityMappingItem = (m) =>
        m instanceof UnknownMappingItem ||
        VisualizationUtilService.isInlineValueSelector(m) ||
        CopyOfPlacementService.isLeadingCopyOf(m);
    }
    for (const m of mappings.filter(filterPriorityMappingItem)) {
      answer.push(VisualizationService.createNodeDataFromMappingItem(parent as TargetNodeData, m));
    }
  }

  private static processRegularField(answer: NodeData[], ctx: FieldRowContext, field: IField): void {
    const { parent, mappings } = ctx;
    const mappingsForField = mappings ? MappingService.filterMappingsForField(mappings, field) : [];
    if (mappingsForField.length === 0) {
      const fieldNodeData = parent.isSource
        ? new FieldNodeData(parent, field)
        : new TargetFieldNodeData(parent as TargetNodeData, field);
      answer.push(fieldNodeData);
      return;
    }
    for (const mapping of mappingsForField
      .filter(
        (mapping) =>
          !ctx.isDrawnBeforeElementRows(mapping) &&
          !VisualizationService.isExistingMapping(answer as TargetNodeData[], mapping),
      )
      .sort((left, right) => MappingService.sortMappingItem(left, right))) {
      answer.push(VisualizationService.createNodeDataFromMappingItem(parent as TargetNodeData, mapping));
    }
    if (DocumentService.isCollectionField(field)) {
      answer.push(new AddMappingNodeData(parent as TargetNodeData, field));
    }
  }

  private static collectUnrenderedMappings(answer: NodeData[], ctx: FieldRowContext): void {
    const { parent, mappings } = ctx;
    if (!mappings || VisualizationService.isUnconfiguredTargetWrapper(parent, mappings)) return;
    const rendered = new Set<MappingParentType | undefined>();
    for (const n of answer.filter((x): x is TargetNodeData => 'mapping' in x)) {
      rendered.add(n.mapping);
      if ((n instanceof FieldItemNodeData || n instanceof CopyOfFieldNodeData) && n.autoOptionalIfItem)
        rendered.add(n.autoOptionalIfItem);
    }
    for (const m of mappings) {
      if (
        !rendered.has(m) &&
        !ctx.isDrawnBeforeElementRows(m) &&
        !(m instanceof FieldItem) &&
        !VisualizationUtilService.isInlineValueSelector(m) &&
        !(m instanceof VariableItem) &&
        !(m instanceof UnknownMappingItem)
      ) {
        answer.push(VisualizationService.createNodeDataFromMappingItem(parent as TargetNodeData, m));
      }
    }
  }

  private static isExistingMapping(nodes: TargetNodeData[], mapping: MappingItem) {
    return nodes.some((node) => 'mapping' in node && node.mapping === mapping);
  }

  private static processWrapperField(answer: NodeData[], ctx: FieldRowContext, field: IField): boolean {
    const { parent, mappings } = ctx;
    if ((field.wrapperKind === 'choice' || field.wrapperKind === 'abstract') && !parent.isSource && mappings) {
      answer.push(...VisualizationService.generateCollectionWrapperNodes(ctx, field, answer));
      return true;
    }
    if (field.wrapperKind === 'choice') {
      const node = VisualizationService.doGenerateNodeDataFromWrapperField(parent, field, mappings, CHOICE_WRAPPER);
      if (node) answer.push(node);
      return true;
    }
    if (field.wrapperKind === 'abstract') {
      const node = VisualizationService.doGenerateNodeDataFromWrapperField(parent, field, mappings, ABSTRACT_WRAPPER);
      if (node) answer.push(node);
      return true;
    }
    if (field.wrapperKind === 'sequence') {
      const node = VisualizationService.doGenerateNodeDataFromWrapperField(parent, field, mappings, SEQUENCE_WRAPPER);
      if (node) answer.push(node);
      return true;
    }
    return false;
  }

  /**
   * Resolves the child fields to render for a wrapper node (choice or abstract).
   *
   * Target-side gate: unconfigured target wrappers return `[]` — children are
   * hidden until the user picks a member/substitute via the context menu.
   * The gate is driven by FieldItem presence ({@link isUnconfiguredTargetWrapper}),
   * not the IField selection property (`selectedMemberIndex`/`selectedMemberQName`),
   * because FieldItem is the authoritative target-side mapping state.
   * The IField property is shared with source-side where the gate does not apply.
   *
   * FieldItem states for wrapper fields:
   * - Bare schema-driven: no FieldItem exists — wrapper is unconfigured
   * - Inside instruction: FieldItem with `field` = wrapper IField
   * - After selection: FieldItem with `field` = selected candidate/member,
   *   `isUserCreated` preserved from creation
   */
  private static resolveWrapperNodeFields(field: IField): IField[] {
    if (!field.wrapperKind) {
      DocumentUtilService.resolveTypeFragment(field);
      return field.fields;
    }
    const selectedMember = DocumentUtilService.getSelectedMember(field);
    return selectedMember ? [field] : field.fields;
  }

  private static isUnconfiguredTargetWrapper(parent: NodeData, mappings: MappingItem[] | undefined): boolean {
    return VisualizationService.resolveWrapperSpec(parent)?.spec.isUnconfiguredTarget(parent, mappings) ?? false;
  }

  private static resolveWrapperSpec(node: NodeData): { node: FieldNodeData; spec: WrapperSpec } | null {
    if (node instanceof ChoiceFieldNodeData || node instanceof TargetChoiceFieldNodeData)
      return { node, spec: CHOICE_WRAPPER };
    if (node instanceof AbstractFieldNodeData || node instanceof TargetAbstractFieldNodeData)
      return { node, spec: ABSTRACT_WRAPPER };
    return null;
  }

  /**
   * Resolves mapping children for a wrapper node. Unselected target wrappers
   * have no mapping tree counterpart, so we walk up through any nested unselected
   * wrappers to find the nearest real ancestor that carries mapping children.
   *
   * `owned` is `true` when the mappings belong to the node itself: a source node, or a selected choice or abstract
   * member that keeps a reference to its wrapper. It is `false` when they are borrowed from an ancestor, which is
   * always the case for a sequence node. A borrowing call draws only its members' rows; the owning element draws the
   * items that write attributes. On the source side `owned` is `true` too, where nothing is drawn by ownership.
   */
  private static resolveWrapperNodeMappings(
    parent: NodeData,
    spec: WrapperSpec,
  ): { mappings: MappingItem[] | undefined; owned: boolean } {
    if (!spec.isTargetInstance(parent) || spec.hasWrapperRef(parent)) {
      return {
        mappings: 'mapping' in parent ? (parent as TargetNodeData).mapping?.children : undefined,
        owned: true,
      };
    }
    let ancestor: TargetNodeData = (parent as TargetFieldNodeData).parent;
    while (VisualizationService.resolveWrapperSpec(ancestor)?.spec.isTargetInstance(ancestor)) {
      ancestor = (ancestor as TargetFieldNodeData).parent;
    }
    return { mappings: ancestor.mapping?.children, owned: false };
  }

  /**
   * Returns children for choice, field, and mapping nodes (i.e. non-document nodes).
   * Resolves type fragments for complex fields before generating children.
   * @param parent - The non-document parent node.
   * @returns An array of child {@link NodeData} instances.
   */
  static generateNonDocumentNodeDataChildren(parent: NodeData): NodeData[] {
    if (parent instanceof FieldItemNodeData && parent.wrapperField && parent.field === parent.wrapperField) return [];
    const wrapperMatch = VisualizationService.resolveWrapperSpec(parent);
    if (wrapperMatch) {
      const { node, spec } = wrapperMatch;
      const { mappings, owned } = VisualizationService.resolveWrapperNodeMappings(node, spec);
      if (VisualizationService.isUnconfiguredTargetWrapper(node, mappings)) return [];
      const fields = VisualizationService.resolveWrapperNodeFields(node.field);
      return VisualizationService.doGenerateNodeDataFromFields(node, fields, mappings, owned);
    }
    if (parent instanceof SequenceFieldNodeData || parent instanceof TargetSequenceFieldNodeData) {
      const { mappings, owned } = VisualizationService.resolveWrapperNodeMappings(parent, SEQUENCE_WRAPPER);
      return VisualizationService.doGenerateNodeDataFromFields(
        parent,
        VisualizationService.resolveWrapperNodeFields(parent.field),
        mappings,
        owned,
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
    if (parent instanceof CopyOfFieldNodeData) {
      // The copied subtree is not mapped field by field: its schema fields show as plain, unmapped rows.
      DocumentUtilService.resolveTypeFragment(parent.field);
      return VisualizationService.doGenerateNodeDataFromFields(parent, parent.field.fields);
    }
    if (parent instanceof MappingNodeData) {
      if (!parent.mapping?.children) return [];
      const sorted = [...parent.mapping.children].sort((left, right) => MappingService.sortMappingItem(left, right));
      return sorted.map((m) => VisualizationService.createNodeDataFromMappingItem(parent, m));
    }
    return [];
  }

  private static findWrapperFieldForFieldItem(fieldItem: FieldItem): IField | undefined {
    const current = MappingService.findOutputParent(fieldItem);
    let fieldsToSearch: IField[];
    if (current instanceof FieldItem) {
      fieldsToSearch = current.field.fields;
    } else if (current instanceof MappingTree) {
      fieldsToSearch = fieldItem.field.ownerDocument.fields;
    } else {
      return undefined;
    }
    for (const child of fieldsToSearch) {
      if (
        (child.wrapperKind === 'abstract' || child.wrapperKind === 'choice') &&
        (child === fieldItem.field || DocumentService.isDescendant(child, fieldItem.field))
      ) {
        return child;
      }
    }
    return undefined;
  }

  private static createNodeDataFromMappingItem(parent: TargetNodeData, mapping: MappingItem): MappingNodeData {
    if (mapping instanceof IfItem) {
      const absorbingField = parent.renderIndex.getAbsorbingField(mapping);
      if (absorbingField instanceof CopyOfSelector) {
        // The snapshot may be older than the copy-of's expression; when it no longer selects a field the
        // guard is simply drawn as a regular `if` until the next rebuild.
        const field = CopyOfPlacementService.getInlineField(absorbingField);
        if (field) {
          const nodeData = new CopyOfFieldNodeData(parent, absorbingField, field);
          nodeData.autoOptionalIfItem = mapping;
          return nodeData;
        }
      } else if (absorbingField) {
        const wrapperField = VisualizationService.findWrapperFieldForFieldItem(absorbingField);
        const nodeData = new FieldItemNodeData(parent, absorbingField, wrapperField);
        nodeData.autoOptionalIfItem = mapping;
        return nodeData;
      }
    }
    if (mapping instanceof FieldItem) {
      const wrapperField = VisualizationService.findWrapperFieldForFieldItem(mapping);
      return new FieldItemNodeData(parent, mapping, wrapperField);
    }
    if (mapping instanceof CopyOfSelector) {
      const field = CopyOfPlacementService.getInlineField(mapping);
      if (field) return new CopyOfFieldNodeData(parent, mapping, field);
    }
    if (mapping instanceof UnknownMappingItem) return new UnknownMappingNodeData(parent, mapping);
    if (mapping instanceof VariableItem) return new VariableNodeData(parent, mapping);
    return new MappingNodeData(parent, mapping);
  }

  /**
   * Returns `true` if the node has renderable children in the visualization tree.
   * @param nodeData - The node to inspect.
   */
  static hasChildren(nodeData: NodeData) {
    if (nodeData instanceof DocumentNodeData) return VisualizationService.documentHasChildren(nodeData);
    if (nodeData instanceof FieldNodeData) return VisualizationService.fieldNodeHasChildren(nodeData);
    if (nodeData instanceof FieldItemNodeData) return VisualizationService.fieldItemNodeHasChildren(nodeData);
    if (nodeData instanceof CopyOfFieldNodeData) return DocumentService.hasChildren(nodeData.field);
    if (nodeData instanceof MappingNodeData) return nodeData.mapping.children.length > 0;
    return false;
  }

  private static documentHasChildren(nodeData: DocumentNodeData): boolean {
    if (DocumentService.hasFields(nodeData.document)) return true;
    return (
      nodeData instanceof TargetDocumentNodeData &&
      nodeData.isPrimitive &&
      nodeData.mapping.children.some((m) => !VisualizationUtilService.isInlineValueSelector(m))
    );
  }

  /**
   * Returns whether a selected target wrapper node (choice/abstract) is expandable.
   * A FieldItem that exists solely because of the selection but has nothing inside
   * should not show an expand arrow — only schema sub-fields or non-trivial mapping
   * children (e.g. instructions) justify expansion.
   */
  private static selectedWrapperHasChildren(nodeData: TargetFieldNodeData): boolean {
    const mapping = nodeData.mapping;
    if (!(mapping instanceof FieldItem)) return false;
    return (
      DocumentService.hasChildren(nodeData.field) ||
      mapping.children.some((m) => !VisualizationUtilService.isInlineValueSelector(m))
    );
  }

  private static fieldNodeHasChildren(nodeData: FieldNodeData): boolean {
    if (VisualizationService.resolveWrapperSpec(nodeData)?.spec.isTargetInstance(nodeData)) {
      return VisualizationService.selectedWrapperHasChildren(nodeData as TargetFieldNodeData);
    }
    return DocumentService.hasChildren(nodeData.field);
  }

  private static fieldItemNodeHasChildren(nodeData: FieldItemNodeData): boolean {
    if (nodeData.wrapperField && nodeData.field === nodeData.wrapperField) return false;
    return (
      DocumentService.hasChildren(nodeData.field) ||
      nodeData.mapping.children.some((m) => !VisualizationUtilService.isInlineValueSelector(m))
    );
  }

  /**
   * Returns `true` if the node should be collapsed on initial render.
   * Document nodes are never collapsed; recursive fields and nodes beyond the expanded rank threshold are.
   * @param nodeData - The node to evaluate.
   * @param initialExpandedRank - The maximum depth rank that should be auto-expanded.
   * @param rank - The current depth rank of the node.
   */
  static shouldCollapseByDefault(nodeData: NodeData, initialExpandedRank: number, rank: number) {
    if (nodeData.isDocument) return false;
    const isRecursiveField = VisualizationUtilService.isRecursiveField(nodeData);
    return isRecursiveField || rank > initialExpandedRank;
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
      return nodeData.mapping.children.find((c) => VisualizationUtilService.isInlineValueSelector(c)) as
        | ValueSelector
        | undefined;
    }
  }

  /**
   * Serializes a DOM {@link Element} to a pretty-printed XML string.
   * Falls back to the raw serialized output when formatting fails.
   * @param element - The DOM element to serialize.
   */
  static formatXml(element: Element): string {
    const rawXml = new XMLSerializer().serializeToString(element);
    try {
      return xmlFormat(rawXml);
    } catch {
      return rawXml;
    }
  }

  /**
   * Returns the member label string (e.g. `"email | phone | fax"`) for a choice wrapper field,
   * or — when `field` is itself an xs:sequence — the comma-joined label for its own children
   * (e.g. `"key, value"`).
   *
   * `|` separates choice alternatives (mutually exclusive, OR), while `,` groups an xs:sequence's
   * fields (which must appear together, AND) — matching the convention used by other integration
   * tools. Direct members are dissolved one level deep: a nested member whose own separator
   * matches the outer one merges flat into the same list (e.g. an abstract's substitutes merge
   * into the choice's `|` list); one whose separator differs — crossing the OR/AND boundary — is
   * rendered as its own parenthesised sub-group, e.g. `"dataValue | (key, value)"`. Any wrapper
   * found one level beyond that (e.g. a choice/abstract nested inside a sequence branch) is shown
   * as a bracketed placeholder — `[choice]`, `[abstract]`, `[sequence]` — instead of being
   * dissolved further, since an abstract can carry an unbounded number of substitutes and full
   * recursive dissolution would make the label unreadable. Brackets distinguish the placeholder
   * from a real field name, since `choice`/`abstract`/`sequence` could themselves be field names.
   * @param field - The choice (or sequence) wrapper field whose members should be described.
   */
  static getChoiceMemberLabel(field: IField): string {
    const separator = field.wrapperKind === 'sequence' ? ', ' : ' | ';
    const labels = VisualizationService.collectMemberLabels(field.fields ?? [], separator, 0);
    return VisualizationService.joinMemberLabels(labels, separator);
  }

  /**
   * Flat-maps each member into its label(s) for the given outer separator, dissolving one level
   * of nested choice/abstract/sequence wrappers. A member reached at `depth >= 1` (i.e. nested
   * inside an already-dissolved wrapper) is rendered as a `[wrapperKind]` placeholder rather than
   * being dissolved further, keeping the label bounded regardless of how many substitutes or
   * members that deeper wrapper has.
   */
  private static collectMemberLabels(members: IField[], outerSeparator: string, depth: number): string[] {
    return members.flatMap((m) => {
      if (!m.wrapperKind) return [m.displayName ?? m.name];
      if (depth >= 1) return [`[${m.wrapperKind}]`];
      const innerSeparator = m.wrapperKind === 'sequence' ? ', ' : ' | ';
      const innerLabels = VisualizationService.collectMemberLabels(m.fields ?? [], innerSeparator, depth + 1);
      if (innerLabels.length === 0) return [m.displayName ?? m.name];
      return innerSeparator === outerSeparator ? innerLabels : [`(${innerLabels.join(innerSeparator)})`];
    });
  }

  /**
   * Joins member labels with `separator`, truncating to `"+N more"` beyond 3 entries. Unlike
   * {@link collectMemberLabels}'s sub-groups, the top-level result is not itself wrapped in
   * parentheses — the label is shown standalone (as a node title or badge), not embedded in a
   * further list, so an outer pair would be redundant.
   */
  private static joinMemberLabels(labels: string[], separator: string): string {
    if (labels.length === 0) return 'empty';
    const maxVisible = 3;
    if (labels.length > maxVisible) {
      return `${labels.slice(0, maxVisible).join(separator)}${separator}+${labels.length - maxVisible} more`;
    }
    return labels.join(separator);
  }

  /**
   * Returns the candidate label string (e.g. `"Cat | Dog | Fish"`) for an unselected
   * abstract wrapper node. Returns `"no candidates"` when the wrapper has zero candidates.
   * @param node - The abstract wrapper node whose candidates should be described.
   */
  static getAbstractMemberLabel(node: AbstractFieldNodeData | TargetAbstractFieldNodeData): string {
    return VisualizationService.getAbstractMemberLabelFromField(node.field);
  }

  private static getAbstractMemberLabelFromField(field: IField): string {
    const members = field.fields ?? [];
    const labels = members.map((m) => m.displayName ?? m.name);
    if (labels.length === 0) return 'no candidates';
    const maxVisible = 3;
    if (labels.length > maxVisible) {
      return `${labels.slice(0, maxVisible).join(' | ')} | +${labels.length - maxVisible} more`;
    }
    return labels.join(' | ');
  }

  /**
   * Returns the display title for a node. Unselected choice wrappers delegate to
   * {@link getChoiceMemberLabel} and unselected abstract wrappers delegate to
   * {@link getAbstractMemberLabel} so the candidate list is rendered separately
   * from the badge label. Sequence wrapper nodes also delegate to
   * {@link getChoiceMemberLabel} (selected or previewed as an unselected choice
   * candidate) since their raw `displayName` is the synthetic literal `"sequence"`,
   * never a meaningful name to show verbatim. All other nodes return {@link NodeData.title}.
   *
   * Note: a *selected* sequence renders its "sequence" badge in place of the title
   * ({@link FieldNodeTitle}), so the label returned here is only shown for the unselected
   * choice candidate preview, not the selected branch node itself.
   * @param nodeData - The node whose title should be resolved.
   */
  static createNodeTitle(nodeData: NodeData): string {
    if (
      (nodeData instanceof ChoiceFieldNodeData || nodeData instanceof TargetChoiceFieldNodeData) &&
      !nodeData.choiceField
    ) {
      return VisualizationService.getChoiceMemberLabel(nodeData.field);
    }
    if (nodeData instanceof FieldNodeData && VisualizationUtilService.isSelectedNestedChoice(nodeData)) {
      return VisualizationService.getChoiceMemberLabel(nodeData.field);
    }
    if (nodeData instanceof SequenceFieldNodeData || nodeData instanceof TargetSequenceFieldNodeData) {
      return VisualizationService.getChoiceMemberLabel(nodeData.field);
    }
    if (
      (nodeData instanceof AbstractFieldNodeData || nodeData instanceof TargetAbstractFieldNodeData) &&
      !nodeData.abstractField
    ) {
      return VisualizationService.getAbstractMemberLabel(nodeData);
    }
    if (
      nodeData instanceof FieldItemNodeData &&
      nodeData.wrapperField?.wrapperKind === 'abstract' &&
      nodeData.field === nodeData.wrapperField
    ) {
      return VisualizationService.getAbstractMemberLabelFromField(nodeData.wrapperField);
    }
    if (nodeData instanceof AddMappingNodeData && nodeData.field.wrapperKind === 'abstract') {
      return VisualizationService.getAbstractMemberLabelFromField(nodeData.field);
    }
    if (
      nodeData instanceof FieldItemNodeData &&
      nodeData.wrapperField?.wrapperKind === 'choice' &&
      nodeData.field === nodeData.wrapperField
    ) {
      return VisualizationService.getChoiceMemberLabel(nodeData.wrapperField);
    }
    if (nodeData instanceof AddMappingNodeData && nodeData.field.wrapperKind === 'choice') {
      return VisualizationService.getChoiceMemberLabel(nodeData.field);
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
    return nodeData.isDocument
      ? nodeData.id
      : nodeData.path.toString().replace(FORWARD_SLASH_REGEX, '-').replace(COLON_REGEX, '-');
  }

  /**
   * Validates against XML NCName (via `xml-name-validator` {@link qname}), reserved names
   * (`-x` suffix, `mapped-xml`), and scope-level uniqueness within the parent's children.
   * @param name - the variable name to validate
   * @param parent - the parent container to check for name conflicts
   * @returns validation result with status and optional error message
   */
  static validateVariableName(name: string, parent: MappingParentType): NameValidation {
    if (name.trim() === '') {
      return { status: NameValidationStatus.EMPTY };
    }
    // QName without a colon `:` is NCName
    if (name.includes(':') || !qname(name)) {
      return {
        status: NameValidationStatus.ERROR,
        error: `Invalid variable name '${name}': it must be a valid NCName`,
      };
    }
    if (name.endsWith('-x')) {
      return {
        status: NameValidationStatus.ERROR,
        error: "Variable name cannot end with '-x' (reserved for internal use)",
      };
    }
    if (name === 'mapped-xml') {
      return { status: NameValidationStatus.ERROR, error: "Variable name 'mapped-xml' is reserved for internal use" };
    }
    const hasDuplicate =
      (parent instanceof MappingTree && parent.globalVariables.some((v) => v.name === name)) ||
      parent.children.some((c) => c instanceof VariableItem && c.name === name);
    if (hasDuplicate) {
      return { status: NameValidationStatus.ERROR, error: `Variable name '${name}' already exists in this scope` };
    }
    return { status: NameValidationStatus.SUCCESS };
  }

  /**
   * Validates a new parameter name. A DataMapper parameter is passed to the stylesheet by the Camel XSLT
   * component from a Camel variable, message header or exchange property of the same name, so the name
   * must be valid on both sides:
   * - no `:`: a prefixed name passed from Camel reaches Saxon as a local name with no namespace, so it
   *   never matches the `xsl:param`;
   * - an XML `NCName` (`xml-name-validator` {@link qname} once `:` is excluded), so `$name` is an XPath
   *   variable reference;
   * - not `exchange`, `in` or `out`, which the XSLT component always sets itself;
   * - not ending with `-x` and not `mapped-xml`: a JSON parameter `<p>` gets a global `<p>-x` variable and
   *   a JSON target a global `mapped-xml` variable, so the stylesheet would declare the name twice.
   *
   * Names already loaded from saved metadata or an `xsl:param` are not re-checked.
   * @param name - the parameter name to validate
   * @param sourceParameterMap - existing parameters to check for duplicates
   * @returns validation result with status and optional error message
   */
  static validateParameterName(name: string, sourceParameterMap: Map<string, IDocument>): NameValidation {
    if (name === '') {
      return { status: NameValidationStatus.EMPTY };
    }
    if (sourceParameterMap.has(name)) {
      return { status: NameValidationStatus.ERROR, error: `Parameter '${name}' already exists` };
    }
    if (name.includes(':')) {
      return { status: NameValidationStatus.ERROR, error: `Invalid parameter name '${name}': it must not contain ':'` };
    }
    if (!qname(name)) {
      return {
        status: NameValidationStatus.ERROR,
        error: `Invalid parameter name '${name}': use letters, digits, '_', '-' or '.', starting with a letter or '_'`,
      };
    }
    if (CAMEL_RESERVED_PARAMETER_NAMES.has(name)) {
      return {
        status: NameValidationStatus.ERROR,
        error: `Parameter name '${name}' is reserved for Camel internal use`,
      };
    }
    if (name.endsWith(FROM_JSON_SOURCE_SUFFIX)) {
      return {
        status: NameValidationStatus.ERROR,
        error: `Parameter name '${name}' cannot end with '${FROM_JSON_SOURCE_SUFFIX}' (reserved for internal use)`,
      };
    }
    if (name === TO_JSON_TARGET_VARIABLE) {
      return { status: NameValidationStatus.ERROR, error: `Parameter name '${name}' is reserved for internal use` };
    }
    return { status: NameValidationStatus.SUCCESS };
  }
}
