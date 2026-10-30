import { IField, IParentType, RootElementOption } from '../../../models/datamapper/document';
import { NS_XML, NS_XML_SCHEMA } from '../../../models/datamapper/standard-namespaces';
import { Types } from '../../../models/datamapper/types';
import { XmlSchemaCollection, XmlSchemaElement, XmlSchemaGroup, XmlSchemaType } from '../../../xml-schema-ts';
import { QName } from '../../../xml-schema-ts/QName';
import { DocumentUtilService } from '../document-util.service';
import { mapXmlSchemaTypeToEnum } from './xml-schema-type-mapping';

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
   * Finds a child field by name and namespace URI.
   * @param parent - The parent field or document to search
   * @param name - The field name to match
   * @param namespaceURI - Namespace URI to match (empty string for no-namespace fields)
   * @returns The matching child field, or undefined if not found
   */
  static getChildField(parent: IParentType, name: string, namespaceURI: string): IField | undefined {
    const resolvedParent = 'parent' in parent ? DocumentUtilService.resolveTypeFragment(parent) : parent;

    const directChild = resolvedParent.fields.find((f) => {
      return f.name === name && f.namespaceURI === namespaceURI;
    });

    if (directChild) return directChild;

    for (const field of resolvedParent.fields) {
      if (field.wrapperKind) {
        const found = XmlSchemaDocumentUtilService.findInWrapperByNameAndNamespace(field, name, namespaceURI);
        if (found) return found;
      }
    }

    return undefined;
  }

  private static findInWrapperByNameAndNamespace(
    wrapperField: IField,
    name: string,
    namespaceURI: string,
  ): IField | undefined {
    for (const member of wrapperField.fields) {
      if (member.name === name && member.namespaceURI === namespaceURI) {
        return member;
      }
      if (member.wrapperKind) {
        const nested = XmlSchemaDocumentUtilService.getChildField(member, name, namespaceURI);
        if (nested) return nested;
      }
    }
    return undefined;
  }

  /**
   * Gets the field type from a simple type name.
   * @param name - The type name to look up
   * @param namespaceURI - Namespace that owns the type name
   * @returns The corresponding Types enum value, or Types.AnyType if not found
   */
  static getFieldTypeFromName(name: string | null, namespaceURI: string | null): Types {
    return name ? mapXmlSchemaTypeToEnum(namespaceURI || '', name) : Types.AnyType;
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
      collection.read(fileContent, () => {}, path);
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
  static determineRootElement(
    collection: XmlSchemaCollection,
    rootElemChoice?: RootElementOption,
    entrySchemaFile?: string,
  ): XmlSchemaElement {
    if (rootElemChoice) {
      return XmlSchemaDocumentUtilService.resolveChosenRootElement(collection, rootElemChoice, entrySchemaFile);
    }

    const fromEntry = XmlSchemaDocumentUtilService.getFirstElementFromSchema(collection, entrySchemaFile);
    if (fromEntry) return fromEntry;

    const rootElement = XmlSchemaDocumentUtilService.getFirstElement(collection);
    if (!rootElement) {
      throw new Error('Could not determine root element');
    }
    return rootElement;
  }

  private static resolveChosenRootElement(
    collection: XmlSchemaCollection,
    rootElemChoice: RootElementOption,
    entrySchemaFile?: string,
  ): XmlSchemaElement {
    const qName = new QName(rootElemChoice.namespaceUri, rootElemChoice.name);
    let foundRootElement: XmlSchemaElement | null = null;
    const scopeFile = rootElemChoice.entrySchemaFile ?? entrySchemaFile;
    if (scopeFile) {
      const entrySchemas = collection.getXmlSchema(scopeFile);
      for (const entrySchema of entrySchemas) {
        foundRootElement = entrySchema.getElementByQName(qName, true);
        if (foundRootElement) break;
      }
    }
    foundRootElement ??= collection.getElementByQName(qName);
    if (!foundRootElement) {
      throw new Error(`The specified root element '${qName.toString()}' is not found in the schema file(s)`);
    }
    return foundRootElement;
  }

  private static getFirstElementFromSchema(
    collection: XmlSchemaCollection,
    entrySchemaFile?: string,
  ): XmlSchemaElement | undefined {
    if (!entrySchemaFile) return undefined;
    // Prefer the first element declared in the entry schema so that the result is
    // deterministic regardless of schema load order.
    const entrySchemas = collection.getXmlSchema(entrySchemaFile);
    for (const entrySchema of entrySchemas) {
      const firstInEntry = entrySchema.getElements().values().next().value;
      if (firstInEntry) return firstInEntry;
    }
    return undefined;
  }

  /**
   * Collects all available root element options from the schema collection.
   * @param collection - The XML schema collection
   * @returns Array of root element options with namespace URI, name, and entrySchemaFile
   */
  static collectRootElementOptions(collection: XmlSchemaCollection): RootElementOption[] {
    const options: RootElementOption[] = [];
    const seen = new Set<string>();

    for (const schema of collection.getUserSchemas()) {
      const entrySchemaFile = schema.getSourceURI() || undefined;
      for (const [key] of schema.getElements().entries()) {
        const localPart = key.getLocalPart();
        if (!localPart) continue;
        const namespaceUri = key.getNamespaceURI() || '';
        const uniqueKey = `${entrySchemaFile ?? ''}#${namespaceUri}#${localPart}`;
        if (!seen.has(uniqueKey)) {
          seen.add(uniqueKey);
          options.push({
            namespaceUri,
            name: localPart,
            entrySchemaFile,
          });
        }
      }
    }
    return options;
  }

  /**
   * Builds the key used to store an anonymous global element's type fragment in {@link IDocument.namedTypeFragments}.
   * The `__elem:` prefix distinguishes element fragments from named type fragments.
   *
   * @param namespaceURI - Namespace URI of the element (empty string for no-namespace elements)
   * @param localPart - Local name of the element
   * @returns Fragment key string in the form `__elem:<namespaceURI>:<localPart>`
   */
  static buildElementFragmentKey(namespaceURI: string, localPart: string): string {
    return `__elem:${namespaceURI}:${localPart}`;
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
  static lookupSchemaType(
    collection: XmlSchemaCollection,
    typeQName: QName | null,
    entrySchemaFile?: string,
  ): XmlSchemaType | null {
    if (!typeQName) return null;

    const namespace = typeQName.getNamespaceURI();
    if (namespace === NS_XML_SCHEMA) {
      return null;
    }

    if (entrySchemaFile) {
      const entrySchemas = collection.getXmlSchema(entrySchemaFile);
      for (const entrySchema of entrySchemas) {
        const found = entrySchema.getTypeByQName(typeQName, true);
        if (found) return found;
      }
    }

    return collection.getTypeByQName(typeQName) || null;
  }

  /**
   * Looks up a schema element in the collection, scoped to entrySchemaFile's reachable hierarchy if provided.
   *
   * @param collection - The XML schema collection
   * @param elementQName - The QName of the element to find
   * @param entrySchemaFile - Optional entry schema file path
   * @returns The schema element if found, null otherwise
   */
  static lookupSchemaElement(
    collection: XmlSchemaCollection,
    elementQName: QName | null,
    entrySchemaFile?: string,
  ): XmlSchemaElement | null {
    if (!elementQName) return null;
    if (entrySchemaFile) {
      const entrySchemas = collection.getXmlSchema(entrySchemaFile);
      for (const entrySchema of entrySchemas) {
        const found = entrySchema.getElementByQName(elementQName, true);
        if (found) return found;
      }
    }
    return collection.getElementByQName(elementQName) || null;
  }

  /**
   * Looks up a schema group in the collection, scoped to entrySchemaFile's reachable hierarchy if provided.
   *
   * @param collection - The XML schema collection
   * @param groupQName - The QName of the group to find
   * @param entrySchemaFile - Optional entry schema file path
   * @returns The schema group if found, null otherwise
   */
  static lookupSchemaGroup(
    collection: XmlSchemaCollection,
    groupQName: QName | null,
    entrySchemaFile?: string,
  ): XmlSchemaGroup | null {
    if (!groupQName) return null;
    if (entrySchemaFile) {
      const entrySchemas = collection.getXmlSchema(entrySchemaFile);
      for (const entrySchema of entrySchemas) {
        const found = entrySchema.getGroupByQName(groupQName, true);
        if (found) return found;
      }
    }
    return collection.getGroupByQName(groupQName) || null;
  }
}
