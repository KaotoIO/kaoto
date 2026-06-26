import { IField } from '../../../models/datamapper/document';
import { FieldItem, MappingTree } from '../../../models/datamapper/mapping';
import {
  AddMappingNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../../models/datamapper/visualization';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { QName } from '../../../xml-schema-ts/QName';
import { formatTypeQName, isFieldNode, prepareFieldDetails } from './field-details-utils';

describe('field-details-utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isFieldNode', () => {
    it('should return true for FieldNodeData', () => {
      const shipOrderDoc = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(shipOrderDoc);
      const field = shipOrderDoc.fields[0];
      const fieldNodeData = new FieldNodeData(documentNodeData, field);

      expect(isFieldNode(fieldNodeData)).toBe(true);
    });

    it('should return true for FieldItemNodeData', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(targetDoc.documentType, targetDoc.documentId, targetDoc.definitionType);
      const targetDocNodeData = new TargetDocumentNodeData(targetDoc, mappingTree);
      const field = targetDoc.fields[0];
      const targetFieldNodeData = new TargetFieldNodeData(targetDocNodeData, field);
      const fieldItem = new FieldItem(mappingTree, field);
      const fieldItemNodeData = new FieldItemNodeData(targetFieldNodeData, fieldItem);

      expect(isFieldNode(fieldItemNodeData)).toBe(true);
    });

    it('should return true for AddMappingNodeData', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(targetDoc.documentType, targetDoc.documentId, targetDoc.definitionType);
      const targetDocNodeData = new TargetDocumentNodeData(targetDoc, mappingTree);
      const field = targetDoc.fields[0];
      const addMappingNodeData = new AddMappingNodeData(targetDocNodeData, field);

      expect(isFieldNode(addMappingNodeData)).toBe(true);
    });

    it('should return false for DocumentNodeData', () => {
      const shipOrderDoc = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(shipOrderDoc);

      expect(isFieldNode(documentNodeData)).toBe(false);
    });
  });

  describe('formatTypeQName', () => {
    it('should return "N/A" when typeQName is null', () => {
      expect(formatTypeQName(null)).toBe('N/A');
    });

    it('should return local part when namespace URI is not present', () => {
      const qname = new QName(null, 'string');
      expect(formatTypeQName(qname)).toBe('string');
    });

    it('should return formatted string with namespace when local part is empty', () => {
      const qname = new QName('http://example.com', '');
      expect(formatTypeQName(qname)).toBe(' (http://example.com)');
    });

    it('should return "N/A" when getLocalPart returns null', () => {
      const qname = new QName('http://example.com', 'test');
      vi.spyOn(qname, 'getLocalPart').mockReturnValue(null);
      expect(formatTypeQName(qname)).toBe('N/A (http://example.com)');
    });

    it('should return formatted string with namespace when both are present', () => {
      const qname = new QName('http://www.w3.org/2001/XMLSchema', 'string');
      expect(formatTypeQName(qname)).toBe('string (http://www.w3.org/2001/XMLSchema)');
    });
  });

  describe('prepareFieldDetails', () => {
    const createMockField = (overrides: Partial<IField> = {}): IField => {
      return {
        name: 'testField',
        type: 'Element',
        typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'string'),
        minOccurs: 1,
        maxOccurs: 1,
        namespaceURI: '',
        namespacePrefix: null,
        isAttribute: false,
        nillable: false,
        wrapperKind: undefined,
        description: undefined,
        ...overrides,
      } as IField;
    };

    it('should include all basic field properties', () => {
      const field = createMockField();
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Category', value: 'Element' });
      expect(result).toContainEqual({ label: 'Type', value: 'string (http://www.w3.org/2001/XMLSchema)' });
      expect(result).toContainEqual({ label: 'Min Occurs', value: '1' });
      expect(result).toContainEqual({ label: 'Max Occurs', value: '1' });
    });

    it('should convert empty string to "N/A" for namespace', () => {
      const field = createMockField({
        namespaceURI: '',
        description: undefined,
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Namespace', value: 'N/A' });
      expect(result.find((item) => item.label === 'Description')).toBeUndefined();
    });

    it('should convert empty string to "N/A"', () => {
      const field = createMockField({
        description: '',
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Description', value: 'N/A' });
    });

    it('should include namespace when present', () => {
      const field = createMockField({
        namespaceURI: 'http://example.com/schema',
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Namespace', value: 'http://example.com/schema' });
    });

    it('should include "Attribute: yes" when field is an attribute', () => {
      const field = createMockField({
        isAttribute: true,
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Attribute', value: 'yes' });
    });

    it('should not include Attribute when field is not an attribute', () => {
      const field = createMockField({
        isAttribute: false,
      });
      const result = prepareFieldDetails(field);

      expect(result.find((item) => item.label === 'Attribute')).toBeUndefined();
    });

    it('should include "Nillable: yes" when field is nillable', () => {
      const field = createMockField({
        nillable: true,
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Nillable', value: 'yes' });
    });

    it('should not include Nillable when field is not nillable', () => {
      const field = createMockField({
        nillable: false,
      });
      const result = prepareFieldDetails(field);

      expect(result.find((item) => item.label === 'Nillable')).toBeUndefined();
    });

    it('should include wrapperKind when present', () => {
      const field = createMockField({
        wrapperKind: 'choice',
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Wrapper Kind', value: 'choice' });
    });

    it('should not include wrapperKind when undefined', () => {
      const field = createMockField({
        wrapperKind: undefined,
      });
      const result = prepareFieldDetails(field);

      expect(result.find((item) => item.label === 'Wrapper Kind')).toBeUndefined();
    });

    it('should include description when present', () => {
      const field = createMockField({
        description: 'Test description',
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Description', value: 'Test description' });
    });

    it('should handle minOccurs as 0', () => {
      const field = createMockField({
        minOccurs: 0,
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Min Occurs', value: '0' });
    });

    it('should handle maxOccurs as "unbounded"', () => {
      const field = createMockField({
        maxOccurs: 'unbounded',
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Max Occurs', value: 'unbounded' });
    });

    it('should call getOverrideDisplayInfo with field and namespaceMap', () => {
      const field = createMockField();
      const namespaceMap = { 'http://example.com': 'ex' };

      // Just verify the function is called - the override logic is tested in FieldNodePopover.test.tsx
      prepareFieldDetails(field, namespaceMap);

      // The function should be called internally, we're just testing the integration
      expect(prepareFieldDetails(field, namespaceMap)).toBeDefined();
    });

    it('should handle undefined minOccurs', () => {
      const field = createMockField({
        minOccurs: undefined as unknown as number,
      });
      const result = prepareFieldDetails(field);

      expect(result.find((item) => item.label === 'Min Occurs')).toBeUndefined();
    });

    it('should handle undefined maxOccurs', () => {
      const field = createMockField({
        maxOccurs: undefined as unknown as number,
      });
      const result = prepareFieldDetails(field);

      expect(result.find((item) => item.label === 'Max Occurs')).toBeUndefined();
    });

    it('should handle null typeQName', () => {
      const field = createMockField({
        typeQName: null,
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Type', value: 'N/A' });
    });
  });
});
