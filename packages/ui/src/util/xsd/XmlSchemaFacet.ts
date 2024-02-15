import { XmlSchemaAnnotated } from '.';
import { XmlElement } from '../xml';

export abstract class XmlSchemaFacet extends XmlSchemaAnnotated {
  fixed: boolean | undefined;
  value: object | string | number | bigint | undefined;

  constructor(value?: object | string | number | bigint, fixed?: boolean) {
    super();
    this.value = value;
    this.fixed = fixed;
  }

  static construct(el: XmlElement) {
    const name = el.getLocalName();
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

  getValue(): object | string | undefined {
    return this.value;
  }
  isFixed(): boolean {
    return !!this.fixed && this.fixed;
  }
  setFixed(fixed: boolean) {
    this.fixed = fixed;
  }
  setValue(value: object) {
    this.value = value;
  }
}
export class XmlSchemaWhiteSpaceFacet extends XmlSchemaFacet {}
export abstract class XmlSchemaNumericFacet extends XmlSchemaFacet {}
export class XmlSchemaFractionDigitsFacet extends XmlSchemaNumericFacet {}
export class XmlSchemaMaxInclusiveFacet extends XmlSchemaFacet {}
export class XmlSchemaMinInclusiveFacet extends XmlSchemaFacet {}
export class XmlSchemaPatternFacet extends XmlSchemaFacet {}
export class XmlSchemaEnumerationFacet extends XmlSchemaFacet {}
export class XmlSchemaLengthFacet extends XmlSchemaFacet {}
export class XmlSchemaMaxLengthFacet extends XmlSchemaFacet {}
export class XmlSchemaMinLengthFacet extends XmlSchemaFacet {}
export class XmlSchemaMaxExclusiveFacet extends XmlSchemaFacet {}
export class XmlSchemaMinExclusiveFacet extends XmlSchemaFacet {}
export class XmlSchemaTotalDigitsFacet extends XmlSchemaFacet {}
