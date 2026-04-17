import { IDocument, IField } from '../models/datamapper/document';
import { IFieldSubstitution } from '../models/datamapper/metadata';
import { NS_XML_SCHEMA } from '../models/datamapper/standard-namespaces';
import {
  FieldOverrideVariant,
  IFieldSubstituteInfo,
  IFieldTypeInfo,
  TypeDerivation,
  Types,
} from '../models/datamapper/types';
import { capitalize } from '../serializers/xml/utils/xml-utils';
import {
  XmlSchemaCollection,
  XmlSchemaComplexContentExtension,
  XmlSchemaComplexContentRestriction,
  XmlSchemaComplexType,
  XmlSchemaElement,
  XmlSchemaSimpleType,
  XmlSchemaType,
} from '../xml-schema-ts';
import { XmlSchemaDocumentation } from '../xml-schema-ts/annotation/XmlSchemaDocumentation';
import { XmlSchemaComplexContent } from '../xml-schema-ts/complex/XmlSchemaComplexContent';
import { QName } from '../xml-schema-ts/QName';
import { XmlSchemaSimpleContent } from '../xml-schema-ts/simple/XmlSchemaSimpleContent';
import { XmlSchemaSimpleTypeRestriction } from '../xml-schema-ts/simple/XmlSchemaSimpleTypeRestriction';
import { ensureNamespaceRegistered, formatQNameWithPrefix, parseQNameString } from './namespace-util';
import { XmlSchemaDocument } from './xml-schema-document.model';
import { XmlSchemaDocumentUtilService } from './xml-schema-document-util.service';

/**
 * Service for XML Schema type-related operations.
 *
 * Handles type parsing, validation, querying, inheritance checking, and element substitution
 * resolution for XML Schema types. Separated from document utilities to provide better
 * separation of concerns between type operations and document operations.
 *
 * @see XmlSchemaDocumentService
 * @see XmlSchemaDocumentUtilService
 * @see FieldOverrideService
 */
export class XmlSchemaTypesService {
  /**
   * Parse a type override string and determine the override variant.
   *
   * Converts a qualified type name (e.g., "xs:string", "tns:CustomType") to a Types enum value
   * and determines whether the override is SAFE or FORCE based on type compatibility.
   *
   * @param typeString - Qualified type name with optional prefix (e.g., "xs:string", "CustomType")
   * @param namespaceMap - Namespace prefix to URI mapping
   * @param field - The field being overridden (used to determine compatibility)
   * @returns Object containing the mapped type, QName, and override variant
   *
   * @example
   * ```typescript
   * const result = XmlSchemaTypesService.parseTypeOverride('xs:int', namespaceMap, field);
   * // result = { type: Types.Integer, typeQName: QName, variant: FieldOverrideVariant.SAFE }
   * ```
   */
  static parseTypeOverride(
    typeString: string,
    namespaceMap: Record<string, string>,
    field: IField,
  ): { type: Types; typeQName: QName; variant: FieldOverrideVariant } {
    const { prefix, localPart } = parseQNameString(typeString);
    if (!localPart || localPart.includes(':')) {
      throw new Error(`Invalid type override '${typeString}'`);
    }

    const namespaceURI = prefix ? namespaceMap[prefix] : '';
    if (prefix && namespaceURI === undefined) {
      throw new Error(`Unknown namespace prefix '${prefix}' in type override '${typeString}'`);
    }
    const type = XmlSchemaTypesService.mapTypeStringToEnum(namespaceURI || '', localPart);

    const typeQName = new QName(namespaceURI, localPart);

    const variant = XmlSchemaTypesService.determineOverrideVariant(field, type, typeQName, namespaceURI);

    return { type, typeQName, variant };
  }

  /**
   * Determine whether a type override is SAFE or FORCE.
   *
   * A SAFE override maintains schema compatibility:
   * - Overriding xs:anyType is always safe
   * - Changing to an extension or restriction of the original type is safe
   *
   * A FORCE override is an incompatible type change that may break schema validation.
   *
   * @param field - The field being overridden
   * @param newType - The new type being applied
   * @param newTypeQName - QName of the new type
   * @param newNamespaceURI - Namespace URI of the new type
   * @returns SAFE if compatible, FORCE if incompatible
   */
  static determineOverrideVariant(
    field: IField,
    newType: Types,
    newTypeQName: QName,
    newNamespaceURI: string,
  ): FieldOverrideVariant {
    if ((field.originalField?.type ?? field.type) === Types.AnyType) {
      return FieldOverrideVariant.SAFE;
    }

    if (XmlSchemaTypesService.isCompatibleContainerTypeOverride(field, newType, newTypeQName, newNamespaceURI)) {
      return FieldOverrideVariant.SAFE;
    }

    return FieldOverrideVariant.FORCE;
  }

  /**
   * Check if a Container type override is compatible with the field's original type.
   *
   * Compatible overrides are when the new complexType extends or restricts the original complexType.
   * Built-in types are not considered compatible for Container overrides.
   *
   * @param field - The field being overridden
   * @param newType - The new type being applied
   * @param newTypeQName - QName of the new type
   * @param newNamespaceURI - Namespace URI of the new type
   * @returns True if the override is compatible, false otherwise
   */
  static isCompatibleContainerTypeOverride(
    field: IField,
    newType: Types,
    newTypeQName: QName,
    newNamespaceURI: string,
  ): boolean {
    const isBuiltInType = newNamespaceURI === NS_XML_SCHEMA;
    const origType = field.originalField?.type ?? field.type;

    if (origType !== Types.Container || newType !== Types.Container || isBuiltInType) {
      return false;
    }

    const ownerDoc = field.ownerDocument;
    if (!('xmlSchemaCollection' in ownerDoc)) {
      return false;
    }

    const xmlDoc = ownerDoc as XmlSchemaDocument;
    const newSchemaType = xmlDoc.xmlSchemaCollection.getTypeByQName(newTypeQName);
    const origTypeQName = field.originalField?.typeQName ?? field.typeQName;
    const originalSchemaType = origTypeQName && xmlDoc.xmlSchemaCollection.getTypeByQName(origTypeQName);

    if (!newSchemaType || !originalSchemaType) {
      return false;
    }

    return XmlSchemaTypesService.isExtensionOrRestriction(
      newSchemaType,
      originalSchemaType,
      xmlDoc.xmlSchemaCollection,
    );
  }

  /**
   * Extract documentation text from XML Schema type annotation.
   *
   * @param type - The XML Schema type to extract documentation from
   * @returns Documentation text, or undefined if no documentation found
   */
  private static extractDocumentationFromType(type: XmlSchemaType): string | undefined {
    const annotation = type.getAnnotation();
    if (!annotation) {
      return undefined;
    }

    const items = annotation.getItems();
    for (const item of items) {
      if (!(item instanceof XmlSchemaDocumentation)) continue;

      const markup = item.getMarkup();
      if (!markup || markup.length === 0) continue;

      let text = '';
      for (const node of markup) {
        if (node.textContent) {
          text += node.textContent;
        }
      }
      text = text.trim().replace(/\s+/g, ' ');
      if (text) {
        return text;
      }
    }

    return undefined;
  }

  /**
   * Get the base type name and derivation method for an extension or restriction.
   *
   * @param type - The derived XML Schema type
   * @returns Object with base type name and derivation method, or undefined if not a derived type
   */
  private static getBaseTypeAndDerivation(
    type: XmlSchemaType,
  ): { baseTypeName: QName; derivation: TypeDerivation } | undefined {
    if (type instanceof XmlSchemaComplexType) {
      return XmlSchemaTypesService.doGetBaseTypeAndDerivationFromComplexType(type);
    }

    if (type instanceof XmlSchemaSimpleType) {
      return XmlSchemaTypesService.doGetBaseTypeAndDerivationFromSimpleType(type);
    }

    return undefined;
  }

  private static doGetBaseTypeAndDerivationFromComplexType(
    type: XmlSchemaComplexType,
  ): { baseTypeName: QName; derivation: TypeDerivation } | undefined {
    const content = type.getContentModel();
    if (content instanceof XmlSchemaComplexContent) {
      return XmlSchemaTypesService.doGetBaseTypeAndDerivationFromContent(content);
    }

    if (content instanceof XmlSchemaSimpleContent) {
      return XmlSchemaTypesService.doGetBaseTypeAndDerivationFromContent(content);
    }

    return undefined;
  }

  private static doGetBaseTypeAndDerivationFromContent(
    content: XmlSchemaComplexContent | XmlSchemaSimpleContent,
  ): { baseTypeName: QName; derivation: TypeDerivation } | undefined {
    const contentType = content.getContent();
    if (contentType instanceof XmlSchemaComplexContentExtension) {
      const baseTypeName = contentType.getBaseTypeName();
      if (baseTypeName) {
        return { baseTypeName, derivation: TypeDerivation.EXTENSION };
      }
    }
    if (contentType instanceof XmlSchemaComplexContentRestriction) {
      const baseTypeName = contentType.getBaseTypeName();
      if (baseTypeName) {
        return { baseTypeName, derivation: TypeDerivation.RESTRICTION };
      }
    }
    return undefined;
  }

  private static doGetBaseTypeAndDerivationFromSimpleType(
    type: XmlSchemaSimpleType,
  ): { baseTypeName: QName; derivation: TypeDerivation } | undefined {
    const content = type.getContent();
    if (content instanceof XmlSchemaSimpleTypeRestriction) {
      const baseTypeName = content.getBaseTypeName();
      if (baseTypeName) {
        return { baseTypeName, derivation: TypeDerivation.RESTRICTION };
      }
    }
    return undefined;
  }

  private static resolveSimpleTypeToEnum(schemaType: XmlSchemaSimpleType, collection?: XmlSchemaCollection): Types {
    const typeQName = schemaType.getQName();
    if (!typeQName?.getLocalPart()) {
      const resolved = XmlSchemaTypesService.followRestrictionChain(schemaType, collection);
      if (resolved !== Types.Container) return resolved;
      return XmlSchemaDocumentUtilService.getFieldTypeFromName(schemaType.getName());
    }
    const type = XmlSchemaTypesService.mapTypeStringToEnum(
      typeQName.getNamespaceURI() || '',
      typeQName.getLocalPart()!,
    );
    if (type !== Types.Container) return type;
    return XmlSchemaTypesService.followRestrictionChain(schemaType, collection);
  }

  private static followRestrictionChain(schemaType: XmlSchemaSimpleType, collection?: XmlSchemaCollection): Types {
    let current: XmlSchemaSimpleType = schemaType;
    while (true) {
      const baseInfo = XmlSchemaTypesService.doGetBaseTypeAndDerivationFromSimpleType(current);
      if (!baseInfo) return Types.Container;
      const baseType = XmlSchemaTypesService.mapTypeStringToEnum(
        baseInfo.baseTypeName.getNamespaceURI() || '',
        baseInfo.baseTypeName.getLocalPart() || '',
      );
      if (baseType !== Types.Container) return baseType;
      const next = collection?.getTypeByQName(baseInfo.baseTypeName);
      if (!(next instanceof XmlSchemaSimpleType)) return Types.Container;
      current = next;
    }
  }

  /**
   * Create IFieldTypeInfo from XML Schema type.
   *
   * @param type - The XML Schema type
   * @param namespaceMap - Namespace prefix mapping
   * @param includeBase - Whether to include base type information
   * @returns IFieldTypeInfo object
   */
  private static createTypeInfoFromSchemaType(type: XmlSchemaType, includeBase = false): IFieldTypeInfo | undefined {
    const typeQName = type.getQName();
    if (!typeQName) return undefined;

    const localPart = typeQName.getLocalPart();
    if (!localPart) return undefined;

    const mappedType = XmlSchemaTypesService.mapTypeStringToEnum(typeQName.getNamespaceURI(), localPart);
    const description = XmlSchemaTypesService.extractDocumentationFromType(type);

    let baseQName: QName | undefined;
    let derivation: TypeDerivation | undefined;
    if (includeBase) {
      const baseInfo = XmlSchemaTypesService.getBaseTypeAndDerivation(type);
      if (baseInfo) {
        baseQName = baseInfo.baseTypeName;
        derivation = baseInfo.derivation;
      }
    }

    return {
      displayName: localPart,
      typeQName,
      type: mappedType,
      description,
      isBuiltIn: false,
      baseQName,
      derivation,
    };
  }

  /**
   * Check if a derived type extends or restricts a base type.
   *
   * Recursively checks the type hierarchy to determine if derivedType is derived from baseType
   * through extension or restriction. Works for both complexTypes and simpleTypes.
   *
   * @param derivedType - The type that may be derived from baseType
   * @param baseType - The potential base type
   * @param collection - XML Schema collection for type lookups
   * @returns True if derivedType extends or restricts baseType, false otherwise
   *
   * @example
   * ```typescript
   * // Check if PositiveInteger extends xs:integer
   * const isExtension = XmlSchemaTypesService.isExtensionOrRestriction(
   *   positiveIntegerType,
   *   integerType,
   *   collection
   * );
   * // Returns true
   * ```
   */
  static isExtensionOrRestriction(
    derivedType: XmlSchemaType,
    baseType: XmlSchemaType,
    collection: XmlSchemaCollection,
  ): boolean {
    if (derivedType === baseType) return true;

    if (derivedType instanceof XmlSchemaComplexType) {
      return XmlSchemaTypesService.checkComplexTypeInheritance(derivedType, baseType, collection);
    }

    if (derivedType instanceof XmlSchemaSimpleType) {
      return XmlSchemaTypesService.checkSimpleTypeInheritance(derivedType, baseType, collection);
    }

    return false;
  }

  /**
   * Check if a complexType extends or restricts a base type.
   *
   * Examines the complexType's content model to determine if it extends or restricts
   * the given base type through complexContent extension/restriction.
   *
   * @param derivedType - The complexType to check
   * @param baseType - The potential base type
   * @param collection - XML Schema collection for type lookups
   * @returns True if derivedType extends or restricts baseType
   */
  static checkComplexTypeInheritance(
    derivedType: XmlSchemaComplexType,
    baseType: XmlSchemaType,
    collection: XmlSchemaCollection,
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

    return XmlSchemaTypesService.checkBaseTypeMatch(content.getBaseTypeName(), baseType, collection);
  }

  /**
   * Check if a simpleType restricts a base type.
   *
   * Examines the simpleType's content to determine if it restricts the given base type
   * through simpleType restriction (e.g., PositiveInteger restricts xs:integer).
   *
   * @param derivedType - The simpleType to check
   * @param baseType - The potential base type
   * @param collection - XML Schema collection for type lookups
   * @returns True if derivedType restricts baseType
   */
  static checkSimpleTypeInheritance(
    derivedType: XmlSchemaSimpleType,
    baseType: XmlSchemaType,
    collection: XmlSchemaCollection,
  ): boolean {
    const content = derivedType.getContent();
    if (!(content instanceof XmlSchemaSimpleTypeRestriction)) return false;

    return XmlSchemaTypesService.checkBaseTypeMatch(content.getBaseTypeName(), baseType, collection);
  }

  private static checkBaseTypeMatch(
    baseTypeName: QName | null,
    targetBaseType: XmlSchemaType,
    collection: XmlSchemaCollection,
  ): boolean {
    if (!baseTypeName) return false;

    const baseSchemaType = collection.getTypeByQName(baseTypeName);
    if (baseSchemaType === targetBaseType) return true;
    if (!baseSchemaType) return false;

    return XmlSchemaTypesService.isExtensionOrRestriction(baseSchemaType, targetBaseType, collection);
  }

  /**
   * Map an XML Schema type string to the DataMapper Types enum.
   *
   * Converts XML Schema type names to their corresponding DataMapper type representation.
   * Handles all built-in XML Schema types and maps user-defined types to Types.Container.
   *
   * @param namespaceURI - Namespace URI of the type (NS_XML_SCHEMA for built-in types)
   * @param localPart - Local name of the type (e.g., "string", "int", "CustomType")
   * @returns Corresponding Types enum value
   *
   * @example
   * ```typescript
   * const type = XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'string');
   * // Returns Types.String
   *
   * const customType = XmlSchemaTypesService.mapTypeStringToEnum('http://example.com', 'MyType');
   * // Returns Types.Container
   * ```
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
   * Find all types that extend or restrict a given base type.
   *
   * Searches through all user-defined types in the schema collection and returns
   * those that are derived from the base type through extension or restriction.
   *
   * @param baseType - The base type to find derivations of
   * @param collection - XML Schema collection containing the types
   * @returns Array of types that extend or restrict the base type (excluding the base type itself)
   *
   * @example
   * ```typescript
   * const derivedTypes = XmlSchemaTypesService.getExtensionsAndRestrictions(
   *   integerType,
   *   collection
   * );
   * // Returns [PositiveInteger, NegativeInteger, NonNegativeInteger, ...]
   * ```
   */
  static getExtensionsAndRestrictions(baseType: XmlSchemaType, collection: XmlSchemaCollection): XmlSchemaType[] {
    const results: XmlSchemaType[] = [];

    for (const schema of collection.getUserSchemas()) {
      for (const type of schema.getSchemaTypes().values()) {
        if (XmlSchemaTypesService.isExtensionOrRestriction(type, baseType, collection)) {
          if (type !== baseType) {
            results.push(type);
          }
        }
      }
    }

    return results;
  }

  /**
   * Get all user-defined types from the XML Schema collection.
   *
   * Retrieves all complexTypes and simpleTypes defined in the user schemas,
   * formatted as type override candidates with proper namespace prefixes.
   *
   * @param collection - XML Schema collection containing the schemas
   * @param namespaceMap - Namespace prefix to URI mapping for qualified name generation
   * @returns Record of type override candidates for all user-defined types
   *
   * @example
   * ```typescript
   * const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(collection, namespaceMap);
   * // Returns {
   * //   'tns:Order': { displayName: 'Order', typeString: 'tns:Order', type: Types.Container, ... },
   * //   'tns:Customer': { displayName: 'Customer', typeString: 'tns:Customer', type: Types.Container, ... },
   * // }
   * ```
   */
  static getAllUserDefinedTypes(
    collection: XmlSchemaCollection,
    namespaceMap: Record<string, string>,
  ): Record<string, IFieldTypeInfo> {
    const results: Record<string, IFieldTypeInfo> = {};

    for (const schema of collection.getUserSchemas()) {
      for (const type of schema.getSchemaTypes().values()) {
        if (type instanceof XmlSchemaComplexType && type.isAbstract()) continue;
        const typeInfo = XmlSchemaTypesService.createTypeInfoFromSchemaType(type, true);
        if (typeInfo) {
          results[formatQNameWithPrefix(typeInfo.typeQName, namespaceMap)] = typeInfo;
        }
      }
    }

    return results;
  }

  /**
   * Get all available XML Schema types for a document.
   *
   * Returns both built-in XML Schema types (xs:string, xs:int, etc.) and
   * user-defined types from the schema collection. Returns empty Record if
   * the document has no schema collection.
   *
   * @param document - XML Schema document to get types from
   * @param namespaceMap - Namespace prefix to URI mapping
   * @returns Record of all available type override candidates
   *
   * @example
   * ```typescript
   * const allTypes = XmlSchemaTypesService.getAllXmlSchemaTypes(document, namespaceMap);
   * // Returns all xs:* types + all user-defined complexTypes and simpleTypes
   * ```
   */
  static getAllXmlSchemaTypes(
    document: XmlSchemaDocument,
    namespaceMap: Record<string, string>,
  ): Record<string, IFieldTypeInfo> {
    if (!document.xmlSchemaCollection) {
      return {};
    }
    const builtIn = XmlSchemaTypesService.getAllBuiltInTypes(namespaceMap);
    const userDefined = XmlSchemaTypesService.getAllUserDefinedTypes(document.xmlSchemaCollection, namespaceMap);
    return { ...builtIn, ...userDefined };
  }

  /**
   * Get all built-in XML Schema types.
   *
   * Returns all standard XML Schema data types (xs:string, xs:int, xs:boolean, etc.)
   * formatted as type override candidates with the appropriate namespace prefix.
   *
   * @param namespaceMap - Namespace prefix to URI mapping (used to determine the xs: prefix)
   * @returns Record of type override candidates for all built-in XML Schema types
   *
   * @example
   * ```typescript
   * const builtInTypes = XmlSchemaTypesService.getAllBuiltInTypes(namespaceMap);
   * // Returns {
   * //   'xs:string': { displayName: 'xs:string', typeString: 'xs:string', type: Types.String, isBuiltIn: true, ... },
   * //   'xs:int': { displayName: 'xs:int', typeString: 'xs:int', type: Types.Integer, isBuiltIn: true, ... },
   * //   ...
   * // }
   * ```
   */
  static getAllBuiltInTypes(namespaceMap: Record<string, string>): Record<string, IFieldTypeInfo> {
    const builtInTypes = [
      { localName: 'string', type: Types.String },
      { localName: 'boolean', type: Types.Boolean },
      { localName: 'decimal', type: Types.Decimal },
      { localName: 'float', type: Types.Float },
      { localName: 'double', type: Types.Double },
      { localName: 'integer', type: Types.Integer },
      { localName: 'positiveInteger', type: Types.PositiveInteger },
      { localName: 'int', type: Types.Integer },
      { localName: 'long', type: Types.Integer },
      { localName: 'short', type: Types.Integer },
      { localName: 'byte', type: Types.Integer },
      { localName: 'date', type: Types.Date },
      { localName: 'dateTime', type: Types.DateTime },
      { localName: 'time', type: Types.Time },
      { localName: 'duration', type: Types.Duration },
      { localName: 'dayTimeDuration', type: Types.DayTimeDuration },
      { localName: 'anyURI', type: Types.AnyURI },
      { localName: 'QName', type: Types.QName },
      { localName: 'NCName', type: Types.NCName },
      { localName: 'anyType', type: Types.AnyType },
    ];

    const results: Record<string, IFieldTypeInfo> = {};

    for (const bt of builtInTypes) {
      const typeQName = new QName(NS_XML_SCHEMA, bt.localName);
      const key = formatQNameWithPrefix(typeQName, namespaceMap);
      results[key] = {
        displayName: key,
        typeQName,
        type: bt.type,
        isBuiltIn: true,
      };
    }

    return results;
  }

  /**
   * Get type override candidates for extensions and restrictions of a field's original type.
   *
   * Returns all types that extend or restrict the field's original type, formatted as
   * type override candidates. This is used to find safe type overrides that maintain
   * schema compatibility.
   *
   * @param field - The field to get extension/restriction candidates for
   * @param collection - XML Schema collection for type lookups
   * @param namespaceMap - Namespace prefix to URI mapping
   * @returns Record keyed by `nsPrefix:localName` of type override candidates for extensions/restrictions
   *
   * @example
   * ```typescript
   * const candidates = XmlSchemaTypesService.getTypeOverrideCandidatesForField(
   *   field,
   *   xmlDoc.xmlSchemaCollection,
   *   namespaceMap
   * );
   * // Returns types that extend/restrict the field's original type
   * ```
   */
  static getTypeOverrideCandidatesForField(
    field: IField,
    collection: XmlSchemaCollection,
    namespaceMap: Record<string, string>,
  ): Record<string, IFieldTypeInfo> {
    const origTypeQName = field.originalField?.typeQName ?? field.typeQName;
    if (!origTypeQName) {
      return {};
    }

    const baseType = collection.getTypeByQName(origTypeQName);
    if (!baseType) {
      return {};
    }

    const derivedTypes = XmlSchemaTypesService.getExtensionsAndRestrictions(baseType, collection);

    const results: Record<string, IFieldTypeInfo> = {};

    for (const derivedType of derivedTypes) {
      if (derivedType instanceof XmlSchemaComplexType && derivedType.isAbstract()) continue;
      const typeInfo = XmlSchemaTypesService.createTypeInfoFromSchemaType(derivedType, true);
      if (typeInfo) {
        ensureNamespaceRegistered(typeInfo.typeQName.getNamespaceURI(), namespaceMap);
        results[formatQNameWithPrefix(typeInfo.typeQName, namespaceMap)] = typeInfo;
      }
    }

    return results;
  }

  private static resolveElementTypeInfo(
    element: XmlSchemaElement,
    collection?: XmlSchemaCollection,
  ): Omit<IFieldSubstituteInfo, 'qname' | 'displayName'> {
    const schemaType = element.getSchemaType();
    let type = Types.AnyType;
    let typeQName: QName | null = null;
    let namedTypeFragmentRefs: string[] = [];

    if (schemaType instanceof XmlSchemaComplexType) {
      type = Types.Container;
      const tqname = schemaType.getQName();
      if (tqname) {
        typeQName = tqname;
        namedTypeFragmentRefs = [tqname.toString()];
      } else {
        const wireName = element.getWireName()!;
        namedTypeFragmentRefs = [
          XmlSchemaDocumentUtilService.buildElementFragmentKey(wireName.getNamespaceURI(), wireName.getLocalPart()!),
        ];
      }
    } else if (schemaType instanceof XmlSchemaSimpleType) {
      typeQName = schemaType.getQName();
      type = XmlSchemaTypesService.resolveSimpleTypeToEnum(schemaType, collection);
    }

    return { type, typeQName, namedTypeFragmentRefs };
  }

  /**
   * Resolve the substitute element for a field substitution entry.
   *
   * Looks up the named element in the XML Schema collection and extracts its wire name,
   * namespace, and type information so that {@link DocumentUtilService.applySubstitutionToField}
   * can apply it directly to the live field.
   *
   * This is the XML-specific implementation of {@link ResolveSubstituteFn}.
   *
   * @param document - The document being modified (must be an XmlSchemaDocument)
   * @param substitution - The substitution metadata containing the target element name
   * @param namespaceMap - Namespace prefix to URI mapping for prefix resolution
   * @returns Resolved substitute info, or undefined if the document or element is not found
   */
  static resolveSubstitution(
    document: IDocument,
    substitution: IFieldSubstitution,
    namespaceMap: Record<string, string>,
  ): IFieldSubstituteInfo | undefined {
    if (!('xmlSchemaCollection' in document)) return undefined;
    const xmlDoc = document as XmlSchemaDocument;

    const { prefix, localPart } = parseQNameString(substitution.name);
    if (!localPart || localPart.includes(':')) return undefined;
    const nsURI = prefix ? namespaceMap[prefix] : '';
    if (prefix && nsURI === undefined) return undefined;
    const qname = new QName(nsURI, localPart);

    const element = xmlDoc.xmlSchemaCollection.getElementByQName(qname);
    if (!element) return undefined;

    const wireName = element.getWireName();
    if (!wireName?.getLocalPart()) return undefined;

    return {
      qname: wireName,
      displayName: wireName.getLocalPart()!,
      ...XmlSchemaTypesService.resolveElementTypeInfo(element, xmlDoc.xmlSchemaCollection),
    };
  }

  /**
   * Find all elements that belong to a substitution group headed by the given element.
   *
   * Discovery is transitive: if `Dog` substitutes `Animal` and `Puppy` substitutes `Dog`,
   * calling with `Animal` returns both `Dog` and `Puppy`. If `Animal` and `Dog` are abstract,
   * only `Puppy` is returned — abstract members are traversed but excluded from results.
   *
   * @param headElement - The head element of the substitution group
   * @param collection - XML Schema collection containing the schemas
   * @returns Array of concrete elements that are direct or transitive members of the substitution group
   */
  static getSubstitutionGroupMembers(
    headElement: XmlSchemaElement,
    collection: XmlSchemaCollection,
  ): XmlSchemaElement[] {
    const headQNameString = headElement.getQName()?.toString();
    if (!headQNameString) return [];

    const allElements = XmlSchemaTypesService.collectAllElements(collection);
    const frontier = new Set<string>([headQNameString]);
    const results: XmlSchemaElement[] = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (const el of allElements) {
        const subGroup = el.getSubstitutionGroup()?.toString();
        if (!subGroup || !frontier.has(subGroup)) continue;
        const elQName = el.getQName()?.toString();
        if (!elQName || frontier.has(elQName)) continue;
        frontier.add(elQName);
        changed = true;
        if (!el.isAbstract()) results.push(el);
      }
    }
    return results;
  }

  private static collectAllElements(collection: XmlSchemaCollection): XmlSchemaElement[] {
    const allElements: XmlSchemaElement[] = [];
    for (const schema of collection.getUserSchemas()) {
      for (const el of schema.getElements().values()) {
        allElements.push(el);
      }
    }
    return allElements;
  }

  /**
   * Get substitution group member candidates for a field.
   *
   * When a field's element is the head of an XML substitution group (or is already substituted),
   * returns all substitute elements that can replace it. This is analogous to
   * {@link getTypeOverrideCandidatesForField} for type overrides.
   *
   * When `field.typeOverride === FieldOverrideVariant.SUBSTITUTION`, the original head element
   * name is read from `field.originalField`; otherwise `field.name` and `field.namespaceURI`
   * identify the head element.
   *
   * @param field - The field to get substitution candidates for
   * @param collection - XML Schema collection for element lookups
   * @param namespaceMap - Namespace prefix to URI mapping
   * @returns Record keyed by `nsPrefix:localName` of substitution candidates, or `{}` when none found
   */
  static getFieldSubstitutionCandidates(
    field: IField,
    collection: XmlSchemaCollection,
    namespaceMap: Record<string, string>,
  ): Record<string, IFieldSubstituteInfo> {
    const isSubstituted = field.typeOverride === FieldOverrideVariant.SUBSTITUTION;
    if (isSubstituted && !field.originalField) return {};
    const headName = isSubstituted ? field.originalField!.name : field.name;
    const headNamespaceURI = isSubstituted ? field.originalField!.namespaceURI : field.namespaceURI;

    const headElement = collection.getElementByQName(new QName(headNamespaceURI, headName));
    if (!headElement) return {};

    const members = XmlSchemaTypesService.getSubstitutionGroupMembers(headElement, collection);
    if (members.length === 0) return {};

    const results: Record<string, IFieldSubstituteInfo> = {};
    for (const el of members) {
      const wireName = el.getWireName();
      if (!wireName?.getLocalPart()) continue;
      ensureNamespaceRegistered(wireName.getNamespaceURI(), namespaceMap);
      const key = formatQNameWithPrefix(wireName, namespaceMap);
      results[key] = {
        qname: wireName,
        displayName: wireName.getLocalPart()!,
        ...XmlSchemaTypesService.resolveElementTypeInfo(el, collection),
      };
    }
    return results;
  }
}
