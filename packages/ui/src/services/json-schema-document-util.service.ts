import { IField, IParentType } from '../models/datamapper/document';
import { TypeOverrideVariant, Types } from '../models/datamapper/types';
import { QName } from '../xml-schema-ts/QName';
import { DocumentUtilService } from './document-util.service';

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
   * Parses a type override string and determines the override variant.
   * @param typeString - The type string to parse (e.g., "string", "object", "#/definitions/MyType")
   * @param _namespaceMap - Namespace map (not used for JSON schemas)
   * @param field - The field being overridden
   * @returns Object containing the parsed type, QName, and override variant
   */
  static parseTypeOverride(
    typeString: string,
    _namespaceMap: Record<string, string>,
    field: IField,
  ): { type: Types; typeQName: QName; variant: TypeOverrideVariant } {
    const type = typeString.startsWith('#/')
      ? Types.Container
      : JsonSchemaDocumentUtilService.mapTypeStringToEnum(typeString);

    const typeQName = new QName(null, typeString);

    const variant = JsonSchemaDocumentUtilService.determineOverrideVariant(field, type, typeString);

    return { type, typeQName, variant };
  }

  private static determineOverrideVariant(field: IField, _newType: Types, _typeString: string): TypeOverrideVariant {
    if (field.originalType === Types.AnyType) {
      return TypeOverrideVariant.SAFE;
    }

    return TypeOverrideVariant.FORCE;
  }

  /**
   * Maps a JSON Schema type string to the corresponding Types enum value.
   * @param typeString - The JSON Schema type string (e.g., "string", "number", "object", "array")
   * @returns The corresponding Types enum value
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
}
