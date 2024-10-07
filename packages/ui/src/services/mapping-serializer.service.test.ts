import { EMPTY_XSL, MappingSerializerService, NS_XSL } from './mapping-serializer.service';
import { BODY_DOCUMENT_ID } from '../models/datamapper/document';
import {
  ChooseItem,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingTree,
  OtherwiseItem,
  ValueSelector,
  WhenItem,
} from '../models/datamapper/mapping';
import { DocumentType } from '../models/datamapper/path';
import { Types } from '../models/datamapper/types';

import { shipOrderToShipOrderXslt, TestUtil } from '../stubs/data-mapper';

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
    expect(template.length).toEqual(1);
    expect(template[0].namespaceURI).toBe(NS_XSL);
    expect(template[0].localName).toBe('template');
  });

  describe('deserialize()', () => {
    it('should return an empty MappingTree', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
      mappingTree = MappingSerializerService.deserialize(EMPTY_XSL, targetDoc, mappingTree, sourceParameterMap);
      expect(mappingTree.children.length).toEqual(0);
      mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
      mappingTree = MappingSerializerService.deserialize('', targetDoc, mappingTree, sourceParameterMap);
      expect(mappingTree.children.length).toEqual(0);
    });

    it('should deserialize XSLT', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
      expect(Object.keys(mappingTree.namespaceMap).length).toEqual(0);
      mappingTree = MappingSerializerService.deserialize(
        shipOrderToShipOrderXslt,
        targetDoc,
        mappingTree,
        sourceParameterMap,
      );
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
      expect(itemFieldItem.field.maxOccurs).toBeGreaterThan(1);
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
  });

  describe('serialize()', () => {
    it('should return an empty XSLT document with empty mappings', () => {
      const empty = MappingSerializerService.serialize(
        new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID),
        sourceParameterMap,
      );
      expect(empty).toContain('This file is generated by Kaoto DataMapper. Do not edit');
      const dom = domParser.parseFromString(empty, 'application/xml');
      const template = dom
        .evaluate('/xsl:stylesheet/xsl:template', dom, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE)
        .iterateNext();
      expect(template).toBeTruthy();
      expect(template!.childNodes.length).toEqual(1);
      expect(template!.childNodes[0].nodeType).toEqual(Node.TEXT_NODE);
    });

    it('should serialize mappings', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
      mappingTree = MappingSerializerService.deserialize(
        shipOrderToShipOrderXslt,
        targetDoc,
        mappingTree,
        sourceParameterMap,
      );
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
  });
});
