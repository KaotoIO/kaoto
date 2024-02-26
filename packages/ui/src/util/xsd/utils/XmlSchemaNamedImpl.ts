import type { XmlSchema } from '../XmlSchema';
import type { XmlSchemaNamed } from './XmlSchemaNamed';
import type { XmlSchemaRefBase } from './XmlSchemaRefBase';
import { QName } from '../QName';

export class XmlSchemaNamedImpl implements XmlSchemaNamed {
  protected parentSchema: XmlSchema;
  /*
   * Some objects implement both name= and ref=. This reference allows us some error
   * checking.
   */
  protected refTwin?: XmlSchemaRefBase;
  // Store the name as a QName for the convenience of QName fans.
  private qname: QName | null = null;
  private topLevel: boolean = false;

  /**
   * Create a new named object.
   * @param parent the parent schema.
   * @param topLevel
   */
  constructor(parent: XmlSchema, topLevel: boolean) {
    this.parentSchema = parent;
    this.topLevel = topLevel;
  }

  /**
   * If the named object also implements ref=, it should pass the reference object
   * here for some error checking.
   * @param refBase
   */
  setRefObject(refBase: XmlSchemaRefBase) {
    this.refTwin = refBase;
  }

  getName() {
    if (this.qname == null) {
      return null;
    } else {
      return this.qname.getLocalPart();
    }
  }

  isAnonymous() {
    return this.qname == null;
  }

  setName(name: string | null) {
    if (name == null) {
      this.qname = null;
    } else if ('' === name) {
      throw new Error('Attempt to set empty name.');
    } else {
      if (this.refTwin != null && this.refTwin.getTargetQName() != null) {
        throw new Error("Attempt to set name on object with ref='xxx'");
      }
      this.qname = new QName(this.parentSchema.getLogicalTargetNamespace(), name);
    }
  }

  getParent() {
    return this.parentSchema;
  }

  getQName() {
    return this.qname;
  }

  public isTopLevel() {
    return this.topLevel;
  }
}
