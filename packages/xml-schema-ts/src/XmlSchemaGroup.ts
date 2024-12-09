import type { XmlSchema } from './XmlSchema';
import type { XmlSchemaAllMember } from './particle/XmlSchemaAllMember';
import type { XmlSchemaChoiceMember } from './particle/XmlSchemaChoiceMember';
import type { XmlSchemaGroupParticle } from './particle/XmlSchemaGroupParticle';
import type { XmlSchemaSequenceMember } from './particle/XmlSchemaSequenceMember';
import type { XmlSchemaNamed } from './utils/XmlSchemaNamed';

import { XmlSchemaAnnotated } from './XmlSchemaAnnotated';
import { XmlSchemaNamedImpl } from './utils/XmlSchemaNamedImpl';

export class XmlSchemaGroup
  extends XmlSchemaAnnotated
  implements XmlSchemaNamed, XmlSchemaChoiceMember, XmlSchemaSequenceMember, XmlSchemaAllMember
{
  private particle: XmlSchemaGroupParticle | null = null;
  private namedDelegate: XmlSchemaNamedImpl;

  constructor(parent: XmlSchema) {
    super();
    this.namedDelegate = new XmlSchemaNamedImpl(parent, true);
    const fParent = parent;
    fParent.getItems().push(this);
  }

  getParticle() {
    return this.particle;
  }

  setParticle(particle: XmlSchemaGroupParticle) {
    this.particle = particle;
  }

  getName() {
    return this.namedDelegate.getName();
  }

  getParent() {
    return this.namedDelegate.getParent();
  }

  getQName() {
    return this.namedDelegate.getQName();
  }

  isAnonymous() {
    return this.namedDelegate.isAnonymous();
  }

  isTopLevel() {
    return this.namedDelegate.isTopLevel();
  }

  setName(name: string | null) {
    const fName = name;
    if (this.getQName() != null) {
      this.getParent().getGroups().delete(this.getQName()!);
    }
    this.namedDelegate.setName(fName);
    if (fName != null) {
      this.getParent().getGroups().set(this.getQName()!, this);
    }
  }
}
