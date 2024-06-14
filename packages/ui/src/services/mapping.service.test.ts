//import { MappingService } from './mapping.service';
//import { DocumentType } from '../models/document';
//import { FieldItem } from '../models/mapping';
//import { XmlSchemaDocumentService } from './xml-schema-document.service';
//import * as fs from 'node:fs';

describe('MappingService', () => {
  it('TODO', () => {});
  /*
  const orderXsd = fs.readFileSync(__dirname + '/../../../../test-resources/ShipOrder.xsd').toString();
  const sourceDoc = XmlSchemaDocumentService.createXmlSchemaDocument(
    DocumentType.SOURCE_BODY,
    'ShipOrder.xsd',
    orderXsd,
  );
  const sourceParam = XmlSchemaDocumentService.createXmlSchemaDocument(DocumentType.PARAM, 'ShipOrder.xsd', orderXsd);
  const targetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(
    DocumentType.TARGET_BODY,
    'ShipOrder.xsd',
    orderXsd,
  );

  describe('validateFieldPairForNewMapping()', () => {
    it('validate mapping', () => {
      const mapping = MappingService.createNewMapping(sourceDoc.fields[0], targetDoc.fields[0]);
      const validated = MappingService.validateNodePairForMapping(
        [mapping],
        sourceDoc.fields[0].fields[0],
        targetDoc.fields[0].fields[0],
      );
      expect(validated.sourceField?.fieldIdentifier.toString()).toEqual(sourceDoc.fields[0].fields[0].path.toString());
      expect(validated.targetField?.fieldIdentifier.toString()).toEqual(targetDoc.fields[0].fields[0].path.toString());
    });
    it('invalidate duplicate mapping', () => {
      const mapping = MappingService.createNewMapping(sourceDoc.fields[0], targetDoc.fields[0]);
      let validated = MappingService.validateNodePairForMapping([mapping], sourceDoc.fields[0], targetDoc.fields[0]);
      expect(validated.sourceField).toBeUndefined();
      expect(validated.targetField).toBeUndefined();
      validated = MappingService.validateNodePairForMapping([mapping], targetDoc.fields[0], sourceDoc.fields[0]);
      expect(validated.sourceField).toBeUndefined();
      expect(validated.targetField).toBeUndefined();
    });
  });

  describe('createNewMapping', () => {
    it('', () => {
      const mapping = MappingService.createNewMapping(sourceDoc.fields[0], targetDoc.fields[0]);
      expect(mapping.source.elements.length).toEqual(1);
      expect(mapping.targetFields.length).toEqual(1);
    });
  });

  describe('getMappingsFor', () => {
    it('', () => {
      const mapping1 = MappingService.createNewMapping(sourceDoc.fields[0].fields[0], targetDoc.fields[0].fields[0]);
      const mapping2 = MappingService.createNewMapping(sourceDoc.fields[0].fields[1], targetDoc.fields[0].fields[1]);
      const found = MappingService.getAllMappingsFor([mapping1, mapping2], sourceDoc.fields[0].fields[1]);
      expect(found.length).toEqual(1);
      expect((found[0].source.elements[0] as IFieldItem).field.fieldIdentifier.toString()).toEqual(
        sourceDoc.fields[0].fields[1].fieldIdentifier.toString(),
      );
    });
  });

  describe('removeMappingsForDocument', () => {
    it('', () => {
      const mapping1 = MappingService.createNewMapping(sourceDoc.fields[0].fields[0], targetDoc.fields[0].fields[0]);
      const mapping2 = MappingService.createNewMapping(sourceParam.fields[0].fields[1], targetDoc.fields[0].fields[1]);
      const cleaned = MappingService.removeAllMappingsForDocument(
        [mapping1, mapping2],
        sourceParam.documentType,
        sourceParam.documentId,
      );
      expect(cleaned.length).toEqual(1);
      expect((cleaned[0].source.elements[0] as IFieldItem).field.fieldIdentifier.toString()).toEqual(
        sourceDoc.fields[0].fields[0].path.toString(),
      );
    });
  });

   */
});
