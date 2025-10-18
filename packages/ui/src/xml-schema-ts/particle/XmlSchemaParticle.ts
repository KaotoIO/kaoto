import { XmlSchemaAnnotated } from '../XmlSchemaAnnotated';

export abstract class XmlSchemaParticle extends XmlSchemaAnnotated {
  static readonly DEFAULT_MAX_OCCURS = 1;
  static readonly DEFAULT_MIN_OCCURS = 1;

  private maxOccurs = XmlSchemaParticle.DEFAULT_MAX_OCCURS;
  private maxOccursExplicit = false;
  private minOccurs = XmlSchemaParticle.DEFAULT_MIN_OCCURS;
  private minOccursExplicit = false;

  setMaxOccurs(maxOccurs: number) {
    this.maxOccurs = maxOccurs;
    this.maxOccursExplicit = true;
  }

  getMaxOccurs() {
    return this.maxOccurs;
  }

  isMaxOccursExplicit(): boolean {
    return this.maxOccursExplicit;
  }

  setMinOccurs(minOccurs: number) {
    this.minOccurs = minOccurs;
    this.minOccursExplicit = true;
  }

  getMinOccurs() {
    return this.minOccurs;
  }

  isMinOccursExplicit(): boolean {
    return this.minOccursExplicit;
  }
}
