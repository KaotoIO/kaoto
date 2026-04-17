import { DocumentDefinition, IDocument, IField, PrimitiveDocument } from '../models/datamapper/document';
import { IFieldSubstitution, IFieldTypeOverride } from '../models/datamapper/metadata';
import { FieldOverrideVariant, IFieldSubstituteInfo, IFieldTypeInfo, Types } from '../models/datamapper/types';
import { DocumentUtilService, ParseTypeOverrideFn } from './document-util.service';
import { JsonSchemaDocument } from './json-schema-document.model';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { JsonSchemaTypesService } from './json-schema-types.service';
import { ensureNamespaceRegistered, formatQNameWithPrefix, formatWithPrefix } from './namespace-util';
import { SchemaPathService } from './schema-path.service';
import { XmlSchemaDocument } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { XmlSchemaTypesService } from './xml-schema-types.service';

/**
 * Service for field type override and element substitution operations.
 * Provides high-level orchestration for applying, removing, and managing type overrides
 * and element substitutions (apply/revert).
 *
 * This service consolidates all field type override functionality in one place, reducing
 * code duplication and improving maintainability by eliminating if-XML/if-JSON patterns
 * scattered across multiple services.
 *
 * Note: Choice selection operations have been moved to {@link ChoiceSelectionService}.
 *
 * @example
 * ```typescript
 * // Get safe type override candidates for a field
 * const candidates = FieldTypeOverrideService.getSafeOverrideCandidates(field, namespaceMap);
 *
 * // Apply a type override
 * FieldTypeOverrideService.applyFieldTypeOverride(
 *   field,
 *   selectedCandidate,
 *   namespaceMap,
 *   FieldOverrideVariant.FORCE
 * );
 *
 * // Remove a type override
 * FieldTypeOverrideService.revertFieldTypeOverride(field, namespaceMap);
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
    if ((field.originalField?.type ?? field.type) === Types.AnyType) {
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
   *   FieldOverrideVariant.FORCE
   * );
   * // Returns: {
   * //   schemaPath: '/ns0:ShipOrder/ns0:OrderPerson',
   * //   type: 'xs:int',
   * //   originalType: 'xs:string',
   * //   variant: FieldOverrideVariant.FORCE
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
    variant: FieldOverrideVariant.SAFE | FieldOverrideVariant.FORCE,
  ): IFieldTypeOverride {
    const schemaPath = SchemaPathService.build(field, namespaceMap);
    const origTypeQName = field.originalField?.typeQName ?? field.typeQName;
    const origType = field.originalField?.type ?? field.type;
    const originalTypeString = formatQNameWithPrefix(origTypeQName, namespaceMap, origType);
    const typeString = formatQNameWithPrefix(candidate.typeQName, namespaceMap);
    return {
      schemaPath,
      type: typeString,
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
   *   field,
   *   candidate,
   *   namespaceMap,
   *   FieldOverrideVariant.FORCE
   * );
   *
   * // Persist changes via provider
   * const document = field.ownerDocument;
   * const previousRefId = document.getReferenceId(namespaceMap);
   * updateDocument(document, document.definition, previousRefId);
   * ```
   *
   * @see revertFieldTypeOverride
   * @see createFieldTypeOverride
   */
  static applyFieldTypeOverride(
    field: IField,
    candidate: IFieldTypeInfo,
    namespaceMap: Record<string, string>,
    variant: FieldOverrideVariant.SAFE | FieldOverrideVariant.FORCE,
  ): void {
    const document = field.ownerDocument;
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

    ensureNamespaceRegistered(candidate.typeQName.getNamespaceURI(), namespaceMap);
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
   * @param field - The field to restore
   * @param namespaceMap - Namespace map for XPath generation
   *
   * @example
   * ```typescript
   * FieldTypeOverrideService.revertFieldTypeOverride(field, namespaceMap);
   *
   * // Persist changes via provider
   * const document = field.ownerDocument;
   * const previousRefId = document.getReferenceId(namespaceMap);
   * updateDocument(document, document.definition, previousRefId);
   * ```
   *
   * @see applyFieldTypeOverride
   */
  static revertFieldTypeOverride(field: IField, namespaceMap: Record<string, string>): void {
    const document = field.ownerDocument;
    if (![FieldOverrideVariant.SAFE, FieldOverrideVariant.FORCE].includes(field.typeOverride)) {
      return;
    }
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
   *
   * The document is modified in place. After calling this method, use
   * {@link DataMapperProvider.updateDocument()} to persist changes and trigger re-visualization.
   *
   * @param document - The document to enhance with additional schemas
   * @param additionalFiles - Map of file paths to file contents
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
   * FieldTypeOverrideService.addSchemaFilesForTypeOverride(targetDocument, additionalFiles);
   *
   * // Apply via provider - triggers full namespace synchronization
   * dataMapperProvider.updateDocument(
   *   targetDocument,
   *   targetDocument.definition,
   *   previousReferenceId
   * );
   * ```
   */
  static addSchemaFilesForTypeOverride(document: IDocument, additionalFiles: Record<string, string>): void {
    if (document instanceof PrimitiveDocument) {
      throw new TypeError('Cannot add schema files to primitive document');
    }

    if (document instanceof XmlSchemaDocument) {
      XmlSchemaDocumentService.addSchemaFiles(document, additionalFiles);
    } else if (document instanceof JsonSchemaDocument) {
      JsonSchemaDocumentService.addSchemaFiles(document, additionalFiles);
    } else {
      throw new TypeError(`Unsupported document type: ${document.constructor.name}`);
    }

    document.definition = new DocumentDefinition(
      document.definition.documentType,
      document.definition.definitionType,
      document.definition.name,
      { ...document.definition.definitionFiles, ...additionalFiles },
      document.definition.rootElementChoice,
      document.definition.fieldTypeOverrides,
      document.definition.choiceSelections,
      document.definition.fieldSubstitutions,
    );
  }

  /**
   * Get substitution group member candidates for a field.
   *
   * Delegates to {@link XmlSchemaTypesService.getFieldSubstitutionCandidates} for XML Schema documents.
   * Returns empty Record for JSON Schema documents (substitution groups are XML-only).
   *
   * @param field - The field to get substitution candidates for
   * @param namespaceMap - Namespace prefix to URI mapping for qualified name resolution
   * @returns Record of substitution candidates, or `{}` when none found
   */
  static getFieldSubstitutionCandidates(
    field: IField,
    namespaceMap: Record<string, string>,
  ): Record<string, IFieldSubstituteInfo> {
    if (!(field.ownerDocument instanceof XmlSchemaDocument) || !field.ownerDocument.xmlSchemaCollection) return {};
    return XmlSchemaTypesService.getFieldSubstitutionCandidates(
      field,
      field.ownerDocument.xmlSchemaCollection,
      namespaceMap,
    );
  }

  /**
   * Apply an element substitution to a field in a document.
   *
   * Stores the substitution entry in the definition, applies it to the live field,
   * and invalidates any stale descendant overrides.
   *
   * The document is modified in place. After calling this method, use
   * `dataMapperProvider.updateDocument()` to persist changes and trigger re-visualization.
   *
   * @param field - The field to substitute
   * @param substituteElementQName - The substitute element name in `prefix:localName` form
   * @param namespaceMap - Namespace prefix to URI mapping
   */
  static applyFieldSubstitution(
    field: IField,
    substituteElementQName: string,
    namespaceMap: Record<string, string>,
  ): void {
    const document = field.ownerDocument;
    if (!(document instanceof XmlSchemaDocument) || !document.xmlSchemaCollection) return;
    const candidates = XmlSchemaTypesService.getFieldSubstitutionCandidates(
      field,
      document.xmlSchemaCollection,
      namespaceMap,
    );
    const candidate = candidates[substituteElementQName];
    if (!candidate) return;
    const originalNsURI = field.originalField?.namespaceURI ?? field.namespaceURI;
    const originalNsPrefix = field.originalField?.namespacePrefix ?? field.namespacePrefix ?? undefined;
    ensureNamespaceRegistered(originalNsURI, namespaceMap, originalNsPrefix);
    ensureNamespaceRegistered(candidate.qname.getNamespaceURI(), namespaceMap);
    ensureNamespaceRegistered(candidate.typeQName?.getNamespaceURI() ?? '', namespaceMap);
    const schemaPath = SchemaPathService.buildOriginal(field, namespaceMap);
    const origName = field.originalField?.name ?? field.name;
    const originalName = formatWithPrefix(originalNsURI, origName, namespaceMap);
    const canonicalName = formatWithPrefix(
      candidate.qname.getNamespaceURI(),
      candidate.qname.getLocalPart()!,
      namespaceMap,
    );
    const entry: IFieldSubstitution = { schemaPath, name: canonicalName, originalName };
    document.definition.fieldSubstitutions ??= [];
    const existingIndex = document.definition.fieldSubstitutions.findIndex((s) => s.schemaPath === schemaPath);
    if (existingIndex >= 0) {
      document.definition.fieldSubstitutions[existingIndex] = entry;
    } else {
      document.definition.fieldSubstitutions.push(entry);
    }
    const livePath = SchemaPathService.build(field, namespaceMap);
    DocumentUtilService.applySubstitutionToField(field, candidate);
    DocumentUtilService.invalidateDescendants(document, schemaPath);
    if (livePath !== schemaPath) {
      DocumentUtilService.invalidateDescendants(document, livePath);
    }
  }

  /**
   * Revert an element substitution from a field in a document.
   * Restores the field to its original element name and type.
   *
   * The document is modified in place. After calling this method, use
   * `dataMapperProvider.updateDocument()` to persist changes and trigger re-visualization.
   *
   * @param field - The substituted field to revert
   * @param namespaceMap - Namespace prefix to URI mapping
   */
  static revertFieldSubstitution(field: IField, namespaceMap: Record<string, string>): void {
    const document = field.ownerDocument;
    if (!(document instanceof XmlSchemaDocument)) return;
    const originalPath = SchemaPathService.buildOriginal(field, namespaceMap);
    const livePath = SchemaPathService.build(field, namespaceMap);
    if (!document.definition.fieldSubstitutions) return;
    const entryIndex = document.definition.fieldSubstitutions.findIndex((s) => s.schemaPath === originalPath);
    if (entryIndex < 0) return;
    document.definition.fieldSubstitutions = document.definition.fieldSubstitutions.filter(
      (s) => s.schemaPath !== originalPath,
    );
    if (field.typeOverride === FieldOverrideVariant.SUBSTITUTION) {
      DocumentUtilService.restoreOriginalField(field);
      DocumentUtilService.invalidateDescendants(document, originalPath);
      if (livePath !== originalPath) {
        DocumentUtilService.invalidateDescendants(document, livePath);
      }
    }
  }
}
