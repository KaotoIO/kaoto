import { getCamelRandomId } from '../camel-utils/camel-random-id';
import {
  BaseDocument,
  BaseField,
  CreateDocumentResult,
  DocumentDefinition,
  DocumentDefinitionType,
  IField,
  ITypeFragment,
} from '../models/datamapper/document';
import { NodePath } from '../models/datamapper/nodepath';
import { XmlSchemaCollection, XmlSchemaElement } from '../xml-schema-ts';

/**
 * Type fragment representing a named XML Schema type (complexType or simpleType).
 * Used to store reusable type definitions that can be referenced by multiple fields.
 */
export interface XmlSchemaTypeFragment extends ITypeFragment {
  fields: XmlSchemaField[];
}

/**
 * The XML variation of {@link CreateDocumentResult} to hold {@link XmlSchemaDocument}.
 */
export interface CreateXmlSchemaDocumentResult extends CreateDocumentResult {
  document?: XmlSchemaDocument;
}

/**
 * Represents an XML Schema document in the DataMapper.
 * Contains the parsed structure of an XSD file including all fields and type definitions.
 */
export class XmlSchemaDocument extends BaseDocument {
  fields: XmlSchemaField[] = [];
  namedTypeFragments: Record<string, XmlSchemaTypeFragment> = {};
  totalFieldCount = 0;
  isNamespaceAware = true;
  definitionType: DocumentDefinitionType;

  constructor(
    definition: DocumentDefinition,
    public xmlSchemaCollection: XmlSchemaCollection,
    public rootElement?: XmlSchemaElement,
  ) {
    super(definition);
    this.name = definition.name;
    this.definitionType = DocumentDefinitionType.XML_SCHEMA;
  }
}

/**
 * Union type representing valid parent types for XML Schema fields.
 * A field can be a child of either a document or another field.
 */
export type XmlSchemaParentType = XmlSchemaDocument | XmlSchemaField;

/**
 * Represents a field in an XML Schema document.
 * Can be either an XML element or attribute with associated type information and validation rules.
 */
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
    adopted.typeQName = this.typeQName;
    adopted.originalType = this.originalType;
    adopted.originalTypeQName = this.originalTypeQName;
    adopted.typeOverride = this.typeOverride;
    adopted.minOccurs = this.minOccurs;
    adopted.maxOccurs = this.maxOccurs;
    adopted.minOccursExplicit = this.minOccursExplicit;
    adopted.maxOccursExplicit = this.maxOccursExplicit;
    adopted.defaultValue = this.defaultValue;
    adopted.namespacePrefix = this.namespacePrefix;
    adopted.namespaceURI = this.namespaceURI;
    adopted.namedTypeFragmentRefs = this.namedTypeFragmentRefs;
    adopted.isChoice = this.isChoice;
    adopted.selectedMemberIndex = this.selectedMemberIndex;
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
