import { IDocument, IField, IParentType } from '../../models/datamapper/document';
import {
  CopyOfSelector,
  CopyOfType,
  FieldItem,
  IfItem,
  MappingItem,
  MappingParentType,
  MappingTree,
  OtherwiseItem,
  ValueOfSelector,
  WhenItem,
} from '../../models/datamapper/mapping';
import { IChoiceSelection, IFieldSubstitution } from '../../models/datamapper/metadata';
import { FieldOverrideVariant } from '../../models/datamapper/types';
import { QName } from '../../xml-schema-ts/QName';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { ensureNamespaceRegistered, formatWithPrefix } from '../namespace-util';
import { SchemaPathService } from '../schema-path.service';
import { XPathService } from '../xpath/xpath.service';

/**
 * Infers abstract substitutions, non-abstract substitutions, and xs:choice selections
 * from XSLT content when loading without `.kaoto` metadata.
 *
 * Auto-detection is target-side only and runs after XSLT deserialization, before visualization.
 * Three conditions must all hold for auto-detection:
 * 1. `maxOccurs = 1` on the wrapper (or field for non-abstract substitution)
 * 2. Element uniquely identifies the target (not ambiguous across branches)
 * 3. No conditional instruction wrapping (`xsl:if`, `xsl:choose`)
 *
 * Also detects `xsl:if`-wrapped target fields that match the "simple optional guard" shape
 * produced by `MappingService.tryAutoOptionalIfWrap`
 * ({@link autoDetectOptionalGuards}, {@link matchSimpleOptionalGuard}), marking them
 * `isAutoOptionalIf = true`.
 */
export class WrapperAutoDetectionService {
  static autoDetectWrapperSelections(
    mappingTree: MappingTree,
    targetDocument: IDocument,
    namespaceMap: Record<string, string>,
  ): void {
    if (!(targetDocument instanceof XmlSchemaDocument)) return;

    const processedWrappers = new Set<IField>();
    WrapperAutoDetectionService.walkMappingTree(mappingTree, targetDocument, namespaceMap, processedWrappers);
    WrapperAutoDetectionService.markEmptyFieldItems(mappingTree);
  }

  private static walkMappingTree(
    parent: MappingParentType,
    targetDocument: IDocument,
    namespaceMap: Record<string, string>,
    processedWrappers: Set<IField>,
  ): void {
    for (const child of parent.children) {
      if (child instanceof FieldItem) {
        WrapperAutoDetectionService.processFieldItem(child, targetDocument, namespaceMap, processedWrappers);
        WrapperAutoDetectionService.tryPersistNonAbstractSubstitution(child, targetDocument, namespaceMap);
      }
      WrapperAutoDetectionService.walkMappingTree(child, targetDocument, namespaceMap, processedWrappers);
    }
  }

  private static processFieldItem(
    fieldItem: FieldItem,
    targetDocument: IDocument,
    namespaceMap: Record<string, string>,
    processedWrappers: Set<IField>,
  ): void {
    let identifyingField: IField = fieldItem.field;
    let current: IParentType = identifyingField.parent;

    while ('wrapperKind' in current && current.wrapperKind) {
      if (!processedWrappers.has(current)) {
        processedWrappers.add(current);
        if (current.wrapperKind === 'abstract') {
          WrapperAutoDetectionService.tryAutoDetectAbstractSelection(
            current,
            identifyingField,
            fieldItem,
            targetDocument,
            namespaceMap,
          );
        } else if (current.wrapperKind === 'choice') {
          WrapperAutoDetectionService.tryAutoDetectChoiceSelection(
            current,
            identifyingField,
            fieldItem,
            targetDocument,
            namespaceMap,
          );
        }
      }
      identifyingField = current;
      current = current.parent;
    }
  }

  private static tryAutoDetectAbstractSelection(
    wrapperField: IField,
    candidateField: IField,
    fieldItem: FieldItem,
    targetDocument: IDocument,
    namespaceMap: Record<string, string>,
  ): void {
    if (wrapperField.selectedMemberQName) return;
    if (!WrapperAutoDetectionService.isMaxOccursOne(wrapperField)) return;
    if (!WrapperAutoDetectionService.isUniqueInWrapper(candidateField, wrapperField)) return;
    if (WrapperAutoDetectionService.hasConditionalWrapper(fieldItem)) return;
    if (WrapperAutoDetectionService.hasExistingSubstitutionMetadata(wrapperField, targetDocument, namespaceMap)) return;

    wrapperField.selectedMemberQName = new QName(candidateField.namespaceURI, candidateField.name);
    fieldItem.isUserCreated = true;

    ensureNamespaceRegistered(candidateField.namespaceURI, namespaceMap, candidateField.namespacePrefix ?? undefined);
    ensureNamespaceRegistered(wrapperField.namespaceURI, namespaceMap, wrapperField.namespacePrefix ?? undefined);

    const schemaPath = SchemaPathService.build(wrapperField, namespaceMap);
    const entry: IFieldSubstitution = {
      schemaPath,
      name: formatWithPrefix(candidateField.namespaceURI, candidateField.name, namespaceMap),
      originalName: formatWithPrefix(wrapperField.namespaceURI, wrapperField.name, namespaceMap),
    };
    targetDocument.definition.fieldSubstitutions ??= [];
    targetDocument.definition.fieldSubstitutions.push(entry);
  }

  private static tryAutoDetectChoiceSelection(
    wrapperField: IField,
    memberField: IField,
    fieldItem: FieldItem,
    targetDocument: IDocument,
    namespaceMap: Record<string, string>,
  ): void {
    if (wrapperField.selectedMemberIndex !== undefined) return;
    if (!WrapperAutoDetectionService.isMaxOccursOne(wrapperField)) return;
    if (!WrapperAutoDetectionService.isUniqueInWrapper(memberField, wrapperField)) return;
    if (WrapperAutoDetectionService.hasConditionalWrapper(fieldItem)) return;
    if (WrapperAutoDetectionService.hasExistingChoiceMetadata(wrapperField, targetDocument, namespaceMap)) return;

    const memberIndex = wrapperField.fields.indexOf(memberField);
    if (memberIndex < 0) return;

    wrapperField.selectedMemberIndex = memberIndex;
    fieldItem.isUserCreated = true;

    const schemaPath = SchemaPathService.build(wrapperField, namespaceMap);
    const entry: IChoiceSelection = {
      schemaPath,
      selectedMemberIndex: memberIndex,
    };
    targetDocument.definition.choiceSelections ??= [];
    targetDocument.definition.choiceSelections.push(entry);
  }

  /**
   * Detects non-abstract fields that were auto-substituted during deserialization (Phase A)
   * but lack a corresponding `IFieldSubstitution` entry in the definition. Persists the entry
   * if the auto-detection conditions are met.
   */
  private static tryPersistNonAbstractSubstitution(
    fieldItem: FieldItem,
    targetDocument: IDocument,
    namespaceMap: Record<string, string>,
  ): void {
    const field = fieldItem.field;
    if (field.typeOverride !== FieldOverrideVariant.SUBSTITUTION) return;
    if (!field.originalField) return;
    if (!WrapperAutoDetectionService.isMaxOccursOne(field)) return;
    if (WrapperAutoDetectionService.hasConditionalWrapper(fieldItem)) return;

    ensureNamespaceRegistered(field.namespaceURI, namespaceMap, field.namespacePrefix ?? undefined);
    ensureNamespaceRegistered(
      field.originalField.namespaceURI,
      namespaceMap,
      field.originalField.namespacePrefix ?? undefined,
    );

    const schemaPath = SchemaPathService.buildOriginal(field, namespaceMap);

    const existing = targetDocument.definition.fieldSubstitutions?.find((s) => s.schemaPath === schemaPath);
    if (existing) return;

    const entry: IFieldSubstitution = {
      schemaPath,
      name: formatWithPrefix(field.namespaceURI, field.name, namespaceMap),
      originalName: formatWithPrefix(field.originalField.namespaceURI, field.originalField.name, namespaceMap),
    };
    targetDocument.definition.fieldSubstitutions ??= [];
    targetDocument.definition.fieldSubstitutions.push(entry);
  }

  static hasConditionalWrapper(mappingItem: MappingItem): boolean {
    let current: MappingParentType = mappingItem.parent;
    while (current instanceof MappingItem) {
      if (current instanceof IfItem || current instanceof WhenItem || current instanceof OtherwiseItem) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private static isMaxOccursOne(field: IField): boolean {
    return field.maxOccurs === 1;
  }

  static isUniqueInWrapper(identifyingField: IField, wrapperField: IField): boolean {
    let count = 0;
    for (const member of wrapperField.fields) {
      if (member.name === identifyingField.name && member.namespaceURI === identifyingField.namespaceURI) {
        count++;
      }
    }
    return count === 1;
  }

  private static hasExistingSubstitutionMetadata(
    wrapperField: IField,
    targetDocument: IDocument,
    namespaceMap: Record<string, string>,
  ): boolean {
    if (!targetDocument.definition.fieldSubstitutions?.length) return false;
    const schemaPath = SchemaPathService.build(wrapperField, namespaceMap);
    return targetDocument.definition.fieldSubstitutions.some((s) => s.schemaPath === schemaPath);
  }

  private static hasExistingChoiceMetadata(
    wrapperField: IField,
    targetDocument: IDocument,
    namespaceMap: Record<string, string>,
  ): boolean {
    if (!targetDocument.definition.choiceSelections?.length) return false;
    const schemaPath = SchemaPathService.build(wrapperField, namespaceMap);
    return targetDocument.definition.choiceSelections.some((s) => s.schemaPath === schemaPath);
  }

  private static markEmptyFieldItems(parent: MappingParentType): void {
    for (const child of parent.children) {
      if (child instanceof FieldItem && child.children.length === 0) {
        child.isUserCreated = true;
      }
      WrapperAutoDetectionService.markEmptyFieldItems(child);
    }
  }

  /**
   * Walks the full mapping tree and marks `isAutoOptionalIf = true` on every `IfItem`
   * matching {@link matchSimpleOptionalGuard}, at any nesting depth.
   * @param mappingTree - the mapping tree to walk, typically right after deserialization
   */
  static autoDetectOptionalGuards(mappingTree: MappingTree): void {
    WrapperAutoDetectionService.walkOptionalGuards(mappingTree);
  }

  private static walkOptionalGuards(parent: MappingParentType): void {
    for (const child of parent.children) {
      if (child instanceof IfItem && !child.isAutoOptionalIf) {
        if (WrapperAutoDetectionService.matchSimpleOptionalGuard(child)) {
          child.isAutoOptionalIf = true;
        }
      }
      WrapperAutoDetectionService.walkOptionalGuards(child);
    }
  }

  /**
   * Pure predicate (no mutation). Checks whether `ifItem` and its content form the "simple
   * optional guard" shape:
   * - exactly one `FieldItem` child, with `minOccurs === 0` (target is optional)
   * - `ifItem.expression` is a simple path (no operators, functions, or predicates)
   * - that `FieldItem` has exactly one `ValueOfSelector`/`CopyOfSelector` child (not
   *   recursive `FieldItem` children)
   * - the selector's expression matches `ifItem.expression` (a `CopyOfType.CONTAINER_NODE`
   *   selector's trailing `/node()` is stripped before comparing)
   *
   * This is a target-side, structural/round-trip check only — it does not re-resolve the
   * source field referenced by `ifItem.expression`, since that's unreliable from a bare
   * XPath string (relative paths, variables, ambiguous namespaces) and isn't needed to
   * recognize an already-materialized guard's shape.
   * @param ifItem - the `IfItem` to test
   * @returns the matched inner `FieldItem`, or `undefined`
   */
  static matchSimpleOptionalGuard(ifItem: IfItem): FieldItem | undefined {
    if (ifItem.children.length !== 1) return undefined;
    const fieldItem = ifItem.children[0];
    if (!(fieldItem instanceof FieldItem)) return undefined;
    if (fieldItem.field.minOccurs !== 0) return undefined;
    if (!XPathService.isSimplePath(ifItem.expression)) return undefined;

    const selector = WrapperAutoDetectionService.getSoleSelector(fieldItem);
    if (!selector) return undefined;

    const selectorExpression =
      selector instanceof CopyOfSelector && selector.valueType === CopyOfType.CONTAINER_NODE
        ? selector.expression.replace(/\/node\(\)$/, '')
        : selector.expression;
    return selectorExpression === ifItem.expression ? fieldItem : undefined;
  }

  /**
   * Returns `fieldItem`'s sole `ValueOfSelector`/`CopyOfSelector` child, or `undefined` if
   * it has zero, more than one, or non-selector children (e.g. recursive `FieldItem`
   * children from auto-mapped containers).
   * @param fieldItem - the field item to inspect
   */
  static getSoleSelector(fieldItem: FieldItem): ValueOfSelector | CopyOfSelector | undefined {
    if (fieldItem.children.length !== 1) return undefined;
    const only = fieldItem.children[0];
    return only instanceof ValueOfSelector || only instanceof CopyOfSelector ? only : undefined;
  }

  /**
   * The *effective* see-through state for rendering: `true` only when `ifItem.isAutoOptionalIf`
   * is set **and** its content still matches {@link matchSimpleOptionalGuard}.
   *
   * `isAutoOptionalIf` is set at specific trigger points (auto-wrap, manual add, XPath-blur
   * re-collapse, deserialization), but plenty of *other* tree mutations can invalidate the
   * shape afterwards without going through any of those — e.g. wrapping the promoted field
   * with another instruction (`xsl:choose`, `xsl:for-each`), or adding a sibling (a node-scoped
   * variable) directly under the guard. Rather than hunting down and patching every such
   * mutation site to proactively demote the flag, every renderer-facing consumer calls this
   * instead of reading the raw flag: it self-heals a stale `true` by re-deriving the real
   * shape on every call, so a guard that's no longer "just a bare field reference" always
   * renders as a regular, visible `if` — without ever promoting an `IfItem` the flag doesn't
   * already mark (a user-authored visible `if` that happens to look simple stays visible).
   * @param ifItem - the `IfItem` to check
   */
  static isEffectivelyAutoOptional(ifItem: IfItem): boolean {
    return ifItem.isAutoOptionalIf && !!WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem);
  }
}
