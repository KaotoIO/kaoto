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
import { XmlSchemaDocument, XmlSchemaDocumentService } from './xml-schema-document.service';
import { IDocument } from '../models/datamapper/document';
import { message837Xsd, shipOrderToShipOrderXslt, TestUtil, x12837PDfdlXsd, x12837PXslt } from '../stubs/data-mapper';
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

      const links = MappingService.extractMappingLinks(tree, paramsMap, sourceDoc);
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

      const links = MappingService.extractMappingLinks(tree, paramsMap, sourceDoc);
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

      const links = MappingService.extractMappingLinks(tree, paramsMap, sourceDoc);
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

      const links = MappingService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(1);
      expect(links[0].targetNodePath.includes(targetDoc.fields[0].id)).toBeTruthy();
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

    it('should generate mapping links for the cached type fragments field', () => {
      sourceDoc = XmlSchemaDocumentService.createXmlSchemaDocument(
        DocumentType.SOURCE_BODY,
        'X12-837P.dfdl.xsd',
        x12837PDfdlXsd,
      );
      targetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(
        DocumentType.TARGET_BODY,
        'Message837.xsd',
        message837Xsd,
      );
      tree = new MappingTree(targetDoc.documentType, targetDoc.documentId);
      MappingSerializerService.deserialize(x12837PXslt, targetDoc, tree, paramsMap);
      const links = MappingService.extractMappingLinks(tree, paramsMap, sourceDoc);
      expect(links.length).toEqual(14);
      expect(links[0].sourceNodePath).toMatch('field-GS-02');
      expect(links[0].targetNodePath).toMatch('field-From');
      expect(links[1].sourceNodePath).toMatch('field-GS-03');
      expect(links[1].targetNodePath).toMatch('field-To');
      expect(links[2].sourceNodePath).toMatch('field-GS-04');
      expect(links[2].targetNodePath).toMatch('field-Date');
      expect(links[3].sourceNodePath).toMatch('field-GS-05');
      expect(links[3].targetNodePath).toMatch('field-Time');
      expect(links[4].sourceNodePath).toMatch('field-Loop2000');
      expect(links[4].targetNodePath).toMatch('for-each');
      expect(links[5].sourceNodePath).toMatch('field-CLM-01');
      expect(links[5].targetNodePath).toMatch('field-SubmitterId');
      expect(links[6].sourceNodePath).toMatch('field-CLM-02');
      expect(links[6].targetNodePath).toMatch('field-MonetaryAmount');
      expect(links[7].sourceNodePath).toMatch('field-C023-01');
      expect(links[7].targetNodePath).toMatch('field-FacilityCodeValue');
      expect(links[8].sourceNodePath).toMatch('field-C023-02');
      expect(links[8].targetNodePath).toMatch('field-FacilityCodeQualifier');
      expect(links[9].sourceNodePath).toMatch('field-C023-03');
      expect(links[9].targetNodePath).toMatch('field-ClaimFrequencyTypeCode');
      expect(links[10].sourceNodePath).toMatch('field-CLM-06');
      expect(links[10].targetNodePath).toMatch('field-YesNoConditionOrResponseCodeFile');
      expect(links[11].sourceNodePath).toMatch('field-CLM-07');
      expect(links[11].targetNodePath).toMatch('field-ProviderAcceptAssignmentCode');
      expect(links[12].sourceNodePath).toMatch('field-CLM-08');
      expect(links[12].targetNodePath).toMatch('field-YesNoConditionOrResponseCodeBenefits');
      expect(links[13].sourceNodePath).toMatch('field-CLM-09');
      expect(links[13].targetNodePath).toMatch('field-ReleaseOfInformationCode');
    });
  });
});
