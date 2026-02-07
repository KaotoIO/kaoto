import { IField } from '../models/datamapper/document';
import { IFieldTypeInfo, TypeOverrideVariant, Types } from '../models/datamapper/types';
import { QName } from '../xml-schema-ts/QName';
import { JsonSchemaDocument } from './json-schema-document.model';

/**
 * Service for JSON Schema type-related operations.
 *
 * Handles type parsing, validation, and querying for JSON Schema types.
 * Parallel to XmlSchemaTypesService but for JSON Schema documents.
 * Note: JSON Schema doesn't have a type inheritance model like XML Schema,
 * so most type changes are considered FORCE overrides.
 *
 * @see JsonSchemaDocumentService
 * @see JsonSchemaDocumentUtilService
 * @see FieldTypeOverrideService
 */
export class JsonSchemaTypesService {
  /**
   * Parse a type override string and determine the override variant.
   *
   * Converts a JSON Schema type name (e.g., "string", "number") or schema reference
   * (e.g., "#/definitions/MyType") to a Types enum value and determines whether
   * the override is SAFE or FORCE based on the original field type.
   *
   * @param typeString - Type name or $ref path (e.g., "string", "#/definitions/Address")
   * @param _namespaceMap - Namespace map (unused for JSON Schema but kept for interface consistency)
   * @param field - The field being overridden (used to determine compatibility)
   * @returns Object containing the mapped type, QName, and override variant
   *
   * @example
   * ```typescript
   * const result = JsonSchemaTypesService.parseTypeOverride('number', {}, field);
   * // result = { type: Types.Numeric, typeQName: QName, variant: TypeOverrideVariant.SAFE }
   *
   * const refResult = JsonSchemaTypesService.parseTypeOverride('#/definitions/Address', {}, field);
   * // result = { type: Types.Container, typeQName: QName, variant: ... }
   * ```
   */
  static parseTypeOverride(
    typeString: string,
    _namespaceMap: Record<string, string>,
    field: IField,
  ): { type: Types; typeQName: QName; variant: TypeOverrideVariant } {
    const type = typeString.startsWith('#/') ? Types.Container : JsonSchemaTypesService.mapTypeStringToEnum(typeString);

    const typeQName = new QName(null, typeString);

    const variant = JsonSchemaTypesService.determineOverrideVariant(field, type, typeString);

    return { type, typeQName, variant };
  }

  /**
   * Determine whether a type override is SAFE or FORCE for JSON Schema.
   *
   * In JSON Schema, only overriding from AnyType is considered SAFE.
   * All other type changes are FORCE since JSON Schema doesn't have
   * a formal type inheritance model like XML Schema.
   *
   * @param field - The field being overridden
   * @param _newType - The new type (unused but kept for interface consistency)
   * @param _typeString - The type string (unused but kept for interface consistency)
   * @returns SAFE if original type is AnyType, FORCE otherwise
   */
  static determineOverrideVariant(field: IField, _newType: Types, _typeString: string): TypeOverrideVariant {
    if (field.originalType === Types.AnyType) {
      return TypeOverrideVariant.SAFE;
    }

    return TypeOverrideVariant.FORCE;
  }

  /**
   * Map a JSON Schema type string to the DataMapper Types enum.
   *
   * Converts JSON Schema primitive type names to their corresponding DataMapper type representation.
   *
   * @param typeString - JSON Schema type name (e.g., "string", "number", "object", "array")
   * @returns Corresponding Types enum value
   *
   * @example
   * ```typescript
   * const type = JsonSchemaTypesService.mapTypeStringToEnum('string');
   * // Returns Types.String
   *
   * const numType = JsonSchemaTypesService.mapTypeStringToEnum('number');
   * // Returns Types.Numeric
   * ```
   */
  static mapTypeStringToEnum(typeString: string): Types {
    switch (typeString.toLowerCase()) {
      case 'string':
        return Types.String;
      case 'number':
        return Types.Numeric;
      case 'integer':
        return Types.Integer;
      case 'boolean':
        return Types.Boolean;
      case 'object':
        return Types.Container;
      case 'array':
        return Types.Array;
      default:
        return Types.AnyType;
    }
  }

  /**
   * Get all available JSON Schema types for a document.
   *
   * Returns both built-in JSON Schema types (string, number, integer, boolean, object, array)
   * and all user-defined types from the schema's $defs or definitions.
   *
   * @param document - The JSON Schema document to get types from
   * @returns Record of type override candidates including built-in and user-defined types
   *
   * @example
   * ```typescript
   * const allTypes = JsonSchemaTypesService.getAllJsonSchemaTypes(document);
   * // Returns {
   * //   'string': { displayName: 'string', typeString: 'string', type: Types.String, isBuiltIn: true, ... },
   * //   'number': { displayName: 'number', typeString: 'number', type: Types.Numeric, isBuiltIn: true, ... },
   * //   '#/definitions/Address': { displayName: '#/definitions/Address', typeString: '#/definitions/Address', type: Types.Container, isBuiltIn: false, ... },
   * //   ...
   * // }
   * ```
   */
  static getAllJsonSchemaTypes(document: JsonSchemaDocument): Record<string, IFieldTypeInfo> {
    const results: Record<string, IFieldTypeInfo> = {};

    const builtInTypes = [
      { typeString: 'string', type: Types.String },
      { typeString: 'number', type: Types.Numeric },
      { typeString: 'integer', type: Types.Integer },
      { typeString: 'boolean', type: Types.Boolean },
      { typeString: 'object', type: Types.Container },
      { typeString: 'array', type: Types.Array },
    ];

    for (const bt of builtInTypes) {
      results[bt.typeString] = {
        displayName: bt.typeString,
        typeString: bt.typeString,
        type: bt.type,
        namespaceURI: null,
        isBuiltIn: true,
      };
    }

    const definitions = document.schemaCollection.getDefinitions();
    for (const [path, _definition] of definitions) {
      results[path] = {
        displayName: path,
        typeString: path,
        type: Types.Container,
        namespaceURI: null,
        isBuiltIn: false,
      };
    }

    return results;
  }

  /**
   * Get type override candidates for extensions and restrictions of a field's original type.
   *
   * JSON Schema doesn't have a formal type inheritance model like XML Schema,
   * so this always returns an empty Record. Type changes in JSON Schema are
   * typically FORCE overrides rather than safe extensions/restrictions.
   *
   * @param _field - The field (unused, kept for interface consistency with XmlSchemaTypesService)
   * @returns Empty Record (JSON Schema doesn't support type inheritance)
   *
   * @example
   * ```typescript
   * const candidates = JsonSchemaTypesService.getTypeOverrideCandidatesForField(field);
   * // Always returns {}
   * ```
   */
  static getTypeOverrideCandidatesForField(_field: { originalTypeQName?: unknown }): Record<string, IFieldTypeInfo> {
    return {};
  }
}
