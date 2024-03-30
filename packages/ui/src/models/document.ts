export const DEFAULT_MIN_OCCURS = 0;
export const DEFAULT_MAX_OCCURS = 1;

export interface INamespace {
  alias: string;
  uri: string;
  locationUri: string;
  isTarget: boolean;
}

export type IParentType = IDocument | IField;

export interface IField {
  parent: IParentType;
  ownerDocument: IDocument;
  fieldIdentifier: FieldIdentifier;
  name: string;
  expression: string;
  type: string;
  fields: IField[];
  isAttribute: boolean;
  defaultValue: string | null;
  minOccurs: number;
  maxOccurs: number;
  namespaceURI: string | null;
}

export interface IDocument {
  documentType: DocumentType;
  documentId: string;
  fieldIdentifier: FieldIdentifier;
  name: string;
  type: string;
  fields: IField[];
  namespaces?: INamespace[];
}

export abstract class BaseDocument implements IDocument {
  documentType: DocumentType = DocumentType.SOURCE_BODY;
  documentId: string = '';
  fields: IField[] = [];
  name: string = '';
  type: string = '';
  get fieldIdentifier(): FieldIdentifier {
    return new FieldIdentifier(`${this.documentType}:${this.documentId}://`);
  }
}

export class PrimitiveDocument extends BaseDocument implements IField {
  ownerDocument = this;
  defaultValue: string | null = null;
  expression: string = '';
  isAttribute: boolean = false;
  maxOccurs: number = 1;
  minOccurs: number = 0;
  namespaceURI: string | null = null;
  parent: IParentType = this;

  constructor(
    public documentType: DocumentType,
    public documentId: string,
  ) {
    super();
    this.name = this.documentId;
    this.expression = this.documentId;
  }
}

export abstract class BaseField implements IField {
  abstract parent: IParentType;
  abstract ownerDocument: IDocument;
  abstract fieldIdentifier: FieldIdentifier;
  fields: IField[] = [];
  isAttribute: boolean = false;
  name: string = '';
  expression: string = '';
  type: string = '';
  minOccurs: number = DEFAULT_MIN_OCCURS;
  maxOccurs: number = DEFAULT_MAX_OCCURS;
  defaultValue: string | null = null;
  namespaceURI: string | null = null;
}

export enum DocumentType {
  SOURCE_BODY = 'sourceBody',
  TARGET_BODY = 'targetBody',
  PARAM = 'param',
}

export class FieldIdentifier {
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

  static childOf(parent: FieldIdentifier, childSegment: string) {
    const answer = new FieldIdentifier();
    answer.documentType = parent.documentType;
    answer.documentId = parent.documentId;
    answer.pathSegments = [...parent.pathSegments, childSegment];
    return answer;
  }
}
