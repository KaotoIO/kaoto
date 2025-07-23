import { Types } from './types';
import { NodePath } from './nodepath';
import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { Predicate } from './xpath';

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
  displayName: string;
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
  predicates: Predicate[];
  adopt(parent: IField): IField;
  getExpression(namespaceMap: { [prefix: string]: string }): string;
}

export interface ITypeFragment {
  type?: Types;
  minOccurs?: number;
  maxOccurs?: number;
  fields: IField[];
  namedTypeFragmentRefs: string[];
}

export enum DocumentType {
  SOURCE_BODY = 'sourceBody',
  TARGET_BODY = 'targetBody',
  PARAM = 'param',
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
  getReferenceId(namespaceMap: { [prefix: string]: string }): string;
  getExpression(namespaceMap: { [prefix: string]: string }): string;
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
  getReferenceId(_namespaceMap: { [p: string]: string }): string {
    return this.documentType === DocumentType.PARAM ? this.documentId : '';
  }

  getExpression(namespaceMap: { [prefix: string]: string }): string {
    return this.documentType === DocumentType.PARAM ? `$${this.getReferenceId(namespaceMap)}` : '';
  }
}

export class PrimitiveDocument extends BaseDocument implements IField {
  constructor(documentType: DocumentType, documentId: string) {
    super(documentType, documentId);
    this.name = this.documentId;
    this.displayName = this.name;
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
  displayName: string;
  namedTypeFragmentRefs = [];
  totalFieldCount = 1;
  isNamespaceAware = false;
  predicates: Predicate[] = [];

  adopt(_field: IField) {
    return this;
  }
}

export class BaseField implements IField {
  constructor(
    public parent: IParentType,
    public ownerDocument: IDocument,
    public name: string,
  ) {
    this.id = getCamelRandomId(`fb-${this.name}`, 4);
    this.displayName = name;
    this.path = NodePath.childOf(parent.path, this.id);
  }

  id: string;
  displayName: string;
  path: NodePath;
  fields: IField[] = [];
  isAttribute: boolean = false;
  type = Types.AnyType;
  minOccurs: number = DEFAULT_MIN_OCCURS;
  maxOccurs: number = DEFAULT_MAX_OCCURS;
  defaultValue: string | null = null;
  namespacePrefix: string | null = null;
  namespaceURI: string | null = null;
  namedTypeFragmentRefs: string[] = [];
  predicates: Predicate[] = [];

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

  getExpression(_namespaceMap: { [prefix: string]: string }): string {
    return this.name;
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

export const SCHEMA_FILE_NAME_PATTERN = '**/*.{xsd,XSD,xml,XML,json,JSON}';
export const SCHEMA_FILE_ACCEPT_PATTERN = '.xsd, .xml, .json';
// camel XSLT (including saxon) doesn't support JSON body
export const SCHEMA_FILE_NAME_PATTERN_SOURCE_BODY = '**/*.{xsd,XSD,xml,XML}';
export const SCHEMA_FILE_ACCEPT_PATTERN_SOURCE_BODY = '.xsd, .xml';
