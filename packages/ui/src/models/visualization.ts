import { IDocument, IField } from './document';
import { FieldItem, MappingItem, MappingParentType, MappingTree } from './mapping';
import { generateRandomId } from '../util';
import { DocumentType, NodePath } from './path';

export interface NodeData {
  title: string;
  id: string;
  path: NodePath;
  isSource: boolean;
  mapping?: MappingParentType;
}

export type SourceNodeDataType = DocumentNodeData | FieldNodeData;

export class DocumentNodeData implements NodeData {
  constructor(document: IDocument, mappingTree?: MappingTree) {
    this.title = document.documentId;
    this.id = `doc-${document.documentType}-${document.documentId}`;
    this.path = NodePath.fromDocument(document.documentType, document.documentId);
    this.document = document;
    this.mapping = mappingTree;
    this.isSource = document.documentType !== DocumentType.TARGET_BODY;
  }

  document: IDocument;
  mapping?: MappingTree;
  title: string;
  id: string;
  path: NodePath;
  isSource: boolean;
}

export class FieldNodeData implements NodeData {
  constructor(
    public parent: NodeData,
    public field: IField,
    public mapping?: FieldItem,
  ) {
    this.title = field.expression;
    this.id = mapping ? mapping.id : generateRandomId('field-' + field.name, 4);
    this.path = NodePath.childOf(parent.path, this.id);
    this.isSource = field.ownerDocument.documentType !== DocumentType.TARGET_BODY;
  }

  title: string;
  id: string;
  path: NodePath;
  isSource: boolean;
}

export class MappingNodeData implements NodeData {
  constructor(
    public parent: NodeData,
    public mapping: MappingItem,
  ) {
    this.title = mapping.name;
    this.id = mapping.id;
    this.path = NodePath.childOf(parent.path, this.id);
  }

  title: string;
  id: string;
  path: NodePath;
  isSource = false;
}

export interface IMappingLink {
  sourceNodePath: string;
  targetNodePath: string;
}
