import { XmlSchemaChoiceMember } from './XmlSchemaChoiceMember';
import { XmlSchemaGroupParticle } from './XmlSchemaGroupParticle';
import { XmlSchemaSequenceMember } from './XmlSchemaSequenceMember';

/**
 * Allows only one of its children to appear in an instance. Represents the World Wide Web Consortium (W3C)
 * choice (compositor) element.
 *
 * This can contain any of (element|group|choice|sequence|any)*.
 */
export class XmlSchemaChoice extends XmlSchemaGroupParticle implements XmlSchemaChoiceMember, XmlSchemaSequenceMember {
  private items: XmlSchemaChoiceMember[] = [];

  public getItems() {
    return this.items;
  }
}
