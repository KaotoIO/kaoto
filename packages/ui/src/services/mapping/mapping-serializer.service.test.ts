import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../../models/datamapper/document';
import {
  ChooseItem,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingTree,
  OtherwiseItem,
  UnknownMappingItem,
  ValueSelector,
  VariableItem,
  WhenItem,
} from '../../models/datamapper/mapping';
import { NS_XSL } from '../../models/datamapper/standard-namespaces';
import { Types } from '../../models/datamapper/types';
import {
  getForEachSortToShipOrderXslt,
  getInvoice850Xsd,
  getRawTextNodeXslt,
  getShipOrderManuallyEditedXslt,
  getShipOrderToShipOrderCollectionIndexXslt,
  getShipOrderToShipOrderInvalidForEachXslt,
  getShipOrderToShipOrderMultipleForEachXslt,
  getShipOrderToShipOrderXslt,
  getShipOrderWithCommentXslt,
  getShipOrderWithMultipleCommentsXslt,
  getUnknownApplyTemplateAfterFieldXslt,
  getUnknownApplyTemplateBeforeFieldXslt,
  getUnknownApplyTemplateXslt,
  getVariableBeforeFieldXslt,
  getVariableEmptyNameXslt,
  getVariableNestedInForEachXslt,
  getVariableReservedNamesXslt,
  getVariableSimpleXslt,
  getWhitespaceTextNodeXslt,
  getX12850ForEachXslt,
  getXslTextNodeXslt,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { XmlSchemaField } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { EMPTY_XSL, MappingSerializerService } from './mapping-serializer.service';

describe('MappingSerializerService', () => {
  const sourceParameterMap = TestUtil.createParameterMap();
  const targetDoc = TestUtil.createTargetOrderDoc();

  const domParser = new DOMParser();

  it('createNew() should create am empty XSLT document', () => {
    const xslt = MappingSerializerService.createNew();
    const stylesheet = xslt.getElementsByTagNameNS(NS_XSL, 'stylesheet');
    expect(stylesheet.length).toEqual(1);
    expect(stylesheet[0].namespaceURI).toBe(NS_XSL);
    expect(stylesheet[0].localName).toBe('stylesheet');
    const template = xslt.getElementsByTagNameNS(NS_XSL, 'template');
    expect(template.length).toEqual(0);
  });

  describe('deserialize()', () => {
    it('should return an empty MappingTree', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(EMPTY_XSL, targetDoc, mappingTree, sourceParameterMap));
      expect(mappingTree.children.length).toEqual(0);
      mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize('', targetDoc, mappingTree, sourceParameterMap));
      expect(mappingTree.children.length).toEqual(0);
    });

    it('should deserialize XSLT', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      expect(Object.keys(mappingTree.namespaceMap).length).toEqual(0);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      expect(Object.keys(mappingTree.namespaceMap).length).toEqual(1);
      expect(mappingTree.namespaceMap['ns0']).toEqual('io.kaoto.datamapper.poc.test');
      expect(mappingTree.children.length).toEqual(1);
      const shipOrderFieldItem = mappingTree.children[0] as FieldItem;
      expect(shipOrderFieldItem.field.name).toEqual('ShipOrder');
      expect(shipOrderFieldItem.field.type).toEqual(Types.Container);
      expect(shipOrderFieldItem.field.isAttribute).toBeFalsy();
      expect(shipOrderFieldItem.field.namespaceURI).toEqual('io.kaoto.datamapper.poc.test');
      expect(shipOrderFieldItem.field.maxOccurs).toEqual(1);
      expect(shipOrderFieldItem.children.length).toEqual(4);

      const orderIdFieldItem = shipOrderFieldItem.children[0] as FieldItem;
      expect(orderIdFieldItem.field.name).toEqual('OrderId');
      expect(orderIdFieldItem.field.type).not.toEqual(Types.Container);
      expect(orderIdFieldItem.field.isAttribute).toBeTruthy();
      expect(orderIdFieldItem.field.namespaceURI).toEqual('');
      expect(orderIdFieldItem.field.maxOccurs).toEqual(1);
      expect(orderIdFieldItem.children.length).toEqual(1);
      let selector = orderIdFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toEqual('/ns0:ShipOrder/@OrderId');

      const ifItem = shipOrderFieldItem.children[1] as IfItem;
      expect(ifItem.expression).toEqual("/ns0:ShipOrder/ns0:OrderPerson != ''");
      expect(ifItem.children.length).toEqual(1);
      const orderPersonFieldItem = ifItem.children[0] as FieldItem;
      expect(orderPersonFieldItem.field.name).toEqual('OrderPerson');
      expect(shipOrderFieldItem.field.type).toEqual(Types.Container);
      expect(orderPersonFieldItem.field.isAttribute).toBeFalsy();
      expect(orderPersonFieldItem.field.namespaceURI).toEqual('io.kaoto.datamapper.poc.test');
      expect(orderPersonFieldItem.field.maxOccurs).toEqual(1);
      expect(orderPersonFieldItem.children.length).toEqual(1);
      selector = orderPersonFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toEqual('/ns0:ShipOrder/ns0:OrderPerson');

      const shipToFieldItem = shipOrderFieldItem.children[2] as FieldItem;
      expect(shipToFieldItem.field.name).toEqual('ShipTo');
      expect(shipToFieldItem.field.isAttribute).toBeFalsy();
      expect(shipToFieldItem.field.type).toEqual(Types.Container);
      expect(shipToFieldItem.field.namespaceURI).toEqual('');
      expect(shipToFieldItem.field.maxOccurs).toEqual(1);
      expect(shipToFieldItem.children.length).toEqual(1);
      selector = shipToFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toEqual('/ns0:ShipOrder/ShipTo');

      const forEachItem = shipOrderFieldItem.children[3] as ForEachItem;
      expect(forEachItem.expression).toEqual('/ns0:ShipOrder/Item');
      expect(forEachItem.children.length).toEqual(1);
      const itemFieldItem = forEachItem.children[0] as FieldItem;
      expect(itemFieldItem.field.name).toEqual('Item');
      expect(itemFieldItem.field.type).toEqual(Types.Container);
      expect(itemFieldItem.field.isAttribute).toBeFalsy();
      expect(itemFieldItem.field.namespaceURI).toEqual('');
      expect(itemFieldItem.field.maxOccurs).toEqual('unbounded');
      expect(itemFieldItem.children.length).toEqual(4);

      const titleFieldItem = itemFieldItem.children[0] as FieldItem;
      expect(titleFieldItem.field.name).toEqual('Title');
      expect(titleFieldItem.field.isAttribute).toBeFalsy();
      expect(titleFieldItem.field.type).not.toEqual(Types.Container);
      expect(titleFieldItem.field.namespaceURI).toEqual('');
      expect(titleFieldItem.field.maxOccurs).toEqual(1);
      expect(titleFieldItem.children.length).toEqual(1);
      selector = titleFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toEqual('Title');

      const chooseItem = itemFieldItem.children[1] as ChooseItem;
      expect(chooseItem.children.length).toEqual(2);

      const whenItem = chooseItem.children[0] as WhenItem;
      expect(whenItem.expression).toEqual("Note != ''");
      expect(whenItem.children.length).toEqual(1);
      let noteFieldItem = whenItem.children[0] as FieldItem;
      expect(noteFieldItem.field.name).toEqual('Note');
      expect(noteFieldItem.field.type).not.toEqual(Types.Container);
      expect(noteFieldItem.field.isAttribute).toBeFalsy();
      expect(noteFieldItem.field.namespaceURI).toEqual('');
      expect(noteFieldItem.field.maxOccurs).toEqual(1);
      expect(noteFieldItem.children.length).toEqual(1);
      selector = noteFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toEqual('Note');

      const otherwiseItem = chooseItem.children[1] as OtherwiseItem;
      expect(otherwiseItem.children.length).toEqual(1);
      noteFieldItem = otherwiseItem.children[0] as FieldItem;
      expect(noteFieldItem.field.name).toEqual('Note');
      expect(noteFieldItem.field.type).not.toEqual(Types.Container);
      expect(noteFieldItem.field.isAttribute).toBeFalsy();
      expect(noteFieldItem.field.namespaceURI).toEqual('');
      expect(noteFieldItem.field.maxOccurs).toEqual(1);
      expect(noteFieldItem.children.length).toEqual(1);
      selector = noteFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toEqual('Title');

      const quantityFieldItem = itemFieldItem.children[2] as FieldItem;
      expect(quantityFieldItem.field.name).toEqual('Quantity');
      expect(quantityFieldItem.field.type).not.toEqual(Types.Container);
      expect(quantityFieldItem.field.isAttribute).toBeFalsy();
      expect(quantityFieldItem.field.namespaceURI).toEqual('');
      expect(quantityFieldItem.field.maxOccurs).toEqual(1);
      expect(quantityFieldItem.children.length).toEqual(1);
      selector = quantityFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toEqual('Quantity');

      const priceFieldItem = itemFieldItem.children[3] as FieldItem;
      expect(priceFieldItem.field.name).toEqual('Price');
      expect(priceFieldItem.field.type).not.toEqual(Types.Container);
      expect(priceFieldItem.field.isAttribute).toBeFalsy();
      expect(priceFieldItem.field.namespaceURI).toEqual('');
      expect(priceFieldItem.field.maxOccurs).toEqual(1);
      expect(priceFieldItem.children.length).toEqual(1);
      selector = priceFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toEqual('Price');
    });

    it('should deserialize a raw text node as a literal ValueSelector', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const { mappingTree: result } = MappingSerializerService.deserialize(
        getRawTextNodeXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      );
      expect(result.children.length).toEqual(1);
      const selector = result.children[0] as ValueSelector;
      expect(selector.expression).toEqual('TEST');
      expect(selector.isLiteral).toBeTruthy();
    });

    it('should deserialize xsl:text as a literal ValueSelector', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const { mappingTree: result } = MappingSerializerService.deserialize(
        getXslTextNodeXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      );
      expect(result.children.length).toEqual(1);
      const selector = result.children[0] as ValueSelector;
      expect(selector.expression).toEqual('TEST');
      expect(selector.isLiteral).toBeTruthy();
    });

    it('should ignore whitespace-only text nodes', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const { mappingTree: result } = MappingSerializerService.deserialize(
        getWhitespaceTextNodeXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      );
      expect(result.children.length).toEqual(0);
    });

    it('should deserialize incomplete XSLT', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderInvalidForEachXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const forEachItem = mappingTree.children[0].children[0] as ForEachItem;
      expect(forEachItem.expression).toEqual('');
      const itemSelector = forEachItem.children[0].children[0] as ValueSelector;
      expect(itemSelector.expression).toEqual('/ns0:ShipOrder/Item');
    });

    it('should deserialize a mapping on cached type fragment', () => {
      const definition850 = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'Invoice',
        { 'Invoice.xsd': getInvoice850Xsd() },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition850);
      expect(result.validationStatus).toBe('success');
      const targetDoc850 = result.document!;
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getX12850ForEachXslt(),
        targetDoc850,
        mappingTree,
        sourceParameterMap,
      ));
      const itemsFieldItem = mappingTree.children[0].children[0] as FieldItem;
      expect(itemsFieldItem.children.length).toEqual(1);
      const forEachItem = itemsFieldItem.children[0] as ForEachItem;
      expect(forEachItem.expression).toEqual('/X12_850/PO1Loop');

      expect(itemsFieldItem.field.namedTypeFragmentRefs.length).toEqual(0);
      expect(itemsFieldItem.field.fields.length).toEqual(1);
      expect(itemsFieldItem.field.fields[0] instanceof XmlSchemaField).toBeTruthy();
    });

    it('should deserialize multiple for-each mappings on a same target collection', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderMultipleForEachXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      expect(mappingTree.children[0].children.length).toEqual(2);
      const forEach1 = mappingTree.children[0].children[0] as ForEachItem;
      expect(forEach1.expression).toEqual('/ns0:ShipOrder/Item');
      expect(forEach1.children.length).toEqual(1);
      const item1 = forEach1.children[0] as FieldItem;
      expect(item1.field.name).toEqual('Item');
      const forEach2 = mappingTree.children[0].children[1] as ForEachItem;
      expect(forEach2.expression).toEqual('$sourceParam1/ns0:ShipOrder/Item');
      expect(forEach2.children.length).toEqual(1);
      const item2 = forEach1.children[0] as FieldItem;
      expect(item2.field.name).toEqual('Item');
    });

    it('should clone UnknownMappingItem with a deep copy of the element', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getUnknownApplyTemplateXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const shipOrderItem = mappingTree.children[0];
      const unknownItem = shipOrderItem.children[0] as UnknownMappingItem;

      const cloned = unknownItem.clone() as UnknownMappingItem;

      expect(cloned).toBeInstanceOf(UnknownMappingItem);
      expect(cloned).not.toBe(unknownItem);
      expect(cloned.element).not.toBe(unknownItem.element);
      expect(cloned.element.localName).toEqual(unknownItem.element.localName);
      expect(cloned.element.getAttribute('select')).toEqual(unknownItem.element.getAttribute('select'));
      expect(cloned.element.children.length).toEqual(unknownItem.element.children.length);
    });

    it('should capture unrecognized XSL elements as UnknownMappingItem', () => {
      const xslt = getUnknownApplyTemplateXslt();
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(xslt, targetDoc, mappingTree, sourceParameterMap));
      expect(mappingTree.children.length).toEqual(1);
      const shipOrderItem = mappingTree.children[0] as FieldItem;
      expect(shipOrderItem.field.name).toEqual('ShipOrder');
      expect(shipOrderItem.children.length).toEqual(1);
      const unknownItem = shipOrderItem.children[0] as UnknownMappingItem;
      expect(unknownItem).toBeInstanceOf(UnknownMappingItem);
      expect(unknownItem.name).toEqual('unknown');
      expect(unknownItem.element.localName).toEqual('apply-templates');
      expect(unknownItem.element.getAttribute('select')).toEqual('/ns0:ShipOrder/Item');
      expect(unknownItem.children.length).toEqual(0);
    });

    it('should deserialize multiple indexed collection mappings on a same target collection', () => {
      const mockCrypto = { getRandomValues: () => [Math.random() * 10000] };
      jest.spyOn(globalThis, 'crypto', 'get').mockImplementation(() => mockCrypto as unknown as Crypto);
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderCollectionIndexXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      expect(mappingTree.children[0].children.length).toEqual(2);
      const item1 = mappingTree.children[0].children[0] as FieldItem;
      expect(item1.children.length).toEqual(4);
      const item2 = mappingTree.children[0].children[1] as FieldItem;
      expect(item2.children.length).toEqual(4);
      expect(item1.id).not.toEqual(item2.id);
    });
  });

  describe('serialize()', () => {
    it('should return an empty XSLT document with empty mappings', () => {
      const empty = MappingSerializerService.serialize(
        new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA),
        sourceParameterMap,
      );
      expect(empty).toContain('This file is generated by Kaoto DataMapper. Do not edit');
      const dom = domParser.parseFromString(empty, 'application/xml');
      const template = dom
        .evaluate('/xsl:stylesheet/xsl:template', dom, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE)
        .iterateNext();
      expect(template).toBeTruthy();
      expect(template!.childNodes.length).toEqual(0);
    });

    it('should serialize mappings', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(xslt, 'text/xml');
      expect(xsltDocument.documentElement.getAttribute('xmlns:ns0')).toEqual('io.kaoto.datamapper.poc.test');
      const orderIdSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:attribute[@name="OrderId"]/xsl:value-of/@select',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(orderIdSelect?.nodeValue).toEqual('/ns0:ShipOrder/@OrderId');
      const ifTest = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:if/@test',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(ifTest?.nodeValue).toEqual("/ns0:ShipOrder/ns0:OrderPerson != ''");
      const orderPersonSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:if/OrderPerson/xsl:value-of/@select',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(orderPersonSelect?.nodeValue).toEqual('/ns0:ShipOrder/ns0:OrderPerson');
      const shipToSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/ShipTo/xsl:copy-of/@select',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(shipToSelect?.nodeValue).toEqual('/ns0:ShipOrder/ShipTo');
      const forEachSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:for-each/@select',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(forEachSelect?.nodeValue).toEqual('/ns0:ShipOrder/Item');
      const titleSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:for-each/Item/Title/xsl:value-of/@select',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(titleSelect?.nodeValue).toEqual('Title');
      const chooseWhenTest = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:for-each/Item/xsl:choose/xsl:when/@test',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(chooseWhenTest?.nodeValue).toEqual("Note != ''");
      const chooseWhenSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:for-each/Item/xsl:choose/xsl:when/Note/xsl:value-of/@select',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(chooseWhenSelect?.nodeValue).toEqual('Note');
      const chooseOtherwiseSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:for-each/Item/xsl:choose/xsl:otherwise/Note/xsl:value-of/@select',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(chooseOtherwiseSelect?.nodeValue).toEqual('Title');
    });

    it('should round-trip UnknownMappingItem verbatim including nested children', () => {
      const xslt = getUnknownApplyTemplateXslt();
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(xslt, targetDoc, mappingTree, sourceParameterMap));
      const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(serialized, 'text/xml');
      const applyTemplates = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:apply-templates/@select',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(applyTemplates?.nodeValue).toEqual('/ns0:ShipOrder/Item');
      const sort = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:apply-templates/xsl:sort/@select',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(sort?.nodeValue).toEqual('Title');
      const withParam = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:apply-templates/xsl:with-param/@name',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(withParam?.nodeValue).toEqual('prefix');
    });

    it('should preserve original order when UnknownMappingItem appears after a FieldItem', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getUnknownApplyTemplateAfterFieldXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(serialized, 'text/xml');
      const children = xsltDocument.evaluate(
        '/xsl:stylesheet/xsl:template/ShipOrder/*',
        xsltDocument,
        null,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      );
      const first = children.iterateNext() as Element;
      expect(first.nodeName).toEqual('xsl:attribute');
      const second = children.iterateNext() as Element;
      expect(second.nodeName).toEqual('xsl:apply-templates');
    });

    it('should preserve original order when UnknownMappingItem appears before a FieldItem', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getUnknownApplyTemplateBeforeFieldXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(serialized, 'text/xml');
      const children = xsltDocument.evaluate(
        '/xsl:stylesheet/xsl:template/ShipOrder/*',
        xsltDocument,
        null,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      );
      const first = children.iterateNext() as Element;
      expect(first.nodeName).toEqual('xsl:apply-templates');
      const second = children.iterateNext() as Element;
      expect(second.nodeName).toEqual('xsl:attribute');
    });

    it('should serialize mappings with respecting Document field order', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const shipOrderItem = mappingTree.children[0];
      shipOrderItem.children.reverse();
      const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(xslt, 'text/xml');
      const shipOrderSelect = xsltDocument.evaluate(
        '/xsl:stylesheet/xsl:template/ShipOrder/*',
        xsltDocument,
        null,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      );
      const xslAttribute = shipOrderSelect.iterateNext() as Element;
      expect(xslAttribute.nodeName).toEqual('xsl:attribute');
      const xslIf = shipOrderSelect.iterateNext() as Element;
      expect(xslIf.nodeName).toEqual('xsl:if');
      expect(xslIf.getAttribute('test')).toEqual("/ns0:ShipOrder/ns0:OrderPerson != ''");
      const shipTo = shipOrderSelect.iterateNext() as Element;
      expect(shipTo.nodeName).toEqual('ShipTo');
      const xslForEach = shipOrderSelect.iterateNext() as Element;
      expect(xslForEach.nodeName).toEqual('xsl:for-each');
      expect(xslForEach.getAttribute('select')).toEqual('/ns0:ShipOrder/Item');
    });

    it('should serialize mapping with comment', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const shipOrderItem = mappingTree.children[0];
      shipOrderItem.comment = 'This is a test comment';
      const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      expect(xslt).toContain('<!-- This is a test comment -->');
      const xsltDocument = domParser.parseFromString(xslt, 'text/xml');
      const template = xsltDocument.getElementsByTagNameNS(NS_XSL, 'template')[0];
      // Find the comment node (skip text nodes)
      let commentNode: Node | null = null;
      for (const node of template.childNodes) {
        if (node.nodeType === Node.COMMENT_NODE) {
          commentNode = node;
          break;
        }
      }
      expect(commentNode).toBeTruthy();
      expect((commentNode as Comment).data.trim()).toEqual('This is a test comment');
    });

    it('should serialize mapping with nested comments', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const shipOrderItem = mappingTree.children[0];
      shipOrderItem.comment = 'Root element comment';
      const ifItem = shipOrderItem.children[1] as IfItem;
      ifItem.comment = 'Conditional mapping comment';
      const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      expect(xslt).toContain('<!-- Root element comment -->');
      expect(xslt).toContain('<!-- Conditional mapping comment -->');
    });

    it('should deserialize mapping with comment', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderWithCommentXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      expect(mappingTree.children.length).toEqual(1);
      const shipOrderItem = mappingTree.children[0];
      expect(shipOrderItem.comment).toEqual('This is a test comment');
    });

    it('should preserve comments through serialize/deserialize cycle', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const shipOrderItem = mappingTree.children[0];
      shipOrderItem.comment = 'Root comment';
      const ifItem = shipOrderItem.children[1] as IfItem;
      ifItem.comment = 'Condition comment';
      const forEachItem = shipOrderItem.children[3] as ForEachItem;
      forEachItem.comment = 'Loop comment';

      // Serialize
      const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);

      // Deserialize
      let mappingTree2 = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree: mappingTree2 } = MappingSerializerService.deserialize(
        xslt,
        targetDoc,
        mappingTree2,
        sourceParameterMap,
      ));

      // Verify comments are preserved
      const shipOrderItem2 = mappingTree2.children[0];
      expect(shipOrderItem2.comment).toEqual('Root comment');
      const ifItem2 = shipOrderItem2.children[1] as IfItem;
      expect(ifItem2.comment).toEqual('Condition comment');
      const forEachItem2 = shipOrderItem2.children[3] as ForEachItem;
      expect(forEachItem2.comment).toEqual('Loop comment');
    });

    it('should deserialize complex XSL with multiple comments at different levels', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderWithMultipleCommentsXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));

      expect(mappingTree.children.length).toEqual(1);
      const shipOrderItem = mappingTree.children[0] as FieldItem;
      expect(shipOrderItem.comment).toEqual('Main ShipOrder mapping');

      // Check OrderId attribute comment
      expect(shipOrderItem.children[0].comment).toEqual('Order ID attribute');

      // Check if item comment
      const ifItem = shipOrderItem.children[1] as IfItem;
      expect(ifItem.comment).toEqual('Conditional mapping for OrderPerson');

      // Check ShipTo comment
      expect(shipOrderItem.children[2].comment).toEqual('Ship To information');

      // Check for-each comment
      const forEachItem = shipOrderItem.children[3] as ForEachItem;
      expect(forEachItem.comment).toEqual('Loop through items');
    });

    it('should handle XSL without comments gracefully', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));

      expect(mappingTree.children.length).toBeGreaterThan(0);
      const shipOrderItem = mappingTree.children[0];
      expect(shipOrderItem.comment).toBeUndefined();
    });

    it('should deserialize a simple variable with select attribute', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getVariableSimpleXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const shipOrderItem = mappingTree.children[0] as FieldItem;
      expect(shipOrderItem.children.length).toEqual(2);
      const variableItem = shipOrderItem.children[0] as VariableItem;
      expect(variableItem).toBeInstanceOf(VariableItem);
      expect(variableItem.name).toEqual('orderRef');
      expect(variableItem.expression).toEqual('/ns0:ShipOrder/@OrderId');
    });

    it('should filter reserved variable names during deserialization', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const { messages } = MappingSerializerService.deserialize(
        getVariableReservedNamesXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      );
      const shipOrderItem = mappingTree.children[0] as FieldItem;
      expect(shipOrderItem.children.length).toEqual(1);
      const variableItem = shipOrderItem.children[0] as VariableItem;
      expect(variableItem).toBeInstanceOf(VariableItem);
      expect(variableItem.name).toEqual('myVar');
      expect(messages).toHaveLength(2);
      expect(messages[0].variant).toEqual('danger');
      expect(messages[0].title).toContain('reserved variable name');
    });

    it('should skip xsl:variable with empty name and emit danger message', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const { messages } = MappingSerializerService.deserialize(
        getVariableEmptyNameXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      );
      const shipOrderItem = mappingTree.children[0] as FieldItem;
      expect(shipOrderItem.children.length).toEqual(1);
      const variableItem = shipOrderItem.children[0] as VariableItem;
      expect(variableItem).toBeInstanceOf(VariableItem);
      expect(variableItem.name).toEqual('myVar');
      expect(messages).toHaveLength(1);
      expect(messages[0].variant).toEqual('danger');
      expect(messages[0].title).toContain('without a name');
    });

    it('should deserialize a variable nested inside for-each', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getVariableNestedInForEachXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const shipOrderItem = mappingTree.children[0] as FieldItem;
      const forEachItem = shipOrderItem.children[0] as ForEachItem;
      const itemFieldItem = forEachItem.children[0] as FieldItem;
      expect(itemFieldItem.children.length).toEqual(2);
      const variableItem = itemFieldItem.children[0] as VariableItem;
      expect(variableItem).toBeInstanceOf(VariableItem);
      expect(variableItem.name).toEqual('itemTitle');
      expect(variableItem.expression).toEqual('Title');
    });

    it('should round-trip a simple variable', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getVariableSimpleXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(serialized, 'text/xml');
      const variableName = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:variable/@name',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(variableName?.nodeValue).toEqual('orderRef');
      const variableSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:variable/@select',
          xsltDocument,
          null,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(variableSelect?.nodeValue).toEqual('/ns0:ShipOrder/@OrderId');
    });

    it('should sort variables before other children during serialization', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getVariableBeforeFieldXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(serialized, 'text/xml');
      const children = xsltDocument.evaluate(
        '/xsl:stylesheet/xsl:template/ShipOrder/*',
        xsltDocument,
        null,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      );
      const first = children.iterateNext() as Element;
      expect(first.nodeName).toEqual('xsl:variable');
      const second = children.iterateNext() as Element;
      expect(second.nodeName).toEqual('xsl:attribute');
    });

    it('should deserialize external XSL file with comments correctly', () => {
      // This simulates importing an XSL file that was manually edited with comments
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderManuallyEditedXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));

      expect(mappingTree.children.length).toEqual(1);
      const shipOrderItem = mappingTree.children[0];
      expect(shipOrderItem.comment).toEqual('Mapping created on 2024-01-15');

      const orderIdAttr = shipOrderItem.children[0];
      expect(orderIdAttr.comment).toEqual('Maps order ID from source');

      const ifItem = shipOrderItem.children[1] as IfItem;
      expect(ifItem.comment).toEqual('TODO: Add validation for OrderPerson');
    });

    it('should serialize stably when two InstructionItems resolve to empty fields', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const shipOrder = new FieldItem(mappingTree, targetDoc.fields[0]);
      const if1 = new IfItem(shipOrder);
      if1.expression = 'true()';
      const if2 = new IfItem(shipOrder);
      if2.expression = 'false()';
      shipOrder.children = [if1, if2];
      mappingTree.children = [shipOrder];
      const xslt1 = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      shipOrder.children = [if2, if1];
      const xslt2 = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      expect(xslt1).toContain('xsl:if');
      expect(xslt2).toContain('xsl:if');
    });
  });

  describe('xsl:sort', () => {
    it('should deserialize xsl:sort children inside xsl:for-each', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getForEachSortToShipOrderXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const forEachItem = mappingTree.children[0].children[0] as ForEachItem;
      expect(forEachItem).toBeInstanceOf(ForEachItem);
      expect(forEachItem.sortItems).toHaveLength(2);
      expect(forEachItem.sortItems[0].expression).toBe('Title');
      expect(forEachItem.sortItems[0].order).toBe('ascending');
      expect(forEachItem.sortItems[1].expression).toBe('Price');
      expect(forEachItem.sortItems[1].order).toBe('descending');
    });

    it('should not create UnknownMappingItem for xsl:sort inside for-each', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getForEachSortToShipOrderXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const forEachItem = mappingTree.children[0].children[0] as ForEachItem;
      const hasUnknown = forEachItem.children.some((c) => c instanceof UnknownMappingItem);
      expect(hasUnknown).toBe(false);
    });

    it('should round-trip xsl:sort in for-each', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getForEachSortToShipOrderXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const dom = domParser.parseFromString(serialized, 'application/xml');
      const sortElements = dom.getElementsByTagNameNS(NS_XSL, 'sort');
      expect(sortElements.length).toBe(2);
      expect(sortElements[0].getAttribute('select')).toBe('Title');
      expect(sortElements[0].hasAttribute('order')).toBe(false);
      expect(sortElements[1].getAttribute('select')).toBe('Price');
      expect(sortElements[1].getAttribute('order')).toBe('descending');
    });

    it('should still preserve xsl:sort inside xsl:apply-templates as UnknownMappingItem', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getUnknownApplyTemplateXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const dom = domParser.parseFromString(serialized, 'application/xml');
      const applyTemplates = dom.getElementsByTagNameNS(NS_XSL, 'apply-templates');
      expect(applyTemplates.length).toBe(1);
      const sortInApply = applyTemplates[0].getElementsByTagNameNS(NS_XSL, 'sort');
      expect(sortInApply.length).toBe(1);
      expect(sortInApply[0].getAttribute('select')).toBe('Title');
    });
  });
});
