import {
  XmlSchema,
  XmlSchemaAllMember,
  XmlSchemaAnnotated,
  XmlSchemaChoiceMember,
  XmlSchemaGroupParticle,
  XmlSchemaSequenceMember,
} from '.';
import { XmlSchemaNamed, XmlSchemaNamedImpl } from './utils';

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
