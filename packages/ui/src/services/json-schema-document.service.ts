import { JSONSchema7Definition } from 'json-schema';

import { DocumentDefinition } from '../models/datamapper';
import { Types } from '../models/datamapper/types';
import { QName } from '../xml-schema-ts/QName';
import { DocumentUtilService } from './document-util.service';
import type { JsonSchemaAnalysisReport } from './json-schema-analysis.service';
import { JsonSchemaAnalysisService } from './json-schema-analysis.service';
import {
  CreateJsonSchemaDocumentResult,
  JsonSchemaCollection,
  JsonSchemaDocument,
  JsonSchemaField,
  JsonSchemaMetadata,
  JsonSchemaParentType,
  JsonSchemaReference,
  JsonSchemaTypeFragment,
} from './json-schema-document.model';
import { JsonSchemaDocumentUtilService } from './json-schema-document-util.service';
import { JsonSchemaTypesService } from './json-schema-types.service';

/**
 * The collection of JSON schema handling logic. {@link createJsonSchemaDocument} consumes JSON schema
 * file and generate a {@link JsonSchemaDocument} object.
 *
 * @see JsonSchemaDocumentUtilService
 */
export class JsonSchemaDocumentService {
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
   * @returns CreateJsonSchemaDocumentResult with document and validation status
   */
  static createJsonSchemaDocument(definition: DocumentDefinition): CreateJsonSchemaDocumentResult {
    const filePaths = Object.keys(definition.definitionFiles || {});
    if (filePaths.length === 0) {
      return {
        validationStatus: 'error',
        errors: [{ message: 'No schema files provided in DocumentDefinition' }],
        documentDefinition: definition,
      };
    }

    const schemas: JsonSchemaMetadata[] = [];

    for (const filePath of filePaths) {
      const fileContent = definition.definitionFiles![filePath];
      const metadata = JsonSchemaDocumentUtilService.parseJsonSchema(fileContent, filePath);
      schemas.push(metadata);
    }

    let primarySchema = schemas[0];
    if (definition.rootElementChoice?.name) {
      const found = schemas.find(
        (s) => s.filePath === definition.rootElementChoice!.name || s.identifier === definition.rootElementChoice!.name,
      );
      if (!found) {
        return {
          validationStatus: 'error',
          errors: [
            { message: `Primary schema file '${definition.rootElementChoice.name}' not found in loaded schemas` },
          ],
          documentDefinition: definition,
        };
      }
      primarySchema = found;
    }

    const analysisResult = JsonSchemaAnalysisService.analyze(schemas, definition.definitionFiles);

    if (analysisResult.errors.length > 0) {
      return {
        validationStatus: 'error',
        errors: analysisResult.errors,
        warnings: analysisResult.warnings,
        documentDefinition: definition,
      };
    }

    JsonSchemaDocumentService.populateDependencyMetadata(schemas, analysisResult);

    const jsonDocument = new JsonSchemaDocument(definition);
    jsonDocument.schemaCollection.setDefinitionFiles(definition.definitionFiles || {});

    for (const schema of schemas) {
      JsonSchemaDocumentService.registerSchemaWithAliases(jsonDocument.schemaCollection, schema);
    }

    const jsonService = new JsonSchemaDocumentService(jsonDocument);
    jsonService.populateFieldFromSchema(jsonDocument, '', primarySchema);
    jsonService.updateFieldTypes();

    const document = jsonDocument;

    DocumentUtilService.processOverrides(
      document,
      definition.fieldTypeOverrides ?? [],
      definition.choiceSelections ?? [],
      definition.namespaceMap || {},
      JsonSchemaTypesService.parseTypeOverride,
    );

    const validationWarnings = analysisResult.warnings;
    const validationStatus = validationWarnings.length > 0 ? 'warning' : 'success';

    return {
      validationStatus,
      warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
      documentDefinition: definition,
      document,
      rootElementOptions: [],
    };
  }

  /**
   * Adds additional schema files to an existing document's schema collection.
   * This is useful when field type overrides reference types defined in additional schema files.
   * @param document - The document whose schema collection will be updated
   * @param additionalFiles - Map of file paths to file contents to add
   * @returns Empty namespace map (JSON Schema doesn't use namespaces, but this maintains API consistency)
   */
  static addSchemaFiles(document: JsonSchemaDocument, additionalFiles: Record<string, string>): Record<string, string> {
    const collection = document.schemaCollection;

    collection.addDefinitionFiles(additionalFiles);

    for (const [filePath, fileContent] of Object.entries(additionalFiles)) {
      try {
        const metadata = JsonSchemaDocumentUtilService.parseJsonSchema(fileContent, filePath);
        JsonSchemaDocumentService.registerSchemaWithAliases(collection, metadata);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to add schema file "${filePath}": ${errorMessage}`);
      }
    }

    return {};
  }

  /**
   * Removes a schema file from the definition and re-creates the document with updated analysis.
   * The original definition is not mutated. The returned result always contains the updated
   * {@link DocumentDefinition} even when validation fails, so callers can continue working with it
   * (e.g. adding replacement files).
   *
   * @param definition - The current document definition containing schema files
   * @param filePath - The key of the schema file to remove from {@link DocumentDefinition.definitionFiles}
   * @returns A {@link CreateJsonSchemaDocumentResult} with updated validation status, errors/warnings, and definition
   */
  static removeSchemaFile(definition: DocumentDefinition, filePath: string): CreateJsonSchemaDocumentResult {
    const updatedFiles = { ...definition.definitionFiles };
    delete updatedFiles[filePath];

    const updatedDefinition = new DocumentDefinition(
      definition.documentType,
      definition.definitionType,
      definition.name,
      updatedFiles,
      definition.rootElementChoice,
      definition.fieldTypeOverrides,
      definition.choiceSelections,
      definition.namespaceMap,
    );

    // Try to create the Document object. It could fail if the primary schema is the removed schema file.
    // In that case, we unset updatedDefinition.rootElementChoice and retry.
    const result = JsonSchemaDocumentService.createJsonSchemaDocument(updatedDefinition);

    // If it succeeds or a primary schema not set, return as it is
    if (result.document || !definition.rootElementChoice) {
      return result;
    }

    // Unset the primary schema and retry
    updatedDefinition.rootElementChoice = undefined;
    return JsonSchemaDocumentService.createJsonSchemaDocument(updatedDefinition);
  }

  private static populateDependencyMetadata(
    schemas: JsonSchemaMetadata[],
    analysisResult: JsonSchemaAnalysisReport,
  ): void {
    for (const schema of schemas) {
      const node = analysisResult.nodes.get(schema.identifier);
      if (!node) continue;

      const uniqueOutbound = new Set<string>();
      for (const edge of node.outbound) {
        if (edge.from !== edge.to) {
          uniqueOutbound.add(edge.to);
        }
      }
      schema.schemaDependencies = [...uniqueOutbound];
      schema.schemaDependents = node.inbound.map((e) => e.from);
    }
  }

  private static registerSchemaWithAliases(collection: JsonSchemaCollection, schema: JsonSchemaMetadata): void {
    collection.addJsonSchema(schema);

    const aliases: string[] = [];
    if (schema.$id && schema.$id !== schema.filePath) {
      aliases.push(schema.filePath);
    }
    const relativePath = './' + schema.filePath;
    if (relativePath !== schema.filePath) {
      aliases.push(relativePath);
    }
    if (aliases.length > 0) {
      collection.addAlias(schema.identifier, ...aliases);
    }
  }

  constructor(private readonly jsonDocument: JsonSchemaDocument) {}

  private populateExternalTypeFragment(ref: JsonSchemaReference): void {
    const fullRef = ref.getFullReference();

    if (this.jsonDocument.namedTypeFragments[fullRef]) {
      return;
    }

    const definition = JsonSchemaDocumentUtilService.resolveJsonSchemaReference(ref);

    if (!definition || typeof definition === 'boolean') {
      throw new Error(`Cannot resolve definition at ${fullRef}: Path not found or empty definition`);
    }

    const defSchemaMeta: JsonSchemaMetadata = {
      ...definition,
      identifier: ref.getSchema().identifier,
      filePath: ref.getSchema().filePath,
      path: fullRef,
    };

    this.jsonDocument.namedTypeFragments[fullRef] = this.doCreateFragmentFromJSONSchema(
      this.jsonDocument,
      defSchemaMeta,
    );
  }

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
    schema: JsonSchemaMetadata,
  ): JsonSchemaField {
    const fieldType = JsonSchemaDocumentUtilService.electFieldTypeFromSchema(schema);
    const field = this.findOrCreateField(parent, propName, fieldType);

    if (schema.$ref) {
      this.handleSchemaRef(field, schema.$ref, schema);
      this.assignRefTypeQName(field, schema.$ref);
    } else {
      this.assignTypeMetadata(field, schema);
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
   * Parse JSON schema `$ref` and `definitions` and populate them as {@link JsonSchemaTypeFragment}.
   * @param parent
   * @param schema
   * @private
   */
  private populateTypeFragmentsFromDefinition(parent: JsonSchemaParentType, schema: JsonSchemaMetadata) {
    const definitions = { ...schema.$defs, ...schema.definitions };
    for (const [definitionName, definitionSchema] of Object.entries(definitions)) {
      if (typeof definitionSchema === 'boolean' || Object.keys(definitionSchema).length === 0) return;
      const path =
        schema.path + (schema.$defs && definitionName in schema.$defs ? '/$defs/' : '/definitions/') + definitionName;
      const definitionSchemaMeta: JsonSchemaMetadata = {
        ...definitionSchema,
        identifier: schema.identifier,
        filePath: schema.filePath,
        path: path,
      };
      this.jsonDocument.namedTypeFragments[path] = this.doCreateFragmentFromJSONSchema(parent, definitionSchemaMeta);
    }
  }

  private doCreateFragmentFromJSONSchema(
    parent: JsonSchemaParentType,
    schemaMeta: JsonSchemaMetadata,
  ): JsonSchemaTypeFragment {
    const type = JsonSchemaDocumentUtilService.electFieldTypeFromSchema(schemaMeta);

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
  private populateArrayItems(field: JsonSchemaField, schema: JsonSchemaMetadata) {
    if (!schema.items) return;

    const itemsSchema: JsonSchemaMetadata = {
      ...schema,
      path: schema.path + '/items',
    };
    const arrayItems = Array.isArray(schema.items) ? schema.items : [schema.items];
    arrayItems.forEach((item) => this.populateFieldFromJSONSchemaDefinition(field, itemsSchema, '', item));

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
   * @param schemaContext
   * @param fieldKey
   * @param schemaDef
   * @private
   */
  private populateFieldFromJSONSchemaDefinition(
    parent: JsonSchemaParentType,
    schemaContext: JsonSchemaMetadata,
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
      identifier: schemaContext.identifier,
      filePath: schemaContext.filePath,
      path: schemaContext.path,
    });
  }

  /**
   * Populate object children from `properties` if a same name field doesn't yet exist, or update the existing field.
   * @param field
   * @param schema
   * @private
   */
  private populateObjectProperties(field: JsonSchemaField, schema: JsonSchemaMetadata) {
    if (!schema.properties) return;

    const propertiesSchema: JsonSchemaMetadata = {
      ...schema,
      path: schema.path + '/properties',
    };
    Object.entries(schema.properties).forEach(([childName, propSchemaDef]) =>
      this.populateFieldFromJSONSchemaDefinition(field, propertiesSchema, childName, propSchemaDef),
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
  private updateFieldFromComposition(field: JsonSchemaField, schema: JsonSchemaMetadata): JsonSchemaField {
    const anyOfSchema: JsonSchemaMetadata = { ...schema, path: schema.path + '/anyOf' };
    const oneOfSchema: JsonSchemaMetadata = { ...schema, path: schema.path + '/oneOf' };
    const allOfSchema: JsonSchemaMetadata = { ...schema, path: schema.path + '/allOf' };

    let updated = schema.anyOf?.reduce(
      (current, compositionSchemaDef) =>
        this.doUpdateWithJSONSchemaDefinition(current, compositionSchemaDef, anyOfSchema),
      field,
    );
    updated = schema.oneOf?.reduce(
      (current, compositionSchemaDef) =>
        this.doUpdateWithJSONSchemaDefinition(current, compositionSchemaDef, oneOfSchema),
      updated ?? field,
    );
    updated = schema.allOf?.reduce(
      (current, compositionSchemaDef) =>
        this.doUpdateWithJSONSchemaDefinition(current, compositionSchemaDef, allOfSchema),
      updated ?? field,
    );
    return updated ?? field;
  }

  private doUpdateWithJSONSchemaDefinition(
    field: JsonSchemaField,
    schemaDef: JSONSchema7Definition,
    schemaContext: JsonSchemaMetadata,
  ): JsonSchemaField {
    if (typeof schemaDef === 'boolean' || Object.keys(schemaDef).length === 0) return field;

    if (schemaDef.$ref) {
      this.handleSchemaRef(field, schemaDef.$ref, schemaContext);
    }

    const schemaMeta: JsonSchemaMetadata = {
      ...schemaDef,
      identifier: schemaContext.identifier,
      filePath: schemaContext.filePath,
      path: schemaContext.path,
    };
    schemaDef.definitions && this.populateTypeFragmentsFromDefinition(field, schemaMeta);

    const type = JsonSchemaDocumentUtilService.electFieldTypeFromSchema(schemaMeta);
    const updatedField = this.updateFieldByType(field, type, schemaMeta);

    return this.updateFieldFromComposition(updatedField, schemaMeta);
  }

  private ensureFieldType(field: JsonSchemaField, type: Types): JsonSchemaField {
    if (field.type === type) return field;

    const answer = new JsonSchemaField(field.parent, field.key, type);
    field.parent.fields = field.parent.fields.map((orig) => (orig === field ? answer : orig));
    return field.copyTo(answer);
  }

  private handleSchemaRef(field: JsonSchemaField, ref: string, schemaContext: JsonSchemaMetadata): void {
    const resolved = JsonSchemaDocumentUtilService.createJsonSchemaReference(
      ref,
      schemaContext,
      this.jsonDocument.schemaCollection,
    );

    if (resolved) {
      const fullRef = resolved.isExternal() ? resolved.getFullReference() : ref;
      field.namedTypeFragmentRefs.push(fullRef);

      if (resolved.isExternal() && !this.jsonDocument.namedTypeFragments[fullRef]) {
        this.populateExternalTypeFragment(resolved);
      }
    }
  }

  private updateFieldByType(field: JsonSchemaField, type: Types, schemaMeta: JsonSchemaMetadata): JsonSchemaField {
    let updatedField = field;

    if (type === Types.Array) {
      updatedField = this.ensureFieldType(updatedField, Types.Array);
      this.populateArrayItems(updatedField, schemaMeta);
    } else if (type === Types.Container && updatedField.type !== Types.Array) {
      updatedField = this.ensureFieldType(updatedField, Types.Container);
      this.populateObjectProperties(updatedField, schemaMeta);
    } else if (updatedField.type === Types.AnyType) {
      updatedField = this.ensureFieldType(updatedField, type);
    }

    return updatedField;
  }

  private findOrCreateField(parent: JsonSchemaParentType, propName: string, fieldType: Types): JsonSchemaField {
    let field = parent.fields.find((f) => f.key === propName);

    if (!field) {
      field = new JsonSchemaField(parent, propName, fieldType);
      parent.fields.push(field);
      this.jsonDocument.totalFieldCount++;
    } else if (field.type === Types.AnyType && fieldType !== Types.AnyType) {
      field = this.ensureFieldType(field, fieldType);
    }

    return field;
  }

  private assignRefTypeQName(field: JsonSchemaField, ref: string): void {
    const refQName = new QName(null, ref);
    field.typeQName = refQName;
    field.originalTypeQName = refQName;
  }

  private assignTypeMetadata(field: JsonSchemaField, schema: JsonSchemaMetadata): void {
    if (schema.type) {
      const typeArray = Array.isArray(schema.type) ? schema.type : [schema.type];
      const typeString = typeArray[0];
      const typeQName = new QName(null, typeString);
      field.typeQName = typeQName;
      field.originalTypeQName = typeQName;
    }

    if (schema.required) {
      field.required.push(...schema.required);
    }
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
