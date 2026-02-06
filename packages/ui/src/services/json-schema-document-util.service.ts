import { JSONSchema7, JSONSchema7Definition } from 'json-schema';

import { IField, IParentType } from '../models/datamapper/document';
import { Types } from '../models/datamapper/types';
import { DocumentUtilService } from './document-util.service';
import { JsonSchemaCollection, JsonSchemaMetadata, JsonSchemaReference } from './json-schema-document.model';

const REGEX_JSON_SLASH_ESCAPE = /~1/g;
const REGEX_JSON_TILDE_ESCAPE = /~0/g;

/**
 * Utility service for JSON Schema document operations.
 * Provides helper methods for field lookup, type mapping, and type override handling.
 *
 * @see JsonSchemaDocumentService
 * @see JsonSchemaDocument
 * @see JsonSchemaField
 */
export class JsonSchemaDocumentUtilService {
  /**
   * Finds a child field by key, type, and optional namespace URI.
   * @param parentField - The parent field or document to search
   * @param type - The field type to match
   * @param fieldKey - The field key to match
   * @param namespaceURI - Optional namespace URI to match
   * @returns The matching child field, or undefined if not found
   */
  static getChildField(
    parentField: IParentType,
    type: Types,
    fieldKey: string,
    namespaceURI: string,
  ): IField | undefined {
    const resolvedParent = 'parent' in parentField ? DocumentUtilService.resolveTypeFragment(parentField) : parentField;
    return resolvedParent.fields.find((f) => {
      return (
        'key' in f &&
        f.key === fieldKey &&
        JsonSchemaDocumentUtilService.toXsltTypeName(f.type) === JsonSchemaDocumentUtilService.toXsltTypeName(type) &&
        ((!namespaceURI && !f.namespaceURI) || f.namespaceURI === namespaceURI)
      );
    });
  }

  /**
   * Converts a Types enum value to its XSLT type name representation.
   * @param type - The Types enum value to convert
   * @returns The XSLT type name (e.g., "string", "number", "map", "array")
   */
  static toXsltTypeName(type: Types): string {
    switch (type) {
      case Types.String:
        return 'string';
      case Types.Numeric:
        return 'number';
      case Types.Integer:
        return 'number';
      case Types.Boolean:
        return 'boolean';
      case Types.Container:
        return 'map';
      case Types.Array:
        return 'array';
      default:
        return 'map';
    }
  }

  /**
   * Elects one corresponding {@link Types} of the schema. If `type` is not explicitly specified,
   * It looks for `items` to make it {@link Types.Array} and `properties` to make it {@link Types.Container}.
   * If the `type` is specified, elect one corresponding {@link Types} out of it. Note that JSON schema `type`
   * could be an array, but current version of DataMapper doesn't support array types, thus it needs to choose
   * one. The precedence order is {@link Types.Array} > {@link Types.Container} > {@link Types.String} >
   * {@link Types.Numeric} > {@link Types.Boolean}.
   * @param schema - The JSON schema metadata to analyze
   * @returns The inferred Types enum value
   */
  static electFieldTypeFromSchema(schema: JsonSchemaMetadata): Types {
    if (!schema.type) {
      if (schema.items) return Types.Array;
      else if (schema.properties) return Types.Container;

      return Types.AnyType;
    }

    const typesArray = Array.isArray(schema.type) ? schema.type : [schema.type];

    // choose one field type
    // what do we want to do with `null` type? there might be something to do in UI
    // for if it's nillable or not... need to support an array of field types first
    if (typesArray.includes('array')) return Types.Array;
    if (typesArray.includes('object')) return Types.Container;
    if (typesArray.includes('string')) return Types.String;
    // treat JSON Schema integer distinctly so toXsltTypeName(Types.Integer) path is exercised
    if (typesArray.includes('integer')) return Types.Integer;
    if (typesArray.includes('number')) return Types.Numeric;
    if (typesArray.includes('boolean')) return Types.Boolean;

    return Types.AnyType;
  }

  /**
   * Parses a JSON schema string and creates JsonSchemaMetadata.
   * Uses the schema's $id as the identifier, falling back to the filePath if $id is not present.
   *
   * @param content The JSON schema file content as a string
   * @param filePath The file path of the schema
   * @returns JsonSchemaMetadata with identifier, filePath, and parsed schema properties
   * @throws Error if JSON parsing fails
   */
  static parseJsonSchema(content: string, filePath: string): JsonSchemaMetadata {
    try {
      const row = JSON.parse(content) as JSONSchema7;
      const identifier = row.$id || filePath;
      return { ...row, identifier, filePath, path: '#' };
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new Error(`Failed to parse JSON schema. Error: ${error.message}`);
    }
  }

  /**
   * Resolves a JsonSchemaReference object to the actual schema definition it points to.
   *
   * Navigates through the referenced schema using the JSON path to retrieve the actual definition.
   *
   * @param ref - The JsonSchemaReference to resolve
   * @returns The definition at the referenced location, or undefined if not found
   *
   * @example
   * ```typescript
   * const reference = createJsonSchemaReference('#/definitions/Address', schema, collection);
   * const definition = resolveJsonSchemaReference(reference);
   * ```
   */
  static resolveJsonSchemaReference(ref: JsonSchemaReference): JSONSchema7Definition | JSONSchema7 | undefined {
    const schema = ref.getSchema();
    const path = ref.getLocalPart();

    if (!path || path === '/' || path === '') {
      return schema;
    }

    const cleanPath = path.startsWith('#') ? path.substring(1) : path;
    if (!cleanPath || cleanPath === '/') {
      return schema;
    }

    const parts = cleanPath.startsWith('/') ? cleanPath.substring(1).split('/') : cleanPath.split('/');

    let current = schema;

    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      if (!part) {
        continue;
      }

      const decodedPart = decodeURIComponent(
        part.replace(REGEX_JSON_SLASH_ESCAPE, '/').replace(REGEX_JSON_TILDE_ESCAPE, '~'),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      current = (current as any)[decodedPart];
    }

    return current;
  }

  /**
   * Creates a JsonSchemaReference object from a $ref string.
   *
   * Handles both internal refs (#/definitions/Type) and external refs (./File.json#/definitions/Type).
   * For external refs, looks up the schema by identifier first, then falls back to filename matching.
   *
   * @param ref - The $ref string to parse (e.g., '#/definitions/Type' or './Customer.json#/definitions/Contact')
   * @param currentSchema - The schema containing this $ref
   * @param schemaCollection - The collection of loaded schemas
   * @returns A JsonSchemaReference object, or null if ref is empty
   * @throws Error if external schema cannot be found in the collection
   *
   * @example
   * ```typescript
   * const reference = JsonSchemaDocumentUtilService.createJsonSchemaReference(
   *   '#/definitions/Address',
   *   orderSchema,
   *   collection
   * );
   * console.log(reference.isExternal()); // false
   * console.log(reference.getLocalPart()); // '/definitions/Address'
   *
   * const reference = JsonSchemaDocumentUtilService.createJsonSchemaReference(
   *   './Customer.json#/definitions/Contact',
   *   orderSchema,
   *   collection
   * );
   * console.log(reference.isExternal()); // true
   * console.log(reference.getFullReference());
   * ```
   */
  static createJsonSchemaReference(
    ref: string,
    currentSchema: JsonSchemaMetadata,
    schemaCollection: JsonSchemaCollection,
  ): JsonSchemaReference | null {
    if (!ref) {
      return null;
    }

    if (ref.startsWith('#')) {
      const localPart = ref.substring(1);
      return new JsonSchemaReference(currentSchema, localPart, currentSchema.identifier, currentSchema.identifier);
    }

    const [schemaPart, fragment] = ref.split('#');
    const localPart = fragment || '';

    let resolvedSchema = schemaCollection.getJsonSchema(schemaPart);

    if (!resolvedSchema) {
      const filename = schemaPart.split('/').pop() || schemaPart;
      for (const schema of schemaCollection.getJsonSchemas()) {
        if (schema.filePath.endsWith(filename) || schema.identifier.endsWith(filename)) {
          resolvedSchema = schema;
          break;
        }
      }
    }

    resolvedSchema ??= schemaCollection.resolveReference(ref, currentSchema);

    if (!resolvedSchema) {
      throw new Error(
        `Cannot resolve external schema reference [${ref}]: Schema '${schemaPart}' not found in loaded schemas`,
      );
    }

    return new JsonSchemaReference(resolvedSchema, localPart, resolvedSchema.identifier, currentSchema.identifier);
  }
}
