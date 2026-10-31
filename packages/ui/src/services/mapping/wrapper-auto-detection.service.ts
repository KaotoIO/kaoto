import { IDocument, IField, IParentType, PrimitiveDocument } from '../../models/datamapper/document';
import {
  CopyOfSelector,
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
 * Derives and repairs target-side wrapper state from the mapping tree: abstract substitutions,
 * non-abstract substitutions, and xs:choice selections inferred from XSLT content when loading
 * without `.kaoto` metadata, plus the target-side shape rules of the optional `xsl:if` guards.
 *
 * Wrapper-selection detection runs after XSLT deserialization, before visualization. The guard
 * rules only inspect shape and store nothing on the model: whether a guard is shown see-through is
 * decided by the target tree once per structural snapshot ({@link TargetRenderService}).
 *
 * Three conditions must all hold for wrapper auto-detection:
 * 1. `maxOccurs = 1` on the wrapper (or field for non-abstract substitution)
 * 2. Element uniquely identifies the target (not ambiguous across branches)
 * 3. No conditional instruction wrapping (`xsl:if`, `xsl:choose`)
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
   * Creation-side counterpart to {@link matchSimpleOptionalGuard}: whether a just-mapped
   * optional-to-optional field gets an `xsl:if` guard, so that what gets created is what the target
   * tree can recognise again.
   *
   * A field mapped by a single selector is only guarded when that selector is a bare path. Because
   * `XPathService.addSource` appends, a field that already carried a mapping reads as `"A, B"` here
   * and is not guarded — the guard's test would otherwise gate output it does not own. A freshly
   * filled empty selector, by contrast, holds just the new path and is guarded as usual.
   *
   * `hadExistingContent` only arbitrates the recursive-container case, which has no single selector
   * to inspect; callers must sample it before applying the mapping, since afterwards there is no way
   * to tell new children from pre-existing ones. Whether the guard is then shown see-through is not
   * decided here: the target tree decides it per structural snapshot ({@link TargetRenderService}).
   * @param fieldItem - the just-mapped target field item
   * @param sourceField - the source that was mapped onto it
   * @param hadExistingContent - whether the field already carried mapping content beforehand
   * @returns `true` to wrap the field in an `xsl:if` guard
   */
  static shouldWrapWithOptionalGuard(
    fieldItem: FieldItem,
    sourceField: PrimitiveDocument | IField,
    hadExistingContent: boolean,
  ): boolean {
    if (fieldItem.parent instanceof IfItem) return false;
    if (fieldItem.field.minOccurs !== 0 || !WrapperAutoDetectionService.isOptionalSourceField(sourceField)) {
      return false;
    }
    if (fieldItem.children.length === 0) return false;

    if (fieldItem.soleSelector) {
      return !!WrapperAutoDetectionService.getHiddenGuardSelector(fieldItem);
    }
    return !hadExistingContent;
  }

  /**
   * The target-side half of "can this field carry a see-through guard": not already under an
   * `IfItem`, optional on the target, and mapped by a single selector whose source path is simple —
   * the shape {@link matchSimpleOptionalGuard} recognises once the guard is in place. Shared by
   * {@link shouldWrapWithOptionalGuard} (drag-and-drop) and the "Add optional guard" menu action
   * ({@link TargetRenderService.canAddOptionalGuard}), which `MappingActionService.addOptionalGuard`
   * re-checks before wrapping.
   * @param fieldItem - the target field item to inspect
   * @returns the selector whose `sourcePath` becomes the guard's `test`, or `undefined`
   */
  static getHiddenGuardSelector(fieldItem: FieldItem): ValueOfSelector | CopyOfSelector | undefined {
    if (fieldItem.parent instanceof IfItem || fieldItem.field.minOccurs !== 0) return undefined;
    const selector = fieldItem.soleSelector;
    return selector && XPathService.isSimplePath(selector.sourcePath) ? selector : undefined;
  }

  /**
   * The single "is this source field optional" rule, shared by drag-and-drop creation
   * ({@link shouldWrapWithOptionalGuard}) and the target tree's see-through rule
   * ({@link TargetRenderService.isOptionalSourceSelector}), so the two cannot drift apart on what
   * counts as an optional source. A schemaless document root has no real occurrence semantics
   * despite `minOccurs` defaulting to 0, so it is never treated as optional.
   */
  static isOptionalSourceField(sourceField: PrimitiveDocument | IField): boolean {
    return !(sourceField instanceof PrimitiveDocument) && sourceField.minOccurs === 0;
  }

  /**
   * Pure predicate (no mutation). Checks whether `ifItem` and its content form the "simple
   * optional guard" shape:
   * - exactly one `FieldItem` child, with `minOccurs === 0` (target is optional)
   * - `test` is a simple path (no operators, functions, or predicates)
   * - that `FieldItem` has exactly one `ValueOfSelector`/`CopyOfSelector` child (not
   *   recursive `FieldItem` children)
   * - the selector's source path matches `test` (a `CopyOfType.CONTAINER_NODE`
   *   selector's trailing `/node()` is stripped before comparing)
   *
   * This is the target-side, structural half of the see-through rule only: it does not resolve the
   * source field the test refers to. {@link TargetRenderService.computeSeeThroughField} adds that
   * check, so that an `xsl:if` whose source is required is never see-through.
   * @param ifItem - the `IfItem` to test
   * @param test - the test to check the shape against; defaults to the `IfItem`'s own expression,
   *   and lets a caller ask about a candidate test without writing it to the model
   * @returns the matched inner `FieldItem`, or `undefined`
   */
  static matchSimpleOptionalGuard(ifItem: IfItem, test: string = ifItem.expression): FieldItem | undefined {
    if (ifItem.children.length !== 1) return undefined;
    const fieldItem = ifItem.children[0];
    if (!(fieldItem instanceof FieldItem)) return undefined;
    if (fieldItem.field.minOccurs !== 0) return undefined;

    const selector = fieldItem.soleSelector;
    if (!selector) return undefined;
    if (selector.sourcePath !== test) return undefined;

    // Parsing is the expensive part and XPathService.parse is not memoized, so it is gated behind
    // the cheap structural checks above — this predicate runs for every `if` at each snapshot and
    // decision check.
    return XPathService.isSimplePath(test) ? fieldItem : undefined;
  }
}
