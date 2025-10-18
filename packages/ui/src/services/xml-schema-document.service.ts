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
import {
  BaseDocument,
  BaseField,
  DocumentType,
  DocumentDefinitionType,
  IField,
  ITypeFragment,
  IParentType,
  RootElementOption,
} from '../models/datamapper/document';
import { Types } from '../models/datamapper/types';
import { getCamelRandomId } from '../camel-utils/camel-random-id';
import { NodePath } from '../models/datamapper/nodepath';
import { DocumentUtilService } from './document-util.service';
import { QName } from '../xml-schema-ts/QName';
import { capitalize } from '../serializers/xml/utils/xml-utils';
import { XmlSchemaSimpleTypeRestriction } from '../xml-schema-ts/simple/XmlSchemaSimpleTypeRestriction';
import { XmlSchemaSimpleTypeList } from '../xml-schema-ts/simple/XmlSchemaSimpleTypeList';
import { XmlSchemaSimpleTypeUnion } from '../xml-schema-ts/simple/XmlSchemaSimpleTypeUnion';
import { XmlSchemaSimpleTypeContent } from '../xml-schema-ts/simple/XmlSchemaSimpleTypeContent';

export interface XmlSchemaTypeFragment extends ITypeFragment {
  fields: XmlSchemaField[];
}

export class XmlSchemaDocument extends BaseDocument {
  fields: XmlSchemaField[] = [];
  namedTypeFragments: Record<string, XmlSchemaTypeFragment> = {};
  totalFieldCount = 0;
  isNamespaceAware = true;
  definitionType: DocumentDefinitionType;

  constructor(
    public xmlSchema: XmlSchema,
    documentType: DocumentType,
    documentId: string,
    public rootElement?: XmlSchemaElement,
  ) {
    super(documentType, documentId);
    this.name = documentId;
    if (this.xmlSchema.getElements().size == 0) {
      throw Error("There's no top level Element in the schema");
    }

    if (!this.rootElement) {
      this.rootElement = XmlSchemaDocumentService.getFirstElement(this.xmlSchema);
    }

    XmlSchemaDocumentService.populateNamedTypeFragments(this);

    XmlSchemaDocumentService.populateElement(this, this.fields, this.rootElement);
    this.definitionType = DocumentDefinitionType.XML_SCHEMA;
  }
}

type XmlSchemaParentType = XmlSchemaDocument | XmlSchemaField;

export class XmlSchemaField extends BaseField {
  fields: XmlSchemaField[] = [];
  namespaceURI: string | null = null;
  namespacePrefix: string | null = null;
  minOccursExplicit: boolean = false;
  maxOccursExplicit: boolean = false;

  constructor(
    public parent: XmlSchemaParentType,
    public name: string,
    public isAttribute: boolean,
  ) {
    const ownerDocument = ('ownerDocument' in parent ? parent.ownerDocument : parent) as XmlSchemaDocument;
    super(parent, ownerDocument, name);
    this.id = getCamelRandomId(`fx-${this.name}`, 4);
    this.path = NodePath.childOf(parent.path, this.id);
  }

  adopt(parent: IField): IField {
    if (!(parent instanceof XmlSchemaField)) return super.adopt(parent);

    const adopted = new XmlSchemaField(parent, this.name, this.isAttribute);
    adopted.type = this.type;
    adopted.minOccurs = this.minOccurs;
    adopted.maxOccurs = this.maxOccurs;
    adopted.minOccursExplicit = this.minOccursExplicit;
    adopted.maxOccursExplicit = this.maxOccursExplicit;
    adopted.defaultValue = this.defaultValue;
    adopted.namespacePrefix = this.namespacePrefix;
    adopted.namespaceURI = this.namespaceURI;
    adopted.namedTypeFragmentRefs = this.namedTypeFragmentRefs;
    adopted.fields = this.fields.map((child) => child.adopt(adopted) as XmlSchemaField);
    parent.fields.push(adopted);
    parent.ownerDocument.totalFieldCount++;
    return adopted;
  }

  getExpression(namespaceMap: { [p: string]: string }): string {
    const nsPrefix = Object.keys(namespaceMap).find((key) => namespaceMap[key] === this.namespaceURI);
    const prefix = nsPrefix ? `${nsPrefix}:` : '';
    const name = this.isAttribute ? `@${this.name}` : this.name;
    return prefix + name;
  }

  isIdentical(other: IField): boolean {
    if (this.name !== other.name) return false;
    if (this.isAttribute !== other.isAttribute) return false;
    return this.namespaceURI === other.namespaceURI;
  }
}

/**
 * The collection of XML schema handling logic. {@link createXmlSchemaDocument} consumes XML schema
 * file and generate a {@link XmlSchemaDocument} object.
 */
export class XmlSchemaDocumentService {
  static parseXmlSchema(content: string): XmlSchema {
    const collection = new XmlSchemaCollection();
    return collection.read(content, () => {});
  }

  static createXmlSchemaDocument(
    documentType: DocumentType,
    documentId: string,
    content: string,
    rootElementChoice?: RootElementOption,
  ) {
    const schema = XmlSchemaDocumentService.parseXmlSchema(content);
    let rootElement: XmlSchemaElement | undefined;

    if (rootElementChoice) {
      const qName = new QName(rootElementChoice.namespaceUri, rootElementChoice.name);
      rootElement = schema.getElements().get(qName);
    }

    return new XmlSchemaDocument(schema, documentType, documentId, rootElement);
  }

  /**
   * Recreates {@link XmlSchemaDocument} object with a new root element. Other part including {@link XmlSchema} object
   * is reused from passed in {@link XmlSchemaDocument} object.
   * @param document
   * @param rootElementOption
   */
  static updateRootElement(document: XmlSchemaDocument, rootElementOption: RootElementOption): XmlSchemaDocument {
    const newRootQName = new QName(rootElementOption.namespaceUri, rootElementOption.name);
    const newRootElement = document.xmlSchema.getElements().get(newRootQName);
    return new XmlSchemaDocument(document.xmlSchema, document.documentType, document.documentId, newRootElement);
  }

  static getFirstElement(xmlSchema: XmlSchema): XmlSchemaElement {
    return xmlSchema.getElements().values().next().value;
  }

  /**
   * Populate all named type definitions (complexType and simpleType) from the schema into namedTypeFragments.
   * This must be done before processing elements to ensure base types are available for extensions.
   * @param document
   */
  static populateNamedTypeFragments(document: XmlSchemaDocument) {
    const schemaTypes = document.xmlSchema.getSchemaTypes();
    for (const [typeQName, schemaType] of schemaTypes.entries()) {
      if (schemaType instanceof XmlSchemaComplexType) {
        const typeFragmentName = typeQName.toString();
        const fields: XmlSchemaField[] = [];
        const typeFragment: XmlSchemaTypeFragment = { fields, namedTypeFragmentRefs: [] };
        document.namedTypeFragments[typeFragmentName] = typeFragment;

        XmlSchemaDocumentService.populateContentModel(document, typeFragment, schemaType.getContentModel());
        const attributes = schemaType.getAttributes();
        for (const attr of attributes) {
          XmlSchemaDocumentService.populateAttributeOrGroupRef(document, fields, attr);
        }
        XmlSchemaDocumentService.populateParticle(document, fields, schemaType.getParticle());
      } else if (schemaType instanceof XmlSchemaSimpleType) {
        const typeFragmentName = typeQName.toString();
        const fields: XmlSchemaField[] = [];
        const typeFragment: XmlSchemaTypeFragment = { fields, namedTypeFragmentRefs: [] };
        document.namedTypeFragments[typeFragmentName] = typeFragment;

        const simpleContent = schemaType.getContent();
        simpleContent && XmlSchemaDocumentService.populateSimpleTypeContent(document, typeFragment, simpleContent);
      }
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

  static getFieldTypeFromName(name: string | null): Types {
    return (name && Types[capitalize(name) as keyof typeof Types]) || Types.AnyType;
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
    const resolvedElement = refTarget ? refTarget : element;
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
      const simple = schemaType as XmlSchemaSimpleType;
      const newType = XmlSchemaDocumentService.getFieldTypeFromName(simple.getName());
      if (!field.type || field.type === Types.AnyType) {
        field.type = newType;
      }
      return;
    } else if (!(schemaType instanceof XmlSchemaComplexType)) {
      throw new TypeError(`Unknown schema type class: ${typeof schemaType}`);
    }

    const complex = schemaType as XmlSchemaComplexType;
    field.type = Types.Container;
    const typeQName = complex.getQName();
    if (typeQName) {
      if (!field.namedTypeFragmentRefs.includes(typeQName.toString())) {
        field.namedTypeFragmentRefs.push(typeQName.toString());
      }
      return;
    }

    XmlSchemaDocumentService.populateContentModel(ownerDocument, field, complex.getContentModel());
    const attributes: XmlSchemaAttributeOrGroupRef[] = complex.getAttributes();
    attributes.forEach((attr) => {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(field, field.fields, attr);
    });
    XmlSchemaDocumentService.populateParticle(field, field.fields, complex.getParticle());
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
    fields.push(field);

    ownerDoc.totalFieldCount++;

    const attrSchemaTypeQName = attr.getSchemaTypeName();
    const userDefinedAttrType = attrSchemaTypeQName && ownerDoc.xmlSchema.getSchemaTypes().get(attrSchemaTypeQName);
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
      const choice = groupParticle as XmlSchemaChoice;
      choice
        .getItems()
        .forEach((member: XmlSchemaChoiceMember) =>
          XmlSchemaDocumentService.populateChoiceMember(parent, fields, member),
        );
    } else if (groupParticle instanceof XmlSchemaSequence) {
      const sequence = groupParticle as XmlSchemaSequence;
      sequence
        .getItems()
        .forEach((member: XmlSchemaSequenceMember) =>
          XmlSchemaDocumentService.populateSequenceMember(parent, fields, member),
        );
    } else if (groupParticle instanceof XmlSchemaAll) {
      const all = groupParticle as XmlSchemaAll;
      all
        .getItems()
        .forEach((member: XmlSchemaAllMember) => XmlSchemaDocumentService.populateAllMember(parent, fields, member));
    }
  }

  private static populateGroupRef(parent: XmlSchemaParentType, fields: XmlSchemaField[], groupRef: XmlSchemaGroupRef) {
    const groupRefQName = groupRef.getRefName();
    const doc = ('ownerDocument' in parent ? parent.ownerDocument : parent) as XmlSchemaDocument;
    const group = groupRefQName && doc.xmlSchema.getGroups().get(groupRefQName);
    group && XmlSchemaDocumentService.populateGroup(parent, fields, group);
  }

  private static populateChoiceMember(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    member: XmlSchemaChoiceMember,
  ) {
    if (member instanceof XmlSchemaGroupRef) {
      XmlSchemaDocumentService.populateGroupRef(parent, fields, member);
    } else if (member instanceof XmlSchemaGroup) {
      XmlSchemaDocumentService.populateGroup(parent, fields, member);
    } else if (member instanceof XmlSchemaParticle) {
      XmlSchemaDocumentService.populateParticle(parent, fields, member);
    }
  }

  private static populateSequenceMember(
    parent: XmlSchemaParentType,
    fields: XmlSchemaField[],
    member: XmlSchemaSequenceMember,
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
      XmlSchemaDocumentService.populateParticle(document, parent.fields, content.getParticle());
    }
  }

  private static resolveBaseType(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    baseTypeQName: QName | null,
  ): XmlSchemaType | null {
    if (!baseTypeQName) return null;

    const userDefinedBaseType = document.xmlSchema.getSchemaTypes().get(baseTypeQName);

    if (!userDefinedBaseType) {
      if (!parent.type) {
        parent.type = XmlSchemaDocumentService.getFieldTypeFromName(baseTypeQName.getLocalPart());
      }
      return null;
    }

    return userDefinedBaseType;
  }

  private static populateExtensionBaseAttributes(
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
        XmlSchemaDocumentService.populateContentModelAttributes(document, parent, contentModel);
      } else {
        for (const attr of complexBase.getAttributes()) {
          XmlSchemaDocumentService.populateAttributeOrGroupRef(document, parent.fields, attr);
        }
      }
    } else if (userDefinedBaseType instanceof XmlSchemaSimpleType) {
      const simpleBase = userDefinedBaseType;
      const simpleContent = simpleBase.getContent();
      if (simpleContent) {
        XmlSchemaDocumentService.populateSimpleTypeContent(document, parent, simpleContent);
      }
      if (!parent.type) {
        parent.type = XmlSchemaDocumentService.getFieldTypeFromName(simpleBase.getName());
      }
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
        XmlSchemaDocumentService.populateParticle(document, parent.fields, complexBase.getParticle());
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
        parent.type = XmlSchemaDocumentService.getFieldTypeFromName(simpleBase.getName());
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
    for (const attr of extension.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(document, parent.fields, attr);
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
    for (const attr of restriction.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(document, parent.fields, attr);
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
    const baseType = baseTypeQName ? document.xmlSchema.getSchemaTypes().get(baseTypeQName) : null;
    const baseHasContentModel = baseType instanceof XmlSchemaComplexType && baseType.getContentModel();

    if (baseHasContentModel) {
      XmlSchemaDocumentService.populateContentModelAttributes(document, parent, baseHasContentModel);
    } else {
      XmlSchemaDocumentService.populateExtensionBaseAttributes(document, parent, baseTypeQName);
    }
    for (const attr of extension.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(document, parent.fields, attr);
    }
  }

  private static populateComplexContentExtensionElements(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    extension: XmlSchemaComplexContentExtension,
  ) {
    const baseTypeQName = extension.getBaseTypeName();
    const baseType = baseTypeQName ? document.xmlSchema.getSchemaTypes().get(baseTypeQName) : null;
    const baseHasContentModel = baseType instanceof XmlSchemaComplexType && baseType.getContentModel();

    if (baseHasContentModel) {
      XmlSchemaDocumentService.populateContentModelElements(document, parent, baseHasContentModel);
    } else {
      XmlSchemaDocumentService.populateExtensionBaseElements(document, parent, baseTypeQName);
    }
    XmlSchemaDocumentService.populateParticle(document, parent.fields, extension.getParticle());
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
    XmlSchemaDocumentService.populateParticle(document, parent.fields, restriction.getParticle());
  }

  private static populateComplexContentRestrictionAttributes(
    document: XmlSchemaDocument,
    parent: XmlSchemaField | XmlSchemaTypeFragment,
    restriction: XmlSchemaComplexContentRestriction,
  ) {
    for (const attr of restriction.getAttributes()) {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(document, parent.fields, attr);
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
        for (const attr of complexBase.getAttributes()) {
          XmlSchemaDocumentService.populateAttributeOrGroupRef(document, parent.fields, attr);
        }
      }
    }
  }

  static getChildField(parent: IParentType, name: string, namespaceURI?: string | null): IField | undefined {
    const resolvedParent = 'parent' in parent ? DocumentUtilService.resolveTypeFragment(parent) : parent;
    return resolvedParent.fields.find((f) => {
      return f.name === name && ((!namespaceURI && !f.namespaceURI) || f.namespaceURI === namespaceURI);
    });
  }
}
