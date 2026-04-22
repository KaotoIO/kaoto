import { AlertProps } from '@patternfly/react-core';

import { DocumentType, IDocument, IField, PrimitiveDocument } from './document';
import {
  FieldItem,
  IExpressionHolder,
  IFunctionDefinition,
  MappingItem,
  MappingParentType,
  MappingTree,
  UnknownMappingItem,
  VariableItem,
} from './mapping';
import { NodePath } from './nodepath';
import { Types } from './types';

/**
 * Base interface for all visualization nodes in the DataMapper tree.
 * Every node on both the source and target sides implements this interface.
 */
export interface NodeData {
  /** Raw display name sourced from `IField.displayName` or the document/mapping name. For choice wrapper nodes use {@link VisualizationService.createNodeTitle} to obtain the rendered title. */
  title: string;
  /** The document this node belongs to, present on document-level nodes. */
  document?: IDocument;
  /** The field type, present on field nodes. */
  type?: Types;
  /** Stable identifier used for keying and DnD operations. */
  id: string;
  /**
   * {@link NodePath} representing this node's position in the **visual document tree**.
   * Unselected choice wrappers are rendered nodes and have their own path segment,
   * unlike in the mapping tree where `xs:choice` has no counterpart.
   * See {@link MappingLinksService.computeVisualTargetNodePath} for the bridge between
   * mapping tree and visual tree paths.
   */
  path: NodePath;
  /** `true` for source-side nodes, `false` for target-side nodes. */
  isSource: boolean;
  /** `true` when the owning document is a {@link PrimitiveDocument}. */
  isPrimitive: boolean;
  /** `true` when this node represents a top-level document (source or target body). */
  isDocument: boolean;
}

/**
 * Extension of {@link NodeData} for target-side nodes that carry mapping information.
 */
export interface TargetNodeData extends NodeData {
  /** The root mapping tree for the target document. */
  mappingTree: MappingTree;
  /** The mapping item associated with this node, if one exists. */
  mapping?: MappingParentType;
}

/** Union of all valid source-side node types. */
export type SourceNodeDataType = DocumentNodeData | FieldNodeData | ChoiceFieldNodeData | AbstractFieldNodeData;
/** Union of all valid target-side node types. */
export type TargetNodeDataType =
  | TargetDocumentNodeData
  | TargetFieldNodeData
  | TargetChoiceFieldNodeData
  | TargetAbstractFieldNodeData;

/**
 * Visualization node for a source or target document root.
 * Its `title` is set to the document's `documentId`.
 */
export class DocumentNodeData implements NodeData {
  constructor(document: IDocument) {
    this.title = document.documentId;
    this.id = `doc-${document.documentType}-${document.documentId}`;
    this.path = NodePath.fromDocument(document.documentType, document.documentId);
    this.document = document;
    this.isSource = document.documentType !== DocumentType.TARGET_BODY;
    this.isPrimitive = document instanceof PrimitiveDocument;
  }

  document: IDocument;
  title: string;
  id: string;
  path: NodePath;
  isSource: boolean;
  isPrimitive: boolean;
  isDocument = true;
}

/**
 * Visualization node for a target document root.
 * Extends {@link DocumentNodeData} with the root {@link MappingTree}.
 */
export class TargetDocumentNodeData extends DocumentNodeData implements TargetNodeData {
  constructor(document: IDocument, mappingTree: MappingTree) {
    super(document);
    this.mappingTree = mappingTree;
    this.mapping = mappingTree;
  }
  mappingTree: MappingTree;
  mapping: MappingTree;
}

/**
 * Visualization node for a regular (non-choice) source or target field.
 * Its `title` is set to `field.displayName`.
 */
export class FieldNodeData implements NodeData {
  constructor(
    public parent: NodeData,
    public field: IField,
  ) {
    this.title = field.displayName;
    this.id = field.id;
    this.type = field.type;
    this.path = NodePath.childOf(parent.path, this.id);
    this.isSource = parent.isSource;
    this.isPrimitive = parent.isPrimitive;
  }

  title: string;
  id: string;
  type: Types;
  path: NodePath;
  isSource: boolean;
  isPrimitive: boolean;
  isDocument = false;
}

/**
 * Visualization node for a target field with an optional associated {@link FieldItem} mapping.
 */
export class TargetFieldNodeData extends FieldNodeData implements TargetNodeData {
  constructor(
    public parent: TargetNodeData,
    public field: IField,
    public mapping?: FieldItem,
  ) {
    super(parent, field);
    this.mappingTree = parent.mappingTree;
  }
  mappingTree: MappingTree;
}

/**
 * Visualization node for a source xs:choice field.
 *
 * When `choiceField` is `undefined`, this node represents an **unselected** choice wrapper:
 * `field` is the choice wrapper itself (`wrapperKind: 'choice'`) and {@link VisualizationService.createNodeTitle}
 * returns the member list label (e.g. `"(email | phone)"`). {@link NodeTitle} renders a
 * `<Label>choice</Label>` badge alongside the italic member list in this state.
 *
 * When `choiceField` is set, a member has been selected: `field` is the selected member and
 * `choiceField` holds the choice wrapper. {@link VisualizationService.createNodeTitle} returns
 * the member's own display name and {@link NodeTitle} renders it as a plain field title.
 */
export class ChoiceFieldNodeData extends FieldNodeData {
  /** The choice wrapper field when a member is selected; `undefined` for the unselected wrapper itself. */
  choiceField?: IField;
}

/**
 * Target-side counterpart of {@link ChoiceFieldNodeData}.
 * Carries the same selected/unselected semantics; see that class for details.
 *
 * The {@link path} is a {@link NodePath} representing this node's position in the
 * **visual document tree**. When unselected (`field.wrapperKind === 'choice'`), the choice
 * wrapper IS a rendered node and therefore has its own path segment — even though
 * `xs:choice` is a schema compositor (not an XML element) that won't appear in XPath
 * or the XSLT output structure.
 *
 * Note: the mapping tree ({@link MappingItem.nodePath}) does not include choice wrapper
 * segments because the mapping tree mirrors the XSLT output structure. The bridge between
 * visual and mapping tree paths is handled by
 * {@link MappingLinksService.computeVisualTargetNodePath}.
 */
export class TargetChoiceFieldNodeData extends TargetFieldNodeData {
  /** The choice wrapper field when a member is selected; `undefined` for the unselected wrapper itself. */
  choiceField?: IField;
}

/**
 * Visualization node for a source abstract element wrapper field.
 *
 * When `abstractField` is `undefined`, this node represents an **unselected** abstract wrapper:
 * `field` is the abstract wrapper itself (`wrapperKind: 'abstract'`) and
 * {@link VisualizationService.createNodeTitle} returns the candidate list label
 * (e.g. `"(Cat | Dog | Fish)"`).
 *
 * When `abstractField` is set, a candidate has been selected: `field` is the selected
 * candidate and `abstractField` holds the abstract wrapper.
 */
export class AbstractFieldNodeData extends FieldNodeData {
  /** The abstract wrapper field when a member is selected; `undefined` for the unselected wrapper itself. */
  abstractField?: IField;
}

/**
 * Target-side counterpart of {@link AbstractFieldNodeData}.
 * Carries the same selected/unselected semantics.
 */
export class TargetAbstractFieldNodeData extends TargetFieldNodeData {
  /** The abstract wrapper field when a member is selected; `undefined` for the unselected wrapper itself. */
  abstractField?: IField;
}

/**
 * Visualization node for a mapping item (e.g. `if`, `choose`, `forEach`, `valueSelector`).
 * Its `title` is set to `mapping.name`.
 */
export class MappingNodeData implements TargetNodeData {
  constructor(
    public parent: TargetNodeData,
    public mapping: MappingItem,
  ) {
    this.title = mapping.name;
    this.id = mapping.id;
    this.path = NodePath.childOf(parent.path, this.id);
    this.isPrimitive = parent.isPrimitive;
    this.mappingTree = parent.mappingTree;
  }

  title: string;
  id: string;
  path: NodePath;
  isSource = false;
  isPrimitive: boolean;
  isDocument = false;
  mappingTree: MappingTree;
}

/**
 * Visualization node for a {@link FieldItem} mapping — a mapping item that is directly tied to
 * a document field. Its `title` is overridden to `mapping.field.displayName` so the node label
 * matches the field name rather than the generic mapping name.
 */
export class FieldItemNodeData extends MappingNodeData {
  constructor(
    public parent: TargetNodeData,
    public mapping: FieldItem,
  ) {
    super(parent, mapping);
    this.title = mapping.field.displayName;
    this.field = mapping.field;
  }
  public field: IField;
}

export class UnknownMappingNodeData extends MappingNodeData {
  constructor(
    public parent: TargetNodeData,
    public mapping: UnknownMappingItem,
  ) {
    super(parent, mapping);
  }
}

export class VariableNodeData extends MappingNodeData {
  constructor(
    public parent: TargetNodeData,
    public mapping: VariableItem,
  ) {
    super(parent, mapping);
    this.title = mapping.name;
  }

  get displayTitle(): string {
    return `$${this.title}`;
  }
}

/**
 * Placeholder node rendered when a collection field already has a mapping and the user can add
 * an additional one. Its `title` is the field name and its `id` is prefixed with `"add-mapping-"`.
 */
export class AddMappingNodeData implements TargetNodeData {
  constructor(
    public parent: TargetNodeData,
    public field: IField,
  ) {
    const ID_PREFIX = 'add-mapping-';
    this.id = ID_PREFIX + field.id;
    this.path = NodePath.childOf(parent.path, this.id);
    this.title = field.name;
    this.isPrimitive = parent.isPrimitive;
    this.mappingTree = parent.mappingTree;
  }
  id: string;
  isPrimitive: boolean;
  isSource = false;
  isDocument = false;
  mappingTree: MappingTree;
  path: NodePath;
  title: string;
}

class SimpleNodePath extends NodePath {
  constructor(public path: string) {
    super();
  }
  toString() {
    return this.path;
  }
}

/**
 * Sentinel node used to represent the expression editor panel in the visualization graph.
 * Not part of the document or mapping tree — used only for canvas wiring.
 */
export class EditorNodeData implements NodeData {
  constructor(public mapping: IExpressionHolder & MappingItem) {}
  id: string = 'editor';
  isPrimitive: boolean = false;
  isSource: boolean = false;
  isDocument: boolean = false;
  path: NodePath = new SimpleNodePath('Editor');
  title: string = 'Editor';
}

/**
 * Visualization node for a DataMapper function available in the function palette.
 * Always on the source side (`isSource: true`).
 */
export class FunctionNodeData implements NodeData {
  constructor(public functionDefinition: IFunctionDefinition) {
    this.id = functionDefinition.name;
    this.title = functionDefinition.displayName;
    this.path = new SimpleNodePath('Func:' + functionDefinition.name);
  }

  id: string;
  isPrimitive: boolean = false;
  isSource: boolean = true;
  isDocument: boolean = false;
  path: NodePath;
  title: string;
}

/** Describes a drawn mapping line between a source and a target node. */
export interface IMappingLink {
  sourceNodePath: string;
  targetNodePath: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  isSelected: boolean;
}

/** SVG line endpoint coordinates. */
export type LineCoord = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/** Full props for rendering a single mapping line in the SVG overlay. */
export type LineProps = LineCoord & {
  sourceNodePath: string;
  targetNodePath: string;
  isSelected: boolean;
  isPartial: boolean;
  isSourceEdge: boolean;
  isTargetEdge: boolean;
};

/** Props passed to the alert notification handler. */
export type SendAlertProps = Partial<AlertProps & { description: string }>;
