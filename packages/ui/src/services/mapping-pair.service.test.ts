import { DocumentDefinition, DocumentDefinitionType, DocumentType } from '../models/datamapper/document';
import { Types } from '../models/datamapper/types';
import { JsonSchemaDocument, JsonSchemaField } from './document/json-schema/json-schema-document.model';
import { XmlSchemaDocument, XmlSchemaField } from './document/xml-schema/xml-schema-document.model';
import { MappingPairService } from './mapping-pair.service';

describe('MappingPairService', () => {
  describe('canUseCopyOf', () => {
    describe('XML → XML', () => {
      it('should return true for matching namespace and name', () => {
        const sourceField = createXmlField('person', 'http://example.com/ns');
        const targetField = createXmlField('person', 'http://example.com/ns');

        expect(MappingPairService.canUseCopyOf(sourceField, targetField)).toBe(true);
      });

      it('should return false for non-matching namespace', () => {
        const sourceField = createXmlField('person', 'http://example.com/ns1');
        const targetField = createXmlField('person', 'http://example.com/ns2');

        expect(MappingPairService.canUseCopyOf(sourceField, targetField)).toBe(false);
      });

      it('should return false for non-matching name', () => {
        const sourceField = createXmlField('person', 'http://example.com/ns');
        const targetField = createXmlField('employee', 'http://example.com/ns');

        expect(MappingPairService.canUseCopyOf(sourceField, targetField)).toBe(false);
      });

      it('should return true when source has empty namespace', () => {
        const sourceField = createXmlField('person', '');
        const targetField = createXmlField('person', 'http://example.com/ns');

        expect(MappingPairService.canUseCopyOf(sourceField, targetField)).toBe(true);
      });

      it('should return true when target has empty namespace', () => {
        const sourceField = createXmlField('person', 'http://example.com/ns');
        const targetField = createXmlField('person', '');

        expect(MappingPairService.canUseCopyOf(sourceField, targetField)).toBe(true);
      });

      it('should return true when both have empty namespace', () => {
        const sourceField = createXmlField('person', '');
        const targetField = createXmlField('person', '');

        expect(MappingPairService.canUseCopyOf(sourceField, targetField)).toBe(true);
      });
    });

    describe('JSON → JSON', () => {
      it('should return false (always use auto-mapping)', () => {
        const sourceField = createJsonField('person', Types.Container);
        const targetField = createJsonField('person', Types.Container);

        expect(MappingPairService.canUseCopyOf(sourceField, targetField)).toBe(false);
      });
    });

    describe('Cross-format (XML ↔ JSON)', () => {
      it('should return false for XML → JSON', () => {
        const sourceField = createXmlField('person', 'http://example.com/ns');
        const targetField = createJsonField('person', Types.Container);

        expect(MappingPairService.canUseCopyOf(sourceField, targetField)).toBe(false);
      });

      it('should return false for JSON → XML', () => {
        const sourceField = createJsonField('person', Types.Container);
        const targetField = createXmlField('person', 'http://example.com/ns');

        expect(MappingPairService.canUseCopyOf(sourceField, targetField)).toBe(false);
      });
    });
  });

  describe('findMatchingChildren', () => {
    describe('XML → XML', () => {
      it('should find matching children by name and namespace', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceChild1 = createXmlField('name', 'http://example.com/ns');
        const sourceChild2 = createXmlField('age', 'http://example.com/ns');
        sourceField.fields.push(sourceChild1, sourceChild2);

        const targetField = createXmlField('root', 'http://example.com/ns');
        const targetChild1 = createXmlField('name', 'http://example.com/ns');
        const targetChild2 = createXmlField('email', 'http://example.com/ns');
        targetField.fields.push(targetChild1, targetChild2);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(1);
        expect(matches[0].source).toBe(sourceChild1);
        expect(matches[0].target).toBe(targetChild1);
      });

      it('should match attributes separately from elements', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceElement = createXmlField('id', 'http://example.com/ns', false);
        const sourceAttribute = createXmlField('id', 'http://example.com/ns', true);
        sourceField.fields.push(sourceElement, sourceAttribute);

        const targetField = createXmlField('root', 'http://example.com/ns');
        const targetAttribute = createXmlField('id', 'http://example.com/ns', true);
        targetField.fields.push(targetAttribute);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(1);
        expect(matches[0].source).toBe(sourceAttribute);
        expect(matches[0].target).toBe(targetAttribute);
      });

      it('should match when source has no namespace', () => {
        const sourceField = createXmlField('root', '');
        const sourceChild = createXmlField('name', '');
        sourceField.fields.push(sourceChild);

        const targetField = createXmlField('root', 'http://example.com/ns');
        const targetChild = createXmlField('name', 'http://example.com/ns');
        targetField.fields.push(targetChild);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(1);
        expect(matches[0].source).toBe(sourceChild);
        expect(matches[0].target).toBe(targetChild);
      });

      it('should match when target has no namespace', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceChild = createXmlField('name', 'http://example.com/ns');
        sourceField.fields.push(sourceChild);

        const targetField = createXmlField('root', '');
        const targetChild = createXmlField('name', '');
        targetField.fields.push(targetChild);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(1);
        expect(matches[0].source).toBe(sourceChild);
        expect(matches[0].target).toBe(targetChild);
      });

      it('should not match children with different non-empty namespaces', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns1');
        const sourceChild = createXmlField('name', 'http://example.com/ns1');
        sourceField.fields.push(sourceChild);

        const targetField = createXmlField('root', 'http://example.com/ns2');
        const targetChild = createXmlField('name', 'http://example.com/ns2');
        targetField.fields.push(targetChild);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(0);
      });

      it('should return multiple matching pairs', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceChild1 = createXmlField('name', 'http://example.com/ns');
        const sourceChild2 = createXmlField('age', 'http://example.com/ns');
        const sourceChild3 = createXmlField('email', 'http://example.com/ns');
        sourceField.fields.push(sourceChild1, sourceChild2, sourceChild3);

        const targetField = createXmlField('root', 'http://example.com/ns');
        const targetChild1 = createXmlField('name', 'http://example.com/ns');
        const targetChild2 = createXmlField('age', 'http://example.com/ns');
        const targetChild3 = createXmlField('phone', 'http://example.com/ns');
        targetField.fields.push(targetChild1, targetChild2, targetChild3);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(2);
        expect(matches[0].source).toBe(sourceChild1);
        expect(matches[0].target).toBe(targetChild1);
        expect(matches[1].source).toBe(sourceChild2);
        expect(matches[1].target).toBe(targetChild2);
      });

      it('should return empty array when no matches found', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceChild = createXmlField('name', 'http://example.com/ns');
        sourceField.fields.push(sourceChild);

        const targetField = createXmlField('root', 'http://example.com/ns');
        const targetChild = createXmlField('email', 'http://example.com/ns');
        targetField.fields.push(targetChild);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(0);
      });

      it('should return empty array when both containers have no children', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const targetField = createXmlField('root', 'http://example.com/ns');

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(0);
      });

      it('should handle partial matches (subset)', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceChild1 = createXmlField('name', 'http://example.com/ns');
        const sourceChild2 = createXmlField('age', 'http://example.com/ns');
        const sourceChild3 = createXmlField('email', 'http://example.com/ns');
        sourceField.fields.push(sourceChild1, sourceChild2, sourceChild3);

        const targetField = createXmlField('root', 'http://example.com/ns');
        const targetChild1 = createXmlField('name', 'http://example.com/ns');
        const targetChild2 = createXmlField('phone', 'http://example.com/ns');
        targetField.fields.push(targetChild1, targetChild2);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(1);
        expect(matches[0].source).toBe(sourceChild1);
        expect(matches[0].target).toBe(targetChild1);
      });

      it('should not match same-name children when only one side has descendants', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceChild = createXmlField('address', 'http://example.com/ns');
        sourceField.fields.push(sourceChild);

        const targetField = createXmlField('root', 'http://example.com/ns');
        const targetChild = createXmlField('address', 'http://example.com/ns');
        targetChild.fields.push(createXmlField('street', 'http://example.com/ns'));
        targetField.fields.push(targetChild);

        expect(MappingPairService.findMatchingChildren(sourceField, targetField)).toHaveLength(0);
      });
    });

    describe('JSON → JSON', () => {
      it('should find matching children by key and type', () => {
        const sourceField = createJsonField('root', Types.Container);
        const sourceChild1 = createJsonField('name', Types.String);
        const sourceChild2 = createJsonField('age', Types.Integer);
        sourceField.fields.push(sourceChild1, sourceChild2);

        const targetField = createJsonField('root', Types.Container);
        const targetChild1 = createJsonField('name', Types.String);
        const targetChild2 = createJsonField('email', Types.String);
        targetField.fields.push(targetChild1, targetChild2);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(1);
        expect(matches[0].source).toBe(sourceChild1);
        expect(matches[0].target).toBe(targetChild1);
      });

      it('should match fields with same key but different primitive type', () => {
        const sourceField = createJsonField('root', Types.Container);
        const sourceChild = createJsonField('id', Types.String);
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('root', Types.Container);
        const targetChild = createJsonField('id', Types.Integer);
        targetField.fields.push(targetChild);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(1);
        expect(matches[0].source).toBe(sourceChild);
        expect(matches[0].target).toBe(targetChild);
      });

      it('should return empty array when no matches found', () => {
        const sourceField = createJsonField('root', Types.Container);
        const sourceChild = createJsonField('name', Types.String);
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('root', Types.Container);
        const targetChild = createJsonField('email', Types.String);
        targetField.fields.push(targetChild);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(0);
      });

      it('should return multiple matching pairs', () => {
        const sourceField = createJsonField('root', Types.Container);
        const sourceChild1 = createJsonField('name', Types.String);
        const sourceChild2 = createJsonField('age', Types.Integer);
        sourceField.fields.push(sourceChild1, sourceChild2);

        const targetField = createJsonField('root', Types.Container);
        const targetChild1 = createJsonField('name', Types.String);
        const targetChild2 = createJsonField('age', Types.Integer);
        targetField.fields.push(targetChild1, targetChild2);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(2);
        expect(matches[0].source).toBe(sourceChild1);
        expect(matches[0].target).toBe(targetChild1);
        expect(matches[1].source).toBe(sourceChild2);
        expect(matches[1].target).toBe(targetChild2);
      });

      it('should handle partial matches (subset)', () => {
        const sourceField = createJsonField('root', Types.Container);
        const sourceChild1 = createJsonField('name', Types.String);
        const sourceChild2 = createJsonField('age', Types.Integer);
        const sourceChild3 = createJsonField('email', Types.String);
        sourceField.fields.push(sourceChild1, sourceChild2, sourceChild3);

        const targetField = createJsonField('root', Types.Container);
        const targetChild1 = createJsonField('name', Types.String);
        const targetChild2 = createJsonField('phone', Types.String);
        targetField.fields.push(targetChild1, targetChild2);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(1);
        expect(matches[0].source).toBe(sourceChild1);
        expect(matches[0].target).toBe(targetChild1);
      });

      it('should not match same-key children when only one side has descendants', () => {
        const sourceField = createJsonField('root', Types.Container);
        const sourceChild = createJsonField('address', Types.Container);
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('root', Types.Container);
        const targetChild = createJsonField('address', Types.Container);
        targetChild.fields.push(createJsonField('street', Types.String));
        targetField.fields.push(targetChild);

        expect(MappingPairService.findMatchingChildren(sourceField, targetField)).toHaveLength(0);
      });
    });

    describe('Cross-format (XML ↔ JSON)', () => {
      it('should match XML → JSON by name/key for terminal fields', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceChild = createXmlField('name', 'http://example.com/ns');
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('root', Types.Container);
        const targetChild = createJsonField('name', Types.String);
        targetField.fields.push(targetChild);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(1);
        expect(matches[0].source).toBe(sourceChild);
        expect(matches[0].target).toBe(targetChild);
      });

      it('should match JSON → XML by key/name for terminal fields', () => {
        const sourceField = createJsonField('root', Types.Container);
        const sourceChild = createJsonField('name', Types.String);
        sourceField.fields.push(sourceChild);

        const targetField = createXmlField('root', 'http://example.com/ns');
        const targetChild = createXmlField('name', 'http://example.com/ns');
        targetField.fields.push(targetChild);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(1);
        expect(matches[0].source).toBe(sourceChild);
        expect(matches[0].target).toBe(targetChild);
      });

      it('should match container fields across formats', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceChild = createXmlField('address', 'http://example.com/ns');
        const sourceGrandchild = createXmlField('street', 'http://example.com/ns');
        sourceChild.fields.push(sourceGrandchild);
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('root', Types.Container);
        const targetChild = createJsonField('address', Types.Container);
        const targetGrandchild = createJsonField('street', Types.String);
        targetChild.fields.push(targetGrandchild);
        targetField.fields.push(targetChild);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(1);
        expect(matches[0].source).toBe(sourceChild);
        expect(matches[0].target).toBe(targetChild);
      });

      it('should not match terminal with container', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceChild = createXmlField('address', 'http://example.com/ns');
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('root', Types.Container);
        const targetChild = createJsonField('address', Types.Container);
        const targetGrandchild = createJsonField('street', Types.String);
        targetChild.fields.push(targetGrandchild);
        targetField.fields.push(targetChild);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(0);
      });

      it('should not match container with terminal', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceChild = createXmlField('address', 'http://example.com/ns');
        const sourceGrandchild = createXmlField('street', 'http://example.com/ns');
        sourceChild.fields.push(sourceGrandchild);
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('root', Types.Container);
        const targetChild = createJsonField('address', Types.String);
        targetField.fields.push(targetChild);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(0);
      });

      it('should match XML attribute with JSON field by name', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceChild = createXmlField('id', 'http://example.com/ns', true);
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('root', Types.Container);
        const targetChild = createJsonField('id', Types.String);
        targetField.fields.push(targetChild);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(1);
        expect(matches[0].source).toBe(sourceChild);
        expect(matches[0].target).toBe(targetChild);
      });

      it('should return empty array when no matches found', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceChild = createXmlField('name', 'http://example.com/ns');
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('root', Types.Container);
        const targetChild = createJsonField('email', Types.String);
        targetField.fields.push(targetChild);

        const matches = MappingPairService.findMatchingChildren(sourceField, targetField);

        expect(matches).toHaveLength(0);
      });
    });
  });
});

// Helper functions to create test fields
function createXmlField(name: string, namespaceURI: string, isAttribute = false): XmlSchemaField {
  const mockParent = {
    path: { documentType: DocumentType.SOURCE_BODY, documentId: 'test', pathSegments: [] },
    isNamespaceAware: true,
  } as unknown as XmlSchemaDocument;

  const field = new XmlSchemaField(mockParent, name, isAttribute);
  field.namespaceURI = namespaceURI;
  return field;
}

function createJsonField(key: string, type: Types): JsonSchemaField {
  const doc = new JsonSchemaDocument(
    new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.JSON_SCHEMA, 'test'),
  );
  return new JsonSchemaField(doc, key, type);
}
