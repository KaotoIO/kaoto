import { XmlSchemaAllMember } from './XmlSchemaAllMember';
import { XmlSchemaGroupParticle } from './XmlSchemaGroupParticle';

export class XmlSchemaAll extends XmlSchemaGroupParticle {
  private items: XmlSchemaAllMember[] = [];

  public getItems() {
    return this.items;
  }
}
