import { Types } from './types';
import { NodePath } from './nodepath';
import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { Predicate } from './xpath';
import { XmlSchemaParticle } from '../../xml-schema-ts/particle/XmlSchemaParticle';

export const DEFAULT_MIN_OCCURS = XmlSchemaParticle.DEFAULT_MIN_OCCURS;
export const DEFAULT_MAX_OCCURS = XmlSchemaParticle.DEFAULT_MAX_OCCURS;

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

  /**
   * Adopts itself to a passed-in parent {@link IField} as a child. This method is also responsible for inheritance.
   * If there's existing field that is identical, i.e. {@link isIdentical()} returns true, it should inherit the
   * field properties from base if it's not yet defined, or keep the current property value if it's already defined
   * in descendant (override).
   * @param parent
   */
  adopt(parent: IField): IField;

  /**
   * Gets an expression to represent this field.
   * @param namespaceMap
   */
  getExpression(namespaceMap: { [prefix: string]: string }): string;

  /**
   * Returns `true` if the passed-in field is identical with this, otherwise returns `false`. Whether two fields
   * are identical or not depends on field types, for example XML field needs to also verify if they're in the same namespace.
   * @param other
   */
  isIdentical(other: IField): boolean;
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

  isIdentical(_other: IField): boolean {
    // Just a placeholder to be also IField, there should be no identical PrimitiveDocument
    return false;
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

  adopt(parent: IField): BaseField {
    const existing = parent.fields.find((f) => f.isIdentical(this));
    if (existing) {
      if (this.type && this.type !== Types.AnyType) existing.type = this.type;
      if (this.defaultValue !== null) existing.defaultValue = this.defaultValue;
      for (const ref of this.namedTypeFragmentRefs) {
        !existing.namedTypeFragmentRefs.includes(ref) && existing.namedTypeFragmentRefs.push(ref);
      }
      for (const child of this.fields) child.adopt(existing);
      return existing;
    }

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
    parent.ownerDocument.totalFieldCount++;
    return adopted;
  }

  getExpression(_namespaceMap: { [prefix: string]: string }): string {
    return this.name;
  }

  isIdentical(other: IField): boolean {
    return this.name === other.name;
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
    public rootElementChoice?: RootElementOption,
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

export type RootElementOption = {
  namespaceUri: string;
  name: string;
};

export interface CreateDocumentResult {
  validationStatus: 'success' | 'warning' | 'error';
  validationMessage?: string;
  documentDefinition?: DocumentDefinition;
  document?: IDocument;
  rootElementOptions?: RootElementOption[];
}

export const SCHEMA_FILE_NAME_PATTERN = '**/*.{xsd,XSD,xml,XML,json,JSON}';
export const SCHEMA_FILE_ACCEPT_PATTERN = '.xsd, .xml, .json';
// camel XSLT (including saxon) doesn't support JSON body
export const SCHEMA_FILE_NAME_PATTERN_SOURCE_BODY = '**/*.{xsd,XSD,xml,XML}';
export const SCHEMA_FILE_ACCEPT_PATTERN_SOURCE_BODY = '.xsd, .xml';
