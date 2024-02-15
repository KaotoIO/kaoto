import {
  QName,
  XmlSchemaGroupParticle,
  XmlSchemaAllMember,
  XmlSchemaChoiceMember,
  XmlSchemaSequenceMember,
  XmlSchemaParticle,
} from '.';

/**
 * Class used within complex types that defines the reference to groups defined at the schema level.
 * Represents the World Wide Web Consortium (W3C) group element with ref attribute.
 */
export class XmlSchemaGroupRef
  extends XmlSchemaParticle
  implements XmlSchemaSequenceMember, XmlSchemaChoiceMember, XmlSchemaAllMember
{
  private particle: XmlSchemaGroupParticle | null = null;

  private refName: QName | null = null;

  getParticle() {
    return this.particle;
  }

  getRefName() {
    return this.refName;
  }

  setRefName(refName: QName) {
    this.refName = refName;
  }

  setParticle(particle: XmlSchemaGroupParticle) {
    this.particle = particle;
  }
}
