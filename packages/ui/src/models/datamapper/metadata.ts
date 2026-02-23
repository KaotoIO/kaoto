import { DocumentDefinitionType, RootElementOption } from './document';
import { TypeOverrideVariant } from './types';

/**
 * Represents a field type override configuration for a document field.
 * Used to override the default type of a field with a custom type.
 */
export interface IFieldTypeOverride {
  /**
   * The path to the field in the document structure.
   */
  path: string;

  /**
   * The new type to apply to the field.
   */
  type: string;

  /**
   * The original type of the field before the override.
   */
  originalType: string;

  /**
   * The variant of the type override.
   * - SAFE: The override is safe and compatible with the original type.
   * - FORCE: The override is forced and may not be compatible with the original type.
   */
  variant: TypeOverrideVariant.SAFE | TypeOverrideVariant.FORCE;
}

/**
 * Metadata for a document used in the DataMapper.
 * Contains information about the document's schema, file paths, and field overrides.
 */
export interface IDocumentMetadata {
  /**
   * The type of document definition (e.g., XML_SCHEMA, JSON_SCHEMA, Primitive).
   */
  type: DocumentDefinitionType;

  /**
   * Array of file paths to the schema files associated with this document.
   */
  filePath: string[];

  /**
   * If the document is XML, this represents the selected root element of XML schema
   * document with multiple root elements. When an XML schema has multiple top-level
   * elements, this specifies which one to use as a root element.
   * If the document is JSON, {@link rootElementChoice.name} represents the name of
   * the primary JSON schema file.
   */
  rootElementChoice?: RootElementOption;

  /**
   * Array of field type overrides to apply to the document.
   * Allows customization of field types beyond their schema-defined types.
   */
  fieldTypeOverrides?: IFieldTypeOverride[];

  /**
   * Array of user selections for xs:choice fields in the document.
   * Persists which choice member is selected for each choice field.
   */
  choiceSelections?: IChoiceSelection[];
}

/**
 * Represents a user selection for an xs:choice field in a document.
 */
export interface IChoiceSelection {
  /**
   * Path to the choice field in the document structure.
   * Uses element XPath segments for elements and `{choice:N}` segments
   * (0-based index) for choice compositors.
   *
   * The `{choice:N}` syntax is intentionally distinct from XPath to avoid
   * ambiguity with XPath predicates. Therefore, `schemaPath` is not directly
   * parseable as XPath expression.
   *
   * Examples:
   * - `/ns0:Root/{choice:0}` — single choice under Root
   * - `/ns0:Root/{choice:0}` and `/ns0:Root/{choice:1}` — sibling choices
   * - `/ns0:Root/{choice:0}/ns0:Option1/{choice:0}` — choice nested via element
   * - `/ns0:Root/{choice:0}/{choice:0}` — choice directly nested in choice
   */
  schemaPath: string;

  /**
   * The 0-based index of the selected choice member.
   */
  selectedMemberIndex: number;
}

/**
 * Complete metadata for a DataMapper transformation.
 * Contains all the information needed to persist and restore a DataMapper session,
 * including source and target documents, parameters, and the XSLT transformation.
 */
export interface IDataMapperMetadata {
  /**
   * The file path to the XSLT transformation file.
   */
  xsltPath: string;

  /**
   * Map of source parameter names to their document metadata.
   * Parameters are additional inputs to the transformation beyond the main source body.
   */
  sourceParameters: Record<string, IDocumentMetadata>;

  /**
   * Metadata for the main source document body.
   */
  sourceBody: IDocumentMetadata;

  /**
   * Metadata for the target document body.
   */
  targetBody: IDocumentMetadata;

  /**
   * Optional mapping of namespace prefixes to namespace URIs.
   * Used for resolving XML namespaces in the transformation.
   */
  namespaceMap?: Record<string, string>;
}
