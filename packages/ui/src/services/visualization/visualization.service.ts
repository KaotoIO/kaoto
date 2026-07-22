import xmlFormat from 'xml-formatter';
import { qname } from 'xml-name-validator';

import { IDocument, IField } from '../../models/datamapper/document';
import {
  FieldItem,
  IExpressionHolder,
  InstructionItem,
  isExpressionHolder,
  MappingItem,
  MappingParentType,
  MappingTree,
  UnknownMappingItem,
  ValueSelector,
  ValueType,
  VariableItem,
} from '../../models/datamapper/mapping';
import {
  AbstractFieldNodeData,
  AddMappingNodeData,
  ChoiceFieldNodeData,
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
import { WrapperSelectionService } from '../document/wrapper-selection.service';
import { MappingService } from '../mapping/mapping.service';
import { VisualizationUtilService } from './visualization-util.service';

interface WrapperSpec {
  createSourceNode: (parent: NodeData, field: IField) => FieldNodeData;
  createTargetNode: (parent: TargetNodeData, field: IField, mapping?: FieldItem) => TargetFieldNodeData;
  setWrapperRef: (node: FieldNodeData, wrapperField: IField) => void;
  isTargetInstance: (node: NodeData) => boolean;
  hasWrapperRef: (node: NodeData) => boolean;
  isUnconfiguredTarget: (node: NodeData, mappings: MappingItem[] | undefined) => boolean;
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
  setWrapperRef: () => {},
  isTargetInstance: (node) => node instanceof TargetSequenceFieldNodeData,
  hasWrapperRef: () => false,
  isUnconfiguredTarget: () => false,
};

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
      .filter((child) => !VisualizationService.isInlineValueSelector(child))
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

    if (selectedMember?.wrapperKind && field.wrapperKind) {
      if (WrapperSelectionService.shouldFlattenNestedWrapper(field.wrapperKind, selectedMember)) {
        const innerSpec = selectedMember.wrapperKind === 'choice' ? CHOICE_WRAPPER : ABSTRACT_WRAPPER;
        return VisualizationService.doGenerateNodeDataFromWrapperField(parent, selectedMember, mappings, innerSpec);
      }
    }

    const nodeField = selectedMember ?? field;
    if (parent.isSource) {
      const node = spec.createSourceNode(parent, nodeField);
      if (selectedMember) spec.setWrapperRef(node, field);
      return node;
    }

    const mappingsForMember =
      selectedMember && mappings ? MappingService.filterMappingsForField(mappings, selectedMember) : [];
    const mapping = mappingsForMember.find((m) => m instanceof FieldItem) as FieldItem;
    if (mappingsForMember.length > 0 && !mapping) return null;
    const node = spec.createTargetNode(parent as TargetNodeData, nodeField, mapping);
    if (selectedMember) spec.setWrapperRef(node, field);
    return node;
  }

  private static generateCollectionWrapperNodes(
    parent: NodeData,
    field: IField,
    mappings: MappingItem[],
    renderedNodes: NodeData[],
  ): NodeData[] {
    const wrapperSpec = field.wrapperKind === 'choice' ? CHOICE_WRAPPER : ABSTRACT_WRAPPER;
    const wrapperFieldItems = mappings.filter(
      (m): m is FieldItem =>
        m instanceof FieldItem && (m.field === field || DocumentService.isDescendant(field, m.field)),
    );
    const wrapperInstructionItems = mappings.filter(
      (m): m is InstructionItem =>
        m instanceof InstructionItem &&
        !VisualizationService.isExistingMapping(renderedNodes as TargetNodeData[], m) &&
        MappingService.getInstructionFields(m).some((f) => f === field || DocumentService.isDescendant(field, f)),
    );
    if (wrapperFieldItems.length === 0 && wrapperInstructionItems.length === 0) {
      const node = VisualizationService.doGenerateNodeDataFromWrapperField(parent, field, mappings, wrapperSpec);
      return node ? [node] : [];
    }
    if (!DocumentService.isCollectionField(field) && wrapperInstructionItems.length === 0) {
      const node = VisualizationService.doGenerateNodeDataFromWrapperField(parent, field, mappings, wrapperSpec);
      return node ? [node] : [];
    }
    const nodes: NodeData[] = [];
    const allItems: MappingItem[] = [...wrapperFieldItems, ...wrapperInstructionItems];
    for (const item of allItems.sort((left, right) => MappingService.sortMappingItem(left, right))) {
      if (item instanceof FieldItem) {
        nodes.push(new FieldItemNodeData(parent as TargetNodeData, item, field));
      } else {
        nodes.push(VisualizationService.createNodeDataFromMappingItem(parent as TargetNodeData, item));
      }
    }
    if (field.maxOccurs !== 1) {
      nodes.push(new AddMappingNodeData(parent as TargetNodeData, field));
    }
    return nodes;
  }

  private static doGenerateNodeDataFromFields(
    parent: NodeData,
    fields: IField[],
    mappings?: MappingItem[],
  ): NodeData[] {
    const answer: NodeData[] = [];
    VisualizationService.collectPriorityMappings(answer, parent, mappings);

    for (const field of fields) {
      if (VisualizationService.processWrapperField(answer, parent, field, mappings)) continue;
      VisualizationService.processRegularField(answer, parent, field, mappings);
    }

    VisualizationService.collectUnrenderedMappings(answer, parent, mappings);
    return answer;
  }

  private static collectPriorityMappings(
    answer: NodeData[],
    parent: NodeData,
    mappings: MappingItem[] | undefined,
  ): void {
    if (!mappings) return;
    let filterPriorityMappingItem = (m: MappingItem) => m instanceof UnknownMappingItem || m instanceof VariableItem;
    if (parent.isPrimitive) {
      filterPriorityMappingItem = (m: MappingItem) =>
        m instanceof UnknownMappingItem || VisualizationService.isInlineValueSelector(m);
    }
    for (const m of mappings.filter(filterPriorityMappingItem)) {
      answer.push(VisualizationService.createNodeDataFromMappingItem(parent as TargetNodeData, m));
    }
  }

  private static processRegularField(
    answer: NodeData[],
    parent: NodeData,
    field: IField,
    mappings: MappingItem[] | undefined,
  ): void {
    const mappingsForField = mappings ? MappingService.filterMappingsForField(mappings, field) : [];
    if (mappingsForField.length === 0) {
      const fieldNodeData = parent.isSource
        ? new FieldNodeData(parent, field)
        : new TargetFieldNodeData(parent as TargetNodeData, field);
      answer.push(fieldNodeData);
      return;
    }
    for (const mapping of mappingsForField
      .filter((mapping) => !VisualizationService.isExistingMapping(answer as TargetNodeData[], mapping))
      .sort((left, right) => MappingService.sortMappingItem(left, right))) {
      answer.push(VisualizationService.createNodeDataFromMappingItem(parent as TargetNodeData, mapping));
    }
    if (DocumentService.isCollectionField(field)) {
      answer.push(new AddMappingNodeData(parent as TargetNodeData, field));
    }
  }

  private static collectUnrenderedMappings(
    answer: NodeData[],
    parent: NodeData,
    mappings: MappingItem[] | undefined,
  ): void {
    if (!mappings || VisualizationService.isUnconfiguredTargetWrapper(parent, mappings)) return;
    const rendered = new Set(answer.filter((n): n is TargetNodeData => 'mapping' in n).map((n) => n.mapping));
    for (const m of mappings) {
      if (
        !rendered.has(m) &&
        !(m instanceof FieldItem) &&
        !VisualizationService.isInlineValueSelector(m) &&
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

  private static processWrapperField(
    answer: NodeData[],
    parent: NodeData,
    field: IField,
    mappings: MappingItem[] | undefined,
  ): boolean {
    if ((field.wrapperKind === 'choice' || field.wrapperKind === 'abstract') && !parent.isSource && mappings) {
      answer.push(...VisualizationService.generateCollectionWrapperNodes(parent, field, mappings, answer));
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
   */
  private static resolveWrapperNodeMappings(parent: NodeData, spec: WrapperSpec): MappingItem[] | undefined {
    if (!spec.isTargetInstance(parent) || spec.hasWrapperRef(parent)) {
      return 'mapping' in parent ? (parent as TargetNodeData).mapping?.children : undefined;
    }
    let ancestor: TargetNodeData = (parent as TargetFieldNodeData).parent;
    while (VisualizationService.resolveWrapperSpec(ancestor)?.spec.isTargetInstance(ancestor)) {
      ancestor = (ancestor as TargetFieldNodeData).parent;
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
    if (parent instanceof FieldItemNodeData && parent.wrapperField && parent.field === parent.wrapperField) return [];
    const wrapperMatch = VisualizationService.resolveWrapperSpec(parent);
    if (wrapperMatch) {
      const { node, spec } = wrapperMatch;
      const mappings = VisualizationService.resolveWrapperNodeMappings(node, spec);
      if (VisualizationService.isUnconfiguredTargetWrapper(node, mappings)) return [];
      const fields = VisualizationService.resolveWrapperNodeFields(node.field);
      return VisualizationService.doGenerateNodeDataFromFields(node, fields, mappings);
    }
    if (parent instanceof SequenceFieldNodeData || parent instanceof TargetSequenceFieldNodeData) {
      return VisualizationService.doGenerateNodeDataFromFields(
        parent,
        VisualizationService.resolveWrapperNodeFields(parent.field),
        VisualizationService.resolveWrapperNodeMappings(parent, SEQUENCE_WRAPPER),
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

  private static findWrapperFieldForFieldItem(fieldItem: FieldItem): IField | undefined {
    let current: MappingParentType = fieldItem.parent;
    while (current instanceof InstructionItem) {
      current = current.parent;
    }
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
    if (mapping instanceof FieldItem) {
      const wrapperField = VisualizationService.findWrapperFieldForFieldItem(mapping);
      return new FieldItemNodeData(parent, mapping, wrapperField);
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
    if (nodeData instanceof DocumentNodeData) {
      if (DocumentService.hasFields(nodeData.document)) return true;
      const isPrimitiveDocument = nodeData instanceof TargetDocumentNodeData && nodeData.isPrimitive;
      const isPrimitiveDocumentWithConditionItem =
        isPrimitiveDocument && nodeData.mapping.children.some((m) => !VisualizationService.isInlineValueSelector(m));
      if (isPrimitiveDocumentWithConditionItem) return true;
    }
    if (nodeData instanceof FieldNodeData) {
      if (VisualizationService.resolveWrapperSpec(nodeData)?.spec.isTargetInstance(nodeData)) {
        return (nodeData as TargetFieldNodeData).mapping instanceof FieldItem;
      }
      return DocumentService.hasChildren(nodeData.field);
    }
    if (nodeData instanceof FieldItemNodeData) {
      if (nodeData.wrapperField && nodeData.field === nodeData.wrapperField) return false;
      return (
        DocumentService.hasChildren(nodeData.field) ||
        nodeData.mapping.children.some((m) => !VisualizationService.isInlineValueSelector(m))
      );
    }
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

  static isInlineValueSelector(item: MappingItem): item is ValueSelector {
    if (!(item instanceof ValueSelector)) return false;
    return item.valueType !== ValueType.CONTAINER_NODE;
  }

  private static getFieldValueSelector(nodeData: TargetNodeData) {
    if (nodeData.mapping instanceof FieldItem || nodeData.mapping instanceof MappingTree) {
      return nodeData.mapping.children.find((c) => VisualizationService.isInlineValueSelector(c)) as
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
   * Returns the member label string (e.g. `"(email | phone | fax)"`) for a choice wrapper field.
   * Nested choice members are dissolved into their inner member names so the label
   * reads `"(InnerA | InnerB | Plain)"` instead of `"(choice | Plain)"`.
   * @param field - The choice wrapper field whose members should be described.
   */
  static getChoiceMemberLabel(field: IField): string {
    const members = field.fields ?? [];
    const labels = members.flatMap((m) => {
      if (m.wrapperKind === 'choice' || m.wrapperKind === 'abstract') {
        const innerLabels = (m.fields ?? []).map((inner) => inner.displayName ?? inner.name);
        return innerLabels.length > 0 ? innerLabels : [m.displayName ?? m.name];
      }
      return [m.displayName ?? m.name];
    });
    if (labels.length === 0) return '(empty)';
    const maxVisible = 3;
    if (labels.length > maxVisible) {
      return `(${labels.slice(0, maxVisible).join(' | ')} | +${labels.length - maxVisible} more)`;
    }
    return `(${labels.join(' | ')})`;
  }

  /**
   * Returns the candidate label string (e.g. `"(Cat | Dog | Fish)"`) for an unselected
   * abstract wrapper node. Returns `"(no candidates)"` when the wrapper has zero candidates.
   * @param node - The abstract wrapper node whose candidates should be described.
   */
  static getAbstractMemberLabel(node: AbstractFieldNodeData | TargetAbstractFieldNodeData): string {
    return VisualizationService.getAbstractMemberLabelFromField(node.field);
  }

  private static getAbstractMemberLabelFromField(field: IField): string {
    const members = field.fields ?? [];
    const labels = members.map((m) => m.displayName ?? m.name);
    if (labels.length === 0) return '(no candidates)';
    const maxVisible = 3;
    if (labels.length > maxVisible) {
      return `(${labels.slice(0, maxVisible).join(' | ')} | +${labels.length - maxVisible} more)`;
    }
    return `(${labels.join(' | ')})`;
  }

  /**
   * Returns the display title for a node. Unselected choice wrappers delegate to
   * {@link getChoiceMemberLabel} and unselected abstract wrappers delegate to
   * {@link getAbstractMemberLabel} so the candidate list is rendered separately
   * from the badge label. All other nodes return {@link NodeData.title}.
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
    if (parent.children.some((child) => child instanceof VariableItem && child.name === name)) {
      return { status: NameValidationStatus.ERROR, error: `Variable name '${name}' already exists in this scope` };
    }
    return { status: NameValidationStatus.SUCCESS };
  }

  /**
   * Validates against QName format (via `xml-name-validator`) and uniqueness
   * within the existing source parameter map.
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
    if (!qname(name)) {
      return {
        status: NameValidationStatus.ERROR,
        error: `Invalid parameter name '${name}': it must be a valid QName`,
      };
    }
    return { status: NameValidationStatus.SUCCESS };
  }
}
