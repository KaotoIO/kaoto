import { DocumentType } from '../models/datamapper/path';
import { BaseDocument, BaseField, DocumentDefinitionType, ITypeFragment, Types } from '../models/datamapper';
import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { DocumentService } from './document.service';
import { getCamelRandomId } from '../camel-utils/camel-random-id';

export interface JsonSchemaTypeFragment extends ITypeFragment {
  fields: JsonSchemaField[];
}

export interface JSONSchemaMetadata extends JSONSchema7 {
  path: string;
}

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
 */
export class JsonSchemaField extends BaseField {
  fields: JsonSchemaField[] = [];
  namespaceURI: string | null = 'http://www.w3.org/2005/xpath-functions';
  namespacePrefix: string | null = 'xf';
  isAttribute = false;

  constructor(
    public parent: JsonSchemaParentType,
    public name: string,
    type: Types,
  ) {
    super(parent, DocumentService.getOwnerDocument<JsonSchemaDocument>(parent), name);
    this.type = type;
  }

  public get type() {
    return this._type;
  }

  public set type(type: Types) {
    this._type = type;
    // Set the field expression with XSLT3 lossless representation of the JSON,
    // which is directly used for XPath
    const nameQuery = this.name ? `[@key='${this.name}']` : '';
    switch (type) {
      case Types.String:
        this.expression = `${this.namespacePrefix}:string${nameQuery}`;
        this.id = getCamelRandomId(`field-${this.name ? this.name : 'string'}`, 4);
        break;
      case Types.Numeric:
        this.expression = `${this.namespacePrefix}:number${nameQuery}`;
        this.id = getCamelRandomId(`field-${this.name ? this.name : 'number'}`, 4);
        break;
      case Types.Boolean:
        this.expression = `${this.namespacePrefix}:boolean${nameQuery}`;
        this.id = getCamelRandomId(`field-${this.name ? this.name : 'boolean'}`, 4);
        break;
      case Types.Container:
        this.expression = `${this.namespacePrefix}:map${nameQuery}`;
        this.id = getCamelRandomId(`field-${this.name ? this.name : 'map'}`, 4);
        break;
      case Types.Array:
        this.expression = `${this.namespacePrefix}:array${nameQuery}`;
        this.id = getCamelRandomId(`field-${this.name ? this.name : 'array'}`, 4);
        break;
      default:
        this.expression = this.name;
        this.id = getCamelRandomId(`field-${this.name ? this.name : 'any'}`, 4);
    }
  }
}

export class JsonSchemaDocumentService {
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
      JsonSchemaDocumentService.enrichFieldFromComposition(field, schema);
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
      subField.minOccurs = schema.required?.includes(subField.name) ? 1 : 0;
    });
    JsonSchemaDocumentService.enrichFieldFromComposition(field, schema);
  }

  private static populateTypeFragmentFromDefinition(parent: JsonSchemaParentType, schema: JSONSchemaMetadata) {
    const ownerDocument = DocumentService.getOwnerDocument<JsonSchemaDocument>(parent);
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
    fieldName: string,
    schemaDef: JSONSchema7Definition,
  ) {
    const existingField = parent.fields.find((field) => field.name === fieldName);
    if (existingField) {
      JsonSchemaDocumentService.doEnrichWithJSONSchemaDefinition(
        existingField,
        schemaDef,
        parentPath + `/${existingField.name}`,
      );
      return;
    }

    if (typeof schemaDef === 'boolean' || Object.keys(schemaDef).length === 0) {
      // boolean or empty schema means it inherits from the composition, deferring to enrich it with composition
      const field = new JsonSchemaField(parent, fieldName, Types.AnyType);
      parent.fields.push(field);
      return;
    }

    const field = JsonSchemaDocumentService.createFieldFromJSONSchema(parent, fieldName, {
      ...schemaDef,
      path: parentPath,
    });
    parent.fields.push(field);
  }

  private static enrichFieldFromComposition(field: JsonSchemaField, schema: JSONSchemaMetadata) {
    schema.anyOf?.forEach((compositionSchemaDef) =>
      JsonSchemaDocumentService.doEnrichWithJSONSchemaDefinition(field, compositionSchemaDef, schema.path + '/anyOf'),
    );
    schema.oneOf?.forEach((compositionSchemaDef) =>
      JsonSchemaDocumentService.doEnrichWithJSONSchemaDefinition(field, compositionSchemaDef, schema.path + '/oneOf'),
    );
    schema.allOf?.forEach((compositionSchemaDef) =>
      JsonSchemaDocumentService.doEnrichWithJSONSchemaDefinition(field, compositionSchemaDef, schema.path + '/allOf'),
    );
  }

  private static doEnrichWithJSONSchemaDefinition(
    field: JsonSchemaField,
    schemaDef: JSONSchema7Definition,
    schemaPath: string,
  ) {
    if (typeof schemaDef === 'boolean' || Object.keys(schemaDef).length === 0) return;
    schemaDef.$ref && field.namedTypeFragmentRefs.push(schemaDef.$ref);

    const schemaMeta = { ...schemaDef, path: schemaPath };
    schemaDef.definitions && JsonSchemaDocumentService.populateTypeFragmentFromDefinition(field, schemaMeta);

    const types = JsonSchemaDocumentService.getSchemaTypes(schemaMeta);

    // update field type if necessary
    if (types.includes('array')) {
      field.type = Types.Array;
      JsonSchemaDocumentService.populateArrayItems(field, schemaMeta);
    } else if (types.includes('object') && field.type !== Types.Array) {
      field.type = Types.Container;
      JsonSchemaDocumentService.populateObjectProperties(field, schemaMeta);
    } else if (![Types.Array, Types.Container].includes(field.type)) {
      if (types.includes('string')) {
        field.type = Types.String;
      } else if (types.includes('number') && field.type !== Types.String) {
        field.type = Types.Numeric;
      } else if (types.includes('boolean') && ![Types.String, Types.Numeric].includes(field.type)) {
        field.type = Types.Boolean;
      }
    }

    JsonSchemaDocumentService.enrichFieldFromComposition(field, schemaMeta);
  }
}
