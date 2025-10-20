import { XmlSchemaAnnotated } from '../XmlSchemaAnnotated';

export abstract class XmlSchemaParticle extends XmlSchemaAnnotated {
  static readonly DEFAULT_MAX_OCCURS = 1;
  static readonly DEFAULT_MIN_OCCURS = 1;

  private maxOccurs: number | string = XmlSchemaParticle.DEFAULT_MAX_OCCURS;
  private maxOccursExplicit = false;
  private minOccurs: number | string = XmlSchemaParticle.DEFAULT_MIN_OCCURS;
  private minOccursExplicit = false;

  setMaxOccurs(maxOccurs: number | string) {
    this.maxOccurs = maxOccurs;
    this.maxOccursExplicit = true;
  }

  getMaxOccurs(): number | string {
    return this.maxOccurs;
  }

  isMaxOccursExplicit(): boolean {
    return this.maxOccursExplicit;
  }

  setMinOccurs(minOccurs: number | string) {
    this.minOccurs = minOccurs;
    this.minOccursExplicit = true;
  }

  getMinOccurs(): number | string {
    return this.minOccurs;
  }

  isMinOccursExplicit(): boolean {
    return this.minOccursExplicit;
  }
}
