import { XmlSchemaAnnotated } from '../XmlSchemaAnnotated';

type FacetValue = object | string | number | bigint | null;

export abstract class XmlSchemaFacet extends XmlSchemaAnnotated {
  fixed: boolean | undefined;
  value: FacetValue;

  constructor(value?: FacetValue, fixed?: boolean) {
    super();
    this.value = value || null;
    this.fixed = fixed;
  }

  getValue(): FacetValue {
    return this.value;
  }
  isFixed(): boolean {
    return !!this.fixed && this.fixed;
  }
  setFixed(fixed: boolean) {
    this.fixed = fixed;
  }
  setValue(value: FacetValue) {
    this.value = value;
  }
}
