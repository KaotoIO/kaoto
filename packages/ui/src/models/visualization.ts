import { DocumentType, IDocument, IField } from './document';
import { MappingItem, MappingTree } from './mapping';
import { generateRandomId } from '../util';

export class NodePath {
  documentType: DocumentType = DocumentType.SOURCE_BODY;
  documentId: string = '';
  pathSegments: string[] = [];

  constructor(expression?: string) {
    if (!expression) return;
    const parts = expression.split('://');
    if (parts.length < 2) return;
    const index = parts[0].indexOf(':');
    this.documentType = (index !== -1 ? parts[0].substring(0, index) : parts[0]) as DocumentType;
    this.documentId = index !== -1 ? parts[0].substring(index + 1) : this.documentId;
    this.pathSegments = parts[1].length > 0 ? parts[1].split('/') : [];
  }

  toString() {
    const beforePath = `${this.documentType}:${this.documentId}://`;
    return this.pathSegments.length > 0 ? `${beforePath}${this.pathSegments.join('/')}` : beforePath;
  }

  static fromDocument(documentType: DocumentType, documentId: string) {
    return new NodePath(`${documentType}:${documentId}://`);
  }

  static childOf(parent: NodePath, childSegment: string) {
    const answer = new NodePath();
    answer.documentType = parent.documentType;
    answer.documentId = parent.documentId;
    answer.pathSegments = [...parent.pathSegments, childSegment];
    return answer;
  }
}

export interface NodeData {
  title: string;
  id: string;
  path: NodePath;
}

export class DocumentNodeData implements NodeData {
  constructor(document: IDocument, mappingTree?: MappingTree) {
    this.title = document.documentId;
    this.id = 'doc-' + document.documentId;
    this.path = NodePath.fromDocument(document.documentType, document.documentId);
    this.document = document;
    this.mappingTree = mappingTree;
  }

  document: IDocument;
  mappingTree?: MappingTree;
  title: string;
  id: string;
  path: NodePath;
}

export class FieldNodeData implements NodeData {
  constructor(
    public parent: NodeData,
    field: IField,
    mapping?: MappingItem,
  ) {
    this.title = field.expression;
    this.id = generateRandomId('field', 4);
    this.path = NodePath.childOf(parent.path, this.id);
    this.field = field;
    if (mapping && 'expression' in mapping) this.expression = mapping.expression as string;
  }

  title: string;
  id: string;
  path: NodePath;
  field: IField;
  expression?: string;
}

export class ConditionNodeData implements NodeData {
  constructor(
    public parent: NodeData,
    public mapping?: MappingItem,
  ) {
    this.title = mapping?.name ?? 'condition-unknown';
    this.id = mapping?.id ?? generateRandomId('condition-unknown');
    this.path = NodePath.childOf(parent.path, this.id);
  }

  title: string;
  id: string;
  path: NodePath;
}

export class ExpressionNodeData extends ConditionNodeData {
  constructor(
    public parent: NodeData,
    public mapping?: MappingItem,
  ) {
    super(parent, mapping);
    if (mapping && 'expression' in mapping) this.expression = mapping.expression as string;
  }
  expression?: string;
}

export interface IMappingLink {
  sourceTreePath: string;
  targetTreePath: string;
}
