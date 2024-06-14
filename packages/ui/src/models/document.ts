import { Types } from './types';
import { DocumentType, NodePath } from './path';

export const DEFAULT_MIN_OCCURS = 0;
export const DEFAULT_MAX_OCCURS = 1;

export interface INamespace {
  alias: string;
  uri: string;
  locationUri: string;
  isTarget: boolean;
}

export type IParentType = IDocument | IField;

export const BODY_DOCUMENT_ID = 'Body';

export interface IField {
  parent: IParentType;
  ownerDocument: IDocument;
  name: string;
  expression: string;
  type: Types;
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
  name: string;
  schemaType: string;
  fields: IField[];
  namespaces?: INamespace[];
  path: NodePath;
}

export abstract class BaseDocument implements IDocument {
  constructor(
    public documentType: DocumentType,
    public documentId: string,
  ) {
    this.path = NodePath.fromDocument(documentType, documentId);
  }
  fields: IField[] = [];
  name: string = '';
  schemaType = '';
  path: NodePath;
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
  type = Types.AnyType;
  path: NodePath;

  constructor(documentType: DocumentType, documentId: string) {
    super(documentType, documentId);
    this.name = this.documentId;
    this.expression = this.documentId;
    this.path = NodePath.fromDocument(documentType, documentId);
  }
}

export abstract class BaseField implements IField {
  abstract parent: IParentType;
  abstract ownerDocument: IDocument;
  fields: IField[] = [];
  isAttribute: boolean = false;
  name: string = '';
  expression: string = '';
  type = Types.AnyType;
  minOccurs: number = DEFAULT_MIN_OCCURS;
  maxOccurs: number = DEFAULT_MAX_OCCURS;
  defaultValue: string | null = null;
  namespaceURI: string | null = null;
}
