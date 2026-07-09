import { IDocument, IField, IParentType } from '../../models/datamapper/document';
import {
  FieldItem,
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

/**
 * Infers abstract substitutions, non-abstract substitutions, and xs:choice selections
 * from XSLT content when loading without `.kaoto` metadata.
 *
 * Auto-detection is target-side only and runs after XSLT deserialization, before visualization.
 * Three conditions must all hold for auto-detection:
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
}
