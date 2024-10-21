import { XmlSchemaCollection } from './XmlSchemaCollection';
import fs from 'fs';
import { QName } from './QName';
import { XmlSchemaComplexType } from './complex/XmlSchemaComplexType';
import { XmlSchemaAttribute } from './attribute/XmlSchemaAttribute';
import { XmlSchemaUse } from './XmlSchemaUse';
import { XmlSchemaSequence } from './particle/XmlSchemaSequence';
import { XmlSchemaElement } from './particle/XmlSchemaElement';
import { XmlSchemaAttributeGroupRef } from './attribute/XmlSchemaAttributeGroupRef';
import { XmlSchemaSimpleType } from './simple/XmlSchemaSimpleType';

describe('XmlSchemaCollection', () => {
  const orderXsd = fs.readFileSync(__dirname + '/../test-resources/ShipOrder.xsd').toString();
  const testXsd = fs.readFileSync(__dirname + '/../test-resources/TestDocument.xsd').toString();
  const namedTypesXsd = fs.readFileSync(__dirname + '/../test-resources/NamedTypes.xsd').toString();
  const camelSpringXsd = fs.readFileSync(__dirname + '/../test-resources/camel-spring.xsd').toString();

  it('should parse ShipOrder XML schema', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(orderXsd, () => {});
    const attributes = xmlSchema.getAttributes();
    expect(attributes.size).toEqual(0);

    const elements = xmlSchema.getElements();
    expect(elements.size).toEqual(1);
    const shipOrderElement = elements.get(new QName('io.kaoto.datamapper.poc.test', 'ShipOrder'));
    expect(shipOrderElement!.getName()).toEqual('ShipOrder');
    expect(shipOrderElement!.getWireName()?.getNamespaceURI()).toEqual('io.kaoto.datamapper.poc.test');
    expect(shipOrderElement!.getWireName()?.getLocalPart()).toEqual('ShipOrder');
    expect(shipOrderElement!.getMinOccurs()).toEqual(1);
    expect(shipOrderElement!.getMaxOccurs()).toEqual(1);
    const shipOrderComplexType = shipOrderElement!.getSchemaType() as XmlSchemaComplexType;
    const shipOrderAttributes = shipOrderComplexType.getAttributes();
    expect(shipOrderAttributes.length).toBe(1);
    const orderIdAttr = shipOrderAttributes[0] as XmlSchemaAttribute;
    expect(orderIdAttr.getName()).toEqual('OrderId');
    expect(orderIdAttr.getWireName()?.getNamespaceURI()).toBe('');
    expect(orderIdAttr.getWireName()?.getLocalPart()).toBe('OrderId');
    expect(orderIdAttr.getSchemaType()).toBeNull();
    expect(orderIdAttr.getSchemaTypeName()?.getLocalPart()).toEqual('string');
    expect(orderIdAttr.getUse()).toEqual(XmlSchemaUse.REQUIRED);
    expect(orderIdAttr.getFixedValue()).toEqual('2');

    const shipOrderSequence = shipOrderComplexType.getParticle() as XmlSchemaSequence;
    const shipOrderSequenceMembers = shipOrderSequence.getItems();
    expect(shipOrderSequenceMembers.length).toBe(3);

    const orderPerson = shipOrderSequenceMembers[0] as XmlSchemaElement;
    expect(orderPerson.getSchemaType() instanceof XmlSchemaSimpleType).toBeTruthy();
    expect(orderPerson.getSchemaTypeName()?.getLocalPart()).toEqual('string');
    expect(orderPerson.getName()).toEqual('OrderPerson');
    expect(orderPerson.getWireName()?.getNamespaceURI()).toEqual('io.kaoto.datamapper.poc.test');
    expect(orderPerson.getWireName()?.getLocalPart()).toEqual('OrderPerson');
    expect(orderPerson.getMinOccurs()).toEqual(1);
    expect(orderPerson.getMaxOccurs()).toEqual(1);

    const shipTo = shipOrderSequenceMembers[1] as XmlSchemaElement;
    const shipToSchemaType = shipTo.getSchemaType() as XmlSchemaComplexType;
    const shipToSequence = shipToSchemaType.getParticle() as XmlSchemaSequence;
    const shipToSequenceMenbers = shipToSequence.getItems();
    expect(shipToSequenceMenbers.length).toBe(4);
    expect(shipTo.getSchemaTypeName()).toBeNull();
    expect(shipTo.getName()).toEqual('ShipTo');
    expect(shipTo.getWireName()?.getNamespaceURI()).toEqual('');
    expect(shipTo.getWireName()?.getLocalPart()).toEqual('ShipTo');
    expect(shipTo.getMinOccurs()).toEqual(1);
    expect(shipTo.getMaxOccurs()).toEqual(1);

    const item = shipOrderSequenceMembers[2] as XmlSchemaElement;
    expect(item.getMaxOccurs()).toBe(Number.MAX_SAFE_INTEGER);
    const itemSchemaType = item.getSchemaType() as XmlSchemaComplexType;
    const itemSequence = itemSchemaType.getParticle() as XmlSchemaSequence;
    const itemSequenceMembers = itemSequence.getItems();
    expect(itemSequenceMembers.length).toEqual(4);
    const itemNote = itemSequenceMembers[1] as XmlSchemaElement;
    expect(itemNote.getMinOccurs()).toEqual(0);
    const itemQuantity = itemSequenceMembers[2] as XmlSchemaElement;
    expect(itemQuantity.getSchemaTypeName()?.getLocalPart()).toEqual('positiveInteger');
    const itemPrice = itemSequenceMembers[3] as XmlSchemaElement;
    expect(itemPrice.getSchemaTypeName()?.getLocalPart()).toEqual('decimal');
  });

  it('should parse TestDocument XML schema', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(testXsd, () => {});
    const attributes = xmlSchema.getAttributes();
    expect(attributes.size).toEqual(0);
    const elements = xmlSchema.getElements();
    expect(elements.size).toEqual(1);
    const testDocumentElement = elements.get(new QName('io.kaoto.datamapper.poc.test', 'TestDocument'));
    const testDocumentComplexType = testDocumentElement!.getSchemaType() as XmlSchemaComplexType;
    const testDocumentAttributes = testDocumentComplexType.getAttributes();
    expect(testDocumentAttributes.length).toBe(1);
    const attrGroupRef = (testDocumentAttributes[0] as XmlSchemaAttributeGroupRef).getRef();
    expect(attrGroupRef.getTarget()).toBeTruthy();
  });

  it('should parse NamedTypes XML schema', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(namedTypesXsd, () => {});
    const elements = xmlSchema.getElements();
    expect(elements.size).toEqual(1);
    const element1 = elements.get(new QName('io.kaoto.datamapper.poc.test', 'Element1'));
    const element1ComplexType = element1!.getSchemaType() as XmlSchemaComplexType;
    const element1Sequence = element1ComplexType.getParticle() as XmlSchemaSequence;
    const element1SequenceMembers = element1Sequence.getItems();
    expect(element1SequenceMembers.length).toEqual(1);
    const element1Simple1 = element1SequenceMembers[0] as XmlSchemaElement;
    const element1Simple1SchemaType = element1Simple1.getSchemaType();
    expect(element1Simple1.getWireName()?.getNamespaceURI()).toEqual('');
    expect(element1Simple1.getWireName()?.getLocalPart()).toEqual('Element1Simple1');
  });

  it('should parse camel-spring XML schema', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(camelSpringXsd, () => {});
    const aggregate = xmlSchema.getElements().get(new QName('http://camel.apache.org/schema/spring', 'aggregate'));
    const aggregateComplexType = aggregate!.getSchemaType() as XmlSchemaComplexType;
    expect(aggregateComplexType.getParticle()).toBeNull();
    const aggregateComplexContent = aggregateComplexType.getContentModel()?.getContent();
    // TODO
  });
});
