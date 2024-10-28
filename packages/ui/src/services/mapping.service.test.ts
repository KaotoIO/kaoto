import { MappingService } from './mapping.service';
import {
  ChooseItem,
  FieldItem,
  IfItem,
  MappingTree,
  OtherwiseItem,
  ValueSelector,
  ValueType,
  WhenItem,
} from '../models/datamapper/mapping';
import { MappingSerializerService } from './mapping-serializer.service';
import { DocumentType } from '../models/datamapper/path';
import { XmlSchemaDocument } from './xml-schema-document.service';
import { IDocument } from '../models/datamapper/document';
import { shipOrderToShipOrderXslt, TestUtil } from '../stubs/data-mapper';
import { XPathService } from './xpath/xpath.service';

describe('MappingService', () => {
  let sourceDoc: XmlSchemaDocument;
  let targetDoc: XmlSchemaDocument;
  let paramsMap: Map<string, IDocument>;
  let tree: MappingTree;

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    targetDoc = TestUtil.createTargetOrderDoc();
    paramsMap = TestUtil.createParameterMap();
    tree = new MappingTree(targetDoc.documentType, targetDoc.documentId);
    MappingSerializerService.deserialize(shipOrderToShipOrderXslt, targetDoc, tree, paramsMap);
  });

  describe('filterMappingsForField()', () => {
    it('should filter mappings', () => {
      let filtered = MappingService.filterMappingsForField(tree.children, targetDoc.fields[0]);
      expect(filtered.length).toEqual(1);
      expect((filtered[0] as FieldItem).field).toEqual(targetDoc.fields[0]);
      filtered = MappingService.filterMappingsForField(tree.children, targetDoc.fields[0].fields[0]);
      expect(filtered.length).toEqual(0);
    });
  });

  describe('removeAllMappingsForDocument()', () => {
    it('should remove mappings for target document', () => {
      expect(tree.children.length).toEqual(1);
      MappingService.removeAllMappingsForDocument(tree, DocumentType.TARGET_BODY, targetDoc.documentId);
      expect(tree.children.length).toEqual(0);
    });

    it('should remove mappings for source document', () => {
      expect(tree.children.length).toEqual(1);
      MappingService.removeAllMappingsForDocument(tree, DocumentType.SOURCE_BODY, sourceDoc.documentId);
      expect(tree.children.length).toEqual(0);
    });

    it('should not remove mappings unrelated to the removed param', () => {
      expect(tree.children.length).toEqual(1);
      MappingService.removeAllMappingsForDocument(tree, DocumentType.PARAM, 'sourceParam1');
      expect(tree.children.length).toEqual(1);
    });
  });

  describe('removeStaleMappingsForDocument()', () => {
    it('should remove mappings for removed source field', () => {
      expect(tree.children[0].children.length).toEqual(4);
      const orderPersonField = sourceDoc.fields[0].fields[1];
      expect(orderPersonField.name).toEqual('OrderPerson');
      sourceDoc.fields[0].fields.splice(1, 1);
      MappingService.removeStaleMappingsForDocument(tree, sourceDoc);
      expect(tree.children[0].children.length).toEqual(3);
    });

    it('should remove mappings for removed target field', () => {
      expect(tree.children[0].children.length).toEqual(4);
      const orderIdField = targetDoc.fields[0].fields[0];
      expect(orderIdField.name).toEqual('OrderId');
      targetDoc.fields[0].fields.splice(0, 1);
      MappingService.removeStaleMappingsForDocument(tree, targetDoc);
      expect(tree.children[0].children.length).toEqual(3);
    });

    it('should not remove mappings when unrelated field is removed', () => {
      expect(tree.children[0].children.length).toEqual(4);
      const shipToCountryField = targetDoc.fields[0].fields[2].fields[3];
      expect(shipToCountryField.name).toEqual('Country');
      targetDoc.fields[0].fields[2].fields.splice(3, 1);
      MappingService.removeStaleMappingsForDocument(tree, targetDoc);
      expect(tree.children[0].children.length).toEqual(4);
    });
  });

  describe('addChooseWhenOtherwise()', () => {
    it('should add conditions', () => {
      const orderIdFieldItem = tree.children[0].children[0];
      expect(orderIdFieldItem.children.length).toEqual(1);
      MappingService.addChooseWhenOtherwise(orderIdFieldItem, orderIdFieldItem.children[0]);
      expect(orderIdFieldItem.children.length).toEqual(1);
      const chooseItem = orderIdFieldItem.children[0];
      expect(chooseItem instanceof ChooseItem).toBeTruthy();
      expect(chooseItem.children[0] instanceof WhenItem).toBeTruthy();
      expect(chooseItem.children[1] instanceof OtherwiseItem).toBeTruthy();
    });
  });

  describe('wrapWithFunction()', () => {
    it('should wrap with xpath function', () => {
      const concatFx = XPathService.functions.String.find((f) => f.name === 'concat');
      const valueSelector = new ValueSelector(tree);
      valueSelector.expression = '/path/to/field';
      MappingService.wrapWithFunction(valueSelector, concatFx!);
      expect(valueSelector.expression).toEqual('concat(/path/to/field)');
    });
  });

  describe('mapToCondition()', () => {
    it('should add to xpath', () => {
      expect(tree.children[0].children[1] instanceof IfItem).toBeTruthy();
      const ifItem = tree.children[0].children[1] as IfItem;
      expect(ifItem.expression).toEqual("/ns0:ShipOrder/ns0:OrderPerson != ''");
      MappingService.mapToCondition(ifItem, sourceDoc.fields[0].fields[1]);
      expect(ifItem.expression).toEqual("/ns0:ShipOrder/ns0:OrderPerson != '', /ns0:ShipOrder/ns0:OrderPerson");
    });
  });

  describe('mapToDocument()', () => {
    it('should add ValueSelector', () => {
      expect(tree.children.length).toEqual(1);
      MappingService.mapToDocument(tree, sourceDoc.fields[0]);
      expect(tree.children.length).toEqual(2);
      expect(tree.children[1] instanceof ValueSelector).toBeTruthy();
      const selector = tree.children[1] as ValueSelector;
      expect(selector.expression).toEqual('/ns0:ShipOrder');
    });
  });

  describe('mapToField()', () => {
    it('should add to xpath', () => {
      const orderIdFieldItem = tree.children[0].children[0];
      orderIdFieldItem.children = [];
      MappingService.mapToField(sourceDoc.fields[0].fields[0], orderIdFieldItem);
      expect(orderIdFieldItem.children[0] instanceof ValueSelector);
      const orderIdValueSelector = orderIdFieldItem.children[0] as ValueSelector;
      expect(orderIdValueSelector.expression).toEqual('/ns0:ShipOrder/@OrderId');
    });

    it('should populate namespace if not exists', () => {
      tree.namespaceMap = {};
      const orderIdFieldItem = tree.children[0].children[0];
      orderIdFieldItem.children = [];
      MappingService.mapToField(sourceDoc.fields[0].fields[0], orderIdFieldItem);
      expect(orderIdFieldItem.children[0] instanceof ValueSelector);
      const orderIdValueSelector = orderIdFieldItem.children[0] as ValueSelector;
      expect(orderIdValueSelector.expression).toEqual('/ns0:ShipOrder/@OrderId');
    });
  });

  describe('createValueSelector()', () => {
    it('should create ValueSelector', () => {
      const orderIdFieldItem = tree.children[0].children[0] as FieldItem;
      expect(orderIdFieldItem.children[0] instanceof ValueSelector).toBeTruthy();
      orderIdFieldItem.children = [];
      const valueSelector = MappingService.createValueSelector(orderIdFieldItem);
      expect(valueSelector.valueType).toEqual(ValueType.ATTRIBUTE);
    });
  });

  describe('deleteMappingItem()', () => {
    it('should delete', () => {
      expect(tree.children[0].children.length).toEqual(4);
      const orderIdValueSelector = tree.children[0].children[0].children[0] as ValueSelector;
      MappingService.deleteMappingItem(orderIdValueSelector);
      expect(tree.children[0].children.length).toEqual(3);
    });
  });

  describe('extractMappingLinks()', () => {
    it('should return IMappingLink[]', () => {
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
