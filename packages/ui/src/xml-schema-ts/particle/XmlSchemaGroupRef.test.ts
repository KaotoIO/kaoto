import { QName } from '../QName';
import { XmlSchema } from '../XmlSchema';
import { XmlSchemaCollection } from '../XmlSchemaCollection';
import { XmlSchemaGroupRef } from './XmlSchemaGroupRef';
import { XmlSchemaSequence } from './XmlSchemaSequence';

const NS = 'urn:test';

describe('XmlSchemaGroupRef', () => {
  it('initializes with default values when no parent is provided', () => {
    const groupRef = new XmlSchemaGroupRef();

    expect(groupRef.getParent()).toBeNull();
    expect(groupRef.getSourceURI()).toBeNull();
    expect(groupRef.getParticle()).toBeNull();
    expect(groupRef.getRefName()).toBeNull();
  });

  it('inherits parent schema sourceURI when parent is provided', () => {
    const collection = new XmlSchemaCollection();
    const schema = collection.read(
      `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${NS}"/>`,
      () => {},
      'my-schema.xsd',
    );

    const groupRef = new XmlSchemaGroupRef(schema);

    expect(groupRef.getParent()).toBe(schema);
    expect(groupRef.getSourceURI()).toBe('my-schema.xsd');

    groupRef.setParent(null);
    expect(groupRef.getParent()).toBeNull();
  });

  it('manages refName and particle properties', () => {
    const groupRef = new XmlSchemaGroupRef();
    const refQName = new QName(NS, 'MyGroup');
    const sequence = new XmlSchemaSequence();

    groupRef.setRefName(refQName);
    groupRef.setParticle(sequence);

    expect(groupRef.getRefName()).toBe(refQName);
    expect(groupRef.getParticle()).toBe(sequence);
  });
});
