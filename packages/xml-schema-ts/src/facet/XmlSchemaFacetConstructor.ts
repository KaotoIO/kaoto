import { XmlSchemaFacet } from './XmlSchemaFacet';
import { XmlSchemaEnumerationFacet } from './XmlSchemaEnumerationFacet';
import { XmlSchemaFractionDigitsFacet } from './XmlSchemaFractionDigitsFacet';
import { XmlSchemaLengthFacet } from './XmlSchemaLengthFacet';
import { XmlSchemaMaxExclusiveFacet } from './XmlSchemaMaxExclusiveFacet';
import { XmlSchemaMaxInclusiveFacet } from './XmlSchemaMaxInclusiveFacet';
import { XmlSchemaMaxLengthFacet } from './XmlSchemaMaxLengthFacet';
import { XmlSchemaMinLengthFacet } from './XmlSchemaMinLengthFacet';
import { XmlSchemaMinExclusiveFacet } from './XmlSchemaMinExclusiveFacet';
import { XmlSchemaMinInclusiveFacet } from './XmlSchemaMinInclusiveFacet';
import { XmlSchemaPatternFacet } from './XmlSchemaPatternFacet';
import { XmlSchemaTotalDigitsFacet } from './XmlSchemaTotalDigitsFacet';
import { XmlSchemaWhiteSpaceFacet } from './XmlSchemaWhiteSpaceFacet';

export class XmlSchemaFacetConstructor {
  static construct(el: Element) {
    const name = el.localName;
    let fixed = false;
    if (el.getAttribute('fixed') === 'true') {
      fixed = true;
    }
    let facet: XmlSchemaFacet;
    if ('enumeration' === name) {
      facet = new XmlSchemaEnumerationFacet();
    } else if ('fractionDigits' === name) {
      facet = new XmlSchemaFractionDigitsFacet();
    } else if ('length' === name) {
      facet = new XmlSchemaLengthFacet();
    } else if ('maxExclusive' === name) {
      facet = new XmlSchemaMaxExclusiveFacet();
    } else if ('maxInclusive' === name) {
      facet = new XmlSchemaMaxInclusiveFacet();
    } else if ('maxLength' === name) {
      facet = new XmlSchemaMaxLengthFacet();
    } else if ('minLength' === name) {
      facet = new XmlSchemaMinLengthFacet();
    } else if ('minExclusive' === name) {
      facet = new XmlSchemaMinExclusiveFacet();
    } else if ('minInclusive' === name) {
      facet = new XmlSchemaMinInclusiveFacet();
    } else if ('pattern' === name) {
      facet = new XmlSchemaPatternFacet();
    } else if ('totalDigits' === name) {
      facet = new XmlSchemaTotalDigitsFacet();
    } else if ('whiteSpace' === name) {
      facet = new XmlSchemaWhiteSpaceFacet();
    } else {
      throw new Error('Incorrect facet with name "' + name + '" found.');
    }
    if (el.hasAttribute('id')) {
      facet.setId(el.getAttribute('id'));
    }
    facet.setFixed(fixed);
    facet.setValue(el.getAttribute('value'));
    return facet;
  }
}
