import { XmlSchemaAnnotated } from '../XmlSchemaAnnotated';
import { MaxOccursType } from '../constants';

export abstract class XmlSchemaParticle extends XmlSchemaAnnotated {
  static readonly DEFAULT_MAX_OCCURS = 1;
  static readonly DEFAULT_MIN_OCCURS = 1;

  private maxOccurs: MaxOccursType = XmlSchemaParticle.DEFAULT_MAX_OCCURS;
  private maxOccursExplicit = false;
  private minOccurs: number = XmlSchemaParticle.DEFAULT_MIN_OCCURS;
  private minOccursExplicit = false;

  setMaxOccurs(maxOccurs: MaxOccursType) {
    this.maxOccurs = maxOccurs;
    this.maxOccursExplicit = true;
  }

  getMaxOccurs(): MaxOccursType {
    return this.maxOccurs;
  }

  isMaxOccursExplicit(): boolean {
    return this.maxOccursExplicit;
  }

  setMinOccurs(minOccurs: number) {
    this.minOccurs = minOccurs;
    this.minOccursExplicit = true;
  }

  getMinOccurs(): number {
    return this.minOccurs;
  }

  isMinOccursExplicit(): boolean {
    return this.minOccursExplicit;
  }
}
