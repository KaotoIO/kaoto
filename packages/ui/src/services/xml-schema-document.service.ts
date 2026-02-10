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
        validationMessage: analysis.errors.join('; '),
      };
    }

    try {
      for (const path of analysis.loadOrder) {
        collection.read(definitionFiles[path], () => {}, path);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        validationStatus: 'error',
        validationMessage: errorMessage,
      };
    }

    if (collection.getXmlSchemas().length === 0) {
      return {
        validationStatus: 'error',
        validationMessage: 'No schema files provided in DocumentDefinition',
      };
    }

    const totalElements = XmlSchemaDocumentUtilService.getElementCount(collection);
    if (totalElements === 0) {
      return {
        validationStatus: 'error',
        validationMessage: "There's no top level Element in the schema",
      };
    }

    let rootElement: XmlSchemaElement;
    try {
      rootElement = XmlSchemaDocumentUtilService.determineRootElement(collection, definition.rootElementChoice);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        validationStatus: 'error',
        validationMessage: errorMessage,
      };
    }

    const document = new XmlSchemaDocument(definition, collection, rootElement);

    XmlSchemaDocumentService.populateNamedTypeFragments(document);
    XmlSchemaDocumentService.populateElement(document, document.fields, document.rootElement!);

    if (definition.fieldTypeOverrides?.length && definition.fieldTypeOverrides.length > 0) {
      DocumentUtilService.applyFieldTypeOverrides(
        document,
        definition.fieldTypeOverrides,
        definition.namespaceMap || {},
        XmlSchemaTypesService.parseTypeOverride,
      );
    }

    const rootElementOptions = XmlSchemaDocumentUtilService.collectRootElementOptions(collection);

    return {
      validationStatus: 'success',
      validationMessage: 'Schema validation successful',
      documentDefinition: definition,
      document,
      rootElementOptions,
    };
  }

  /**
   * Adds additional schema files to an existing document's schema collection.
   * This is useful when field type overrides reference types defined in additional schema files.
   * @param document - The document whose schema collection will be updated
   * @param additionalFiles - Map of file paths to file contents to add
   */
  static addSchemaFiles(document: XmlSchemaDocument, additionalFiles: Record<string, string>): void {
    const collection = document.xmlSchemaCollection;
    const resolver = collection.getSchemaResolver();

    resolver.addFiles(additionalFiles);

    XmlSchemaDocumentUtilService.loadXmlSchemaFiles(collection, additionalFiles);
    XmlSchemaDocumentService.populateNamedTypeFragments(document);
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
  ) {
    const ref: XmlSchemaRef<XmlSchemaAttributeGroup> = groupRef.getRef();
    XmlSchemaDocumentService.populateAttributeGroup(parent, fields, ref.getTarget());
  }

  private static populateAttributeGroupMember(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    member: XmlSchemaAttributeGroupMember,
  ) {
    if (member instanceof XmlSchemaAttribute) {
      XmlSchemaDocumentService.populateAttribute(parent, fields, member);
    } else if (member instanceof XmlSchemaAttributeGroup) {
      XmlSchemaDocumentService.populateAttributeGroup(parent, fields, member);
    } else if (member instanceof XmlSchemaAttributeGroupRef) {
      XmlSchemaDocumentService.populateAttributeGroupRef(parent, fields, member);
    }
  }

  private static populateAttributeGroup(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    group: XmlSchemaAttributeGroup | null,
  ) {
    if (group == null) {
      return;
    }
    group
      .getAttributes()
      .forEach((member: XmlSchemaAttributeGroupMember) =>
        XmlSchemaDocumentService.populateAttributeGroupMember(parent, fields, member),
      );
  }

  private static populateParticle(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    particle: XmlSchemaParticle | null,
  ) {
    if (particle == null) {
      return;
    }
    if (particle instanceof XmlSchemaAny) {
      XmlSchemaDocumentService.populateAny(fields, particle);
    } else if (particle instanceof XmlSchemaElement) {
      XmlSchemaDocumentService.populateElement(parent, fields, particle);
    } else if (particle instanceof XmlSchemaGroupParticle) {
      XmlSchemaDocumentService.populateGroupParticle(parent, fields, particle);
    } else if (particle instanceof XmlSchemaGroupRef) {
      XmlSchemaDocumentService.populateGroupRef(parent, fields, particle);
    }
  }

  private static populateAny(_fields: XmlSchemaField[], _schemaAny: XmlSchemaAny) {
    /* TODO - xs:any allows arbitrary elements */
  }

  private static populateGroupParticle(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    groupParticle: XmlSchemaGroupParticle | null,
  ) {
    if (groupParticle == null) {
      return;
    }
    if (groupParticle instanceof XmlSchemaChoice) {
      groupParticle
        .getItems()
        .forEach((member: XmlSchemaChoiceMember) =>
          XmlSchemaDocumentService.populateSequenceOrChoiceMember(parent, fields, member),
        );
    } else if (groupParticle instanceof XmlSchemaSequence) {
      groupParticle
        .getItems()
        .forEach((member: XmlSchemaSequenceMember) =>
          XmlSchemaDocumentService.populateSequenceOrChoiceMember(parent, fields, member),
        );
    } else if (groupParticle instanceof XmlSchemaAll) {
      groupParticle
        .getItems()
        .forEach((member: XmlSchemaAllMember) => XmlSchemaDocumentService.populateAllMember(parent, fields, member));
    }
  }

  private static populateGroupRef(parent: XmlSchemaParentType, fields: XmlSchemaField[], groupRef: XmlSchemaGroupRef) {
    const groupRefQName = groupRef.getRefName();
    const doc = ('ownerDocument' in parent ? parent.ownerDocument : parent) as XmlSchemaDocument;
    const group = groupRefQName && doc.xmlSchemaCollection.getGroupByQName(groupRefQName);
    group && XmlSchemaDocumentService.populateGroup(parent, fields, group);
  }

  private static populateSequenceOrChoiceMember(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    member: XmlSchemaSequenceMember | XmlSchemaChoiceMember,
  ) {
    if (member instanceof XmlSchemaGroupRef) {
      XmlSchemaDocumentService.populateGroupRef(parent, fields, member);
    } else if (member instanceof XmlSchemaGroup) {
      XmlSchemaDocumentService.populateGroup(parent, fields, member);
    } else if (member instanceof XmlSchemaParticle) {
      XmlSchemaDocumentService.populateParticle(parent, fields, member);
    }
  }

  private static populateAllMember(parent: XmlSchemaParentType, fields: XmlSchemaField[], member: XmlSchemaAllMember) {
    if (member instanceof XmlSchemaParticle) {
      XmlSchemaDocumentService.populateParticle(parent, fields, member);
    }
  }

  private static populateGroup(parent: XmlSchemaParentType, fields: XmlSchemaField[], group: XmlSchemaGroup) {
    XmlSchemaDocumentService.populateParticle(parent, fields, group.getParticle());
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
