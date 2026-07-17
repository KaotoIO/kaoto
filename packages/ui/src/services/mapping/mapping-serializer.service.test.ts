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
  getFieldSubstitutionToFieldSubstitutionXslt,
  getFieldSubstitutionXsd,
  getForEachSortToShipOrderXslt,
  getInvoice850Xsd,
  getRawTextNodeXslt,
  getSchemaTestToSchemaTestXslt,
  getSchemaTestXsd,
  getShipOrderEmptyMappingXslt,
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

  const xslNsResolver: XPathNSResolver = {
    lookupNamespaceURI(prefix: string | null): string | null {
      if (prefix === 'xsl') return NS_XSL;
      return null;
    },
  };

  it('createNew() should create am empty XSLT document', () => {
    const xslt = MappingSerializerService.createNew();
    const stylesheet = xslt.getElementsByTagNameNS(NS_XSL, 'stylesheet');
    expect(stylesheet).toHaveLength(1);
    expect(stylesheet[0].namespaceURI).toBe(NS_XSL);
    expect(stylesheet[0].localName).toBe('stylesheet');
    const template = xslt.getElementsByTagNameNS(NS_XSL, 'template');
    expect(template).toHaveLength(0);
  });

  describe('deserialize()', () => {
    it('should return an empty MappingTree', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(EMPTY_XSL, targetDoc, mappingTree, sourceParameterMap));
      expect(mappingTree.children).toHaveLength(0);
      mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize('', targetDoc, mappingTree, sourceParameterMap));
      expect(mappingTree.children).toHaveLength(0);
    });

    it('should deserialize XSLT', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      expect(Object.keys(mappingTree.namespaceMap)).toHaveLength(0);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      expect(Object.keys(mappingTree.namespaceMap)).toHaveLength(1);
      expect(mappingTree.namespaceMap['ns0']).toBe('io.kaoto.datamapper.poc.test');
      expect(mappingTree.children).toHaveLength(1);
      const shipOrderFieldItem = mappingTree.children[0] as FieldItem;
      expect(shipOrderFieldItem.field.name).toBe('ShipOrder');
      expect(shipOrderFieldItem.field.type).toEqual(Types.Container);
      expect(shipOrderFieldItem.field.isAttribute).toBeFalsy();
      expect(shipOrderFieldItem.field.namespaceURI).toBe('io.kaoto.datamapper.poc.test');
      expect(shipOrderFieldItem.field.maxOccurs).toBe(1);
      expect(shipOrderFieldItem.children).toHaveLength(4);

      const orderIdFieldItem = shipOrderFieldItem.children[0] as FieldItem;
      expect(orderIdFieldItem.field.name).toBe('OrderId');
      expect(orderIdFieldItem.field.type).not.toEqual(Types.Container);
      expect(orderIdFieldItem.field.isAttribute).toBeTruthy();
      expect(orderIdFieldItem.field.namespaceURI).toBe('');
      expect(orderIdFieldItem.field.maxOccurs).toBe(1);
      expect(orderIdFieldItem.children).toHaveLength(1);
      let selector = orderIdFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toBe('/ns0:ShipOrder/@OrderId');

      const ifItem = shipOrderFieldItem.children[1] as IfItem;
      expect(ifItem.expression).toBe("/ns0:ShipOrder/ns0:OrderPerson != ''");
      expect(ifItem.children).toHaveLength(1);
      const orderPersonFieldItem = ifItem.children[0] as FieldItem;
      expect(orderPersonFieldItem.field.name).toBe('OrderPerson');
      expect(shipOrderFieldItem.field.type).toEqual(Types.Container);
      expect(orderPersonFieldItem.field.isAttribute).toBeFalsy();
      expect(orderPersonFieldItem.field.namespaceURI).toBe('io.kaoto.datamapper.poc.test');
      expect(orderPersonFieldItem.field.maxOccurs).toBe(1);
      expect(orderPersonFieldItem.children).toHaveLength(1);
      selector = orderPersonFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toBe('/ns0:ShipOrder/ns0:OrderPerson');

      const shipToFieldItem = shipOrderFieldItem.children[2] as FieldItem;
      expect(shipToFieldItem.field.name).toBe('ShipTo');
      expect(shipToFieldItem.field.isAttribute).toBeFalsy();
      expect(shipToFieldItem.field.type).toEqual(Types.Container);
      expect(shipToFieldItem.field.namespaceURI).toBe('');
      expect(shipToFieldItem.field.maxOccurs).toBe(1);
      expect(shipToFieldItem.children).toHaveLength(1);
      selector = shipToFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toBe('/ns0:ShipOrder/ShipTo');

      const forEachItem = shipOrderFieldItem.children[3] as ForEachItem;
      expect(forEachItem.expression).toBe('/ns0:ShipOrder/Item');
      expect(forEachItem.children).toHaveLength(1);
      const itemFieldItem = forEachItem.children[0] as FieldItem;
      expect(itemFieldItem.field.name).toBe('Item');
      expect(itemFieldItem.field.type).toEqual(Types.Container);
      expect(itemFieldItem.field.isAttribute).toBeFalsy();
      expect(itemFieldItem.field.namespaceURI).toBe('');
      expect(itemFieldItem.field.maxOccurs).toBe('unbounded');
      expect(itemFieldItem.children).toHaveLength(4);

      const titleFieldItem = itemFieldItem.children[0] as FieldItem;
      expect(titleFieldItem.field.name).toBe('Title');
      expect(titleFieldItem.field.isAttribute).toBeFalsy();
      expect(titleFieldItem.field.type).not.toEqual(Types.Container);
      expect(titleFieldItem.field.namespaceURI).toBe('');
      expect(titleFieldItem.field.maxOccurs).toBe(1);
      expect(titleFieldItem.children).toHaveLength(1);
      selector = titleFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toBe('Title');

      const chooseItem = itemFieldItem.children[1] as ChooseItem;
      expect(chooseItem.children).toHaveLength(2);

      const whenItem = chooseItem.children[0] as WhenItem;
      expect(whenItem.expression).toBe("Note != ''");
      expect(whenItem.children).toHaveLength(1);
      let noteFieldItem = whenItem.children[0] as FieldItem;
      expect(noteFieldItem.field.name).toBe('Note');
      expect(noteFieldItem.field.type).not.toEqual(Types.Container);
      expect(noteFieldItem.field.isAttribute).toBeFalsy();
      expect(noteFieldItem.field.namespaceURI).toBe('');
      expect(noteFieldItem.field.maxOccurs).toBe(1);
      expect(noteFieldItem.children).toHaveLength(1);
      selector = noteFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toBe('Note');

      const otherwiseItem = chooseItem.children[1] as OtherwiseItem;
      expect(otherwiseItem.children).toHaveLength(1);
      noteFieldItem = otherwiseItem.children[0] as FieldItem;
      expect(noteFieldItem.field.name).toBe('Note');
      expect(noteFieldItem.field.type).not.toEqual(Types.Container);
      expect(noteFieldItem.field.isAttribute).toBeFalsy();
      expect(noteFieldItem.field.namespaceURI).toBe('');
      expect(noteFieldItem.field.maxOccurs).toBe(1);
      expect(noteFieldItem.children).toHaveLength(1);
      selector = noteFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toBe('Title');

      const quantityFieldItem = itemFieldItem.children[2] as FieldItem;
      expect(quantityFieldItem.field.name).toBe('Quantity');
      expect(quantityFieldItem.field.type).not.toEqual(Types.Container);
      expect(quantityFieldItem.field.isAttribute).toBeFalsy();
      expect(quantityFieldItem.field.namespaceURI).toBe('');
      expect(quantityFieldItem.field.maxOccurs).toBe(1);
      expect(quantityFieldItem.children).toHaveLength(1);
      selector = quantityFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toBe('Quantity');

      const priceFieldItem = itemFieldItem.children[3] as FieldItem;
      expect(priceFieldItem.field.name).toBe('Price');
      expect(priceFieldItem.field.type).not.toEqual(Types.Container);
      expect(priceFieldItem.field.isAttribute).toBeFalsy();
      expect(priceFieldItem.field.namespaceURI).toBe('');
      expect(priceFieldItem.field.maxOccurs).toBe(1);
      expect(priceFieldItem.children).toHaveLength(1);
      selector = priceFieldItem.children[0] as ValueSelector;
      expect(selector.expression).toBe('Price');
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
      expect(result.children).toHaveLength(1);
      const selector = result.children[0] as ValueSelector;
      expect(selector.expression).toBe('TEST');
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
      expect(result.children).toHaveLength(1);
      const selector = result.children[0] as ValueSelector;
      expect(selector.expression).toBe('TEST');
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
      expect(result.children).toHaveLength(0);
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
      expect(forEachItem.expression).toBe('');
      const itemSelector = forEachItem.children[0].children[0] as ValueSelector;
      expect(itemSelector.expression).toBe('/ns0:ShipOrder/Item');
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
      expect(itemsFieldItem.children).toHaveLength(1);
      const forEachItem = itemsFieldItem.children[0] as ForEachItem;
      expect(forEachItem.expression).toBe('/X12_850/PO1Loop');

      expect(itemsFieldItem.field.namedTypeFragmentRefs).toHaveLength(0);
      expect(itemsFieldItem.field.fields).toHaveLength(1);
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
      expect(mappingTree.children[0].children).toHaveLength(2);
      const forEach1 = mappingTree.children[0].children[0] as ForEachItem;
      expect(forEach1.expression).toBe('/ns0:ShipOrder/Item');
      expect(forEach1.children).toHaveLength(1);
      const item1 = forEach1.children[0] as FieldItem;
      expect(item1.field.name).toBe('Item');
      const forEach2 = mappingTree.children[0].children[1] as ForEachItem;
      expect(forEach2.expression).toBe('$sourceParam1/ns0:ShipOrder/Item');
      expect(forEach2.children).toHaveLength(1);
      const item2 = forEach1.children[0] as FieldItem;
      expect(item2.field.name).toBe('Item');
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
      expect(cloned.element.children).toHaveLength(unknownItem.element.children.length);
    });

    it('should capture unrecognized XSL elements as UnknownMappingItem', () => {
      const xslt = getUnknownApplyTemplateXslt();
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(xslt, targetDoc, mappingTree, sourceParameterMap));
      expect(mappingTree.children).toHaveLength(1);
      const shipOrderItem = mappingTree.children[0] as FieldItem;
      expect(shipOrderItem.field.name).toBe('ShipOrder');
      expect(shipOrderItem.children).toHaveLength(1);
      const unknownItem = shipOrderItem.children[0] as UnknownMappingItem;
      expect(unknownItem).toBeInstanceOf(UnknownMappingItem);
      expect(unknownItem.name).toBe('unknown');
      expect(unknownItem.element.localName).toBe('apply-templates');
      expect(unknownItem.element.getAttribute('select')).toBe('/ns0:ShipOrder/Item');
      expect(unknownItem.children).toHaveLength(0);
    });

    it('should deserialize multiple indexed collection mappings on a same target collection', () => {
      const mockCrypto = { getRandomValues: () => [Math.random() * 10000] };
      vi.spyOn(globalThis, 'crypto', 'get').mockImplementation(() => mockCrypto as unknown as Crypto);
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderCollectionIndexXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      expect(mappingTree.children[0].children).toHaveLength(2);
      const item1 = mappingTree.children[0].children[0] as FieldItem;
      expect(item1.children).toHaveLength(4);
      const item2 = mappingTree.children[0].children[1] as FieldItem;
      expect(item2.children).toHaveLength(4);
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
        .evaluate('/xsl:stylesheet/xsl:template', dom, xslNsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE)
        .iterateNext();
      expect(template).toBeTruthy();
      expect(template!.childNodes).toHaveLength(0);
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
      expect(xsltDocument.documentElement.getAttribute('xmlns:ns0')).toBe('io.kaoto.datamapper.poc.test');
      const orderIdSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:attribute[@name="OrderId"]/xsl:value-of/@select',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(orderIdSelect?.nodeValue).toBe('/ns0:ShipOrder/@OrderId');
      const ifTest = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:if/@test',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(ifTest?.nodeValue).toBe("/ns0:ShipOrder/ns0:OrderPerson != ''");
      const orderPersonSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:if/OrderPerson/xsl:value-of/@select',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(orderPersonSelect?.nodeValue).toBe('/ns0:ShipOrder/ns0:OrderPerson');
      const shipToSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/ShipTo/xsl:copy-of/@select',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(shipToSelect?.nodeValue).toBe('/ns0:ShipOrder/ShipTo');
      const forEachSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:for-each/@select',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(forEachSelect?.nodeValue).toBe('/ns0:ShipOrder/Item');
      const titleSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:for-each/Item/Title/xsl:value-of/@select',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(titleSelect?.nodeValue).toBe('Title');
      const chooseWhenTest = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:for-each/Item/xsl:choose/xsl:when/@test',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(chooseWhenTest?.nodeValue).toBe("Note != ''");
      const chooseWhenSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:for-each/Item/xsl:choose/xsl:when/Note/xsl:value-of/@select',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(chooseWhenSelect?.nodeValue).toBe('Note');
      const chooseOtherwiseSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:for-each/Item/xsl:choose/xsl:otherwise/Note/xsl:value-of/@select',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(chooseOtherwiseSelect?.nodeValue).toBe('Title');
    });

    it('should serialize otherwise as the last child in choose with multiple when elements', () => {
      // Create a mapping tree with a choose containing multiple when and otherwise
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const shipOrderField = targetDoc.fields.find((f) => f.name === 'ShipOrder')!;
      const shipOrderItem = new FieldItem(mappingTree, shipOrderField);
      mappingTree.children.push(shipOrderItem);

      // Create a choose with multiple when branches and an otherwise
      const chooseItem = new ChooseItem(shipOrderItem);
      shipOrderItem.children.push(chooseItem);

      // Add first when
      const when1 = new WhenItem(chooseItem);
      when1.expression = "condition1 = 'true'";
      chooseItem.children.push(when1);

      // Add second when
      const when2 = new WhenItem(chooseItem);
      when2.expression = "condition2 = 'true'";
      chooseItem.children.push(when2);

      // Add otherwise (intentionally added before third when to test sorting)
      const otherwise = new OtherwiseItem(chooseItem);
      chooseItem.children.push(otherwise);

      // Add third when
      const when3 = new WhenItem(chooseItem);
      when3.expression = "condition3 = 'true'";
      chooseItem.children.push(when3);

      // Serialize
      const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(xslt, 'text/xml');

      // Verify that all when elements come before otherwise
      const chooseChildren = xsltDocument.evaluate(
        '/xsl:stylesheet/xsl:template/ShipOrder/xsl:choose/*',
        xsltDocument,
        xslNsResolver,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      );

      const childNames: string[] = [];
      let child = chooseChildren.iterateNext();
      while (child) {
        childNames.push((child as Element).localName);
        child = chooseChildren.iterateNext();
      }

      // Verify order: all when elements should come before otherwise
      expect(childNames).toEqual(['when', 'when', 'when', 'otherwise']);
    });

    it('should fix otherwise order when importing malformed XSL with otherwise in the middle', () => {
      // Create malformed XSL with otherwise in the middle of when elements
      const malformedXslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ShipOrder>
      <xsl:choose>
        <xsl:when test="condition1 = 'true'">
          <Note>First condition</Note>
        </xsl:when>
        <xsl:otherwise>
          <Note>Default</Note>
        </xsl:otherwise>
        <xsl:when test="condition2 = 'true'">
          <Note>Second condition</Note>
        </xsl:when>
      </xsl:choose>
    </ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;

      // Deserialize the malformed XSL
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        malformedXslt,
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));

      // Serialize it back
      const fixedXslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(fixedXslt, 'text/xml');

      // Verify that otherwise is now at the end
      const chooseChildren = xsltDocument.evaluate(
        '/xsl:stylesheet/xsl:template/ShipOrder/xsl:choose/*',
        xsltDocument,
        xslNsResolver,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      );

      const childNames: string[] = [];
      let child = chooseChildren.iterateNext();
      while (child) {
        childNames.push((child as Element).localName);
        child = chooseChildren.iterateNext();
      }

      // Verify order is fixed: all when elements should come before otherwise
      expect(childNames).toEqual(['when', 'when', 'otherwise']);
    });

    it('should set exclude-result-prefixes to prevent namespace leakage into the output', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const stylesheet = domParser.parseFromString(xslt, 'text/xml').documentElement;
      // `ns0` is declared only for matching the source document via XPath, so it
      // must be excluded from the result to avoid leaking a redundant declaration.
      expect(stylesheet.getAttribute('xmlns:ns0')).toBe('io.kaoto.datamapper.poc.test');
      expect(stylesheet.getAttribute('exclude-result-prefixes')?.split(' ')).toContain('ns0');
    });

    it('should not set exclude-result-prefixes when there are no namespaces', () => {
      const empty = MappingSerializerService.serialize(
        new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA),
        sourceParameterMap,
      );
      const stylesheet = domParser.parseFromString(empty, 'application/xml').documentElement;
      expect(stylesheet.hasAttribute('exclude-result-prefixes')).toBe(false);
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
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(applyTemplates?.nodeValue).toBe('/ns0:ShipOrder/Item');
      const sort = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:apply-templates/xsl:sort/@select',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(sort?.nodeValue).toBe('Title');
      const withParam = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:apply-templates/xsl:with-param/@name',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(withParam?.nodeValue).toBe('prefix');
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
        xslNsResolver,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      );
      const first = children.iterateNext() as Element;
      expect(first.nodeName).toBe('xsl:attribute');
      const second = children.iterateNext() as Element;
      expect(second.nodeName).toBe('xsl:apply-templates');
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
        xslNsResolver,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      );
      const first = children.iterateNext() as Element;
      expect(first.nodeName).toBe('xsl:apply-templates');
      const second = children.iterateNext() as Element;
      expect(second.nodeName).toBe('xsl:attribute');
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
        xslNsResolver,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      );
      const xslAttribute = shipOrderSelect.iterateNext() as Element;
      expect(xslAttribute.nodeName).toBe('xsl:attribute');
      const xslIf = shipOrderSelect.iterateNext() as Element;
      expect(xslIf.nodeName).toBe('xsl:if');
      expect(xslIf.getAttribute('test')).toBe("/ns0:ShipOrder/ns0:OrderPerson != ''");
      const shipTo = shipOrderSelect.iterateNext() as Element;
      expect(shipTo.nodeName).toBe('ShipTo');
      const xslForEach = shipOrderSelect.iterateNext() as Element;
      expect(xslForEach.nodeName).toBe('xsl:for-each');
      expect(xslForEach.getAttribute('select')).toBe('/ns0:ShipOrder/Item');
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
      expect((commentNode as Comment).data.trim()).toBe('This is a test comment');
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
      expect(mappingTree.children).toHaveLength(1);
      const shipOrderItem = mappingTree.children[0];
      expect(shipOrderItem.comment).toBe('This is a test comment');
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
      expect(shipOrderItem2.comment).toBe('Root comment');
      const ifItem2 = shipOrderItem2.children[1] as IfItem;
      expect(ifItem2.comment).toBe('Condition comment');
      const forEachItem2 = shipOrderItem2.children[3] as ForEachItem;
      expect(forEachItem2.comment).toBe('Loop comment');
    });

    it('should deserialize complex XSL with multiple comments at different levels', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderWithMultipleCommentsXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));

      expect(mappingTree.children).toHaveLength(1);
      const shipOrderItem = mappingTree.children[0] as FieldItem;
      expect(shipOrderItem.comment).toBe('Main ShipOrder mapping');

      // Check OrderId attribute comment
      expect(shipOrderItem.children[0].comment).toBe('Order ID attribute');

      // Check if item comment
      const ifItem = shipOrderItem.children[1] as IfItem;
      expect(ifItem.comment).toBe('Conditional mapping for OrderPerson');

      // Check ShipTo comment
      expect(shipOrderItem.children[2].comment).toBe('Ship To information');

      // Check for-each comment
      const forEachItem = shipOrderItem.children[3] as ForEachItem;
      expect(forEachItem.comment).toBe('Loop through items');
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
      expect(shipOrderItem.children).toHaveLength(2);
      const variableItem = shipOrderItem.children[0] as VariableItem;
      expect(variableItem).toBeInstanceOf(VariableItem);
      expect(variableItem.name).toBe('orderRef');
      expect(variableItem.expression).toBe('/ns0:ShipOrder/@OrderId');
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
      expect(shipOrderItem.children).toHaveLength(1);
      const variableItem = shipOrderItem.children[0] as VariableItem;
      expect(variableItem).toBeInstanceOf(VariableItem);
      expect(variableItem.name).toBe('myVar');
      expect(messages).toHaveLength(2);
      expect(messages[0].variant).toBe('danger');
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
      expect(shipOrderItem.children).toHaveLength(1);
      const variableItem = shipOrderItem.children[0] as VariableItem;
      expect(variableItem).toBeInstanceOf(VariableItem);
      expect(variableItem.name).toBe('myVar');
      expect(messages).toHaveLength(1);
      expect(messages[0].variant).toBe('danger');
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
      expect(itemFieldItem.children).toHaveLength(2);
      const variableItem = itemFieldItem.children[0] as VariableItem;
      expect(variableItem).toBeInstanceOf(VariableItem);
      expect(variableItem.name).toBe('itemTitle');
      expect(variableItem.expression).toBe('Title');
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
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(variableName?.nodeValue).toBe('orderRef');
      const variableSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:variable/@select',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(variableSelect?.nodeValue).toBe('/ns0:ShipOrder/@OrderId');
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
        xslNsResolver,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      );
      const first = children.iterateNext() as Element;
      expect(first.nodeName).toBe('xsl:variable');
      const second = children.iterateNext() as Element;
      expect(second.nodeName).toBe('xsl:attribute');
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

      expect(mappingTree.children).toHaveLength(1);
      const shipOrderItem = mappingTree.children[0];
      expect(shipOrderItem.comment).toBe('Mapping created on 2024-01-15');

      const orderIdAttr = shipOrderItem.children[0];
      expect(orderIdAttr.comment).toBe('Maps order ID from source');

      const ifItem = shipOrderItem.children[1] as IfItem;
      expect(ifItem.comment).toBe('TODO: Add validation for OrderPerson');
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

    it('should preserve attribute order across multiple serialize/deserialize cycles', () => {
      // XSLT with attributes in a non-schema order: attrC, attrA, attrB
      const xsltWithAttrsOutOfSchemaOrder = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <Root>
      <xsl:attribute name="attrC"><xsl:value-of select="attrC"/></xsl:attribute>
      <xsl:attribute name="attrA"><xsl:value-of select="attrA"/></xsl:attribute>
      <xsl:attribute name="attrB"><xsl:value-of select="attrB"/></xsl:attribute>
    </Root>
  </xsl:template>
</xsl:stylesheet>`;

      const xsdWithMultipleAttrs = `<?xml version="1.0" encoding="UTF-8" ?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Root">
    <xs:complexType>
      <xs:attribute name="attrA" type="xs:string"/>
      <xs:attribute name="attrB" type="xs:string"/>
      <xs:attribute name="attrC" type="xs:string"/>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

      const createMultiAttrDoc = () => {
        const definition = new DocumentDefinition(
          DocumentType.TARGET_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          BODY_DOCUMENT_ID,
          { 'multi-attr.xsd': xsdWithMultipleAttrs },
        );
        return XmlSchemaDocumentService.createXmlSchemaDocument(definition).document!;
      };

      const cycle = (xslt: string) => {
        const doc = createMultiAttrDoc();
        const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
        const { mappingTree } = MappingSerializerService.deserialize(xslt, doc, tree, new Map());
        return MappingSerializerService.serialize(mappingTree, new Map());
      };

      const extractAttrOrder = (xslt: string) =>
        [...xslt.matchAll(/xsl:attribute name="(\w+)"/g)].map((m) => m[1]).join(',');

      const round1 = cycle(xsltWithAttrsOutOfSchemaOrder);
      const round2 = cycle(round1);

      // The attribute order from the XSLT must be preserved (no reordering by schema position)
      expect(extractAttrOrder(round1)).toBe('attrC,attrA,attrB');
      // And must be stable — a second cycle must not reorder them
      expect(extractAttrOrder(round2)).toBe('attrC,attrA,attrB');
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
      expect(sortElements).toHaveLength(2);
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
      expect(applyTemplates).toHaveLength(1);
      const sortInApply = applyTemplates[0].getElementsByTagNameNS(NS_XSL, 'sort');
      expect(sortInApply).toHaveLength(1);
      expect(sortInApply[0].getAttribute('select')).toBe('Title');
    });

    it('should produce error message when xsl:sort appears under xsl:if', () => {
      const xsltWithSortUnderIf = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
  <xsl:template match="/">
    <ShipOrder>
      <xsl:if test="ShipOrder/OrderPerson">
        <xsl:sort select="Title"/>
        <OrderPerson><xsl:value-of select="ShipOrder/OrderPerson"/></OrderPerson>
      </xsl:if>
    </ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const result = MappingSerializerService.deserialize(
        xsltWithSortUnderIf,
        targetDoc,
        mappingTree,
        sourceParameterMap,
      );
      mappingTree = result.mappingTree;
      expect(
        result.messages.some((m) => m.variant === 'danger' && String(m.title).includes('xsl:sort is not allowed')),
      ).toBe(true);
      const ifItem = mappingTree.children[0].children[0] as IfItem;
      expect(ifItem).toBeInstanceOf(IfItem);
    });
  });

  describe('isUserCreated reconstruction during deserialization', () => {
    const SUB_NS = 'http://www.example.com/SUBSTITUTION';
    const TEST_NS = 'http://www.example.com/test';

    it('should set isUserCreated=true for fields inside an abstract wrapper with a selected substitute', () => {
      const definition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
        undefined,
        undefined,
        undefined,
        [{ schemaPath: '/sub:Zoo/{abstract:0}', name: 'sub:Dog', originalName: 'sub:AbstractAnimal' }],
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition, {
        sub: SUB_NS,
      });
      const zooDoc = result.document!;

      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const { mappingTree: deserialized } = MappingSerializerService.deserialize(
        getFieldSubstitutionToFieldSubstitutionXslt(),
        zooDoc,
        mappingTree,
        new Map(),
      );

      const zooFieldItem = deserialized.children[0] as FieldItem;
      expect(zooFieldItem).toBeInstanceOf(FieldItem);
      expect(zooFieldItem.field.name).toBe('Zoo');
      expect(zooFieldItem.isUserCreated).toBe(false);

      const dogFieldItem = zooFieldItem.children[0] as FieldItem;
      expect(dogFieldItem).toBeInstanceOf(FieldItem);
      expect(dogFieldItem.field.name).toBe('Dog');
      expect(dogFieldItem.isUserCreated).toBe(true);

      const nameFieldItem = dogFieldItem.children[0] as FieldItem;
      expect(nameFieldItem).toBeInstanceOf(FieldItem);
      expect(nameFieldItem.field.name).toBe('name');
      expect(nameFieldItem.isUserCreated).toBe(false);

      const breedFieldItem = dogFieldItem.children[1] as FieldItem;
      expect(breedFieldItem).toBeInstanceOf(FieldItem);
      expect(breedFieldItem.field.name).toBe('breed');
      expect(breedFieldItem.isUserCreated).toBe(false);
    });

    it('should set isUserCreated=true for fields inside a choice wrapper with a selected member', () => {
      const definition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'SchemaTest.xsd': getSchemaTestXsd() },
        undefined,
        undefined,
        [{ schemaPath: '/test:Root/test:person/{choice:0}', selectedMemberIndex: 1 }],
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition, {
        test: TEST_NS,
      });
      const testDoc = result.document!;

      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const { mappingTree: deserialized } = MappingSerializerService.deserialize(
        getSchemaTestToSchemaTestXslt(),
        testDoc,
        mappingTree,
        new Map(),
      );

      const rootFieldItem = deserialized.children[0] as FieldItem;
      expect(rootFieldItem).toBeInstanceOf(FieldItem);
      expect(rootFieldItem.field.name).toBe('Root');
      expect(rootFieldItem.isUserCreated).toBe(false);

      const personFieldItem = rootFieldItem.children[0] as FieldItem;
      expect(personFieldItem).toBeInstanceOf(FieldItem);
      expect(personFieldItem.field.name).toBe('person');
      expect(personFieldItem.isUserCreated).toBe(false);

      const faxFieldItem = personFieldItem.children[0] as FieldItem;
      expect(faxFieldItem).toBeInstanceOf(FieldItem);
      expect(faxFieldItem.field.name).toBe('fax');
      expect(faxFieldItem.isUserCreated).toBe(true);
    });

    it('should set isUserCreated=true for empty terminal elements and attributes', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderEmptyMappingXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const shipOrderFieldItem = mappingTree.children[0] as FieldItem;
      expect(shipOrderFieldItem).toBeInstanceOf(FieldItem);
      expect(shipOrderFieldItem.isUserCreated).toBe(false);

      const orderIdFieldItem = shipOrderFieldItem.children[0] as FieldItem;
      expect(orderIdFieldItem).toBeInstanceOf(FieldItem);
      expect(orderIdFieldItem.field.name).toBe('OrderId');
      expect(orderIdFieldItem.field.isAttribute).toBe(true);
      expect(orderIdFieldItem.isUserCreated).toBe(true);

      const orderPersonFieldItem = shipOrderFieldItem.children[1] as FieldItem;
      expect(orderPersonFieldItem).toBeInstanceOf(FieldItem);
      expect(orderPersonFieldItem.field.name).toBe('OrderPerson');
      expect(orderPersonFieldItem.isUserCreated).toBe(false);

      const itemFieldItem = shipOrderFieldItem.children[2] as FieldItem;
      expect(itemFieldItem).toBeInstanceOf(FieldItem);
      expect(itemFieldItem.field.name).toBe('Item');
      expect(itemFieldItem.isUserCreated).toBe(true);
    });

    it('should keep isUserCreated=false for transitive fields without overrides', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderToShipOrderXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const shipOrderFieldItem = mappingTree.children[0] as FieldItem;
      expect(shipOrderFieldItem).toBeInstanceOf(FieldItem);
      expect(shipOrderFieldItem.isUserCreated).toBe(false);

      const orderIdFieldItem = shipOrderFieldItem.children[0] as FieldItem;
      expect(orderIdFieldItem).toBeInstanceOf(FieldItem);
      expect(orderIdFieldItem.isUserCreated).toBe(false);
    });

    it('should serialize empty user-created FieldItem as empty element', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const shipOrderField = targetDoc.fields.find((f) => f.name === 'ShipOrder')!;
      const shipOrderItem = new FieldItem(mappingTree, shipOrderField);
      mappingTree.children.push(shipOrderItem);

      const orderPersonField = shipOrderField.fields.find((f) => f.name === 'OrderPerson')!;
      const orderPersonItem = new FieldItem(shipOrderItem, orderPersonField);
      orderPersonItem.isUserCreated = true;
      shipOrderItem.children.push(orderPersonItem);

      const itemField = shipOrderField.fields.find((f) => f.name === 'Item')!;
      const itemItem = new FieldItem(shipOrderItem, itemField);
      itemItem.isUserCreated = true;
      shipOrderItem.children.push(itemItem);

      const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(xslt, 'text/xml');

      const orderPersonNode = xsltDocument.evaluate(
        '/xsl:stylesheet/xsl:template/ShipOrder/OrderPerson',
        xsltDocument,
        xslNsResolver,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
      ).singleNodeValue as Element;
      expect(orderPersonNode).toBeTruthy();
      expect(orderPersonNode.childNodes).toHaveLength(0);

      const itemNode = xsltDocument.evaluate(
        '/xsl:stylesheet/xsl:template/ShipOrder/Item',
        xsltDocument,
        xslNsResolver,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
      ).singleNodeValue as Element;
      expect(itemNode).toBeTruthy();
      expect(itemNode.childNodes).toHaveLength(0);
    });

    it('should serialize empty user-created attribute FieldItem as empty xsl:attribute', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const shipOrderField = targetDoc.fields.find((f) => f.name === 'ShipOrder')!;
      const shipOrderItem = new FieldItem(mappingTree, shipOrderField);
      mappingTree.children.push(shipOrderItem);

      const orderIdField = shipOrderField.fields.find((f) => f.name === 'OrderId')!;
      const orderIdItem = new FieldItem(shipOrderItem, orderIdField);
      orderIdItem.isUserCreated = true;
      shipOrderItem.children.push(orderIdItem);

      const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(xslt, 'text/xml');

      const attrNode = xsltDocument.evaluate(
        '/xsl:stylesheet/xsl:template/ShipOrder/xsl:attribute[@name="OrderId"]',
        xsltDocument,
        xslNsResolver,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
      ).singleNodeValue as Element;
      expect(attrNode).toBeTruthy();
      expect(attrNode.childNodes).toHaveLength(0);
    });

    it('should round-trip empty user-created fields through serialize then deserialize', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const shipOrderField = targetDoc.fields.find((f) => f.name === 'ShipOrder')!;
      const shipOrderItem = new FieldItem(mappingTree, shipOrderField);
      mappingTree.children.push(shipOrderItem);

      const itemField = shipOrderField.fields.find((f) => f.name === 'Item')!;
      const itemItem = new FieldItem(shipOrderItem, itemField);
      itemItem.isUserCreated = true;
      shipOrderItem.children.push(itemItem);

      const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);

      const roundTripTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const { mappingTree: deserialized } = MappingSerializerService.deserialize(
        xslt,
        targetDoc,
        roundTripTree,
        sourceParameterMap,
      );

      const shipOrderFieldItem = deserialized.children[0] as FieldItem;
      expect(shipOrderFieldItem).toBeInstanceOf(FieldItem);
      const restoredItem = shipOrderFieldItem.children.find(
        (c) => c instanceof FieldItem && c.field.name === 'Item',
      ) as FieldItem;
      expect(restoredItem).toBeInstanceOf(FieldItem);
      expect(restoredItem.isUserCreated).toBe(true);
      expect(restoredItem.children).toHaveLength(0);
    });

    it('should copy isUserCreated via doClone()', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const field = targetDoc.fields[0];
      const fieldItem = new FieldItem(mappingTree, field);
      fieldItem.isUserCreated = true;

      const cloned = fieldItem.clone() as FieldItem;
      expect(cloned.isUserCreated).toBe(true);

      const fieldItem2 = new FieldItem(mappingTree, field);
      expect(fieldItem2.isUserCreated).toBe(false);
      const cloned2 = fieldItem2.clone() as FieldItem;
      expect(cloned2.isUserCreated).toBe(false);
    });
  });
});
