import { JSONSchema7 } from 'json-schema';

import { getCamelRandomId } from '../camel-utils/camel-random-id';
import {
  BaseDocument,
  BaseField,
  DocumentDefinitionType,
  DocumentType,
  IField,
  ITypeFragment,
  PathExpression,
  PathSegment,
  Types,
} from '../models/datamapper';
import { NodePath } from '../models/datamapper/nodepath';
import { Predicate, PredicateOperator } from '../models/datamapper/xpath';
import { NS_XPATH_FUNCTIONS } from '../models/datamapper/xslt';
import { JsonSchemaDocumentUtilService } from './json-schema-document-util.service';
import { FROM_JSON_SOURCE_SUFFIX } from './mapping-serializer-json-addon';

/**
 * Type fragment representing a named JSON Schema definition.
 * Used to store reusable type definitions that can be referenced via $ref.
 */
export interface JsonSchemaTypeFragment extends ITypeFragment {
  type?: Types;
  required?: string[];
  fields: JsonSchemaField[];
}

/**
 * JSON Schema with additional path metadata for tracking location in the schema tree.
 */
export interface JSONSchemaMetadata extends JSONSchema7 {
  path: string;
}

/**
 * Represents a JSON Schema document in the DataMapper.
 * Contains the parsed structure of a JSON Schema file including all fields and type definitions.
 */
export class JsonSchemaDocument extends BaseDocument {
  isNamespaceAware: boolean = false;
  totalFieldCount: number = 0;
  fields: JsonSchemaField[] = [];
  namedTypeFragments: Record<string, JsonSchemaTypeFragment> = {};
  definitionType: DocumentDefinitionType;

  constructor(documentType: DocumentType, documentId: string) {
    super(documentType, documentId);
    this.name = documentId;
    this.definitionType = DocumentDefinitionType.JSON_SCHEMA;
  }

  /**
   * @param _namespaceMap - Namespace map (not used for JSON schemas)
   * @returns Reference ID string with JSON source suffix appended
   */
  getReferenceId(_namespaceMap: { [prefix: string]: string }): string {
    return this.documentType === DocumentType.PARAM
      ? `${this.documentId}${FROM_JSON_SOURCE_SUFFIX}`
      : `body${FROM_JSON_SOURCE_SUFFIX}`;
  }
}

/**
 * Union type representing valid parent types for JSON Schema fields.
 * A field can be a child of either a document or another field.
 */
export type JsonSchemaParentType = JsonSchemaDocument | JsonSchemaField;

/**
 * Represents a field in a JSON Schema document.
 * Can represent object properties, array items, or primitive values.
 */
export class JsonSchemaField extends BaseField {
  fields: JsonSchemaField[] = [];
  namespaceURI: string = NS_XPATH_FUNCTIONS;
  namespacePrefix: string = 'fn';
  isAttribute = false;
  predicates: Predicate[] = [];
  required: string[] = [];

  constructor(
    public parent: JsonSchemaParentType,
    public key: string,
    public type: Types,
  ) {
    const ownerDocument = ('ownerDocument' in parent ? parent.ownerDocument : parent) as JsonSchemaDocument;
    super(parent, ownerDocument, key);
    this.type = type;
    this.originalType = type;
    this.name = JsonSchemaDocumentUtilService.toXsltTypeName(this.type);
    const keyPart = this.key ? `-${this.key}` : '';
    this.id = `fj-${this.name}${keyPart}${getCamelRandomId('', 4)}`;
    this.path = NodePath.childOf(parent.path, this.id);
    const queryPart = this.key ? ` [@key = ${this.key}]` : '';
    this.displayName = `${this.name}${queryPart}`;

    if (this.key) {
      const left = new PathExpression();
      left.isRelative = true;
      left.pathSegments = [new PathSegment('key', true)];
      this.predicates = [new Predicate(left, PredicateOperator.Equal, this.key)];
    }
  }

  private mergeJsonDefaultValue(existing: IField): void {
    if (this.defaultValue !== null) {
      existing.defaultValue = this.defaultValue;
    }
  }

  private mergeJsonNamedTypeFragmentRefs(existing: IField): void {
    for (const ref of this.namedTypeFragmentRefs) {
      if (!existing.namedTypeFragmentRefs.includes(ref)) {
        existing.namedTypeFragmentRefs.push(ref);
      }
    }
  }

  private mergeJsonChoiceMetadata(existing: IField): void {
    if (this.isChoice !== undefined) {
      existing.isChoice = this.isChoice;
    }
    if (this.choiceMembers !== undefined) {
      existing.choiceMembers = this.choiceMembers;
    }
    if (this.selectedMemberIndex !== undefined) {
      existing.selectedMemberIndex = this.selectedMemberIndex;
    }
  }

  private createNew(parent: JsonSchemaField) {
    const created = new JsonSchemaField(parent, this.key, this.type);
    this.copyTo(created);
    created.minOccurs = parent.required.includes(this.key) ? 1 : 0;
    created.maxOccurs = parent.type === Types.Array ? Number.MAX_SAFE_INTEGER : 1;
    return created;
  }

  adopt(parent: IField): IField {
    if (!(parent instanceof JsonSchemaField)) return super.adopt(parent);

    const existing = parent.fields.find((f) => f.isIdentical(this));
    if (!existing) {
      const adopted = this.createNew(parent);

      adopted.isChoice = this.isChoice;
      adopted.choiceMembers = this.choiceMembers;
      adopted.selectedMemberIndex = this.selectedMemberIndex;

      parent.fields.push(adopted);
      parent.ownerDocument.totalFieldCount++;
      return adopted;
    }

    if (this.type !== Types.AnyType && existing.type === Types.AnyType) {
      const index = parent.fields.indexOf(existing);
      const adopted = this.createNew(parent);

      adopted.isChoice = this.isChoice;
      adopted.choiceMembers = this.choiceMembers;
      adopted.selectedMemberIndex = this.selectedMemberIndex;

      parent.fields[index] = adopted;
      return adopted;
    }

    this.mergeJsonDefaultValue(existing);
    this.mergeJsonNamedTypeFragmentRefs(existing);
    this.mergeJsonChoiceMetadata(existing);

    for (const child of this.fields) {
      child.adopt(existing);
    }

    return existing;
  }

  copyTo(to: JsonSchemaField) {
    to.minOccurs = this.minOccurs;
    to.maxOccurs = this.maxOccurs;
    to.defaultValue = this.defaultValue;
    to.namespacePrefix = this.namespacePrefix;
    to.namespaceURI = this.namespaceURI;
    to.typeQName = this.typeQName;
    to.originalType = this.originalType;
    to.originalTypeQName = this.originalTypeQName;
    to.typeOverride = this.typeOverride;
    to.namedTypeFragmentRefs = this.namedTypeFragmentRefs;
    to.isChoice = this.isChoice;
    to.choiceMembers = this.choiceMembers;
    to.selectedMemberIndex = this.selectedMemberIndex;
    to.fields = this.fields.map((child) => child.adopt(to) as JsonSchemaField);
    return to;
  }

  getExpression(namespaceMap: { [p: string]: string }): string {
    let nsPrefix = Object.keys(namespaceMap).find((key) => namespaceMap[key] === this.namespaceURI);
    if (!nsPrefix) {
      namespaceMap[this.namespacePrefix] = this.namespaceURI;
      nsPrefix = this.namespacePrefix;
    }

    const prefix = nsPrefix ? `${nsPrefix}:` : '';
    const keyQuery = this.key ? `[@key='${this.key}']` : '';
    return `${prefix}${this.name}${keyQuery}`;
  }

  isIdentical(other: IField): boolean {
    if (!('key' in other)) return false;
    return this.key === other.key;
  }
}
