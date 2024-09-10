import { IDocument, IField, PrimitiveDocument } from './document';
import { ExpressionItem, FieldItem, IFunctionDefinition, MappingItem, MappingParentType, MappingTree } from './mapping';
import { DocumentType, NodePath } from './path';

export interface NodeData {
  title: string;
  id: string;
  path: NodePath;
  isSource: boolean;
  isPrimitive: boolean;
}

export interface TargetNodeData extends NodeData {
  mappingTree: MappingTree;
  mapping?: MappingParentType;
}

export type SourceNodeDataType = DocumentNodeData | FieldNodeData;
export type TargetNodeDataType = TargetDocumentNodeData | TargetFieldNodeData;

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
}

export class TargetDocumentNodeData extends DocumentNodeData implements TargetNodeData {
  constructor(document: IDocument, mappingTree: MappingTree) {
    super(document);
    this.mappingTree = mappingTree;
    this.mapping = mappingTree;
  }
  mappingTree: MappingTree;
  mapping: MappingTree;
}

export class FieldNodeData implements NodeData {
  constructor(
    public parent: NodeData,
    public field: IField,
  ) {
    this.title = field.name;
    this.id = field.id;
    this.path = NodePath.childOf(parent.path, this.id);
    this.isSource = parent.isSource;
    this.isPrimitive = parent.isPrimitive;
  }

  title: string;
  id: string;
  path: NodePath;
  isSource: boolean;
  isPrimitive: boolean;
}

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
  mappingTree: MappingTree;
}

class SimpleNodePath extends NodePath {
  constructor(public path: string) {
    super();
  }
  toString() {
    return this.path;
  }
}
export class EditorNodeData implements NodeData {
  constructor(public mapping: ExpressionItem) {}
  id: string = 'editor';
  isPrimitive: boolean = false;
  isSource: boolean = false;
  path: NodePath = new SimpleNodePath('Editor');
  title: string = 'Editor';
}

export class FunctionNodeData implements NodeData {
  constructor(public functionDefinition: IFunctionDefinition) {
    this.id = functionDefinition.name;
    this.title = functionDefinition.displayName;
    this.path = new SimpleNodePath('Func:' + functionDefinition.name);
  }

  id: string;
  isPrimitive: boolean = false;
  isSource: boolean = true;
  path: NodePath;
  title: string;
}

export interface IMappingLink {
  sourceNodePath: string;
  targetNodePath: string;
}
