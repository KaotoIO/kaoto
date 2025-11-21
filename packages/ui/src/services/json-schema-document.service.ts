import { JSONSchema7, JSONSchema7Definition } from 'json-schema';

import { BODY_DOCUMENT_ID, DocumentDefinition } from '../models/datamapper';
import { DocumentType } from '../models/datamapper/document';
import { Types } from '../models/datamapper/types';
import { QName } from '../xml-schema-ts/QName';
import { DocumentUtilService } from './document-util.service';
import type {
  JSONSchemaMetadata,
  JsonSchemaParentType,
  JsonSchemaTypeFragment,
} from './json-schema-document-model.service';
import { JsonSchemaDocument, JsonSchemaField } from './json-schema-document-model.service';
import { JsonSchemaDocumentUtilService } from './json-schema-document-util.service';

/**
 * The collection of JSON schema handling logic. {@link createJsonSchemaDocument} consumes JSON schema
 * file and generate a {@link JsonSchemaDocument} object.
 *
 * @see JsonSchemaDocumentUtilService
 */
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
   * @param definition The DocumentDefinition containing schema information
   */
  static createJsonSchemaDocument(definition: DocumentDefinition) {
    const documentType = definition.documentType;
    const docId = definition.documentType === DocumentType.PARAM ? definition.name! : BODY_DOCUMENT_ID;

    const filePaths = Object.keys(definition.definitionFiles || {});
    if (filePaths.length === 0) {
      throw new Error('No schema files provided in DocumentDefinition');
    }

    const fileContent = definition.definitionFiles![filePaths[0]];

    const jsonService = new JsonSchemaDocumentService(documentType, docId, fileContent);
    jsonService.populateFieldFromSchema(jsonService.jsonDocument, '', jsonService.jsonSchemaMetadata);
    jsonService.updateFieldTypes();

    const document = jsonService.jsonDocument;

    if (definition.fieldTypeOverrides?.length && definition.fieldTypeOverrides.length > 0) {
      DocumentUtilService.applyFieldTypeOverrides(
        document,
        definition.fieldTypeOverrides,
        definition.namespaceMap || {},
        JsonSchemaDocumentUtilService.parseTypeOverride,
      );
    }

    return document;
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
      const refQName = new QName(null, schema.$ref);
      field.typeQName = refQName;
      field.originalTypeQName = refQName;
    } else if (schema.type) {
      const typeArray = Array.isArray(schema.type) ? schema.type : [schema.type];
      const typeString = typeArray[0];
      const typeQName = new QName(null, typeString);
      field.typeQName = typeQName;
      field.originalTypeQName = typeQName;
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
