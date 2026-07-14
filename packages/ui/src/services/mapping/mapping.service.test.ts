import { DocumentDefinitionType, DocumentType, IDocument, IField } from '../../models/datamapper/document';
import {
  ChooseItem,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingTree,
  OtherwiseItem,
  ValueSelector,
  ValueType,
  VariableItem,
  WhenItem,
} from '../../models/datamapper/mapping';
import { mockRandomValues } from '../../stubs';
import {
  getCartToShipOrderJsonXslt,
  getCartToShipOrderXslt,
  getConditionalMappingsToShipOrderJsonXslt,
  getConditionalMappingsToShipOrderXslt,
  getMultipleForEachJsonXslt,
  getNestedConditionalsToShipOrderXslt,
  getShipOrderToShipOrderMultipleForEachXslt,
  getShipOrderToShipOrderXslt,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { DocumentService } from '../document/document.service';
import { DocumentUtilService } from '../document/document-util.service';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { MappingLinksService } from '../visualization/mapping-links.service';
import { XPathService } from '../xpath/xpath.service';
import { FieldMatchingService } from './field-matching.service';
import { MappingService } from './mapping.service';
import { MappingSerializerService } from './mapping-serializer.service';

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
    MappingSerializerService.deserialize(getShipOrderToShipOrderXslt(), targetDoc, tree, paramsMap);
  });

  describe('filterMappingsForField()', () => {
    it('should filter mappings', () => {
      let filtered = MappingService.filterMappingsForField(tree.children, targetDoc.fields[0]);
      expect(filtered).toHaveLength(1);
      expect((filtered[0] as FieldItem).field).toEqual(targetDoc.fields[0]);
      filtered = MappingService.filterMappingsForField(tree.children, targetDoc.fields[0].fields[0]);
      expect(filtered).toHaveLength(0);
    });

    it('should filter fields inside nested if', () => {
      targetDoc = TestUtil.createTargetOrderDoc();
      paramsMap = TestUtil.createParameterMap();
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(getNestedConditionalsToShipOrderXslt(), targetDoc, tree, paramsMap);

      const shipOrderField = targetDoc.fields[0];
      const orderPersonField = targetDoc.fields[0].fields[1];

      const shipOrderFiltered = MappingService.filterMappingsForField(tree.children, shipOrderField);
      expect(shipOrderFiltered).toHaveLength(1);

      const shipOrderFieldItem = shipOrderFiltered[0] as FieldItem;
      const orderPersonFiltered = MappingService.filterMappingsForField(shipOrderFieldItem.children, orderPersonField);
      expect(orderPersonFiltered).toHaveLength(1);
      expect(orderPersonFiltered[0]).toBeInstanceOf(IfItem);

      const outerIfItem = orderPersonFiltered[0] as IfItem;
      expect(outerIfItem.children).toHaveLength(1);
      expect(outerIfItem.children[0]).toBeInstanceOf(IfItem);

      const innerIfItem = outerIfItem.children[0] as IfItem;
      expect(innerIfItem.children).toHaveLength(1);
      expect(innerIfItem.children[0]).toBeInstanceOf(FieldItem);
      expect((innerIfItem.children[0] as FieldItem).field).toEqual(orderPersonField);
    });

    it('should filter fields inside choose within if', () => {
      targetDoc = TestUtil.createTargetOrderDoc();
      paramsMap = TestUtil.createParameterMap();
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(getNestedConditionalsToShipOrderXslt(), targetDoc, tree, paramsMap);

      const shipToField = targetDoc.fields[0].fields[2];
      const shipToNameField = targetDoc.fields[0].fields[2].fields[0];

      const shipOrderField = tree.children[0] as FieldItem;
      const shipToFiltered = MappingService.filterMappingsForField(shipOrderField.children, shipToField);
      expect(shipToFiltered).toHaveLength(1);
      expect(shipToFiltered[0]).toBeInstanceOf(IfItem);

      const ifItem = shipToFiltered[0] as IfItem;
      expect(ifItem.children).toHaveLength(1);
      expect(ifItem.children[0]).toBeInstanceOf(ChooseItem);

      const chooseItem = ifItem.children[0] as ChooseItem;
      const whenItem = chooseItem.when[0];
      expect(whenItem.children).toHaveLength(1);
      expect(whenItem.children[0]).toBeInstanceOf(FieldItem);

      const shipToFieldItem = whenItem.children[0] as FieldItem;
      expect(shipToFieldItem.field).toEqual(shipToField);
      const nameFiltered = MappingService.filterMappingsForField(shipToFieldItem.children, shipToNameField);
      expect(nameFiltered).toHaveLength(1);
      expect(nameFiltered[0]).toBeInstanceOf(FieldItem);
      expect((nameFiltered[0] as FieldItem).field.name).toBe('Name');
    });

    it('should filter fields inside if within for-each', () => {
      targetDoc = TestUtil.createTargetOrderDoc();
      paramsMap = TestUtil.createParameterMap();
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(getNestedConditionalsToShipOrderXslt(), targetDoc, tree, paramsMap);

      const itemField = targetDoc.fields[0].fields[3];
      const noteField = targetDoc.fields[0].fields[3].fields[1];

      const shipOrderField = tree.children[0] as FieldItem;
      const itemFiltered = MappingService.filterMappingsForField(shipOrderField.children, itemField);
      expect(itemFiltered).toHaveLength(1);
      expect(itemFiltered[0]).toBeInstanceOf(IfItem);

      const outerIfItem = itemFiltered[0] as IfItem;
      expect(outerIfItem.children).toHaveLength(1);
      expect(outerIfItem.children[0]).toBeInstanceOf(ForEachItem);

      const forEachItem = outerIfItem.children[0] as ForEachItem;
      expect(forEachItem.children).toHaveLength(1);
      expect(forEachItem.children[0]).toBeInstanceOf(FieldItem);

      const itemFieldItem = forEachItem.children[0] as FieldItem;
      const noteFiltered = MappingService.filterMappingsForField(itemFieldItem.children, noteField);
      expect(noteFiltered).toHaveLength(1);
      expect(noteFiltered[0]).toBeInstanceOf(IfItem);

      const innerIfItem = noteFiltered[0] as IfItem;
      expect(innerIfItem.children).toHaveLength(1);
      expect(innerIfItem.children[0]).toBeInstanceOf(FieldItem);
      expect((innerIfItem.children[0] as FieldItem).field).toEqual(noteField);
    });
  });

  describe('removeAllMappingsForDocument()', () => {
    it('should remove mappings for target document', () => {
      expect(tree.children).toHaveLength(1);
      MappingService.removeAllMappingsForDocument(tree, DocumentType.TARGET_BODY, targetDoc.documentId);
      expect(tree.children).toHaveLength(0);
    });

    it('should remove mappings for source document', () => {
      expect(tree.children).toHaveLength(1);
      MappingService.removeAllMappingsForDocument(tree, DocumentType.SOURCE_BODY, sourceDoc.documentId);
      expect(tree.children).toHaveLength(0);
    });

    it('should not remove mappings unrelated to the removed param', () => {
      expect(tree.children).toHaveLength(1);
      MappingService.removeAllMappingsForDocument(tree, DocumentType.PARAM, 'sourceParam1');
      expect(tree.children).toHaveLength(1);
    });

    it('should remove mappings related to the removed param in case of XML schema', () => {
      targetDoc = TestUtil.createTargetOrderDoc();
      paramsMap = TestUtil.createParameterMap();
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(getConditionalMappingsToShipOrderXslt(), targetDoc, tree, paramsMap);

      expect(tree.children).toHaveLength(1);
      MappingService.removeAllMappingsForDocument(tree, DocumentType.PARAM, 'cart');
      expect(tree.children).toHaveLength(0);
    });

    it('should remove mappings related to the removed param in case of JSON schema', () => {
      const targetJSONDoc = TestUtil.createJSONTargetOrderDoc();
      paramsMap = TestUtil.createJSONParameterMap();
      tree = new MappingTree(targetJSONDoc.documentType, targetJSONDoc.documentId, DocumentDefinitionType.JSON_SCHEMA);
      MappingSerializerService.deserialize(getConditionalMappingsToShipOrderJsonXslt(), targetJSONDoc, tree, paramsMap);

      expect(tree.children[0].children[0].children).toHaveLength(1);
      const forEach = tree.children[0].children[0].children[0] as ForEachItem;
      expect(forEach.expression).toBe('$cart-x/fn:array/fn:map');

      MappingService.removeAllMappingsForDocument(tree, DocumentType.PARAM, 'cart-x');
      expect(tree.children).toHaveLength(0);
    });

    it('should remove mappings related to the removed param in case of JSON schema, but not the other', () => {
      const targetJSONDoc = TestUtil.createJSONTargetOrderDoc();
      paramsMap = TestUtil.createJSONParameterMap();
      tree = new MappingTree(targetJSONDoc.documentType, targetJSONDoc.documentId, DocumentDefinitionType.JSON_SCHEMA);
      MappingSerializerService.deserialize(getMultipleForEachJsonXslt(), targetJSONDoc, tree, paramsMap);

      expect(tree.children[0].children[0].children).toHaveLength(2);
      let forEach1 = tree.children[0].children[0].children[0] as ForEachItem;
      const forEach2 = tree.children[0].children[0].children[1] as ForEachItem;
      expect(forEach1.expression).toBe('$cart-x/fn:array/fn:map');
      expect(forEach2.expression).toBe('$cart2-x/fn:array/fn:map');

      MappingService.removeAllMappingsForDocument(tree, DocumentType.PARAM, 'cart-x');
      expect(tree.children[0].children[0].children).toHaveLength(1);
      forEach1 = tree.children[0].children[0].children[0] as ForEachItem;
      expect(forEach1.expression).toBe('$cart2-x/fn:array/fn:map');
    });

    it('should not remove parameter mappings when detaching schema from source body', () => {
      targetDoc = TestUtil.createTargetOrderDoc();
      paramsMap = TestUtil.createParameterMap();
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(getShipOrderToShipOrderMultipleForEachXslt(), targetDoc, tree, paramsMap);

      const validateForEach = (forEachItem: ForEachItem) => {
        expect(forEachItem.children).toHaveLength(1);
        const item = forEachItem.children[0] as FieldItem;
        expect(item.children).toHaveLength(4);
        const title = item.children[0] as FieldItem;
        expect((title.children[0] as ValueSelector).expression).toBe('Title');
        const note = item.children[1] as FieldItem;
        expect((note.children[0] as ValueSelector).expression).toBe('Note');
        const quantity = item.children[2] as FieldItem;
        expect((quantity.children[0] as ValueSelector).expression).toBe('Quantity');
        const price = item.children[3] as FieldItem;
        expect((price.children[0] as ValueSelector).expression).toBe('Price');
      };

      expect(tree.children[0].children).toHaveLength(2);
      const bodyForEach = tree.children[0].children[0] as ForEachItem;
      let paramForEach = tree.children[0].children[1] as ForEachItem;
      expect(bodyForEach.expression).toBe('/ns0:ShipOrder/Item');
      validateForEach(bodyForEach);
      expect(paramForEach.expression).toBe('$sourceParam1/ns0:ShipOrder/Item');
      validateForEach(paramForEach);

      MappingService.removeAllMappingsForDocument(tree, DocumentType.SOURCE_BODY);
      expect(tree.children[0].children).toHaveLength(1);
      [paramForEach] = tree.children[0].children as ForEachItem[];
      expect(paramForEach.expression).toBe('$sourceParam1/ns0:ShipOrder/Item');
      validateForEach(paramForEach);
    });

    it('should ignore mappings with XPath parse errors and continue removing valid stale mappings', () => {
      targetDoc = TestUtil.createTargetOrderDoc();
      paramsMap = TestUtil.createParameterMap();
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(getShipOrderToShipOrderMultipleForEachXslt(), targetDoc, tree, paramsMap);

      const bodyForEach = tree.children[0].children[0] as ForEachItem;
      const paramForEach = tree.children[0].children[1] as ForEachItem;
      bodyForEach.expression = 'invalid[[xpath]]syntax';

      MappingService.removeAllMappingsForDocument(tree, DocumentType.SOURCE_BODY);

      expect(tree.children[0].children).toHaveLength(2);
      expect(tree.children[0].children[0]).toBe(bodyForEach);
      expect(tree.children[0].children[1]).toBe(paramForEach);
    });

    it('should remove stale mapping in the nested item', () => {
      targetDoc = TestUtil.createTargetOrderDoc();
      paramsMap = TestUtil.createParameterMap();
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(getShipOrderToShipOrderMultipleForEachXslt(), targetDoc, tree, paramsMap);

      const bodyForEach = tree.children[0].children[0] as ForEachItem;
      expect(bodyForEach.children[0].children).toHaveLength(4);
      const bodyForEachTitleSelector = bodyForEach.children[0].children[0].children[0] as ValueSelector;
      expect(bodyForEachTitleSelector.expression).toBe('Title');
      bodyForEachTitleSelector.expression = '$sourceParam1/ns0:ShipOrder/Item[0]/Title';

      const paramForEach = tree.children[0].children[1] as ForEachItem;
      expect(paramForEach.children[0].children).toHaveLength(4);
      const paramForEachTitleSelector = paramForEach.children[0].children[0].children[0] as ValueSelector;
      expect(paramForEachTitleSelector.expression).toBe('Title');
      paramForEachTitleSelector.expression = '/ns0:ShipOrder/Item[0]/Title';

      MappingService.removeAllMappingsForDocument(tree, DocumentType.SOURCE_BODY);

      expect(tree.children[0].children).toHaveLength(1);
      expect(tree.children[0].children[0]).toBe(paramForEach);
      expect(paramForEach.children[0].children).toHaveLength(3);
    });

    it('should handle XPath extractFieldPaths throwing in hasStaleSourceDocument', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const extractSpy = vi.spyOn(XPathService, 'extractFieldPaths').mockImplementation(() => {
        throw new Error('Unexpected XPath error');
      });

      MappingService.removeAllMappingsForDocument(tree, DocumentType.SOURCE_BODY);

      expect(consoleSpy).toHaveBeenCalledWith('XPath field path extraction failed:', expect.any(Error));

      consoleSpy.mockRestore();
      extractSpy.mockRestore();
    });

    it("should not remove for-each targeted field when it doesn't have children", () => {
      const shipOrderItem = tree.children[0];
      const forEachItem = shipOrderItem.children[3];
      expect(forEachItem).toBeInstanceOf(ForEachItem);
      shipOrderItem.children = [forEachItem];
      const itemItem = forEachItem.children[0];
      itemItem.children = [];
      MappingService.removeAllMappingsForDocument(tree, DocumentType.PARAM, 'newParam');
      expect(forEachItem.children).toHaveLength(1);
      expect(forEachItem.children[0]).toBe(itemItem);
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
      MappingSerializerService.deserialize(getCartToShipOrderXslt(), targetDoc, tree, paramsMap);
      expect(tree.children).toHaveLength(1);
      const linksBefore = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      MappingService.renameParameterInMappings(tree, 'cart', 'newTargetParam');

      // this is needed to simulate the renaming of the document in the params map
      const newSourceParameterMap = updateDoc(paramsMap, 'cart', 'newTargetParam');

      const linksAfter = MappingLinksService.extractMappingLinks(tree, newSourceParameterMap, sourceDoc);
      expect(linksBefore).toHaveLength(linksAfter.length);
      for (const link of linksAfter) {
        expect(link.sourceNodePath.startsWith('param:newTargetParam')).toBeTruthy();
      }
    });

    it('should rename conditional mappings for XML document', () => {
      MappingSerializerService.deserialize(getConditionalMappingsToShipOrderXslt(), targetDoc, tree, paramsMap);
      expect(tree.children).toHaveLength(1);
      const linksBefore = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      MappingService.renameParameterInMappings(tree, 'cart', 'newTargetParam');

      // this is needed to simulate the renaming of the document in the params map
      const newSourceParameterMap = updateDoc(paramsMap, 'cart', 'newTargetParam');

      const linksAfter = MappingLinksService.extractMappingLinks(tree, newSourceParameterMap, sourceDoc);
      expect(linksBefore).toHaveLength(linksAfter.length);
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
      MappingSerializerService.deserialize(getCartToShipOrderJsonXslt(), targetJSONDoc, mappingTree, jsonParamsMap);

      expect(mappingTree.children).toHaveLength(1);
      const linksBefore = MappingLinksService.extractMappingLinks(mappingTree, jsonParamsMap, sourceDoc);
      MappingService.renameParameterInMappings(mappingTree, 'cart', 'newTargetParam');

      // this is needed to simulate the renaming of the document in the params map
      const newSourceParameterMap = updateDoc(jsonParamsMap, 'cart', 'newTargetParam');

      const linksAfter = MappingLinksService.extractMappingLinks(mappingTree, newSourceParameterMap, sourceDoc);
      expect(linksBefore).toHaveLength(linksAfter.length);
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
        getConditionalMappingsToShipOrderJsonXslt(),
        targetJSONDoc,
        mappingTree,
        jsonParamsMap,
      );

      expect(mappingTree.children).toHaveLength(1);
      const linksBefore = MappingLinksService.extractMappingLinks(mappingTree, jsonParamsMap, sourceDoc);
      MappingService.renameParameterInMappings(mappingTree, 'cart', 'newTargetParam');

      // this is needed to simulate the renaming of the document in the params map
      const newSourceParameterMap = updateDoc(jsonParamsMap, 'cart', 'newTargetParam');

      const linksAfter = MappingLinksService.extractMappingLinks(mappingTree, newSourceParameterMap, sourceDoc);
      expect(linksBefore).toHaveLength(linksAfter.length);
      for (const link of linksAfter) {
        expect(link.sourceNodePath.startsWith('param:newTargetParam')).toBeTruthy();
      }
    });
  });

  describe('removeStaleMappingsForDocument()', () => {
    it('should remove mappings for removed source field', () => {
      expect(tree.children[0].children).toHaveLength(4);
      const orderPersonField = sourceDoc.fields[0].fields[1];
      expect(orderPersonField.name).toBe('OrderPerson');
      sourceDoc.fields[0].fields.splice(1, 1);
      MappingService.removeStaleMappingsForDocument(tree, sourceDoc);
      expect(tree.children[0].children).toHaveLength(3);
    });

    it('should remove mappings for removed target field', () => {
      expect(tree.children[0].children).toHaveLength(4);
      const orderIdField = targetDoc.fields[0].fields[0];
      expect(orderIdField.name).toBe('OrderId');
      targetDoc.fields[0].fields.splice(0, 1);
      MappingService.removeStaleMappingsForDocument(tree, targetDoc);
      expect(tree.children[0].children).toHaveLength(3);
    });

    it('should not remove mappings when unrelated field is removed', () => {
      expect(tree.children[0].children).toHaveLength(4);
      const shipToCountryField = targetDoc.fields[0].fields[2].fields[3];
      expect(shipToCountryField.name).toBe('Country');
      targetDoc.fields[0].fields[2].fields.splice(3, 1);
      MappingService.removeStaleMappingsForDocument(tree, targetDoc);
      expect(tree.children[0].children).toHaveLength(4);
    });

    it('should not remove for-each mapping contents (source)', () => {
      sourceDoc = TestUtil.createSourceOrderDoc();
      MappingService.removeStaleMappingsForDocument(tree, sourceDoc);
      const shipOrderItem = tree.children[0];
      const forEachItem = shipOrderItem.children[3];
      expect(forEachItem.parent).toEqual(shipOrderItem);
      expect(forEachItem.children).toHaveLength(1);

      const itemItem = forEachItem.children[0];
      expect(itemItem.parent).toEqual(forEachItem);
      expect(itemItem.children).toHaveLength(4);
      const titleItem = itemItem.children[0];
      expect(titleItem.parent).toEqual(itemItem);
      expect(titleItem.children).toHaveLength(1);
      expect((titleItem.children[0] as ValueSelector).expression).toBe('Title');

      const chooseItem = itemItem.children[1];
      expect(chooseItem.parent).toEqual(itemItem);
      expect(chooseItem.children).toHaveLength(2);
      const whenItem = chooseItem.children[0] as WhenItem;
      expect(whenItem.parent).toEqual(chooseItem);
      expect(whenItem.expression).toBe("Note != ''");
      expect((whenItem.children[0].children[0] as ValueSelector).expression).toBe('Note');
      const otherwiseItem = chooseItem.children[1] as OtherwiseItem;
      expect(otherwiseItem.parent).toEqual(chooseItem);
      expect((otherwiseItem.children[0].children[0] as ValueSelector).expression).toBe('Title');

      const quantityItem = itemItem.children[2];
      expect(quantityItem.parent).toEqual(itemItem);
      expect(quantityItem.children).toHaveLength(1);
      expect((quantityItem.children[0] as ValueSelector).expression).toBe('Quantity');

      const priceItem = itemItem.children[3];
      expect(priceItem.parent).toEqual(itemItem);
      expect(priceItem.children).toHaveLength(1);
      expect((priceItem.children[0] as ValueSelector).expression).toBe('Price');

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links).toHaveLength(11);
      links.forEach((link) => {
        expect(link.sourceNodePath.includes(sourceDoc.fields[0].id)).toBeTruthy();
      });
    });

    it('should not remove for-each mapping contents (target)', () => {
      targetDoc = TestUtil.createTargetOrderDoc();
      MappingService.removeStaleMappingsForDocument(tree, targetDoc);
      const shipOrderItem = tree.children[0];
      const forEachItem = shipOrderItem.children[3];
      expect(forEachItem.parent).toEqual(shipOrderItem);
      expect(forEachItem.children).toHaveLength(1);

      const itemItem = forEachItem.children[0];
      expect(itemItem.parent).toEqual(forEachItem);
      expect(itemItem.children).toHaveLength(4);
      const titleItem = itemItem.children[0];
      expect(titleItem.parent).toEqual(itemItem);
      expect(titleItem.children).toHaveLength(1);
      expect((titleItem.children[0] as ValueSelector).expression).toBe('Title');

      const chooseItem = itemItem.children[1];
      expect(chooseItem.parent).toEqual(itemItem);
      expect(chooseItem.children).toHaveLength(2);
      const whenItem = chooseItem.children[0] as WhenItem;
      expect(whenItem.parent).toEqual(chooseItem);
      expect(whenItem.expression).toBe("Note != ''");
      expect((whenItem.children[0].children[0] as ValueSelector).expression).toBe('Note');
      const otherwiseItem = chooseItem.children[1] as OtherwiseItem;
      expect(otherwiseItem.parent).toEqual(chooseItem);
      expect((otherwiseItem.children[0].children[0] as ValueSelector).expression).toBe('Title');

      const quantityItem = itemItem.children[2];
      expect(quantityItem.parent).toEqual(itemItem);
      expect(quantityItem.children).toHaveLength(1);
      expect((quantityItem.children[0] as ValueSelector).expression).toBe('Quantity');

      const priceItem = itemItem.children[3];
      expect(priceItem.parent).toEqual(itemItem);
      expect(priceItem.children).toHaveLength(1);
      expect((priceItem.children[0] as ValueSelector).expression).toBe('Price');

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links).toHaveLength(11);
      links.forEach((link) => {
        expect(link.targetNodePath.includes(targetDoc.fields[0].id)).toBeTruthy();
      });
    });

    it("should not remove for-each targeted field when it doesn't have children (source)", () => {
      const shipOrderItem = tree.children[0];
      const forEachItem = shipOrderItem.children[3];
      shipOrderItem.children = [forEachItem];
      const itemItem = forEachItem.children[0];
      itemItem.children = [];
      MappingService.removeStaleMappingsForDocument(tree, sourceDoc);
      expect(forEachItem.parent).toEqual(shipOrderItem);
      expect(forEachItem.children).toHaveLength(1);

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links).toHaveLength(1);
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
      expect(forEachItem.children).toHaveLength(1);

      const links = MappingLinksService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links).toHaveLength(1);
      expect(links[0].targetNodePath.includes(targetDoc.fields[0].id)).toBeTruthy();
    });

    it('should ignore mappings with XPath parse errors and remove valid stale source field mappings', () => {
      expect(tree.children[0].children).toHaveLength(4);

      const orderIdFieldItem = tree.children[0].children[0] as FieldItem;
      const valueSelector = orderIdFieldItem.children[0] as ValueSelector;
      valueSelector.expression = 'invalid[[xpath]]syntax';

      // Remove the OrderPerson field from the source document (second field)
      const orderIdField = sourceDoc.fields[0].fields[0];
      expect(orderIdField.name).toBe('OrderId');
      const orderPersonField = sourceDoc.fields[0].fields[1];
      expect(orderPersonField.name).toBe('OrderPerson');
      sourceDoc.fields[0].fields.splice(0, 2);

      MappingService.removeStaleMappingsForDocument(tree, sourceDoc);

      expect(tree.children[0].children).toHaveLength(3);
      expect((tree.children[0].children[0].children[0] as ValueSelector).expression).toBe('invalid[[xpath]]syntax');
      expect(tree.children[0].children[1].name).toContain('ShipTo');
    });

    it('should ignore mappings with XPath parse errors and remove valid stale target field mappings', () => {
      expect(tree.children[0].children).toHaveLength(4);

      const ifConditionItem = tree.children[0].children[1] as IfItem;
      ifConditionItem.expression = 'invalid[[xpath]]syntax';

      const orderIdField = targetDoc.fields[0].fields[0];
      expect(orderIdField.name).toBe('OrderId');
      targetDoc.fields[0].fields.splice(0, 1);

      MappingService.removeStaleMappingsForDocument(tree, targetDoc);

      expect(tree.children[0].children).toHaveLength(3);
      expect(tree.children[0].children[0]).toBe(ifConditionItem);
      expect(ifConditionItem.expression).toBe('invalid[[xpath]]syntax');
    });

    it('should handle XPath extractFieldPaths throwing in hasStaleSourceField', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const extractSpy = vi.spyOn(XPathService, 'extractFieldPaths').mockImplementation(() => {
        throw new Error('Unexpected XPath error');
      });

      MappingService.removeStaleMappingsForDocument(tree, sourceDoc);

      expect(consoleSpy).toHaveBeenCalledWith('XPath field path extraction failed:', expect.any(Error));

      consoleSpy.mockRestore();
      extractSpy.mockRestore();
    });
  });

  describe('removeStaleMappingsForDocument() with isUserCreated FieldItem', () => {
    it('should retain isUserCreated FieldItem even when it has no children', () => {
      const parentItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];
      const userCreatedItem = new FieldItem(parentItem, targetField);
      userCreatedItem.isUserCreated = true;
      parentItem.children.push(userCreatedItem);

      const childrenBefore = parentItem.children.length;
      MappingService.removeStaleMappingsForDocument(tree, targetDoc);
      expect(parentItem.children).toHaveLength(childrenBefore);
      const retained = parentItem.children.find(
        (c) => c instanceof FieldItem && c.field === targetField && c.isUserCreated,
      );
      expect(retained).toBeDefined();
    });

    it('should remove non-isUserCreated FieldItem with no children', () => {
      const parentItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];
      const regularItem = new FieldItem(parentItem, targetField);
      regularItem.isUserCreated = false;
      regularItem.children = [];
      parentItem.children.push(regularItem);

      const childrenBefore = parentItem.children.length;
      MappingService.removeStaleMappingsForDocument(tree, targetDoc);
      const stillPresent = parentItem.children.find(
        (c) => c instanceof FieldItem && c.field === targetField && !c.isUserCreated && c.children.length === 0,
      );
      expect(stillPresent).toBeUndefined();
      expect(parentItem.children.length).toBeLessThan(childrenBefore);
    });
  });

  describe('addIf()', () => {
    it('should add if with mapping', () => {
      const parent = tree.children[0];
      const mapping = parent.children[0];
      const childrenBefore = parent.children.length;
      MappingService.addIf(parent, mapping);
      expect(parent.children).toHaveLength(childrenBefore + 1);
      const ifItem = parent.children[parent.children.length - 1];
      expect(ifItem instanceof IfItem).toBeTruthy();
      expect(ifItem.children[0]).toBe(mapping);
    });

    it('should add if without mapping and create value selector', () => {
      const parent = tree.children[0];
      const childrenBefore = parent.children.length;
      MappingService.addIf(parent);
      expect(parent.children).toHaveLength(childrenBefore + 1);
      const ifItem = parent.children[parent.children.length - 1];
      expect(ifItem instanceof IfItem).toBeTruthy();
      expect(ifItem.children[0] instanceof ValueSelector).toBeTruthy();
    });
  });

  describe('addChooseWhenOtherwise()', () => {
    it('should add conditions', () => {
      const orderIdFieldItem = tree.children[0].children[0];
      expect(orderIdFieldItem.children).toHaveLength(1);
      MappingService.addChooseWhenOtherwise(orderIdFieldItem, orderIdFieldItem.children[0]);
      expect(orderIdFieldItem.children).toHaveLength(1);
      const chooseItem = orderIdFieldItem.children[0];
      expect(chooseItem instanceof ChooseItem).toBeTruthy();
      expect(chooseItem.children[0] instanceof WhenItem).toBeTruthy();
      expect(chooseItem.children[1] instanceof OtherwiseItem).toBeTruthy();
    });

    it('should add conditions without mapping', () => {
      const parent = tree.children[0];
      const childrenBefore = parent.children.length;
      MappingService.addChooseWhenOtherwise(parent);
      expect(parent.children).toHaveLength(childrenBefore + 1);
      const chooseItem = parent.children[parent.children.length - 1];
      expect(chooseItem instanceof ChooseItem).toBeTruthy();
      const whenItem = chooseItem.children[0];
      expect(whenItem instanceof WhenItem).toBeTruthy();
      expect(whenItem.children[0] instanceof ValueSelector).toBeTruthy();
      const otherwiseItem = chooseItem.children[1];
      expect(otherwiseItem instanceof OtherwiseItem).toBeTruthy();
      expect(otherwiseItem.children[0] instanceof ValueSelector).toBeTruthy();
    });
  });

  describe('addWhen()', () => {
    it('should add when with field', () => {
      const chooseItem = new ChooseItem(tree.children[0]);
      const field = sourceDoc.fields[0].fields[0];
      const whenItem = MappingService.addWhen(chooseItem, undefined, field);
      expect(whenItem instanceof WhenItem).toBeTruthy();
      expect(whenItem.children.length).toBeGreaterThan(0);
    });
  });

  describe('addOtherwise()', () => {
    it('should add otherwise with field', () => {
      const chooseItem = new ChooseItem(tree.children[0]);
      const field = sourceDoc.fields[0].fields[0];
      const otherwiseItem = MappingService.addOtherwise(chooseItem, undefined, field);
      expect(otherwiseItem instanceof OtherwiseItem).toBeTruthy();
      expect(otherwiseItem.children.length).toBeGreaterThan(0);
    });
  });

  describe('wrapWithFunction()', () => {
    it('should wrap with xpath function', () => {
      const concatFx = XPathService.functions.String.find((f) => f.name === 'concat');
      const valueSelector = new ValueSelector(tree);
      valueSelector.expression = '/path/to/field';
      MappingService.wrapWithFunction(valueSelector, concatFx!);
      expect(valueSelector.expression).toBe('concat(/path/to/field)');
    });
  });

  describe('mapToCondition()', () => {
    it('should add to xpath', () => {
      expect(tree.children[0].children[1] instanceof IfItem).toBeTruthy();
      const ifItem = tree.children[0].children[1] as IfItem;
      expect(ifItem.expression).toBe("/ns0:ShipOrder/ns0:OrderPerson != ''");
      MappingService.mapToCondition(ifItem, sourceDoc.fields[0].fields[1]);
      expect(ifItem.expression).toBe("/ns0:ShipOrder/ns0:OrderPerson != '', /ns0:ShipOrder/ns0:OrderPerson");
    });
  });

  describe('mapToDocument()', () => {
    it('should add ValueSelector', () => {
      expect(tree.children).toHaveLength(1);
      MappingService.mapToDocument(tree, sourceDoc.fields[0]);
      expect(tree.children).toHaveLength(2);
      expect(tree.children[1] instanceof ValueSelector).toBeTruthy();
      const selector = tree.children[1] as ValueSelector;
      expect(selector.expression).toBe('/ns0:ShipOrder');
    });
  });

  describe('mapToField()', () => {
    it('should add to xpath', () => {
      const orderIdFieldItem = tree.children[0].children[0];
      orderIdFieldItem.children = [];
      MappingService.mapToField(sourceDoc.fields[0].fields[0], orderIdFieldItem);
      expect(orderIdFieldItem.children[0] instanceof ValueSelector);
      const orderIdValueSelector = orderIdFieldItem.children[0] as ValueSelector;
      expect(orderIdValueSelector.expression).toBe('/ns0:ShipOrder/@OrderId');
    });

    it('should populate namespace if not exists', () => {
      tree.namespaceMap = {};
      const orderIdFieldItem = tree.children[0].children[0];
      orderIdFieldItem.children = [];
      MappingService.mapToField(sourceDoc.fields[0].fields[0], orderIdFieldItem);
      expect(orderIdFieldItem.children[0] instanceof ValueSelector);
      const orderIdValueSelector = orderIdFieldItem.children[0] as ValueSelector;
      expect(orderIdValueSelector.expression).toBe('/ns0:ShipOrder/@OrderId');
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
      expect(tree.children[0].children).toHaveLength(4);
      const orderIdValueSelector = tree.children[0].children[0].children[0] as ValueSelector;
      MappingService.deleteMappingItem(orderIdValueSelector);
      expect(tree.children[0].children).toHaveLength(3);
    });

    it('should delete the empty root field item when it has no children', () => {
      MappingSerializerService.deserialize(getConditionalMappingsToShipOrderXslt(), targetDoc, tree, paramsMap);

      expect(tree.children[0].children).toHaveLength(1);
      const forEachItem = tree.children[0].children[0] as ForEachItem;
      expect(forEachItem.expression).toBe('$cart/ns0:Cart/Item');
      MappingService.deleteMappingItem(forEachItem);
      expect(tree.children).toHaveLength(0);
    });

    it('should delete VariableItem from FieldItem parent', () => {
      const parent = tree.children[0];
      const variable = MappingService.addVariable(parent, 'myVar');
      const childrenBefore = parent.children.length;
      MappingService.deleteMappingItem(variable);
      expect(parent.children).toHaveLength(childrenBefore - 1);
      expect(parent.children).not.toContain(variable);
    });

    it('should delete VariableItem from ForEachItem parent', () => {
      const forEachItem = tree.children[0].children[3] as ForEachItem;
      const variable = MappingService.addVariable(forEachItem, 'loopVar');
      const childrenBefore = forEachItem.children.length;
      MappingService.deleteMappingItem(variable);
      expect(forEachItem.children).toHaveLength(childrenBefore - 1);
      expect(forEachItem.children).not.toContain(variable);
    });

    it('should delete VariableItem from IfItem parent', () => {
      const ifItem = tree.children[0].children[1] as IfItem;
      const variable = MappingService.addVariable(ifItem, 'condVar');
      const childrenBefore = ifItem.children.length;
      MappingService.deleteMappingItem(variable);
      expect(ifItem.children).toHaveLength(childrenBefore - 1);
      expect(ifItem.children).not.toContain(variable);
    });

    it('should remove variable references when deleting a VariableItem', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];
      const fieldItem = MappingService.createFieldItem(shipOrderItem, targetField);
      const variable = MappingService.addVariable(shipOrderItem, 'myVar');
      const vs = new ValueSelector(fieldItem);
      vs.expression = '$myVar';
      fieldItem.children.push(vs);
      expect(fieldItem.children).toContain(vs);
      MappingService.deleteMappingItem(variable);
      expect(shipOrderItem.children).not.toContain(variable);
      expect(fieldItem.children).not.toContain(vs);
    });
  });

  describe('addVariable()', () => {
    it('should add variable to FieldItem', () => {
      const parent = tree.children[0];
      const childrenBefore = parent.children.length;
      const variable = MappingService.addVariable(parent, 'myVar');
      expect(parent.children).toHaveLength(childrenBefore + 1);
      expect(variable).toBeInstanceOf(VariableItem);
      expect(variable.name).toBe('myVar');
      expect(variable.expression).toBe('');
      expect(variable.parent).toBe(parent);
    });

    it('should add variable with expression', () => {
      const parent = tree.children[0];
      const variable = MappingService.addVariable(parent, 'taxRate', '0.08');
      expect(variable.expression).toBe('0.08');
    });

    it('should add variable to ForEachItem', () => {
      const forEachItem = tree.children[0].children[3] as ForEachItem;
      const variable = MappingService.addVariable(forEachItem, 'loopVar');
      expect(variable.parent).toBe(forEachItem);
      expect(forEachItem.children).toContain(variable);
    });

    it('should add variable to IfItem', () => {
      const ifItem = tree.children[0].children[1] as IfItem;
      const variable = MappingService.addVariable(ifItem, 'condVar');
      expect(variable.parent).toBe(ifItem);
      expect(ifItem.children).toContain(variable);
    });

    it('should add variable to WhenItem', () => {
      const parent = tree.children[0];
      const chooseItem = new ChooseItem(parent);
      const whenItem = MappingService.addWhen(chooseItem);
      const variable = MappingService.addVariable(whenItem, 'whenVar');
      expect(variable.parent).toBe(whenItem);
      expect(whenItem.children).toContain(variable);
    });

    it('should add variable to OtherwiseItem', () => {
      const parent = tree.children[0];
      const chooseItem = new ChooseItem(parent);
      const otherwiseItem = MappingService.addOtherwise(chooseItem);
      const variable = MappingService.addVariable(otherwiseItem, 'elseVar');
      expect(variable.parent).toBe(otherwiseItem);
      expect(otherwiseItem.children).toContain(variable);
    });

    it('should insert variable before non-variable children', () => {
      const parent = tree.children[0];
      const firstChildBefore = parent.children[0];
      MappingService.addVariable(parent, 'myVar');
      expect(parent.children[0]).toBeInstanceOf(VariableItem);
      expect(parent.children[1]).toBe(firstChildBefore);
    });

    it('should insert second variable after the first variable', () => {
      const parent = tree.children[0];
      const firstChildBefore = parent.children[0];
      MappingService.addVariable(parent, 'var1');
      MappingService.addVariable(parent, 'var2');
      expect((parent.children[0] as VariableItem).name).toBe('var1');
      expect((parent.children[1] as VariableItem).name).toBe('var2');
      expect(parent.children[2]).toBe(firstChildBefore);
    });
  });

  describe('removeVariable()', () => {
    it('should remove variable from parent', () => {
      const parent = tree.children[0];
      const variable = MappingService.addVariable(parent, 'myVar');
      const childrenBefore = parent.children.length;
      MappingService.removeVariable(variable);
      expect(parent.children).toHaveLength(childrenBefore - 1);
      expect(parent.children).not.toContain(variable);
    });

    it('should clean up empty parent FieldItem chain', () => {
      const shipOrderItem = tree.children[0];
      shipOrderItem.children = [];
      const nestedFieldItem = new FieldItem(shipOrderItem, targetDoc.fields[0].fields[0]);
      shipOrderItem.children.push(nestedFieldItem);
      const variable = MappingService.addVariable(nestedFieldItem, 'myVar');
      expect(nestedFieldItem.children).toHaveLength(1);
      MappingService.removeVariable(variable);
      expect(shipOrderItem.children).toHaveLength(0);
    });

    it('should preserve sibling children when removing variable', () => {
      const parent = tree.children[0];
      const childrenBefore = parent.children.length;
      const var1 = MappingService.addVariable(parent, 'var1');
      MappingService.addVariable(parent, 'var2');
      MappingService.removeVariable(var1);
      expect(parent.children).toHaveLength(childrenBefore + 1);
      expect(parent.children[0]).toBeInstanceOf(VariableItem);
      expect((parent.children[0] as VariableItem).name).toBe('var2');
    });
  });

  describe('updateVariable()', () => {
    it('should update name and expression', () => {
      const parent = tree.children[0];
      const variable = MappingService.addVariable(parent, 'oldName', 'oldExpr');
      MappingService.updateVariable(variable, 'newName', 'newExpr');
      expect(variable.name).toBe('newName');
      expect(variable.expression).toBe('newExpr');
    });
  });

  describe('getAllVariables()', () => {
    it('should return empty array for tree without variables', () => {
      const emptyTree = new MappingTree(
        targetDoc.documentType,
        targetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      expect(MappingService.getAllVariables(emptyTree)).toEqual([]);
    });

    it('should return empty array when tree has children but no variables', () => {
      expect(MappingService.getAllVariables(tree)).toEqual([]);
    });

    it('should collect variables from root level', () => {
      const parent = tree.children[0];
      const var1 = MappingService.addVariable(parent, 'var1');
      const var2 = MappingService.addVariable(parent, 'var2');
      const result = MappingService.getAllVariables(tree);
      expect(result).toHaveLength(2);
      expect(result).toContain(var1);
      expect(result).toContain(var2);
    });

    it('should collect variables nested in ForEachItem', () => {
      const forEachItem = tree.children[0].children[3] as ForEachItem;
      const variable = MappingService.addVariable(forEachItem, 'loopVar');
      const result = MappingService.getAllVariables(tree);
      expect(result).toHaveLength(1);
      expect(result).toContain(variable);
    });

    it('should collect variables nested in IfItem', () => {
      const ifItem = tree.children[0].children[1] as IfItem;
      const variable = MappingService.addVariable(ifItem, 'condVar');
      const result = MappingService.getAllVariables(tree);
      expect(result).toHaveLength(1);
      expect(result).toContain(variable);
    });

    it('should collect variables nested in WhenItem and OtherwiseItem', () => {
      const parent = tree.children[0];
      const chooseItem = new ChooseItem(parent);
      parent.children.push(chooseItem);
      const whenItem = MappingService.addWhen(chooseItem);
      const otherwiseItem = MappingService.addOtherwise(chooseItem);
      const whenVar = MappingService.addVariable(whenItem, 'whenVar');
      const elseVar = MappingService.addVariable(otherwiseItem, 'elseVar');
      const result = MappingService.getAllVariables(tree);
      expect(result).toHaveLength(2);
      expect(result).toContain(whenVar);
      expect(result).toContain(elseVar);
    });

    it('should collect variables from multiple nesting levels', () => {
      const parent = tree.children[0];
      const rootVar = MappingService.addVariable(parent, 'rootVar');
      const forEachItem = tree.children[0].children.find((c) => c instanceof ForEachItem) as ForEachItem;
      const nestedVar = MappingService.addVariable(forEachItem, 'nestedVar');
      const result = MappingService.getAllVariables(tree);
      expect(result).toHaveLength(2);
      expect(result).toContain(rootVar);
      expect(result).toContain(nestedVar);
    });
  });

  describe('removeVariableReferences()', () => {
    it('should remove ValueSelector referencing the variable and prune empty FieldItem chain', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0]; // first child of ShipOrder
      const fieldItem = MappingService.createFieldItem(shipOrderItem, targetField);
      const variable = MappingService.addVariable(tree, 'taxRate');

      // Simulate mapping: add a ValueSelector with $taxRate expression
      const vs = new ValueSelector(fieldItem);
      vs.expression = '$taxRate';
      fieldItem.children.push(vs);

      expect(shipOrderItem.children).toContain(fieldItem);
      expect(fieldItem.children).toContain(vs);

      MappingService.removeVariableReferences(variable);

      expect(fieldItem.children).not.toContain(vs);
      expect(shipOrderItem.children).not.toContain(fieldItem);
      expect(tree.children).toContain(variable);
    });

    it('should not remove expressions that do not reference the deleted variable', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];
      const fieldItem = MappingService.createFieldItem(shipOrderItem, targetField);

      const vs = new ValueSelector(fieldItem);
      vs.expression = '$otherVar';
      fieldItem.children.push(vs);

      const variable = MappingService.addVariable(tree, 'taxRate');
      MappingService.removeVariableReferences(variable);

      expect(fieldItem.children).toContain(vs);
      expect(shipOrderItem.children).toContain(fieldItem);
    });

    it('should remove variable references inside ForEachItem children', () => {
      const forEachItem = tree.children[0].children[3] as ForEachItem;
      const childFieldItem = forEachItem.children.find((c) => c instanceof FieldItem) as FieldItem;
      if (!childFieldItem) return;

      const vs = new ValueSelector(childFieldItem);
      vs.expression = '$loopVar';
      childFieldItem.children.push(vs);

      const childrenBefore = childFieldItem.children.length;
      const variable = MappingService.addVariable(tree, 'loopVar');
      MappingService.removeVariableReferences(variable);

      expect(childFieldItem.children).toHaveLength(childrenBefore - 1);
      expect(childFieldItem.children).not.toContain(vs);
    });

    it('should not remove references shadowed by a same-name variable in inner scope', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];
      const fieldItem = MappingService.createFieldItem(shipOrderItem, targetField);

      const localVar = MappingService.addVariable(shipOrderItem, 'x');
      const vs = new ValueSelector(fieldItem);
      vs.expression = '$x';
      fieldItem.children.push(vs);

      const globalVar = MappingService.addVariable(tree, 'x');
      MappingService.removeVariableReferences(globalVar);

      expect(fieldItem.children).toContain(vs);
      expect(vs.expression).toBe('$x');
      expect(shipOrderItem.children).toContain(localVar);
    });

    it('should remove a direct following sibling that references the variable', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const variable = MappingService.addVariable(shipOrderItem, 'myVar');
      const vs = new ValueSelector(shipOrderItem);
      vs.expression = '$myVar';
      shipOrderItem.children.push(vs);

      expect(shipOrderItem.children).toContain(vs);
      MappingService.removeVariableReferences(variable);
      expect(shipOrderItem.children).not.toContain(vs);
    });

    it('should preserve VariableItem declaration but clear its expression when it references the deleted variable', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const varA = new VariableItem(shipOrderItem, 'a');
      varA.expression = '1';
      const varB = new VariableItem(shipOrderItem, 'b');
      varB.expression = '$a + 1';
      shipOrderItem.children.unshift(varA, varB);

      MappingService.removeVariableReferences(varA);

      expect(shipOrderItem.children).toContain(varB);
      expect(varB.expression).toBe('');
    });

    it('should stop at sibling-level same-name variable redeclaration', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];

      const varX1 = new VariableItem(shipOrderItem, 'x');
      varX1.expression = '1';
      const varX2 = new VariableItem(shipOrderItem, 'x');
      varX2.expression = '2';
      const fieldItem = MappingService.createFieldItem(shipOrderItem, targetField);
      const vs = new ValueSelector(fieldItem);
      vs.expression = '$x';
      fieldItem.children.push(vs);
      shipOrderItem.children.unshift(varX1, varX2);

      MappingService.removeVariableReferences(varX1);

      expect(shipOrderItem.children).toContain(varX2);
      expect(shipOrderItem.children).toContain(fieldItem);
      expect(fieldItem.children).toContain(vs);
      expect(vs.expression).toBe('$x');
    });

    it('should clear redeclaring variable expression that references the deleted variable', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];

      const varX1 = new VariableItem(shipOrderItem, 'x');
      varX1.expression = '1';
      const varX2 = new VariableItem(shipOrderItem, 'x');
      varX2.expression = '$x + 1';
      const fieldItem = MappingService.createFieldItem(shipOrderItem, targetField);
      const vs = new ValueSelector(fieldItem);
      vs.expression = '$x';
      fieldItem.children.push(vs);
      shipOrderItem.children.unshift(varX1, varX2);

      MappingService.removeVariableReferences(varX1);

      expect(varX2.expression).toBe('');
      expect(vs.expression).toBe('$x');
    });

    it('should preserve redeclaring variable expression that does not reference the deleted variable', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];

      const varX1 = new VariableItem(shipOrderItem, 'x');
      varX1.expression = '1';
      const varX2 = new VariableItem(shipOrderItem, 'x');
      varX2.expression = '5';
      const fieldItem = MappingService.createFieldItem(shipOrderItem, targetField);
      const vs = new ValueSelector(fieldItem);
      vs.expression = '$x';
      fieldItem.children.push(vs);
      shipOrderItem.children.unshift(varX1, varX2);

      MappingService.removeVariableReferences(varX1);

      expect(varX2.expression).toBe('5');
      expect(vs.expression).toBe('$x');
    });
  });

  describe('renameVariableReferences()', () => {
    it('should rename $oldName to $newName in expressions', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];
      const fieldItem = MappingService.createFieldItem(shipOrderItem, targetField);
      const variable = MappingService.addVariable(shipOrderItem, 'myVar');
      const vs = new ValueSelector(fieldItem);
      vs.expression = '$myVar';
      fieldItem.children.push(vs);

      MappingService.renameVariableReferences(variable, 'renamedVar');

      expect(vs.expression).toBe('$renamedVar');
    });

    it('should not rename partial matches', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];
      const fieldItem = MappingService.createFieldItem(shipOrderItem, targetField);
      const variable = MappingService.addVariable(shipOrderItem, 'my');
      const vs = new ValueSelector(fieldItem);
      vs.expression = '$myVar + $my';
      fieldItem.children.push(vs);

      MappingService.renameVariableReferences(variable, 'other');

      expect(vs.expression).toBe('$myVar + $other');
    });

    it('should rename multiple occurrences in compound expressions', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];
      const fieldItem = MappingService.createFieldItem(shipOrderItem, targetField);
      const variable = MappingService.addVariable(shipOrderItem, 'x');
      const vs = new ValueSelector(fieldItem);
      vs.expression = '$x + $x';
      fieldItem.children.push(vs);

      MappingService.renameVariableReferences(variable, 'y');

      expect(vs.expression).toBe('$y + $y');
    });

    it('should not rename references shadowed by a same-name variable in inner scope', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];
      const fieldItem = MappingService.createFieldItem(shipOrderItem, targetField);

      MappingService.addVariable(shipOrderItem, 'x');
      const vs = new ValueSelector(fieldItem);
      vs.expression = '$x';
      fieldItem.children.push(vs);

      const globalVar = MappingService.addVariable(tree, 'x');
      MappingService.renameVariableReferences(globalVar, 'y');

      expect(vs.expression).toBe('$x');
    });

    it('should stop at sibling-level same-name variable redeclaration', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];

      const varX1 = new VariableItem(shipOrderItem, 'x');
      varX1.expression = '1';
      const varX2 = new VariableItem(shipOrderItem, 'x');
      varX2.expression = '2';
      const fieldItem = MappingService.createFieldItem(shipOrderItem, targetField);
      const vs = new ValueSelector(fieldItem);
      vs.expression = '$x';
      fieldItem.children.push(vs);
      shipOrderItem.children.unshift(varX1, varX2);

      MappingService.renameVariableReferences(varX1, 'y');

      expect(vs.expression).toBe('$x');
      expect(varX2.name).toBe('x');
    });

    it('should rename reference in redeclaring variable expression but not beyond', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const targetField = targetDoc.fields[0].fields[0];

      const varX1 = new VariableItem(shipOrderItem, 'x');
      varX1.expression = '1';
      const varX2 = new VariableItem(shipOrderItem, 'x');
      varX2.expression = '$x + 1';
      const fieldItem = MappingService.createFieldItem(shipOrderItem, targetField);
      const vs = new ValueSelector(fieldItem);
      vs.expression = '$x';
      fieldItem.children.push(vs);
      shipOrderItem.children.unshift(varX1, varX2);

      MappingService.renameVariableReferences(varX1, 'y');

      expect(varX2.expression).toBe('$y + 1');
      expect(vs.expression).toBe('$x');
    });
  });

  describe('container auto-mapping', () => {
    let sourceRoot: IField;
    let targetRoot: IField;

    beforeEach(() => {
      sourceRoot = sourceDoc.fields[0];
      DocumentUtilService.resolveTypeFragment(sourceRoot);
      targetRoot = targetDoc.fields[0];
      DocumentUtilService.resolveTypeFragment(targetRoot);
    });

    it('applyContainerMapping should use copy-of for identical containers', () => {
      const manualTree = new MappingTree(
        targetDoc.documentType,
        targetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      manualTree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };

      const targetShipTo = targetRoot.fields.find((f: IField) => f.name === 'ShipTo')!;
      const sourceShipTo = sourceRoot.fields.find((f: IField) => f.name === 'ShipTo')!;

      const rootItem = new FieldItem(manualTree, targetRoot);
      manualTree.children.push(rootItem);
      const shipToItem = new FieldItem(rootItem, targetShipTo);
      rootItem.children.push(shipToItem);

      MappingService.applyContainerMapping(sourceShipTo, targetShipTo, shipToItem);

      const vs = shipToItem.children.find((c) => c instanceof ValueSelector) as ValueSelector;
      expect(vs).toBeDefined();
      expect(vs.valueType).toBe(ValueType.CONTAINER);
    });

    it('generateAutoChildMappings should create value-of for terminal matching children', () => {
      const manualTree = new MappingTree(
        targetDoc.documentType,
        targetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      manualTree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };

      const targetShipTo = targetRoot.fields.find((f: IField) => f.name === 'ShipTo')!;
      DocumentUtilService.resolveTypeFragment(targetShipTo);
      const sourceShipTo = sourceRoot.fields.find((f: IField) => f.name === 'ShipTo')!;
      DocumentUtilService.resolveTypeFragment(sourceShipTo);

      const rootItem = new FieldItem(manualTree, targetRoot);
      manualTree.children.push(rootItem);
      const shipToItem = new FieldItem(rootItem, targetShipTo);
      rootItem.children.push(shipToItem);

      MappingService.generateAutoChildMappings(sourceShipTo, targetShipTo, shipToItem);

      const childFieldItems = shipToItem.children.filter((c) => c instanceof FieldItem);
      expect(childFieldItems).toHaveLength(4);
      childFieldItems.forEach((fi) => {
        const vs = fi.children.find((c) => c instanceof ValueSelector);
        expect(vs).toBeDefined();
      });
    });

    it('generateAutoChildMappings should recurse into nested containers', () => {
      const manualTree = new MappingTree(
        targetDoc.documentType,
        targetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      manualTree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };

      const rootItem = new FieldItem(manualTree, targetRoot);
      manualTree.children.push(rootItem);

      MappingService.generateAutoChildMappings(sourceRoot, targetRoot, rootItem);

      const childFieldItems = rootItem.children.filter((c) => c instanceof FieldItem);
      expect(childFieldItems.length).toBeGreaterThan(0);
      const shipToChild = childFieldItems.find((c) => c.field.name === 'ShipTo')!;
      expect(shipToChild).toBeDefined();
      const shipToVs = shipToChild.children.find((c) => c instanceof ValueSelector) as ValueSelector;
      expect(shipToVs).toBeDefined();
      expect(shipToVs.valueType).toBe(ValueType.CONTAINER);
    });

    it('applyContainerMapping should recurse when canUseCopyOf is false', () => {
      const manualTree = new MappingTree(
        targetDoc.documentType,
        targetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      manualTree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };

      const targetShipTo = targetRoot.fields.find((f: IField) => f.name === 'ShipTo')!;
      DocumentUtilService.resolveTypeFragment(targetShipTo);
      const sourceShipTo = sourceRoot.fields.find((f: IField) => f.name === 'ShipTo')!;
      DocumentUtilService.resolveTypeFragment(sourceShipTo);

      const rootItem = new FieldItem(manualTree, targetRoot);
      manualTree.children.push(rootItem);
      const shipToItem = new FieldItem(rootItem, targetShipTo);
      rootItem.children.push(shipToItem);

      vi.spyOn(FieldMatchingService, 'canUseCopyOf').mockReturnValue(false);
      MappingService.applyContainerMapping(sourceShipTo, targetShipTo, shipToItem);

      const childFieldItems = shipToItem.children.filter((c) => c instanceof FieldItem);
      expect(childFieldItems).toHaveLength(4);
      vi.restoreAllMocks();
    });

    it('getContainerValueType should return CONTAINER for normal fields', () => {
      const targetShipTo = targetRoot.fields.find((f: IField) => f.name === 'ShipTo')!;
      const sourceShipTo = sourceRoot.fields.find((f: IField) => f.name === 'ShipTo')!;
      expect(MappingService.getContainerValueType(sourceShipTo, targetShipTo)).toBe(ValueType.CONTAINER);
    });
  });

  describe('addInnerForEach()', () => {
    it('should add first for-each to FieldItem and move existing children into it', () => {
      // Create a fresh FieldItem without any existing ForEachItem children
      const freshFieldItem = new FieldItem(tree, targetDoc.fields[0]);
      const field1 = new FieldItem(freshFieldItem, targetDoc.fields[0].fields[0]);
      const field2 = new FieldItem(freshFieldItem, targetDoc.fields[0].fields[1]);
      const valueSelector = new ValueSelector(freshFieldItem, ValueType.VALUE);
      freshFieldItem.children = [field1, field2, valueSelector];

      MappingService.addInnerForEach(freshFieldItem);

      // Should have ValueSelector + ForEachItem
      expect(freshFieldItem.children).toHaveLength(2);
      expect(freshFieldItem.children[0]).toBe(valueSelector);
      expect(freshFieldItem.children[1]).toBeInstanceOf(ForEachItem);

      const forEachItem = freshFieldItem.children[1] as ForEachItem;
      expect(forEachItem.parent).toBe(freshFieldItem);
      // The two field items should be moved into the for-each
      expect(forEachItem.children).toHaveLength(2);
      expect(forEachItem.children[0]).toBe(field1);
      expect(forEachItem.children[1]).toBe(field2);
      forEachItem.children.forEach((child) => {
        expect(child.parent).toBe(forEachItem);
      });
    });

    it('should nest for-each inside existing ForEachItem parent', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const parentForEach = new ForEachItem(shipOrderItem);
      const fieldItem = new FieldItem(parentForEach, targetDoc.fields[0].fields[0]);
      parentForEach.children.push(fieldItem);
      const valueSelector = new ValueSelector(parentForEach, ValueType.VALUE);
      parentForEach.children.push(valueSelector);

      MappingService.addInnerForEach(parentForEach);

      // Should have ValueSelector + nested ForEachItem
      expect(parentForEach.children).toHaveLength(2);
      expect(parentForEach.children[0]).toBe(valueSelector);
      expect(parentForEach.children[1]).toBeInstanceOf(ForEachItem);

      const nestedForEach = parentForEach.children[1] as ForEachItem;
      expect(nestedForEach.parent).toBe(parentForEach);
      expect(nestedForEach.children).toHaveLength(1);
      expect(nestedForEach.children[0]).toBe(fieldItem);
      expect(fieldItem.parent).toBe(nestedForEach);
    });
  });

  describe('addInnerChooseWhenOtherwise()', () => {
    it('should add choose/when/otherwise to FieldItem and move existing children into when branch', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const childrenBefore = shipOrderItem.children.slice();

      MappingService.addInnerChooseWhenOtherwise(shipOrderItem);

      expect(shipOrderItem.children).toHaveLength(1);
      expect(shipOrderItem.children[0]).toBeInstanceOf(ChooseItem);

      const chooseItem = shipOrderItem.children[0] as ChooseItem;
      expect(chooseItem.parent).toBe(shipOrderItem);
      expect(chooseItem.when).toHaveLength(1);
      expect(chooseItem.otherwise).toBeTruthy();

      const whenItem = chooseItem.when[0];
      expect(whenItem.parent).toBe(chooseItem);
      // When branch should have the original children (except ValueSelector)
      const nonValueSelectorChildren = childrenBefore.filter((c) => !(c instanceof ValueSelector));
      expect(whenItem.children).toHaveLength(nonValueSelectorChildren.length);
    });

    it('should clone children into otherwise branch', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const orderIdField = shipOrderItem.children[0] as FieldItem;

      MappingService.addInnerChooseWhenOtherwise(shipOrderItem);

      const chooseItem = shipOrderItem.children[0] as ChooseItem;
      const whenItem = chooseItem.when[0];
      const otherwiseItem = chooseItem.otherwise!;

      // Both branches should have children
      expect(whenItem.children.length).toBeGreaterThan(0);
      expect(otherwiseItem.children).toHaveLength(whenItem.children.length);

      // Children should be different instances (cloned)
      expect(whenItem.children[0]).not.toBe(otherwiseItem.children[0]);
      expect(whenItem.children[0]).toBeInstanceOf(FieldItem);
      expect(otherwiseItem.children[0]).toBeInstanceOf(FieldItem);

      // But they should have the same field
      const whenFieldItem = whenItem.children[0] as FieldItem;
      const otherwiseFieldItem = otherwiseItem.children[0] as FieldItem;
      expect(whenFieldItem.field).toBe(orderIdField.field);
      expect(otherwiseFieldItem.field).toBe(orderIdField.field);
    });
  });

  describe('addInnerIf()', () => {
    it('should add if to FieldItem and move ALL existing children into it', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const childrenBefore = shipOrderItem.children.slice();

      MappingService.addInnerIf(shipOrderItem);

      // Should have only 1 IfItem at the parent level
      expect(shipOrderItem.children).toHaveLength(1);
      expect(shipOrderItem.children[0]).toBeInstanceOf(IfItem);

      const ifItem = shipOrderItem.children[0] as IfItem;
      expect(ifItem.parent).toBe(shipOrderItem);
      // If item should have ALL the original children (including ValueSelectors)
      expect(ifItem.children).toHaveLength(childrenBefore.length);
      ifItem.children.forEach((child) => {
        expect(child.parent).toBe(ifItem);
      });
    });

    it('should add second if as a sibling, not nested inside the first', () => {
      const shipOrderItem = tree.children[0] as FieldItem;
      const childrenBefore = shipOrderItem.children.slice();

      // Add first if
      MappingService.addInnerIf(shipOrderItem);
      const firstIfItem = shipOrderItem.children[0] as IfItem;
      const firstIfChildrenCount = firstIfItem.children.length;

      // Verify first if has all the original children
      expect(firstIfChildrenCount).toEqual(childrenBefore.length);

      // Add second if
      MappingService.addInnerIf(shipOrderItem);

      // Should have 2 IfItems
      expect(shipOrderItem.children).toHaveLength(2);

      // Check that both children are IfItems and are siblings
      const ifItems = shipOrderItem.children.filter((c) => c instanceof IfItem);
      expect(ifItems).toHaveLength(2);
      expect(ifItems[0]).toBe(firstIfItem);
      expect(ifItems[1]).toBeInstanceOf(IfItem);

      // First if should still have the original children
      expect(firstIfItem.children).toHaveLength(firstIfChildrenCount);

      // Second if should be empty (no children)
      const secondIfItem = ifItems[1] as IfItem;
      expect(secondIfItem.parent).toBe(shipOrderItem);
      expect(secondIfItem.children).toHaveLength(0);
    });

    it('should support nesting an if inside an existing IfItem', () => {
      const shipOrderItem = tree.children[0] as FieldItem;

      // Add first if
      MappingService.addInnerIf(shipOrderItem);
      const firstIfItem = shipOrderItem.children[0] as IfItem;
      const firstIfChildrenCount = firstIfItem.children.length;

      // Add nested if inside the first if
      MappingService.addInnerIf(firstIfItem);

      // First if should now have only 1 child: the nested if
      expect(firstIfItem.children).toHaveLength(1);
      expect(firstIfItem.children[0]).toBeInstanceOf(IfItem);

      // The nested if should contain all the original children
      const nestedIfItem = firstIfItem.children[0] as IfItem;
      expect(nestedIfItem.parent).toBe(firstIfItem);
      expect(nestedIfItem.children).toHaveLength(firstIfChildrenCount);
    });

    it('should add sibling if when calling addInnerIf on IfItem that already has nested IfItem', () => {
      const shipOrderItem = tree.children[0] as FieldItem;

      // Add first if
      MappingService.addInnerIf(shipOrderItem);
      const firstIfItem = shipOrderItem.children[0] as IfItem;

      // Add nested if inside the first if
      MappingService.addInnerIf(firstIfItem);
      const nestedIfItem = firstIfItem.children[0] as IfItem;

      // Add another nested if - should be added as sibling (empty)
      MappingService.addInnerIf(firstIfItem);

      // First if should now have 2 children: both IfItems
      expect(firstIfItem.children).toHaveLength(2);
      expect(firstIfItem.children[0]).toBe(nestedIfItem);
      expect(firstIfItem.children[1]).toBeInstanceOf(IfItem);

      // Second nested if should be empty
      const secondNestedIfItem = firstIfItem.children[1] as IfItem;
      expect(secondNestedIfItem.parent).toBe(firstIfItem);
      expect(secondNestedIfItem.children).toHaveLength(0);
    });
  });
});
