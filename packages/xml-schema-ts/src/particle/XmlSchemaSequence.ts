/**
 * Requires the elements in the group to appear in the specified sequence within the containing element.
 * Represents the World Wide Web Consortium (W3C) sequence (compositor) element.
 *
 * (element|group|choice|sequence|any)
 */
import { XmlSchemaSequenceMember } from './XmlSchemaSequenceMember';
import { XmlSchemaChoiceMember } from './XmlSchemaChoiceMember';
import { XmlSchemaGroupParticle } from './XmlSchemaGroupParticle';

export class XmlSchemaSequence
  extends XmlSchemaGroupParticle
  implements XmlSchemaChoiceMember, XmlSchemaSequenceMember
{
  private items: XmlSchemaSequenceMember[] = [];

  /**
   * The elements contained within the compositor. Collection of XmlSchemaElement, XmlSchemaGroupRef,
   * XmlSchemaChoice, XmlSchemaSequence, or XmlSchemaAny.
   */
  getItems() {
    return this.items;
  }
}
