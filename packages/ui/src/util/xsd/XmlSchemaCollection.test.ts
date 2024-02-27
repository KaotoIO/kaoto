import { XmlSchemaCollection } from './XmlSchemaCollection';
import fs from 'fs';
import { QName } from './QName';
import { XmlSchemaComplexType } from './complex/XmlSchemaComplexType';
import { XmlSchemaAttribute } from './attribute/XmlSchemaAttribute';

describe('XmlSchemaCollection', () => {
  const orderXsd = fs.readFileSync(__dirname + '/../../../test-resources/ShipOrder.xsd').toString();
  it('should parse XML schema', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(orderXsd, () => {});
    const attributes = xmlSchema.getAttributes();
    expect(attributes.size).toEqual(0);

    const elements = xmlSchema.getElements();
    expect(elements.size).toEqual(1);
    const shipOrderElement = elements.get(new QName('io.kaoto.datamapper.poc.test', 'ShipOrder'));
    const shipOrderComplexType = shipOrderElement!.getSchemaType() as XmlSchemaComplexType;
    const shipOrderAttributes = shipOrderComplexType.getAttributes();
    expect(shipOrderAttributes.length).toBe(1);
    const orderIdAttr = shipOrderAttributes[0] as XmlSchemaAttribute;
    expect(orderIdAttr.getName()).toEqual('OrderId');
    expect(orderIdAttr.getSchemaType()).toBeNull();
    expect(orderIdAttr.getSchemaTypeName()?.getLocalPart()).toEqual('string');
    //expect(orderIdAttr.getUse()).toEqual('required');
    expect(orderIdAttr.getFixedValue()).toEqual('2');
    const shipOrderParticle = shipOrderComplexType.getParticle();
    expect(shipOrderParticle).toBeDefined();
  });
});
