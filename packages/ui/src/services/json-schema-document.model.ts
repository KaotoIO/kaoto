import { JSONSchema7 } from 'json-schema';

import { getCamelRandomId } from '../camel-utils/camel-random-id';
import {
  BaseDocument,
  BaseField,
  CreateDocumentResult,
  DocumentDefinitionType,
  DocumentType,
  IField,
  ITypeFragment,
  PathExpression,
  PathSegment,
  Types,
} from '../models/datamapper';
import { NodePath } from '../models/datamapper/nodepath';
import { NS_XPATH_FUNCTIONS } from '../models/datamapper/standard-namespaces';
import { Predicate, PredicateOperator } from '../models/datamapper/xpath';
import { JsonSchemaDocumentUtilService } from './json-schema-document-util.service';
import { FROM_JSON_SOURCE_SUFFIX } from './mapping-serializer-json-addon';

export interface CreateJsonSchemaDocumentResult extends CreateDocumentResult {
  document?: JsonSchemaDocument;
}

/**
 * Type fragment representing a named JSON Schema definition.
 * Used to store reusable type definitions that can be referenced via $ref.
 */
export interface JsonSchemaTypeFragment extends ITypeFragment {
  type?: Types;
  required?: string[];
  fields: JsonSchemaField[];
}

/**
 * Extended metadata for a JSON Schema file used in the DataMapper.
 *
 * This interface extends the standard JSONSchema7 specification with additional
 * metadata needed for multi-schema document handling, including file tracking
 * and internal path navigation.
 *
 * @example
 * ```typescript
 * const metadata: JsonSchemaMetadata = {
 *   $id: 'https://example.com/schemas/person.json',
 *   type: 'object',
 *   properties: { name: { type: 'string' } },
 *   identifier: 'https://example.com/schemas/person.json',
 *   filePath: 'schemas/person.json',
 *   path: '#'
 * };
 * ```
 *
 * @see JsonSchemaCollection
 */
export interface JsonSchemaMetadata extends JSONSchema7 {
  /**
   * Unique identifier for this schema, typically the $id field or file path.
   * Used as the primary lookup key in the schema collection.
   */
  identifier: string;

  /**
   * Original file path where this schema was loaded from.
   */
  filePath: string;

  /**
   * JSON path within the schema structure.
   * Starts at '#' for the root and follows JSON path notation (e.g., '#/definitions/Person').
   * Updated as the schema is navigated during $ref resolution.
   */
  path: string;
}

/**
 * Manages a collection of JSON Schema files for multi-schema document support.
 *
 * This class provides a stable facade for schema storage and lookup, maintaining both
 * an ordered array (for iteration and default selection) and a Map (for fast O(1) lookups
 * by various identifiers). It mirrors the architecture of XmlSchemaCollection.
 *
 * The collection supports schema aliasing, where a single schema can be referenced by
 * multiple keys ($id, filePath, relative paths), enabling flexible $ref resolution.
 *
 * @example
 * ```typescript
 * const collection = new JsonSchemaCollection();
 *
 * // Add schema
 * collection.addJsonSchema(personSchema);
 *
 * // Register aliases for different reference formats
 * collection.addAlias(personSchema.identifier, 'schemas/person.json', './schemas/person.json');
 *
 * // Lookup by any registered identifier
 * const schema = collection.getJsonSchema('https://example.com/schemas/person.json');
 * const sameSchema = collection.getJsonSchema('schemas/person.json');
 *
 * // Iterate all unique schemas
 * for (const schema of collection.getJsonSchemas()) {
 *   console.log(schema.identifier);
 * }
 * ```
 *
 * @see XmlSchemaCollection
 */
export class JsonSchemaCollection {
  private readonly schemaArray: JsonSchemaMetadata[] = [];
  private readonly schemaMap = new Map<string, JsonSchemaMetadata>();

  /**
   * Adds a JSON Schema to the collection.
   *
   * The schema is registered under its primary identifier (schema.identifier).
   * To register the schema under additional lookup keys (file paths, relative paths, etc.),
   * use the {@link addAlias} method after adding the schema.
   *
   * @param schema - The schema metadata to add
   *
   * @example
   * ```typescript
   * const schema: JsonSchemaMetadata = {
   *   $id: 'https://example.com/person.json',
   *   type: 'object',
   *   identifier: 'https://example.com/person.json',
   *   filePath: 'person.json',
   *   path: '#'
   * };
   *
   * collection.addJsonSchema(schema);
   * collection.addAlias(schema.identifier, 'person.json', './person.json');
   * ```
   *
   * @see addAlias
   */
  addJsonSchema(schema: JsonSchemaMetadata) {
    this.schemaArray.push(schema);
    this.schemaMap.set(schema.identifier, schema);
  }

  /**
   * Adds one or more alias identifiers for an existing schema.
   *
   * This allows a schema to be looked up by additional keys without
   * re-registering the schema itself. Useful when new references to
   * the same schema are discovered incrementally (e.g., file paths,
   * relative paths, or alternative URIs).
   *
   * @param identifier - The existing identifier of the schema (typically schema.identifier)
   * @param aliases - One or more alias identifiers to register for this schema
   * @returns true if the schema was found and aliases were added, false otherwise
   *
   * @example
   * ```typescript
   * collection.addJsonSchema(schema);
   *
   * collection.addAlias(schema.identifier, './person.json');
   *
   * collection.addAlias(schema.identifier, 'person.json', 'schemas/person.json');
   * ```
   *
   * @see addJsonSchema
   */
  addAlias(identifier: string, ...aliases: string[]): boolean {
    const schema = this.schemaMap.get(identifier);
    if (!schema) return false;
    for (const alias of aliases) {
      this.schemaMap.set(alias, schema);
    }
    return true;
  }

  /**
   * Retrieves a schema by its identifier or any registered alias.
   *
   * @param name - The identifier to look up ($id, file path, or alias)
   * @returns The schema metadata if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const schema1 = collection.getJsonSchema('https://example.com/person.json');
   * const schema2 = collection.getJsonSchema('person.json');
   * const schema3 = collection.getJsonSchema('./person.json');
   * ```
   */
  getJsonSchema(name: string) {
    return this.schemaMap.get(name);
  }

  /**
   * Returns all schemas in the collection without duplicates.
   *
   * Even if a schema was registered with multiple aliases, it appears only once
   * in the returned array, in the order it was added.
   *
   * @returns Array of all unique schemas in insertion order
   */
  getJsonSchemas(): JsonSchemaMetadata[] {
    return this.schemaArray;
  }
}

/**
 * Represents a JSON Schema document in the DataMapper.
 * Contains the parsed structure of a JSON Schema file including all fields and type definitions.
 */
export class JsonSchemaDocument extends BaseDocument {
  isNamespaceAware: boolean = false;
  totalFieldCount: number = 0;
  fields: JsonSchemaField[] = [];
  namedTypeFragments: Record<string, JsonSchemaTypeFragment> = {};
  definitionType: DocumentDefinitionType;
  schemaCollection = new JsonSchemaCollection();

  constructor(documentType: DocumentType, documentId: string) {
    super(documentType, documentId);
    this.name = documentId;
    this.definitionType = DocumentDefinitionType.JSON_SCHEMA;
  }

  /**
   * @param _namespaceMap - Namespace map (not used for JSON schemas)
   * @returns Reference ID string with JSON source suffix appended
   */
  getReferenceId(_namespaceMap: { [prefix: string]: string }): string {
    return this.documentType === DocumentType.PARAM
      ? `${this.documentId}${FROM_JSON_SOURCE_SUFFIX}`
      : `body${FROM_JSON_SOURCE_SUFFIX}`;
  }
}

/**
 * Union type representing valid parent types for JSON Schema fields.
 * A field can be a child of either a document or another field.
 */
export type JsonSchemaParentType = JsonSchemaDocument | JsonSchemaField;

/**
 * Represents a field in a JSON Schema document.
 * Can represent object properties, array items, or primitive values.
 */
export class JsonSchemaField extends BaseField {
  fields: JsonSchemaField[] = [];
  namespaceURI: string = NS_XPATH_FUNCTIONS;
  namespacePrefix: string = 'fn';
  isAttribute = false;
  predicates: Predicate[] = [];
  required: string[] = [];

  constructor(
    public parent: JsonSchemaParentType,
    public key: string,
    public type: Types,
  ) {
    const ownerDocument = ('ownerDocument' in parent ? parent.ownerDocument : parent) as JsonSchemaDocument;
    super(parent, ownerDocument, key);
    this.type = type;
    this.originalType = type;
    this.name = JsonSchemaDocumentUtilService.toXsltTypeName(this.type);
    const keyPart = this.key ? `-${this.key}` : '';
    this.id = `fj-${this.name}${keyPart}${getCamelRandomId('', 4)}`;
    this.path = NodePath.childOf(parent.path, this.id);
    const queryPart = this.key ? ` [@key = ${this.key}]` : '';
    this.displayName = `${this.name}${queryPart}`;

    if (this.key) {
      const left = new PathExpression();
      left.isRelative = true;
      left.pathSegments = [new PathSegment('key', true)];
      this.predicates = [new Predicate(left, PredicateOperator.Equal, this.key)];
    }
  }

  private createNew(parent: JsonSchemaField) {
    const created = new JsonSchemaField(parent, this.key, this.type);
    this.copyTo(created);
    created.minOccurs = parent.required.includes(this.key) ? 1 : 0;
    created.maxOccurs = parent.type === Types.Array ? Number.MAX_SAFE_INTEGER : 1;
    return created;
  }

  adopt(parent: IField): BaseField {
    if (!(parent instanceof JsonSchemaField)) return super.adopt(parent);

    const existing = parent.fields.find((f) => f.isIdentical(this));
    if (!existing) {
      const adopted = this.createNew(parent);
      parent.fields.push(adopted);
      parent.ownerDocument.totalFieldCount++;
      return adopted;
    }

    if (this.type !== Types.AnyType && existing.type === Types.AnyType) {
      const index = parent.fields.indexOf(existing);
      const adopted = this.createNew(parent);
      parent.fields[index] = adopted;
      return adopted;
    }

    if (this.defaultValue !== null) existing.defaultValue = this.defaultValue;
    for (const ref of this.namedTypeFragmentRefs) {
      !existing.namedTypeFragmentRefs.includes(ref) && existing.namedTypeFragmentRefs.push(ref);
    }
    for (const child of this.fields) child.adopt(existing);
    return existing;
  }

  copyTo(to: JsonSchemaField) {
    to.minOccurs = this.minOccurs;
    to.maxOccurs = this.maxOccurs;
    to.defaultValue = this.defaultValue;
    to.namespacePrefix = this.namespacePrefix;
    to.namespaceURI = this.namespaceURI;
    to.typeQName = this.typeQName;
    to.originalType = this.originalType;
    to.originalTypeQName = this.originalTypeQName;
    to.typeOverride = this.typeOverride;
    to.namedTypeFragmentRefs = this.namedTypeFragmentRefs;
    to.fields = this.fields.map((child) => child.adopt(to) as JsonSchemaField);
    return to;
  }

  getExpression(namespaceMap: { [p: string]: string }): string {
    let nsPrefix = Object.keys(namespaceMap).find((key) => namespaceMap[key] === this.namespaceURI);
    if (!nsPrefix) {
      namespaceMap[this.namespacePrefix] = this.namespaceURI;
      nsPrefix = this.namespacePrefix;
    }

    const prefix = nsPrefix ? `${nsPrefix}:` : '';
    const keyQuery = this.key ? `[@key='${this.key}']` : '';
    return `${prefix}${this.name}${keyQuery}`;
  }

  isIdentical(other: IField): boolean {
    if (!('key' in other)) return false;
    return this.key === other.key;
  }
}

/**
 * Represents a resolved JSON Schema $ref with both internal and external components.
 *
 * This class encapsulates the resolution result of a JSON Schema reference, providing
 * methods to access the full reference string, check if it's external, and retrieve
 * the schema and the local part of the path.
 *
 * @example
 * ```typescript
 * const internalRef = new JsonSchemaReference(schema, '/definitions/Address', schema.identifier, schema.identifier);
 * internalRef.getFullReference();
 * internalRef.isExternal();
 *
 * const externalRef = new JsonSchemaReference(customerSchema, '/definitions/Contact', customerSchema.identifier, orderSchema.identifier);
 * externalRef.getFullReference();
 * externalRef.isExternal();
 * ```
 */
export class JsonSchemaReference {
  /**
   * Creates a new JSON Schema reference.
   *
   * @param schema - The schema metadata containing the referenced definition
   * @param localPart - The JSON path within the schema (e.g., '/definitions/Type')
   * @param externalPart - The resolved schema identifier (e.g., 'https://example.com/schema.json')
   * @param originSchemaId - The identifier of the schema where this ref originated
   */
  constructor(
    private readonly schema: JsonSchemaMetadata,
    private readonly localPart: string,
    private readonly externalPart: string,
    private readonly originSchemaId: string,
  ) {}

  /**
   * Returns the full reference string combining external and local parts.
   *
   * @returns The complete reference in format 'schemaIdentifier#jsonPath'
   */
  getFullReference(): string {
    return this.externalPart + '#' + this.localPart;
  }

  /**
   * Checks if this reference crosses schema boundaries.
   *
   * @returns true if the reference points to a different schema, false if internal
   */
  isExternal(): boolean {
    return this.externalPart !== this.originSchemaId;
  }

  /**
   * Returns the JSON path within the schema.
   *
   * @returns The local part (e.g., '/definitions/Type')
   */
  getLocalPart(): string {
    return this.localPart;
  }

  /**
   * Returns the schema metadata containing the referenced definition.
   *
   * @returns The resolved schema metadata
   */
  getSchema(): JsonSchemaMetadata {
    return this.schema;
  }
}
