import { XmlSchemaComplexType } from '../complex/XmlSchemaComplexType';
import { QName } from '../QName';
import { XmlSchema } from '../XmlSchema';
import { XmlSchemaCollection } from '../XmlSchemaCollection';
import { XmlSchemaDerivationMethod } from '../XmlSchemaDerivationMethod';
import { XmlSchemaForm } from '../XmlSchemaForm';
import { XmlSchemaElement } from './XmlSchemaElement';
import { XmlSchemaSequence } from './XmlSchemaSequence';

const NS = 'urn:test';
const q = (localPart: string) => new QName(NS, localPart);

const read = (content: string): XmlSchema =>
  new XmlSchemaCollection().read(
    `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${NS}" xmlns:t="${NS}">${content}</xs:schema>`,
    () => {},
  );

const globalElement = (schema: XmlSchema, name: string) => schema.getElements().get(q(name))!;

/** The first element in the sequence of the complex type `C` */
const localElement = (schema: XmlSchema) =>
  (
    (schema.getTypeByName('C') as XmlSchemaComplexType).getParticle() as XmlSchemaSequence
  ).getItems()[0] as XmlSchemaElement;

describe('XmlSchemaElement', () => {
  it('reads the default and the fixed value', () => {
    const schema = read(
      '<xs:element name="a" type="xs:string" default="x"/><xs:element name="b" type="xs:string" fixed="y"/>',
    );

    expect(globalElement(schema, 'a').getDefaultValue()).toBe('x');
    expect(globalElement(schema, 'b').getFixedValue()).toBe('y');
  });

  it('reads the block and the final derivation', () => {
    const schema = read('<xs:element name="a" type="xs:string" block="extension" final="#all"/>');

    const element = globalElement(schema, 'a');

    expect(element.getBlock().isExtension()).toBe(true);
    expect(element.getFinal().isAll()).toBe(true);
    expect(element.getFinalDerivation().isAll()).toBe(true);
  });

  it('reads an abstract element', () => {
    const schema = read('<xs:element name="a" type="xs:string" abstract="true"/>');

    const element = globalElement(schema, 'a');

    expect(element.isAbstract()).toBe(true);
    expect(element.isAbstractElement()).toBe(true);
  });

  it.each([
    ['with a form', 'form="qualified"', true, XmlSchemaForm.QUALIFIED],
    ['without a form', '', false, XmlSchemaForm.UNQUALIFIED],
  ])('reads a local element %s', (_, form, specified, effectiveForm) => {
    const schema = read(
      `<xs:complexType name="C"><xs:sequence><xs:element name="a" type="xs:string" ${form}/></xs:sequence></xs:complexType>`,
    );

    const element = localElement(schema);

    expect(element.isFormSpecified()).toBe(specified);
    expect(element.getForm()).toBe(effectiveForm);
  });

  describe('references', () => {
    it('is an anonymous reference to the global element it refers to', () => {
      const schema = read(
        '<xs:element name="item" type="xs:string"/><xs:complexType name="C"><xs:sequence><xs:element ref="t:item"/></xs:sequence></xs:complexType>',
      );

      const element = localElement(schema);

      expect(element.isRef()).toBe(true);
      expect(element.isAnonymous()).toBe(true);
      expect(element.getTargetQName()?.toString()).toBe(q('item').toString());
      expect(element.getRefBase()).toBe(element.getRef());
    });

    it('is a named element and no reference when it declares itself', () => {
      const schema = read(
        '<xs:complexType name="C"><xs:sequence><xs:element name="item" type="xs:string"/></xs:sequence></xs:complexType>',
      );

      const element = localElement(schema);

      expect(element.isRef()).toBe(false);
      expect(element.isAnonymous()).toBe(false);
      expect(element.getTargetQName()).toBeNull();
    });
  });

  it('moves a global element to its new name in the schema when it is renamed', () => {
    const schema = read('');
    const element = new XmlSchemaElement(schema, true);
    element.setName('old');

    element.setName('new');

    expect(schema.getElements().get(q('old'))).toBeUndefined();
    expect(schema.getElements().get(q('new'))).toBe(element);
  });

  it('shares the final derivation and the abstract flag between their two setters', () => {
    const element = new XmlSchemaElement(read(''), false);
    const all = XmlSchemaDerivationMethod.schemaValueOf('#all');

    element.setFinal(all);
    element.setAbstract(true);

    expect(element.getFinalDerivation()).toBe(all);
    expect(element.isAbstractElement()).toBe(true);
  });
});
