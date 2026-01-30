import { IField, IParentType, RootElementOption } from '../models/datamapper/document';
import { NS_XML, NS_XML_SCHEMA } from '../models/datamapper/standard-namespaces';
import { TypeOverrideVariant, Types } from '../models/datamapper/types';
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
import { QName } from '../xml-schema-ts/QName';
import { XmlSchemaSimpleTypeRestriction } from '../xml-schema-ts/simple/XmlSchemaSimpleTypeRestriction';
import { QNameMap } from '../xml-schema-ts/utils/ObjectMap';
import { DocumentUtilService } from './document-util.service';
import { XmlSchemaDocument } from './xml-schema-document.model';

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
   * Retrieves the first top-level element from an XML Schema collection.
   * @param source - The XmlSchemaCollection to search
   * @returns The first element found in the schema(s)
   */
  static getFirstElement(source: XmlSchemaCollection): XmlSchemaElement | undefined {
    for (const schema of source.getXmlSchemas()) {
      const firstElement = schema.getElements().values().next().value;
      if (firstElement) {
        return firstElement;
      }
    }
    return undefined;
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
    if (!('xmlSchemaCollection' in ownerDoc)) {
      return false;
    }

    const xmlDoc = ownerDoc as XmlSchemaDocument;
    const newSchemaType = xmlDoc.xmlSchemaCollection.getTypeByQName(newTypeQName);
    const originalSchemaType =
      field.originalTypeQName && xmlDoc.xmlSchemaCollection.getTypeByQName(field.originalTypeQName);

    if (!newSchemaType || !originalSchemaType) {
      return false;
    }

    return XmlSchemaDocumentUtilService.isExtensionOrRestriction(
      newSchemaType,
      originalSchemaType,
      xmlDoc.xmlSchemaCollection,
    );
  }

  private static isExtensionOrRestriction(
    derivedType: XmlSchemaType,
    baseType: XmlSchemaType,
    collection: XmlSchemaCollection,
  ): boolean {
    if (derivedType === baseType) return true;

    if (derivedType instanceof XmlSchemaComplexType) {
      return XmlSchemaDocumentUtilService.checkComplexTypeInheritance(derivedType, baseType, collection);
    }

    if (derivedType instanceof XmlSchemaSimpleType) {
      return XmlSchemaDocumentUtilService.checkSimpleTypeInheritance(derivedType, baseType, collection);
    }

    return false;
  }

  private static checkComplexTypeInheritance(
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

    return XmlSchemaDocumentUtilService.checkBaseTypeMatch(content.getBaseTypeName(), baseType, collection);
  }

  private static checkSimpleTypeInheritance(
    derivedType: XmlSchemaSimpleType,
    baseType: XmlSchemaType,
    collection: XmlSchemaCollection,
  ): boolean {
    const content = derivedType.getContent();
    if (!(content instanceof XmlSchemaSimpleTypeRestriction)) return false;

    return XmlSchemaDocumentUtilService.checkBaseTypeMatch(content.getBaseTypeName(), baseType, collection);
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

    return XmlSchemaDocumentUtilService.isExtensionOrRestriction(baseSchemaType, targetBaseType, collection);
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

  /**
   * Count the number of top-level element in the XML schema collection.
   * @param collection - The XML schema collection to validate
   * @returns The total number of top-level elements across all schemas
   */
  static getElementCount(collection: XmlSchemaCollection): number {
    const schemas = collection.getXmlSchemas();
    let totalElements = 0;
    for (const schema of schemas) {
      totalElements += schema.getElements().size;
    }
    return totalElements;
  }

  /**
   * Loads XML schema files into an XmlSchemaCollection.
   * Wraps collection.read() with proper iteration over multiple schema files.
   *
   * @param collection - The collection to load schemas into
   * @param definitionFiles - Map of file paths to file contents
   * @throws Error if schema parsing fails
   */
  static loadXmlSchemaFiles(collection: XmlSchemaCollection, definitionFiles: Record<string, string>): void {
    const filePaths = Object.keys(definitionFiles);
    for (const path of filePaths) {
      const fileContent = definitionFiles[path];
      collection.read(fileContent, () => {});
    }
  }

  /**
   * Determines the root element from the XML schema collection.
   * Uses the provided rootElementChoice if available, otherwise selects the first element.
   *
   * @param collection - The XML schema collection
   * @param rootElemChoice - Optional user-specified root element choice
   * @returns The root element
   * @throws Error if root element cannot be determined or specified element not found
   */
  static determineRootElement(collection: XmlSchemaCollection, rootElemChoice?: RootElementOption): XmlSchemaElement {
    if (rootElemChoice) {
      const qName = new QName(rootElemChoice.namespaceUri, rootElemChoice.name);
      const foundRootElement = collection.getElementByQName(qName);
      if (!foundRootElement) {
        throw new Error(`The specified root element '${qName.toString()}' is not found in the schema file(s)`);
      }
      return foundRootElement;
    }

    const rootElement = XmlSchemaDocumentUtilService.getFirstElement(collection);
    if (!rootElement) {
      throw new Error('Could not determine root element');
    }
    return rootElement;
  }

  /**
   * Collects all available root element options from the schema collection.
   * @param collection - The XML schema collection
   * @returns Array of root element options with namespace URI and name
   */
  static collectRootElementOptions(collection: XmlSchemaCollection): RootElementOption[] {
    const allElements = new QNameMap<XmlSchemaElement>();
    for (const schema of collection.getXmlSchemas()) {
      for (const [key, value] of schema.getElements().entries()) {
        allElements.set(key, value);
      }
    }
    return Array.from(allElements.keys())
      .filter((key) => !!key.getLocalPart())
      .map<RootElementOption>((key) => ({
        namespaceUri: key.getNamespaceURI() || '',
        name: key.getLocalPart()!,
      }));
  }

  /**
   * Checks if a namespace is a standard XML/XSD namespace that doesn't require
   * type fragment resolution.
   * @param namespace - The namespace URI to check
   * @returns true if it's a standard namespace (XSD or XML), false otherwise
   */
  static isStandardXmlNamespace(namespace: string | null | undefined): boolean {
    if (!namespace) return false;
    return namespace === NS_XML_SCHEMA || namespace === NS_XML;
  }

  /**
   * Looks up a schema type by QName in the collection.
   * Returns null for built-in XSD types or if type is not found.
   * @param collection - The schema collection to search
   * @param typeQName - The qualified name of the type to find
   * @returns The schema type if found and user-defined, null otherwise
   */
  static lookupSchemaType(collection: XmlSchemaCollection, typeQName: QName | null): XmlSchemaType | null {
    if (!typeQName) return null;

    const namespace = typeQName.getNamespaceURI();
    if (namespace === NS_XML_SCHEMA) {
      return null;
    }

    return collection.getTypeByQName(typeQName) || null;
  }
}
