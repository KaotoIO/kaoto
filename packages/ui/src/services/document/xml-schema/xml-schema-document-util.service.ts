import { IField, IParentType, RootElementOption } from '../../../models/datamapper/document';
import { NS_XML, NS_XML_SCHEMA } from '../../../models/datamapper/standard-namespaces';
import { Types } from '../../../models/datamapper/types';
import {
  XmlSchema,
  XmlSchemaCollection,
  XmlSchemaElement,
  XmlSchemaGroup,
  XmlSchemaType,
} from '../../../xml-schema-ts';
import { QName } from '../../../xml-schema-ts/QName';
import { DocumentUtilService } from '../document-util.service';
import { DependencyEdge, XmlSchemaAnalysisService } from './xml-schema-analysis.service';
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
   * Infers the entry schema file (assembly root) of a loaded schema set. This is the single owner of entry inference.
   * Candidates are the schemas with no incoming include/import edge, in attach order. When a root element choice
   * is given, the first candidate whose reachable assembly declares that element wins. If there is no such candidate
   * (or no choice), the first candidate wins; when every file is referenced (e.g. circular includes) the first
   * attached file is used.
   *
   * @param collection - The loaded XML schema collection
   * @param definitionFiles - Schema files keyed by path, in attach order
   * @param edges - Include/import dependency edges produced by schema analysis
   * @param rootElementChoice - Optional user-chosen root element
   * @returns The inferred entry schema file path, or undefined when no files are attached
   */
  static inferEntrySchemaFile(
    collection: XmlSchemaCollection,
    definitionFiles: Record<string, string>,
    edges: DependencyEdge[],
    rootElementChoice?: RootElementOption,
  ): string | undefined {
    const allFiles = Object.keys(definitionFiles);
    if (allFiles.length === 0) return undefined;
    const candidates = XmlSchemaAnalysisService.findUnreferencedSchemas(allFiles, edges);

    if (rootElementChoice) {
      const qName = new QName(rootElementChoice.namespaceUri, rootElementChoice.name);
      const reaching = candidates.find((candidate) =>
        collection.getXmlSchema(candidate).some((schema) => schema.getElementByQName(qName, true)),
      );
      if (reaching) return reaching;
    }

    const candidateWithElements = candidates.find(
      (candidate) => XmlSchemaDocumentUtilService.getFirstElementFromSchema(collection, candidate, edges) !== undefined,
    );
    if (candidateWithElements) return candidateWithElements;

    return candidates[0] ?? allFiles[0];
  }

  /**
   * Determines the root element from the XML schema collection.
   * Uses the provided rootElementChoice if available, otherwise selects the first element.
   *
   * @param collection - The XML schema collection
   * @param rootElemChoice - Optional user-specified root element choice
   * @param entrySchemaFile - Optional entry schema file used to scope the lookup
   * @param edges - Include/import dependency edges produced by schema analysis
   * @returns The root element
   * @throws Error if root element cannot be determined or specified element not found
   */
  static determineRootElement(
    collection: XmlSchemaCollection,
    rootElemChoice: RootElementOption | undefined,
    entrySchemaFile: string | undefined,
    edges: DependencyEdge[],
  ): XmlSchemaElement {
    if (rootElemChoice) {
      return XmlSchemaDocumentUtilService.resolveChosenRootElement(collection, rootElemChoice, entrySchemaFile);
    }

    if (entrySchemaFile) {
      const fromEntry = XmlSchemaDocumentUtilService.getFirstElementFromSchema(collection, entrySchemaFile, edges);
      if (fromEntry) return fromEntry;
    }

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

  /**
   * Returns the first element declared in the entry schema, or else in any schema reachable
   * from it through include/import edges. The result is deterministic regardless of load order.
   */
  private static getFirstElementFromSchema(
    collection: XmlSchemaCollection,
    entrySchemaFile: string,
    edges: DependencyEdge[],
  ): XmlSchemaElement | undefined {
    for (const entrySchema of collection.getXmlSchema(entrySchemaFile)) {
      const firstInEntry = entrySchema.getElements().values().next().value;
      if (firstInEntry) return firstInEntry;
    }

    const syntacticNamespaces = new Map<string, string>();
    for (const schema of collection.getUserSchemas()) {
      const uri = schema.getSourceURI();
      if (uri && !syntacticNamespaces.has(uri)) {
        syntacticNamespaces.set(uri, schema.getTargetNamespace() || '');
      }
    }
    const effectiveNamespaces = XmlSchemaDocumentUtilService.collectEffectiveNamespaces(
      entrySchemaFile,
      edges,
      syntacticNamespaces,
    );

    const reachableFiles = XmlSchemaAnalysisService.getReachableFiles(entrySchemaFile, edges);
    for (const schema of collection.getUserSchemas()) {
      const uri = schema.getSourceURI();
      if (!uri || uri === entrySchemaFile || !reachableFiles.has(uri)) continue;
      const allowedNs = effectiveNamespaces.get(uri);
      if (allowedNs && !allowedNs.has(schema.getLogicalTargetNamespace() || '')) continue;
      const firstElement = schema.getElements().values().next().value;
      if (firstElement) return firstElement;
    }
    return undefined;
  }

  /**
   * Collects all available root element options from the schema collection.
   * Each option carries the unreferenced schema (assembly entry point) it is reachable from as
   * `entrySchemaFile`. When the element is declared in a different file, that file is exposed as
   * the display-only `declaringFile`. If every schema is referenced (circular includes), each
   * schema is treated as its own entry.
   *
   * @param collection - The XML schema collection
   * @param edges - Include/import dependency edges produced by schema analysis
   * @returns Array of root element options
   */
  static collectRootElementOptions(collection: XmlSchemaCollection, edges: DependencyEdge[]): RootElementOption[] {
    const userSchemas = collection.getUserSchemas();
    const syntacticNamespaces = new Map<string, string>();
    for (const schema of userSchemas) {
      const uri = schema.getSourceURI();
      if (uri) syntacticNamespaces.set(uri, schema.getTargetNamespace() || '');
    }

    const options: RootElementOption[] = [];
    for (const entryURI of XmlSchemaDocumentUtilService.collectEntryURIs([...syntacticNamespaces.keys()], edges)) {
      const effectiveNamespaces = XmlSchemaDocumentUtilService.collectEffectiveNamespaces(
        entryURI,
        edges,
        syntacticNamespaces,
      );
      options.push(...XmlSchemaDocumentUtilService.collectOptionsForEntry(entryURI, userSchemas, effectiveNamespaces));
    }
    return options;
  }

  /**
   * Determines the entry points of the schema assemblies: the schemas nobody references, plus any schema that is
   * not reachable from one of them (e.g. an isolated include cycle), which is then treated as its own entry.
   *
   * @param allURIs - Source URIs of all user schemas
   * @param edges - Include/import dependency edges produced by schema analysis
   * @returns Entry schema file paths in schema load order
   */
  private static collectEntryURIs(allURIs: string[], edges: DependencyEdge[]): string[] {
    return XmlSchemaAnalysisService.findUnreferencedSchemas(allURIs, edges);
  }

  /**
   * Lists the global elements that the given entry schema reaches. A chameleon schema is loaded once per including
   * namespace, so only the copy whose logical target namespace the entry actually reaches counts.
   *
   * @param entryURI - The entry schema file path
   * @param userSchemas - All user schemas of the collection
   * @param effectiveNamespaces - Namespaces under which the entry reaches each file
   * @returns Root element options declared by the schemas reachable from the entry
   */
  private static collectOptionsForEntry(
    entryURI: string,
    userSchemas: XmlSchema[],
    effectiveNamespaces: Map<string, Set<string>>,
  ): RootElementOption[] {
    const options: RootElementOption[] = [];
    const seen = new Set<string>();
    for (const schema of userSchemas) {
      const declaringURI = schema.getSourceURI();
      if (!declaringURI || !effectiveNamespaces.get(declaringURI)?.has(schema.getLogicalTargetNamespace() || '')) {
        continue;
      }
      const declaringFile = declaringURI === entryURI ? {} : { declaringFile: declaringURI };
      for (const option of XmlSchemaDocumentUtilService.collectSchemaElementOptions(schema, entryURI, seen)) {
        options.push({ ...option, ...declaringFile });
      }
    }
    return options;
  }

  /**
   * Lists the global elements of one schema as root element options, skipping those already in `seen`.
   *
   * @param schema - The schema whose global elements are listed
   * @param entryURI - The entry schema file path the elements are reached from
   * @param seen - Namespace/name keys already listed for this entry; updated with the newly listed elements
   * @returns Root element options without `declaringFile`
   */
  private static collectSchemaElementOptions(
    schema: XmlSchema,
    entryURI: string,
    seen: Set<string>,
  ): RootElementOption[] {
    const options: RootElementOption[] = [];
    for (const key of schema.getElements().keys()) {
      const name = key.getLocalPart();
      const namespaceUri = key.getNamespaceURI() || '';
      const uniqueKey = `${namespaceUri}#${name}`;
      if (!name || seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);
      options.push({ namespaceUri, name, entrySchemaFile: entryURI });
    }
    return options;
  }

  /**
   * Computes, for every schema file reachable from `entryURI`, the namespaces under which it is reached.
   * An `xs:include` of a schema without a target namespace (chameleon) adopts the namespace of the including
   * schema; an `xs:import` or a schema that declares its own target namespace keeps that namespace.
   *
   * @param entryURI - The entry schema file path
   * @param edges - Include/import dependency edges produced by schema analysis
   * @param syntacticNamespaces - Declared target namespace per schema file ('' when absent)
   * @returns Map of file path to the set of namespaces under which the entry reaches it
   */
  static collectEffectiveNamespaces(
    entryURI: string,
    edges: DependencyEdge[],
    syntacticNamespaces: Map<string, string>,
  ): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();
    const queue: Array<[string, string]> = [[entryURI, syntacticNamespaces.get(entryURI) ?? '']];
    while (queue.length > 0) {
      const [file, namespace] = queue.shift()!;
      const known = result.get(file) ?? new Set<string>();
      if (known.has(namespace)) continue;
      known.add(namespace);
      result.set(file, known);

      for (const edge of edges) {
        if (edge.from !== file) continue;
        const declared = syntacticNamespaces.get(edge.to) ?? '';
        const childNamespace = edge.directive.type === 'include' && !declared ? namespace : declared;
        queue.push([edge.to, childNamespace]);
      }
    }
    return result;
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
