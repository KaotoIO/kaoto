import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType, IParentType } from '../../models/datamapper/document';
import { ForEachGroupItem, GroupingStrategy, MappingTree, UnknownMappingItem } from '../../models/datamapper/mapping';
import { NS_XSL } from '../../models/datamapper/standard-namespaces';
import { getForEachGroupToShipOrderXslt, TestUtil } from '../../stubs/datamapper/data-mapper';
import { MappingSerializerService } from './mapping-serializer.service';
import * as handlerModule from './xslt-item-handlers';
import {
  allHandlers,
  deserializeHandlers,
  FieldItemHandler,
  ForEachGroupItemHandler,
  serializeHandlers,
  UnknownMappingItemHandler,
} from './xslt-item-handlers';

describe('xslt-item-handlers registry', () => {
  const exportedHandlerClasses = Object.values(handlerModule).filter(
    (v) => typeof v === 'function' && 'prototype' in v && 'serialize' in v.prototype && 'deserialize' in v.prototype,
  );

  it('every exported handler class has an instance in allHandlers', () => {
    const registeredClasses = allHandlers.map((h) => h.constructor);
    for (const cls of exportedHandlerClasses) {
      expect(registeredClasses).toContain(cls);
    }
  });

  it('allHandlers count matches the number of exported handler classes', () => {
    expect(allHandlers.length).toBe(exportedHandlerClasses.length);
  });

  it('every handler in allHandlers is registered in serializeHandlers', () => {
    for (const handler of allHandlers) {
      expect(serializeHandlers.get(handler.itemClass)).toBe(handler);
    }
  });

  it('every xsltElementName is registered in deserializeHandlers', () => {
    for (const handler of allHandlers) {
      for (const name of handler.xsltElementNames) {
        expect(deserializeHandlers.get(name)).toBe(handler);
      }
    }
  });
});

describe('FieldItemHandler', () => {
  const handler = new FieldItemHandler();
  const targetDoc = TestUtil.createTargetOrderDoc();

  it('should create a new attribute field when not found in schema', () => {
    const xslt = new DOMParser().parseFromString(
      `<xsl:stylesheet xmlns:xsl="${NS_XSL}"><xsl:attribute name="newAttr" namespace="urn:test"/></xsl:stylesheet>`,
      'application/xml',
    );
    const element = xslt.getElementsByTagNameNS(NS_XSL, 'attribute')[0];
    const shipOrderField = targetDoc.fields[0];
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const result = handler.deserialize(element, shipOrderField, mappingTree)!;
    expect(result).toBeTruthy();
    expect(result.fieldItem).toBeTruthy();
    const field = result.fieldItem!;
    expect('name' in field && field.name).toBe('newAttr');
    expect('isAttribute' in field && field.isAttribute).toBe(true);
    expect('namespaceURI' in field && field.namespaceURI).toBe('urn:test');
  });
});

describe('ForEachGroupItemHandler', () => {
  const handler = new ForEachGroupItemHandler();
  const sourceParameterMap = TestUtil.createParameterMap();
  const targetDoc = TestUtil.createTargetOrderDoc();

  it('should serialize for-each-group with group-by', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const item = new ForEachGroupItem(mappingTree);
    item.expression = '/items/item';
    item.groupingStrategy = GroupingStrategy.GROUP_BY;
    item.groupingExpression = 'category';

    const xslt = MappingSerializerService.createNew();
    const parent = xslt.documentElement;
    const el = handler.serialize(parent, item);
    expect(el.localName).toBe('for-each-group');
    expect(el.getAttribute('select')).toBe('/items/item');
    expect(el.getAttribute('group-by')).toBe('category');
  });

  it('should serialize for-each-group with group-adjacent', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const item = new ForEachGroupItem(mappingTree);
    item.expression = '/items/item';
    item.groupingStrategy = GroupingStrategy.GROUP_ADJACENT;
    item.groupingExpression = '@type';

    const xslt = MappingSerializerService.createNew();
    const parent = xslt.documentElement;
    const el = handler.serialize(parent, item);
    expect(el.getAttribute('group-adjacent')).toBe('@type');
  });

  it('should deserialize for-each-group with group-by', () => {
    const xslt = new DOMParser().parseFromString(
      `<xsl:stylesheet xmlns:xsl="${NS_XSL}"><xsl:for-each-group select="/items/item" group-by="category"/></xsl:stylesheet>`,
      'application/xml',
    );
    const element = xslt.getElementsByTagNameNS(NS_XSL, 'for-each-group')[0];
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const result = handler.deserialize(element, targetDoc, mappingTree);
    const item = result.mappingItem as ForEachGroupItem;
    expect(item.expression).toBe('/items/item');
    expect(item.groupingStrategy).toBe(GroupingStrategy.GROUP_BY);
    expect(item.groupingExpression).toBe('category');
  });

  it('should deserialize for-each-group with group-adjacent', () => {
    const xslt = new DOMParser().parseFromString(
      `<xsl:stylesheet xmlns:xsl="${NS_XSL}"><xsl:for-each-group select="/data" group-adjacent="@type"/></xsl:stylesheet>`,
      'application/xml',
    );
    const element = xslt.getElementsByTagNameNS(NS_XSL, 'for-each-group')[0];
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const result = handler.deserialize(element, targetDoc, mappingTree);
    const item = result.mappingItem as ForEachGroupItem;
    expect(item.groupingStrategy).toBe(GroupingStrategy.GROUP_ADJACENT);
    expect(item.groupingExpression).toBe('@type');
  });

  it('should round-trip for-each-group through serialize/deserialize', () => {
    let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    mappingTree = MappingSerializerService.deserialize(
      getForEachGroupToShipOrderXslt(),
      targetDoc,
      mappingTree,
      sourceParameterMap,
    );
    const forEachGroup = mappingTree.children[0].children[0] as ForEachGroupItem;
    expect(forEachGroup.expression).toBe('/ns0:ShipOrder/Item');
    expect(forEachGroup.groupingStrategy).toBe(GroupingStrategy.GROUP_BY);
    expect(forEachGroup.groupingExpression).toBe('Title');

    const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
    const dom = new DOMParser().parseFromString(serialized, 'application/xml');
    const el = dom.getElementsByTagNameNS(NS_XSL, 'for-each-group')[0];
    expect(el).toBeTruthy();
    expect(el.getAttribute('select')).toBe('/ns0:ShipOrder/Item');
    expect(el.getAttribute('group-by')).toBe('Title');
  });
});

describe('UnknownMappingItemHandler', () => {
  const handler = new UnknownMappingItemHandler();

  it('should deserialize an element as UnknownMappingItem', () => {
    const xslt = new DOMParser().parseFromString(
      `<xsl:stylesheet xmlns:xsl="${NS_XSL}"><xsl:some-unknown select="foo"/></xsl:stylesheet>`,
      'application/xml',
    );
    const element = xslt.documentElement.firstElementChild!;
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const result = handler.deserialize(element, mappingTree as unknown as IParentType, mappingTree);
    expect(result.mappingItem).toBeInstanceOf(UnknownMappingItem);
    expect((result.mappingItem as UnknownMappingItem).element.localName).toBe('some-unknown');
    expect(result.fieldItem).toBeNull();
  });
});
