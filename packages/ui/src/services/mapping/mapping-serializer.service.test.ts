import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import {
  ChooseItem,
  CopyOfSelector,
  CopyOfType,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingTree,
  OtherwiseItem,
  UnknownMappingItem,
  ValueOfSelector,
  ValueSelector,
  VariableItem,
  WhenItem,
} from '../../models/datamapper/mapping';
import { DEFAULT_DATAMAPPER_SETTINGS } from '../../models/datamapper/settings';
import {
  NS_XML_SCHEMA,
  NS_XPATH_FUNCTIONS,
  NS_XSL,
  STANDARD_NAMESPACE_MAP,
} from '../../models/datamapper/standard-namespaces';
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
  getShipOrderJsonXslt,
  getShipOrderManuallyEditedXslt,
  getShipOrderToShipOrderCollectionIndexXslt,
  getShipOrderToShipOrderInvalidForEachXslt,
  getShipOrderToShipOrderMultipleForEachXslt,
  getShipOrderToShipOrderXslt,
  getShipOrderWithCommentXslt,
  getShipOrderWithMultipleCommentsXslt,
  getShipOrderXsdPrefixXslt,
  getUnknownApplyTemplateAfterFieldXslt,
  getUnknownApplyTemplateBeforeFieldXslt,
  getUnknownApplyTemplateXslt,
  getVariableBeforeFieldXslt,
  getVariableEmptyNameXslt,
  getVariableNestedInForEachXslt,
  getVariableReservedNamesXslt,
  getVariableSimpleXslt,
  getVariableStylesheetReservedNamesXslt,
  getVariableStylesheetTextContentXslt,
  getVariableStylesheetXslt,
  getVariableTemplateXslt,
  getWhitespaceTextNodeXslt,
  getX12850ForEachXslt,
  getXslTextNodeXslt,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import {
  createElementRefCsvDocument,
  createElementRefSingleRowCsvDocument,
} from '../../stubs/datamapper/target-render-test-helpers';
import { JsonSchemaDocument } from '../document/json-schema/json-schema-document.model';
import { XmlSchemaField } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { TargetRenderService } from '../visualization/target-render.service';
import { MappingService } from './mapping.service';
import { EMPTY_XSL, getEmptyXsl, MappingSerializerService } from './mapping-serializer.service';

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
    const xslt = MappingSerializerService.createNew(DocumentDefinitionType.XML_SCHEMA);
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

    describe('namespace merging', () => {
      it('should resolve same URI with different prefix in favor of XSLT', () => {
        let mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );
        mappingTree.namespaceMap = { tns: 'io.kaoto.datamapper.poc.test' };

        ({ mappingTree } = MappingSerializerService.deserialize(
          getShipOrderToShipOrderXslt(),
          targetDoc,
          mappingTree,
          sourceParameterMap,
        ));

        expect(mappingTree.namespaceMap['ns0']).toBe('io.kaoto.datamapper.poc.test');
        expect(mappingTree.namespaceMap['tns']).toBeUndefined();

        const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
        expect(serialized).toContain('xmlns:ns0="io.kaoto.datamapper.poc.test"');
        expect(serialized).not.toContain('xmlns:tns=');
      });

      it('should resolve same prefix with different URI in favor of XSLT', () => {
        let mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );
        mappingTree.namespaceMap = { ns0: 'http://example.com/other' };

        ({ mappingTree } = MappingSerializerService.deserialize(
          getShipOrderToShipOrderXslt(),
          targetDoc,
          mappingTree,
          sourceParameterMap,
        ));

        expect(mappingTree.namespaceMap['ns0']).toBe('io.kaoto.datamapper.poc.test');
      });

      it('should keep seed entries not declared in XSLT and maintain XSLT-first key order', () => {
        let mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );
        mappingTree.namespaceMap = { custom: 'http://example.com/custom' };

        ({ mappingTree } = MappingSerializerService.deserialize(
          getShipOrderToShipOrderXslt(),
          targetDoc,
          mappingTree,
          sourceParameterMap,
        ));

        expect(mappingTree.namespaceMap['ns0']).toBe('io.kaoto.datamapper.poc.test');
        expect(mappingTree.namespaceMap['custom']).toBe('http://example.com/custom');
        expect(Object.keys(mappingTree.namespaceMap)).toEqual(['ns0', 'custom']);

        const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
        expect(serialized).toContain('xmlns:custom="http://example.com/custom"');

        let roundTripTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );
        ({ mappingTree: roundTripTree } = MappingSerializerService.deserialize(
          serialized,
          targetDoc,
          roundTripTree,
          sourceParameterMap,
        ));
        expect(roundTripTree.namespaceMap['custom']).toBe('http://example.com/custom');
      });

      it('should drop seeded xs/fn when XSLT binds their URIs to other prefixes, but keep them otherwise', () => {
        let mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );
        mappingTree.namespaceMap = { ...STANDARD_NAMESPACE_MAP };

        ({ mappingTree } = MappingSerializerService.deserialize(
          getShipOrderXsdPrefixXslt(),
          targetDoc,
          mappingTree,
          sourceParameterMap,
        ));

        expect(mappingTree.namespaceMap['xsd']).toBe(NS_XML_SCHEMA);
        expect(mappingTree.namespaceMap['f']).toBe(NS_XPATH_FUNCTIONS);
        expect(mappingTree.namespaceMap['xs']).toBeUndefined();
        expect(mappingTree.namespaceMap['fn']).toBeUndefined();

        let jsonTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
        jsonTree.namespaceMap = { ...STANDARD_NAMESPACE_MAP };
        ({ mappingTree: jsonTree } = MappingSerializerService.deserialize(
          getShipOrderJsonXslt(),
          targetDoc,
          jsonTree,
          sourceParameterMap,
        ));

        expect(jsonTree.namespaceMap['fn']).toBe(NS_XPATH_FUNCTIONS);
        expect(jsonTree.namespaceMap['xs']).toBe(NS_XML_SCHEMA);
      });

      it('regression: should serialize seeded STANDARD_NAMESPACE_MAP with xs/fn in xmlns and xs fn xsl in exclude-result-prefixes', () => {
        let mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );
        mappingTree.namespaceMap = { ...STANDARD_NAMESPACE_MAP };

        ({ mappingTree } = MappingSerializerService.deserialize(
          getShipOrderToShipOrderXslt(),
          targetDoc,
          mappingTree,
          sourceParameterMap,
        ));

        const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
        expect(serialized).toContain('xmlns:xs="http://www.w3.org/2001/XMLSchema"');
        expect(serialized).toContain('xmlns:fn="http://www.w3.org/2005/xpath-functions"');
        expect(serialized).toContain('exclude-result-prefixes="ns0 xs fn xsl"');
      });

      it('should leave seeded namespaceMap untouched when deserializing template-less XSLT', () => {
        let mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );
        mappingTree.namespaceMap = { custom: 'http://example.com/custom' };

        ({ mappingTree } = MappingSerializerService.deserialize(EMPTY_XSL, targetDoc, mappingTree, sourceParameterMap));

        expect(mappingTree.namespaceMap).toEqual({ custom: 'http://example.com/custom' });
      });

      it('should collect inlined namespace declarations from elements inside templates', () => {
        const xsltWithInlinedNs = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
  <xsl:template match="/">
    <ns0:ShipOrder>
      <inlined:CustomElement xmlns:inlined="http://example.com/inlined">
        <sub:Nested xmlns:sub="http://example.com/nested"/>
      </inlined:CustomElement>
    </ns0:ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;

        let mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );

        ({ mappingTree } = MappingSerializerService.deserialize(
          xsltWithInlinedNs,
          targetDoc,
          mappingTree,
          sourceParameterMap,
        ));

        expect(mappingTree.namespaceMap['ns0']).toBe('io.kaoto.datamapper.poc.test');
        expect(mappingTree.namespaceMap['inlined']).toBe('http://example.com/inlined');
        expect(mappingTree.namespaceMap['sub']).toBe('http://example.com/nested');
      });

      it('should emit an error alert and keep root prefix when inlined element shadows a root prefix', () => {
        const xsltWithShadowedNs = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
  <xsl:template match="/">
    <ns0:ShipOrder xmlns:ns0="http://example.com/shadowed">
      <unique:Child xmlns:unique="http://example.com/unique"/>
    </ns0:ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;

        const mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );

        const { mappingTree: deserialized, messages } = MappingSerializerService.deserialize(
          xsltWithShadowedNs,
          targetDoc,
          mappingTree,
          sourceParameterMap,
        );

        // Root prefix wins over inlined shadowed prefix
        expect(deserialized.namespaceMap['ns0']).toBe('io.kaoto.datamapper.poc.test');
        expect(deserialized.namespaceMap['unique']).toBe('http://example.com/unique');
        // Error alert emitted
        const shadowedAlert = messages.find(
          (m) => m.variant === 'danger' && String(m.title).includes('Shadowed namespace'),
        );
        expect(shadowedAlert).toBeDefined();
        expect(String(shadowedAlert?.description)).toContain(
          'data mappings using this prefix might not work as expected',
        );
      });

      it('should emit an error alert when a descendant inlined element shadows an ancestor inlined prefix', () => {
        const xsltWithNestedShadowing = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
  <xsl:template match="/">
    <ns0:ShipOrder>
      <Ancestor xmlns:p="urn:ancestor">
        <Descendant xmlns:p="urn:descendant"/>
      </Ancestor>
    </ns0:ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;

        const mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );

        const { mappingTree: deserialized, messages } = MappingSerializerService.deserialize(
          xsltWithNestedShadowing,
          targetDoc,
          mappingTree,
          sourceParameterMap,
        );

        // Earlier inlined prefix wins over descendant shadowed prefix
        expect(deserialized.namespaceMap['p']).toBe('urn:ancestor');
        const shadowedAlert = messages.find(
          (m) => m.variant === 'danger' && String(m.title).includes('Shadowed namespace'),
        );
        expect(shadowedAlert).toBeDefined();
        expect(String(shadowedAlert?.description)).toContain(
          'data mappings using this prefix might not work as expected',
        );
      });

      it('should preserve inlined namespace aliases even if their URI is already declared on the root', () => {
        const xsltWithInlinedAlias = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test" xmlns:ord="urn:orders">
  <xsl:template match="/">
    <ns0:ShipOrder>
      <OrderPerson>
        <xsl:value-of xmlns:alias="urn:orders" select="/alias:order/alias:name"/>
      </OrderPerson>
    </ns0:ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;

        const mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );

        const { mappingTree: deserialized } = MappingSerializerService.deserialize(
          xsltWithInlinedAlias,
          targetDoc,
          mappingTree,
          sourceParameterMap,
        );

        expect(deserialized.namespaceMap['ord']).toBe('urn:orders');
        expect(deserialized.namespaceMap['alias']).toBe('urn:orders');

        const serialized = MappingSerializerService.serialize(deserialized, sourceParameterMap);
        expect(serialized).toContain('xmlns:ord="urn:orders"');
        expect(serialized).toContain('xmlns:alias="urn:orders"');
      });

      it('should preserve multiple root stylesheet declarations even if they bind to the same URI', () => {
        const xsltWithDuplicateRootUris = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="http://example.com/orders" xmlns:alias="http://example.com/orders">
  <xsl:template match="/">
    <ns0:ShipOrder>
      <alias:Item/>
    </ns0:ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;

        let mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );

        ({ mappingTree } = MappingSerializerService.deserialize(
          xsltWithDuplicateRootUris,
          targetDoc,
          mappingTree,
          sourceParameterMap,
        ));

        expect(mappingTree.namespaceMap['ns0']).toBe('http://example.com/orders');
        expect(mappingTree.namespaceMap['alias']).toBe('http://example.com/orders');

        const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
        expect(serialized).toContain('xmlns:ns0="http://example.com/orders"');
        expect(serialized).toContain('xmlns:alias="http://example.com/orders"');
      });

      it('should handle non-XSLT XML gracefully without throwing', () => {
        const nonXsltXml = `<?xml version="1.0" encoding="UTF-8"?>
<foo xmlns:a="urn:a">
  <b/>
</foo>`;

        let mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );

        expect(() => {
          ({ mappingTree } = MappingSerializerService.deserialize(
            nonXsltXml,
            targetDoc,
            mappingTree,
            sourceParameterMap,
          ));
        }).not.toThrow();
      });

      it('should restore namespaces, params, and variables from stylesheet even without template children', () => {
        const xsltWithoutTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:custom="http://example.com/custom">
  <xsl:param name="globalParam"/>
  <xsl:variable name="globalVar" select="'staticValue'"/>
  <xsl:template match="/"/>
</xsl:stylesheet>`;

        let mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const paramsMap = new Map<string, IDocument>();

        ({ mappingTree } = MappingSerializerService.deserialize(
          xsltWithoutTemplate,
          targetDoc,
          mappingTree,
          paramsMap,
        ));

        expect(mappingTree.namespaceMap['custom']).toBe('http://example.com/custom');
        expect(paramsMap.has('globalParam')).toBe(true);
        expect(mappingTree.globalVariables).toHaveLength(1);
        expect(mappingTree.globalVariables[0].name).toBe('globalVar');
      });
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
      const copyOfSelector = shipToFieldItem.children[0] as CopyOfSelector;
      expect(copyOfSelector.expression).toBe('/ns0:ShipOrder/ShipTo');
      expect(copyOfSelector.valueType).toBe(CopyOfType.CONTAINER_NODE);

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

    it('should reconstruct intermediate FieldItem for CONTAINER copy-of with skipped wrapper', () => {
      const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="io.kaoto.datamapper.poc.test">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
      <xsl:copy-of select="/ns0:ShipOrder/ShipTo"/>
    </ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;

      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(xslt, targetDoc, mappingTree, sourceParameterMap));

      const shipOrderFieldItem = mappingTree.children[0] as FieldItem;
      expect(shipOrderFieldItem.field.name).toBe('ShipOrder');
      expect(shipOrderFieldItem.children).toHaveLength(1);

      const shipToFieldItem = shipOrderFieldItem.children[0] as FieldItem;
      expect(shipToFieldItem).toBeInstanceOf(FieldItem);
      expect(shipToFieldItem.field.name).toBe('ShipTo');
      expect(shipToFieldItem.children).toHaveLength(1);

      const selector = shipToFieldItem.children[0] as CopyOfSelector;
      expect(selector).toBeInstanceOf(CopyOfSelector);
      expect(selector.valueType).toBe(CopyOfType.CONTAINER);
      expect(selector.expression).toBe('/ns0:ShipOrder/ShipTo');

      const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(serialized, 'text/xml');
      const copyOfSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:copy-of/@select',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(copyOfSelect?.nodeValue).toBe('/ns0:ShipOrder/ShipTo');
    });

    it('should deserialize a raw text node as a literal ValueOfSelector', () => {
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
      const selector = result.children[0] as ValueOfSelector;
      expect(selector.expression).toBe('TEST');
      expect(selector.isLiteral).toBeTruthy();
    });

    it('should deserialize xsl:text as a literal ValueOfSelector', () => {
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
      const selector = result.children[0] as ValueOfSelector;
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

  describe('output method', () => {
    const getOutput = (xslt: string) => {
      const xsltDocument = domParser.parseFromString(xslt, 'application/xml');
      return xsltDocument
        .evaluate('/xsl:stylesheet/xsl:output', xsltDocument, xslNsResolver, XPathResult.ANY_TYPE)
        .iterateNext() as Element;
    };

    it('EMPTY_XSL should use the text output method without indent', () => {
      expect(getOutput(EMPTY_XSL).getAttribute('method')).toBe('text');
      expect(getOutput(EMPTY_XSL).hasAttribute('indent')).toBe(false);
    });

    it('should use the text output method for a JSON target without mappings', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.JSON_SCHEMA,
      );
      const output = getOutput(MappingSerializerService.serialize(mappingTree, sourceParameterMap));
      expect(output.getAttribute('method')).toBe('text');
    });

    it('should use the xml output method for an XML target and respect omitXmlDeclaration', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const plain = getOutput(MappingSerializerService.serialize(mappingTree, sourceParameterMap));
      expect(plain.getAttribute('method')).toBe('xml');
      expect(plain.getAttribute('indent')).toBe('yes');
      expect(plain.hasAttribute('omit-xml-declaration')).toBe(false);

      const omitted = getOutput(
        MappingSerializerService.serialize(mappingTree, sourceParameterMap, {
          ...DEFAULT_DATAMAPPER_SETTINGS,
          omitXmlDeclaration: true,
        }),
      );
      expect(omitted.getAttribute('method')).toBe('xml');
      expect(omitted.getAttribute('omit-xml-declaration')).toBe('yes');
    });

    it('should not write omit-xml-declaration for a non-XML target', () => {
      const output = getOutput(
        getEmptyXsl(DocumentDefinitionType.Primitive, { ...DEFAULT_DATAMAPPER_SETTINGS, omitXmlDeclaration: true }),
      );
      expect(output.getAttribute('method')).toBe('text');
      expect(output.hasAttribute('omit-xml-declaration')).toBe(false);
    });

    describe('legacy stylesheet saved with the xml output method', () => {
      const legacyXsl = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}">
  <xsl:output method="xml" indent="yes" omit-xml-declaration="yes"/>
  <xsl:template match="/">${body}</xsl:template>
</xsl:stylesheet>`;

      const expectTextOutput = (xslt: string) => {
        const output = getOutput(xslt);
        expect(output.getAttribute('method')).toBe('text');
        expect(output.hasAttribute('indent')).toBe(false);
        expect(output.hasAttribute('omit-xml-declaration')).toBe(false);
      };

      it('should switch to the text output method when re-saved with a primitive target', () => {
        const legacy = legacyXsl(`<xsl:value-of select="concat('Tom', ' &amp; ', 'Jerry')"/>`);
        const primitiveDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.Primitive);
        ({ mappingTree } = MappingSerializerService.deserialize(legacy, primitiveDoc, mappingTree, sourceParameterMap));
        expect(mappingTree.children).toHaveLength(1);

        expectTextOutput(MappingSerializerService.serialize(mappingTree, sourceParameterMap));
      });

      it('should switch to the text output method when re-saved with a JSON target', () => {
        const jsonDoc = new JsonSchemaDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.JSON_SCHEMA, BODY_DOCUMENT_ID),
        );
        let mappingTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.JSON_SCHEMA,
        );
        ({ mappingTree } = MappingSerializerService.deserialize(
          legacyXsl(''),
          jsonDoc,
          mappingTree,
          sourceParameterMap,
        ));

        expectTextOutput(MappingSerializerService.serialize(mappingTree, sourceParameterMap));
      });
    });
  });

  describe('serialize()', () => {
    it('should serialize a primitive target as plain text output', () => {
      const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.Primitive);
      const valueOf = new ValueOfSelector(mappingTree);
      valueOf.expression = "concat('Tom', ' & ', 'Jerry')";
      mappingTree.children.push(valueOf);

      const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(serialized, 'application/xml');

      const output = xsltDocument
        .evaluate('/xsl:stylesheet/xsl:output', xsltDocument, xslNsResolver, XPathResult.ANY_TYPE)
        .iterateNext() as Element;
      expect(output.getAttribute('method')).toBe('text');
      expect(output.hasAttribute('indent')).toBe(false);
      expect(output.hasAttribute('omit-xml-declaration')).toBe(false);

      const template = xsltDocument
        .evaluate("/xsl:stylesheet/xsl:template[@match='/']", xsltDocument, xslNsResolver, XPathResult.ANY_TYPE)
        .iterateNext() as Element;
      expect(template.children).toHaveLength(1);
      expect(template.children[0].namespaceURI).toBe(NS_XSL);
      expect(template.children[0].localName).toBe('value-of');
      expect(template.children[0].getAttribute('select')).toBe("concat('Tom', ' & ', 'Jerry')");
    });
    it('should preserve copy-of and value-of on the same container through a round trip', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      mappingTree.namespaceMap = { ns0: targetDoc.fields[0].namespaceURI };
      const shipOrderFieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
      mappingTree.children.push(shipOrderFieldItem);

      const copyOf = new CopyOfSelector(shipOrderFieldItem, CopyOfType.CONTAINER);
      copyOf.expression = '/ns0:ShipOrder';
      const valueOf = new ValueOfSelector(shipOrderFieldItem);
      valueOf.expression = '/ns0:ShipOrder/ns0:OrderPerson';
      shipOrderFieldItem.children.push(copyOf, valueOf);

      const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const { mappingTree: reloaded } = MappingSerializerService.deserialize(
        serialized,
        targetDoc,
        new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA),
        sourceParameterMap,
      );
      const reloadedShipOrder = reloaded.children[0] as FieldItem;

      expect(reloadedShipOrder.children.find((child) => child instanceof CopyOfSelector)?.expression).toBe(
        copyOf.expression,
      );
      expect(reloadedShipOrder.children.find((child) => child instanceof ValueOfSelector)?.expression).toBe(
        valueOf.expression,
      );
    });

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

    it('should warn when reserved variable names appear inside template', () => {
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

    it('should deserialize stylesheet-level variable', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getVariableStylesheetXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      expect(mappingTree.globalVariables).toHaveLength(1);
      const gv = mappingTree.globalVariables[0];
      expect(gv).toBeInstanceOf(VariableItem);
      expect(gv.name).toBe('globalTax');
      expect(gv.scope).toBe('stylesheet');
      expect(gv.expression).toBe('0.08');
    });

    it('should deserialize stylesheet-level variable with a custom XSLT prefix', () => {
      const xslt = getVariableStylesheetXslt()
        .replace(/xmlns:xsl=/g, 'xmlns:transform=')
        .replace(/(<\/?)xsl:/g, '$1transform:');

      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);

      ({ mappingTree } = MappingSerializerService.deserialize(xslt, targetDoc, mappingTree, sourceParameterMap));

      expect(mappingTree.globalVariables).toHaveLength(1);

      const gv = mappingTree.globalVariables[0];

      expect(gv).toBeInstanceOf(VariableItem);
      expect(gv.name).toBe('globalTax');
      expect(gv.scope).toBe('stylesheet');
      expect(gv.expression).toBe('0.08');
    });

    it('should deserialize template-level variable', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getVariableTemplateXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      expect(mappingTree.globalVariables).toHaveLength(1);
      const gv = mappingTree.globalVariables[0];
      expect(gv).toBeInstanceOf(VariableItem);
      expect(gv.name).toBe('tplDiscount');
      expect(gv.scope).toBe('template');
      expect(gv.expression).toBe('0.1');
    });

    it('should round-trip a stylesheet-level variable', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getVariableStylesheetXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(serialized, 'text/xml');
      const variableName = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:variable/@name',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(variableName?.nodeValue).toBe('globalTax');
    });

    it('should round-trip a template-level variable', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getVariableTemplateXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(serialized, 'text/xml');
      const templateChildren = xsltDocument.evaluate(
        '/xsl:stylesheet/xsl:template/*',
        xsltDocument,
        xslNsResolver,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      );
      const first = templateChildren.iterateNext() as Element;
      expect(first.nodeName).toBe('xsl:variable');
      expect(first.getAttribute('name')).toBe('tplDiscount');
    });

    it('should warn for reserved stylesheet-level variable names when not DataMapper-internal', () => {
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const { messages } = MappingSerializerService.deserialize(
        getVariableStylesheetReservedNamesXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      );
      expect(mappingTree.globalVariables).toHaveLength(1);
      expect(mappingTree.globalVariables[0].name).toBe('globalTax');
      expect(messages).toHaveLength(2);
      expect(messages[0].variant).toBe('danger');
      expect(messages[0].title).toContain('reserved stylesheet-level variable name');
      expect(messages[1].variant).toBe('danger');
      expect(messages[1].title).toContain('reserved stylesheet-level variable name');
    });

    it('should preserve text-content stylesheet variable via rawElement', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getVariableStylesheetTextContentXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      expect(mappingTree.globalVariables).toHaveLength(1);
      const gv = mappingTree.globalVariables[0];
      expect(gv.name).toBe('label');
      expect(gv.scope).toBe('stylesheet');
      expect(gv.rawElement).toBeDefined();
    });

    it('should round-trip a text-content stylesheet variable', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getVariableStylesheetTextContentXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(serialized, 'text/xml');
      const varElement = xsltDocument.evaluate(
        '/xsl:stylesheet/xsl:variable[@name="label"]',
        xsltDocument,
        xslNsResolver,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
      ).singleNodeValue as Element;
      expect(varElement).not.toBeNull();
      expect(varElement.textContent?.trim()).toBe('Hello World');
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

  describe('auto-optional-if: serialization and deserialization round trip', () => {
    it('should serialize a value-of guard as a plain xsl:if that is see-through again after a round trip', () => {
      const localSourceDoc = createElementRefCsvDocument(DocumentType.SOURCE_BODY);
      const localTargetDoc = createElementRefCsvDocument(DocumentType.TARGET_BODY);
      const localParamsMap = TestUtil.createParameterMap();
      const sourceContext = { sourceParameterMap: localParamsMap, sourceBody: localSourceDoc };
      const sourceField = localSourceDoc.fields[0].fields.find((f) => f.name === 'STATUS')!;
      const targetField = localTargetDoc.fields[0].fields.find((f) => f.name === 'STATUS')!;

      const mappingTree = new MappingTree(
        localTargetDoc.documentType,
        localTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const rootItem = new FieldItem(mappingTree, localTargetDoc.fields[0]);
      mappingTree.children.push(rootItem);
      const fieldItem = new FieldItem(rootItem, targetField);
      rootItem.children.push(fieldItem);
      MappingService.mapToField(sourceField, fieldItem);
      const ifItem = MappingService.tryAutoOptionalIfWrap(fieldItem, sourceField, false)!;
      expect(ifItem.expression).toBe('/CSV/STATUS');
      expect(TargetRenderService.buildIndex(mappingTree, sourceContext).isAbsorbed(ifItem)).toBe(true);

      const xslt = MappingSerializerService.serialize(mappingTree, localParamsMap);
      const xsltDocument = domParser.parseFromString(xslt, 'text/xml');
      const ifTest = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/CSV/xsl:if/@test',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(ifTest?.nodeValue).toBe('/CSV/STATUS');
      const valueOfSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/CSV/xsl:if/STATUS/xsl:value-of/@select',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(valueOfSelect?.nodeValue).toBe('/CSV/STATUS');

      const freshTree = new MappingTree(
        localTargetDoc.documentType,
        localTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const { mappingTree: deserialized } = MappingSerializerService.deserialize(
        xslt,
        localTargetDoc,
        freshTree,
        localParamsMap,
      );

      const deserializedRoot = deserialized.children[0] as FieldItem;
      const deserializedIfItem = deserializedRoot.children.find((c) => c instanceof IfItem) as IfItem;
      expect(deserializedIfItem).toBeDefined();
      const renderIndex = TargetRenderService.buildIndex(deserialized, sourceContext);
      expect(renderIndex.getAbsorbingField(deserializedIfItem)).toBe(deserializedIfItem.children[0]);
    });

    it('should serialize a copy-of guard as a plain xsl:if that is see-through again after a round trip', () => {
      const localSourceDoc = createElementRefSingleRowCsvDocument(DocumentType.SOURCE_BODY);
      const localTargetDoc = createElementRefCsvDocument(DocumentType.TARGET_BODY);
      const localParamsMap = TestUtil.createParameterMap();
      const sourceField = localSourceDoc.fields[0].fields.find((f) => f.name === 'CSV_r')!;
      const targetField = localTargetDoc.fields[0].fields.find((f) => f.name === 'CSV_r')!;

      const mappingTree = new MappingTree(
        localTargetDoc.documentType,
        localTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const rootItem = new FieldItem(mappingTree, localTargetDoc.fields[0]);
      mappingTree.children.push(rootItem);
      const fieldItem = new FieldItem(rootItem, targetField);
      rootItem.children.push(fieldItem);
      // CONTAINER_NODE (unlike CONTAINER) always renders a dedicated target element wrapper,
      // with the copy-of's `/node()` suffix stripped when comparing against the if's test.
      MappingService.mapToFieldWithValueType(sourceField, fieldItem, CopyOfType.CONTAINER_NODE);
      const ifItem = MappingService.tryAutoOptionalIfWrap(fieldItem, sourceField, false)!;
      expect(ifItem.expression).toBe('/CSV/CSV_r');

      const xslt = MappingSerializerService.serialize(mappingTree, localParamsMap);
      const xsltDocument = domParser.parseFromString(xslt, 'text/xml');
      const ifTest = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/CSV/xsl:if/@test',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(ifTest?.nodeValue).toBe('/CSV/CSV_r');
      const copyOfSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/CSV/xsl:if/CSV_r/xsl:copy-of/@select',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(copyOfSelect?.nodeValue).toBe('/CSV/CSV_r/node()');

      const freshTree = new MappingTree(
        localTargetDoc.documentType,
        localTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const { mappingTree: deserialized } = MappingSerializerService.deserialize(
        xslt,
        localTargetDoc,
        freshTree,
        localParamsMap,
      );

      const deserializedRoot = deserialized.children[0] as FieldItem;
      const deserializedIfItem = deserializedRoot.children.find((c) => c instanceof IfItem) as IfItem;
      expect(deserializedIfItem).toBeDefined();
      const renderIndex = TargetRenderService.buildIndex(deserialized, {
        sourceParameterMap: localParamsMap,
        sourceBody: localSourceDoc,
      });
      expect(renderIndex.isAbsorbed(deserializedIfItem)).toBe(true);
    });

    it('should serialize a CONTAINER (skipped-wrapper) copy-of guard that is see-through again after a round trip', () => {
      // Regression: CopyOfSelectorHandler only reconstructed the intermediate FieldItem when
      // its immediate parent mapping was a FieldItem — when the copy-of sits inside an xsl:if
      // instead (exactly what this feature produces), the parent mapping is the IfItem, so the
      // reconstruction was skipped and the guard's shape (IfItem -> FieldItem -> selector)
      // silently collapsed into (IfItem -> selector), which matchSimpleOptionalGuard can't match.
      const localSourceDoc = createElementRefSingleRowCsvDocument(DocumentType.SOURCE_BODY);
      const localTargetDoc = createElementRefCsvDocument(DocumentType.TARGET_BODY);
      const localParamsMap = TestUtil.createParameterMap();
      const sourceField = localSourceDoc.fields[0].fields.find((f) => f.name === 'CSV_r')!;
      const targetField = localTargetDoc.fields[0].fields.find((f) => f.name === 'CSV_r')!;

      const mappingTree = new MappingTree(
        localTargetDoc.documentType,
        localTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const rootItem = new FieldItem(mappingTree, localTargetDoc.fields[0]);
      mappingTree.children.push(rootItem);
      const fieldItem = new FieldItem(rootItem, targetField);
      rootItem.children.push(fieldItem);
      MappingService.mapToFieldWithValueType(sourceField, fieldItem, CopyOfType.CONTAINER);
      const ifItem = MappingService.tryAutoOptionalIfWrap(fieldItem, sourceField, false)!;
      expect(ifItem.expression).toBe('/CSV/CSV_r');

      const xslt = MappingSerializerService.serialize(mappingTree, localParamsMap);
      const xsltDocument = domParser.parseFromString(xslt, 'text/xml');
      const ifTest = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/CSV/xsl:if/@test',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(ifTest?.nodeValue).toBe('/CSV/CSV_r');
      // CONTAINER skips the target element wrapper — the copy-of appears directly under the if.
      const copyOfSelect = xsltDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/CSV/xsl:if/xsl:copy-of/@select',
          xsltDocument,
          xslNsResolver,
          XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext();
      expect(copyOfSelect?.nodeValue).toBe('/CSV/CSV_r');

      const freshTree = new MappingTree(
        localTargetDoc.documentType,
        localTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const { mappingTree: deserialized } = MappingSerializerService.deserialize(
        xslt,
        localTargetDoc,
        freshTree,
        localParamsMap,
      );

      const deserializedRoot = deserialized.children[0] as FieldItem;
      const deserializedIfItem = deserializedRoot.children.find((c) => c instanceof IfItem) as IfItem;
      expect(deserializedIfItem).toBeDefined();
      // The intermediate CSV_r FieldItem must be reconstructed under the IfItem for the
      // guard's shape to match — not a bare CopyOfSelector directly under the IfItem.
      const reconstructedFieldItem = deserializedIfItem.children.find((c) => c instanceof FieldItem) as FieldItem;
      expect(reconstructedFieldItem).toBeDefined();
      expect(reconstructedFieldItem.field.name).toBe('CSV_r');
      const renderIndex = TargetRenderService.buildIndex(deserialized, {
        sourceParameterMap: localParamsMap,
        sourceBody: localSourceDoc,
      });
      expect(renderIndex.getAbsorbingField(deserializedIfItem)).toBe(reconstructedFieldItem);
    });

    it('should still emit the container element when its only other content sits inside a guard', () => {
      const localSourceDoc = TestUtil.createSourceOrderDoc();
      const localTargetDoc = TestUtil.createTargetOrderDoc();
      const localParamsMap = TestUtil.createParameterMap();
      const sourceShipTo = localSourceDoc.fields[0].fields.find((f) => f.name === 'ShipTo')!;
      const targetShipTo = localTargetDoc.fields[0].fields.find((f) => f.name === 'ShipTo')!;
      const sourceName = sourceShipTo.fields.find((f) => f.name === 'Name')!;
      const targetName = targetShipTo.fields.find((f) => f.name === 'Name')!;

      const mappingTree = new MappingTree(
        localTargetDoc.documentType,
        localTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const rootItem = new FieldItem(mappingTree, localTargetDoc.fields[0]);
      mappingTree.children.push(rootItem);
      const shipToItem = new FieldItem(rootItem, targetShipTo);
      rootItem.children.push(shipToItem);
      // A guarded child alongside a wholesale container copy-of: the copy-of alone would let the
      // ShipTo element be skipped, which would reparent the guarded Name into ShipOrder.
      MappingService.mapToFieldWithValueType(sourceShipTo, shipToItem, CopyOfType.CONTAINER);
      const nameItem = new FieldItem(shipToItem, targetName);
      shipToItem.children.push(nameItem);
      MappingService.mapToField(sourceName, nameItem);
      MappingService.wrapWithIf(nameItem);
      MappingService.mapToCondition(nameItem.parent as IfItem, sourceName);

      const xslt = MappingSerializerService.serialize(mappingTree, localParamsMap);

      // Without the fix the ShipTo element is elided and Name is reparented into ShipOrder.
      expect(xslt).toContain('<ShipTo');
      const shipToBody = xslt.substring(xslt.indexOf('<ShipTo'), xslt.indexOf('</ShipTo>'));
      expect(shipToBody).toContain('<Name>');
    });

    it('should serialize a guarded attribute before guarded element content', () => {
      const localSourceDoc = TestUtil.createSourceOrderDoc();
      const localTargetDoc = TestUtil.createTargetOrderDoc();
      const localParamsMap = TestUtil.createParameterMap();
      const sourceOrderId = localSourceDoc.fields[0].fields.find((f) => f.name === 'OrderId')!;
      const targetOrderId = localTargetDoc.fields[0].fields.find((f) => f.name === 'OrderId')!;
      const sourceOrderPerson = localSourceDoc.fields[0].fields.find((f) => f.name === 'OrderPerson')!;
      const targetOrderPerson = localTargetDoc.fields[0].fields.find((f) => f.name === 'OrderPerson')!;
      expect(targetOrderId.isAttribute).toBe(true);

      const mappingTree = new MappingTree(
        localTargetDoc.documentType,
        localTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const rootItem = new FieldItem(mappingTree, localTargetDoc.fields[0]);
      mappingTree.children.push(rootItem);
      // Element first, attribute second — both guarded. Without attribute-first hoisting the
      // xsl:attribute lands after element content and Saxon raises XTDE0410 at transform time.
      const personItem = new FieldItem(rootItem, targetOrderPerson);
      rootItem.children.push(personItem);
      MappingService.mapToField(sourceOrderPerson, personItem);
      MappingService.wrapWithIf(personItem);
      MappingService.mapToCondition(personItem.parent as IfItem, sourceOrderPerson);
      const orderIdItem = new FieldItem(rootItem, targetOrderId);
      rootItem.children.push(orderIdItem);
      MappingService.mapToField(sourceOrderId, orderIdItem);
      MappingService.wrapWithIf(orderIdItem);
      MappingService.mapToCondition(orderIdItem.parent as IfItem, sourceOrderId);

      const xslt = MappingSerializerService.serialize(mappingTree, localParamsMap);

      const shipOrderBody = xslt.substring(xslt.indexOf('<ShipOrder'), xslt.indexOf('</ShipOrder>'));
      expect(shipOrderBody).toContain('xsl:attribute');
      expect(shipOrderBody.indexOf('xsl:attribute')).toBeLessThan(shipOrderBody.indexOf('<OrderPerson>'));
    });
  });
});
