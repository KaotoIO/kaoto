import { IField } from '../../models/datamapper/document';
import { Types } from '../../models/datamapper/types';
import { DocumentService } from '../document/document.service';
import { DocumentUtilService } from '../document/document-util.service';
import { JsonSchemaField } from '../document/json-schema/json-schema-document.model';
import { XmlSchemaField } from '../document/xml-schema/xml-schema-document.model';

/** A matched pair of source and target fields produced by {@link FieldMatchingService.findMatchingChildren}. */
export interface FieldPair {
  source: IField;
  target: IField;
}

/**
 * Field relationship logic between source and target fields.
 * Handles same-format (XML↔XML, JSON↔JSON) and cross-format matching.
 * Single source of truth for field pairing — consumed by both validation and auto-mapping.
 */
export class FieldMatchingService {
  /**
   * Determines if `xsl:copy-of` can be used for this field pair.
   * Returns `true` only for XML→XML when both share the same namespace and name,
   * or when either side is `xs:anyType`. Always `false` for JSON or cross-format.
   */
  static canUseCopyOf(sourceField: IField, targetField: IField): boolean {
    if (sourceField instanceof XmlSchemaField && targetField instanceof XmlSchemaField) {
      if (sourceField.type === Types.AnyType || targetField.type === Types.AnyType) {
        return true;
      }

      return sourceField.namespaceURI === targetField.namespaceURI && sourceField.name === targetField.name;
    }

    return false;
  }

  /**
   * Returns matching child pairs between two container fields.
   * Matching strategy differs by format:
   * - XML→XML: by name, isAttribute, and namespace
   * - JSON→JSON: by key and structural kind (terminal vs container)
   * - Cross-format: by name/key identifier and structural kind
   */
  static findMatchingChildren(sourceField: IField, targetField: IField): FieldPair[] {
    DocumentUtilService.resolveTypeFragment(sourceField);
    DocumentUtilService.resolveTypeFragment(targetField);

    if (sourceField instanceof XmlSchemaField && targetField instanceof XmlSchemaField) {
      return this.findMatchingXmlChildren(sourceField, targetField);
    }

    if (sourceField instanceof JsonSchemaField && targetField instanceof JsonSchemaField) {
      return this.findMatchingJsonChildren(sourceField, targetField);
    }

    return this.findMatchingCrossFormatChildren(sourceField, targetField);
  }

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

        return sourceChild.namespaceURI === targetChild.namespaceURI;
      });

      if (matchingSource) {
        matches.push({ source: matchingSource, target: targetChild });
      }
    }

    return matches;
  }

  private static findMatchingJsonChildren(sourceField: JsonSchemaField, targetField: JsonSchemaField): FieldPair[] {
    const matches: FieldPair[] = [];

    for (const targetChild of targetField.fields) {
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

  private static findMatchingCrossFormatChildren(sourceField: IField, targetField: IField): FieldPair[] {
    const matches: FieldPair[] = [];

    const getFieldIdentifier = (field: IField): string => {
      if (field instanceof JsonSchemaField) {
        return field.key;
      }
      return field.name;
    };

    for (const targetChild of targetField.fields) {
      const targetIdentifier = getFieldIdentifier(targetChild);
      const targetHasChildren = DocumentService.hasChildren(targetChild);

      const matchingSource = sourceField.fields.find((sourceChild) => {
        if (getFieldIdentifier(sourceChild) !== targetIdentifier) return false;

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
