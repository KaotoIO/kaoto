import { IDocument, IField, IParentType, PrimitiveDocument } from '../../models/datamapper/document';
import {
  FieldItem,
  IExpressionHolder,
  IfItem,
  MappingItem,
  MappingParentType,
  MappingTree,
  OtherwiseItem,
  WhenItem,
} from '../../models/datamapper/mapping';
import { IChoiceSelection, IFieldSubstitution } from '../../models/datamapper/metadata';
import { FieldOverrideVariant } from '../../models/datamapper/types';
import { QName } from '../../xml-schema-ts/QName';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { ensureNamespaceRegistered, formatWithPrefix } from '../namespace-util';
import { SchemaPathService } from '../schema-path.service';
import { XPathService } from '../xpath/xpath.service';

/** Whether an optional-to-optional mapping gets no guard, a regular `if`, or a see-through one. */
export type OptionalGuardDecision = 'skip' | 'visible' | 'hidden';

/**
 * Derives and repairs target-side wrapper state from the mapping tree: abstract substitutions,
 * non-abstract substitutions, and xs:choice selections inferred from XSLT content when loading
 * without `.kaoto` metadata, plus the auto-optional `xsl:if` guards.
 *
 * Wrapper-selection detection runs after XSLT deserialization, before visualization. The
 * auto-optional guard rules additionally run per-edit via {@link onExpressionChanged}, so each of
 * them must do its cheap structural checks before any XPath parse.
 *
 * Three conditions must all hold for wrapper auto-detection:
 * 1. `maxOccurs = 1` on the wrapper (or field for non-abstract substitution)
 * 2. Element uniquely identifies the target (not ambiguous across branches)
 * 3. No conditional instruction wrapping (`xsl:if`, `xsl:choose`)
 *
 * The auto-optional guard side owns both halves of one definition, which is why they live
 * together: {@link decideOptionalGuard} decides whether `MappingService.tryAutoOptionalIfWrap`
 * creates a guard and whether it is see-through, and {@link matchSimpleOptionalGuard} recognises
 * one again afterwards. {@link applyAutoOptionalFlag} is the shared rule, reached tree-wide by
 * {@link autoDetectOptionalGuards} and per-node by {@link onExpressionChanged}.
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
   * Walks the full mapping tree and applies {@link applyAutoOptionalFlag} to every `IfItem` at any
   * nesting depth. `isAutoOptionalIf` is not serialized, so after deserialization this is what
   * recovers it — including for `xsl:if`s the user wrote by hand that happen to match the shape,
   * which is indistinguishable from a generated guard once the flag is gone.
   * @param mappingTree - the mapping tree to walk, typically right after deserialization
   */
  static autoDetectOptionalGuards(mappingTree: MappingTree): void {
    WrapperAutoDetectionService.walkOptionalGuards(mappingTree);
  }

  private static walkOptionalGuards(parent: MappingParentType): void {
    for (const child of parent.children) {
      if (child instanceof IfItem) {
        WrapperAutoDetectionService.applyAutoOptionalFlag(child);
      }
      WrapperAutoDetectionService.walkOptionalGuards(child);
    }
  }

  /**
   * The single definition of when a guard is see-through: exactly when its content still matches
   * {@link matchSimpleOptionalGuard}. Applied tree-wide at load by {@link autoDetectOptionalGuards}
   * and per-node after an edit by {@link onExpressionChanged}, so the two can never disagree about
   * the same tree.
   * @param ifItem - the `IfItem` whose flag should be brought in line with its current shape
   */
  private static applyAutoOptionalFlag(ifItem: IfItem): void {
    ifItem.isAutoOptionalIf = !!WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem);
  }

  /**
   * Single entry point for "the expression on this item just changed" — call sites announce the
   * event and this decides which derived state needs bringing back in line. New post-edit
   * invariants belong here rather than at every writer: the auto-optional guard originally
   * re-checked itself inside `MappingService.tryAutoOptionalIfWrap`, which only ran on mapping
   * engagement and so missed every hand-edit.
   *
   * Returns `void` deliberately. If callers could branch on repair work it would leak back into
   * drag-and-drop's structural/non-structural decision and force needless tree rebuilds.
   *
   * Fires on every keystroke, since neither XPath editor debounces, so each rule must do its cheap
   * structural checks before any XPath parse. That churn is safe only because keystrokes take the
   * non-structural refresh path and the target tree is rebuilt from `structuralMappingTree`;
   * anything rendering off these flags must likewise decide at structural cadence, or nodes will
   * appear and disappear mid-word and steal focus from the XPath input.
   * @param item - the expression holder that was just written to
   */
  static onExpressionChanged(item: IExpressionHolder): void {
    if (!(item instanceof MappingItem)) return;
    WrapperAutoDetectionService.evaluateAutoOptionalGuard(item);
  }

  /**
   * Re-applies {@link applyAutoOptionalFlag} to the nearest enclosing `IfItem`, which is the only
   * guard an expression on `item` can belong to. Two-way on purpose: load-time detection promotes
   * any shape-matching `IfItem` regardless of origin, so demoting without re-promoting would leave
   * in-session state disagreeing with what the same tree looks like after a reload.
   * @param item - the mapping item whose expression changed
   */
  private static evaluateAutoOptionalGuard(item: MappingItem): void {
    let current: MappingParentType = item;
    while (current instanceof MappingItem) {
      if (current instanceof IfItem) {
        WrapperAutoDetectionService.applyAutoOptionalFlag(current);
        return;
      }
      current = current.parent;
    }
  }

  /**
   * Creation-side counterpart to {@link matchSimpleOptionalGuard}, holding every reason an
   * optional-to-optional mapping should or should not be guarded so that what gets created and
   * what gets recognised cannot drift apart.
   *
   * `'hidden'` is only returned when the field's mapping is a single bare path, which is also what
   * makes the guard recognisable again after a round trip. Because `XPathService.addSource`
   * appends, a field that already carried a mapping reads as `"A, B"` here and is rejected — the
   * guard's test would otherwise gate output it does not own. A freshly filled empty selector, by
   * contrast, holds just the new path and is guarded as usual.
   *
   * `hadExistingContent` only arbitrates the recursive-container case, which has no single
   * selector to inspect; callers must sample it before applying the mapping, since afterwards
   * there is no way to tell new children from pre-existing ones.
   * @param fieldItem - the just-mapped target field item
   * @param sourceField - the source that was mapped onto it
   * @param hadExistingContent - whether the field already carried mapping content beforehand
   * @returns `'skip'` to leave the mapping unguarded, `'visible'` to guard it with a regular `if`,
   * `'hidden'` to guard it with a see-through one
   */
  static decideOptionalGuard(
    fieldItem: FieldItem,
    sourceField: PrimitiveDocument | IField,
    hadExistingContent: boolean,
  ): OptionalGuardDecision {
    if (fieldItem.parent instanceof IfItem) return 'skip';
    // A schemaless document root has no real occurrence semantics despite minOccurs defaulting to 0.
    if (sourceField instanceof PrimitiveDocument) return 'skip';
    if (fieldItem.field.minOccurs !== 0 || sourceField.minOccurs !== 0) return 'skip';
    if (fieldItem.children.length === 0) return 'skip';

    const selector = fieldItem.soleSelector;
    if (selector) return XPathService.isSimplePath(selector.sourcePath) ? 'hidden' : 'skip';
    return hadExistingContent ? 'skip' : 'visible';
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

    const selector = fieldItem.soleSelector;
    if (!selector) return undefined;
    if (selector.sourcePath !== ifItem.expression) return undefined;

    // Parsing is the expensive part and XPathService.parse is not memoized, so it is gated behind
    // the cheap structural checks above — this predicate is re-derived on every read.
    return XPathService.isSimplePath(ifItem.expression) ? fieldItem : undefined;
  }

  /**
   * The *effective* see-through state for rendering: `true` only when `ifItem.isAutoOptionalIf`
   * is set **and** its content still matches {@link matchSimpleOptionalGuard}.
   *
   * Expression changes keep the flag honest on their own, via {@link onExpressionChanged}. This
   * covers what they cannot: *structural* mutations that invalidate the shape without touching an
   * expression — wrapping the guarded field in another instruction (`xsl:choose`, `xsl:for-each`),
   * or adding a sibling such as a node-scoped variable directly under the guard. Rather than
   * patching every such mutation site, renderer-facing consumers call this and get the real shape
   * re-derived, so a guard that is no longer "just a bare field reference" renders as a regular,
   * visible `if`.
   * @param ifItem - the `IfItem` to check
   */
  static isEffectivelyAutoOptional(ifItem: IfItem): boolean {
    return ifItem.isAutoOptionalIf && !!WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem);
  }
}
