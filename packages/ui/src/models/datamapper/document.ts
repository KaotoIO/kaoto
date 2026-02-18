import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { MaxOccursType } from '../../xml-schema-ts/constants';
import { QName } from '../../xml-schema-ts/QName';
import { IFieldTypeOverride } from './metadata';
import { NodePath } from './nodepath';
import { ReportMessage } from './schema';
import { TypeOverrideVariant, Types } from './types';
import { Predicate } from './xpath';

/**
 * Union type representing valid parent types for fields.
 * A field can be a child of either a document or another field.
 */
export type IParentType = IDocument | IField;

/**
 * Document ID constant for the main body document.
 */
export const BODY_DOCUMENT_ID = 'Body';

/**
 * Interface representing a field in a document schema.
 * Fields can be elements, attributes, or properties depending on the schema type.
 */
export interface IField {
  /** Parent field or document containing this field */
  parent: IParentType;
  /** Document that owns this field */
  ownerDocument: IDocument;
  /** Unique identifier for this field instance */
  id: string;
  /** Field name as it appears in the schema */
  name: string;
  /** Human-readable display name for UI presentation */
  displayName: string;
  /** Path from document root to this field */
  path: NodePath;
  /** Current data type of this field in DataMapper common style */
  type: Types;
  /** The data format specific, qualified name of the current type of this field, if applicable */
  typeQName: QName | null;
  /** Original data type of this field before any overrides, in DataMapper common style */
  originalType: Types;
  /** The data format specific, qualified name of the original type of this field before any overrides, if applicable */
  originalTypeQName: QName | null;
  /** Indicates whether and how the type has been overridden */
  typeOverride: TypeOverrideVariant;
  /** Child fields for complex types */
  fields: IField[];
  /** Whether this field represents an attribute (vs element) */
  isAttribute: boolean;
  /** Default value for this field, if specified in schema */
  defaultValue: string | null;
  /** Minimum number of occurrences (0 = optional) */
  minOccurs: number;
  /** Maximum number of occurrences (1 = single, >1 or 'unbounded' = collection) */
  maxOccurs: MaxOccursType;
  /** Namespace prefix for this field */
  namespacePrefix: string | null;
  /** Namespace URI for this field */
  namespaceURI: string | null;
  /** References to named type fragments used by this field */
  namedTypeFragmentRefs: string[];
  /** XPath predicates for filtering this field */
  predicates: Predicate[];
  /** Whether this field represents a choice compositor */
  isChoice?: boolean;
  /** Index of selected member (0-based), undefined = show all */
  selectedMemberIndex?: number;

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

/**
 * Interface representing a reusable type fragment.
 * Type fragments define named types that can be referenced by multiple fields.
 */
export interface ITypeFragment {
  type?: Types;
  minOccurs?: number;
  maxOccurs?: MaxOccursType;
  fields: IField[];
  namedTypeFragmentRefs: string[];
}

/**
 * Enum representing document roles in a data mapping.
 */
export enum DocumentType {
  SOURCE_BODY = 'sourceBody',
  TARGET_BODY = 'targetBody',
  PARAM = 'param',
}

/**
 * Interface representing a document in the DataMapper.
 * Documents contain the schema structure and field definitions.
 */
export interface IDocument {
  /** Type of document (source body, target body, or parameter) */
  documentType: DocumentType;
  /** Unique identifier for this document */
  documentId: string;
  /** Document name for display */
  name: string;
  /** Type of schema definition (XML Schema, JSON Schema, or Primitive) */
  definitionType: DocumentDefinitionType;
  /** Top-level fields in this document */
  fields: IField[];
  /** Path representing this document in the node hierarchy */
  path: NodePath;
  /** Named type fragments (reusable type definitions) available in this document */
  namedTypeFragments: Record<string, ITypeFragment>;
  /** The definition used to create this document */
  definition: DocumentDefinition;
  /** Total count of all fields (including nested) in this document */
  totalFieldCount: number;
  /** Whether this document type uses namespaces */
  isNamespaceAware: boolean;

  /**
   * Gets the reference ID for this document in XSLT mappings.
   * Used to create variable references in generated XSLT.
   * @param namespaceMap - Map of namespace prefixes to URIs
   * @returns Reference ID string, or empty string if not applicable
   */
  getReferenceId(namespaceMap: { [prefix: string]: string }): string;

  /**
   * Gets an XPath expression to reference this document.
   * @param namespaceMap - Map of namespace prefixes to URIs
   * @returns XPath expression string, or empty string if not applicable
   */
  getExpression(namespaceMap: { [prefix: string]: string }): string;
}

/**
 * Base abstract class for all document types.
 * Provides common functionality for document operations.
 */
export abstract class BaseDocument implements IDocument {
  documentType: DocumentType;
  documentId: string;
  path: NodePath;
  fields: IField[] = [];
  name: string = '';
  abstract definitionType: DocumentDefinitionType;
  namedTypeFragments: Record<string, ITypeFragment> = {};
  abstract totalFieldCount: number;
  abstract isNamespaceAware: boolean;

  constructor(public definition: DocumentDefinition) {
    this.documentType = definition.documentType;
    this.documentId = definition.name;
    this.path = NodePath.fromDocument(this.documentType, this.documentId);
  }

  getReferenceId(_namespaceMap: { [p: string]: string }): string {
    return this.documentType === DocumentType.PARAM ? this.documentId : '';
  }

  getExpression(namespaceMap: { [prefix: string]: string }): string {
    return this.documentType === DocumentType.PARAM ? `$${this.getReferenceId(namespaceMap)}` : '';
  }
}

/**
 * Represents a primitive document without a defined schema.
 * Used as a placeholder when no schema is provided.
 */
export class PrimitiveDocument extends BaseDocument implements IField {
  constructor(definition: DocumentDefinition) {
    super(definition);
    this.name = definition.name;
    this.displayName = this.name;
    this.id = definition.name;
    this.path = NodePath.fromDocument(definition.documentType, definition.name);
  }

  definitionType: DocumentDefinitionType = DocumentDefinitionType.Primitive;
  ownerDocument: IDocument = this;
  defaultValue: string | null = null;
  isAttribute: boolean = false;
  maxOccurs: MaxOccursType = 1;
  minOccurs: number = 0;
  namespacePrefix: string | null = null;
  namespaceURI: string | null = null;
  parent: IParentType = this;
  type = Types.AnyType;
  typeQName: QName | null = null;
  originalType = Types.AnyType;
  originalTypeQName: QName | null = null;
  typeOverride = TypeOverrideVariant.NONE;
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
    return false;
  }
}

/**
 * Base implementation of the IField interface.
 * Provides default field behavior that can be extended by specific schema types.
 */
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
  typeQName: QName | null = null;
  originalType = Types.AnyType;
  originalTypeQName: QName | null = null;
  typeOverride = TypeOverrideVariant.NONE;
  minOccurs: number = 0;
  maxOccurs: MaxOccursType = 1;
  defaultValue: string | null = null;
  namespacePrefix: string | null = null;
  namespaceURI: string | null = null;
  namedTypeFragmentRefs: string[] = [];
  predicates: Predicate[] = [];
  isChoice?: boolean;
  selectedMemberIndex?: number;

  protected mergeInto(existing: IField): void {
    if (this.type && this.type !== Types.AnyType) existing.type = this.type;
    if (this.defaultValue !== null) existing.defaultValue = this.defaultValue;
    for (const ref of this.namedTypeFragmentRefs) {
      !existing.namedTypeFragmentRefs.includes(ref) && existing.namedTypeFragmentRefs.push(ref);
    }
    if (this.isChoice !== undefined) existing.isChoice = this.isChoice;
    if (this.selectedMemberIndex !== undefined) existing.selectedMemberIndex = this.selectedMemberIndex;
    for (const child of this.fields) child.adopt(existing);
  }

  adopt(parent: IField): IField {
    const existing = parent.fields.find((f) => f.isIdentical(this));
    if (existing) {
      this.mergeInto(existing);
      return existing;
    }

    const adopted = new BaseField(parent, parent.ownerDocument, this.name);
    adopted.isAttribute = this.isAttribute;
    adopted.type = this.type;
    adopted.typeQName = this.typeQName;
    adopted.originalType = this.originalType;
    adopted.originalTypeQName = this.originalTypeQName;
    adopted.typeOverride = this.typeOverride;
    adopted.minOccurs = this.minOccurs;
    adopted.maxOccurs = this.maxOccurs;
    adopted.defaultValue = this.defaultValue;
    adopted.namespacePrefix = this.namespacePrefix;
    adopted.namespaceURI = this.namespaceURI;
    adopted.namedTypeFragmentRefs = this.namedTypeFragmentRefs;
    adopted.isChoice = this.isChoice;
    adopted.selectedMemberIndex = this.selectedMemberIndex;
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

/**
 * Enum representing the type of document definition (schema format).
 */
export enum DocumentDefinitionType {
  Primitive = 'Primitive',
  XML_SCHEMA = 'XML Schema',
  JSON_SCHEMA = 'JSON Schema',
}

/**
 * Defines the metadata for a document schema.
 * Contains schema files, type overrides, and configuration options.
 */
export class DocumentDefinition {
  constructor(
    public documentType: DocumentType,
    public definitionType: DocumentDefinitionType,
    public name: string,
    public definitionFiles?: Record<string, string>,
    public rootElementChoice?: RootElementOption,
    public fieldTypeOverrides?: IFieldTypeOverride[],
    public namespaceMap?: Record<string, string>,
  ) {
    if (!definitionFiles) this.definitionFiles = {};
  }
}

/**
 * Model for initializing a complete DataMapper configuration.
 * Includes source parameters, source body, and target body definitions.
 */
export class DocumentInitializationModel {
  constructor(
    public sourceParameters: Record<string, DocumentDefinition> = {},
    public sourceBody: DocumentDefinition = {
      documentType: DocumentType.SOURCE_BODY,
      definitionType: DocumentDefinitionType.Primitive,
      name: BODY_DOCUMENT_ID,
    },
    public targetBody: DocumentDefinition = {
      documentType: DocumentType.TARGET_BODY,
      definitionType: DocumentDefinitionType.Primitive,
      name: BODY_DOCUMENT_ID,
    },
    public namespaceMap: Record<string, string> = {},
  ) {}
}

/**
 * Represents a root element choice in an XML schema.
 * Used when a schema has multiple possible root elements.
 */
export type RootElementOption = {
  namespaceUri: string;
  name: string;
};

/**
 * Result object returned when creating a document from a schema.
 * Contains validation status and the created document or error information.
 */
export interface CreateDocumentResult {
  validationStatus: 'success' | 'warning' | 'error';
  errors?: ReportMessage[];
  warnings?: ReportMessage[];
  documentDefinition?: DocumentDefinition;
  document?: IDocument;
  rootElementOptions?: RootElementOption[];
}

/**
 * Glob pattern for matching schema files (XML and JSON).
 */
export const SCHEMA_FILE_NAME_PATTERN = '**/*.{xsd,XSD,xml,XML,json,JSON}';

/**
 * File accept pattern for schema file input elements.
 */
export const SCHEMA_FILE_ACCEPT_PATTERN = '.xsd, .xml, .json';

/**
 * Glob pattern for matching XML-only schema files.
 * Used when JSON schemas are not supported (e.g., older Camel versions without useJsonBody parameter).
 */
export const SCHEMA_FILE_NAME_PATTERN_XML = '**/*.{xsd,XSD,xml,XML}';

/**
 * File accept pattern for XML-only schema file input elements.
 * Used when JSON schemas are not supported (e.g., older Camel versions without useJsonBody parameter).
 */
export const SCHEMA_FILE_ACCEPT_PATTERN_XML = '.xsd, .xml';
