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

    XmlSchemaDocumentService.populateElement(this, this.fields, this.rootElement);
    this.definitionType = DocumentDefinitionType.XML_SCHEMA;
  }
}

type XmlSchemaParentType = XmlSchemaDocument | XmlSchemaField;

export class XmlSchemaField extends BaseField {
  fields: XmlSchemaField[] = [];
  namespaceURI: string | null = null;
  namespacePrefix: string | null = null;

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

  adopt(parent: IField) {
    if (!(parent instanceof XmlSchemaField)) return super.adopt(parent);

    const adopted = new XmlSchemaField(parent, this.name, this.isAttribute);
    adopted.type = this.type;
    adopted.minOccurs = this.minOccurs;
    adopted.maxOccurs = this.maxOccurs;
    adopted.defaultValue = this.defaultValue;
    adopted.namespacePrefix = this.namespacePrefix;
    adopted.namespaceURI = this.namespaceURI;
    adopted.namedTypeFragmentRefs = this.namedTypeFragmentRefs;
    adopted.fields = this.fields.map((child) => child.adopt(adopted) as XmlSchemaField);
    parent.fields.push(adopted);
    return adopted;
  }

  getExpression(namespaceMap: { [p: string]: string }): string {
    const nsPrefix = Object.keys(namespaceMap).find((key) => namespaceMap[key] === this.namespaceURI);
    const prefix = nsPrefix ? `${nsPrefix}:` : '';
    const name = this.isAttribute ? `@${this.name}` : this.name;
    return prefix + name;
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
   * Populate XML Element as a field into {@link fields} array passed in as an argument.
   * @param parent
   * @param fields
   * @param element
   */
  static populateElement(parent: XmlSchemaParentType, fields: XmlSchemaField[], element: XmlSchemaElement) {
    const name = element.getWireName()!.getLocalPart()!;
    const refTarget = element.getRef().getTarget();
    const resolvedElement = refTarget ? refTarget : element;
    const field: XmlSchemaField = new XmlSchemaField(parent, name, false);
    field.namespaceURI = resolvedElement.getWireName()!.getNamespaceURI();
    field.namespacePrefix = resolvedElement.getWireName()!.getPrefix();
    field.defaultValue = resolvedElement.defaultValue || resolvedElement.fixedValue;
    // The occurrences must be taken from the referrer as opposed to the other attributes
    field.minOccurs = element.getMinOccurs();
    field.maxOccurs = element.getMaxOccurs();
    fields.push(field);

    const ownerDoc = ('ownerDocument' in parent ? parent.ownerDocument : parent) as XmlSchemaDocument;
    const cachedTypeFragments = ownerDoc.namedTypeFragments;
    ownerDoc.totalFieldCount++;
    XmlSchemaDocumentService.populateSchemaType(cachedTypeFragments, field, resolvedElement.getSchemaType());
  }

  private static populateSchemaType(
    cachedTypeFragments: Record<string, XmlSchemaTypeFragment>,
    field: XmlSchemaField,
    schemaType: XmlSchemaType | null,
    parentTypeFragment?: XmlSchemaTypeFragment,
  ) {
    if (!schemaType) return;
    if (schemaType instanceof XmlSchemaSimpleType) {
      const simple = schemaType as XmlSchemaSimpleType;
      field.type = Types[capitalize(simple.getName()!) as keyof typeof Types] || Types.AnyType;
      return;
    }
    field.type = Types.Container;
    if (schemaType instanceof XmlSchemaComplexType) {
      const complex = schemaType as XmlSchemaComplexType;
      const typeQName = complex.getQName();
      const children: XmlSchemaField[] = [];
      const typeFragment: XmlSchemaTypeFragment = { fields: children, namedTypeFragmentRefs: [] };
      if (typeQName) {
        parentTypeFragment
          ? parentTypeFragment.namedTypeFragmentRefs.push(typeQName.toString())
          : field.namedTypeFragmentRefs.push(typeQName.toString());
        const cached = typeQName && cachedTypeFragments[typeQName.toString()];
        if (cached) return;
        cachedTypeFragments[typeQName.toString()] = typeFragment;
      } else {
        field.fields = children;
      }

      XmlSchemaDocumentService.populateContentModel(
        cachedTypeFragments,
        field,
        children,
        complex.getContentModel(),
        typeFragment,
      );
      const attributes: XmlSchemaAttributeOrGroupRef[] = complex.getAttributes();
      attributes.forEach((attr) => {
        XmlSchemaDocumentService.populateAttributeOrGroupRef(field, children, attr);
      });
      XmlSchemaDocumentService.populateParticle(field, children, complex.getParticle());
    }
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
    const field = new XmlSchemaField(parent, name, true);
    field.namespaceURI = attr.getWireName()!.getNamespaceURI();
    field.namespacePrefix = attr.getWireName()!.getPrefix();
    field.defaultValue = attr.getDefaultValue() || attr.getFixedValue();
    fields.push(field);

    const ownerDoc = ('ownerDocument' in parent ? parent.ownerDocument : parent) as XmlSchemaDocument;
    ownerDoc.totalFieldCount++;

    const use = attr.getUse();
    switch (use) {
      case XmlSchemaUse.PROHIBITED:
        field.maxOccurs = 0;
        field.minOccurs = 0;
        break;
      case XmlSchemaUse.REQUIRED:
        field.minOccurs = 1;
        field.maxOccurs = 1;
        break;
      default: // OPTIONAL, NONE or not specified
        field.minOccurs = 0;
        field.maxOccurs = 1;
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
    XmlSchemaDocumentService.populateGroupParticle(parent, fields, groupRef.getParticle());
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
    cachedTypeFragments: Record<string, XmlSchemaTypeFragment>,
    parent: XmlSchemaField,
    fields: XmlSchemaField[],
    contentModel: XmlSchemaContentModel | null,
    parentTypeFragment?: XmlSchemaTypeFragment,
  ) {
    if (!contentModel) return;
    const content = contentModel.getContent();
    if (content instanceof XmlSchemaSimpleContentExtension) {
      XmlSchemaDocumentService.populateSimpleContentExtension(parent, fields, content);
    } else if (content instanceof XmlSchemaSimpleContentRestriction) {
      XmlSchemaDocumentService.populateSimpleContentRestriction(parent, fields, content);
    } else if (content instanceof XmlSchemaComplexContentExtension) {
      XmlSchemaDocumentService.populateComplexContentExtension(
        cachedTypeFragments,
        parent,
        fields,
        content,
        parentTypeFragment,
      );
    } else if (content instanceof XmlSchemaComplexContentRestriction) {
      XmlSchemaDocumentService.populateComplexContentRestriction(parent, fields, content);
    }
  }

  private static populateSimpleContentExtension(
    parent: XmlSchemaField,
    fields: XmlSchemaField[],
    extension: XmlSchemaSimpleContentExtension,
  ) {
    const attributes = extension.getAttributes();
    attributes.forEach((attr) => {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(parent, fields, attr);
    });
  }

  private static populateSimpleContentRestriction(
    _parent: XmlSchemaField,
    _fields: XmlSchemaField[],
    _restriction: XmlSchemaSimpleContentRestriction,
  ) {
    // TODO restriction support
  }

  private static populateComplexContentExtension(
    cachedTypeFragments: Record<string, XmlSchemaTypeFragment>,
    parent: XmlSchemaField,
    fields: XmlSchemaField[],
    extension: XmlSchemaComplexContentExtension,
    parentTypeFragment?: XmlSchemaTypeFragment,
  ) {
    const baseTypeName = extension.getBaseTypeName();
    const doc = ('ownerDocument' in parent ? parent.ownerDocument : parent) as XmlSchemaDocument;
    const baseType = baseTypeName ? doc.xmlSchema.getSchemaTypes().get(baseTypeName) : undefined;
    if (baseType) {
      XmlSchemaDocumentService.populateSchemaType(cachedTypeFragments, parent, baseType, parentTypeFragment);
    }
    const attributes = extension.getAttributes();
    attributes.forEach((attr) => {
      XmlSchemaDocumentService.populateAttributeOrGroupRef(parent, fields, attr);
    });
    XmlSchemaDocumentService.populateParticle(parent, fields, extension.getParticle());
  }

  private static populateComplexContentRestriction(
    _parent: XmlSchemaField,
    _fields: XmlSchemaField[],
    _restriction: XmlSchemaComplexContentRestriction,
  ) {
    // TODO restriction support
  }

  static getChildField(parent: IParentType, name: string, namespaceURI?: string | null): IField | undefined {
    const resolvedParent = 'parent' in parent ? DocumentUtilService.resolveTypeFragment(parent) : parent;
    return resolvedParent.fields.find((f) => {
      return f.name === name && ((!namespaceURI && !f.namespaceURI) || f.namespaceURI === namespaceURI);
    });
  }
}
