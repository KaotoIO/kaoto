import type { XmlSchema } from '../XmlSchema';
import type { XmlSchemaAnyAttribute } from '../XmlSchemaAnyAttribute';
import type { XmlSchemaAttributeGroupMember } from './XmlSchemaAttributeGroupMember';
import type { XmlSchemaNamed } from '../utils/XmlSchemaNamed';
import { XmlSchemaAnnotated } from '../XmlSchemaAnnotated';
import { XmlSchemaNamedImpl } from '../utils/XmlSchemaNamedImpl';

export class XmlSchemaAttributeGroup
  extends XmlSchemaAnnotated
  implements XmlSchemaNamed, XmlSchemaAttributeGroupMember
{
  private anyAttribute: XmlSchemaAnyAttribute | null = null;
  private attributes: XmlSchemaAttributeGroupMember[] = [];
  private namedDelegate: XmlSchemaNamedImpl;

  /**
   * Creates new XmlSchemaAttributeGroup
   */
  constructor(parent: XmlSchema) {
    super();
    const fParent = parent;
    this.namedDelegate = new XmlSchemaNamedImpl(parent, true);
    fParent.getItems().push(this);
  }

  getAnyAttribute() {
    return this.anyAttribute;
  }

  setAnyAttribute(anyAttribute: XmlSchemaAnyAttribute) {
    this.anyAttribute = anyAttribute;
  }

  getAttributes() {
    return this.attributes;
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

  setName(name: string) {
    const fName = name;
    if (fName != null) {
      this.getQName() != null && this.getParent().getAttributeGroups().delete(this.getQName()!);
    }
    this.namedDelegate.setName(fName);
    this.getQName() != null && this.getParent().getAttributeGroups().set(this.getQName()!, this);
  }
}
