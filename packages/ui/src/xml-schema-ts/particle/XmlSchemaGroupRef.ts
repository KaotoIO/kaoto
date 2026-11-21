import type { QName } from '../QName';
import type { XmlSchema } from '../XmlSchema';
import type { XmlSchemaAllMember } from './XmlSchemaAllMember';
import type { XmlSchemaChoiceMember } from './XmlSchemaChoiceMember';
import type { XmlSchemaGroupParticle } from './XmlSchemaGroupParticle';
import { XmlSchemaParticle } from './XmlSchemaParticle';
import type { XmlSchemaSequenceMember } from './XmlSchemaSequenceMember';

/**
 * Class used within complex types that defines the reference to groups defined at the schema level.
 * Represents the World Wide Web Consortium (W3C) group element with ref attribute.
 */
export class XmlSchemaGroupRef
  extends XmlSchemaParticle
  implements XmlSchemaSequenceMember, XmlSchemaChoiceMember, XmlSchemaAllMember
{
  private parent: XmlSchema | null = null;
  private particle: XmlSchemaGroupParticle | null = null;
  private refName: QName | null = null;

  constructor(parent?: XmlSchema) {
    super();
    this.parent = parent ?? null;
    if (parent) {
      this.setSourceURI(parent.getSourceURI());
    }
  }

  getParent(): XmlSchema | null {
    return this.parent;
  }

  setParent(parent: XmlSchema | null) {
    this.parent = parent;
  }

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
