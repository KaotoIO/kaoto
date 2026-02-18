import { JSONSchema7, JSONSchema7Definition } from 'json-schema';

import { getCamelRandomId } from '../camel-utils/camel-random-id';
import {
  BaseDocument,
  BaseField,
  CreateDocumentResult,
  DocumentDefinition,
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

  schemaDependencies?: string[];

  schemaDependents?: string[];
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
  private definitionFiles: Record<string, string> = {};

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

  /**
   * Sets the definition files map for dynamic schema resolution.
   * This enables automatic loading of schemas referenced via $ref.
   *
   * @param files - Map of file paths to file contents
   *
   * @example
   * ```typescript
   * collection.setDefinitionFiles({
   *   'schemas/person.json': '{ "$id": "person", ... }',
   *   'schemas/address.json': '{ "$id": "address", ... }'
   * });
   * ```
   */
  setDefinitionFiles(files: Record<string, string>): void {
    this.definitionFiles = files;
  }

  /**
   * Adds additional definition files to the collection.
   * This allows dynamic loading of schemas after initial document creation.
   *
   * @param newFiles - Map of file paths to file contents to add
   *
   * @example
   * ```typescript
   * collection.addDefinitionFiles({
   *   'schemas/customer.json': '{ "$id": "customer", ... }'
   * });
   * ```
   */
  addDefinitionFiles(newFiles: Record<string, string>): void {
    Object.assign(this.definitionFiles, newFiles);
  }

  /**
   * Resolves a JSON Schema $ref and loads the schema if needed.
   * Uses a multi-tiered resolution strategy similar to XML DefaultURIResolver.
   *
   * @param ref - The $ref string to resolve (e.g., './types.json#/definitions/Address')
   * @param currentSchema - The schema containing this $ref (for relative path resolution)
   * @returns The resolved schema metadata, or undefined if not found or internal ref
   *
   * @example
   * ```typescript
   * const schema = collection.resolveReference('./types.json#/definitions/Address', currentSchema);
   * ```
   */
  resolveReference(ref: string, currentSchema: JsonSchemaMetadata): JsonSchemaMetadata | undefined {
    const [schemaPart] = ref.split('#');

    if (!schemaPart || schemaPart === '') {
      return undefined;
    }

    const schema = this.getJsonSchema(schemaPart);
    if (schema) {
      return schema;
    }

    if (this.definitionFiles[schemaPart]) {
      return this.loadSchemaFromFileMap(schemaPart, this.definitionFiles[schemaPart]);
    }

    const resolvedPath = this.resolvePath(schemaPart, currentSchema.filePath);
    if (resolvedPath !== schemaPart && this.definitionFiles[resolvedPath]) {
      return this.loadSchemaFromFileMap(resolvedPath, this.definitionFiles[resolvedPath]);
    }

    const normalizedPath = this.normalizePath(schemaPart);
    if (normalizedPath !== schemaPart && this.definitionFiles[normalizedPath]) {
      return this.loadSchemaFromFileMap(normalizedPath, this.definitionFiles[normalizedPath]);
    }

    const filename = this.extractFilename(schemaPart);
    return this.findByFilename(filename);
  }

  /**
   * Gets all definitions from all schemas in the collection.
   * Combines $defs and definitions from all schemas into a single Map.
   *
   * @returns Map of definition paths to their schema definitions
   */
  getDefinitions(): Map<string, JSONSchema7Definition> {
    const definitions = new Map<string, JSONSchema7Definition>();
    for (const schema of this.schemaArray) {
      if (schema.$defs) {
        for (const [key, value] of Object.entries(schema.$defs)) {
          definitions.set(`#/$defs/${key}`, value);
        }
      }
      if (schema.definitions) {
        for (const [key, value] of Object.entries(schema.definitions)) {
          definitions.set(`#/definitions/${key}`, value);
        }
      }
    }
    return definitions;
  }

  private loadSchemaFromFileMap(filePath: string, content: string): JsonSchemaMetadata {
    try {
      const schema = JsonSchemaDocumentUtilService.parseJsonSchema(content, filePath);
      this.addJsonSchema(schema);

      const aliases: string[] = [];
      if (schema.$id && schema.$id !== schema.filePath) {
        aliases.push(schema.filePath);
      }
      const relativePath = './' + schema.filePath;
      if (relativePath !== schema.filePath) {
        aliases.push(relativePath);
      }
      if (aliases.length > 0) {
        this.addAlias(schema.identifier, ...aliases);
      }

      return schema;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load schema from "${filePath}": ${errorMessage}`);
    }
  }

  private resolvePath(schemaLocation: string, baseUri: string): string {
    if (this.isAbsolutePath(schemaLocation)) {
      return schemaLocation;
    }

    const baseDir = this.extractDirectory(baseUri);
    if (!baseDir) {
      return schemaLocation;
    }

    const combined = `${baseDir}/${schemaLocation}`;
    return this.normalizePath(combined);
  }

  private normalizePath(path: string): string {
    const parts = path.split('/').filter((part) => part !== '.');

    const normalized: string[] = [];
    for (const part of parts) {
      if (part === '..') {
        if (normalized.length > 0 && normalized.at(-1) !== '..') {
          normalized.pop();
        } else {
          normalized.push(part);
        }
      } else {
        normalized.push(part);
      }
    }

    return normalized.join('/');
  }

  private extractDirectory(path: string): string | null {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) {
      return null;
    }
    return path.substring(0, lastSlash);
  }

  private extractFilename(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash === -1 ? path : path.substring(lastSlash + 1);
  }

  private findByFilename(filename: string): JsonSchemaMetadata | undefined {
    const matchingPaths: string[] = [];

    for (const path of Object.keys(this.definitionFiles)) {
      if (this.extractFilename(path) === filename) {
        matchingPaths.push(path);
      }
    }

    if (matchingPaths.length === 0) {
      return undefined;
    }

    if (matchingPaths.length > 1) {
      throw new Error(
        `Ambiguous filename match for "${filename}". ` + `Multiple files with this name found in definitionFiles.`,
      );
    }

    return this.loadSchemaFromFileMap(matchingPaths[0], this.definitionFiles[matchingPaths[0]]);
  }

  private isAbsolutePath(path: string): boolean {
    return path.startsWith('/');
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

  constructor(definition: DocumentDefinition) {
    super(definition);
    this.name = definition.name;
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

  adopt(parent: IField): IField {
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
    if (this.isChoice !== undefined) existing.isChoice = this.isChoice;
    if (this.selectedMemberIndex !== undefined) existing.selectedMemberIndex = this.selectedMemberIndex;
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
    to.isChoice = this.isChoice;
    to.selectedMemberIndex = this.selectedMemberIndex;
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
