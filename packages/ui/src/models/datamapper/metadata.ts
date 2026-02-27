import { DocumentDefinitionType, RootElementOption } from './document';
import { FieldOverrideVariant } from './types';

/**
 * Shared base for overrides and selections that are addressed by schema path.
 */
export interface IBaseOverride {
  /**
   * Path to the field in the document structure.
   * Uses element XPath segments for elements and `{choice:N}` segments
   * (0-based index) for choice compositors.
   *
   * The `{choice:N}` syntax is intentionally distinct from XPath to avoid
   * ambiguity with XPath predicates. Therefore, `schemaPath` is not directly
   * parseable as XPath expression.
   */
  schemaPath: string;
}

/**
 * Represents a field type override configuration for a document field.
 * Used to override the default type of a field with a custom type.
 */
export interface IFieldTypeOverride extends IBaseOverride {
  /**
   * The new type to apply to the field, in `<prefix>:<localName>` form
   * (e.g. `xs:string`, `ns0:MyType`). The prefix is resolved via
   * {@link IDataMapperMetadata.namespaceMap}.
   */
  type: string;

  /**
   * The original type of the field before the override, in `<prefix>:<localName>` form
   * (e.g. `xs:string`, `ns0:MyType`). The prefix is resolved via
   * {@link IDataMapperMetadata.namespaceMap}.
   */
  originalType: string;

  /**
   * The variant of the type override.
   * - SAFE: The override is safe and compatible with the original type.
   * - FORCE: The override is forced and may not be compatible with the original type.
   */
  variant: FieldOverrideVariant.SAFE | FieldOverrideVariant.FORCE;
}

/**
 * Represents an element substitution for a field in a document.
 * Used to substitute an element with another element from the same substitution group.
 */
export interface IFieldSubstitution extends IBaseOverride {
  /**
   * The substitute element name in `<prefix>:<localName>` form
   * (e.g. `ns0:AlrtMetaDtaReq`). The prefix is resolved via
   * {@link IDataMapperMetadata.namespaceMap}.
   */
  name: string;

  /**
   * The original element name in `<prefix>:<localName>` form
   * (e.g. `ns0:Message`). The prefix is resolved via
   * {@link IDataMapperMetadata.namespaceMap}.
   */
  originalName: string;
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

  /**
   * Array of element substitutions for fields in the document.
   * Allows substituting an element with another from the same substitution group.
   */
  fieldSubstitutions?: IFieldSubstitution[];
}

/**
 * Represents a user selection for an xs:choice field in a document.
 *
 * Examples of `schemaPath`:
 * - `/ns0:Root/{choice:0}` — single choice under Root
 * - `/ns0:Root/{choice:0}` and `/ns0:Root/{choice:1}` — sibling choices
 * - `/ns0:Root/{choice:0}/ns0:Option1/{choice:0}` — choice nested via element
 * - `/ns0:Root/{choice:0}/{choice:0}` — choice directly nested in choice
 */
export interface IChoiceSelection extends IBaseOverride {
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
