import { QName } from '../QName';
import { XmlSchema } from '../XmlSchema';
import { XmlSchemaCollection } from '../XmlSchemaCollection';
import { XmlSchemaNamedType } from './XmlSchemaNamedType';
import { XmlSchemaRef } from './XmlSchemaRef';

describe('XmlSchemaRef', () => {
  it('should resolve target from parent schema before falling back to collection', () => {
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

  it('should fall back to parent collection if not found in parent schema hierarchy', () => {
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
