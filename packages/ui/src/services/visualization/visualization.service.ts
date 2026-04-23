import xmlFormat from 'xml-formatter';

import { IField } from '../../models/datamapper/document';
import {
  FieldItem,
  IExpressionHolder,
  isExpressionHolder,
  MappingItem,
  MappingTree,
  UnknownMappingItem,
  ValueSelector,
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
  NodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  UnknownMappingNodeData,
  VariableNodeData,
} from '../../models/datamapper/visualization';
import { DocumentService } from '../document/document.service';
import { DocumentUtilService } from '../document/document-util.service';
import { MappingService } from '../mapping/mapping.service';
import { VisualizationUtilService } from './visualization-util.service';

interface WrapperSpec {
  createSourceNode: (parent: NodeData, field: IField) => FieldNodeData;
  createTargetNode: (parent: TargetNodeData, field: IField, mapping?: FieldItem) => TargetFieldNodeData;
  setWrapperRef: (node: FieldNodeData, wrapperField: IField) => void;
  isTargetWrapper: (node: NodeData) => boolean;
  hasWrapperRef: (node: NodeData) => boolean;
}

const CHOICE_WRAPPER: WrapperSpec = {
  createSourceNode: (parent, field) => new ChoiceFieldNodeData(parent, field),
  createTargetNode: (parent, field, mapping) => new TargetChoiceFieldNodeData(parent, field, mapping),
  setWrapperRef: (node, wrapperField) => {
    (node as ChoiceFieldNodeData | TargetChoiceFieldNodeData).choiceField = wrapperField;
  },
  isTargetWrapper: (node) => node instanceof TargetChoiceFieldNodeData,
  hasWrapperRef: (node) => !!(node as TargetChoiceFieldNodeData).choiceField,
};

const ABSTRACT_WRAPPER: WrapperSpec = {
  createSourceNode: (parent, field) => new AbstractFieldNodeData(parent, field),
  createTargetNode: (parent, field, mapping) => new TargetAbstractFieldNodeData(parent, field, mapping),
  setWrapperRef: (node, wrapperField) => {
    (node as AbstractFieldNodeData | TargetAbstractFieldNodeData).abstractField = wrapperField;
  },
  isTargetWrapper: (node) => node instanceof TargetAbstractFieldNodeData,
  hasWrapperRef: (node) => !!(node as TargetAbstractFieldNodeData).abstractField,
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
  private static doGenerateNodeDataFromWrapperField(
    parent: NodeData,
    field: IField,
    mappings: MappingItem[] | undefined,
    spec: WrapperSpec,
  ): NodeData {
    const selectedMember =
      field.selectedMemberIndex === undefined ? undefined : field.fields?.[field.selectedMemberIndex];
    const nodeField = selectedMember ?? field;
    if (parent.isSource) {
      const node = spec.createSourceNode(parent, nodeField);
      if (selectedMember) spec.setWrapperRef(node, field);
      return node;
    }

    const mappingsForMember =
      selectedMember && mappings ? MappingService.filterMappingsForField(mappings, selectedMember) : [];
    const mapping = mappingsForMember.find((m) => m instanceof FieldItem) as FieldItem;
    const node = spec.createTargetNode(parent as TargetNodeData, nodeField, mapping);
    if (selectedMember) spec.setWrapperRef(node, field);
    return node;
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

    const result = fields.reduce((acc, field) => {
      if (field.wrapperKind === 'choice') {
        acc.push(VisualizationService.doGenerateNodeDataFromWrapperField(parent, field, mappings, CHOICE_WRAPPER));
        return acc;
      }
      if (field.wrapperKind === 'abstract') {
        acc.push(VisualizationService.doGenerateNodeDataFromWrapperField(parent, field, mappings, ABSTRACT_WRAPPER));
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

    if (mappings) {
      const rendered = new Set(result.filter((n): n is TargetNodeData => 'mapping' in n).map((n) => n.mapping));
      for (const m of mappings) {
        if (
          !rendered.has(m) &&
          !(m instanceof FieldItem) &&
          !(m instanceof ValueSelector) &&
          !(m instanceof VariableItem) &&
          !(m instanceof UnknownMappingItem)
        ) {
          result.push(VisualizationService.createNodeDataFromMappingItem(parent as TargetNodeData, m));
        }
      }
    }

    return result;
  }

  private static isExistingMapping(nodes: TargetNodeData[], mapping: MappingItem) {
    return nodes.some((node) => 'mapping' in node && node.mapping === mapping);
  }

  private static resolveWrapperNodeFields(field: IField): IField[] {
    if (!field.wrapperKind) {
      DocumentUtilService.resolveTypeFragment(field);
      return field.fields;
    }
    const selectedMember =
      field.selectedMemberIndex === undefined ? undefined : field.fields?.[field.selectedMemberIndex];
    return selectedMember ? [field] : field.fields;
  }

  private static isUnselectedTargetWrapper(node: NodeData): boolean {
    return (
      (node instanceof TargetChoiceFieldNodeData && !node.choiceField) ||
      (node instanceof TargetAbstractFieldNodeData && !node.abstractField)
    );
  }

  /**
   * Resolves mapping children for a wrapper node. Unselected target wrappers
   * have no mapping tree counterpart, so we walk up through any nested unselected
   * wrappers to find the nearest real ancestor that carries mapping children.
   */
  private static resolveWrapperNodeMappings(parent: NodeData, spec: WrapperSpec): MappingItem[] | undefined {
    if (!spec.isTargetWrapper(parent) || spec.hasWrapperRef(parent)) {
      return 'mapping' in parent ? (parent as TargetNodeData).mapping?.children : undefined;
    }
    let ancestor: TargetNodeData = (parent as TargetFieldNodeData).parent;
    while (VisualizationService.isUnselectedTargetWrapper(ancestor)) {
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
    if (parent instanceof ChoiceFieldNodeData || parent instanceof TargetChoiceFieldNodeData) {
      return VisualizationService.doGenerateNodeDataFromFields(
        parent,
        VisualizationService.resolveWrapperNodeFields(parent.field),
        VisualizationService.resolveWrapperNodeMappings(parent, CHOICE_WRAPPER),
      );
    }
    if (parent instanceof AbstractFieldNodeData || parent instanceof TargetAbstractFieldNodeData) {
      return VisualizationService.doGenerateNodeDataFromFields(
        parent,
        VisualizationService.resolveWrapperNodeFields(parent.field),
        VisualizationService.resolveWrapperNodeMappings(parent, ABSTRACT_WRAPPER),
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
      return nodeData.mapping.children.find((c) => c instanceof ValueSelector) as ValueSelector;
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
   * Nested choice members are labeled `'choice'` when there is only one nested choice sibling,
   * or `'choice1'`, `'choice2'`, ... when there are multiple.
   * @param field - The choice wrapper field whose members should be described.
   */
  static getChoiceMemberLabel(field: IField): string {
    const members = field.fields ?? [];
    const nestedChoiceCount = members.filter((m) => m.wrapperKind === 'choice').length;
    let choiceIndex = 0;
    const labels = members.map((m) => {
      if (m.wrapperKind !== 'choice') return m.displayName ?? m.name;
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
   * Returns the candidate label string (e.g. `"(Cat | Dog | Fish)"`) for an unselected
   * abstract wrapper node. Returns `"(no candidates)"` when the wrapper has zero candidates.
   * @param node - The abstract wrapper node whose candidates should be described.
   */
  static getAbstractMemberLabel(node: AbstractFieldNodeData | TargetAbstractFieldNodeData): string {
    const members = node.field.fields ?? [];
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
    if (
      (nodeData instanceof AbstractFieldNodeData || nodeData instanceof TargetAbstractFieldNodeData) &&
      !nodeData.abstractField
    ) {
      return VisualizationService.getAbstractMemberLabel(nodeData);
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
}
