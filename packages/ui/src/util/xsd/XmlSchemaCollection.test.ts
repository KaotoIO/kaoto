import { XmlSchemaCollection } from './XmlSchemaCollection';
import fs from 'fs';

describe('XmlSchemaCollection', () => {
  const orderXsd = fs.readFileSync(__dirname + '/../../../test-resources/ShipOrder.xsd').toString();
  it('should parse XML schema', () => {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(orderXsd, () => {});
    const elements = xmlSchema.getElements();
    expect(elements).toBeDefined();
  });
});
