import { IField, IParentType, RootElementOption } from '../../../models/datamapper/document';
import { NS_XML, NS_XML_SCHEMA } from '../../../models/datamapper/standard-namespaces';
import { Types } from '../../../models/datamapper/types';
import { XmlSchema, XmlSchemaCollection, XmlSchemaElement, XmlSchemaType } from '../../../xml-schema-ts';
import { QName } from '../../../xml-schema-ts/QName';
import { DocumentUtilService } from '../document-util.service';
import { DependencyEdge, XmlSchemaAnalysisService } from './xml-schema-analysis.service';
import { XmlSchemaAssembly } from './xml-schema-assembly.model';
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
   * Infers the entry schema file (assembly root) of a loaded schema set when no valid entry is stored. It is not the
   * only place that decides the entry: `createXmlSchemaDocument` takes the entry of the root choice first, and
   * `DataMapperMetadataService.inferLegacyRootElementChoice` derives the root choice, with its entry, for legacy
   * metadata.
   * Candidates are the schemas with no incoming include, import or redefine edge, in attach order. When a root
   * element choice is given, the first candidate whose reachable assembly (through its includes, imports and
   * redefines) declares that element wins. If there is no
   * such candidate (or no choice), the first candidate wins; when every file is referenced (e.g. circular includes)
   * the first attached file is used.
   *
   * @param collection - The loaded XML schema collection
   * @param definitionFiles - Schema files keyed by path, in attach order
   * @param edges - Dependency edges produced by schema analysis
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
        new XmlSchemaAssembly(collection, candidate).findElementInEntry(qName),
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
   * @param assembly - The assembly of the resolved entry schema file, which scopes the lookup
   * @param rootElemChoice - Optional user-specified root element choice
   * @param edges - Dependency edges produced by schema analysis
   * @returns The root element
   * @throws Error if root element cannot be determined or specified element not found
   */
  static determineRootElement(
    assembly: XmlSchemaAssembly,
    rootElemChoice: RootElementOption | undefined,
    edges: DependencyEdge[],
  ): XmlSchemaElement {
    if (rootElemChoice) {
      return XmlSchemaDocumentUtilService.resolveChosenRootElement(assembly, rootElemChoice);
    }

    const { collection, entrySchemaFile } = assembly;

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

  /**
   * Resolves the chosen root element through the assembly of its entry schema. When the entry scope does not declare
   * it (e.g. a legacy choice without an entry), it falls back to the first declaration in the whole collection, which
   * is what the lookup did before entry schemas were tracked. The assembly is built for the resolved entry, which is
   * the entry of the choice whenever the choice names one.
   */
  private static resolveChosenRootElement(
    assembly: XmlSchemaAssembly,
    rootElemChoice: RootElementOption,
  ): XmlSchemaElement {
    const qName = new QName(rootElemChoice.namespaceUri, rootElemChoice.name);
    const foundRootElement = assembly.lookupElement(qName);
    if (!foundRootElement) {
      throw new Error(`The specified root element '${qName.toString()}' is not found in the schema file(s)`);
    }
    return foundRootElement;
  }

  /**
   * Collects declared syntactic target namespaces for all user schemas keyed by source URI.
   * If multiple schema objects share the same source URI, the first encountered target namespace is preserved.
   */
  static collectSyntacticNamespaces(collection: XmlSchemaCollection): Map<string, string> {
    const syntacticNamespaces = new Map<string, string>();
    for (const schema of collection.getUserSchemas()) {
      const uri = schema.getSourceURI();
      if (uri && !syntacticNamespaces.has(uri)) {
        syntacticNamespaces.set(uri, schema.getTargetNamespace() || '');
      }
    }
    return syntacticNamespaces;
  }

  private static getFirstElementInSchemas(schemas: XmlSchema[]): XmlSchemaElement | undefined {
    for (const schema of schemas) {
      const firstElement = schema.getElements().values().next().value;
      if (firstElement) return firstElement;
    }
    return undefined;
  }

  private static getFirstReachableElement(
    collection: XmlSchemaCollection,
    entrySchemaFile: string,
    edges: DependencyEdge[],
  ): XmlSchemaElement | undefined {
    const effectiveNamespaces = XmlSchemaAnalysisService.collectEffectiveNamespaces(
      entrySchemaFile,
      edges,
      XmlSchemaDocumentUtilService.collectSyntacticNamespaces(collection),
    );

    // The map keys are exactly the files reachable from the entry, in breadth-first order.
    for (const [fileUri, allowedNs] of effectiveNamespaces) {
      if (fileUri === entrySchemaFile) continue;
      const candidateSchemas = collection
        .getXmlSchema(fileUri)
        .filter((schema) => allowedNs.has(schema.getLogicalTargetNamespace() || ''));
      const firstElement = XmlSchemaDocumentUtilService.getFirstElementInSchemas(candidateSchemas);
      if (firstElement) return firstElement;
    }
    return undefined;
  }

  /**
   * Returns the first element declared in the entry schema, or else in any schema reachable
   * from it through include, import or redefine edges. The result is deterministic regardless of load order.
   */
  private static getFirstElementFromSchema(
    collection: XmlSchemaCollection,
    entrySchemaFile: string,
    edges: DependencyEdge[],
  ): XmlSchemaElement | undefined {
    const firstInEntry = XmlSchemaDocumentUtilService.getFirstElementInSchemas(
      collection.getXmlSchema(entrySchemaFile),
    );
    if (firstInEntry) return firstInEntry;

    return XmlSchemaDocumentUtilService.getFirstReachableElement(collection, entrySchemaFile, edges);
  }

  /**
   * Collects all available root element options from the schema collection.
   * Each option carries the unreferenced schema (assembly entry point) it is reachable from as
   * `entrySchemaFile`. When the element is declared in a different file, that file is exposed as
   * the display-only `declaringFile`. Directive cycles yield a single entry per cycle, and a redefined file is not an
   * entry of its own: its elements are listed under the schema that redefines it. Within an entry, the entry's own
   * elements come first, followed by those of the files it reaches in breadth-first directive order.
   *
   * @param collection - The XML schema collection
   * @param edges - Dependency edges produced by schema analysis
   * @returns Array of root element options
   */
  static collectRootElementOptions(collection: XmlSchemaCollection, edges: DependencyEdge[]): RootElementOption[] {
    const userSchemas = collection.getUserSchemas();
    const syntacticNamespaces = XmlSchemaDocumentUtilService.collectSyntacticNamespaces(collection);

    const options: RootElementOption[] = [];
    // Entries are the unreferenced schemas plus one member per unreferenced directive cycle.
    for (const entryURI of XmlSchemaAnalysisService.findUnreferencedSchemas([...syntacticNamespaces.keys()], edges)) {
      const effectiveNamespaces = XmlSchemaAnalysisService.collectEffectiveNamespaces(
        entryURI,
        edges,
        syntacticNamespaces,
      );
      options.push(...XmlSchemaDocumentUtilService.collectOptionsForEntry(entryURI, userSchemas, effectiveNamespaces));
    }
    return options;
  }

  /**
   * Lists the global elements that the given entry schema reaches, the entry's own elements first and then those of
   * the reached files in breadth-first order. A chameleon schema is loaded once per including or redefining
   * namespace, so only the copy whose logical target namespace the entry actually reaches counts.
   *
   * @param entryURI - The entry schema file path
   * @param userSchemas - All user schemas of the collection
   * @param effectiveNamespaces - Namespaces under which the entry reaches each file, in breadth-first order
   * @returns Root element options declared by the schemas reachable from the entry
   */
  private static collectOptionsForEntry(
    entryURI: string,
    userSchemas: XmlSchema[],
    effectiveNamespaces: Map<string, Set<string>>,
  ): RootElementOption[] {
    const rank = new Map<string, number>([...effectiveNamespaces.keys()].map((uri, index) => [uri, index]));
    const reachedSchemas: Array<{ schema: XmlSchema; declaringURI: string }> = [];
    for (const schema of userSchemas) {
      const declaringURI = schema.getSourceURI();
      if (declaringURI && effectiveNamespaces.get(declaringURI)?.has(schema.getLogicalTargetNamespace() || '')) {
        reachedSchemas.push({ schema, declaringURI });
      }
    }
    // Sorting a filtered copy keeps the shared `userSchemas` order intact; the sort is stable.
    reachedSchemas.sort((a, b) => rank.get(a.declaringURI)! - rank.get(b.declaringURI)!);

    const options: RootElementOption[] = [];
    const seen = new Set<string>();
    for (const { schema, declaringURI } of reachedSchemas) {
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
   * Builds the key used to store an anonymous global element's type fragment in {@link IDocument.namedTypeFragments}.
   * The `__elem:` prefix distinguishes element fragments from named type fragments. Like named type fragments, the
   * key is scoped by the declaring schema file, so same-QName elements of different files do not compete for a key.
   *
   * @param sourceURI - The source URI / file path of the declaring schema, if available
   * @param namespaceURI - Namespace URI of the element (empty string for no-namespace elements)
   * @param localPart - Local name of the element
   * @returns Fragment key string in the form `<sourceURI>#__elem:<namespaceURI>:<localPart>`, or
   *   `__elem:<namespaceURI>:<localPart>` without a source URI
   */
  static buildElementFragmentKey(
    sourceURI: string | null | undefined,
    namespaceURI: string,
    localPart: string,
  ): string {
    const elementKey = `__elem:${namespaceURI}:${localPart}`;
    return sourceURI ? `${sourceURI}#${elementKey}` : elementKey;
  }

  /**
   * Builds the scoped key of an anonymous global element's type fragment from the declaring schema of `element`.
   *
   * @param element - The global element the fragment belongs to
   * @returns Fragment key string, see {@link buildElementFragmentKey}
   */
  static buildElementFragmentKeyOf(element: XmlSchemaElement): string {
    const wireName = element.getWireName();
    return XmlSchemaDocumentUtilService.buildElementFragmentKey(
      element.getParent().getSourceURI(),
      wireName?.getNamespaceURI() ?? '',
      wireName?.getLocalPart() ?? '',
    );
  }

  /**
   * Builds the key used to store a named type fragment in {@link IDocument.namedTypeFragments}.
   * When `sourceURI` is provided, scopes the key as `<sourceURI>#<typeQName>`.
   *
   * @param sourceURI - The source URI / file path of the declaring schema, if available
   * @param typeQName - The qualified name of the type
   * @returns Fragment key string
   */
  static buildTypeFragmentKey(sourceURI: string | null | undefined, typeQName: QName): string {
    const qNameStr = typeQName.toString();
    return sourceURI ? `${sourceURI}#${qNameStr}` : qNameStr;
  }

  /**
   * Builds the scoped key of a named type fragment from the declaring schema of `schemaType`.
   * Falls back to the unscoped QName when the type has no declaring schema, e.g. when it is not found.
   *
   * @param schemaType - The schema type the fragment belongs to, if it was found
   * @param typeQName - The qualified name of the type
   * @returns Fragment key string
   */
  static buildTypeFragmentKeyOf(schemaType: XmlSchemaType | null | undefined, typeQName: QName): string {
    return XmlSchemaDocumentUtilService.buildTypeFragmentKey(schemaType?.getParent()?.getSourceURI(), typeQName);
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
}
