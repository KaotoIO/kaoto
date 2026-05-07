import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType, IParentType } from '../../models/datamapper/document';
import {
  ForEachGroupItem,
  ForEachItem,
  GroupingStrategy,
  IfItem,
  MappingTree,
  SortItem,
  UnknownMappingItem,
} from '../../models/datamapper/mapping';
import { NS_XSL } from '../../models/datamapper/standard-namespaces';
import {
  getForEachGroupEndingWithToShipOrderXslt,
  getForEachGroupStartingWithToShipOrderXslt,
  getForEachGroupToShipOrderXslt,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { MappingSerializerService } from './mapping-serializer.service';
import * as handlerModule from './xslt-item-handlers';
import {
  allHandlers,
  deserializeHandlers,
  FieldItemHandler,
  ForEachGroupItemHandler,
  ForEachItemHandler,
  serializeHandlers,
  SortItemHandler,
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

  it('every handler with itemClass is registered in serializeHandlers', () => {
    for (const handler of allHandlers) {
      if (handler.itemClass) {
        expect(serializeHandlers.get(handler.itemClass)).toBe(handler);
      }
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

  it('should serialize for-each-group with group-starting-with', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const item = new ForEachGroupItem(mappingTree);
    item.expression = '/data/record';
    item.groupingStrategy = GroupingStrategy.GROUP_STARTING_WITH;
    item.groupingExpression = 'self::ns0:Header';

    const xslt = MappingSerializerService.createNew();
    const parent = xslt.documentElement;
    const el = handler.serialize(parent, item);
    expect(el.getAttribute('select')).toBe('/data/record');
    expect(el.getAttribute('group-starting-with')).toBe('self::ns0:Header');
  });

  it('should serialize for-each-group with group-ending-with', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const item = new ForEachGroupItem(mappingTree);
    item.expression = '/data/record';
    item.groupingStrategy = GroupingStrategy.GROUP_ENDING_WITH;
    item.groupingExpression = 'self::ns0:Footer';

    const xslt = MappingSerializerService.createNew();
    const parent = xslt.documentElement;
    const el = handler.serialize(parent, item);
    expect(el.getAttribute('select')).toBe('/data/record');
    expect(el.getAttribute('group-ending-with')).toBe('self::ns0:Footer');
  });

  it('should round-trip for-each-group with group-starting-with', () => {
    let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    ({ mappingTree } = MappingSerializerService.deserialize(
      getForEachGroupStartingWithToShipOrderXslt(),
      targetDoc,
      mappingTree,
      sourceParameterMap,
    ));
    const forEachGroup = mappingTree.children[0].children[0] as ForEachGroupItem;
    expect(forEachGroup.expression).toBe('/ns0:ShipOrder/Item');
    expect(forEachGroup.groupingStrategy).toBe(GroupingStrategy.GROUP_STARTING_WITH);
    expect(forEachGroup.groupingExpression).toBe('self::*[Note]');

    const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
    const dom = new DOMParser().parseFromString(serialized, 'application/xml');
    const el = dom.getElementsByTagNameNS(NS_XSL, 'for-each-group')[0];
    expect(el).toBeTruthy();
    expect(el.getAttribute('select')).toBe('/ns0:ShipOrder/Item');
    expect(el.getAttribute('group-starting-with')).toBe('self::*[Note]');
  });

  it('should round-trip for-each-group with group-ending-with', () => {
    let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    ({ mappingTree } = MappingSerializerService.deserialize(
      getForEachGroupEndingWithToShipOrderXslt(),
      targetDoc,
      mappingTree,
      sourceParameterMap,
    ));
    const forEachGroup = mappingTree.children[0].children[0] as ForEachGroupItem;
    expect(forEachGroup.expression).toBe('/ns0:ShipOrder/Item');
    expect(forEachGroup.groupingStrategy).toBe(GroupingStrategy.GROUP_ENDING_WITH);
    expect(forEachGroup.groupingExpression).toBe('self::*[Price > 100]');

    const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
    const dom = new DOMParser().parseFromString(serialized, 'application/xml');
    const el = dom.getElementsByTagNameNS(NS_XSL, 'for-each-group')[0];
    expect(el).toBeTruthy();
    expect(el.getAttribute('select')).toBe('/ns0:ShipOrder/Item');
    expect(el.getAttribute('group-ending-with')).toBe('self::*[Price > 100]');
  });

  it('should round-trip for-each-group with group-by', () => {
    let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    ({ mappingTree } = MappingSerializerService.deserialize(
      getForEachGroupToShipOrderXslt(),
      targetDoc,
      mappingTree,
      sourceParameterMap,
    ));
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

describe('ForEachItemHandler sort serialization', () => {
  const handler = new ForEachItemHandler();

  it('should serialize for-each with sort items', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const item = new ForEachItem(mappingTree);
    item.expression = '/items/item';
    const sort1 = new SortItem();
    sort1.expression = 'Title';
    const sort2 = new SortItem();
    sort2.expression = 'Price';
    sort2.order = 'descending';
    item.sortItems = [sort1, sort2];

    const xslt = MappingSerializerService.createNew();
    const parent = xslt.documentElement;
    const el = handler.serialize(parent, item);

    const sortElements = el.getElementsByTagNameNS(NS_XSL, 'sort');
    expect(sortElements.length).toBe(2);
    expect(sortElements[0].getAttribute('select')).toBe('Title');
    expect(sortElements[0].hasAttribute('order')).toBe(false);
    expect(sortElements[1].getAttribute('select')).toBe('Price');
    expect(sortElements[1].getAttribute('order')).toBe('descending');
  });

  it('should serialize for-each with no sort items', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const item = new ForEachItem(mappingTree);
    item.expression = '/items/item';

    const xslt = MappingSerializerService.createNew();
    const parent = xslt.documentElement;
    const el = handler.serialize(parent, item);

    const sortElements = el.getElementsByTagNameNS(NS_XSL, 'sort');
    expect(sortElements.length).toBe(0);
  });
});

describe('ForEachGroupItemHandler sort serialization', () => {
  const handler = new ForEachGroupItemHandler();

  it('should serialize for-each-group with sort items', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const item = new ForEachGroupItem(mappingTree);
    item.expression = '/items/item';
    item.groupingStrategy = GroupingStrategy.GROUP_BY;
    item.groupingExpression = 'category';
    const sort = new SortItem();
    sort.expression = '@date';
    sort.order = 'descending';
    item.sortItems = [sort];

    const xslt = MappingSerializerService.createNew();
    const parent = xslt.documentElement;
    const el = handler.serialize(parent, item);

    const sortElements = el.getElementsByTagNameNS(NS_XSL, 'sort');
    expect(sortElements.length).toBe(1);
    expect(sortElements[0].getAttribute('select')).toBe('@date');
    expect(sortElements[0].getAttribute('order')).toBe('descending');
  });
});

describe('SortItemHandler advanced properties', () => {
  const handler = new ForEachItemHandler();
  const sortHandler = new SortItemHandler();

  it('should serialize advanced attributes when set', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const item = new ForEachItem(mappingTree);
    item.expression = '/items/item';
    const sort = new SortItem();
    sort.expression = 'Title';
    sort.lang = 'en';
    sort.dataType = 'text';
    sort.caseOrder = 'upper-first';
    sort.collation = 'http://example.com/collation';
    sort.stable = 'yes';
    item.sortItems = [sort];

    const xslt = MappingSerializerService.createNew();
    const el = handler.serialize(xslt.documentElement, item);

    const sortEl = el.getElementsByTagNameNS(NS_XSL, 'sort')[0];
    expect(sortEl.getAttribute('lang')).toBe('en');
    expect(sortEl.getAttribute('data-type')).toBe('text');
    expect(sortEl.getAttribute('case-order')).toBe('upper-first');
    expect(sortEl.getAttribute('collation')).toBe('http://example.com/collation');
    expect(sortEl.getAttribute('stable')).toBe('yes');
  });

  it('should not serialize advanced attributes when unset', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const item = new ForEachItem(mappingTree);
    item.expression = '/items/item';
    const sort = new SortItem();
    sort.expression = 'Title';
    item.sortItems = [sort];

    const xslt = MappingSerializerService.createNew();
    const el = handler.serialize(xslt.documentElement, item);

    const sortEl = el.getElementsByTagNameNS(NS_XSL, 'sort')[0];
    expect(sortEl.hasAttribute('lang')).toBe(false);
    expect(sortEl.hasAttribute('data-type')).toBe(false);
    expect(sortEl.hasAttribute('case-order')).toBe(false);
    expect(sortEl.hasAttribute('collation')).toBe(false);
    expect(sortEl.hasAttribute('stable')).toBe(false);
  });

  it('should deserialize advanced attributes', () => {
    const xslt = new DOMParser().parseFromString(
      `<xsl:stylesheet xmlns:xsl="${NS_XSL}">` +
        `<xsl:for-each select="/items/item">` +
        `<xsl:sort select="Title" lang="de" data-type="number" case-order="lower-first" collation="http://example.com" stable="no"/>` +
        `</xsl:for-each></xsl:stylesheet>`,
      'application/xml',
    );
    const forEachEl = xslt.documentElement.firstElementChild!;
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const forEachItem = new ForEachItem(mappingTree);
    const sortEl = forEachEl.firstElementChild!;
    sortHandler.deserialize(sortEl, mappingTree as unknown as IParentType, forEachItem);

    expect(forEachItem.sortItems).toHaveLength(1);
    const s = forEachItem.sortItems[0];
    expect(s.lang).toBe('de');
    expect(s.dataType).toBe('number');
    expect(s.caseOrder).toBe('lower-first');
    expect(s.collation).toBe('http://example.com');
    expect(s.stable).toBe('no');
  });

  it('should ignore invalid case-order and stable values', () => {
    const xslt = new DOMParser().parseFromString(
      `<xsl:stylesheet xmlns:xsl="${NS_XSL}">` +
        `<xsl:for-each select="/items/item">` +
        `<xsl:sort select="Title" case-order="invalid" stable="maybe"/>` +
        `</xsl:for-each></xsl:stylesheet>`,
      'application/xml',
    );
    const forEachEl = xslt.documentElement.firstElementChild!;
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const forEachItem = new ForEachItem(mappingTree);
    sortHandler.deserialize(forEachEl.firstElementChild!, mappingTree as unknown as IParentType, forEachItem);

    expect(forEachItem.sortItems[0].caseOrder).toBe('');
    expect(forEachItem.sortItems[0].stable).toBe('');
  });

  it('should round-trip advanced attributes through serialize/deserialize', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const item = new ForEachItem(mappingTree);
    item.expression = '/items/item';
    const sort = new SortItem();
    sort.expression = 'Price';
    sort.order = 'descending';
    sort.lang = 'en-US';
    sort.dataType = 'number';
    sort.caseOrder = 'upper-first';
    sort.stable = 'yes';
    item.sortItems = [sort];

    const xslt = MappingSerializerService.createNew();
    const el = handler.serialize(xslt.documentElement, item);
    const sortEl = el.getElementsByTagNameNS(NS_XSL, 'sort')[0];

    const roundTripItem = new ForEachItem(mappingTree);
    sortHandler.deserialize(sortEl, mappingTree as unknown as IParentType, roundTripItem);

    const rt = roundTripItem.sortItems[0];
    expect(rt.expression).toBe('Price');
    expect(rt.order).toBe('descending');
    expect(rt.lang).toBe('en-US');
    expect(rt.dataType).toBe('number');
    expect(rt.caseOrder).toBe('upper-first');
    expect(rt.stable).toBe('yes');
  });

  it('should omit @select when expression is empty and preserve it on round-trip', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const item = new ForEachItem(mappingTree);
    item.expression = '/items/item';
    const sort = new SortItem();
    sort.order = 'descending';
    item.sortItems = [sort];

    const xslt = MappingSerializerService.createNew();
    const el = handler.serialize(xslt.documentElement, item);
    const sortEl = el.getElementsByTagNameNS(NS_XSL, 'sort')[0];
    expect(sortEl.hasAttribute('select')).toBe(false);
    expect(sortEl.getAttribute('order')).toBe('descending');

    const roundTripItem = new ForEachItem(mappingTree);
    sortHandler.deserialize(sortEl, mappingTree as unknown as IParentType, roundTripItem);
    expect(roundTripItem.sortItems[0].expression).toBe('');

    const xslt2 = MappingSerializerService.createNew();
    const el2 = handler.serialize(xslt2.documentElement, roundTripItem);
    const sortEl2 = el2.getElementsByTagNameNS(NS_XSL, 'sort')[0];
    expect(sortEl2.hasAttribute('select')).toBe(false);
  });
});

describe('SortItem model', () => {
  it('clone() should preserve all properties', () => {
    const sort = new SortItem();
    sort.expression = 'Price';
    sort.order = 'descending';
    sort.lang = 'de';
    sort.dataType = 'xs:date';
    sort.caseOrder = 'lower-first';
    sort.collation = 'http://example.com';
    sort.stable = 'no';

    const cloned = sort.clone();
    expect(cloned).toBeInstanceOf(SortItem);
    expect(cloned.expression).toBe('Price');
    expect(cloned.order).toBe('descending');
    expect(cloned.lang).toBe('de');
    expect(cloned.dataType).toBe('xs:date');
    expect(cloned.caseOrder).toBe('lower-first');
    expect(cloned.collation).toBe('http://example.com');
    expect(cloned.stable).toBe('no');
  });

  it('hasAdvancedProperties() should return false with defaults', () => {
    expect(new SortItem().hasAdvancedProperties()).toBe(false);
  });

  it('hasAdvancedProperties() should return true when any advanced property is set', () => {
    const sort = new SortItem();
    sort.lang = 'en';
    expect(sort.hasAdvancedProperties()).toBe(true);
  });

  it('ForEachItem.doClone() should preserve sort item advanced properties', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const item = new ForEachItem(mappingTree);
    const sort = new SortItem();
    sort.expression = 'Price';
    sort.lang = 'en';
    sort.dataType = 'number';
    item.sortItems = [sort];

    const cloned = item.clone();
    expect(cloned.sortItems[0].lang).toBe('en');
    expect(cloned.sortItems[0].dataType).toBe('number');
    expect(cloned.sortItems[0]).toBeInstanceOf(SortItem);
  });
});

describe('SortItemHandler deserialize under unsupported parent', () => {
  const handler = new SortItemHandler();
  const targetDoc = TestUtil.createTargetOrderDoc();

  it('should return danger message when parent is not ForEachItem or ForEachGroupItem', () => {
    const xslt = new DOMParser().parseFromString(
      `<xsl:stylesheet xmlns:xsl="${NS_XSL}"><xsl:sort select="Title"/></xsl:stylesheet>`,
      'application/xml',
    );
    const element = xslt.getElementsByTagNameNS(NS_XSL, 'sort')[0];
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const ifItem = new IfItem(mappingTree);
    const result = handler.deserialize(element, targetDoc, ifItem);
    expect(result).toBeTruthy();
    expect(result!.mappingItem).toBeUndefined();
    expect(result!.messages).toHaveLength(1);
    expect(result!.messages![0].variant).toBe('danger');
    expect(result!.messages![0].title).toContain('xsl:sort is not allowed');
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
