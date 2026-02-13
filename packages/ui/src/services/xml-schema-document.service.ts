import { DocumentDefinition, RootElementOption } from '../models/datamapper/document';
import { Types } from '../models/datamapper/types';
import { capitalize } from '../serializers/xml/utils/xml-utils';
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
  XmlSchemaChoiceMember,
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
  XmlSchemaRef,
  XmlSchemaSequence,
  XmlSchemaSequenceMember,
  XmlSchemaSimpleContentExtension,
  XmlSchemaSimpleContentRestriction,
  XmlSchemaSimpleType,
  XmlSchemaType,
  XmlSchemaUse,
} from '../xml-schema-ts';
import { QName } from '../xml-schema-ts/QName';
import { XmlSchemaSimpleTypeContent } from '../xml-schema-ts/simple/XmlSchemaSimpleTypeContent';
import { XmlSchemaSimpleTypeList } from '../xml-schema-ts/simple/XmlSchemaSimpleTypeList';
import { XmlSchemaSimpleTypeRestriction } from '../xml-schema-ts/simple/XmlSchemaSimpleTypeRestriction';
import { XmlSchemaSimpleTypeUnion } from '../xml-schema-ts/simple/XmlSchemaSimpleTypeUnion';
import { DocumentUtilService } from './document-util.service';
import { XmlSchemaAnalysisService } from './xml-schema-analysis.service';
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
   * Creates an XML Schema Document from a DocumentDefinition.
   * @param definition The DocumentDefinition containing schema information and configuration
   * @returns {@link CreateXmlSchemaDocumentResult} with document, root element options, and validation status
   */
  static createXmlSchemaDocument(definition: DocumentDefinition): CreateXmlSchemaDocumentResult {
    const collection = new XmlSchemaCollection();
    const definitionFiles = definition.definitionFiles || {};
    collection.getSchemaResolver().addFiles(definitionFiles);

    const analysis = XmlSchemaAnalysisService.analyze(definitionFiles);
    if (analysis.errors.length > 0) {
      return {
        validationStatus: 'error',
        errors: analysis.errors,
        warnings: analysis.warnings,
        documentDefinition: definition,
      };
    }

    const includeTargets = new Set(analysis.edges.filter((e) => e.directive.type === 'include').map((e) => e.to));

    try {
      for (const path of analysis.loadOrder) {
        if (includeTargets.has(path)) continue;
        collection.read(definitionFiles[path], () => {}, path);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const baseUriMatch = REGEX_BASE_URI.exec(errorMessage);
      const filePath = baseUriMatch?.[1];
      return {
        validationStatus: 'error',
        errors: [{ message: errorMessage, filePath }],
        warnings: analysis.warnings,
        documentDefinition: definition,
      };
    }

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

    let rootElement: XmlSchemaElement;
    try {
      rootElement = XmlSchemaDocumentUtilService.determineRootElement(collection, definition.rootElementChoice);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        validationStatus: 'error',
        errors: [{ message: errorMessage }],
        documentDefinition: definition,
      };
    }

    const document = new XmlSchemaDocument(definition, collection, rootElement);

    XmlSchemaDocumentService.populateNamedTypeFragments(document);
    XmlSchemaDocumentService.populateElement(document, document.fields, document.rootElement!);

    if (definition.fieldTypeOverrides?.length) {
      DocumentUtilService.processTypeOverrides(
        document,
        definition.fieldTypeOverrides,
        definition.namespaceMap || {},
        XmlSchemaTypesService.parseTypeOverride,
      );
    }

    const rootElementOptions = XmlSchemaDocumentUtilService.collectRootElementOptions(collection);
    const validationWarnings = analysis.warnings;

    const validationStatus = validationWarnings.length > 0 ? 'warning' : 'success';

    return {
      validationStatus,
      warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
      documentDefinition: definition,
      document,
      rootElementOptions,
    } as CreateXmlSchemaDocumentResult;
  }

  /**
   * Adds additional schema files to an existing document's schema collection.
   * This is useful when field type overrides reference types defined in additional schema files.
   * @param document - The document whose schema collection will be updated
   * @param additionalFiles - Map of file paths to file contents to add
   * @returns Updated namespace map with new namespaces from added schemas
   */
  static addSchemaFiles(document: XmlSchemaDocument, additionalFiles: Record<string, string>): Record<string, string> {
    const collection = document.xmlSchemaCollection;
    const resolver = collection.getSchemaResolver();

    resolver.addFiles(additionalFiles);

    XmlSchemaDocumentUtilService.loadXmlSchemaFiles(collection, additionalFiles);
    XmlSchemaDocumentService.populateNamedTypeFragments(document);

    const existingNamespaceMap = document.definition.namespaceMap || {};
    const newNamespaces = XmlSchemaDocumentService.extractNamespacesFromSchemas(additionalFiles, existingNamespaceMap);

    return XmlSchemaDocumentService.mergeNamespaceMaps(existingNamespaceMap, newNamespaces);
  }

  /**
   * Removes a schema file from the definition and re-creates the document with updated analysis.
   * The original definition is not mutated. The returned result always contains the updated
   * {@link DocumentDefinition} even when validation fails, so callers can continue working with it
   * (e.g. adding replacement files).
   *
   * @param definition - The current document definition containing schema files
   * @param filePath - The key of the schema file to remove from {@link DocumentDefinition.definitionFiles}
   * @returns A {@link CreateXmlSchemaDocumentResult} with updated validation status, errors/warnings, and definition
   */
  static removeSchemaFile(definition: DocumentDefinition, filePath: string): CreateXmlSchemaDocumentResult {
    const updatedFiles = { ...definition.definitionFiles };
    delete updatedFiles[filePath];

    const updatedDefinition = new DocumentDefinition(
      definition.documentType,
      definition.definitionType,
      definition.name,
      updatedFiles,
      definition.rootElementChoice,
      definition.fieldTypeOverrides,
      definition.namespaceMap,
    );

    // Try to create the Document object. It could fail if the root element user chose was defined in the removed
    // schema file. In that case, we unset `updatedDefinition.rootElementChoice` and retry.
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(updatedDefinition);

    // If it succeeds or a root element was not set, return as it is
    if (result.document || !definition.rootElementChoice) {
      return result;
    }

    // Unset the root element and retry
    updatedDefinition.rootElementChoice = undefined;
    return XmlSchemaDocumentService.createXmlSchemaDocument(updatedDefinition);
  }

  /**
   * Extracts namespace mappings from XML schema files.
   * Parses each schema file to extract targetNamespace and generates appropriate prefixes.
   * Filters out standard XML/XSD namespaces.
   *
   * @param schemaFiles - Map of file paths to schema file contents
   * @param existingNamespaceMap - Existing namespace map to check for conflicts
   * @returns Map of generated prefix -> namespace URI
   */
  private static extractNamespacesFromSchemas(
    schemaFiles: Record<string, string>,
    existingNamespaceMap: Record<string, string>,
  ): Record<string, string> {
    const newNamespaces: Record<string, string> = {};
    const tempCollection = new XmlSchemaCollection();

    for (const [filePath, content] of Object.entries(schemaFiles)) {
      try {
        const schema = tempCollection.read(content, () => {}, filePath);
        const targetNamespace = schema.getTargetNamespace();

        if (!targetNamespace) {
          continue;
        }

        const standardNamespaces = new Set([
          'http://www.w3.org/2001/XMLSchema',
          'http://www.w3.org/XML/1998/namespace',
        ]);

        if (standardNamespaces.has(targetNamespace)) {
          continue;
        }

        const alreadyMapped =
          Object.values(existingNamespaceMap).includes(targetNamespace) ||
          Object.values(newNamespaces).includes(targetNamespace);

        if (alreadyMapped) {
          continue;
        }

        const combinedMap = { ...existingNamespaceMap, ...newNamespaces };
        const prefix = DocumentUtilService.generateNamespacePrefix(combinedMap);
        newNamespaces[prefix] = targetNamespace;
      } catch (error) {
        console.warn(`Failed to extract namespace from ${filePath}:`, error);
      }
    }

    return newNamespaces;
  }

  /**
   * Merges existing namespace map with newly extracted namespaces.
   * Existing mappings take precedence to avoid breaking existing references.
   *
   * @param existingMap - Current namespace map from DocumentDefinition
   * @param newNamespaces - Newly extracted namespace mappings
   * @returns Merged namespace map
   */
  private static mergeNamespaceMaps(
    existingMap: Record<string, string>,
    newNamespaces: Record<string, string>,
  ): Record<string, string> {
    return { ...existingMap, ...newNamespaces };
  }

  /**
   * Recreates {@link XmlSchemaDocument} object with a new root element. Other part including {@link XmlSchema} object
   * is reused from passed in {@link XmlSchemaDocument} object.
   * @param document
   * @param rootElementOption
   */
  static updateRootElement(document: XmlSchemaDocument, rootElementOption: RootElementOption): XmlSchemaDocument {
    const newRootQName = new QName(rootElementOption.namespaceUri, rootElementOption.name);
    const newRootElement = document.xmlSchemaCollection.getElementByQName(newRootQName);

    if (!newRootElement) {
      throw new Error(`Unable to find a root element ${newRootQName.toString()}`);
    }

    const newDocument = new XmlSchemaDocument(document.definition, document.xmlSchemaCollection, newRootElement);

    XmlSchemaDocumentService.populateNamedTypeFragments(newDocument);
    XmlSchemaDocumentService.populateElement(newDocument, newDocument.fields, newDocument.rootElement!);

    return newDocument;
  }

  private static populateSimpleNamedTypeFragment(
    document: XmlSchemaDocument,
    typeQName: QName,
    schemaType: XmlSchemaSimpleType,
  ) {
    const typeFragmentName = typeQName.toString();

    if (document.namedTypeFragments[typeFragmentName]) {
      return;
    }

    const fields: XmlSchemaField[] = [];
    const typeFragment: XmlSchemaTypeFragment = { fields, namedTypeFragmentRefs: [] };
    document.namedTypeFragments[typeFragmentName] = typeFragment;

    const simpleContent = schemaType.getContent();
    simpleContent && XmlSchemaDocumentService.populateSimpleTypeContent(document, typeFragment, simpleContent);
  }

  private static populateComplexNamedTypeFragment(
    document: XmlSchemaDocument,
    typeQName: QName,
    schemaType: XmlSchemaComplexType,
  ) {
    const typeFragmentName = typeQName.toString();

    if (document.namedTypeFragments[typeFragmentName]) {
      return;
    }

    const fields: XmlSchemaField[] = [];
    const typeFragment: XmlSchemaTypeFragment = { fields, namedTypeFragmentRefs: [] };
    document.namedTypeFragments[typeFragmentName] = typeFragment;

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

  /**
   * Populate all named type definitions (complexType and simpleType) from the schema into namedTypeFragments.
   * This must be done before processing elements to ensure base types are available for extensions.
   * @param document
   */
  static populateNamedTypeFragments(document: XmlSchemaDocument) {
    const schemas = document.xmlSchemaCollection.getUserSchemas();
    for (const schema of schemas) {
      XmlSchemaDocumentService.populateNamedTypeFragmentsForSchema(document, schema);
    }
  }

  private static populateSimpleTypeContent(
    document: XmlSchemaDocument,
    typeFragment: XmlSchemaTypeFragment,
    content: XmlSchemaSimpleTypeContent,
  ) {
    if (content instanceof XmlSchemaSimpleTypeRestriction) {
      const baseTypeQName = content.getBaseTypeName();
      XmlSchemaDocumentService.populateSimpleContentRestrictionBaseType(document, typeFragment, baseTypeQName);
      // TODO collect&store restrictions to somewhere in the XmlSchemaField
    } else if (content instanceof XmlSchemaSimpleTypeList) {
      // TODO
    } else if (content instanceof XmlSchemaSimpleTypeUnion) {
      // TODO
    }
  }

  /**
   * Populate XML Element as a field into {@link fields} array passed in as an argument.
   * @param parent
   * @param fields
   * @param element
   */
  static populateElement(parent: XmlSchemaParentType, fields: XmlSchemaField[], element: XmlSchemaElement) {
    const name = element.getWireName()!.getLocalPart()!;
    const refTarget = element.getRef().getTarget();
    const resolvedElement = refTarget ?? element;
    const namespaceURI = resolvedElement.getWireName()!.getNamespaceURI();
    const ownerDoc = ('ownerDocument' in parent ? parent.ownerDocument : parent) as XmlSchemaDocument;

    const existing = fields.find((f) => f.name === name && !f.isAttribute && f.namespaceURI === namespaceURI);
    if (existing) {
      return;
    }

    const field: XmlSchemaField = new XmlSchemaField(parent, name, false);
    field.namespaceURI = namespaceURI;
    field.namespacePrefix = resolvedElement.getWireName()!.getPrefix();
    field.defaultValue = resolvedElement.defaultValue || resolvedElement.fixedValue;
    field.minOccurs = element.getMinOccurs();
    field.maxOccurs = element.getMaxOccurs();
    field.minOccursExplicit = element.isMinOccursExplicit();
    field.maxOccursExplicit = element.isMaxOccursExplicit();
    fields.push(field);

    ownerDoc.totalFieldCount++;
    XmlSchemaDocumentService.populateSchemaType(ownerDoc, field, resolvedElement.getSchemaType());
  }

  private static populateSchemaType(
    ownerDocument: XmlSchemaDocument,
    field: XmlSchemaField,
    schemaType: XmlSchemaType | null,
  ) {
    if (!schemaType) return;
    if (schemaType instanceof XmlSchemaSimpleType) {
      const newType = XmlSchemaDocumentUtilService.getFieldTypeFromName(schemaType.getName());
      if (!field.type || field.type === Types.AnyType) {
        field.type = newType;
        field.originalType = newType;
      }
      const simpleTypeQName = schemaType.getQName();
      if (simpleTypeQName) {
        field.typeQName = simpleTypeQName;
        field.originalTypeQName = simpleTypeQName;
      }
      return;
    } else if (!(schemaType instanceof XmlSchemaComplexType)) {
      throw new TypeError(`Unknown schema type class: ${typeof schemaType}`);
    }

    field.type = Types.Container;
    field.originalType = Types.Container;
    const typeQName = schemaType.getQName();
    if (typeQName) {
      field.typeQName = typeQName;
      field.originalTypeQName = typeQName;
      const namespace = typeQName.getNamespaceURI();
      if (!XmlSchemaDocumentUtilService.isStandardXmlNamespace(namespace)) {
        if (!field.namedTypeFragmentRefs.includes(typeQName.toString())) {
          field.namedTypeFragmentRefs.push(typeQName.toString());
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
  ) {
    if (attr instanceof XmlSchemaAttribute) {
      XmlSchemaDocumentService.populateAttribute(parent, fields, attr);
    } else if (attr instanceof XmlSchemaAttributeGroupRef) {
      XmlSchemaDocumentService.populateAttributeGroupRef(parent, fields, attr);
    }
  }

  /**
   * Populate XML Attribute as a field into {@link fields} array passed in as an argument.
   * @param parent
   * @param fields
   * @param attr
   */
  static populateAttribute(parent: XmlSchemaParentType, fields: XmlSchemaField[], attr: XmlSchemaAttribute) {
    const name = attr.getWireName()!.getLocalPart()!;
    const namespaceURI = attr.getWireName()!.getNamespaceURI();
    const ownerDoc = ('ownerDocument' in parent ? parent.ownerDocument : parent) as XmlSchemaDocument;

    const existing = fields.find((f) => f.name === name && f.isAttribute && f.namespaceURI === namespaceURI);
    if (existing) {
      return;
    }

    const field = new XmlSchemaField(parent, name, true);
    field.namespaceURI = namespaceURI;
    field.namespacePrefix = attr.getWireName()!.getPrefix();
    field.defaultValue = attr.getDefaultValue() || attr.getFixedValue();
    field.type = Types[capitalize(attr.getSchemaTypeName()!.getLocalPart()!) as keyof typeof Types] || Types.AnyType;
    field.originalType = field.type;
    fields.push(field);

    ownerDoc.totalFieldCount++;

    const attrSchemaTypeQName = attr.getSchemaTypeName();
    if (attrSchemaTypeQName) {
      field.typeQName = attrSchemaTypeQName;
      field.originalTypeQName = attrSchemaTypeQName;
    }
    const userDefinedAttrType =
      attrSchemaTypeQName &&
      XmlSchemaDocumentUtilService.lookupSchemaType(ownerDoc.xmlSchemaCollection, attrSchemaTypeQName);
    if (userDefinedAttrType) {
      field.namedTypeFragmentRefs.push(attrSchemaTypeQName.toString());
    }

    const use = attr.getUse();
    switch (use) {
      case XmlSchemaUse.PROHIBITED:
        field.maxOccurs = 0;
        field.minOccurs = 0;
        field.minOccursExplicit = true;
        field.maxOccursExplicit = true;
        break;
      case XmlSchemaUse.REQUIRED:
        field.minOccurs = 1;
        field.maxOccurs = 1;
        field.minOccursExplicit = true;
        field.maxOccursExplicit = true;
        break;
      default:
        field.minOccurs = 0;
        field.maxOccurs = 1;
        field.minOccursExplicit = true;
        field.maxOccursExplicit = true;
        break;
    }
  }

  private static populateAttributeGroupRef(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    groupRef: XmlSchemaAttributeGroupRef,
    visitedGroups: Set<XmlSchemaAttributeGroup> = new Set(),
  ) {
    const ref: XmlSchemaRef<XmlSchemaAttributeGroup> = groupRef.getRef();
    XmlSchemaDocumentService.populateAttributeGroup(parent, fields, ref.getTarget(), visitedGroups);
  }

  private static populateAttributeGroupMember(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    member: XmlSchemaAttributeGroupMember,
    visitedGroups: Set<XmlSchemaAttributeGroup> = new Set(),
  ) {
    if (member instanceof XmlSchemaAttribute) {
      XmlSchemaDocumentService.populateAttribute(parent, fields, member);
    } else if (member instanceof XmlSchemaAttributeGroup) {
      XmlSchemaDocumentService.populateAttributeGroup(parent, fields, member, visitedGroups);
    } else if (member instanceof XmlSchemaAttributeGroupRef) {
      XmlSchemaDocumentService.populateAttributeGroupRef(parent, fields, member, visitedGroups);
    }
  }

  private static populateAttributeGroup(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    group: XmlSchemaAttributeGroup | null,
    visitedGroups: Set<XmlSchemaAttributeGroup> = new Set(),
  ) {
    if (group == null || visitedGroups.has(group)) {
      return;
    }
    visitedGroups.add(group);
    for (const member of group.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeGroupMember(parent, fields, member, visitedGroups);
    }
  }

  private static populateParticle(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    particle: XmlSchemaParticle | null,
    visitedGroupRefs?: Set<string>,
  ) {
    if (particle == null) {
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
    if (groupParticle instanceof XmlSchemaChoice || groupParticle instanceof XmlSchemaSequence) {
      for (const member of groupParticle.getItems()) {
        XmlSchemaDocumentService.populateSequenceOrChoiceMember(parent, fields, member, visitedGroupRefs);
      }
    } else if (groupParticle instanceof XmlSchemaAll) {
      for (const member of groupParticle.getItems()) {
        XmlSchemaDocumentService.populateAllMember(parent, fields, member, visitedGroupRefs);
      }
    }
  }

  private static populateGroupRef(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    groupRef: XmlSchemaGroupRef,
    visitedGroupRefs?: Set<string>,
  ) {
    const groupRefQName = groupRef.getRefName();
    if (!groupRefQName) return;

    const key = groupRefQName.toString();
    visitedGroupRefs ??= new Set();
    if (visitedGroupRefs.has(key)) return;
    visitedGroupRefs.add(key);

    const doc = ('ownerDocument' in parent ? parent.ownerDocument : parent) as XmlSchemaDocument;
    const group = doc.xmlSchemaCollection.getGroupByQName(groupRefQName);
    if (group) {
      XmlSchemaDocumentService.populateGroup(parent, fields, group, visitedGroupRefs);
    }

    visitedGroupRefs.delete(key);
  }

  private static populateSequenceOrChoiceMember(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    member: XmlSchemaSequenceMember | XmlSchemaChoiceMember,
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
  ) {
    if (!contentModel) return;
    const content = contentModel.getContent();
    if (content instanceof XmlSchemaSimpleContentExtension) {
      XmlSchemaDocumentService.populateSimpleContentExtension(document, parent, content);
    } else if (content instanceof XmlSchemaSimpleContentRestriction) {
      XmlSchemaDocumentService.populateSimpleContentRestriction(document, parent, content);
    } else if (content instanceof XmlSchemaComplexContentExtension) {
      XmlSchemaDocumentService.populateComplexContentExtension(document, parent, content);
    } else if (content instanceof XmlSchemaComplexContentRestriction) {
      XmlSchemaDocumentService.populateComplexContentRestriction(document, parent, content);
    }
  }

  private static populateContentModelAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    contentModel: XmlSchemaContentModel | null,
  ) {
    if (!contentModel) return;
    const content = contentModel.getContent();
    if (content instanceof XmlSchemaSimpleContentExtension) {
      XmlSchemaDocumentService.populateSimpleContentExtension(document, parent, content);
    } else if (content instanceof XmlSchemaSimpleContentRestriction) {
      XmlSchemaDocumentService.populateSimpleContentRestriction(document, parent, content);
    } else if (content instanceof XmlSchemaComplexContentExtension) {
      XmlSchemaDocumentService.populateComplexContentExtensionAttributes(document, parent, content);
    } else if (content instanceof XmlSchemaComplexContentRestriction) {
      XmlSchemaDocumentService.populateComplexContentRestrictionAttributes(document, parent, content);
    }
  }

  private static populateContentModelElements(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    contentModel: XmlSchemaContentModel | null,
  ) {
    if (!contentModel) return;
    const content = contentModel.getContent();
    // SimpleContent doesn't have elements, only ComplexContent does
    if (content instanceof XmlSchemaComplexContentExtension) {
      XmlSchemaDocumentService.populateComplexContentExtensionElements(document, parent, content);
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

    if (!parent.type) {
      parent.type = XmlSchemaDocumentUtilService.getFieldTypeFromName(baseTypeQName.getLocalPart());
    }

    return XmlSchemaDocumentUtilService.lookupSchemaType(document.xmlSchemaCollection, baseTypeQName);
  }

  private static populateSimpleExtensionBaseAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    userDefinedBaseType: XmlSchemaSimpleType,
  ) {
    const simpleBase = userDefinedBaseType;
    const simpleContent = simpleBase.getContent();
    if (simpleContent) {
      XmlSchemaDocumentService.populateSimpleTypeContent(document, parent, simpleContent);
    }
    if (!parent.type) {
      parent.type = XmlSchemaDocumentUtilService.getFieldTypeFromName(simpleBase.getName());
    }
  }

  private static populateComplexExtensionBaseAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    userDefinedBaseType: XmlSchemaComplexType,
  ) {
    const complexBase = userDefinedBaseType;
    const contentModel = complexBase.getContentModel();

    if (contentModel) {
      XmlSchemaDocumentService.populateContentModelAttributes(document, parent, contentModel);
    } else {
      const parentForAttribute = 'parent' in parent ? parent : document;
      for (const attr of complexBase.getAttributes()) {
        XmlSchemaDocumentService.populateAttributeOrGroupRef(parentForAttribute, parent.fields, attr);
      }
    }
  }

  private static populateExtensionBaseAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    baseTypeQName: QName | null,
  ) {
    const userDefinedBaseType = XmlSchemaDocumentService.resolveBaseType(document, parent, baseTypeQName);
    if (!userDefinedBaseType) return;

    if (userDefinedBaseType instanceof XmlSchemaSimpleType) {
      XmlSchemaDocumentService.populateSimpleExtensionBaseAttributes(document, parent, userDefinedBaseType);
    } else if (userDefinedBaseType instanceof XmlSchemaComplexType) {
      XmlSchemaDocumentService.populateComplexExtensionBaseAttributes(document, parent, userDefinedBaseType);
    }
  }

  private static populateExtensionBaseElements(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    baseTypeQName: QName | null,
  ) {
    const userDefinedBaseType = XmlSchemaDocumentService.resolveBaseType(document, parent, baseTypeQName);
    if (!userDefinedBaseType) return;

    if (userDefinedBaseType instanceof XmlSchemaComplexType) {
      const complexBase = userDefinedBaseType;
      const contentModel = complexBase.getContentModel();

      if (contentModel) {
        XmlSchemaDocumentService.populateContentModelElements(document, parent, contentModel);
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
  ) {
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
          XmlSchemaDocumentService.populateContentModelAttributes(document, parent, contentModel);
        }
      }
    } else if (userDefinedBaseType instanceof XmlSchemaSimpleType) {
      const simpleBase = userDefinedBaseType;
      const simpleContent = simpleBase.getContent();
      if (simpleContent) {
        XmlSchemaDocumentService.populateSimpleTypeContent(document, parent, simpleContent);
      }
      if (!parent.type) {
        parent.type = XmlSchemaDocumentUtilService.getFieldTypeFromName(simpleBase.getName());
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
  ) {
    XmlSchemaDocumentService.populateExtensionBaseAttributes(document, parent, extension.getBaseTypeName());
    const parentForAttribute = 'parent' in parent ? parent : document;
    for (const attr of extension.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(parentForAttribute, parent.fields, attr);
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
  ) {
    const parentForAttribute = 'parent' in parent ? parent : document;
    for (const attr of restriction.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(parentForAttribute, parent.fields, attr);
    }
    XmlSchemaDocumentService.populateSimpleContentRestrictionBaseType(document, parent, restriction.getBaseTypeName());
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
  ) {
    XmlSchemaDocumentService.populateComplexContentExtensionAttributes(document, parent, extension);
    XmlSchemaDocumentService.populateComplexContentExtensionElements(document, parent, extension);
  }

  private static populateComplexContentExtensionAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    extension: XmlSchemaComplexContentExtension,
  ) {
    const baseTypeQName = extension.getBaseTypeName();
    const baseType = baseTypeQName ? document.xmlSchemaCollection.getTypeByQName(baseTypeQName) : null;
    const baseHasContentModel = baseType instanceof XmlSchemaComplexType && baseType.getContentModel();

    if (baseHasContentModel) {
      XmlSchemaDocumentService.populateContentModelAttributes(document, parent, baseHasContentModel);
    } else {
      XmlSchemaDocumentService.populateExtensionBaseAttributes(document, parent, baseTypeQName);
    }
    const parentForAttribute = 'parent' in parent ? parent : document;
    for (const attr of extension.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(parentForAttribute, parent.fields, attr);
    }
  }

  private static populateComplexContentExtensionElements(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    extension: XmlSchemaComplexContentExtension,
  ) {
    const baseTypeQName = extension.getBaseTypeName();
    const baseType = baseTypeQName ? document.xmlSchemaCollection.getTypeByQName(baseTypeQName) : null;
    const baseHasContentModel = baseType instanceof XmlSchemaComplexType && baseType.getContentModel();

    if (baseHasContentModel) {
      XmlSchemaDocumentService.populateContentModelElements(document, parent, baseHasContentModel);
    } else {
      XmlSchemaDocumentService.populateExtensionBaseElements(document, parent, baseTypeQName);
    }
    const parentForParticle = 'parent' in parent ? parent : document;
    XmlSchemaDocumentService.populateParticle(parentForParticle, parent.fields, extension.getParticle());
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
  ) {
    XmlSchemaDocumentService.populateComplexContentRestrictionAttributes(document, parent, restriction);
    const parentForParticle = 'parent' in parent ? parent : document;
    XmlSchemaDocumentService.populateParticle(parentForParticle, parent.fields, restriction.getParticle());
  }

  private static populateComplexContentRestrictionAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    restriction: XmlSchemaComplexContentRestriction,
  ) {
    const parentForAttribute = 'parent' in parent ? parent : document;
    for (const attr of restriction.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(parentForAttribute, parent.fields, attr);
    }

    const userDefinedBaseType = XmlSchemaDocumentService.resolveBaseType(
      document,
      parent,
      restriction.getBaseTypeName(),
    );
    if (!userDefinedBaseType) {
      return;
    }

    if (userDefinedBaseType instanceof XmlSchemaComplexType) {
      const complexBase = userDefinedBaseType;
      const contentModel = complexBase.getContentModel();

      if (contentModel) {
        XmlSchemaDocumentService.populateContentModelAttributes(document, parent, contentModel);
      } else {
        const parentForAttribute = 'parent' in parent ? parent : document;
        for (const attr of complexBase.getAttributes()) {
          XmlSchemaDocumentService.populateAttributeOrGroupRef(parentForAttribute, parent.fields, attr);
        }
      }
    }
  }
}
