import { Types } from './types';
import { DocumentType, NodePath } from './path';
import { getCamelRandomId } from '../../camel-utils/camel-random-id';

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
  id: string;
  name: string;
  expression: string;
  path: NodePath;
  type: Types;
  fields: IField[];
  isAttribute: boolean;
  defaultValue: string | null;
  minOccurs: number;
  maxOccurs: number;
  namespacePrefix: string | null;
  namespaceURI: string | null;
  namedTypeFragmentRefs: string[];
  adopt: (parent: IField) => IField;
}

export interface ITypeFragment {
  type?: Types;
  minOccurs?: number;
  maxOccurs?: number;
  fields: IField[];
  namedTypeFragmentRefs: string[];
}

export interface IDocument {
  documentType: DocumentType;
  documentId: string;
  name: string;
  definitionType: DocumentDefinitionType;
  fields: IField[];
  path: NodePath;
  namedTypeFragments: Record<string, ITypeFragment>;
  totalFieldCount: number;
  isNamespaceAware: boolean;
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
  abstract definitionType: DocumentDefinitionType;
  path: NodePath;
  namedTypeFragments: Record<string, ITypeFragment> = {};
  abstract totalFieldCount: number;
  abstract isNamespaceAware: boolean;
}

export class PrimitiveDocument extends BaseDocument implements IField {
  constructor(documentType: DocumentType, documentId: string) {
    super(documentType, documentId);
    this.name = this.documentId;
    this.expression = this.documentId;
    this.id = this.documentId;
    this.path = NodePath.fromDocument(documentType, documentId);
  }

  definitionType: DocumentDefinitionType = DocumentDefinitionType.Primitive;
  ownerDocument: IDocument = this;
  defaultValue: string | null = null;
  isAttribute: boolean = false;
  maxOccurs: number = 1;
  minOccurs: number = 0;
  namespacePrefix: string | null = null;
  namespaceURI: string | null = null;
  parent: IParentType = this;
  type = Types.AnyType;
  path: NodePath;
  id: string;
  expression: string;
  namedTypeFragmentRefs = [];
  totalFieldCount = 1;
  isNamespaceAware = false;
  adopt = () => this;
}

export class BaseField implements IField {
  constructor(
    public parent: IParentType,
    public ownerDocument: IDocument,
    public name: string,
  ) {
    this.id = getCamelRandomId(`field-${this.name}`, 4);
    this.path = NodePath.childOf(parent.path, this.id);
    this.expression = name;
  }

  id: string;
  path: NodePath;
  expression: string;
  fields: IField[] = [];
  isAttribute: boolean = false;
  protected _type = Types.AnyType;
  public get type() {
    return this._type;
  }
  public set type(value) {
    this._type = value;
  }
  minOccurs: number = DEFAULT_MIN_OCCURS;
  maxOccurs: number = DEFAULT_MAX_OCCURS;
  defaultValue: string | null = null;
  namespacePrefix: string | null = null;
  namespaceURI: string | null = null;
  namedTypeFragmentRefs: string[] = [];

  adopt(parent: IField) {
    const adopted = new BaseField(parent, parent.ownerDocument, this.name);
    adopted.isAttribute = this.isAttribute;
    adopted.type = this.type;
    adopted.minOccurs = this.minOccurs;
    adopted.maxOccurs = this.maxOccurs;
    adopted.defaultValue = this.defaultValue;
    adopted.namespacePrefix = this.namespacePrefix;
    adopted.namespaceURI = this.namespaceURI;
    adopted.namedTypeFragmentRefs = this.namedTypeFragmentRefs;
    adopted.fields = this.fields.map((child) => child.adopt(adopted));
    parent.fields.push(adopted);
    return adopted;
  }
}

export enum DocumentDefinitionType {
  Primitive = 'Primitive',
  XML_SCHEMA = 'XML Schema',
  JSON_SCHEMA = 'JSON Schema',
}

export class DocumentDefinition {
  constructor(
    public documentType: DocumentType,
    public definitionType: DocumentDefinitionType,
    public name?: string,
    public definitionFiles?: Record<string, string>,
  ) {
    if (!definitionFiles) this.definitionFiles = {};
  }
}

export class DocumentInitializationModel {
  constructor(
    public sourceParameters: Record<string, DocumentDefinition> = {},
    public sourceBody: DocumentDefinition = {
      documentType: DocumentType.SOURCE_BODY,
      definitionType: DocumentDefinitionType.Primitive,
    },
    public targetBody: DocumentDefinition = {
      documentType: DocumentType.TARGET_BODY,
      definitionType: DocumentDefinitionType.Primitive,
    },
  ) {}
}
