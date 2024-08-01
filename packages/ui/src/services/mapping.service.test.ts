//import { MappingService } from './mapping.service';
//import { BODY_DOCUMENT_ID, DocumentType } from '../models/document';
//import { FieldItem } from '../models/mapping';
//import { XmlSchemaDocumentService } from './xml-schema-document.service';
//import * as fs from 'node:fs';

import { MappingService } from './mapping.service';
import * as fs from 'fs';
import { TestUtil } from '../test/test-util';
import { MappingTree } from '../models/mapping';
import { MappingSerializerService } from './mapping-serializer.service';

describe('MappingService', () => {
  const sourceDoc = TestUtil.createSourceOrderDoc();
  const targetDoc = TestUtil.createTargetOrderDoc();
  const paramsMap = TestUtil.createParameterMap();
  const xsltFile = fs.readFileSync(__dirname + '/../../../../test-resources/ShipOrderToShipOrder.xsl').toString();

  describe('extractMappingLinks()', () => {
    it('should return IMappingLink[]', () => {
      const tree = new MappingTree(targetDoc.documentType, targetDoc.documentId);
      MappingSerializerService.deserialize(xsltFile, targetDoc, tree, paramsMap);
      const links = MappingService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(11);
      expect(links[0].sourceNodePath).toMatch('OrderId');
      expect(links[0].targetNodePath).toMatch('OrderId');
      expect(links[1].sourceNodePath).toMatch('OrderPerson');
      expect(links[1].targetNodePath).toMatch('/if-');
      expect(links[2].sourceNodePath).toMatch('OrderPerson');
      expect(links[2].targetNodePath).toMatch(/if-.*field-OrderPerson/);
      expect(links[3].targetNodePath).toMatch('ShipTo');
      expect(links[3].targetNodePath).toMatch('ShipTo');
      expect(links[4].sourceNodePath).toMatch('Item');
      expect(links[4].targetNodePath).toMatch('/for-each');
      expect(links[5].sourceNodePath).toMatch('Title');
      expect(links[5].targetNodePath).toMatch(/for-each-.*field-Item-.*field-Title-.*/);
      expect(links[6].sourceNodePath).toMatch('Note');
      expect(links[6].targetNodePath).toMatch(/for-each-.*field-Item-.*choose-.*when-.*/);
      expect(links[7].sourceNodePath).toMatch('Note');
      expect(links[7].targetNodePath).toMatch(/for-each-.*field-Item-.*field-Note-.*/);
      expect(links[8].sourceNodePath).toMatch('Title');
      expect(links[8].targetNodePath).toMatch(/for-each-.*field-Item-.*choose-.*otherwise-.*field-Note-.*/);
      expect(links[9].sourceNodePath).toMatch('Quantity');
      expect(links[9].targetNodePath).toMatch(/for-each-.*field-Item-.*field-Quantity-.*/);
      expect(links[10].sourceNodePath).toMatch('Price');
      expect(links[10].targetNodePath).toMatch(/for-each-.*field-Item-.*field-Price-.*/);
    });
  });
});
