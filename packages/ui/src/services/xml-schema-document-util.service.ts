import { IField, IParentType } from '../models/datamapper/document';
import { TypeOverrideVariant, Types } from '../models/datamapper/types';
import { NS_XML_SCHEMA } from '../models/datamapper/xslt';
import { capitalize } from '../serializers/xml/utils/xml-utils';
import {
  XmlSchema,
  XmlSchemaComplexContentExtension,
  XmlSchemaComplexContentRestriction,
  XmlSchemaComplexType,
  XmlSchemaElement,
  XmlSchemaSimpleType,
  XmlSchemaType,
} from '../xml-schema-ts';
import { QName } from '../xml-schema-ts/QName';
import { XmlSchemaSimpleTypeRestriction } from '../xml-schema-ts/simple/XmlSchemaSimpleTypeRestriction';
import { DocumentUtilService } from './document-util.service';
import { XmlSchemaDocument } from './xml-schema-document-model.service';

/**
 * Utility service for XML Schema document operations.
 * Provides helper methods for field lookup, type mapping, and type override handling.
 *
 * @see XmlSchemaDocumentService
 * @see XmlSchemaDocument
 * @see XmlSchemaField
 */
export class XmlSchemaDocumentUtilService {
  /**
   * Retrieves the first top-level element from an XML Schema.
   * @param xmlSchema - The XML Schema to search
   * @returns The first element found in the schema
   */
  static getFirstElement(xmlSchema: XmlSchema): XmlSchemaElement {
    return xmlSchema.getElements().values().next().value;
  }

  /**
   * Finds a child field by name and optional namespace URI.
   * @param parent - The parent field or document to search
   * @param name - The field name to match
   * @param namespaceURI - Optional namespace URI to match
   * @returns The matching child field, or undefined if not found
   */
  static getChildField(parent: IParentType, name: string, namespaceURI?: string | null): IField | undefined {
    const resolvedParent = 'parent' in parent ? DocumentUtilService.resolveTypeFragment(parent) : parent;
    return resolvedParent.fields.find((f) => {
      return f.name === name && ((!namespaceURI && !f.namespaceURI) || f.namespaceURI === namespaceURI);
    });
  }

  /**
   * Parses a type override string and determines the override variant.
   * @param typeString - The type string to parse (e.g., "xs:string", "MyComplexType")
   * @param namespaceMap - Map of namespace prefixes to URIs
   * @param field - The field being overridden
   * @returns Object containing the parsed type, QName, and override variant
   */
  static parseTypeOverride(
    typeString: string,
    namespaceMap: Record<string, string>,
    field: IField,
  ): { type: Types; typeQName: QName; variant: TypeOverrideVariant } {
    const parts = typeString.split(':');
    const prefix = parts.length > 1 ? parts[0] : '';
    const localPart = parts.length > 1 ? parts[1] : parts[0];

    const namespaceURI = prefix ? namespaceMap[prefix] || '' : '';
    const typeQName = new QName(namespaceURI || null, localPart);

    const type = XmlSchemaDocumentUtilService.mapTypeStringToEnum(namespaceURI, localPart);

    const variant = XmlSchemaDocumentUtilService.determineOverrideVariant(field, type, typeQName, namespaceURI);

    return { type, typeQName, variant };
  }

  private static determineOverrideVariant(
    field: IField,
    newType: Types,
    newTypeQName: QName,
    newNamespaceURI: string,
  ): TypeOverrideVariant {
    if (field.originalType === Types.AnyType) {
      return TypeOverrideVariant.SAFE;
    }

    if (XmlSchemaDocumentUtilService.isCompatibleContainerTypeOverride(field, newType, newTypeQName, newNamespaceURI)) {
      return TypeOverrideVariant.SAFE;
    }

    return TypeOverrideVariant.FORCE;
  }

  private static isCompatibleContainerTypeOverride(
    field: IField,
    newType: Types,
    newTypeQName: QName,
    newNamespaceURI: string,
  ): boolean {
    const isBuiltInType = newNamespaceURI === NS_XML_SCHEMA;

    if (field.originalType !== Types.Container || newType !== Types.Container || isBuiltInType) {
      return false;
    }

    const ownerDoc = field.ownerDocument;
    if (!('xmlSchema' in ownerDoc)) {
      return false;
    }

    const xmlDoc = ownerDoc as XmlSchemaDocument;
    const newSchemaType = xmlDoc.xmlSchema.getSchemaTypes().get(newTypeQName);
    const originalSchemaType =
      field.originalTypeQName && xmlDoc.xmlSchema.getSchemaTypes().get(field.originalTypeQName);

    if (!newSchemaType || !originalSchemaType) {
      return false;
    }

    return XmlSchemaDocumentUtilService.isExtensionOrRestriction(newSchemaType, originalSchemaType, xmlDoc.xmlSchema);
  }

  private static isExtensionOrRestriction(
    derivedType: XmlSchemaType,
    baseType: XmlSchemaType,
    schema: XmlSchema,
  ): boolean {
    if (derivedType === baseType) return true;

    if (derivedType instanceof XmlSchemaComplexType) {
      return XmlSchemaDocumentUtilService.checkComplexTypeInheritance(derivedType, baseType, schema);
    }

    if (derivedType instanceof XmlSchemaSimpleType) {
      return XmlSchemaDocumentUtilService.checkSimpleTypeInheritance(derivedType, baseType, schema);
    }

    return false;
  }

  private static checkComplexTypeInheritance(
    derivedType: XmlSchemaComplexType,
    baseType: XmlSchemaType,
    schema: XmlSchema,
  ): boolean {
    const contentModel = derivedType.getContentModel();
    if (!contentModel) return false;

    const content = contentModel.getContent();
    if (
      !(content instanceof XmlSchemaComplexContentExtension) &&
      !(content instanceof XmlSchemaComplexContentRestriction)
    ) {
      return false;
    }

    return XmlSchemaDocumentUtilService.checkBaseTypeMatch(content.getBaseTypeName(), baseType, schema);
  }

  private static checkSimpleTypeInheritance(
    derivedType: XmlSchemaSimpleType,
    baseType: XmlSchemaType,
    schema: XmlSchema,
  ): boolean {
    const content = derivedType.getContent();
    if (!(content instanceof XmlSchemaSimpleTypeRestriction)) return false;

    return XmlSchemaDocumentUtilService.checkBaseTypeMatch(content.getBaseTypeName(), baseType, schema);
  }

  private static checkBaseTypeMatch(
    baseTypeName: QName | null,
    targetBaseType: XmlSchemaType,
    schema: XmlSchema,
  ): boolean {
    if (!baseTypeName) return false;

    const baseSchemaType = schema.getSchemaTypes().get(baseTypeName);
    if (baseSchemaType === targetBaseType) return true;
    if (!baseSchemaType) return false;

    return XmlSchemaDocumentUtilService.isExtensionOrRestriction(baseSchemaType, targetBaseType, schema);
  }

  /**
   * Maps an XML Schema type name to the corresponding Types enum value.
   * @param namespaceURI - The namespace URI of the type
   * @param localPart - The local name of the type
   * @returns The corresponding Types enum value
   */
  static mapTypeStringToEnum(namespaceURI: string, localPart: string): Types {
    if (namespaceURI === NS_XML_SCHEMA) {
      const normalized = localPart.toLowerCase();

      if (Types[capitalize(localPart) as keyof typeof Types]) {
        return Types[capitalize(localPart) as keyof typeof Types];
      }

      switch (normalized) {
        case 'string':
        case 'normalizedstring':
        case 'token':
        case 'language':
        case 'nmtoken':
        case 'nmtokens':
        case 'name':
        case 'id':
        case 'idref':
        case 'idrefs':
        case 'entity':
        case 'entities':
          return Types.String;

        case 'int':
        case 'integer':
        case 'long':
        case 'short':
        case 'byte':
        case 'unsignedint':
        case 'unsignedlong':
        case 'unsignedshort':
        case 'unsignedbyte':
        case 'nonpositiveinteger':
        case 'negativeinteger':
        case 'nonnegativeinteger':
          return Types.Integer;

        case 'datetime':
          return Types.DateTime;

        case 'duration':
        case 'daytimeduration':
        case 'yearmonthduration':
          return Types.Duration;

        case 'hexbinary':
        case 'base64binary':
          return Types.String;

        case 'anyuri':
          return Types.AnyURI;

        case 'qname':
          return Types.QName;

        case 'notation':
          return Types.String;

        default:
          return Types.AnyType;
      }
    }

    return Types.Container;
  }

  /**
   * Gets the field type from a simple type name.
   * @param name - The type name to look up
   * @returns The corresponding Types enum value, or Types.AnyType if not found
   */
  static getFieldTypeFromName(name: string | null): Types {
    return (name && Types[capitalize(name) as keyof typeof Types]) || Types.AnyType;
  }
}
