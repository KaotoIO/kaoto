import { XmlSchemaAnnotated } from '../XmlSchemaAnnotated';

export abstract class XmlSchemaFacet extends XmlSchemaAnnotated {
  fixed: boolean | undefined;
  value: object | string | number | bigint | null;

  constructor(value?: object | string | number | bigint | null, fixed?: boolean) {
    super();
    this.value = value || null;
    this.fixed = fixed;
  }

  getValue(): object | string | number | bigint | null {
    return this.value;
  }
  isFixed(): boolean {
    return !!this.fixed && this.fixed;
  }
  setFixed(fixed: boolean) {
    this.fixed = fixed;
  }
  setValue(value: object | string | number | bigint | null) {
    this.value = value;
  }
}
