import { XmlSchemaSimpleType } from '../simple/XmlSchemaSimpleType';
import { XmlSchemaSimpleTypeRestriction } from '../simple/XmlSchemaSimpleTypeRestriction';
import { XmlSchemaCollection } from '../XmlSchemaCollection';
import { XmlSchemaEnumerationFacet } from './XmlSchemaEnumerationFacet';
import { XmlSchemaFacet } from './XmlSchemaFacet';
import { XmlSchemaFractionDigitsFacet } from './XmlSchemaFractionDigitsFacet';
import { XmlSchemaLengthFacet } from './XmlSchemaLengthFacet';
import { XmlSchemaMaxExclusiveFacet } from './XmlSchemaMaxExclusiveFacet';
import { XmlSchemaMaxInclusiveFacet } from './XmlSchemaMaxInclusiveFacet';
import { XmlSchemaMaxLengthFacet } from './XmlSchemaMaxLengthFacet';
import { XmlSchemaMinExclusiveFacet } from './XmlSchemaMinExclusiveFacet';
import { XmlSchemaMinInclusiveFacet } from './XmlSchemaMinInclusiveFacet';
import { XmlSchemaMinLengthFacet } from './XmlSchemaMinLengthFacet';
import { XmlSchemaPatternFacet } from './XmlSchemaPatternFacet';
import { XmlSchemaTotalDigitsFacet } from './XmlSchemaTotalDigitsFacet';
import { XmlSchemaWhiteSpaceFacet } from './XmlSchemaWhiteSpaceFacet';

/** Reads a simple type `T` restricting `xs:string` with the given facets and returns them */
const readFacets = (facets: string): XmlSchemaFacet[] => {
  const schema = new XmlSchemaCollection().read(
    '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:test">' +
      `<xs:simpleType name="T"><xs:restriction base="xs:string">${facets}</xs:restriction></xs:simpleType>` +
      '</xs:schema>',
    () => {},
  );
  const type = schema.getTypeByName('T') as XmlSchemaSimpleType;
  return (type.getContent() as XmlSchemaSimpleTypeRestriction).getFacets();
};

describe('XmlSchemaFacetConstructor', () => {
  it.each<[string, new () => XmlSchemaFacet]>([
    ['enumeration', XmlSchemaEnumerationFacet],
    ['fractionDigits', XmlSchemaFractionDigitsFacet],
    ['length', XmlSchemaLengthFacet],
    ['maxExclusive', XmlSchemaMaxExclusiveFacet],
    ['maxInclusive', XmlSchemaMaxInclusiveFacet],
    ['maxLength', XmlSchemaMaxLengthFacet],
    ['minExclusive', XmlSchemaMinExclusiveFacet],
    ['minInclusive', XmlSchemaMinInclusiveFacet],
    ['minLength', XmlSchemaMinLengthFacet],
    ['pattern', XmlSchemaPatternFacet],
    ['totalDigits', XmlSchemaTotalDigitsFacet],
    ['whiteSpace', XmlSchemaWhiteSpaceFacet],
  ])('constructs a %s facet with its value', (name, facetClass) => {
    const [facet] = readFacets(`<xs:${name} value="5"/>`);

    expect(facet).toBeInstanceOf(facetClass);
    expect(facet.getValue()).toBe('5');
  });

  it.each([
    ['a fixed facet with an id', 'fixed="true" id="len"', true, 'len'],
    ['a facet that is not fixed and has no id', 'fixed="false"', false, undefined],
  ])('reads %s', (_, attributes, fixed, id) => {
    const [facet] = readFacets(`<xs:length value="5" ${attributes}/>`);

    expect(facet.isFixed()).toBe(fixed);
    expect(facet.getId()).toBe(id);
  });

  it('rejects an element that is no facet', () => {
    expect(() => readFacets('<xs:unknown value="5"/>')).toThrow('Incorrect facet with name "unknown" found.');
  });
});
