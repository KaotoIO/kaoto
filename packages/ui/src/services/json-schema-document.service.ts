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

  constructor(
    public jsonSchema: JSONSchemaMetadata,
    documentType: DocumentType,
    documentId: string,
  ) {
    super(documentType, documentId);
    this.name = documentId;
    const field = JsonSchemaDocumentService.createFieldFromJSONSchema(this, '', this.jsonSchema);
    if (field.type !== Types.AnyType) {
      this.fields.push(field);
    }
    this.definitionType = DocumentDefinitionType.JSON_SCHEMA;
  }

  getReferenceId(_namespaceMap: { [prefix: string]: string }): string {
    // @FIXME Currently JSON body is not supported, i.e. it should be always a param.
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
 * object is represented by `xf:map` and array is represented by `xf:array` while the name is specified with
 * `key` attribute, such as `xf:map[@key='objectName']` and `xf:map[@key='arrayName']`. `xf:map` and `xf:array`
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
  namespacePrefix: string = 'xf';
  isAttribute = false;
  predicates: Predicate[] = [];

  constructor(
    public readonly parent: JsonSchemaParentType,
    public readonly key: string,
    public readonly type: Types,
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

  adopt(parent: IField) {
    if (!(parent instanceof JsonSchemaField)) return super.adopt(parent);

    const adopted = new JsonSchemaField(parent, this.name, this.type);
    this.copyTo(adopted);
    parent.fields.push(adopted);
    return adopted;
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
}

export class JsonSchemaDocumentService {
  static toXsltTypeName(type: Types): string {
    switch (type) {
      case Types.String:
        return 'string';
      case Types.Numeric:
        return 'number';
      case Types.Boolean:
        return 'boolean';
      case Types.Container:
        return 'map';
      case Types.Array:
        return 'array';
      case Types.AnyType:
        return 'any';
      default:
        return 'unknown';
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

  static createJsonSchemaDocument(documentType: DocumentType, documentId: string, content: string) {
    const schema = JsonSchemaDocumentService.parseJsonSchema(content);
    return new JsonSchemaDocument(schema, documentType, documentId);
  }

  static createFieldFromJSONSchema(
    parent: JsonSchemaParentType,
    propName: string,
    schema: JSONSchemaMetadata,
  ): JsonSchemaField {
    schema.definitions && JsonSchemaDocumentService.populateTypeFragmentFromDefinition(parent, schema);

    let field: JsonSchemaField;
    if (schema.$ref) {
      field = new JsonSchemaField(parent, propName, Types.AnyType);
      field.namedTypeFragmentRefs.push(schema.$ref);
      return field;
    }

    const types = JsonSchemaDocumentService.getSchemaTypes(schema);

    // choose one field type
    if (types.includes('array')) {
      field = new JsonSchemaField(parent, propName, Types.Array);
      JsonSchemaDocumentService.populateArrayItems(field, schema);
    } else if (types.includes('object')) {
      field = new JsonSchemaField(parent, propName, Types.Container);
      JsonSchemaDocumentService.populateObjectProperties(field, schema);
    } else {
      let fieldType: Types = Types.AnyType;
      if (types.includes('string')) fieldType = Types.String;
      else if (types.includes('number')) fieldType = Types.Numeric;
      else if (types.includes('boolean')) fieldType = Types.Boolean;
      field = new JsonSchemaField(parent, propName, fieldType);
      JsonSchemaDocumentService.updateFieldFromComposition(field, schema);
    }

    return field;
  }

  /**
   * If `type` is omitted, pick one of them by looking at the `properties` and `items`
   * @param schema
   * @private
   */
  private static getSchemaTypes(schema: JSONSchemaMetadata) {
    if (!schema.type) {
      if (schema.items) {
        return ['array'];
      } else if (schema.properties) {
        return ['object'];
      } else {
        return [];
      }
    }
    return Array.isArray(schema.type) ? schema.type : [schema.type];
  }

  private static populateArrayItems(field: JsonSchemaField, schema: JSONSchemaMetadata) {
    if (schema.items) {
      const path = schema.path + '/items';
      const arrayItems = Array.isArray(schema.items) ? schema.items : [schema.items];
      arrayItems.forEach((arrayItem) => {
        JsonSchemaDocumentService.populateFieldFromJSONSchemaDefinition(field, path, '', arrayItem);
      });
      field.fields.forEach((field) => {
        field.maxOccurs = Number.MAX_SAFE_INTEGER;
      });
    }
  }

  private static populateObjectProperties(field: JsonSchemaField, schema: JSONSchemaMetadata) {
    if (schema.properties) {
      const path = schema.path + '/properties';
      Object.entries(schema.properties).forEach(([childName, propSchemaDef]) => {
        JsonSchemaDocumentService.populateFieldFromJSONSchemaDefinition(field, path, childName, propSchemaDef);
      });
    }
    field.fields.forEach((subField) => {
      subField.minOccurs = schema.required?.includes(subField.key) ? 1 : 0;
    });
    JsonSchemaDocumentService.updateFieldFromComposition(field, schema);
  }

  private static populateTypeFragmentFromDefinition(parent: JsonSchemaParentType, schema: JSONSchemaMetadata) {
    const ownerDocument = ('ownerDocument' in parent ? parent.ownerDocument : parent) as JsonSchemaDocument;
    const definitions = { ...schema.$defs, ...schema.definitions };
    Object.entries(definitions).forEach(([definitionName, definitionSchema]) => {
      if (typeof definitionSchema === 'boolean' || Object.keys(definitionSchema).length === 0) return;
      const path =
        schema.path + (schema.$defs && definitionName in schema.$defs ? '/$defs/' : '/definitions/') + definitionName;
      const schemaMeta = { ...definitionSchema, path: path };
      const field = JsonSchemaDocumentService.createFieldFromJSONSchema(parent, '', schemaMeta);
      ownerDocument.namedTypeFragments[path] = {
        type: field.type,
        minOccurs: field.minOccurs,
        maxOccurs: field.maxOccurs,
        fields: field.fields,
        namedTypeFragmentRefs: [...field.namedTypeFragmentRefs],
      };
    });
  }

  private static populateFieldFromJSONSchemaDefinition(
    parent: JsonSchemaParentType,
    parentPath: string,
    fieldKey: string,
    schemaDef: JSONSchema7Definition,
  ) {
    const existingField = parent.fields.find((field) => field.key === fieldKey);
    if (existingField) {
      JsonSchemaDocumentService.doUpdateWithJSONSchemaDefinition(
        existingField,
        schemaDef,
        parentPath + `/${existingField.key}`,
      );
      return;
    }

    if (typeof schemaDef === 'boolean' || Object.keys(schemaDef).length === 0) {
      // boolean or empty schema means it inherits from the composition, deferring to enrich it with composition
      const field = new JsonSchemaField(parent, fieldKey, Types.AnyType);
      parent.fields.push(field);
      return;
    }

    const field = JsonSchemaDocumentService.createFieldFromJSONSchema(parent, fieldKey, {
      ...schemaDef,
      path: parentPath,
    });
    parent.fields.push(field);
  }

  private static updateFieldFromComposition(field: JsonSchemaField, schema: JSONSchemaMetadata): JsonSchemaField {
    let updated = schema.anyOf?.reduce(
      (current, compositionSchemaDef) =>
        JsonSchemaDocumentService.doUpdateWithJSONSchemaDefinition(
          current,
          compositionSchemaDef,
          schema.path + '/anyOf',
        ),
      field,
    );
    updated = schema.oneOf?.reduce(
      (current, compositionSchemaDef) =>
        JsonSchemaDocumentService.doUpdateWithJSONSchemaDefinition(
          current,
          compositionSchemaDef,
          schema.path + '/oneOf',
        ),
      updated ?? field,
    );
    updated = schema.allOf?.reduce(
      (current, compositionSchemaDef) =>
        JsonSchemaDocumentService.doUpdateWithJSONSchemaDefinition(
          current,
          compositionSchemaDef,
          schema.path + '/allOf',
        ),
      updated ?? field,
    );
    return updated ?? field;
  }

  private static doUpdateWithJSONSchemaDefinition(
    field: JsonSchemaField,
    schemaDef: JSONSchema7Definition,
    schemaPath: string,
  ): JsonSchemaField {
    if (typeof schemaDef === 'boolean' || Object.keys(schemaDef).length === 0) return field;
    schemaDef.$ref && field.namedTypeFragmentRefs.push(schemaDef.$ref);

    const schemaMeta = { ...schemaDef, path: schemaPath };
    schemaDef.definitions && JsonSchemaDocumentService.populateTypeFragmentFromDefinition(field, schemaMeta);

    const types = JsonSchemaDocumentService.getSchemaTypes(schemaMeta);

    let updatedField = field;
    // update field type if necessary
    if (types.includes('array')) {
      updatedField = JsonSchemaDocumentService.convertFieldType(updatedField, Types.Array);
      JsonSchemaDocumentService.populateArrayItems(updatedField, schemaMeta);
    } else if (types.includes('object') && updatedField.type !== Types.Array) {
      updatedField = JsonSchemaDocumentService.convertFieldType(updatedField, Types.Container);
      JsonSchemaDocumentService.populateObjectProperties(updatedField, schemaMeta);
    } else if (![Types.Array, Types.Container].includes(updatedField.type)) {
      let type: Types = updatedField.type;
      if (types.includes('string')) {
        type = Types.String;
      } else if (types.includes('number') && updatedField.type !== Types.String) {
        type = Types.Numeric;
      } else if (types.includes('boolean') && ![Types.String, Types.Numeric].includes(updatedField.type)) {
        type = Types.Boolean;
      }
      updatedField = JsonSchemaDocumentService.convertFieldType(updatedField, type);
    }

    JsonSchemaDocumentService.updateFieldFromComposition(updatedField, schemaMeta);
    return updatedField;
  }

  private static convertFieldType(field: JsonSchemaField, type: Types): JsonSchemaField {
    if (field.type === type) return field;

    const answer = new JsonSchemaField(field.parent, field.key, type);
    field.parent.fields = field.parent.fields.map((orig) => (orig === field ? answer : orig));
    return field.copyTo(answer);
  }

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
        f.type === type &&
        ((!namespaceURI && !f.namespaceURI) || f.namespaceURI === namespaceURI)
      );
    });
  }
}
