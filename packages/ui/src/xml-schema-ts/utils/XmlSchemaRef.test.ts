import { QName } from '../QName';
import { XmlSchema } from '../XmlSchema';
import { XmlSchemaCollection } from '../XmlSchemaCollection';
import { XmlSchemaNamedType } from './XmlSchemaNamedType';
import { XmlSchemaRef } from './XmlSchemaRef';

describe('XmlSchemaRef', () => {
  it('should resolve target from parent schema before falling back to collection for elements', () => {
    const collection = new XmlSchemaCollection();
    const schema1 = new XmlSchema('http://example.com/ns', 'schema1.xsd', collection);
    const schema2 = new XmlSchema('http://example.com/ns', 'schema2.xsd', collection);

    const elem1 = schema1.getElements();
    const elem2 = schema2.getElements();
    const qname = new QName('http://example.com/ns', 'MyElement');

    const mockElem1 = { getWireName: () => qname, id: 'elem1' };
    const mockElem2 = { getWireName: () => qname, id: 'elem2' };
    elem1.set(qname, mockElem1 as never);
    elem2.set(qname, mockElem2 as never);

    const refOnSchema2 = new XmlSchemaRef(schema2, XmlSchemaNamedType.XmlSchemaElement);
    refOnSchema2.setTargetQName(qname);

    const target = refOnSchema2.getTarget();
    expect(target).toBe(mockElem2);
  });

  it('should fall back to parent collection if not found in parent schema hierarchy for elements', () => {
    const collection = new XmlSchemaCollection();
    const schema1 = new XmlSchema('http://example.com/ns', 'schema1.xsd', collection);
    const schema2 = new XmlSchema('http://example.com/ns2', 'schema2.xsd', collection);

    const qname = new QName('http://example.com/ns', 'FallbackElement');
    const mockElem = { getWireName: () => qname, id: 'fallback' };
    schema1.getElements().set(qname, mockElem as never);

    const refOnSchema2 = new XmlSchemaRef(schema2, XmlSchemaNamedType.XmlSchemaElement);
    refOnSchema2.setTargetQName(qname);

    const target = refOnSchema2.getTarget();
    expect(target).toBe(mockElem);
  });

  it('should resolve attributes, types, groups, attribute groups, and notations from schema or collection', () => {
    const collection = new XmlSchemaCollection();
    const schema = new XmlSchema('http://example.com/ns', 'schema.xsd', collection);
    const fallbackSchema = new XmlSchema('http://example.com/ns', 'fallback.xsd', collection);

    const qnameAttr = new QName('http://example.com/ns', 'MyAttr');
    const mockAttr = { getWireName: () => qnameAttr, id: 'attr' };
    schema.getAttributes().set(qnameAttr, mockAttr as never);
    const refAttr = new XmlSchemaRef(schema, XmlSchemaNamedType.XmlSchemaAttribute);
    refAttr.setTargetQName(qnameAttr);
    expect(refAttr.getTarget()).toBe(mockAttr);

    // Fallback attribute
    const qnameAttrFb = new QName('http://example.com/ns', 'FbAttr');
    const mockAttrFb = { getWireName: () => qnameAttrFb, id: 'fbAttr' };
    fallbackSchema.getAttributes().set(qnameAttrFb, mockAttrFb as never);
    const refAttrFb = new XmlSchemaRef(schema, XmlSchemaNamedType.XmlSchemaAttribute);
    refAttrFb.setTargetQName(qnameAttrFb);
    expect(refAttrFb.getTarget()).toBe(mockAttrFb);

    // Type
    const qnameType = new QName('http://example.com/ns', 'MyType');
    const mockType = { getWireName: () => qnameType, id: 'type' };
    schema.getSchemaTypes().set(qnameType, mockType as never);
    const refType = new XmlSchemaRef(schema, XmlSchemaNamedType.XmlSchemaType);
    refType.setTargetQName(qnameType);
    expect(refType.getTarget()).toBe(mockType);

    // Fallback Type
    const qnameTypeFb = new QName('http://example.com/ns', 'FbType');
    const mockTypeFb = { getWireName: () => qnameTypeFb, id: 'fbType' };
    fallbackSchema.getSchemaTypes().set(qnameTypeFb, mockTypeFb as never);
    const refTypeFb = new XmlSchemaRef(schema, XmlSchemaNamedType.XmlSchemaType);
    refTypeFb.setTargetQName(qnameTypeFb);
    expect(refTypeFb.getTarget()).toBe(mockTypeFb);

    // Attribute Group
    const qnameAttrGrp = new QName('http://example.com/ns', 'MyAttrGroup');
    const mockAttrGrp = { getWireName: () => qnameAttrGrp, id: 'attrGrp' };
    schema.getAttributeGroups().set(qnameAttrGrp, mockAttrGrp as never);
    const refAttrGrp = new XmlSchemaRef(schema, XmlSchemaNamedType.XmlSchemaAttributeGroup);
    refAttrGrp.setTargetQName(qnameAttrGrp);
    expect(refAttrGrp.getTarget()).toBe(mockAttrGrp);

    // Fallback Attribute Group
    const qnameAttrGrpFb = new QName('http://example.com/ns', 'FbAttrGroup');
    const mockAttrGrpFb = { getWireName: () => qnameAttrGrpFb, id: 'fbAttrGrp' };
    fallbackSchema.getAttributeGroups().set(qnameAttrGrpFb, mockAttrGrpFb as never);
    const refAttrGrpFb = new XmlSchemaRef(schema, XmlSchemaNamedType.XmlSchemaAttributeGroup);
    refAttrGrpFb.setTargetQName(qnameAttrGrpFb);
    expect(refAttrGrpFb.getTarget()).toBe(mockAttrGrpFb);

    // Group
    const qnameGrp = new QName('http://example.com/ns', 'MyGroup');
    const mockGrp = { getWireName: () => qnameGrp, id: 'grp' };
    schema.getGroups().set(qnameGrp, mockGrp as never);
    const refGrp = new XmlSchemaRef(schema, XmlSchemaNamedType.XmlSchemaGroup);
    refGrp.setTargetQName(qnameGrp);
    expect(refGrp.getTarget()).toBe(mockGrp);

    // Fallback Group
    const qnameGrpFb = new QName('http://example.com/ns', 'FbGroup');
    const mockGrpFb = { getWireName: () => qnameGrpFb, id: 'fbGrp' };
    fallbackSchema.getGroups().set(qnameGrpFb, mockGrpFb as never);
    const refGrpFb = new XmlSchemaRef(schema, XmlSchemaNamedType.XmlSchemaGroup);
    refGrpFb.setTargetQName(qnameGrpFb);
    expect(refGrpFb.getTarget()).toBe(mockGrpFb);

    // Notation
    const qnameNot = new QName('http://example.com/ns', 'MyNotation');
    const mockNot = { getWireName: () => qnameNot, id: 'notation' };
    schema.getNotations().set(qnameNot, mockNot as never);
    const refNot = new XmlSchemaRef(schema, XmlSchemaNamedType.XmlSchemaNotation);
    refNot.setTargetQName(qnameNot);
    expect(refNot.getTarget()).toBe(mockNot);

    // Fallback Notation
    const qnameNotFb = new QName('http://example.com/ns', 'FbNotation');
    const mockNotFb = { getWireName: () => qnameNotFb, id: 'fbNotation' };
    fallbackSchema.getNotations().set(qnameNotFb, mockNotFb as never);
    const refNotFb = new XmlSchemaRef(schema, XmlSchemaNamedType.XmlSchemaNotation);
    refNotFb.setTargetQName(qnameNotFb);
    expect(refNotFb.getTarget()).toBe(mockNotFb);
  });

  it('should return null when targetQName is not set or parent collection is null', () => {
    const orphanedSchema = new XmlSchema('http://example.com/ns', 'orphan.xsd');
    const qname = new QName('http://example.com/ns', 'AnyElem');

    const refWithoutQName = new XmlSchemaRef(orphanedSchema, XmlSchemaNamedType.XmlSchemaElement);
    expect(refWithoutQName.getTarget()).toBeNull();

    const refWithoutCollection = new XmlSchemaRef(orphanedSchema, XmlSchemaNamedType.XmlSchemaElement);
    refWithoutCollection.setTargetQName(qname);
    expect(refWithoutCollection.getTarget()).toBeNull();
  });

  it('should reset target cache when forgetTargetObject is called so that updated registrations are picked up', () => {
    const collection = new XmlSchemaCollection();
    const schema1 = new XmlSchema('http://example.com/ns', 'schema1.xsd', collection);
    const schema2 = new XmlSchema('http://example.com/ns', 'schema2.xsd', collection);

    const qname = new QName('http://example.com/ns', 'SwitchableElement');
    const elemA = { getWireName: () => qname, id: 'elemA' };
    const elemB = { getWireName: () => qname, id: 'elemB' };

    // Ref declared on schema1; schema1 initially has elemA
    schema1.getElements().set(qname, elemA as never);
    const ref = new XmlSchemaRef(schema1, XmlSchemaNamedType.XmlSchemaElement);
    ref.setTargetQName(qname);

    // First resolution caches elemA
    expect(ref.getTarget()).toBe(elemA);

    // Simulate schema re-registration: schema1 now resolves to elemB (schema2 carries it),
    // and we replace schema1's element map entry to point to elemB.
    schema1.getElements().set(qname, elemB as never);

    // Without forgetTargetObject, the stale cache still returns elemA
    expect(ref.getTarget()).toBe(elemA);

    // After forgetting, the next getTarget() re-resolves and picks up elemB
    ref.forgetTargetObject();
    expect(ref.getTarget()).toBe(elemB);

    // Schema2 fallback: ref declared on schema2 (no element there), falls back to collection
    const ref2 = new XmlSchemaRef(schema2, XmlSchemaNamedType.XmlSchemaElement);
    ref2.setTargetQName(qname);
    // schema2 has no elements, but schema1 is in the collection — collection fallback applies
    expect(ref2.getTarget()).not.toBeNull();
  });
});
