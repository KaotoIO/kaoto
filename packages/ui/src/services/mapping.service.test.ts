import { MappingService } from './mapping.service';
import {
  ChooseItem,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingTree,
  OtherwiseItem,
  ValueSelector,
  ValueType,
  WhenItem,
} from '../models/datamapper/mapping';
import { MappingSerializerService } from './mapping-serializer.service';
import { XmlSchemaDocument } from './xml-schema-document.service';
import { DocumentDefinitionType, DocumentType, IDocument } from '../models/datamapper/document';
import {
  cartToShipOrderJsonXslt,
  cartToShipOrderXslt,
  conditionalMappingsToShipOrderJsonXslt,
  conditionalMappingsToShipOrderXslt,
  multipleForEachJsonXslt,
  shipOrderToShipOrderMultipleForEachXslt,
  shipOrderToShipOrderXslt,
  TestUtil,
} from '../stubs/datamapper/data-mapper';
import { XPathService } from './xpath/xpath.service';
import { MappingLinksService } from './mapping-links.service';
import { DocumentService } from './document.service';
import { mockRandomValues } from '../stubs';

describe('MappingService', () => {
  let sourceDoc: XmlSchemaDocument;
  let targetDoc: XmlSchemaDocument;
  let paramsMap: Map<string, IDocument>;
  let tree: MappingTree;

  beforeAll(() => {
    mockRandomValues();
  });

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    targetDoc = TestUtil.createTargetOrderDoc();
    paramsMap = TestUtil.createParameterMap();
    tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
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

    it('should remove mappings related to the removed param in case of XML schema', () => {
      targetDoc = TestUtil.createTargetOrderDoc();
      paramsMap = TestUtil.createParameterMap();
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(conditionalMappingsToShipOrderXslt, targetDoc, tree, paramsMap);

      expect(tree.children.length).toEqual(1);
      MappingService.removeAllMappingsForDocument(tree, DocumentType.PARAM, 'cart');
      expect(tree.children.length).toEqual(0);
    });

    it('should remove mappings related to the removed param in case of JSON schema', () => {
      const targetJSONDoc = TestUtil.createJSONTargetOrderDoc();
      paramsMap = TestUtil.createJSONParameterMap();
      tree = new MappingTree(targetJSONDoc.documentType, targetJSONDoc.documentId, DocumentDefinitionType.JSON_SCHEMA);
      MappingSerializerService.deserialize(conditionalMappingsToShipOrderJsonXslt, targetJSONDoc, tree, paramsMap);

      expect(tree.children[0].children[0].children.length).toEqual(1);
      const forEach = tree.children[0].children[0].children[0] as ForEachItem;
      expect(forEach.expression).toEqual('$cart-x/xf:array/xf:map');

      MappingService.removeAllMappingsForDocument(tree, DocumentType.PARAM, 'cart-x');
      expect(tree.children.length).toEqual(0);
    });

    it('should remove mappings related to the removed param in case of JSON schema, but not the other', () => {
      const targetJSONDoc = TestUtil.createJSONTargetOrderDoc();
      paramsMap = TestUtil.createJSONParameterMap();
      tree = new MappingTree(targetJSONDoc.documentType, targetJSONDoc.documentId, DocumentDefinitionType.JSON_SCHEMA);
      MappingSerializerService.deserialize(multipleForEachJsonXslt, targetJSONDoc, tree, paramsMap);

      expect(tree.children[0].children[0].children.length).toEqual(2);
      let forEach1 = tree.children[0].children[0].children[0] as ForEachItem;
      const forEach2 = tree.children[0].children[0].children[1] as ForEachItem;
      expect(forEach1.expression).toEqual('$cart-x/xf:array/xf:map');
      expect(forEach2.expression).toEqual('$cart2-x/xf:array/xf:map');

      MappingService.removeAllMappingsForDocument(tree, DocumentType.PARAM, 'cart-x');
      expect(tree.children[0].children[0].children.length).toEqual(1);
      forEach1 = tree.children[0].children[0].children[0] as ForEachItem;
      expect(forEach1.expression).toEqual('$cart2-x/xf:array/xf:map');
    });

    it('should not remove parameter mappings when detaching schema from source body', () => {
      targetDoc = TestUtil.createTargetOrderDoc();
      paramsMap = TestUtil.createParameterMap();
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(shipOrderToShipOrderMultipleForEachXslt, targetDoc, tree, paramsMap);

      const validateForEach = (forEachItem: ForEachItem) => {
        expect(forEachItem.children.length).toEqual(1);
        const item = forEachItem.children[0] as FieldItem;
        expect(item.children.length).toEqual(4);
        const title = item.children[0] as FieldItem;
        expect((title.children[0] as ValueSelector).expression).toEqual('Title');
        const note = item.children[1] as FieldItem;
        expect((note.children[0] as ValueSelector).expression).toEqual('Note');
        const quantity = item.children[2] as FieldItem;
        expect((quantity.children[0] as ValueSelector).expression).toEqual('Quantity');
        const price = item.children[3] as FieldItem;
        expect((price.children[0] as ValueSelector).expression).toEqual('Price');
      };

      expect(tree.children[0].children.length).toEqual(2);
      const bodyForEach = tree.children[0].children[0] as ForEachItem;
      let paramForEach = tree.children[0].children[1] as ForEachItem;
      expect(bodyForEach.expression).toEqual('/ns0:ShipOrder/Item');
      validateForEach(bodyForEach);
      expect(paramForEach.expression).toEqual('$sourceParam1/ns0:ShipOrder/Item');
      validateForEach(paramForEach);

      MappingService.removeAllMappingsForDocument(tree, DocumentType.SOURCE_BODY);
      expect(tree.children[0].children.length).toEqual(1);
      [paramForEach] = tree.children[0].children as ForEachItem[];
      expect(paramForEach.expression).toEqual('$sourceParam1/ns0:ShipOrder/Item');
      validateForEach(paramForEach);
    });

    it('should ignore mappings with XPath parse errors and continue removing valid stale mappings', () => {
      targetDoc = TestUtil.createTargetOrderDoc();
      paramsMap = TestUtil.createParameterMap();
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(shipOrderToShipOrderMultipleForEachXslt, targetDoc, tree, paramsMap);

      const bodyForEach = tree.children[0].children[0] as ForEachItem;
      const paramForEach = tree.children[0].children[1] as ForEachItem;
      bodyForEach.expression = 'invalid[[xpath]]syntax';

      MappingService.removeAllMappingsForDocument(tree, DocumentType.SOURCE_BODY);

      expect(tree.children[0].children.length).toEqual(2);
      expect(tree.children[0].children[0]).toBe(bodyForEach);
      expect(tree.children[0].children[1]).toBe(paramForEach);
    });

    it('should remove stale mapping in the nested item', () => {
      targetDoc = TestUtil.createTargetOrderDoc();
      paramsMap = TestUtil.createParameterMap();
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(shipOrderToShipOrderMultipleForEachXslt, targetDoc, tree, paramsMap);

      const bodyForEach = tree.children[0].children[0] as ForEachItem;
      expect(bodyForEach.children[0].children.length).toEqual(4);
      const bodyForEachTitleSelector = bodyForEach.children[0].children[0].children[0] as ValueSelector;
      expect(bodyForEachTitleSelector.expression).toEqual('Title');
      bodyForEachTitleSelector.expression = '$sourceParam1/ns0:ShipOrder/Item[0]/Title';

      const paramForEach = tree.children[0].children[1] as ForEachItem;
      expect(paramForEach.children[0].children.length).toEqual(4);
      const paramForEachTitleSelector = paramForEach.children[0].children[0].children[0] as ValueSelector;
      expect(paramForEachTitleSelector.expression).toEqual('Title');
      paramForEachTitleSelector.expression = '/ns0:ShipOrder/Item[0]/Title';

      MappingService.removeAllMappingsForDocument(tree, DocumentType.SOURCE_BODY);

      expect(tree.children[0].children.length).toEqual(1);
      expect(tree.children[0].children[0]).toBe(paramForEach);
      expect(paramForEach.children[0].children.length).toEqual(3);
    });
  });

  describe('renameParameterInMappings()', () => {
    const updateDoc = (paramsMap: Map<string, IDocument>, oldParam: string, newParam: string) => {
      const document = paramsMap.get(oldParam);
      // Update the document's properties
      DocumentService.renameDocument(document!, newParam);

      // Create a new map with the updated document
      const newSourceParameterMap = new Map(paramsMap);
      newSourceParameterMap.delete(oldParam);
      newSourceParameterMap.set(newParam, document!);

      return newSourceParameterMap;
    };

    it('should rename simple mappings for XML document', () => {
      MappingSerializerService.deserialize(cartToShipOrderXslt, targetDoc, tree, paramsMap);
      expect(tree.children.length).toEqual(1);
      const linksBefore = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      MappingService.renameParameterInMappings(tree, 'cart', 'newTargetParam');

      // this is needed to simulate the renaming of the document in the params map
      const newSourceParameterMap = updateDoc(paramsMap, 'cart', 'newTargetParam');

      const linksAfter = MappingLinksService.extractMappingLinks(tree, newSourceParameterMap, sourceDoc);
      expect(linksBefore.length).toEqual(linksAfter.length);
      for (const link of linksAfter) {
        expect(link.sourceNodePath.startsWith('param:newTargetParam')).toBeTruthy();
      }
    });

    it('should rename conditional mappings for XML document', () => {
      MappingSerializerService.deserialize(conditionalMappingsToShipOrderXslt, targetDoc, tree, paramsMap);
      expect(tree.children.length).toEqual(1);
      const linksBefore = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      MappingService.renameParameterInMappings(tree, 'cart', 'newTargetParam');

      // this is needed to simulate the renaming of the document in the params map
      const newSourceParameterMap = updateDoc(paramsMap, 'cart', 'newTargetParam');

      const linksAfter = MappingLinksService.extractMappingLinks(tree, newSourceParameterMap, sourceDoc);
      expect(linksBefore.length).toEqual(linksAfter.length);
      for (const link of linksAfter) {
        expect(link.sourceNodePath.startsWith('param:newTargetParam')).toBeTruthy();
      }
    });

    it('should rename simple mappings for JSON document', () => {
      const targetJSONDoc = TestUtil.createJSONTargetOrderDoc();
      const jsonParamsMap = TestUtil.createJSONParameterMap();
      const mappingTree = new MappingTree(
        targetJSONDoc.documentType,
        targetJSONDoc.documentId,
        DocumentDefinitionType.JSON_SCHEMA,
      );
      MappingSerializerService.deserialize(cartToShipOrderJsonXslt, targetJSONDoc, mappingTree, jsonParamsMap);

      expect(mappingTree.children.length).toEqual(1);
      const linksBefore = MappingLinksService.extractMappingLinks(mappingTree, jsonParamsMap, sourceDoc);
      MappingService.renameParameterInMappings(mappingTree, 'cart', 'newTargetParam');

      // this is needed to simulate the renaming of the document in the params map
      const newSourceParameterMap = updateDoc(jsonParamsMap, 'cart', 'newTargetParam');

      const linksAfter = MappingLinksService.extractMappingLinks(mappingTree, newSourceParameterMap, sourceDoc);
      expect(linksBefore.length).toEqual(linksAfter.length);
      for (const link of linksAfter) {
        expect(link.sourceNodePath.startsWith('param:newTargetParam')).toBeTruthy();
      }
    });

    it('should rename conditional mappings for JSON document', () => {
      const targetJSONDoc = TestUtil.createJSONTargetOrderDoc();
      const jsonParamsMap = TestUtil.createJSONParameterMap();
      const mappingTree = new MappingTree(
        targetJSONDoc.documentType,
        targetJSONDoc.documentId,
        DocumentDefinitionType.JSON_SCHEMA,
      );
      MappingSerializerService.deserialize(
        conditionalMappingsToShipOrderJsonXslt,
        targetJSONDoc,
        mappingTree,
        jsonParamsMap,
      );

      expect(mappingTree.children.length).toEqual(1);
      const linksBefore = MappingLinksService.extractMappingLinks(mappingTree, jsonParamsMap, sourceDoc);
      MappingService.renameParameterInMappings(mappingTree, 'cart', 'newTargetParam');

      // this is needed to simulate the renaming of the document in the params map
      const newSourceParameterMap = updateDoc(jsonParamsMap, 'cart', 'newTargetParam');

      const linksAfter = MappingLinksService.extractMappingLinks(mappingTree, newSourceParameterMap, sourceDoc);
      expect(linksBefore.length).toEqual(linksAfter.length);
      for (const link of linksAfter) {
        expect(link.sourceNodePath.startsWith('param:newTargetParam')).toBeTruthy();
      }
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

    it('should not remove for-each mapping contents (source)', () => {
      sourceDoc = TestUtil.createSourceOrderDoc();
      MappingService.removeStaleMappingsForDocument(tree, sourceDoc);
      const shipOrderItem = tree.children[0];
      const forEachItem = shipOrderItem.children[3];
      expect(forEachItem.parent).toEqual(shipOrderItem);
      expect(forEachItem.children.length).toEqual(1);

      const itemItem = forEachItem.children[0];
      expect(itemItem.parent).toEqual(forEachItem);
      expect(itemItem.children.length).toEqual(4);
      const titleItem = itemItem.children[0];
      expect(titleItem.parent).toEqual(itemItem);
      expect(titleItem.children.length).toEqual(1);
      expect((titleItem.children[0] as ValueSelector).expression).toEqual('Title');

      const chooseItem = itemItem.children[1];
      expect(chooseItem.parent).toEqual(itemItem);
      expect(chooseItem.children.length).toEqual(2);
      const whenItem = chooseItem.children[0] as WhenItem;
      expect(whenItem.parent).toEqual(chooseItem);
      expect(whenItem.expression).toEqual("Note != ''");
      expect((whenItem.children[0].children[0] as ValueSelector).expression).toEqual('Note');
      const otherwiseItem = chooseItem.children[1] as OtherwiseItem;
      expect(otherwiseItem.parent).toEqual(chooseItem);
      expect((otherwiseItem.children[0].children[0] as ValueSelector).expression).toEqual('Title');

      const quantityItem = itemItem.children[2];
      expect(quantityItem.parent).toEqual(itemItem);
      expect(quantityItem.children.length).toEqual(1);
      expect((quantityItem.children[0] as ValueSelector).expression).toEqual('Quantity');

      const priceItem = itemItem.children[3];
      expect(priceItem.parent).toEqual(itemItem);
      expect(priceItem.children.length).toEqual(1);
      expect((priceItem.children[0] as ValueSelector).expression).toEqual('Price');

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(11);
      links.forEach((link) => expect(link.sourceNodePath.includes(sourceDoc.fields[0].id)).toBeTruthy());
    });

    it('should not remove for-each mapping contents (target)', () => {
      targetDoc = TestUtil.createTargetOrderDoc();
      MappingService.removeStaleMappingsForDocument(tree, targetDoc);
      const shipOrderItem = tree.children[0];
      const forEachItem = shipOrderItem.children[3];
      expect(forEachItem.parent).toEqual(shipOrderItem);
      expect(forEachItem.children.length).toEqual(1);

      const itemItem = forEachItem.children[0];
      expect(itemItem.parent).toEqual(forEachItem);
      expect(itemItem.children.length).toEqual(4);
      const titleItem = itemItem.children[0];
      expect(titleItem.parent).toEqual(itemItem);
      expect(titleItem.children.length).toEqual(1);
      expect((titleItem.children[0] as ValueSelector).expression).toEqual('Title');

      const chooseItem = itemItem.children[1];
      expect(chooseItem.parent).toEqual(itemItem);
      expect(chooseItem.children.length).toEqual(2);
      const whenItem = chooseItem.children[0] as WhenItem;
      expect(whenItem.parent).toEqual(chooseItem);
      expect(whenItem.expression).toEqual("Note != ''");
      expect((whenItem.children[0].children[0] as ValueSelector).expression).toEqual('Note');
      const otherwiseItem = chooseItem.children[1] as OtherwiseItem;
      expect(otherwiseItem.parent).toEqual(chooseItem);
      expect((otherwiseItem.children[0].children[0] as ValueSelector).expression).toEqual('Title');

      const quantityItem = itemItem.children[2];
      expect(quantityItem.parent).toEqual(itemItem);
      expect(quantityItem.children.length).toEqual(1);
      expect((quantityItem.children[0] as ValueSelector).expression).toEqual('Quantity');

      const priceItem = itemItem.children[3];
      expect(priceItem.parent).toEqual(itemItem);
      expect(priceItem.children.length).toEqual(1);
      expect((priceItem.children[0] as ValueSelector).expression).toEqual('Price');

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(11);
      links.forEach((link) => expect(link.targetNodePath.includes(targetDoc.fields[0].id)).toBeTruthy());
    });

    it("should not remove for-each targeted field when it doesn't have children (source)", () => {
      const shipOrderItem = tree.children[0];
      const forEachItem = shipOrderItem.children[3];
      shipOrderItem.children = [forEachItem];
      const itemItem = forEachItem.children[0];
      itemItem.children = [];
      MappingService.removeStaleMappingsForDocument(tree, sourceDoc);
      expect(forEachItem.parent).toEqual(shipOrderItem);
      expect(forEachItem.children.length).toEqual(1);

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(1);
      expect(links[0].sourceNodePath.includes(sourceDoc.fields[0].id)).toBeTruthy();
    });

    it("should not remove for-each targeted field when it doesn't have children (target)", () => {
      const shipOrderItem = tree.children[0];
      const forEachItem = shipOrderItem.children[3];
      shipOrderItem.children = [forEachItem];
      const itemItem = forEachItem.children[0];
      itemItem.children = [];
      MappingService.removeStaleMappingsForDocument(tree, targetDoc);
      expect(forEachItem.parent).toEqual(shipOrderItem);
      expect(forEachItem.children.length).toEqual(1);

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(1);
      expect(links[0].targetNodePath.includes(targetDoc.fields[0].id)).toBeTruthy();
    });

    it('should ignore mappings with XPath parse errors and remove valid stale source field mappings', () => {
      expect(tree.children[0].children.length).toEqual(4);

      const orderIdFieldItem = tree.children[0].children[0] as FieldItem;
      const valueSelector = orderIdFieldItem.children[0] as ValueSelector;
      valueSelector.expression = 'invalid[[xpath]]syntax';

      // Remove the OrderPerson field from the source document (second field)
      const orderIdField = sourceDoc.fields[0].fields[0];
      expect(orderIdField.name).toEqual('OrderId');
      const orderPersonField = sourceDoc.fields[0].fields[1];
      expect(orderPersonField.name).toEqual('OrderPerson');
      sourceDoc.fields[0].fields.splice(0, 2);

      MappingService.removeStaleMappingsForDocument(tree, sourceDoc);

      expect(tree.children[0].children.length).toEqual(3);
      expect((tree.children[0].children[0].children[0] as ValueSelector).expression).toBe('invalid[[xpath]]syntax');
      expect(tree.children[0].children[1].name).toContain('ShipTo');
    });

    it('should ignore mappings with XPath parse errors and remove valid stale target field mappings', () => {
      expect(tree.children[0].children.length).toEqual(4);

      const ifConditionItem = tree.children[0].children[1] as IfItem;
      ifConditionItem.expression = 'invalid[[xpath]]syntax';

      const orderIdField = targetDoc.fields[0].fields[0];
      expect(orderIdField.name).toEqual('OrderId');
      targetDoc.fields[0].fields.splice(0, 1);

      MappingService.removeStaleMappingsForDocument(tree, targetDoc);

      expect(tree.children[0].children.length).toEqual(3);
      expect(tree.children[0].children[0]).toBe(ifConditionItem);
      expect(ifConditionItem.expression).toEqual('invalid[[xpath]]syntax');
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
});
