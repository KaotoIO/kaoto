import { DocumentType, IParentType } from '../models/datamapper/document';
import {
  BaseDocument,
  BaseField,
  DocumentDefinitionType,
  IField,
  ITypeFragment,
  PathExpression,
  PathSegment,
  Types,
} from '../models/datamapper';
import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { getCamelRandomId } from '../camel-utils/camel-random-id';
import { NS_XPATH_FUNCTIONS } from '../models/datamapper/xslt';
import { FROM_JSON_SOURCE_SUFFIX } from './mapping-serializer-json-addon';
import { NodePath } from '../models/datamapper/nodepath';
import { Predicate, PredicateOperator } from '../models/datamapper/xpath';
import { DocumentUtilService } from './document-util.service';

export interface JsonSchemaTypeFragment extends ITypeFragment {
  type?: Types;
  required?: string[];
  fields: JsonSchemaField[];
}

export interface JSONSchemaMetadata extends JSONSchema7 {
  path: string;
}

/**
 * Represents the JSON schema document.
 *
 * @see {@link JsonSchemaField}
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

  getReferenceId(_namespaceMap: { [prefix: string]: string }): string {
    // @TODO Currently JSON body is not supported, i.e. it should be always a param.
    // We should change this accordingly when JSON body is supported.
    return this.documentType === DocumentType.PARAM
      ? `${this.documentId}${FROM_JSON_SOURCE_SUFFIX}`
      : `body${FROM_JSON_SOURCE_SUFFIX}`;
  }
}

export type JsonSchemaParentType = JsonSchemaDocument | JsonSchemaField;

/**
 * Represents the field in JSON schema document.
 *
 * JSON schema allows to have an array of property types. We might eventually have to introduce an array
 * of field types at {@link IField} level. Then UI would also have to support handling it, such as
 * if this field is string, then do this, if it's object, then do that, etc.
 * For now, it chooses one type and use it.
 * Also in JSON schema, when `type` is omitted, it could be any type. This fact basically conflicts with what
 * we want to do with XSLT3 lossless JSON representation where it explicitly has to specify the type.
 * Until we get a concrete idea of how to handle this in DataMapper UI, just pick one type and use it.
 *
 * Unlike XML, JSON could have anonymous object and array. In the JSON lossless representation in XSLT,
 * object is represented by `fn:map` and array is represented by `fn:array` while the name is specified with
 * `key` attribute, such as `fn:map[@key='objectName']` and `fn:map[@key='arrayName']`. `fn:map` and `fn:array`
 * simply represents anonymous object and array. In order to take this into account, {@link JsonSchemaField.name}
 * holds the field type such as `map` or `array`, and {@link JsonSchemaField.key} holds the name if it's named one.
 * The `key` will be an empty string for the anonymous JSON field. Alternatively {@link JsonSchemaField.displayName}
 * provides human-readable label for the field, which shows JSON field type such as `map` and `array`, as well as
 * {@link JsonSchemaField.key} in case the field is a named one.
 * @see {@link XmlSchemaField}
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
    this.name = JsonSchemaDocumentService.toXsltTypeName(this.type);
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

  private createNew(parent: JsonSchemaField) {
    const created = new JsonSchemaField(parent, this.key, this.type);
    this.copyTo(created);
    created.minOccurs = parent.required.includes(this.key) ? 1 : 0;
    created.maxOccurs = parent.type === Types.Array ? Number.MAX_SAFE_INTEGER : 1;
    return created;
  }

  adopt(parent: IField) {
    if (!(parent instanceof JsonSchemaField)) return super.adopt(parent);

    const existing = parent.fields.find((f) => f.isIdentical(this));
    if (!existing) {
      const adopted = this.createNew(parent);
      parent.fields.push(adopted);
      parent.ownerDocument.totalFieldCount++;
      return adopted;
    }

    // Inherit field type if existing field is any type (i.e. not defined) - need to re-create the field object
    if (this.type !== Types.AnyType && existing.type === Types.AnyType) {
      const index = parent.fields.indexOf(existing);
      const adopted = this.createNew(parent);
      parent.fields[index] = adopted;
      return adopted;
    }

    if (this.defaultValue !== null) existing.defaultValue = this.defaultValue;
    for (const ref of this.namedTypeFragmentRefs) {
      !existing.namedTypeFragmentRefs.includes(ref) && existing.namedTypeFragmentRefs.push(ref);
    }
    for (const child of this.fields) child.adopt(existing);
    return existing;
  }

  copyTo(to: JsonSchemaField) {
    to.minOccurs = this.minOccurs;
    to.maxOccurs = this.maxOccurs;
    to.defaultValue = this.defaultValue;
    to.namespacePrefix = this.namespacePrefix;
    to.namespaceURI = this.namespaceURI;
    to.namedTypeFragmentRefs = this.namedTypeFragmentRefs;
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
    if (this.key !== other.key) return false;
    return true;
  }
}

/**
 * The collection of JSON schema handling logic. {@link createJsonSchemaDocument} consumes JSON schema
 * file and generate a {@link JsonSchemaDocument} object.
 */
export class JsonSchemaDocumentService {
  static getChildField(
    parentField: IParentType,
    type: Types,
    fieldKey: string,
    namespaceURI: string,
  ): IField | undefined {
    const resolvedParent = 'parent' in parentField ? DocumentUtilService.resolveTypeFragment(parentField) : parentField;
    return resolvedParent.fields.find((f) => {
      return (
        'key' in f &&
        f.key === fieldKey &&
        JsonSchemaDocumentService.toXsltTypeName(f.type) === JsonSchemaDocumentService.toXsltTypeName(type) &&
        ((!namespaceURI && !f.namespaceURI) || f.namespaceURI === namespaceURI)
      );
    });
  }

  static toXsltTypeName(type: Types): string {
    switch (type) {
      case Types.String:
        return 'string';
      case Types.Numeric:
        return 'number';
      case Types.Integer:
        return 'number';
      case Types.Boolean:
        return 'boolean';
      case Types.Container:
        return 'map';
      case Types.Array:
        return 'array';
      default:
        return 'map';
    }
  }

  static parseJsonSchema(content: string): JSONSchemaMetadata {
    try {
      const row = JSON.parse(content) as JSONSchema7;
      return { ...row, path: '#' };
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new Error(`Failed to parse JSON schema. Error: ${error.message}`);
    }
  }

  /**
   * The public entry point to create a {@link JsonSchemaDocument} out of the JSON schema file.
   * The process is separated to 2 steps to ensure schema definitions are parsed first before it's referenced through
   * `$ref`.
   * Firstly, {@link populateFieldFromSchema} populates the fields into {@link JsonSchemaDocument}. At this point, fields
   * and type fragments might be missing `type` in case the actual type is defined in `$ref` referent.
   * Secondary, {@link updateFieldTypes} gathers the `type` declaration by walking through the `$ref` and update
   * the `type` of fields and type fragments accordingly. This readahead step of the field type is necessary for
   * JSON support to avoid {@link JsonSchemaField} recreation when a fragment is adopted at
   * {@link DocumentUtilService.adoptTypeFragment}.
   * After these 2 steps processing, this method returns the generated {@link JsonSchemaDocument} object.
   *
   * @param documentType
   * @param documentId
   * @param content
   */
  static createJsonSchemaDocument(documentType: DocumentType, documentId: string, content: string) {
    const jsonService = new JsonSchemaDocumentService(documentType, documentId, content);
    jsonService.populateFieldFromSchema(jsonService.jsonDocument, '', jsonService.jsonSchemaMetadata);
    jsonService.updateFieldTypes();
    return jsonService.jsonDocument;
  }

  constructor(documentType: DocumentType, documentId: string, jsonSchemaContent: string) {
    this.jsonDocument = new JsonSchemaDocument(documentType, documentId);
    this.jsonSchemaMetadata = JsonSchemaDocumentService.parseJsonSchema(jsonSchemaContent);
  }

  public jsonDocument: JsonSchemaDocument;
  public jsonSchemaMetadata: JSONSchemaMetadata;

  /**
   * Step 1 : Populates fields into {@link JsonSchemaDocument}. If `$ref` is used in the schema,
   * {@link updateFieldTypes} has to be processed after this one to reflect the field types inherited through `$ref`.
   * This is also used to enrich field metadata with schema composition, thus it first looks for an existing field
   * and enrich it if it already exists, otherwise create a new one.
   *
   * @see updateFieldTypes
   */
  private populateFieldFromSchema(
    parent: JsonSchemaParentType,
    propName: string,
    schema: JSONSchemaMetadata,
  ): JsonSchemaField {
    const fieldType = this.electFieldTypeFromSchema(schema);
    let field = parent.fields.find((f) => f.key === propName);
    if (!field) {
      field = new JsonSchemaField(parent, propName, fieldType);
      parent.fields.push(field);
      this.jsonDocument.totalFieldCount++;
    } else if (field.type === Types.AnyType && fieldType !== Types.AnyType) {
      field = this.ensureFieldType(field, fieldType);
    }

    if (schema.$ref) {
      if (!schema.$ref.startsWith('#')) {
        throw new Error(
          `Unsupported schema reference [${schema.$ref}]: External URI/file reference is not yet supported`,
        );
      }

      field.namedTypeFragmentRefs.push(schema.$ref);
    }
    if (schema.required) {
      field.required.push(...schema.required);
    }

    this.populateTypeFragmentsFromDefinition(field, schema);

    if (fieldType === Types.Array) {
      this.populateArrayItems(field, schema);
    } else if (fieldType === Types.Container) {
      this.populateObjectProperties(field, schema);
    }

    return this.updateFieldFromComposition(field, schema);
  }

  /**
   * Elects one corresponding {@link Types} of the schema. If `type` is not explicitly specified,
   * It looks for `items` to make it {@link Types.Array} and `properties` to make it {@link Types.Container}.
   * If the `type` is specified, elect one corresponding {@link Types} out of it. Note that JSON schema `type`
   * could be an array, but current version of DataMapper doesn't support array types, thus it needs to choose
   * one. The precedence order is {@link Types.Array} > {@link Types.Container} > {@link Types.String} >
   * {@link Types.Numeric} > {@link Types.Boolean}.
   * @param schema
   * @private
   */
  private electFieldTypeFromSchema(schema: JSONSchemaMetadata): Types {
    if (!schema.type) {
      if (schema.items) return Types.Array;
      else if (schema.properties) return Types.Container;

      return Types.AnyType;
    }

    const typesArray = Array.isArray(schema.type) ? schema.type : [schema.type];

    // choose one field type
    // what do we want to do with `null` type? there might be something to do in UI
    // for if it's nillable or not... need to support an array of field types first
    if (typesArray.includes('array')) return Types.Array;
    if (typesArray.includes('object')) return Types.Container;
    if (typesArray.includes('string')) return Types.String;
    // treat JSON Schema integer distinctly so toXsltTypeName(Types.Integer) path is exercised
    if (typesArray.includes('integer')) return Types.Integer;
    if (typesArray.includes('number')) return Types.Numeric;
    if (typesArray.includes('boolean')) return Types.Boolean;

    return Types.AnyType;
  }

  /**
   * Parse JSON schema `$ref` and `definitions` and populate them as {@link JsonSchemaTypeFragment}.
   * @param parent
   * @param schema
   * @private
   */
  private populateTypeFragmentsFromDefinition(parent: JsonSchemaParentType, schema: JSONSchemaMetadata) {
    const definitions = { ...schema.$defs, ...schema.definitions };
    for (const [definitionName, definitionSchema] of Object.entries(definitions)) {
      if (typeof definitionSchema === 'boolean' || Object.keys(definitionSchema).length === 0) return;
      const path =
        schema.path + (schema.$defs && definitionName in schema.$defs ? '/$defs/' : '/definitions/') + definitionName;
      const definitionSchemaMeta = { ...definitionSchema, path: path };
      this.jsonDocument.namedTypeFragments[path] = this.doCreateFragmentFromJSONSchema(parent, definitionSchemaMeta);
    }
  }

  private doCreateFragmentFromJSONSchema(
    parent: JsonSchemaParentType,
    schemaMeta: JSONSchemaMetadata,
  ): JsonSchemaTypeFragment {
    const type = this.electFieldTypeFromSchema(schemaMeta);

    // create a temporary field, get it populated with fragment children
    const field: JsonSchemaField = new JsonSchemaField(parent, '', type);
    field.namedTypeFragmentRefs = schemaMeta.$ref ? [schemaMeta.$ref] : [];

    if (type === Types.Array) {
      this.populateArrayItems(field, schemaMeta);
    } else if (type === Types.Container) {
      this.populateObjectProperties(field, schemaMeta);
    }

    const updatedField = this.updateFieldFromComposition(field, schemaMeta);

    return {
      type: updatedField.type,
      fields: updatedField.fields,
      namedTypeFragmentRefs: updatedField.namedTypeFragmentRefs,
    };
  }

  /**
   * Populate array children from `items` if a same name field doesn't yet exist, or update the existing field.
   * @param field
   * @param schema
   * @private
   */
  private populateArrayItems(field: JsonSchemaField, schema: JSONSchemaMetadata) {
    if (!schema.items) return;

    const path = schema.path + '/items';
    const arrayItems = Array.isArray(schema.items) ? schema.items : [schema.items];
    arrayItems.forEach((item) => this.populateFieldFromJSONSchemaDefinition(field, path, '', item));

    field.fields.forEach((field) => {
      // could an array item be required?
      field.minOccurs = 0;
      field.maxOccurs = Number.MAX_SAFE_INTEGER;
    });
  }

  /**
   * A thin wrapper over {@link populateFieldFromSchema} to handle boolean schema definition, which only indicates the
   * existence of the property, but the details of the property such as `type` is defined in the composition.
   * @param parent
   * @param parentPath
   * @param fieldKey
   * @param schemaDef
   * @private
   */
  private populateFieldFromJSONSchemaDefinition(
    parent: JsonSchemaParentType,
    parentPath: string,
    fieldKey: string,
    schemaDef: JSONSchema7Definition,
  ): JsonSchemaField {
    if (typeof schemaDef === 'boolean' || Object.keys(schemaDef).length === 0) {
      // boolean or empty schema means it inherits from the composition, deferring to enrich it with composition
      const existing = parent.fields.find((f) => f.key === fieldKey && f.type === Types.AnyType);
      if (existing) return existing;

      const field = new JsonSchemaField(parent, fieldKey, Types.AnyType);
      parent.fields.push(field);
      this.jsonDocument.totalFieldCount++;
      return field;
    }

    return this.populateFieldFromSchema(parent, fieldKey, {
      ...schemaDef,
      path: parentPath,
    });
  }

  /**
   * Populate object children from `properties` if a same name field doesn't yet exist, or update the existing field.
   * @param field
   * @param schema
   * @private
   */
  private populateObjectProperties(field: JsonSchemaField, schema: JSONSchemaMetadata) {
    if (!schema.properties) return;

    const path = schema.path + '/properties';
    Object.entries(schema.properties).forEach(([childName, propSchemaDef]) =>
      this.populateFieldFromJSONSchemaDefinition(field, path, childName, propSchemaDef),
    );

    field.fields.forEach((subField) => {
      subField.minOccurs = schema.required?.includes(subField.key) ? 1 : 0;
    });
  }

  /**
   * Looks into the schema compositions - `anyOf`, `oneOf`, `allOf` - and update fields where needed.
   * For now this adds everything as fields flatly, regardless of the restriction `anyOf` and `oneOf` has.
   * Revisit this when we need to do something specific to `anyOf` and `oneOf`. Also, `not` is completely skipped
   * at this moment. If we want to do something with `not` then it would also need some change here.
   * @param field
   * @param schema
   */
  private updateFieldFromComposition(field: JsonSchemaField, schema: JSONSchemaMetadata): JsonSchemaField {
    let updated = schema.anyOf?.reduce(
      (current, compositionSchemaDef) =>
        this.doUpdateWithJSONSchemaDefinition(current, compositionSchemaDef, schema.path + '/anyOf'),
      field,
    );
    updated = schema.oneOf?.reduce(
      (current, compositionSchemaDef) =>
        this.doUpdateWithJSONSchemaDefinition(current, compositionSchemaDef, schema.path + '/oneOf'),
      updated ?? field,
    );
    updated = schema.allOf?.reduce(
      (current, compositionSchemaDef) =>
        this.doUpdateWithJSONSchemaDefinition(current, compositionSchemaDef, schema.path + '/allOf'),
      updated ?? field,
    );
    return updated ?? field;
  }

  private doUpdateWithJSONSchemaDefinition(
    field: JsonSchemaField,
    schemaDef: JSONSchema7Definition,
    schemaPath: string,
  ): JsonSchemaField {
    if (typeof schemaDef === 'boolean' || Object.keys(schemaDef).length === 0) return field;
    if (schemaDef.$ref) {
      if (!schemaDef.$ref.startsWith('#')) {
        throw new Error(
          `Unsupported schema reference [${schemaDef.$ref}]: External URI/file reference is not yet supported`,
        );
      }

      field.namedTypeFragmentRefs.push(schemaDef.$ref);
    }

    const schemaMeta = { ...schemaDef, path: schemaPath };
    schemaDef.definitions && this.populateTypeFragmentsFromDefinition(field, schemaMeta);

    const type = this.electFieldTypeFromSchema(schemaMeta);

    let updatedField = field;
    // update field type if necessary
    if (type === Types.Array) {
      updatedField = this.ensureFieldType(updatedField, Types.Array);
      this.populateArrayItems(updatedField, schemaMeta);
    } else if (type === Types.Container && updatedField.type !== Types.Array) {
      updatedField = this.ensureFieldType(updatedField, Types.Container);
      this.populateObjectProperties(updatedField, schemaMeta);
    } else if (updatedField.type === Types.AnyType) {
      updatedField = this.ensureFieldType(updatedField, type);
    }

    return this.updateFieldFromComposition(updatedField, schemaMeta);
  }

  private ensureFieldType(field: JsonSchemaField, type: Types): JsonSchemaField {
    if (field.type === type) return field;

    const answer = new JsonSchemaField(field.parent, field.key, type);
    field.parent.fields = field.parent.fields.map((orig) => (orig === field ? answer : orig));
    return field.copyTo(answer);
  }

  /**
   * Step 2 : Walks through the {@link JsonSchemaDocument} field tree and {@link JsonSchemaDocument.namedTypeFragments},
   * and then resolves `type` through `$ref`. If the `type` is already defined at the referrer, the referrer
   * `type` wins over the one on referent. Therefore, the `type` is propagated only if the referrer doesn't have an
   * explicit type, nor implicit clue like having `items` (array) or `properties` (object).
   * Fields and type fragments have to be populated with {@link populateFieldFromSchema} before this one is processed.
   *
   * @see populateFieldFromSchema
   */
  private updateFieldTypes() {
    const updatedFragmentEntries = Object.entries(this.jsonDocument.namedTypeFragments).map(([ref, fragment]) => {
      const updated = this.doUpdateFieldType(fragment);
      return [ref, updated];
    });
    this.jsonDocument.namedTypeFragments = Object.fromEntries(updatedFragmentEntries);

    const updatedFields = this.jsonDocument.fields.map((field) => this.doUpdateFieldType(field));
    this.jsonDocument.fields = updatedFields as JsonSchemaField[];
  }

  private doUpdateFieldType(
    fragment: JsonSchemaField | JsonSchemaTypeFragment,
  ): JsonSchemaField | JsonSchemaTypeFragment {
    const traversedType = this.traverseFieldType(fragment);
    let updatedFragment = fragment;
    if (fragment instanceof JsonSchemaField) {
      updatedFragment = this.ensureFieldType(fragment, traversedType);
    } else {
      updatedFragment.type = traversedType;
    }

    updatedFragment.fields = updatedFragment.fields.map((field) => this.doUpdateFieldType(field)) as JsonSchemaField[];

    if (updatedFragment.type === Types.Array) {
      updatedFragment.fields.forEach((subField) => {
        // could an array item be required?
        subField.minOccurs = 0;
        subField.maxOccurs = Number.MAX_SAFE_INTEGER;
      });
    } else if (updatedFragment.type === Types.Container) {
      updatedFragment.fields.forEach((subField) => {
        subField.minOccurs = updatedFragment.required?.includes(subField.key) ? 1 : 0;
        subField.maxOccurs = 1;
      });
    }

    return updatedFragment;
  }

  private traverseFieldType(fragment: JsonSchemaField | JsonSchemaTypeFragment): Types {
    if (fragment.type && fragment.type !== Types.AnyType) return fragment.type;

    for (const ref of fragment.namedTypeFragmentRefs) {
      const subFragment = this.jsonDocument.namedTypeFragments[ref];
      const subType = this.traverseFieldType(subFragment);
      if (subType !== Types.AnyType) return subType;
    }

    return Types.AnyType;
  }
}
