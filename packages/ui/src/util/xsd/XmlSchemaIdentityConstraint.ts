import { QName, XmlSchemaAnnotated } from '.';

export class XmlSchemaIdentityConstraint extends XmlSchemaAnnotated {
  private fields: XmlSchemaXPath = [];

  private name: string | null = null;

  private selector: XmlSchemaXPath | null = null;

  getFields() {
    return this.fields;
  }

  getName() {
    return this.name;
  }

  getSelector() {
    return this.selector;
  }

  setName(name: string) {
    this.name = name;
  }

  setSelector(selector: XmlSchemaXPath) {
    this.selector = selector;
  }

  setFields(fields: XmlSchemaXPath) {
    this.fields = fields;
  }
}

export class XmlSchemaKey extends XmlSchemaIdentityConstraint {}

export class XmlSchemaKeyref extends XmlSchemaIdentityConstraint {
  refer: QName | null = null;

  getRefer() {
    return this.refer;
  }

  setRefer(refer: QName) {
    this.refer = refer;
  }
}

export class XmlSchemaUnique extends XmlSchemaIdentityConstraint {}
