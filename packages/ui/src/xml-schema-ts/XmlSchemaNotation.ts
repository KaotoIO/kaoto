import type { XmlSchema } from './XmlSchema';
import type { XmlSchemaNamed } from './utils/XmlSchemaNamed';
import { XmlSchemaAnnotated } from './XmlSchemaAnnotated';
import { XmlSchemaNamedImpl } from './utils/XmlSchemaNamedImpl';

export class XmlSchemaNotation extends XmlSchemaAnnotated implements XmlSchemaNamed {
  private system: string | null = null;
  private publicNotation: string | null = null;
  private namedDelegate: XmlSchemaNamedImpl;

  /**
   * Creates new XmlSchemaNotation
   */
  constructor(parent: XmlSchema) {
    super();
    this.namedDelegate = new XmlSchemaNamedImpl(parent, true);
    const fParent = parent;
    fParent.getItems().push(this);
  }

  getPublic() {
    return this.publicNotation;
  }

  setPublic(isPublic: string) {
    this.publicNotation = isPublic;
  }

  getSystem() {
    return this.system;
  }

  setSystem(system: string) {
    this.system = system;
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

  setPublicNotation(publicNotation: string) {
    this.publicNotation = publicNotation;
  }

  getPublicNotation() {
    return this.publicNotation;
  }

  getName() {
    return this.namedDelegate.getName();
  }

  setName(name: string) {
    const fName = name;
    if (this.getName() != null) {
      this.getParent().getNotations().delete(this.getQName()!);
    }
    this.namedDelegate.setName(fName);
    this.getParent().getNotations().set(this.getQName()!, this);
  }
}
