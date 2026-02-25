import { DocumentDefinition, IDocument, IField, PrimitiveDocument } from '../models/datamapper/document';
import { IChoiceSelection, IFieldTypeOverride } from '../models/datamapper/metadata';
import { IFieldTypeInfo, TypeOverrideVariant, Types } from '../models/datamapper/types';
import { DocumentUtilService, ParseTypeOverrideFn } from './document-util.service';
import { JsonSchemaDocument } from './json-schema-document.model';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { JsonSchemaTypesService } from './json-schema-types.service';
import { SchemaPathService } from './schema-path.service';
import { XmlSchemaDocument } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { XmlSchemaTypesService } from './xml-schema-types.service';

/**
 * Service for field type override operations.
 * Provides high-level orchestration for applying, removing, and managing type overrides.
 *
 * This service consolidates all field type override functionality in one place, reducing
 * code duplication and improving maintainability by eliminating if-XML/if-JSON patterns
 * scattered across multiple services.
 *
 * @example
 * ```typescript
 * // Get safe type override candidates for a field
 * const candidates = FieldTypeOverrideService.getSafeOverrideCandidates(field, namespaceMap);
 *
 * // Apply a type override
 * FieldTypeOverrideService.applyFieldTypeOverride(
 *   document,
 *   field,
 *   selectedCandidate,
 *   namespaceMap,
 *   TypeOverrideVariant.FORCE
 * );
 *
 * // Remove a type override
 * FieldTypeOverrideService.revertFieldTypeOverride(document, field, namespaceMap);
 * ```
 */
export class FieldTypeOverrideService {
  /**
   * Get safe type override candidates for a field.
   *
   * Safe overrides are type changes that maintain schema compatibility:
   * - For xs:anyType fields: Returns all available types (all are considered safe)
   * - For typed XML fields: Returns extensions and restrictions of the original type
   * - For JSON Schema fields: Returns empty Record (JSON Schema doesn't have type inheritance)
   *
   * This method delegates to the appropriate type service based on the document type.
   *
   * @param field - The field to get override candidates for
   * @param namespaceMap - Namespace prefix to URI mapping for qualified name resolution
   * @returns Record of type override candidates that can be safely applied to the field
   *
   * @example
   * ```typescript
   * const candidates = FieldTypeOverrideService.getSafeOverrideCandidates(field, namespaceMap);
   * // For xs:anyType field, returns all built-in + user-defined types
   * // For other XML types, returns extensions/restrictions of that type
   * // For JSON Schema types, returns empty Record
   * ```
   *
   * @see getAllOverrideCandidates
   * @see XmlSchemaTypesService.getTypeOverrideCandidatesForField
   * @see JsonSchemaTypesService.getTypeOverrideCandidatesForField
   */
  static getSafeOverrideCandidates(
    field: IField,
    namespaceMap: Record<string, string>,
  ): Record<string, IFieldTypeInfo> {
    if (field.originalType === Types.AnyType) {
      return FieldTypeOverrideService.getAllOverrideCandidates(field.ownerDocument, namespaceMap);
    }

    if (field.ownerDocument instanceof XmlSchemaDocument) {
      return XmlSchemaTypesService.getTypeOverrideCandidatesForField(
        field,
        field.ownerDocument.xmlSchemaCollection,
        namespaceMap,
      );
    }

    if (field.ownerDocument instanceof JsonSchemaDocument) {
      return JsonSchemaTypesService.getTypeOverrideCandidatesForField(field);
    }

    return {};
  }

  /**
   * Get all available type override candidates for a document.
   *
   * Returns all types that can be used for force overrides, including both
   * built-in types (e.g., xs:string, xs:int for XML Schema; string, number for JSON Schema)
   * and user-defined types from the schema. Use this when the user explicitly wants to
   * change a field to an incompatible type that requires a force override.
   *
   * This method delegates to the appropriate type service based on the document type.
   *
   * @param document - The document to get type candidates for
   * @param namespaceMap - Namespace prefix to URI mapping for qualified name resolution
   * @returns Record of all available type override candidates
   *
   * @example
   * ```typescript
   * const allTypes = FieldTypeOverrideService.getAllOverrideCandidates(document, namespaceMap);
   * // For XML Schema: Returns all xs:* types + all user-defined complexTypes and simpleTypes
   * // For JSON Schema: Returns all built-in types (string, number, etc.) + all $defs types
   * ```
   *
   * @see getSafeOverrideCandidates
   * @see XmlSchemaTypesService.getAllXmlSchemaTypes
   * @see JsonSchemaTypesService.getAllJsonSchemaTypes
   */
  static getAllOverrideCandidates(
    document: IDocument,
    namespaceMap: Record<string, string>,
  ): Record<string, IFieldTypeInfo> {
    if (document instanceof XmlSchemaDocument) {
      return XmlSchemaTypesService.getAllXmlSchemaTypes(document, namespaceMap);
    }

    if (document instanceof JsonSchemaDocument) {
      return JsonSchemaTypesService.getAllJsonSchemaTypes(document);
    }

    return {};
  }

  /**
   * Create a field type override definition from field type info.
   *
   * Converts field type info (typically selected from the UI) into an
   * IFieldTypeOverride object that can be applied to the document. This utility
   * generates the schema path for the field and constructs the override definition with
   * all required properties.
   *
   * @param field - The field to create the override for
   * @param candidate - The field type info selected by the user
   * @param namespaceMap - Namespace prefix to URI mapping for schema path generation
   * @param variant - The override variant (SAFE or FORCE)
   * @returns A complete IFieldTypeOverride definition ready to be applied
   *
   * @example
   * ```typescript
   * // User selects a type override from the UI
   * const candidate: IFieldTypeInfo = {
   *   displayName: 'xs:int',
   *   typeString: 'xs:int',
   *   type: Types.Integer,
   *   namespaceURI: 'http://www.w3.org/2001/XMLSchema',
   *   isBuiltIn: true
   * };
   *
   * const override = FieldTypeOverrideService.createFieldTypeOverride(
   *   orderPersonField,
   *   candidate,
   *   namespaceMap,
   *   TypeOverrideVariant.FORCE
   * );
   * // Returns: {
   * //   schemaPath: '/ns0:ShipOrder/ns0:OrderPerson',
   * //   type: 'xs:int',
   * //   originalType: 'xs:string',
   * //   variant: TypeOverrideVariant.FORCE
   * // }
   *
   * // Apply the override
   * DocumentUtilService.processTypeOverride(document, override, namespaceMap, parseTypeOverrideFn);
   * ```
   *
   * @see IFieldTypeInfo
   * @see IFieldTypeOverride
   * @see DocumentUtilService.processTypeOverride
   * @see getSafeOverrideCandidates
   * @see getAllOverrideCandidates
   */
  static createFieldTypeOverride(
    field: IField,
    candidate: IFieldTypeInfo,
    namespaceMap: Record<string, string>,
    variant: TypeOverrideVariant.SAFE | TypeOverrideVariant.FORCE,
  ): IFieldTypeOverride {
    const schemaPath = SchemaPathService.build(field, namespaceMap);
    const originalTypeString = field.originalTypeQName?.toString() ?? field.originalType;
    return {
      schemaPath,
      type: candidate.typeString,
      originalType: originalTypeString,
      variant,
    };
  }

  /**
   * Apply a field type override to a field in a document.
   *
   * This high-level orchestration method:
   * 1. Determines the appropriate type parser based on document type
   * 2. Creates the override definition
   * 3. Applies the override to the document (modifies in place)
   *
   * The document is modified in place. After calling this method, use
   * `dataMapperProvider.updateDocument()` to persist changes and trigger re-visualization.
   *
   * @param document - The document containing the field
   * @param field - The field to override
   * @param candidate - The type to override to
   * @param namespaceMap - Namespace map for XPath generation
   * @param variant - SAFE or FORCE override variant
   * @throws Error if document type doesn't support type overrides
   *
   * @example
   * ```typescript
   * const candidate: IFieldTypeInfo = {
   *   displayName: 'xs:int',
   *   typeString: 'xs:int',
   *   type: Types.Integer,
   *   namespaceURI: NS_XML_SCHEMA,
   *   isBuiltIn: true,
   * };
   *
   * FieldTypeOverrideService.applyFieldTypeOverride(
   *   document,
   *   field,
   *   candidate,
   *   namespaceMap,
   *   TypeOverrideVariant.FORCE
   * );
   *
   * // Persist changes via provider
   * const previousRefId = document.getReferenceId(namespaceMap);
   * updateDocument(document, document.definition, previousRefId);
   * ```
   *
   * @see revertFieldTypeOverride
   * @see createFieldTypeOverride
   */
  static applyFieldTypeOverride(
    document: IDocument,
    field: IField,
    candidate: IFieldTypeInfo,
    namespaceMap: Record<string, string>,
    variant: TypeOverrideVariant.SAFE | TypeOverrideVariant.FORCE,
  ): void {
    if (document instanceof PrimitiveDocument) {
      throw new TypeError('Field type override is not supported for primitive documents');
    }

    let parseTypeOverrideFn: ParseTypeOverrideFn;
    if (document instanceof XmlSchemaDocument) {
      parseTypeOverrideFn = XmlSchemaTypesService.parseTypeOverride;
    } else if (document instanceof JsonSchemaDocument) {
      parseTypeOverrideFn = JsonSchemaTypesService.parseTypeOverride;
    } else {
      throw new TypeError(`Unsupported document type: ${document.constructor.name}`);
    }

    const override = FieldTypeOverrideService.createFieldTypeOverride(field, candidate, namespaceMap, variant);
    const changed = DocumentUtilService.processTypeOverride(document, override, namespaceMap, parseTypeOverrideFn);
    if (changed) {
      DocumentUtilService.invalidateDescendants(document, override.schemaPath);
    }
  }

  /**
   * Revert the field type override from a field in a document.
   * Restores the field to its original type.
   * Modifies the document in place.
   *
   * The document is modified in place. After calling this method, use
   * `dataMapperProvider.updateDocument()` to persist changes and trigger re-visualization.
   *
   * @param document - The document containing the field
   * @param field - The field to restore
   * @param namespaceMap - Namespace map for XPath generation
   *
   * @example
   * ```typescript
   * FieldTypeOverrideService.revertFieldTypeOverride(document, field, namespaceMap);
   *
   * // Persist changes via provider
   * const previousRefId = document.getReferenceId(namespaceMap);
   * updateDocument(document, document.definition, previousRefId);
   * ```
   *
   * @see applyFieldTypeOverride
   */
  static revertFieldTypeOverride(document: IDocument, field: IField, namespaceMap: Record<string, string>): void {
    if (field.typeOverride === TypeOverrideVariant.NONE) return;
    const schemaPath = SchemaPathService.build(field, namespaceMap);
    const changed = DocumentUtilService.removeTypeOverride(document, schemaPath, namespaceMap);
    if (changed) {
      DocumentUtilService.invalidateDescendants(document, schemaPath);
    }
  }

  /**
   * Adds additional schema files to a document to support field type overrides.
   *
   * This high-level orchestration method coordinates:
   * 1. Adding files to the document's schema collection (via format-specific service)
   * 2. Updating DocumentDefinition.definitionFiles with new files
   * 3. Synchronizing namespace maps (for XML Schema documents)
   * 4. Returning updated definition for re-visualization via provider
   *
   * The returned DocumentDefinition should be passed to `dataMapperProvider.updateDocument()`
   * to trigger full synchronization across all three namespace map levels and persist changes.
   *
   * @param document - The document to enhance with additional schemas
   * @param additionalFiles - Map of file paths to file contents
   * @returns Updated DocumentDefinition with merged files and synchronized namespace map
   * @throws Error if document is PrimitiveDocument or unsupported type
   * @throws Error if schema parsing fails (propagated from format-specific service)
   *
   * @example
   * ```typescript
   * // User uploads additional schema file
   * const additionalFiles = {
   *   'CustomTypes.xsd': schemaContent,
   * };
   *
   * // Create updated definition
   * const updatedDefinition = FieldTypeOverrideService.addSchemaFilesForTypeOverride(
   *   targetDocument,
   *   additionalFiles
   * );
   *
   * // Apply via provider - triggers full namespace synchronization
   * dataMapperProvider.updateDocument(
   *   targetDocument,
   *   updatedDefinition,
   *   previousReferenceId
   * );
   *
   * // Now custom types are available for field type overrides
   * const candidates = FieldTypeOverrideService.getAllOverrideCandidates(
   *   targetDocument,
   *   updatedDefinition.namespaceMap || {}
   * );
   * // candidates now includes types from CustomTypes.xsd
   * ```
   */
  static addSchemaFilesForTypeOverride(
    document: IDocument,
    additionalFiles: Record<string, string>,
  ): DocumentDefinition {
    if (document instanceof PrimitiveDocument) {
      throw new TypeError('Cannot add schema files to primitive document');
    }

    let updatedNamespaceMap: Record<string, string>;

    if (document instanceof XmlSchemaDocument) {
      updatedNamespaceMap = XmlSchemaDocumentService.addSchemaFiles(document, additionalFiles);
    } else if (document instanceof JsonSchemaDocument) {
      updatedNamespaceMap = JsonSchemaDocumentService.addSchemaFiles(document, additionalFiles);
    } else {
      throw new TypeError(`Unsupported document type: ${document.constructor.name}`);
    }

    const mergedDefinitionFiles = {
      ...document.definition.definitionFiles,
      ...additionalFiles,
    };

    return new DocumentDefinition(
      document.definition.documentType,
      document.definition.definitionType,
      document.definition.name,
      mergedDefinitionFiles,
      document.definition.rootElementChoice,
      document.definition.fieldTypeOverrides,
      document.definition.choiceSelections,
      updatedNamespaceMap,
    );
  }

  /**
   * Apply a choice selection to a choice compositor field in a document.
   *
   * This high-level orchestration method builds the `schemaPath` string from the
   * field's ancestor chain and delegates to {@link DocumentUtilService.processChoiceSelection()}.
   *
   * The document is modified in place. After calling this method, use
   * {@link DataMapperProvider.updateDocument()} to persist changes and trigger re-visualization.
   *
   * @param document - The document containing the choice field
   * @param choiceField - The choice compositor field (must have `isChoice === true`)
   * @param selectedMemberIndex - 0-based index of the choice member to select
   * @param namespaceMap - Namespace prefix to URI mapping for path generation
   *
   * @example
   * ```typescript
   * FieldTypeOverrideService.applyChoiceSelection(document, choiceField, 1, namespaceMap);
   *
   * // Persist changes via provider
   * const previousRefId = document.getReferenceId(namespaceMap);
   * updateDocument(document, document.definition, previousRefId);
   * ```
   *
   * @see revertChoiceSelection
   * @see DocumentUtilService.processChoiceSelection
   */
  static applyChoiceSelection(
    document: IDocument,
    choiceField: IField,
    selectedMemberIndex: number,
    namespaceMap: Record<string, string>,
  ): void {
    if (!choiceField.isChoice) return;
    const schemaPath = SchemaPathService.build(choiceField, namespaceMap);
    const selection: IChoiceSelection = { schemaPath, selectedMemberIndex };
    const changed = DocumentUtilService.processChoiceSelection(document, selection, namespaceMap);
    if (changed) {
      DocumentUtilService.invalidateDescendants(document, schemaPath);
    }
  }

  /**
   * Revert a choice selection from a choice compositor field in a document.
   * Clears the selected member index from the field and removes the entry from the document definition.
   *
   * This is a no-op if `choiceField.selectedMemberIndex` is already `undefined`.
   *
   * The document is modified in place. After calling this method, use
   * {@link DataMapperProvider.updateDocument()} to persist changes and trigger re-visualization.
   *
   * @param document - The document containing the choice field
   * @param choiceField - The choice compositor field to clear
   * @param namespaceMap - Namespace prefix to URI mapping for path generation
   *
   * @example
   * ```typescript
   * FieldTypeOverrideService.revertChoiceSelection(document, choiceField, namespaceMap);
   *
   * // Persist changes via provider
   * const previousRefId = document.getReferenceId(namespaceMap);
   * updateDocument(document, document.definition, previousRefId);
   * ```
   *
   * @see applyChoiceSelection
   * @see DocumentUtilService.removeChoiceSelection
   */
  static revertChoiceSelection(document: IDocument, choiceField: IField, namespaceMap: Record<string, string>): void {
    if (choiceField.selectedMemberIndex === undefined) return;
    const schemaPath = SchemaPathService.build(choiceField, namespaceMap);
    const changed = DocumentUtilService.removeChoiceSelection(document, schemaPath, namespaceMap);
    if (changed) {
      DocumentUtilService.invalidateDescendants(document, schemaPath);
    }
  }
}
