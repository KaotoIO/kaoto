import { IDocument, IField, IParentType, ITypeFragment, PathSegment, PrimitiveDocument } from '../models/datamapper';
import { IChoiceSelection, IFieldTypeOverride } from '../models/datamapper/metadata';
import { TypeOverrideVariant, Types } from '../models/datamapper/types';
import { QName } from '../xml-schema-ts/QName';
import { SchemaPathService } from './schema-path.service';
import { XPathService } from './xpath/xpath.service';

export type ParseTypeOverrideFn = (
  typeString: string,
  namespaceMap: Record<string, string>,
  field: IField,
) => { type: Types; typeQName: QName; variant: TypeOverrideVariant };

/**
 * The collection of utility functions shared among {@link DocumentService}, {@link XmlSchemaDocumentService}
 * and {@link JsonSchemaDocumentService} while avoiding circular dependency.
 *
 * @see DocumentService
 * @see XmlSchemaDocumentService
 * @see JsonSchemaDocumentService
 */
export class DocumentUtilService {
  /**
   * Returns the owner document for the given field or document.
   * If the argument is a field, its {@link IField.ownerDocument} is returned; otherwise the argument itself is returned.
   * @param docOrField - A field or document
   * @returns The owner document cast to the specified DocumentType
   */
  static getOwnerDocument<DocumentType extends IDocument>(docOrField: IParentType): DocumentType {
    return ('ownerDocument' in docOrField ? docOrField.ownerDocument : docOrField) as DocumentType;
  }

  /**
   * Resolve type fragments from reference and populate into the document tree so that it could be expanded in the UI.
   *
   *  @TODO is it safe to change field type dynamically even on XML field? we might eventually need to readahead field type
   *  even for XML field just like JSON field does, see {@link JsonSchemaDocumentService.createJsonSchemaDocument}
   * @param field - The field to resolve type fragments for
   */
  static resolveTypeFragment(field: IField): IField {
    if (field.namedTypeFragmentRefs.length === 0) return field;
    const doc = DocumentUtilService.getOwnerDocument(field);
    field.namedTypeFragmentRefs.forEach((ref) => {
      const fragment = doc.namedTypeFragments[ref];
      DocumentUtilService.adoptTypeFragment(field, fragment);
    });
    field.namedTypeFragmentRefs = [];
    return field;
  }

  /**
   * Merges a {@link ITypeFragment} into a field, adopting its type, occurrence constraints, and child fields.
   * Recursively resolves and adopts any nested type fragment references from the owner document.
   * @param field - The field to adopt the fragment into
   * @param fragment - The type fragment whose properties and children will be merged into the field
   */
  static adoptTypeFragment(field: IField, fragment: ITypeFragment) {
    const doc = DocumentUtilService.getOwnerDocument(field);
    if (fragment.type) field.type = fragment.type;
    if (fragment.minOccurs !== undefined) field.minOccurs = fragment.minOccurs;
    if (fragment.maxOccurs !== undefined) field.maxOccurs = fragment.maxOccurs;
    fragment.fields.forEach((f) => f.adopt(field));
    fragment.namedTypeFragmentRefs.forEach((childRef) => {
      const childFragment = doc.namedTypeFragments[childRef];
      DocumentUtilService.adoptTypeFragment(field, childFragment);
    });
  }

  /**
   * Builds the ancestor chain of a field, walking up through parent references to the document root.
   * @param field - The field to build the ancestor stack for
   * @param includeItself - If true, the field itself is prepended to the returned array
   * @returns Array of ancestor fields ordered from the field (or its parent) up to the document root
   */
  static getFieldStack(field: IField, includeItself: boolean = false): IField[] {
    if (field instanceof PrimitiveDocument) return [];
    const fieldStack: IField[] = [];
    if (includeItself) fieldStack.push(field);
    for (let next = field.parent; 'parent' in next && next !== next.parent; next = next.parent) {
      fieldStack.push(next);
    }
    return fieldStack;
  }

  /**
   * Low level API to apply multiple field type overrides to a document.
   * UI component should use {@link FieldTypeOverrideService.applyFieldTypeOverride()}.
   *
   * Iterates through all provided overrides and applies them to the document.
   * Each override modifies both the field in the document tree and updates
   * the DocumentDefinition to keep them in sync.
   *
   * @param document - The document to apply overrides to
   * @param overrides - Array of field type overrides to apply
   * @param namespaceMap - Namespace prefix to URI mapping for XPath resolution
   * @param parseTypeOverride - Function to parse type override strings
   *
   * @example
   * ```typescript
   * const overrides = [
   *   { path: '/ns0:ShipOrder/ns0:OrderPerson', type: 'xs:int', originalType: 'xs:string', variant: TypeOverrideVariant.FORCE },
   *   { path: '/ns0:ShipOrder/ShipTo/City', type: 'xs:boolean', originalType: 'xs:string', variant: TypeOverrideVariant.FORCE }
   * ];
   * DocumentUtilService.processTypeOverrides(
   *   document,
   *   overrides,
   *   namespaceMap,
   *   XmlSchemaTypesService.parseTypeOverride
   * );
   * ```
   *
   * @see processTypeOverride
   * @see removeTypeOverride
   */
  static processTypeOverrides(
    document: IDocument,
    overrides: IFieldTypeOverride[],
    namespaceMap: Record<string, string>,
    parseTypeOverride: ParseTypeOverrideFn,
  ): void {
    for (const override of overrides) {
      const field = DocumentUtilService.navigateToFieldByPath(document, override.path, namespaceMap);
      if (field) {
        DocumentUtilService.applyTypeOverrideToField(field, override.type, namespaceMap, parseTypeOverride);
      }
    }
  }

  /**
   * Low level API to apply a field type override to a document.
   * UI component should use {@link FieldTypeOverrideService.applyFieldTypeOverride()}.
   *
   * Navigates to the specified field using XPath and changes its type. Also updates
   * the DocumentDefinition.fieldTypeOverrides to keep the definition in sync with
   * the live document. This ensures that when the document is recreated from the
   * definition, the override will be reapplied.
   *
   * @param document - The document to apply the override to
   * @param override - The field type override to apply
   * @param namespaceMap - Namespace prefix to URI mapping for XPath resolution
   * @param parseTypeOverride - Function to parse type override strings (format-specific)
   *
   * @example
   * ```typescript
   * const override: IFieldTypeOverride = {
   *   path: '/ns0:ShipOrder/ns0:OrderPerson',
   *   type: 'xs:int',
   *   originalType: 'xs:string',
   *   variant: TypeOverrideVariant.FORCE,
   * };
   * DocumentUtilService.processTypeOverride(
   *   document,
   *   override,
   *   namespaceMap,
   *   XmlSchemaTypesService.parseTypeOverride
   * );
   * // Field is now type xs:int and override is stored in document.definition.fieldTypeOverrides
   * ```
   *
   * @remarks
   * This method modifies both the runtime field structure and the DocumentDefinition:
   * 1. Runtime: Changes field.type, field.typeQName, field.typeOverride, clears field.fields
   * 2. Definition: Adds/updates override in document.definition.fieldTypeOverrides
   *
   * For retrieving type override candidates, use {@link FieldTypeOverrideService.getSafeOverrideCandidates}
   * or {@link FieldTypeOverrideService.getAllOverrideCandidates}.
   *
   * @see processTypeOverrides
   * @see removeTypeOverride
   * @see FieldTypeOverrideService.getSafeOverrideCandidates
   * @see FieldTypeOverrideService.getAllOverrideCandidates
   */
  static processTypeOverride(
    document: IDocument,
    override: IFieldTypeOverride,
    namespaceMap: Record<string, string>,
    parseTypeOverride: ParseTypeOverrideFn,
  ): void {
    const field = DocumentUtilService.navigateToFieldByPath(document, override.path, namespaceMap);
    if (field) {
      DocumentUtilService.applyTypeOverrideToField(field, override.type, namespaceMap, parseTypeOverride);

      document.definition.fieldTypeOverrides ??= [];
      const existingIndex = document.definition.fieldTypeOverrides.findIndex((o) => o.path === override.path);
      if (existingIndex >= 0) {
        document.definition.fieldTypeOverrides[existingIndex] = override;
      } else {
        document.definition.fieldTypeOverrides.push(override);
      }
    }
  }

  /**
   * Low level API to remove a field type override from a document.
   * UI component should use {@link FieldTypeOverrideService.revertFieldTypeOverride()}.
   *
   * Removes the override for the specified field path and restores the field to its
   * original type in the live document. Also updates the DocumentDefinition to keep
   * the definition in sync with the live document.
   *
   * This method is symmetric with {@link processTypeOverride}: both update the field
   * in the live document and keep the DocumentDefinition in sync.
   *
   * @param document - The document to remove the override from
   * @param path - XPath string identifying the field (e.g., '/ns0:ShipOrder/ns0:OrderPerson')
   * @param namespaceMap - Namespace prefix to URI mapping for XPath resolution
   *
   * @example
   * ```typescript
   * // Remove the override and restore field to original type
   * DocumentUtilService.removeTypeOverride(
   *   document,
   *   '/ns0:ShipOrder/ns0:OrderPerson',
   *   namespaceMap
   * );
   * // Field is now restored to its original type without recreating the document
   * ```
   *
   * @remarks
   * This method modifies both the runtime field structure and the DocumentDefinition:
   * 1. Runtime: Restores field.type, field.typeQName, field.typeOverride, clears field.fields
   * 2. Definition: Removes override from document.definition.fieldTypeOverrides
   *
   * @see processTypeOverride
   * @see processTypeOverrides
   */
  static removeTypeOverride(document: IDocument, path: string, namespaceMap: Record<string, string>): void {
    if (!document.definition.fieldTypeOverrides) {
      return;
    }

    const override = document.definition.fieldTypeOverrides.find((o) => o.path === path);
    if (!override) {
      return;
    }

    const field = DocumentUtilService.navigateToFieldByPath(document, path, namespaceMap);
    if (field) {
      DocumentUtilService.restoreOriginalTypeToField(field);
    }

    document.definition.fieldTypeOverrides = document.definition.fieldTypeOverrides.filter((o) => o.path !== path);
  }

  /**
   * Navigate to a field in the document tree using an XPath expression.
   *
   * Resolves type fragments as needed while navigating to ensure the field
   * structure is fully expanded.
   *
   * @param document - The document to navigate in
   * @param xpathString - XPath expression identifying the field
   * @param namespaceMap - Namespace prefix to URI mapping
   * @returns The field if found, undefined otherwise
   */
  private static navigateToFieldByPath(
    document: IDocument,
    xpathString: string,
    namespaceMap: Record<string, string>,
  ): IField | undefined {
    const pathExpressions = XPathService.extractFieldPaths(xpathString);
    if (pathExpressions.length === 0) {
      return undefined;
    }

    const pathExpression = pathExpressions[0];
    let current: IDocument | IField = document;

    for (const segment of pathExpression.pathSegments) {
      if (segment.isAttribute) {
        continue;
      }

      const found = DocumentUtilService.findFieldBySegmentInParent(current, namespaceMap, segment);
      if (!found) {
        return undefined;
      }
      current = found;
    }

    return 'parent' in current ? current : undefined;
  }

  private static findFieldBySegmentInParent(
    current: IDocument | IField,
    namespaceMap: Record<string, string>,
    segment: PathSegment,
  ): IField | undefined {
    if ('parent' in current && current.namedTypeFragmentRefs.length > 0) {
      DocumentUtilService.resolveTypeFragment(current);
    }

    const directChild = current.fields.find((f) => XPathService.matchSegment(namespaceMap, f, segment));
    if (directChild) return directChild;

    for (const field of current.fields) {
      if (field.isChoice) {
        const found = DocumentUtilService.findFieldInChoiceBySegment(namespaceMap, field, segment);
        if (found) return found;
      }
    }
    return undefined;
  }

  private static findFieldInChoiceBySegment(
    namespaceMap: Record<string, string>,
    choiceField: IField,
    segment: PathSegment,
  ): IField | undefined {
    for (const member of choiceField.fields) {
      if (XPathService.matchSegment(namespaceMap, member, segment)) {
        return member;
      }
      if (member.isChoice) {
        const nested = this.findFieldInChoiceBySegment(namespaceMap, member, segment);
        if (nested) return nested;
      }
    }
    return undefined;
  }

  /**
   * Apply a type override to a specific field.
   *
   * Changes the field's type, typeQName, and typeOverride properties. Clears
   * existing child fields and sets up namedTypeFragmentRefs for Container types.
   *
   * @param field - The field to apply the override to
   * @param typeString - The type string to parse and apply
   * @param namespaceMap - Namespace prefix to URI mapping
   * @param parseTypeOverride - Function to parse type override strings
   */
  private static applyTypeOverrideToField(
    field: IField,
    typeString: string,
    namespaceMap: Record<string, string>,
    parseTypeOverride: ParseTypeOverrideFn,
  ): void {
    const { type, typeQName, variant } = parseTypeOverride(typeString, namespaceMap, field);

    field.type = type;
    field.typeQName = typeQName;
    field.typeOverride = variant;
    field.fields = [];

    if (type === Types.Container) {
      field.namedTypeFragmentRefs = [typeQName.toString()];
    } else {
      field.namedTypeFragmentRefs = [];
    }
  }

  /**
   * Restore a field to its original type.
   *
   * Reverses a type override by restoring the field's type, typeQName, and
   * typeOverride properties to their original values. Clears existing child
   * fields and sets up namedTypeFragmentRefs for Container types.
   *
   * @param field - The field to restore to its original type
   */
  private static restoreOriginalTypeToField(field: IField): void {
    field.type = field.originalType;
    field.typeQName = field.originalTypeQName;
    field.typeOverride = TypeOverrideVariant.NONE;
    field.fields = [];

    if (field.originalType === Types.Container && field.originalTypeQName) {
      field.namedTypeFragmentRefs = [field.originalTypeQName.toString()];
    } else {
      field.namedTypeFragmentRefs = [];
    }
  }

  /**
   * Low level API to apply multiple choice selections to a document.
   * Iterates through all provided selections and delegates to {@link processChoiceSelection} for each.
   *
   * @param document - The document to apply selections to
   * @param selections - Array of choice selections to apply
   * @param namespaceMap - Namespace prefix to URI mapping for path resolution
   *
   * @see processChoiceSelection
   * @see removeChoiceSelection
   */
  static processChoiceSelections(
    document: IDocument,
    selections: IChoiceSelection[],
    namespaceMap: Record<string, string>,
  ): void {
    for (const selection of selections) {
      DocumentUtilService.processChoiceSelection(document, selection, namespaceMap);
    }
  }

  /**
   * Low level API to apply a single choice selection to a document and update its definition.
   * Navigates to the choice field using the schemaPath and sets its {@link IField.selectedMemberIndex}.
   * Also updates {@link DocumentDefinition.choiceSelections} to keep the definition in sync with the live document.
   *
   * @param document - The document to apply the selection to
   * @param selection - The choice selection containing the path and selected member index
   * @param namespaceMap - Namespace prefix to URI mapping for path resolution
   *
   * @see processChoiceSelections
   * @see removeChoiceSelection
   */
  static processChoiceSelection(
    document: IDocument,
    selection: IChoiceSelection,
    namespaceMap: Record<string, string>,
  ): void {
    const choiceField = SchemaPathService.navigateToField(document, selection.schemaPath, namespaceMap);
    if (!choiceField) return;

    const applied = DocumentUtilService.applyChoiceSelectionToField(choiceField, selection.selectedMemberIndex);
    if (!applied) return;

    document.definition.choiceSelections ??= [];
    const existingIndex = document.definition.choiceSelections.findIndex((s) => s.schemaPath === selection.schemaPath);
    if (existingIndex >= 0) {
      document.definition.choiceSelections[existingIndex] = selection;
    } else {
      document.definition.choiceSelections.push(selection);
    }
  }

  /**
   * Low level API to remove a choice selection from a document and update its definition.
   * Navigates to the choice field and clears its {@link IField.selectedMemberIndex}.
   * Also removes the selection from {@link DocumentDefinition.choiceSelections}.
   *
   * @param document - The document to remove the selection from
   * @param schemaPath - The path string identifying the choice field (uses {@link IChoiceSelection.schemaPath} format)
   * @param namespaceMap - Namespace prefix to URI mapping for path resolution
   *
   * @see processChoiceSelection
   * @see processChoiceSelections
   */
  static removeChoiceSelection(document: IDocument, schemaPath: string, namespaceMap: Record<string, string>): void {
    if (!document.definition.choiceSelections) return;

    const existingIndex = document.definition.choiceSelections.findIndex((s) => s.schemaPath === schemaPath);
    if (existingIndex < 0) return;

    const choiceField = SchemaPathService.navigateToField(document, schemaPath, namespaceMap);
    if (choiceField) {
      choiceField.selectedMemberIndex = undefined;
    }

    document.definition.choiceSelections = document.definition.choiceSelections.filter(
      (s) => s.schemaPath !== schemaPath,
    );
  }

  private static applyChoiceSelectionToField(choiceField: IField, selectedMemberIndex: number): boolean {
    if (selectedMemberIndex < 0 || selectedMemberIndex >= choiceField.fields.length) {
      // Ignoring out of length selectedMemberIndex
      return false;
    }
    choiceField.selectedMemberIndex = selectedMemberIndex;
    return true;
  }

  /**
   * Generates a unique namespace prefix following sequential pattern (ns0, ns1, ns2, ...).
   * Starts from 'ns0' and increments until an available prefix is found.
   *
   * This method is shared across document services and mapping service to ensure
   * consistent namespace prefix generation throughout the application.
   *
   * @param namespaceMap - Map of existing prefix -> namespace URI mappings to avoid conflicts
   * @returns Generated prefix string
   */
  static generateNamespacePrefix(namespaceMap: Record<string, string>): string {
    for (let index = 0; ; index++) {
      const prefix = `ns${index}`;
      if (!namespaceMap[prefix]) {
        return prefix;
      }
    }
  }

  /**
   * Generates a human-readable display name for a choice compositor based on its member names.
   * Joins member names with ' | ' and truncates to 40 characters if needed.
   * @param choiceMembers - The member fields of the choice compositor
   * @returns A formatted display string such as "choice (option1 | option2)"
   */
  static formatChoiceDisplayName(choiceMembers?: IField[]): string {
    if (!choiceMembers || choiceMembers.length === 0) {
      return 'choice (empty)';
    }
    const memberNames = choiceMembers.map((m) => m.name).join(' | ');
    const maxLength = 40;
    if (memberNames.length > maxLength) {
      return `choice (${memberNames.substring(0, maxLength - 3)}...)`;
    }
    return `choice (${memberNames})`;
  }
}
