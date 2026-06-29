import { XmlSchemaAllMember } from './XmlSchemaAllMember';
import { XmlSchemaGroupParticle } from './XmlSchemaGroupParticle';

export class XmlSchemaAll extends XmlSchemaGroupParticle {
  private readonly items: XmlSchemaAllMember[] = [];

  public getItems() {
    return this.items;
  }
}
