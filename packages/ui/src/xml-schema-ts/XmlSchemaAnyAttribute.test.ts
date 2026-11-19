import { XmlSchemaComplexType } from './complex/XmlSchemaComplexType';
import { XmlSchemaAnyAttribute } from './XmlSchemaAnyAttribute';
import { XmlSchemaCollection } from './XmlSchemaCollection';
import { XmlSchemaContentProcessing } from './XmlSchemaContentProcessing';

/** Reads a complex type `T` with the given `xs:anyAttribute` and returns it */
const readAnyAttribute = (anyAttribute: string) => {
  const schema = new XmlSchemaCollection().read(
    '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:test">' +
      `<xs:complexType name="T">${anyAttribute}</xs:complexType>` +
      '</xs:schema>',
    () => {},
  );
  return (schema.getTypeByName('T') as XmlSchemaComplexType).getAnyAttribute()!;
};

describe('XmlSchemaAnyAttribute', () => {
  it.each([
    [
      'with a namespace and content processing',
      '<xs:anyAttribute namespace="##other" processContents="lax"/>',
      '##other',
      XmlSchemaContentProcessing.LAX,
    ],
    ['without them', '<xs:anyAttribute/>', null, XmlSchemaContentProcessing.NONE],
  ])('reads an any attribute %s', (_, anyAttribute, namespace, processContent) => {
    const attribute = readAnyAttribute(anyAttribute);

    expect(attribute.getNamespace()).toBe(namespace);
    expect(attribute.getProcessContent()).toBe(processContent);
  });

  it('keeps the namespace and the content processing that are set', () => {
    const attribute = new XmlSchemaAnyAttribute();

    attribute.setNamespace('##local');
    attribute.setProcessContent(XmlSchemaContentProcessing.STRICT);

    expect(attribute.getNamespace()).toBe('##local');
    expect(attribute.getProcessContent()).toBe(XmlSchemaContentProcessing.STRICT);
  });
});
