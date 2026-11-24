import { DocumentDefinition, RootElementOption } from '../../../models/datamapper/document';
import { NS_XML_SCHEMA_INSTANCE } from '../../../models/datamapper/standard-namespaces';
import { Types } from '../../../models/datamapper/types';
import {
  XmlSchema,
  XmlSchemaAll,
  XmlSchemaAllMember,
  XmlSchemaAny,
  XmlSchemaAttribute,
  XmlSchemaAttributeGroup,
  XmlSchemaAttributeGroupMember,
  XmlSchemaAttributeGroupRef,
  XmlSchemaAttributeOrGroupRef,
  XmlSchemaChoice,
  XmlSchemaCollection,
  XmlSchemaComplexContentExtension,
  XmlSchemaComplexContentRestriction,
  XmlSchemaComplexType,
  XmlSchemaContentModel,
  XmlSchemaElement,
  XmlSchemaGroup,
  XmlSchemaGroupParticle,
  XmlSchemaGroupRef,
  XmlSchemaParticle,
  XmlSchemaSequence,
  XmlSchemaSequenceMember,
  XmlSchemaSimpleContentExtension,
  XmlSchemaSimpleContentRestriction,
  XmlSchemaSimpleType,
  XmlSchemaType,
  XmlSchemaUse,
} from '../../../xml-schema-ts';
import { XmlSchemaDocumentation } from '../../../xml-schema-ts/annotation/XmlSchemaDocumentation';
import { QName } from '../../../xml-schema-ts/QName';
import { XmlSchemaSimpleTypeContent } from '../../../xml-schema-ts/simple/XmlSchemaSimpleTypeContent';
import { XmlSchemaSimpleTypeList } from '../../../xml-schema-ts/simple/XmlSchemaSimpleTypeList';
import { XmlSchemaSimpleTypeRestriction } from '../../../xml-schema-ts/simple/XmlSchemaSimpleTypeRestriction';
import { XmlSchemaSimpleTypeUnion } from '../../../xml-schema-ts/simple/XmlSchemaSimpleTypeUnion';
import { XmlSchemaAnnotated } from '../../../xml-schema-ts/XmlSchemaAnnotated';
import { parseQNameString } from '../../namespace-util';
import { DocumentUtilService } from '../document-util.service';
import { DependencyEdge, XmlSchemaAnalysisService } from './xml-schema-analysis.service';
import { XmlSchemaAssembly } from './xml-schema-assembly.model';
import type {
  CreateXmlSchemaDocumentResult,
  XmlSchemaParentType,
  XmlSchemaTypeFragment,
} from './xml-schema-document.model';
import { XmlSchemaDocument, XmlSchemaField } from './xml-schema-document.model';
import { XmlSchemaDocumentUtilService } from './xml-schema-document-util.service';
import { XmlSchemaTypesService } from './xml-schema-types.service';

const REGEX_BASE_URI = /baseUri="([^"]+)"/;

/**
 * The collection of XML schema handling logic. {@link createXmlSchemaDocument} consumes XML schema
 * file and generate a {@link XmlSchemaDocument} object.
 *
 * @see XmlSchemaDocumentUtilService
 */
export class XmlSchemaDocumentService {
  /**
   * Extensions whose elements are currently being populated, per parent. Guards against emitting the same extension
   * particle twice into one parent when the base chain cycles back to it. It is keyed by parent because populating an
   * element particle can start an independent walk into another fragment that legitimately re-enters the same extension.
   */
  private static readonly extensionsInProgress = new WeakMap<
    XmlSchemaField | XmlSchemaTypeFragment,
    Set<XmlSchemaComplexContentExtension>
  >();

  private static readonly NO_EXCLUDED_ATTRIBUTES: ReadonlySet<string> = new Set();

  /**
   * Creates an XML Schema Document from a DocumentDefinition.
   * @param definition The DocumentDefinition containing schema information and configuration
   * @returns {@link CreateXmlSchemaDocumentResult} with document, root element options, and validation status
   */
  static createXmlSchemaDocument(
    definition: DocumentDefinition,
    namespaceMap: Record<string, string> = {},
  ): CreateXmlSchemaDocumentResult {
    const collection = new XmlSchemaCollection();
    const definitionFiles = definition.definitionFiles || {};
    collection.getSchemaResolver().addFiles(definitionFiles);

    const analysis = XmlSchemaAnalysisService.analyze(definitionFiles);
    if (analysis.errors.length > 0) {
      return XmlSchemaDocumentService.createErrorResult(analysis.errors, analysis.warnings, definition);
    }

    const loadResult = XmlSchemaDocumentService.loadSchemaFiles(
      collection,
      analysis,
      definitionFiles,
      definition.rootElementChoice?.entrySchemaFile,
    );
    if (loadResult.error) {
      return XmlSchemaDocumentService.createErrorResult(
        [{ message: loadResult.error.message, filePath: loadResult.error.filePath }],
        analysis.warnings,
        definition,
      );
    }

    const validationResult = XmlSchemaDocumentService.validateCollection(collection, definition);
    if (validationResult) {
      return validationResult;
    }

    const resolvedDefinition = XmlSchemaDocumentService.withResolvedEntry(
      definition,
      collection,
      definitionFiles,
      analysis.edges,
    );

    const rootElement = XmlSchemaDocumentService.getRootElement(
      new XmlSchemaAssembly(collection, resolvedDefinition.entrySchemaFile),
      resolvedDefinition,
      analysis.edges,
    );
    if ('validationStatus' in rootElement) {
      return rootElement;
    }

    const document = new XmlSchemaDocument(resolvedDefinition, collection, rootElement);

    XmlSchemaDocumentService.populateNamedTypeFragments(document);
    XmlSchemaDocumentService.populateElement(document, document.fields, document.rootElement!);

    DocumentUtilService.processOverrides(
      document,
      resolvedDefinition.fieldTypeOverrides ?? [],
      resolvedDefinition.choiceSelections ?? [],
      resolvedDefinition.fieldSubstitutions ?? [],
      namespaceMap,
      XmlSchemaTypesService.parseTypeOverride,
      XmlSchemaTypesService.resolveSubstitution,
    );

    const rootElementOptions = XmlSchemaDocumentUtilService.collectRootElementOptions(collection, analysis.edges);
    const validationStatus = analysis.warnings.length > 0 ? 'warning' : 'success';

    return {
      validationStatus,
      warnings: analysis.warnings.length > 0 ? analysis.warnings : undefined,
      documentDefinition: resolvedDefinition,
      document,
      rootElementOptions,
    } as CreateXmlSchemaDocumentResult;
  }

  /**
   * Returns a copy of the definition whose entry schema file and root element choice are consistent with the attached
   * files, leaving the caller's definition untouched. A stale choice entry would give an empty resolution scope and
   * silently select a foreign element, so it is cleared; a missing or stale entry schema is inferred.
   */
  private static withResolvedEntry(
    definition: DocumentDefinition,
    collection: XmlSchemaCollection,
    definitionFiles: Record<string, string>,
    edges: DependencyEdge[],
  ): DocumentDefinition {
    const resolved = Object.assign(
      new DocumentDefinition(definition.documentType, definition.definitionType, definition.name),
      definition,
    );
    const choice = resolved.rootElementChoice;
    if (choice?.entrySchemaFile && !definitionFiles[choice.entrySchemaFile]) {
      resolved.rootElementChoice = { ...choice, entrySchemaFile: undefined };
    }
    // The root is looked up in the choice's entry, so fragments must be resolved in that same assembly.
    if (resolved.rootElementChoice?.entrySchemaFile) {
      resolved.entrySchemaFile = resolved.rootElementChoice.entrySchemaFile;
    } else if (!resolved.entrySchemaFile || !definitionFiles[resolved.entrySchemaFile]) {
      resolved.entrySchemaFile = XmlSchemaDocumentUtilService.inferEntrySchemaFile(
        collection,
        definitionFiles,
        edges,
        resolved.rootElementChoice,
      );
    }
    return resolved;
  }

  /**
   * Helper method to create an error result.
   */
  private static createErrorResult(
    errors: Array<{ message: string; filePath?: string }>,
    warnings: Array<{ message: string; filePath?: string }>,
    definition: DocumentDefinition,
  ): CreateXmlSchemaDocumentResult {
    return {
      validationStatus: 'error',
      errors,
      warnings,
      documentDefinition: definition,
    };
  }

  /**
   * Helper method to load schema files into the collection in topological dependency order. Targets of include-like
   * directives (`xs:include`, `xs:redefine`) are not loaded directly: the referencing schema loads them, in its own
   * namespace when they declare none.
   * @param selectedEntry - An entry schema chosen with the root element. When another file includes or redefines it,
   *   it is still loaded directly, so that its own (possibly no-namespace) declarations stay resolvable next to the
   *   copy the referencing file adopts into its namespace.
   */
  static loadSchemaFiles(
    collection: XmlSchemaCollection,
    analysis: { loadOrder: string[]; edges: DependencyEdge[] },
    definitionFiles: Record<string, string>,
    selectedEntry?: string,
  ): { error?: { message: string; filePath?: string } } {
    const includeLikeTargets = XmlSchemaDocumentService.computeIncludeLikeTargetsToSkip(
      analysis.loadOrder,
      analysis.edges,
    );
    if (selectedEntry) includeLikeTargets.delete(selectedEntry);

    try {
      for (const path of analysis.loadOrder) {
        if (includeLikeTargets.has(path)) continue;
        collection.read(definitionFiles[path], () => {}, path);
      }
      return {};
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const baseUriMatch = REGEX_BASE_URI.exec(errorMessage);
      const filePath = baseUriMatch?.[1];
      return { error: { message: errorMessage, filePath } };
    }
  }

  /**
   * Determines which include-like targets (`xs:include`, `xs:redefine`) can safely be skipped during direct loading.
   * Normally such a target is loaded indirectly when its referencing schema processes the directive. With a cycle
   * (A includes B, B includes A) every member is a target, and skipping them all would load nothing, so at least one
   * file per cycle that no loaded file reaches is promoted to direct loading. SchemaBuilder copes with the cycle
   * because a schema is registered before its children are read, and `collection.getSchema(key)` returns it.
   * A target in `loadOrder` that only files outside `loadOrder` reference is promoted the same way.
   */
  private static computeIncludeLikeTargetsToSkip(loadOrder: string[], edges: DependencyEdge[]): Set<string> {
    const includeLikeTargets = new Set(
      edges.filter((e) => XmlSchemaAnalysisService.isIncludeLikeDirective(e.directive.type)).map((e) => e.to),
    );
    const adjacencyMap = XmlSchemaAnalysisService.buildSuccessors(
      edges,
      XmlSchemaAnalysisService.isIncludeLikeDirective,
    );

    const reachable = new Set<string>();
    const seeds = loadOrder.filter((p) => !includeLikeTargets.has(p));
    XmlSchemaDocumentService.bfsReachable(seeds, adjacencyMap, reachable);

    for (const path of loadOrder) {
      if (reachable.has(path)) continue;
      includeLikeTargets.delete(path);
      XmlSchemaDocumentService.bfsReachable([path], adjacencyMap, reachable);
    }

    return includeLikeTargets;
  }

  private static bfsReachable(seeds: string[], adj: Map<string, string[]>, reachable: Set<string>): void {
    const queue = [...seeds];
    for (const seed of seeds) {
      reachable.add(seed);
    }
    while (queue.length > 0) {
      const file = queue.shift()!;
      for (const target of adj.get(file) ?? []) {
        if (!reachable.has(target)) {
          reachable.add(target);
          queue.push(target);
        }
      }
    }
  }

  /**
   * Helper method to validate the schema collection.
   */
  private static validateCollection(
    collection: XmlSchemaCollection,
    definition: DocumentDefinition,
  ): CreateXmlSchemaDocumentResult | null {
    if (collection.getXmlSchemas().length === 0) {
      return {
        validationStatus: 'error',
        errors: [{ message: 'No schema files provided in DocumentDefinition' }],
        documentDefinition: definition,
      };
    }

    const totalElements = XmlSchemaDocumentUtilService.getElementCount(collection);
    if (totalElements === 0) {
      return {
        validationStatus: 'error',
        errors: [{ message: "There's no top level Element in the schema" }],
        documentDefinition: definition,
      };
    }

    return null;
  }

  /**
   * Helper method to get the root element.
   */
  private static getRootElement(
    assembly: XmlSchemaAssembly,
    definition: DocumentDefinition,
    edges: DependencyEdge[],
  ): XmlSchemaElement | CreateXmlSchemaDocumentResult {
    try {
      return XmlSchemaDocumentUtilService.determineRootElement(assembly, definition.rootElementChoice, edges);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        validationStatus: 'error',
        errors: [{ message: errorMessage }],
        documentDefinition: definition,
      };
    }
  }

  /**
   * Adds additional schema files to an existing document's schema collection.
   * This is useful when field type overrides reference types defined in additional schema files.
   * The existing definition files are analysed together with the added ones, because the caller adds the new files
   * to `document.definition.definitionFiles` only after this call, and the added files are loaded the way a reload
   * loads them: in dependency order, with include-like targets loaded through the schema that references them.
   * The analysis runs before the files are given to the schema resolver, so a file the analysis rejects leaves no
   * trace there; after a loader error the resolver and the collection keep what was added up to that point.
   * The load order is limited to the added files before the skip set is computed: an existing include that resolved
   * through the file-name fallback can resolve to an added file by its exact path instead, and that file is then
   * loaded directly rather than skipped.
   * @param document - The document whose schema collection will be updated
   * @param additionalFiles - Map of file paths to file contents to add
   * @throws Error with the analysis errors joined by `; `, or with the loader error, when the files cannot be added
   * @remarks A malformed `minOccurs` or `maxOccurs` in an added file loads as `1` without a warning here; the
   * warning is shown only when the files are attached through the Attach Schema modal.
   */
  static addSchemaFiles(document: XmlSchemaDocument, additionalFiles: Record<string, string>): void {
    const collection = document.xmlSchemaCollection;
    const mergedFiles = { ...document.definition.definitionFiles, ...additionalFiles };
    const analysis = XmlSchemaAnalysisService.analyze(mergedFiles);
    if (analysis.errors.length > 0) {
      throw new Error(analysis.errors.map((e) => e.message).join('; '));
    }

    collection.getSchemaResolver().addFiles(additionalFiles);
    const loadOrder = analysis.loadOrder.filter((path) => path in additionalFiles);
    const loadResult = XmlSchemaDocumentService.loadSchemaFiles(
      collection,
      { loadOrder, edges: analysis.edges },
      mergedFiles,
    );
    if (loadResult.error) {
      throw new Error(loadResult.error.message);
    }

    XmlSchemaDocumentService.populateNamedTypeFragments(document);
    XmlSchemaDocumentService.rebuildAbstractWrapperChildren(document);
  }

  /**
   * Rebuilds the children of abstract wrapper fields after schema attachment.
   * Abstract wrapper candidates are open-ended — new candidates can appear in
   * separate schema files. This re-queries {@link XmlSchemaTypesService.getSubstitutionGroupMembers}
   * and updates `.fields` while reusing existing `IField` objects where possible
   * to preserve FieldItem references in the visualization layer.
   * Choice wrapper children are not rebuilt because their members are inline and static.
   */
  private static rebuildAbstractWrapperChildren(document: XmlSchemaDocument): void {
    for (const field of document.fields) {
      XmlSchemaDocumentService.rebuildAbstractWrapperField(field as XmlSchemaField, document.assembly);
    }
    for (const fragment of Object.values(document.namedTypeFragments)) {
      for (const field of fragment.fields) {
        XmlSchemaDocumentService.rebuildAbstractWrapperField(field as XmlSchemaField, document.assembly);
      }
    }
  }

  private static rebuildAbstractWrapperField(field: XmlSchemaField, assembly: XmlSchemaAssembly): void {
    if (field.wrapperKind === 'abstract') {
      const headQName = new QName(field.namespaceURI, field.name);
      const headElement = assembly.lookupElement(headQName);
      if (headElement) {
        const members = XmlSchemaTypesService.getSubstitutionGroupMembers(headElement, assembly);
        const existingByKey = new Map(field.fields.map((f) => [`${f.namespaceURI}|${f.name}`, f]));
        const newFields: XmlSchemaField[] = [];
        for (const member of members) {
          const memberName = member.getWireName()!.getLocalPart()!;
          const memberNs = member.getWireName()!.getNamespaceURI();
          const key = `${memberNs}|${memberName}`;
          const existing = existingByKey.get(key);
          if (existing) {
            newFields.push(existing as XmlSchemaField);
          } else {
            XmlSchemaDocumentService.populateElement(field, newFields, member);
          }
        }
        field.fields = newFields;
      }
    }
    for (const child of field.fields) {
      XmlSchemaDocumentService.rebuildAbstractWrapperField(child as XmlSchemaField, assembly);
    }
  }

  /**
   * Removes a schema file from the definition and re-creates the document with updated analysis.
   * The original definition is not mutated. The returned result always contains the updated
   * {@link DocumentDefinition} even when validation fails, so callers can continue working with it
   * (e.g. adding replacement files).
   *
   * @param definition - The current document definition containing schema files
   * @param filePath - The key of the schema file to remove from {@link DocumentDefinition.definitionFiles}
   * @param namespaceMap namespace prefix-URI map
   * @returns A {@link CreateXmlSchemaDocumentResult} with updated validation status, errors/warnings, and definition
   */
  static removeSchemaFile(
    definition: DocumentDefinition,
    filePath: string,
    namespaceMap: Record<string, string>,
  ): CreateXmlSchemaDocumentResult {
    const updatedFiles = { ...definition.definitionFiles };
    delete updatedFiles[filePath];

    // If the removed file was the entry schema, clear it so createXmlSchemaDocument re-infers it.
    const entrySchemaFile = definition.entrySchemaFile === filePath ? undefined : definition.entrySchemaFile;

    // If the rootElementChoice referenced the removed file as its entry schema, clear its entrySchemaFile
    // so createXmlSchemaDocument can resolve it in the remaining files and re-infer the new entry.
    const hadEntryInChoice = definition.rootElementChoice?.entrySchemaFile !== undefined;
    const rootElementChoice = definition.rootElementChoice ? { ...definition.rootElementChoice } : undefined;
    if (rootElementChoice?.entrySchemaFile === filePath) {
      rootElementChoice.entrySchemaFile = undefined;
    }

    const updatedDefinition = new DocumentDefinition(
      definition.documentType,
      definition.definitionType,
      definition.name,
      updatedFiles,
      rootElementChoice,
      definition.fieldTypeOverrides,
      definition.choiceSelections,
      definition.fieldSubstitutions,
      entrySchemaFile,
    );

    // Try to create the Document object. It could fail if the root element user chose was defined in the removed
    // schema file. In that case, we unset `updatedDefinition.rootElementChoice` and retry.
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(updatedDefinition, namespaceMap);

    if (result.document) {
      if (
        hadEntryInChoice &&
        result.documentDefinition?.rootElementChoice &&
        result.documentDefinition?.entrySchemaFile
      ) {
        result.documentDefinition.rootElementChoice = {
          ...result.documentDefinition.rootElementChoice,
          entrySchemaFile: result.documentDefinition.entrySchemaFile,
        };
      }
      // When no explicit rootElementChoice, check if the effective root changed; if so, stale paths must be cleared.
      if (
        !definition.rootElementChoice &&
        XmlSchemaDocumentService.hasRootElementChanged(result.document, definition, namespaceMap)
      ) {
        updatedDefinition.fieldTypeOverrides = [];
        updatedDefinition.choiceSelections = [];
        updatedDefinition.fieldSubstitutions = [];
        return XmlSchemaDocumentService.createXmlSchemaDocument(updatedDefinition, namespaceMap);
      }
      return result;
    }

    if (!definition.rootElementChoice) {
      return result;
    }

    // Unset the root element and retry
    updatedDefinition.rootElementChoice = undefined;
    updatedDefinition.fieldTypeOverrides = [];
    updatedDefinition.choiceSelections = [];
    updatedDefinition.fieldSubstitutions = [];
    return XmlSchemaDocumentService.createXmlSchemaDocument(updatedDefinition, namespaceMap);
  }

  /**
   * Returns true when the effective root element of `document` differs from the root implied by the
   * first schema path stored in `definition`'s path-based metadata. Used by {@link removeSchemaFile}
   * to detect a silent root change when no explicit rootElementChoice is set.
   */
  private static hasRootElementChanged(
    document: XmlSchemaDocument,
    definition: DocumentDefinition,
    namespaceMap: Record<string, string>,
  ): boolean {
    const newRootQName = document.rootElement?.getQName();
    const rootSubstitutionPath = (definition.fieldSubstitutions ?? [])
      .map((s) => s.schemaPath)
      .find((path) => path.split('/').filter(Boolean).length === 1);
    const firstPath =
      rootSubstitutionPath ??
      (definition.fieldTypeOverrides ?? [])
        .map((o) => o.schemaPath)
        .concat((definition.choiceSelections ?? []).map((o) => o.schemaPath))
        .concat((definition.fieldSubstitutions ?? []).map((o) => o.schemaPath))[0];
    if (!newRootQName || !firstPath) return false;
    // Schema paths are formatted as "/<prefix>:<localPart>/..." (prefix may be absent for no-namespace schemas).
    // Extract the first non-empty segment, split on ':', resolve the prefix to a namespace URI via namespaceMap,
    // and compare namespace URI + localPart against the new document's root element QName.
    const rootSegment = firstPath.split('/').find((s) => s.length > 0) ?? '';
    const { prefix, localPart } = parseQNameString(rootSegment);
    if (prefix && !(prefix in namespaceMap)) {
      return true;
    }
    const nsURI = prefix ? namespaceMap[prefix] : '';
    return nsURI !== (newRootQName.getNamespaceURI() ?? '') || localPart !== newRootQName.getLocalPart();
  }

  /**
   * Recreates an {@link XmlSchemaDocument} with a new root element, reusing the existing {@link XmlSchemaCollection}.
   * @param document - The existing document whose schema collection will be reused
   * @param rootElementOption - Specifies the namespace URI and local name of the new root element
   * @returns A new {@link XmlSchemaDocument} with the updated root element and fully populated fields
   * @throws Error if the specified root element is not found in the schema collection
   */
  static updateRootElement(document: XmlSchemaDocument, rootElementOption: RootElementOption): XmlSchemaDocument {
    const entrySchemaFile = rootElementOption.entrySchemaFile ?? document.definition.entrySchemaFile;
    const newRootQName = new QName(rootElementOption.namespaceUri, rootElementOption.name);
    const newRootElement = new XmlSchemaAssembly(document.xmlSchemaCollection, entrySchemaFile).lookupElement(
      newRootQName,
    );

    if (!newRootElement) {
      throw new Error(`Unable to find a root element ${newRootQName.toString()}`);
    }

    const definition: DocumentDefinition = {
      ...document.definition,
      rootElementChoice: rootElementOption,
      entrySchemaFile,
      fieldTypeOverrides: [],
      choiceSelections: [],
      fieldSubstitutions: [],
    };

    const newDocument = new XmlSchemaDocument(definition, document.xmlSchemaCollection, newRootElement);

    XmlSchemaDocumentService.populateNamedTypeFragments(newDocument);
    XmlSchemaDocumentService.populateElement(newDocument, newDocument.fields, newDocument.rootElement!);

    return newDocument;
  }

  private static populateSimpleNamedTypeFragment(
    document: XmlSchemaDocument,
    typeQName: QName,
    schemaType: XmlSchemaSimpleType,
  ) {
    const scopedKey = XmlSchemaDocumentUtilService.buildTypeFragmentKeyOf(schemaType, typeQName);

    if (document.namedTypeFragments[scopedKey]) {
      return;
    }

    const fields: XmlSchemaField[] = [];
    const typeFragment: XmlSchemaTypeFragment = { fields, namedTypeFragmentRefs: [] };
    document.namedTypeFragments[scopedKey] = typeFragment;

    const simpleContent = schemaType.getContent();
    simpleContent && XmlSchemaDocumentService.populateSimpleTypeContent(document, typeFragment, simpleContent);
  }

  private static populateComplexNamedTypeFragment(
    document: XmlSchemaDocument,
    typeQName: QName,
    schemaType: XmlSchemaComplexType,
  ) {
    const scopedKey = XmlSchemaDocumentUtilService.buildTypeFragmentKeyOf(schemaType, typeQName);

    if (document.namedTypeFragments[scopedKey]) {
      return;
    }

    const fields: XmlSchemaField[] = [];
    const typeFragment: XmlSchemaTypeFragment = { type: Types.Container, fields, namedTypeFragmentRefs: [] };
    document.namedTypeFragments[scopedKey] = typeFragment;

    XmlSchemaDocumentService.populateContentModel(document, typeFragment, schemaType.getContentModel());
    const attributes = schemaType.getAttributes();
    for (const attr of attributes) {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(document, fields, attr);
    }
    XmlSchemaDocumentService.populateParticle(document, fields, schemaType.getParticle());
  }

  private static populateNamedTypeFragmentsForSchema(document: XmlSchemaDocument, schema: XmlSchema) {
    const schemaTypes = schema.getSchemaTypes();
    for (const [typeQName, schemaType] of schemaTypes.entries()) {
      if (schemaType instanceof XmlSchemaSimpleType) {
        XmlSchemaDocumentService.populateSimpleNamedTypeFragment(document, typeQName, schemaType);
      } else if (schemaType instanceof XmlSchemaComplexType) {
        XmlSchemaDocumentService.populateComplexNamedTypeFragment(document, typeQName, schemaType);
      }
    }
  }

  private static populateFragmentsForSchemas(document: XmlSchemaDocument, schemas: XmlSchema[]) {
    for (const schema of schemas) {
      XmlSchemaDocumentService.populateNamedTypeFragmentsForSchema(document, schema);
    }
    for (const schema of schemas) {
      XmlSchemaDocumentService.populateGlobalElementFragmentsForSchema(document, schema);
    }
  }

  /**
   * Populates all named type definitions (complexType and simpleType) from the schema into namedTypeFragments.
   * Type definitions are keyed by their scoped key (`${sourceURI}#${typeQName}`), and the fragments of global elements
   * with an anonymous complex type by their scoped element key (`${sourceURI}#__elem:...`), so same-QName components
   * of different files do not compete for a key and the population order decides nothing.
   *
   * @param document - The document whose schema collection will be traversed and whose namedTypeFragments will be populated.
   */
  static populateNamedTypeFragments(document: XmlSchemaDocument) {
    XmlSchemaDocumentService.populateFragmentsForSchemas(document, document.xmlSchemaCollection.getUserSchemas());
  }

  private static populateSimpleTypeContent(
    document: XmlSchemaDocument,
    typeFragment: XmlSchemaField | XmlSchemaTypeFragment,
    content: XmlSchemaSimpleTypeContent,
    visited: Set<string> = new Set(),
  ) {
    if (content instanceof XmlSchemaSimpleTypeRestriction) {
      const baseTypeQName = content.getBaseTypeName();
      XmlSchemaDocumentService.populateSimpleContentRestrictionBaseType(document, typeFragment, baseTypeQName, visited);
      // TODO collect&store restrictions to somewhere in the XmlSchemaField
    } else if (content instanceof XmlSchemaSimpleTypeList) {
      // TODO
    } else if (content instanceof XmlSchemaSimpleTypeUnion) {
      // TODO
    }
  }

  /**
   * Populates an XML element as an {@link XmlSchemaField} into the given fields array.
   * Skips concrete elements that already exist in fields (by name, namespace, and isAttribute). Resolves element
   * references entry first through the document's {@link XmlSchemaAssembly}, not through the target the parsed
   * reference caches, and delegates to schema type handling to populate child fields and type metadata.
   *
   * Per the XSD spec, `abstract` is only valid on global element declarations — element
   * references (`<xs:element ref="..."/>`) cannot carry it. Therefore abstract detection
   * always checks `resolvedElement` (the ref target or the element itself), not the particle.
   * When abstract, delegates to {@link populateAbstractElement} which creates a wrapper
   * field with concrete substitution candidates as children.
   *
   * @param parent - The parent document or field that owns the fields array
   * @param fields - The target array to append the new field to
   * @param element - The XML schema element to convert into a field
   */
  static populateElement(parent: XmlSchemaParentType, fields: XmlSchemaField[], element: XmlSchemaElement) {
    const name = element.getWireName()!.getLocalPart()!;
    const ownerDoc = DocumentUtilService.getOwnerDocument<XmlSchemaDocument>(parent);
    const refTarget = ownerDoc.assembly.lookupElement(element.getRef().getTargetQName());
    const resolvedElement = refTarget ?? element;
    const namespaceURI = resolvedElement.getWireName()!.getNamespaceURI();

    if (resolvedElement.isAbstract()) {
      XmlSchemaDocumentService.populateAbstractElement(parent, fields, element, resolvedElement);
      return;
    }

    if (fields.some((f) => f.name === name && !f.isAttribute && f.namespaceURI === namespaceURI)) {
      return;
    }

    const field: XmlSchemaField = new XmlSchemaField(parent, name, false);
    field.namespaceURI = namespaceURI;
    field.namespacePrefix = resolvedElement.getWireName()!.getPrefix();
    field.defaultValue = resolvedElement.defaultValue ?? resolvedElement.fixedValue;
    field.nillable = resolvedElement.isNillable();
    field.minOccurs = element.getMinOccurs();
    field.maxOccurs = element.getMaxOccurs();
    field.minOccursExplicit = element.isMinOccursExplicit();
    field.maxOccursExplicit = element.isMaxOccursExplicit();
    field.description = XmlSchemaDocumentService.extractDocumentationFromAnnotated(resolvedElement);
    fields.push(field);

    ownerDoc.totalFieldCount++;

    const schemaType = ownerDoc.assembly.resolveElementSchemaType(resolvedElement);
    if (refTarget !== null && schemaType instanceof XmlSchemaComplexType && !schemaType.getQName()) {
      XmlSchemaDocumentService.populateGlobalElementFragment(ownerDoc, resolvedElement, schemaType, field);
    } else {
      XmlSchemaDocumentService.populateSchemaType(ownerDoc, field, schemaType);
    }

    if (field.nillable) {
      XmlSchemaDocumentService.populateNillableAttribute(field);
    }
  }

  private static ensureGlobalElementFragment(
    document: XmlSchemaDocument,
    element: XmlSchemaElement,
    schemaType: XmlSchemaComplexType,
  ): string {
    const fragmentKey = XmlSchemaDocumentUtilService.buildElementFragmentKeyOf(element);

    if (!document.namedTypeFragments[fragmentKey]) {
      const fragmentFields: XmlSchemaField[] = [];
      const fragment: XmlSchemaTypeFragment = { fields: fragmentFields, namedTypeFragmentRefs: [] };
      document.namedTypeFragments[fragmentKey] = fragment;

      XmlSchemaDocumentService.populateContentModel(document, fragment, schemaType.getContentModel());
      const attributes = schemaType.getAttributes();
      for (const attr of attributes) {
        XmlSchemaDocumentService.populateAttributeOrGroupRef(document, fragmentFields, attr);
      }
      XmlSchemaDocumentService.populateParticle(document, fragmentFields, schemaType.getParticle());
    }

    return fragmentKey;
  }

  private static populateGlobalElementFragment(
    document: XmlSchemaDocument,
    element: XmlSchemaElement,
    schemaType: XmlSchemaComplexType,
    field: XmlSchemaField,
  ) {
    const fragmentKey = XmlSchemaDocumentService.ensureGlobalElementFragment(document, element, schemaType);
    field.type = Types.Container;
    field.namedTypeFragmentRefs.push(fragmentKey);
  }

  private static populateGlobalElementFragmentsForSchema(document: XmlSchemaDocument, schema: XmlSchema) {
    for (const element of schema.getElements().values()) {
      const schemaType = element.getSchemaType();
      if (schemaType instanceof XmlSchemaComplexType && !schemaType.getQName()) {
        const wireName = element.getWireName();
        if (wireName?.getLocalPart()) {
          XmlSchemaDocumentService.ensureGlobalElementFragment(document, element, schemaType);
        }
      }
    }
  }

  private static populateSchemaType(
    ownerDocument: XmlSchemaDocument,
    field: XmlSchemaField,
    schemaType: XmlSchemaType | null,
  ) {
    if (!schemaType) return;
    if (schemaType instanceof XmlSchemaSimpleType) {
      const newType = XmlSchemaTypesService.resolveSimpleTypeToEnum(schemaType, ownerDocument.assembly);
      if (!field.type || field.type === Types.AnyType) {
        field.type = newType;
      }
      const simpleTypeQName = schemaType.getQName();
      if (simpleTypeQName) {
        field.typeQName = simpleTypeQName;
      }
      return;
    } else if (!(schemaType instanceof XmlSchemaComplexType)) {
      throw new TypeError(`Unknown schema type class: ${typeof schemaType}`);
    }

    field.type = Types.Container;
    if (schemaType.isAbstract()) {
      field.isAbstractType = true;
    }
    const typeQName = schemaType.getQName();
    if (typeQName) {
      field.typeQName = typeQName;
      const namespace = typeQName.getNamespaceURI();
      if (!XmlSchemaDocumentUtilService.isStandardXmlNamespace(namespace)) {
        const fragmentKey = XmlSchemaDocumentUtilService.buildTypeFragmentKeyOf(schemaType, typeQName);
        if (!field.namedTypeFragmentRefs.includes(fragmentKey)) {
          field.namedTypeFragmentRefs.push(fragmentKey);
        }
      }
      return;
    }

    XmlSchemaDocumentService.populateContentModel(ownerDocument, field, schemaType.getContentModel());
    const attributes: XmlSchemaAttributeOrGroupRef[] = schemaType.getAttributes();
    attributes.forEach((attr) => {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(field, field.fields, attr);
    });
    XmlSchemaDocumentService.populateParticle(field, field.fields, schemaType.getParticle());
  }

  private static populateAttributeOrGroupRef(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    attr: XmlSchemaAttributeOrGroupRef,
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    if (attr instanceof XmlSchemaAttribute) {
      XmlSchemaDocumentService.populateAttribute(parent, fields, attr, excludedAttributes);
    } else if (attr instanceof XmlSchemaAttributeGroupRef) {
      XmlSchemaDocumentService.populateAttributeGroupRef(parent, fields, attr, new Set(), excludedAttributes);
    }
  }

  /**
   * Extract documentation text from an XML Schema annotated object (element or attribute).
   * @param annotated - The annotated schema object (element, attribute, etc.)
   * @returns Documentation text, or undefined if no documentation found
   */
  private static extractDocumentationFromAnnotated(annotated: XmlSchemaAnnotated): string | undefined {
    const annotation = annotated.getAnnotation();
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
   * Adds a synthetic xsi:nil attribute child to a nillable XML element field.
   * This allows the Document tree to represent the nil state distinctly from an empty element.
   */
  private static populateNillableAttribute(parent: XmlSchemaField) {
    const alreadyExists = parent.fields.some(
      (field) => field.isAttribute && field.name === 'nil' && field.namespaceURI === NS_XML_SCHEMA_INSTANCE,
    );
    if (alreadyExists) {
      return;
    }

    const nillableField = new XmlSchemaField(parent, 'nil', true);
    nillableField.displayName = 'xsi:nil';
    nillableField.namespacePrefix = 'xsi';
    nillableField.namespaceURI = NS_XML_SCHEMA_INSTANCE;
    nillableField.type = Types.Boolean;
    nillableField.minOccurs = 0;
    nillableField.maxOccurs = 1;
    nillableField.minOccursExplicit = true;
    nillableField.maxOccursExplicit = true;
    parent.fields.push(nillableField);
    parent.ownerDocument.totalFieldCount++;
  }

  /**
   * Populates an XML attribute as an {@link XmlSchemaField} into the given fields array.
   * Skips attributes that already exist in fields (by name, namespace, and isAttribute). Handles required and
   * optional use cases by setting minOccurs and maxOccurs accordingly. A `use="prohibited"` attribute is not a
   * field, and neither is an attribute whose key is in `excludedAttributes`: a derived restriction prohibits it,
   * so the restricted type does not inherit it.
   *
   * An attribute reference (`<xs:attribute ref="..."/>`) resolves the global attribute entry first through the
   * document's {@link XmlSchemaAssembly}. Name, namespace, prefix and `use` come from the reference; the named type
   * comes from the global attribute (an inline simple type gives `AnyType`, as on any attribute); a default or fixed
   * value and documentation come from the reference when it declares them, otherwise from the global attribute. A
   * reference whose global attribute is not loaded keeps the reference's own properties.
   * @param parent - The parent document or field that owns the fields array
   * @param fields - The target array to append the new field to
   * @param attr - The XML schema attribute to convert into a field
   * @param excludedAttributes - Keys of the attributes a derived restriction prohibits
   */
  static populateAttribute(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    attr: XmlSchemaAttribute,
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    const name = attr.getWireName()!.getLocalPart()!;
    const namespaceURI = attr.getWireName()!.getNamespaceURI();
    const ownerDoc = DocumentUtilService.getOwnerDocument<XmlSchemaDocument>(parent);

    if (fields.some((f) => f.name === name && f.isAttribute && f.namespaceURI === namespaceURI)) {
      return;
    }
    if (attr.getUse() === XmlSchemaUse.PROHIBITED) {
      return;
    }
    if (excludedAttributes.has(XmlSchemaDocumentService.getAttributeKey(attr))) {
      return;
    }

    const field = new XmlSchemaField(parent, name, true);
    field.namespaceURI = namespaceURI;
    field.namespacePrefix = attr.getWireName()!.getPrefix();
    const globalAttr = attr.isRef() ? ownerDoc.assembly.lookupAttribute(attr.getTargetQName()) : null;
    field.defaultValue =
      attr.getDefaultValue() ??
      attr.getFixedValue() ??
      globalAttr?.getDefaultValue() ??
      globalAttr?.getFixedValue() ??
      null;
    const attrSchemaTypeQName = (globalAttr ?? attr).getSchemaTypeName();
    const attrSchemaType = attrSchemaTypeQName && ownerDoc.assembly.lookupType(attrSchemaTypeQName);
    field.type =
      attrSchemaType instanceof XmlSchemaSimpleType
        ? XmlSchemaTypesService.resolveSimpleTypeToEnum(attrSchemaType, ownerDoc.assembly)
        : XmlSchemaDocumentUtilService.getFieldTypeFromName(
            attrSchemaTypeQName?.getLocalPart() || null,
            attrSchemaTypeQName?.getNamespaceURI() || null,
          );
    field.description =
      XmlSchemaDocumentService.extractDocumentationFromAnnotated(attr) ??
      (globalAttr ? XmlSchemaDocumentService.extractDocumentationFromAnnotated(globalAttr) : undefined);
    fields.push(field);

    ownerDoc.totalFieldCount++;

    if (attrSchemaTypeQName) {
      field.typeQName = attrSchemaTypeQName;
    }
    if (attrSchemaType && attrSchemaTypeQName) {
      const fragmentKey = XmlSchemaDocumentUtilService.buildTypeFragmentKeyOf(attrSchemaType, attrSchemaTypeQName);
      if (!field.namedTypeFragmentRefs.includes(fragmentKey)) {
        field.namedTypeFragmentRefs.push(fragmentKey);
      }
    }

    field.minOccurs = attr.getUse() === XmlSchemaUse.REQUIRED ? 1 : 0;
    field.maxOccurs = 1;
    field.minOccursExplicit = true;
    field.maxOccursExplicit = true;
  }

  private static populateAttributeGroupRef(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    groupRef: XmlSchemaAttributeGroupRef,
    visitedGroups: Set<XmlSchemaAttributeGroup> = new Set(),
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    const ownerDoc = DocumentUtilService.getOwnerDocument<XmlSchemaDocument>(parent);
    const group = ownerDoc.assembly.lookupAttributeGroup(groupRef.getRef().getTargetQName());
    XmlSchemaDocumentService.populateAttributeGroup(parent, fields, group, visitedGroups, excludedAttributes);
  }

  private static populateAttributeGroupMember(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    member: XmlSchemaAttributeGroupMember,
    visitedGroups: Set<XmlSchemaAttributeGroup> = new Set(),
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    if (member instanceof XmlSchemaAttribute) {
      XmlSchemaDocumentService.populateAttribute(parent, fields, member, excludedAttributes);
    } else if (member instanceof XmlSchemaAttributeGroup) {
      XmlSchemaDocumentService.populateAttributeGroup(parent, fields, member, visitedGroups, excludedAttributes);
    } else if (member instanceof XmlSchemaAttributeGroupRef) {
      XmlSchemaDocumentService.populateAttributeGroupRef(parent, fields, member, visitedGroups, excludedAttributes);
    }
  }

  private static populateAttributeGroup(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    group: XmlSchemaAttributeGroup | null,
    visitedGroups: Set<XmlSchemaAttributeGroup> = new Set(),
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    if (group == null || visitedGroups.has(group)) {
      return;
    }
    visitedGroups.add(group);
    for (const member of group.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeGroupMember(parent, fields, member, visitedGroups, excludedAttributes);
    }
  }

  private static getAttributeKey(attr: XmlSchemaAttribute): string {
    return attr.getWireName()?.toString() ?? '';
  }

  private static collectProhibitedAttributeKeys(
    assembly: XmlSchemaAssembly,
    attributes: XmlSchemaAttributeGroupMember[],
    prohibited: Set<string> = new Set(),
    visitedGroups: Set<XmlSchemaAttributeGroup> = new Set(),
  ): Set<string> {
    for (const member of attributes) {
      if (member instanceof XmlSchemaAttribute) {
        if (member.getUse() === XmlSchemaUse.PROHIBITED) {
          prohibited.add(XmlSchemaDocumentService.getAttributeKey(member));
        }
        continue;
      }
      const group =
        member instanceof XmlSchemaAttributeGroupRef
          ? assembly.lookupAttributeGroup(member.getRef().getTargetQName())
          : member;
      if (group instanceof XmlSchemaAttributeGroup && !visitedGroups.has(group)) {
        visitedGroups.add(group);
        XmlSchemaDocumentService.collectProhibitedAttributeKeys(
          assembly,
          group.getAttributes(),
          prohibited,
          visitedGroups,
        );
      }
    }
    return prohibited;
  }

  private static mergeExcludedAttributes(
    assembly: XmlSchemaAssembly,
    excludedAttributes: ReadonlySet<string>,
    attributes: XmlSchemaAttributeGroupMember[],
  ): ReadonlySet<string> {
    const prohibited = XmlSchemaDocumentService.collectProhibitedAttributeKeys(assembly, attributes);
    if (prohibited.size === 0) {
      return excludedAttributes;
    }
    return new Set([...excludedAttributes, ...prohibited]);
  }

  private static isExcludedParticle(particle: XmlSchemaParticle): boolean {
    return particle.getMaxOccurs() === 0;
  }

  private static populateParticle(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    particle: XmlSchemaParticle | null,
    visitedGroupRefs?: Set<string>,
  ) {
    if (particle == null || XmlSchemaDocumentService.isExcludedParticle(particle)) {
      return;
    }
    if (particle instanceof XmlSchemaAny) {
      XmlSchemaDocumentService.populateAny(fields, particle);
    } else if (particle instanceof XmlSchemaElement) {
      XmlSchemaDocumentService.populateElement(parent, fields, particle);
    } else if (particle instanceof XmlSchemaGroupParticle) {
      XmlSchemaDocumentService.populateGroupParticle(parent, fields, particle, visitedGroupRefs);
    } else if (particle instanceof XmlSchemaGroupRef) {
      XmlSchemaDocumentService.populateGroupRef(parent, fields, particle, visitedGroupRefs);
    }
  }

  private static populateAny(_fields: XmlSchemaField[], _schemaAny: XmlSchemaAny) {
    /* TODO - xs:any allows arbitrary elements */
  }

  private static populateGroupParticle(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    groupParticle: XmlSchemaGroupParticle | null,
    visitedGroupRefs?: Set<string>,
  ) {
    if (groupParticle == null) {
      return;
    }
    if (groupParticle instanceof XmlSchemaChoice) {
      XmlSchemaDocumentService.populateChoice(parent, fields, groupParticle, visitedGroupRefs);
    } else if (groupParticle instanceof XmlSchemaSequence) {
      for (const member of groupParticle.getItems()) {
        XmlSchemaDocumentService.populateSequenceMember(parent, fields, member, visitedGroupRefs);
      }
    } else if (groupParticle instanceof XmlSchemaAll) {
      for (const member of groupParticle.getItems()) {
        XmlSchemaDocumentService.populateAllMember(parent, fields, member, visitedGroupRefs);
      }
    }
  }

  /**
   * Creates a choice wrapper {@link XmlSchemaField} with {@link XmlSchemaField.wrapperKind} set to `'choice'`,
   * preserving minOccurs/maxOccurs from the xs:choice particle, and populates its children
   * from the choice's member items. The `{choice:N}` path index is derived at runtime by
   * {@link SchemaPathService.getChoiceSiblingIndex} from the field's position among sibling
   * `wrapperKind === 'choice'` fields — no explicit index is stored on the field.
   */
  private static populateChoice(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    choice: XmlSchemaChoice,
    visitedGroupRefs?: Set<string>,
  ) {
    const ownerDoc = DocumentUtilService.getOwnerDocument<XmlSchemaDocument>(parent);
    const choiceField = new XmlSchemaField(parent, '__choice__', false);
    choiceField.wrapperKind = 'choice';
    choiceField.minOccurs = choice.getMinOccurs();
    choiceField.maxOccurs = choice.getMaxOccurs();
    choiceField.minOccursExplicit = choice.isMinOccursExplicit();
    choiceField.maxOccursExplicit = choice.isMaxOccursExplicit();
    fields.push(choiceField);
    ownerDoc.totalFieldCount++;
    for (const member of choice.getItems()) {
      if (member instanceof XmlSchemaSequence) {
        XmlSchemaDocumentService.populateSequenceInChoice(choiceField, choiceField.fields, member, visitedGroupRefs);
      } else {
        XmlSchemaDocumentService.populateSequenceMember(choiceField, choiceField.fields, member, visitedGroupRefs);
      }
    }
    choiceField.displayName = 'choice';
  }

  private static populateSequenceInChoice(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    sequence: XmlSchemaSequence,
    visitedGroupRefs?: Set<string>,
  ) {
    if (XmlSchemaDocumentService.isExcludedParticle(sequence)) return;
    const ownerDoc = DocumentUtilService.getOwnerDocument<XmlSchemaDocument>(parent);
    const seqField = new XmlSchemaField(parent, '__sequence__', false);
    seqField.wrapperKind = 'sequence';
    seqField.minOccurs = sequence.getMinOccurs();
    seqField.maxOccurs = sequence.getMaxOccurs();
    seqField.minOccursExplicit = sequence.isMinOccursExplicit();
    seqField.maxOccursExplicit = sequence.isMaxOccursExplicit();
    seqField.displayName = 'sequence';
    fields.push(seqField);
    ownerDoc.totalFieldCount++;
    for (const item of sequence.getItems()) {
      XmlSchemaDocumentService.populateSequenceMember(seqField, seqField.fields, item, visitedGroupRefs);
    }
  }

  /**
   * Creates an abstract element wrapper {@link XmlSchemaField} with {@link XmlSchemaField.wrapperKind}
   * set to `'abstract'`, and populates its children from the concrete substitution group members.
   *
   * Abstract wrappers use the actual element name when it is unique among siblings and add a stable
   * sibling-position suffix when it is not. The resolved element name remains the display name.
   * The `{abstract:N}` path index is derived at runtime by
   * {@link SchemaPathService.getAbstractSiblingIndex}, analogous to `{choice:N}`.
   *
   * @param parent - The parent document or field that owns the fields array
   * @param fields - The target array to append the new field to
   * @param element - The element particle providing minOccurs/maxOccurs (cardinality from context)
   * @param resolvedElement - The resolved (possibly ref-target) abstract element providing name and namespace
   */
  private static populateAbstractElement(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    element: XmlSchemaElement,
    resolvedElement: XmlSchemaElement,
  ) {
    const ownerDoc = DocumentUtilService.getOwnerDocument<XmlSchemaDocument>(parent);
    const displayName = resolvedElement.getWireName()!.getLocalPart()!;
    const namespaceURI = resolvedElement.getWireName()!.getNamespaceURI();
    let name = displayName;
    let siblingIndex = fields.length;
    while (fields.some((field) => field.name === name && !field.isAttribute && field.namespaceURI === namespaceURI)) {
      name = `${displayName}-${siblingIndex}`;
      siblingIndex++;
    }
    const abstractField = new XmlSchemaField(parent, name, false);
    abstractField.wrapperKind = 'abstract';
    abstractField.namespaceURI = namespaceURI;
    abstractField.namespacePrefix = resolvedElement.getWireName()!.getPrefix();
    abstractField.minOccurs = element.getMinOccurs();
    abstractField.maxOccurs = element.getMaxOccurs();
    abstractField.minOccursExplicit = element.isMinOccursExplicit();
    abstractField.maxOccursExplicit = element.isMaxOccursExplicit();
    abstractField.displayName = displayName;
    fields.push(abstractField);
    ownerDoc.totalFieldCount++;

    const members = XmlSchemaTypesService.getSubstitutionGroupMembers(resolvedElement, ownerDoc.assembly);
    for (const member of members) {
      XmlSchemaDocumentService.populateElement(abstractField, abstractField.fields, member);
    }
  }

  private static populateGroupRef(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    groupRef: XmlSchemaGroupRef,
    visitedGroupRefs?: Set<string>,
  ) {
    const groupRefQName = groupRef.getRefName();
    if (!groupRefQName || XmlSchemaDocumentService.isExcludedParticle(groupRef)) return;

    const key = groupRefQName.toString();
    visitedGroupRefs ??= new Set();
    if (visitedGroupRefs.has(key)) return;
    visitedGroupRefs.add(key);

    const doc = DocumentUtilService.getOwnerDocument<XmlSchemaDocument>(parent);
    const group = doc.assembly.lookupGroup(groupRefQName);
    if (group) {
      XmlSchemaDocumentService.populateGroup(parent, fields, group, visitedGroupRefs);
    }

    visitedGroupRefs.delete(key);
  }

  private static populateSequenceMember(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    member: XmlSchemaSequenceMember,
    visitedGroupRefs?: Set<string>,
  ) {
    if (member instanceof XmlSchemaGroupRef) {
      XmlSchemaDocumentService.populateGroupRef(parent, fields, member, visitedGroupRefs);
    } else if (member instanceof XmlSchemaGroup) {
      XmlSchemaDocumentService.populateGroup(parent, fields, member, visitedGroupRefs);
    } else if (member instanceof XmlSchemaParticle) {
      XmlSchemaDocumentService.populateParticle(parent, fields, member, visitedGroupRefs);
    }
  }

  private static populateAllMember(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    member: XmlSchemaAllMember,
    visitedGroupRefs?: Set<string>,
  ) {
    if (member instanceof XmlSchemaParticle) {
      XmlSchemaDocumentService.populateParticle(parent, fields, member, visitedGroupRefs);
    }
  }

  private static populateGroup(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    group: XmlSchemaGroup,
    visitedGroupRefs?: Set<string>,
  ) {
    XmlSchemaDocumentService.populateParticle(parent, fields, group.getParticle(), visitedGroupRefs);
  }

  private static populateContentModel(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    contentModel: XmlSchemaContentModel | null,
    visited: Set<string> = new Set(),
  ) {
    if (!contentModel) return;
    const content = contentModel.getContent();
    if (content instanceof XmlSchemaSimpleContentExtension) {
      XmlSchemaDocumentService.populateSimpleContentExtension(document, parent, content, visited);
    } else if (content instanceof XmlSchemaSimpleContentRestriction) {
      XmlSchemaDocumentService.populateSimpleContentRestriction(document, parent, content, visited);
    } else if (content instanceof XmlSchemaComplexContentExtension) {
      XmlSchemaDocumentService.populateComplexContentExtension(document, parent, content, visited);
    } else if (content instanceof XmlSchemaComplexContentRestriction) {
      XmlSchemaDocumentService.populateComplexContentRestriction(document, parent, content, visited);
    }
  }

  private static populateContentModelAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    contentModel: XmlSchemaContentModel | null,
    visited: Set<string> = new Set(),
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    if (!contentModel) return;
    const content = contentModel.getContent();
    if (content instanceof XmlSchemaSimpleContentExtension) {
      XmlSchemaDocumentService.populateSimpleContentExtension(document, parent, content, visited, excludedAttributes);
    } else if (content instanceof XmlSchemaSimpleContentRestriction) {
      XmlSchemaDocumentService.populateSimpleContentRestriction(document, parent, content, visited, excludedAttributes);
    } else if (content instanceof XmlSchemaComplexContentExtension) {
      XmlSchemaDocumentService.populateComplexContentExtensionAttributes(
        document,
        parent,
        content,
        visited,
        excludedAttributes,
      );
    } else if (content instanceof XmlSchemaComplexContentRestriction) {
      XmlSchemaDocumentService.populateComplexContentRestrictionAttributes(
        document,
        parent,
        content,
        visited,
        excludedAttributes,
      );
    }
  }

  private static populateContentModelElements(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    contentModel: XmlSchemaContentModel | null,
    visited: Set<string> = new Set(),
  ) {
    if (!contentModel) return;
    const content = contentModel.getContent();
    // SimpleContent doesn't have elements, only ComplexContent does
    if (content instanceof XmlSchemaComplexContentExtension) {
      XmlSchemaDocumentService.populateComplexContentExtensionElements(document, parent, content, visited);
    } else if (content instanceof XmlSchemaComplexContentRestriction) {
      const parentForParticle = 'parent' in parent ? parent : document;
      XmlSchemaDocumentService.populateParticle(parentForParticle, parent.fields, content.getParticle());
    }
  }

  private static resolveBaseType(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    baseTypeQName: QName | null,
  ): XmlSchemaType | null {
    if (!baseTypeQName) return null;

    const baseType = document.assembly.lookupType(baseTypeQName);

    if (!parent.type) {
      parent.type =
        baseType instanceof XmlSchemaSimpleType
          ? XmlSchemaTypesService.resolveSimpleTypeToEnum(baseType, document.assembly)
          : XmlSchemaDocumentUtilService.getFieldTypeFromName(
              baseTypeQName.getLocalPart(),
              baseTypeQName.getNamespaceURI(),
            );
    }

    return baseType;
  }

  private static populateSimpleExtensionBaseAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    userDefinedBaseType: XmlSchemaSimpleType,
    visited: Set<string> = new Set(),
  ) {
    const simpleBase = userDefinedBaseType;
    const simpleContent = simpleBase.getContent();
    if (simpleContent) {
      XmlSchemaDocumentService.populateSimpleTypeContent(document, parent, simpleContent, visited);
    }
    if (!parent.type) {
      parent.type = XmlSchemaTypesService.resolveSimpleTypeToEnum(simpleBase, document.assembly);
    }
  }

  private static populateComplexExtensionBaseAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    userDefinedBaseType: XmlSchemaComplexType,
    visited: Set<string> = new Set(),
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    const complexBase = userDefinedBaseType;
    const contentModel = complexBase.getContentModel();

    if (contentModel) {
      XmlSchemaDocumentService.populateContentModelAttributes(
        document,
        parent,
        contentModel,
        visited,
        excludedAttributes,
      );
    } else {
      const parentForAttribute = 'parent' in parent ? parent : document;
      for (const attr of complexBase.getAttributes()) {
        XmlSchemaDocumentService.populateAttributeOrGroupRef(
          parentForAttribute,
          parent.fields,
          attr,
          excludedAttributes,
        );
      }
    }
  }

  private static populateExtensionBaseAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    baseTypeQName: QName | null,
    visited: Set<string> = new Set(),
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    if (!baseTypeQName) return;
    const key = `simpleattr#${baseTypeQName.toString()}`;
    if (visited.has(key)) return;
    visited.add(key);

    const userDefinedBaseType = XmlSchemaDocumentService.resolveBaseType(document, parent, baseTypeQName);
    if (!userDefinedBaseType) return;

    if (userDefinedBaseType instanceof XmlSchemaSimpleType) {
      XmlSchemaDocumentService.populateSimpleExtensionBaseAttributes(document, parent, userDefinedBaseType, visited);
    } else if (userDefinedBaseType instanceof XmlSchemaComplexType) {
      XmlSchemaDocumentService.populateComplexExtensionBaseAttributes(
        document,
        parent,
        userDefinedBaseType,
        visited,
        excludedAttributes,
      );
    }
  }

  private static populateExtensionBaseElements(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    baseTypeQName: QName | null,
    visited: Set<string> = new Set(),
  ) {
    if (!baseTypeQName) return;
    const key = `simpleelem#${baseTypeQName.toString()}`;
    if (visited.has(key)) return;
    visited.add(key);

    const userDefinedBaseType = XmlSchemaDocumentService.resolveBaseType(document, parent, baseTypeQName);
    if (!userDefinedBaseType) return;

    if (userDefinedBaseType instanceof XmlSchemaComplexType) {
      const complexBase = userDefinedBaseType;
      const contentModel = complexBase.getContentModel();

      if (contentModel) {
        XmlSchemaDocumentService.populateContentModelElements(document, parent, contentModel, visited);
      } else {
        const parentForParticle = 'parent' in parent ? parent : document;
        XmlSchemaDocumentService.populateParticle(parentForParticle, parent.fields, complexBase.getParticle());
      }
    }
  }

  private static populateSimpleContentRestrictionBaseType(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    baseTypeQName: QName | null,
    visited: Set<string> = new Set(),
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    if (!baseTypeQName) return;
    const key = `simplerestrict#${baseTypeQName.toString()}`;
    if (visited.has(key)) return;
    visited.add(key);

    const userDefinedBaseType = XmlSchemaDocumentService.resolveBaseType(document, parent, baseTypeQName);
    if (!userDefinedBaseType) return;

    if (userDefinedBaseType instanceof XmlSchemaComplexType) {
      const contentModel = userDefinedBaseType.getContentModel();

      if (contentModel) {
        const content = contentModel.getContent();
        if (
          content instanceof XmlSchemaSimpleContentExtension ||
          content instanceof XmlSchemaSimpleContentRestriction
        ) {
          XmlSchemaDocumentService.populateContentModelAttributes(
            document,
            parent,
            contentModel,
            visited,
            excludedAttributes,
          );
        }
      }
    } else if (userDefinedBaseType instanceof XmlSchemaSimpleType) {
      const simpleBase = userDefinedBaseType;
      const simpleContent = simpleBase.getContent();
      if (simpleContent) {
        XmlSchemaDocumentService.populateSimpleTypeContent(document, parent, simpleContent, visited);
      }
      if (!parent.type) {
        parent.type = XmlSchemaTypesService.resolveSimpleTypeToEnum(simpleBase, document.assembly);
      }
    }
  }

  /**
   * The simple {@code <xs:extension>} adds attributes in addition to what is defined in base. The base attributes
   * should come first.
   * @param document
   * @param parent
   * @param extension
   * @private
   */
  private static populateSimpleContentExtension(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    extension: XmlSchemaSimpleContentExtension,
    visited: Set<string> = new Set(),
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    XmlSchemaDocumentService.populateExtensionBaseAttributes(
      document,
      parent,
      extension.getBaseTypeName(),
      visited,
      excludedAttributes,
    );
    const parentForAttribute = 'parent' in parent ? parent : document;
    for (const attr of extension.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(parentForAttribute, parent.fields, attr, excludedAttributes);
    }
  }

  /**
   * The simple {@code <xs:restriction>} restricts the attributes defined in base.
   * @param document
   * @param parent
   * @param restriction
   * @private
   */
  private static populateSimpleContentRestriction(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    restriction: XmlSchemaSimpleContentRestriction,
    visited: Set<string> = new Set(),
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    const parentForAttribute = 'parent' in parent ? parent : document;
    for (const attr of restriction.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(parentForAttribute, parent.fields, attr, excludedAttributes);
    }
    XmlSchemaDocumentService.populateSimpleContentRestrictionBaseType(
      document,
      parent,
      restriction.getBaseTypeName(),
      visited,
      XmlSchemaDocumentService.mergeExcludedAttributes(
        document.assembly,
        excludedAttributes,
        restriction.getAttributes(),
      ),
    );
  }

  /**
   * The complex {@code <xs:extension>} adds elements and/or attributes. The base attributes and elements have
   * to come first. In order to show attributes before any elements in the DataMapper UI, attributes have to
   *  be added first, then elements. Therefore, the order is:
   *  <ol>
   *    <li>base attributes</li>
   *    <li>extension attributes</li>
   *    <li>base elements</li>
   *    <li>extension elements</li>
   *  </ol>
   * @param document
   * @param parent
   * @param extension
   * @private
   */
  private static populateComplexContentExtension(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    extension: XmlSchemaComplexContentExtension,
    visited: Set<string> = new Set(),
  ) {
    XmlSchemaDocumentService.populateComplexContentExtensionAttributes(document, parent, extension, visited);
    XmlSchemaDocumentService.populateComplexContentExtensionElements(document, parent, extension, visited);
  }

  private static populateComplexContentExtensionAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    extension: XmlSchemaComplexContentExtension,
    visited: Set<string> = new Set(),
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    const baseTypeQName = extension.getBaseTypeName();
    const isCyclic = baseTypeQName ? visited.has(`attr#${baseTypeQName.toString()}`) : false;

    if (!isCyclic) {
      if (baseTypeQName) visited.add(`attr#${baseTypeQName.toString()}`);
      const baseType = baseTypeQName ? document.assembly.lookupType(baseTypeQName) : null;
      const baseHasContentModel = baseType instanceof XmlSchemaComplexType && baseType.getContentModel();

      if (baseHasContentModel) {
        XmlSchemaDocumentService.populateContentModelAttributes(
          document,
          parent,
          baseHasContentModel,
          visited,
          excludedAttributes,
        );
      } else {
        XmlSchemaDocumentService.populateExtensionBaseAttributes(
          document,
          parent,
          baseTypeQName,
          visited,
          excludedAttributes,
        );
      }
    }

    // Always populate the extension's own attributes, even when the base chain is cyclic.
    const parentForAttribute = 'parent' in parent ? parent : document;
    for (const attr of extension.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(parentForAttribute, parent.fields, attr, excludedAttributes);
    }
  }

  private static populateComplexContentExtensionElements(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    extension: XmlSchemaComplexContentExtension,
    visited: Set<string> = new Set(),
  ) {
    // A cycle that leads back to an extension still being processed would emit its particle a second time.
    let inProgress = XmlSchemaDocumentService.extensionsInProgress.get(parent);
    if (!inProgress) {
      inProgress = new Set();
      XmlSchemaDocumentService.extensionsInProgress.set(parent, inProgress);
    }
    if (inProgress.has(extension)) return;
    inProgress.add(extension);
    try {
      const baseTypeQName = extension.getBaseTypeName();
      const isCyclic = baseTypeQName ? visited.has(`elem#${baseTypeQName.toString()}`) : false;

      if (!isCyclic && baseTypeQName) {
        visited.add(`elem#${baseTypeQName.toString()}`);
        const baseType = document.assembly.lookupType(baseTypeQName);
        const baseHasContentModel = baseType instanceof XmlSchemaComplexType && baseType.getContentModel();

        if (baseHasContentModel) {
          XmlSchemaDocumentService.populateContentModelElements(document, parent, baseHasContentModel, visited);
        } else {
          XmlSchemaDocumentService.populateExtensionBaseElements(document, parent, baseTypeQName, visited);
        }
      }

      // Always populate the extension's own particle (elements declared in THIS extension block).
      const parentForParticle = 'parent' in parent ? parent : document;
      XmlSchemaDocumentService.populateParticle(parentForParticle, parent.fields, extension.getParticle());
    } finally {
      inProgress.delete(extension);
    }
  }

  /**
   * The complex {@code <xs:restriction>} restricts the attributes and/or elements defined in base.
   * @param document
   * @param parent
   * @param restriction
   * @private
   */
  private static populateComplexContentRestriction(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    restriction: XmlSchemaComplexContentRestriction,
    visited: Set<string> = new Set(),
  ) {
    XmlSchemaDocumentService.populateComplexContentRestrictionAttributes(document, parent, restriction, visited);
    const parentForParticle = 'parent' in parent ? parent : document;
    XmlSchemaDocumentService.populateParticle(parentForParticle, parent.fields, restriction.getParticle());
  }

  private static populateComplexContentRestrictionAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    restriction: XmlSchemaComplexContentRestriction,
    visited: Set<string> = new Set(),
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    const baseTypeQName = restriction.getBaseTypeName();
    const visitedKey = baseTypeQName && `restrictattr#${baseTypeQName.toString()}`;
    const isCyclic = !!visitedKey && visited.has(visitedKey);
    if (visitedKey) visited.add(visitedKey);

    // Always populate the restriction's own attributes, even when the base chain is cyclic.
    const parentForAttribute = 'parent' in parent ? parent : document;
    for (const attr of restriction.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(parentForAttribute, parent.fields, attr, excludedAttributes);
    }

    if (isCyclic) return;
    const userDefinedBaseType = XmlSchemaDocumentService.resolveBaseType(document, parent, baseTypeQName);
    if (userDefinedBaseType instanceof XmlSchemaComplexType) {
      XmlSchemaDocumentService.populateComplexBaseAttributes(
        document,
        parent,
        userDefinedBaseType,
        visited,
        XmlSchemaDocumentService.mergeExcludedAttributes(
          document.assembly,
          excludedAttributes,
          restriction.getAttributes(),
        ),
      );
    }
  }

  private static populateComplexBaseAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    complexBase: XmlSchemaComplexType,
    visited: Set<string>,
    excludedAttributes: ReadonlySet<string> = XmlSchemaDocumentService.NO_EXCLUDED_ATTRIBUTES,
  ) {
    const contentModel = complexBase.getContentModel();
    if (contentModel) {
      XmlSchemaDocumentService.populateContentModelAttributes(
        document,
        parent,
        contentModel,
        visited,
        excludedAttributes,
      );
    } else {
      const parentForAttribute = 'parent' in parent ? parent : document;
      for (const attr of complexBase.getAttributes()) {
        XmlSchemaDocumentService.populateAttributeOrGroupRef(
          parentForAttribute,
          parent.fields,
          attr,
          excludedAttributes,
        );
      }
    }
  }
}
