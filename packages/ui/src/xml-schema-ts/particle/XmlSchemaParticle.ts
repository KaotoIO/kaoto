import { XmlSchemaAnnotated } from '../XmlSchemaAnnotated';

export abstract class XmlSchemaParticle extends XmlSchemaAnnotated {
  static readonly DEFAULT_MAX_OCCURS = 1;
  static readonly DEFAULT_MIN_OCCURS = 1;

  private maxOccurs = XmlSchemaParticle.DEFAULT_MAX_OCCURS;
  private minOccurs = XmlSchemaParticle.DEFAULT_MIN_OCCURS;

  setMaxOccurs(maxOccurs: number) {
    this.maxOccurs = maxOccurs;
  }

  getMaxOccurs() {
    return this.maxOccurs;
  }

  setMinOccurs(minOccurs: number) {
    this.minOccurs = minOccurs;
  }

  getMinOccurs() {
    return this.minOccurs;
  }
}
