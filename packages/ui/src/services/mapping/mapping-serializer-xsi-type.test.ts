import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../models/datamapper/document';
import { FieldItem, MappingTree, VariableItem } from '../../models/datamapper/mapping';
import { NS_XML_SCHEMA_INSTANCE, NS_XSL } from '../../models/datamapper/standard-namespaces';
import { FieldOverrideVariant } from '../../models/datamapper/types';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { QName } from '../../xml-schema-ts/QName';
import { MappingSerializerService } from './mapping-serializer.service';

describe('xsi:type serialization and deserialization', () => {
  const domParser = new DOMParser();

  function createMappingTreeWithSafeOverride(): MappingTree {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    mappingTree.namespaceMap = { ns0: 'urn:order', ns1: 'urn:ext', xsi: NS_XML_SCHEMA_INSTANCE };
    const targetDoc = TestUtil.createTargetOrderDoc();
    const field = targetDoc.fields[0]; // ShipOrder
    field.typeOverride = FieldOverrideVariant.SAFE;
    field.typeQName = new QName('urn:ext', 'ShipToExt');
    const fieldItem = new FieldItem(mappingTree, field);
    mappingTree.children.push(fieldItem);
    return mappingTree;
  }

  it('SAFE override produces xsi:type in serialized XSLT output', () => {
    const mappingTree = createMappingTreeWithSafeOverride();
    const sourceParameterMap = TestUtil.createParameterMap();
    const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
    expect(xslt).toContain('xsi:type="ns1:ShipToExt"');
  });

  it('xsi namespace is declared and NOT in exclude-result-prefixes when SAFE override present', () => {
    const mappingTree = createMappingTreeWithSafeOverride();
    const sourceParameterMap = TestUtil.createParameterMap();
    const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
    const xsltDoc = domParser.parseFromString(xslt, 'application/xml');
    const stylesheet = xsltDoc.documentElement;
    // xsi namespace must be declared
    expect(stylesheet.getAttribute('xmlns:xsi')).toBe(NS_XML_SCHEMA_INSTANCE);
    // xsi prefix must NOT be in exclude-result-prefixes
    const excluded = (stylesheet.getAttribute('exclude-result-prefixes') ?? '').split(' ');
    expect(excluded).not.toContain('xsi');
    // type's own namespace prefix ns1 must NOT be excluded either
    expect(excluded).not.toContain('ns1');
  });

  it('no SAFE override produces no xsi:type and no xsi namespace declaration', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    mappingTree.namespaceMap = { ns0: 'urn:order' };
    const targetDoc = TestUtil.createTargetOrderDoc();
    const fieldItem = new FieldItem(mappingTree, targetDoc.fields[0]);
    mappingTree.children.push(fieldItem);
    const sourceParameterMap = TestUtil.createParameterMap();
    const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
    expect(xslt).not.toContain('xsi:type');
    expect(xslt).not.toContain(NS_XML_SCHEMA_INSTANCE);
  });

  it('round-trip: xsi:type survives deserialize → serialize', () => {
    const NS_ORDER = 'io.kaoto.datamapper.poc.test';
    const xsltInput = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="${NS_ORDER}" xmlns:ns1="urn:ext" xmlns:xsi="${NS_XML_SCHEMA_INSTANCE}" exclude-result-prefixes="ns0">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ns0:ShipOrder xsi:type="ns1:ShipToExt">
      <xsl:value-of select="/ns0:ShipOrder"/>
    </ns0:ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;
    const targetDoc = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const sourceParameterMap = TestUtil.createParameterMap();
    const { mappingTree: deserialized } = MappingSerializerService.deserialize(
      xsltInput,
      targetDoc,
      mappingTree,
      sourceParameterMap,
    );

    const shipOrderFieldItem = deserialized.children[0] as FieldItem;
    expect(shipOrderFieldItem).toBeInstanceOf(FieldItem);
    expect(shipOrderFieldItem.field.typeOverride).toBe(FieldOverrideVariant.SAFE);
    expect(shipOrderFieldItem.field.typeQName?.getLocalPart()).toBe('ShipToExt');
    expect(shipOrderFieldItem.field.typeQName?.getNamespaceURI()).toBe('urn:ext');

    // Serialize back
    const reserialized = MappingSerializerService.serialize(deserialized, sourceParameterMap);
    expect(reserialized).toContain('xsi:type="ns1:ShipToExt"');
  });

  it('round-trip: hand-edited xsi:type on field with no schema override is preserved', () => {
    const NS_ORDER = 'io.kaoto.datamapper.poc.test';
    // Field has no schema-driven type override — xsi:type is purely hand-edited
    const xsltInput = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="${NS_ORDER}" xmlns:ns1="urn:hand" xmlns:xsi="${NS_XML_SCHEMA_INSTANCE}" exclude-result-prefixes="ns0">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ns0:ShipOrder xsi:type="ns1:HandEditedType">
      <xsl:value-of select="/ns0:ShipOrder"/>
    </ns0:ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;
    const targetDoc = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const sourceParameterMap = TestUtil.createParameterMap();
    const { mappingTree: deserialized } = MappingSerializerService.deserialize(
      xsltInput,
      targetDoc,
      mappingTree,
      sourceParameterMap,
    );
    const shipOrderFieldItem = deserialized.children[0] as FieldItem;
    expect(shipOrderFieldItem.field.typeOverride).toBe(FieldOverrideVariant.SAFE);
    expect(shipOrderFieldItem.field.typeQName?.getLocalPart()).toBe('HandEditedType');

    const reserialized = MappingSerializerService.serialize(deserialized, sourceParameterMap);
    expect(reserialized).toContain('xsi:type="ns1:HandEditedType"');
  });

  it('backward compatibility: existing XSLT without xsi:type deserializes without errors or spurious xsi:type', () => {
    const NS_ORDER = 'io.kaoto.datamapper.poc.test';
    const xsltWithMapping = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="${NS_ORDER}" exclude-result-prefixes="ns0">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ns0:ShipOrder>
      <ns0:OrderPerson>
        <xsl:value-of select="/ns0:ShipOrder/ns0:OrderPerson"/>
      </ns0:OrderPerson>
    </ns0:ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;
    const targetDoc = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const sourceParameterMap = TestUtil.createParameterMap();
    const { mappingTree: deserialized, messages } = MappingSerializerService.deserialize(
      xsltWithMapping,
      targetDoc,
      mappingTree,
      sourceParameterMap,
    );
    expect(messages.filter((m) => m.variant === 'danger')).toHaveLength(0);
    expect(deserialized.children).toHaveLength(1);
    const shipOrderFieldItem = deserialized.children[0] as FieldItem;
    expect(shipOrderFieldItem.field.typeOverride).toBe(FieldOverrideVariant.NONE);

    const reserialized = MappingSerializerService.serialize(deserialized, sourceParameterMap);
    expect(reserialized).not.toContain('xsi:type');
    expect(reserialized).not.toContain(NS_XML_SCHEMA_INSTANCE);
  });

  it('element with xsi:type and children is marked isUserCreated after deserialization', () => {
    const NS_ORDER = 'io.kaoto.datamapper.poc.test';
    const xsltInput = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="${NS_ORDER}" xmlns:ns1="urn:ext" xmlns:xsi="${NS_XML_SCHEMA_INSTANCE}" exclude-result-prefixes="ns0">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ns0:ShipOrder xsi:type="ns1:ShipToExt">
      <ns0:OrderPerson>
        <xsl:value-of select="/ns0:ShipOrder/ns0:OrderPerson"/>
      </ns0:OrderPerson>
    </ns0:ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;
    const targetDoc = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const sourceParameterMap = TestUtil.createParameterMap();
    const { mappingTree: deserialized } = MappingSerializerService.deserialize(
      xsltInput,
      targetDoc,
      mappingTree,
      sourceParameterMap,
    );
    const shipOrderFieldItem = deserialized.children[0] as FieldItem;
    expect(shipOrderFieldItem).toBeInstanceOf(FieldItem);
    expect(shipOrderFieldItem.isUserCreated).toBe(true);
  });

  it('round-trip: xsi:type with non-xsi prefix survives deserialize → serialize', () => {
    const NS_ORDER = 'io.kaoto.datamapper.poc.test';
    // xsi prefix is taken by urn:custom, so XSI namespace uses ns2 prefix
    const xsltInput = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="${NS_ORDER}" xmlns:ns1="urn:ext" xmlns:xsi="urn:custom" xmlns:ns2="${NS_XML_SCHEMA_INSTANCE}" exclude-result-prefixes="ns0 xsi">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ns0:ShipOrder ns2:type="ns1:ShipToExt">
      <xsl:value-of select="/ns0:ShipOrder"/>
    </ns0:ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;
    const targetDoc = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const sourceParameterMap = TestUtil.createParameterMap();
    const { mappingTree: deserialized } = MappingSerializerService.deserialize(
      xsltInput,
      targetDoc,
      mappingTree,
      sourceParameterMap,
    );

    const shipOrderFieldItem = deserialized.children[0] as FieldItem;
    expect(shipOrderFieldItem).toBeInstanceOf(FieldItem);
    expect(shipOrderFieldItem.field.typeOverride).toBe(FieldOverrideVariant.SAFE);
    expect(shipOrderFieldItem.field.typeQName?.getLocalPart()).toBe('ShipToExt');
    expect(shipOrderFieldItem.field.typeQName?.getNamespaceURI()).toBe('urn:ext');

    const reserialized = MappingSerializerService.serialize(deserialized, sourceParameterMap);
    const reserializedDoc = new DOMParser().parseFromString(reserialized, 'application/xml');
    const shipOrder = reserializedDoc.getElementsByTagNameNS(NS_ORDER, 'ShipOrder')[0];
    expect(shipOrder).toBeDefined();
    const typeAttr = shipOrder.getAttributeNS(NS_XML_SCHEMA_INSTANCE, 'type');
    expect(typeAttr).toContain('ShipToExt');
  });

  it('round-trip: unprefixed xsi:type resolves through default namespace', () => {
    const NS_ORDER = 'io.kaoto.datamapper.poc.test';
    const NS_TYPES = 'urn:types';
    const xsltInput = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="${NS_ORDER}" xmlns:xsi="${NS_XML_SCHEMA_INSTANCE}" exclude-result-prefixes="ns0">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ns0:ShipOrder xmlns="${NS_TYPES}" xsi:type="Derived">
      <xsl:value-of select="/ns0:ShipOrder"/>
    </ns0:ShipOrder>
  </xsl:template>
</xsl:stylesheet>`;
    const targetDoc = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const sourceParameterMap = TestUtil.createParameterMap();
    const { mappingTree: deserialized } = MappingSerializerService.deserialize(
      xsltInput,
      targetDoc,
      mappingTree,
      sourceParameterMap,
    );

    const shipOrderFieldItem = deserialized.children[0] as FieldItem;
    expect(shipOrderFieldItem).toBeInstanceOf(FieldItem);
    expect(shipOrderFieldItem.field.typeOverride).toBe(FieldOverrideVariant.SAFE);
    expect(shipOrderFieldItem.field.typeQName?.getLocalPart()).toBe('Derived');
    expect(shipOrderFieldItem.field.typeQName?.getNamespaceURI()).toBe(NS_TYPES);

    const reserialized = MappingSerializerService.serialize(deserialized, sourceParameterMap);
    const reserializedDoc = new DOMParser().parseFromString(reserialized, 'application/xml');
    const shipOrder = reserializedDoc.getElementsByTagNameNS(NS_ORDER, 'ShipOrder')[0];
    expect(shipOrder).toBeDefined();
    const typeAttr = shipOrder.getAttributeNS(NS_XML_SCHEMA_INSTANCE, 'type');
    expect(typeAttr).toContain('Derived');
  });

  it('SAFE override inside globalVariable is detected for xsi namespace preservation', () => {
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    mappingTree.namespaceMap = { ns0: 'urn:order', ns1: 'urn:ext', xsi: NS_XML_SCHEMA_INSTANCE };
    const targetDoc = TestUtil.createTargetOrderDoc();
    const field = targetDoc.fields[0];
    field.typeOverride = FieldOverrideVariant.SAFE;
    field.typeQName = new QName('urn:ext', 'ShipToExt');
    const variable = new VariableItem(mappingTree, 'myVar');
    const fieldItem = new FieldItem(variable, field);
    variable.children.push(fieldItem);
    mappingTree.globalVariables.push(variable);
    const sourceParameterMap = TestUtil.createParameterMap();
    const xslt = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
    const xsltDoc = domParser.parseFromString(xslt, 'application/xml');
    const stylesheet = xsltDoc.documentElement;
    expect(stylesheet.getAttribute('xmlns:xsi')).toBe(NS_XML_SCHEMA_INSTANCE);
    const excluded = (stylesheet.getAttribute('exclude-result-prefixes') ?? '').split(' ');
    expect(excluded).not.toContain('xsi');
    expect(excluded).not.toContain('ns1');
  });
});
