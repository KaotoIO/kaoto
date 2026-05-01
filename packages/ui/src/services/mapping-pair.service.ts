import { IField } from '../models/datamapper/document';
import { DocumentService } from './document/document.service';
import { JsonSchemaField } from './document/json-schema/json-schema-document.model';
import { XmlSchemaField } from './document/xml-schema/xml-schema-document.model';

export interface FieldPair {
  source: IField;
  target: IField;
}

/**
 * Service for field relationship logic between source and target fields.
 * Understands both XML and JSON formats, handles same-format and cross-format operations.
 * Single source of truth for all field pairing and comparison logic.
 */
export class MappingPairService {
  /**
   * Check if copy-of can be safely used for container mapping.
   * Returns true only for XML → XML with matching namespace+name.
   * Empty namespace is treated as matching any namespace.
   */
  static canUseCopyOf(sourceField: IField, targetField: IField): boolean {
    // Only use copy-of for XML → XML with matching namespace+name
    if (sourceField instanceof XmlSchemaField && targetField instanceof XmlSchemaField) {
      // Empty namespace {} is treated same as any namespace
      const namespaceMatches =
        !sourceField.namespaceURI || !targetField.namespaceURI || sourceField.namespaceURI === targetField.namespaceURI;

      return namespaceMatches && sourceField.name === targetField.name;
    }

    // For all other cases (JSON, cross-format), use auto-mapping
    return false;
  }

  /** Find matching children between source and target containers. */
  static findMatchingChildren(sourceField: IField, targetField: IField): FieldPair[] {
    // XML → XML
    if (sourceField instanceof XmlSchemaField && targetField instanceof XmlSchemaField) {
      return this.findMatchingXmlChildren(sourceField, targetField);
    }

    // JSON → JSON
    if (sourceField instanceof JsonSchemaField && targetField instanceof JsonSchemaField) {
      return this.findMatchingJsonChildren(sourceField, targetField);
    }

    // Cross-format (XML ↔ JSON)
    return this.findMatchingCrossFormatChildren(sourceField, targetField);
  }

  /** Find matching children for XML → XML mapping. Matches by name, isAttribute, and namespace. */
  private static findMatchingXmlChildren(sourceField: XmlSchemaField, targetField: XmlSchemaField): FieldPair[] {
    const matches: FieldPair[] = [];

    for (const targetChild of targetField.fields) {
      const matchingSource = sourceField.fields.find((sourceChild) => {
        if (sourceChild.name !== targetChild.name || sourceChild.isAttribute !== targetChild.isAttribute) {
          return false;
        }
        if (DocumentService.hasChildren(sourceChild) !== DocumentService.hasChildren(targetChild)) {
          return false;
        }

        const namespaceMatches =
          !sourceChild.namespaceURI ||
          !targetChild.namespaceURI ||
          sourceChild.namespaceURI === targetChild.namespaceURI;

        return namespaceMatches;
      });

      if (matchingSource) {
        matches.push({ source: matchingSource, target: targetChild });
      }
    }

    return matches;
  }

  /** Find matching children for JSON → JSON mapping. Matches by key and type. */
  private static findMatchingJsonChildren(sourceField: JsonSchemaField, targetField: JsonSchemaField): FieldPair[] {
    const matches: FieldPair[] = [];

    for (const targetChild of targetField.fields) {
      if (!(targetChild instanceof JsonSchemaField)) continue;

      const matchingSource = sourceField.fields.find((sourceChild) => {
        return (
          sourceChild.key === targetChild.key &&
          DocumentService.hasChildren(sourceChild) === DocumentService.hasChildren(targetChild)
        );
      });

      if (matchingSource) {
        matches.push({ source: matchingSource, target: targetChild });
      }
    }

    return matches;
  }

  /** Find matching children for cross-format mapping (XML ↔ JSON). Matches by name/key and kind (terminal or container). */
  private static findMatchingCrossFormatChildren(sourceField: IField, targetField: IField): FieldPair[] {
    const matches: FieldPair[] = [];

    // Helper to get the field identifier (name for XML, key for JSON)
    const getFieldIdentifier = (field: IField): string => {
      if (field instanceof JsonSchemaField) {
        return field.key;
      }
      return field.name;
    };

    // Match fields across formats
    for (const targetChild of targetField.fields) {
      const targetIdentifier = getFieldIdentifier(targetChild);
      const targetHasChildren = DocumentService.hasChildren(targetChild);

      const matchingSource = sourceField.fields.find((sourceChild) => {
        // Match by identifier (XML.name === JSON.key)
        if (getFieldIdentifier(sourceChild) !== targetIdentifier) return false;

        // Verify both are same kind (both terminal OR both container)
        const sourceHasChildren = DocumentService.hasChildren(sourceChild);
        return sourceHasChildren === targetHasChildren;
      });

      if (matchingSource) {
        matches.push({ source: matchingSource, target: targetChild });
      }
    }

    return matches;
  }
}
