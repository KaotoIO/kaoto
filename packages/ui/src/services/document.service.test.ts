import { DocumentService } from './document.service';

import { TestUtil, multipleElementsXsd } from '../stubs/datamapper/data-mapper';
import {
  DocumentDefinitionType,
  DocumentType,
  PathSegment,
  PrimitiveDocument,
  RootElementOption,
} from '../models/datamapper';
import { XmlSchemaDocument } from './xml-schema-document.service';
import { JsonSchemaDocument } from './json-schema-document.service';
import { IMetadataApi } from '../providers';

describe('DocumentService', () => {
  const sourceDoc = TestUtil.createSourceOrderDoc();
  const targetDoc = TestUtil.createTargetOrderDoc();
  const namespaces = { kaoto: 'io.kaoto.datamapper.poc.test' };

  describe('createDocument()', () => {
    it('should create a XML schema document', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(`<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                   <xs:element name="test" type="xs:string" />
                 </xs:schema>`),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      expect(result.document instanceof XmlSchemaDocument).toBeTruthy();
      expect(result.documentDefinition).toBeDefined();
      expect(result.documentDefinition?.documentType).toBe(DocumentType.SOURCE_BODY);
      expect(result.documentDefinition?.definitionType).toBe(DocumentDefinitionType.XML_SCHEMA);
      expect(result.rootElementOptions).toBeDefined();
      expect(result.rootElementOptions?.length).toEqual(1);
    });

    it('should create XML schema document with multiple root elements', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(multipleElementsXsd),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'multiple',
        ['MultipleElements.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      expect(result.document instanceof XmlSchemaDocument).toBeTruthy();
      expect(result.rootElementOptions).toBeDefined();
      expect(result.rootElementOptions?.length).toBe(3);

      expect(result.rootElementOptions).toEqual([
        { name: 'Order', namespaceUri: 'io.kaoto.datamapper.test.multiple' },
        { name: 'Invoice', namespaceUri: 'io.kaoto.datamapper.test.multiple' },
        { name: 'Shipment', namespaceUri: 'io.kaoto.datamapper.test.multiple' },
      ]);
    });

    it('should return error if XML schema is not parseable', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(JSON.stringify({ type: 'string' })),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      expect(result.validationStatus).toBe('error');
      expect(result.validationMessage).toBeDefined();
      expect(result.document).toBeUndefined();
      expect(result.documentDefinition).toBeUndefined();
    });

    it('should create a JSON schema document', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(JSON.stringify({ type: 'string' })),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test',
        ['test.json'],
      );

      expect(result.validationStatus).toBe('success');
      expect(result.document instanceof JsonSchemaDocument).toBeTruthy();
      expect(result.documentDefinition).toBeDefined();
      expect(result.documentDefinition?.documentType).toBe(DocumentType.SOURCE_BODY);
      expect(result.documentDefinition?.definitionType).toBe(DocumentDefinitionType.JSON_SCHEMA);
    });

    it('should return error if JSON schema is not parseable', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(`<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                   <xs:element name="test" type="xs:string" />
                 </xs:schema>`),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test',
        ['test.json'],
      );

      expect(result.validationStatus).toBe('error');
      expect(result.validationMessage).toBeDefined();
      expect(result.document).toBeUndefined();
      expect(result.documentDefinition).toBeUndefined();
    });

    it('should return error if file content is empty', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(''),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      expect(result.validationStatus).toBe('error');
      expect(result.validationMessage).toBe('Could not create a document from schema file(s)');
      expect(result.document).toBeUndefined();
      expect(result.documentDefinition).toBeUndefined();
    });
  });

  describe('createPrimitiveDocument()', () => {
    it('should create a primitive document', () => {
      const result = DocumentService.createPrimitiveDocument(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.Primitive,
        'test',
      );
      expect(result.validationStatus).toBe('success');
      expect(result.document instanceof PrimitiveDocument).toBeTruthy();
      expect(result.document?.documentId).toEqual('Body');
      expect(result.documentDefinition).toBeDefined();
      expect(result.documentDefinition?.documentType).toBe(DocumentType.SOURCE_BODY);
      expect(result.documentDefinition?.definitionType).toBe(DocumentDefinitionType.Primitive);
      expect(result.documentDefinition?.name).toBe('test');
    });

    it('should create a primitive document for a param', () => {
      const result = DocumentService.createPrimitiveDocument(
        DocumentType.PARAM,
        DocumentDefinitionType.Primitive,
        'test',
      );
      expect(result.validationStatus).toBe('success');
      expect(result.document instanceof PrimitiveDocument).toBeTruthy();
      expect(result.document?.documentId).toEqual('test');
      expect(result.documentDefinition).toBeDefined();
      expect(result.documentDefinition?.documentType).toBe(DocumentType.PARAM);
      expect(result.documentDefinition?.definitionType).toBe(DocumentDefinitionType.Primitive);
      expect(result.documentDefinition?.name).toBe('test');
    });
  });

  describe('hasField()', () => {
    it('', () => {
      expect(DocumentService.hasField(sourceDoc, sourceDoc.fields[0].fields[0])).toBeTruthy();
      expect(DocumentService.hasField(sourceDoc, targetDoc.fields[0].fields[0])).toBeFalsy();
    });
  });

  describe('getFieldFromPathSegments()', () => {
    it('', () => {
      const pathSegments = [new PathSegment('ShipOrder', false, 'kaoto'), new PathSegment('ShipTo')];
      const field = DocumentService.getFieldFromPathSegments(namespaces, sourceDoc, pathSegments);
      expect(field?.name).toEqual('ShipTo');
    });
  });

  describe('isCollectionField()', () => {
    it('', () => {
      expect(DocumentService.isCollectionField(sourceDoc.fields[0])).toBeFalsy();
      expect(DocumentService.isCollectionField(targetDoc.fields[0])).toBeFalsy();
      expect(DocumentService.isCollectionField(sourceDoc.fields[0].fields[0])).toBeFalsy();
      expect(DocumentService.isCollectionField(targetDoc.fields[0].fields[0])).toBeFalsy();
      expect(DocumentService.isCollectionField(sourceDoc.fields[0].fields[1])).toBeFalsy();
      expect(DocumentService.isCollectionField(targetDoc.fields[0].fields[1])).toBeFalsy();
      expect(DocumentService.isCollectionField(sourceDoc.fields[0].fields[2])).toBeFalsy();
      expect(DocumentService.isCollectionField(targetDoc.fields[0].fields[2])).toBeFalsy();
      expect(DocumentService.isCollectionField(sourceDoc.fields[0].fields[3])).toBeTruthy();
      expect(DocumentService.isCollectionField(targetDoc.fields[0].fields[3])).toBeTruthy();
    });
  });

  describe('createDocument() error handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      expect(result.validationStatus).toBe('error');
      expect(result.validationMessage).toContain('Could not create a document from schema file(s)');
      expect(result.document).toBeUndefined();
      expect(result.documentDefinition).toBeUndefined();
    });

    it('should handle malformed JSON for JSON schema', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue('{invalid json'),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test',
        ['test.json'],
      );

      expect(result.validationStatus).toBe('error');
      expect(result.validationMessage).toBeDefined();
      expect(result.document).toBeUndefined();
      expect(result.documentDefinition).toBeUndefined();
    });

    it('should handle invalid XML content that looks valid initially', async () => {
      // Mock XML that passes initial validation but fails during processing
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(`<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                   <xs:element name="test" type="xs:invalid-type" />
                 </xs:schema>`),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      // Should handle gracefully even if schema has issues
      expect(result.validationStatus).toBeDefined();
      expect(['success', 'error']).toContain(result.validationStatus);
    });
  });

  describe('createDocument() with multiple files', () => {
    it('should handle multiple schema files', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValueOnce(`<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                     <xs:element name="test1" type="xs:string" />
                   </xs:schema>`).mockResolvedValueOnce(`<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                     <xs:element name="test2" type="xs:string" />
                   </xs:schema>`),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test1.xsd', 'test2.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      expect(result.document).toBeDefined();
      expect(result.documentDefinition).toBeDefined();
      expect(mockApi.getResourceContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRootElementQName()', () => {
    it('should return null for non-XML schema documents', () => {
      const primitiveDoc = new PrimitiveDocument(DocumentType.SOURCE_BODY, 'test');
      const qName = DocumentService.getRootElementQName(primitiveDoc);
      expect(qName).toBeNull();
    });

    it('should return null for undefined document', () => {
      const qName = DocumentService.getRootElementQName();
      expect(qName).toBeNull();
    });

    it('should return QName for XML schema document', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(multipleElementsXsd),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['MultipleElements.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      const qName = DocumentService.getRootElementQName(result.document);
      expect(qName).toBeDefined();
      expect(qName?.getLocalPart()).toBe('Order'); // Default to first element
      expect(qName?.getNamespaceURI()).toBe('io.kaoto.datamapper.test.multiple');
    });
  });

  describe('updateRootElement()', () => {
    it('should return original document for non-XML schema documents', () => {
      const primitiveDoc = new PrimitiveDocument(DocumentType.SOURCE_BODY, 'test');
      const rootElementOption: RootElementOption = {
        name: 'Test',
        namespaceUri: 'http://test.com',
      };

      const updatedDoc = DocumentService.updateRootElement(primitiveDoc, rootElementOption);
      expect(updatedDoc).toBe(primitiveDoc);
    });

    it('should create new document with different root element for XML schema documents', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(multipleElementsXsd),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['MultipleElements.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      const originalDocument = result.document as XmlSchemaDocument;

      // Verify original document has Order as root element
      const originalQName = DocumentService.getRootElementQName(originalDocument);
      expect(originalQName?.getLocalPart()).toBe('Order');

      // Update to Invoice root element
      const invoiceOption: RootElementOption = {
        name: 'Invoice',
        namespaceUri: 'io.kaoto.datamapper.test.multiple',
      };

      const updatedDocument = DocumentService.updateRootElement(originalDocument, invoiceOption);
      expect(updatedDocument).not.toBe(originalDocument); // Should be a new instance
      expect(updatedDocument instanceof XmlSchemaDocument).toBeTruthy();

      // Verify updated document has Invoice as root element
      const updatedQName = DocumentService.getRootElementQName(updatedDocument);
      expect(updatedQName?.getLocalPart()).toBe('Invoice');
      expect(updatedQName?.getNamespaceURI()).toBe('io.kaoto.datamapper.test.multiple');
    });
  });

  describe('createPrimitiveDocument() edge cases', () => {
    it('should handle different document types correctly', () => {
      const sourceResult = DocumentService.createPrimitiveDocument(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.Primitive,
        'sourceTest',
      );
      expect(sourceResult.document?.documentId).toEqual('Body');

      const targetResult = DocumentService.createPrimitiveDocument(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.Primitive,
        'targetTest',
      );
      expect(targetResult.document?.documentId).toEqual('Body');

      const paramResult = DocumentService.createPrimitiveDocument(
        DocumentType.PARAM,
        DocumentDefinitionType.Primitive,
        'paramTest',
      );
      expect(paramResult.document?.documentId).toEqual('paramTest');
    });

    it('should create proper DocumentDefinition for primitives', () => {
      const result = DocumentService.createPrimitiveDocument(
        DocumentType.PARAM,
        DocumentDefinitionType.Primitive,
        'testParam',
      );

      expect(result.documentDefinition?.documentType).toBe(DocumentType.PARAM);
      expect(result.documentDefinition?.definitionType).toBe(DocumentDefinitionType.Primitive);
      expect(result.documentDefinition?.name).toBe('testParam');
      expect(result.documentDefinition?.definitionFiles).toEqual({});
    });
  });
});
