import { Types } from './types';

export const DEFAULT_MIN_OCCURS = 0;
export const DEFAULT_MAX_OCCURS = 1;

export interface INamespace {
  alias: string;
  uri: string;
  locationUri: string;
  isTarget: boolean;
}

export type IParentType = IDocument | IField;

export enum DocumentType {
  SOURCE_BODY = 'sourceBody',
  TARGET_BODY = 'targetBody',
  PARAM = 'param',
}

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
}

export abstract class BaseDocument implements IDocument {
  documentType: DocumentType = DocumentType.SOURCE_BODY;
  documentId: string = '';
  fields: IField[] = [];
  name: string = '';
  schemaType = '';
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
