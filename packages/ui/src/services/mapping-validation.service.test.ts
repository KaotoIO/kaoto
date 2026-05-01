import { DocumentDefinition, DocumentDefinitionType, DocumentType } from '../models/datamapper/document';
import { Types } from '../models/datamapper/types';
import { JsonSchemaDocument, JsonSchemaField } from './document/json-schema/json-schema-document.model';
import { XmlSchemaDocument, XmlSchemaField } from './document/xml-schema/xml-schema-document.model';
import { MappingValidationService } from './mapping-validation.service';

describe('MappingValidationService', () => {
  describe('validateMapping', () => {
    describe('Case 1: Terminal → Container (INVALID)', () => {
      it('should reject XML terminal → XML container', () => {
        const sourceField = createXmlField('name', 'http://example.com/ns');
        const targetField = createXmlField('address', 'http://example.com/ns');
        const targetChild = createXmlField('street', 'http://example.com/ns');
        targetField.fields.push(targetChild);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Cannot map a terminal field to a container field');
      });

      it('should reject JSON terminal → JSON container', () => {
        const sourceField = createJsonField('name', Types.String);
        const targetField = createJsonField('address', Types.Container);
        const targetChild = createJsonField('street', Types.String);
        targetField.fields.push(targetChild);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Cannot map a terminal field to a container field');
      });

      it('should reject XML terminal → JSON container', () => {
        const sourceField = createXmlField('name', 'http://example.com/ns');
        const targetField = createJsonField('address', Types.Container);
        const targetChild = createJsonField('street', Types.String);
        targetField.fields.push(targetChild);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Cannot map a terminal field to a container field');
      });

      it('should reject JSON terminal → XML container', () => {
        const sourceField = createJsonField('name', Types.String);
        const targetField = createXmlField('address', 'http://example.com/ns');
        const targetChild = createXmlField('street', 'http://example.com/ns');
        targetField.fields.push(targetChild);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Cannot map a terminal field to a container field');
      });
    });

    describe('Case 2: Container → Container with NO matches (INVALID)', () => {
      it('should reject XML container → XML container with no matching children', () => {
        const sourceField = createXmlField('source', 'http://example.com/ns');
        const sourceChild = createXmlField('name', 'http://example.com/ns');
        sourceField.fields.push(sourceChild);

        const targetField = createXmlField('target', 'http://example.com/ns');
        const targetChild = createXmlField('email', 'http://example.com/ns');
        targetField.fields.push(targetChild);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Cannot map containers with no matching children');
      });

      it('should reject JSON container → JSON container with no matching children', () => {
        const sourceField = createJsonField('source', Types.Container);
        const sourceChild = createJsonField('name', Types.String);
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('target', Types.Container);
        const targetChild = createJsonField('email', Types.String);
        targetField.fields.push(targetChild);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Cannot map containers with no matching children');
      });

      it('should reject XML container → JSON container with no matching children', () => {
        const sourceField = createXmlField('source', 'http://example.com/ns');
        const sourceChild = createXmlField('name', 'http://example.com/ns');
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('target', Types.Container);
        const targetChild = createJsonField('email', Types.String);
        targetField.fields.push(targetChild);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Cannot map containers with no matching children');
      });

      it('should reject JSON container → XML container with no matching children', () => {
        const sourceField = createJsonField('source', Types.Container);
        const sourceChild = createJsonField('name', Types.String);
        sourceField.fields.push(sourceChild);

        const targetField = createXmlField('target', 'http://example.com/ns');
        const targetChild = createXmlField('email', 'http://example.com/ns');
        targetField.fields.push(targetChild);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Cannot map containers with no matching children');
      });

      it('should reject when children have same name but different types (terminal vs container)', () => {
        const sourceField = createXmlField('root', 'http://example.com/ns');
        const sourceChild = createXmlField('address', 'http://example.com/ns');
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('root', Types.Container);
        const targetChild = createJsonField('address', Types.Container);
        const targetGrandchild = createJsonField('street', Types.String);
        targetChild.fields.push(targetGrandchild);
        targetField.fields.push(targetChild);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Cannot map containers with no matching children');
      });
    });

    describe('Case 3: Terminal → Terminal (VALID)', () => {
      it('should accept XML terminal → XML terminal', () => {
        const sourceField = createXmlField('name', 'http://example.com/ns');
        const targetField = createXmlField('fullName', 'http://example.com/ns');

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });

      it('should accept JSON terminal → JSON terminal', () => {
        const sourceField = createJsonField('name', Types.String);
        const targetField = createJsonField('fullName', Types.String);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });

      it('should accept XML terminal → JSON terminal', () => {
        const sourceField = createXmlField('name', 'http://example.com/ns');
        const targetField = createJsonField('fullName', Types.String);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });

      it('should accept JSON terminal → XML terminal', () => {
        const sourceField = createJsonField('name', Types.String);
        const targetField = createXmlField('fullName', 'http://example.com/ns');

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });

      it('should accept different primitive types', () => {
        const sourceField = createJsonField('age', Types.Integer);
        const targetField = createJsonField('ageString', Types.String);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });

      it('should treat containers with no children as terminals', () => {
        const sourceField = createJsonField('source', Types.Container);
        const targetField = createJsonField('target', Types.Container);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });
    });

    describe('Case 4: Container → Terminal (VALID)', () => {
      it('should accept XML container → XML terminal', () => {
        const sourceField = createXmlField('address', 'http://example.com/ns');
        const sourceChild = createXmlField('street', 'http://example.com/ns');
        sourceField.fields.push(sourceChild);

        const targetField = createXmlField('addressString', 'http://example.com/ns');

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });

      it('should accept JSON container → JSON terminal', () => {
        const sourceField = createJsonField('address', Types.Container);
        const sourceChild = createJsonField('street', Types.String);
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('addressString', Types.String);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });

      it('should accept XML container → JSON terminal', () => {
        const sourceField = createXmlField('address', 'http://example.com/ns');
        const sourceChild = createXmlField('street', 'http://example.com/ns');
        sourceField.fields.push(sourceChild);

        const targetField = createJsonField('addressString', Types.String);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });

      it('should accept JSON container → XML terminal', () => {
        const sourceField = createJsonField('address', Types.Container);
        const sourceChild = createJsonField('street', Types.String);
        sourceField.fields.push(sourceChild);

        const targetField = createXmlField('addressString', 'http://example.com/ns');

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });
    });

    describe('Case 5: Container → Container with matches (VALID)', () => {
      it('should accept XML container → XML container with matching children', () => {
        const sourceField = createXmlField('source', 'http://example.com/ns');
        const sourceChild1 = createXmlField('name', 'http://example.com/ns');
        const sourceChild2 = createXmlField('age', 'http://example.com/ns');
        sourceField.fields.push(sourceChild1, sourceChild2);

        const targetField = createXmlField('target', 'http://example.com/ns');
        const targetChild1 = createXmlField('name', 'http://example.com/ns');
        const targetChild2 = createXmlField('email', 'http://example.com/ns');
        targetField.fields.push(targetChild1, targetChild2);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });

      it('should accept JSON container → JSON container with matching children', () => {
        const sourceField = createJsonField('source', Types.Container);
        const sourceChild1 = createJsonField('name', Types.String);
        const sourceChild2 = createJsonField('age', Types.Integer);
        sourceField.fields.push(sourceChild1, sourceChild2);

        const targetField = createJsonField('target', Types.Container);
        const targetChild1 = createJsonField('name', Types.String);
        const targetChild2 = createJsonField('email', Types.String);
        targetField.fields.push(targetChild1, targetChild2);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });

      it('should accept XML container → JSON container with matching children', () => {
        const sourceField = createXmlField('source', 'http://example.com/ns');
        const sourceChild1 = createXmlField('name', 'http://example.com/ns');
        const sourceChild2 = createXmlField('age', 'http://example.com/ns');
        sourceField.fields.push(sourceChild1, sourceChild2);

        const targetField = createJsonField('target', Types.Container);
        const targetChild1 = createJsonField('name', Types.String);
        const targetChild2 = createJsonField('email', Types.String);
        targetField.fields.push(targetChild1, targetChild2);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });

      it('should accept JSON container → XML container with matching children', () => {
        const sourceField = createJsonField('source', Types.Container);
        const sourceChild1 = createJsonField('name', Types.String);
        const sourceChild2 = createJsonField('age', Types.Integer);
        sourceField.fields.push(sourceChild1, sourceChild2);

        const targetField = createXmlField('target', 'http://example.com/ns');
        const targetChild1 = createXmlField('name', 'http://example.com/ns');
        const targetChild2 = createXmlField('email', 'http://example.com/ns');
        targetField.fields.push(targetChild1, targetChild2);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });

      it('should accept when only one child matches', () => {
        const sourceField = createXmlField('source', 'http://example.com/ns');
        const sourceChild1 = createXmlField('name', 'http://example.com/ns');
        const sourceChild2 = createXmlField('age', 'http://example.com/ns');
        const sourceChild3 = createXmlField('phone', 'http://example.com/ns');
        sourceField.fields.push(sourceChild1, sourceChild2, sourceChild3);

        const targetField = createXmlField('target', 'http://example.com/ns');
        const targetChild1 = createXmlField('name', 'http://example.com/ns');
        const targetChild2 = createXmlField('email', 'http://example.com/ns');
        const targetChild3 = createXmlField('address', 'http://example.com/ns');
        targetField.fields.push(targetChild1, targetChild2, targetChild3);

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });

      it('should accept nested container matches', () => {
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

        const result = MappingValidationService.validateMapping(sourceField, targetField);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
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
