import {
  camelSpringXsd,
  namedTypesXsd,
  restrictionInheritanceXsd,
  shipOrderEmptyFirstLineXsd,
  shipOrderXsd,
  testDocumentXsd,
} from '../stubs/datamapper/data-mapper';
import { XmlSchemaAttribute } from './attribute/XmlSchemaAttribute';
import { XmlSchemaAttributeGroupRef } from './attribute/XmlSchemaAttributeGroupRef';
import { XmlSchemaComplexContentExtension } from './complex/XmlSchemaComplexContentExtension';
import { XmlSchemaComplexContentRestriction } from './complex/XmlSchemaComplexContentRestriction';
import { XmlSchemaComplexType } from './complex/XmlSchemaComplexType';
import { XmlSchemaElement } from './particle/XmlSchemaElement';
import { XmlSchemaSequence } from './particle/XmlSchemaSequence';
import { QName } from './QName';
import { XmlSchemaSimpleType } from './simple/XmlSchemaSimpleType';
import { XmlSchemaCollection } from './XmlSchemaCollection';
import { XmlSchemaUse } from './XmlSchemaUse';

describe('XmlSchemaCollection', () => {
  it('should parse ShipOrder XML schema', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(shipOrderXsd, () => {});
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
    expect(item.getMaxOccurs()).toBe('unbounded');
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
    const xmlSchema = collection.read(testDocumentXsd, () => {});
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
    expect(element1Simple1.getWireName()?.getNamespaceURI()).toEqual('');
    expect(element1Simple1.getWireName()?.getLocalPart()).toEqual('Element1Simple1');
  });

  it('should parse camel-spring XML schema', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(camelSpringXsd, () => {});
    const aggregate = xmlSchema.getElements().get(new QName('http://camel.apache.org/schema/spring', 'aggregate'));
    const aggregateComplexType = aggregate!.getSchemaType() as XmlSchemaComplexType;
    expect(aggregateComplexType.getParticle()).toBeNull();
    const aggregateComplexContent = aggregateComplexType
      .getContentModel()
      ?.getContent() as XmlSchemaComplexContentExtension;
    expect(aggregateComplexContent.getBaseTypeName()?.getLocalPart()).toEqual('output');
    expect(aggregateComplexContent.getAttributes().length).toEqual(22);
    const particle = aggregateComplexContent.getParticle() as XmlSchemaSequence;
    expect(particle.getItems().length).toEqual(6);
  });

  it('should parse ShipOrderEmptyFirstLine.xsd', () => {
    const collection = new XmlSchemaCollection();
    try {
      collection.read(shipOrderEmptyFirstLineXsd, () => {});
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((error as any).message).toContain('an XML declaration must be at the start of the document');
      return;
    }
    fail('No error was thrown');
  });

  it('should track explicit minOccurs/maxOccurs flags in ShipOrder elements', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(shipOrderXsd, () => {});

    const shipOrderElement = xmlSchema.getElements().get(new QName('io.kaoto.datamapper.poc.test', 'ShipOrder'));
    expect(shipOrderElement).toBeDefined();
    expect(shipOrderElement!.getMinOccurs()).toEqual(1);
    expect(shipOrderElement!.getMaxOccurs()).toEqual(1);
    expect(shipOrderElement!.isMinOccursExplicit()).toBe(false);
    expect(shipOrderElement!.isMaxOccursExplicit()).toBe(false);

    const shipOrderComplexType = shipOrderElement!.getSchemaType() as XmlSchemaComplexType;
    const shipOrderSequence = shipOrderComplexType.getParticle() as XmlSchemaSequence;
    const item = shipOrderSequence.getItems()[2] as XmlSchemaElement;
    expect(item.getName()).toEqual('Item');
    expect(item.getMaxOccurs()).toBe('unbounded');
    expect(item.isMaxOccursExplicit()).toBe(true);
    expect(item.isMinOccursExplicit()).toBe(false);

    const itemSchemaType = item.getSchemaType() as XmlSchemaComplexType;
    const itemSequence = itemSchemaType.getParticle() as XmlSchemaSequence;
    const itemNote = itemSequence.getItems()[1] as XmlSchemaElement;
    expect(itemNote.getName()).toEqual('Note');
    expect(itemNote.getMinOccurs()).toEqual(0);
    expect(itemNote.isMinOccursExplicit()).toBe(true);
    expect(itemNote.isMaxOccursExplicit()).toBe(false);
  });

  it('should correctly handle explicit flags in RestrictionInheritance.xsd', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(restrictionInheritanceXsd, () => {});

    const restrictedType = xmlSchema
      .getSchemaTypes()
      .get(new QName('http://www.example.com/INHERIT', 'RestrictedType')) as XmlSchemaComplexType;
    expect(restrictedType).toBeDefined();

    const complexContentRestriction = restrictedType.getContentModel()?.getContent();
    expect(complexContentRestriction).toBeDefined();

    const restrictionParticle = (
      complexContentRestriction as XmlSchemaComplexContentRestriction
    ).getParticle() as XmlSchemaSequence;
    expect(restrictionParticle).toBeDefined();

    const restrictionElements = restrictionParticle.getItems();
    expect(restrictionElements.length).toEqual(3);

    const requiredElement = restrictionElements[1] as XmlSchemaElement;
    expect(requiredElement).toBeDefined();
    expect(requiredElement.getName()).toEqual('required');
    expect(requiredElement.isMinOccursExplicit()).toBe(false);
    expect(requiredElement.isMaxOccursExplicit()).toBe(false);

    const optionalElement = restrictionElements[2] as XmlSchemaElement;
    expect(optionalElement).toBeDefined();
    expect(optionalElement.getName()).toEqual('optional');
    expect(optionalElement.getMaxOccurs()).toEqual(3);
    expect(optionalElement.isMaxOccursExplicit()).toBe(true);
    expect(optionalElement.isMinOccursExplicit()).toBe(false);
  });

  it('should handle explicit flags in sequence particles', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(shipOrderXsd, () => {});

    const shipOrderElement = xmlSchema.getElements().get(new QName('io.kaoto.datamapper.poc.test', 'ShipOrder'));
    const shipOrderComplexType = shipOrderElement!.getSchemaType() as XmlSchemaComplexType;
    const shipOrderSequence = shipOrderComplexType.getParticle() as XmlSchemaSequence;

    expect(shipOrderSequence.getMinOccurs()).toEqual(1);
    expect(shipOrderSequence.getMaxOccurs()).toEqual(1);
    expect(shipOrderSequence.isMinOccursExplicit()).toBe(false);
    expect(shipOrderSequence.isMaxOccursExplicit()).toBe(false);
  });
});
