import { XmlSchemaAllMember, XmlSchemaGroupParticle } from '.';

export class XmlSchemaAll extends XmlSchemaGroupParticle {
  private items: XmlSchemaAllMember[] = [];

  public getItems() {
    return this.items;
  }
}
