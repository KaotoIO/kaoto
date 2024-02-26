import type { XmlSchemaXPath } from '../XmlSchemaXPath';
import { XmlSchemaAnnotated } from '../XmlSchemaAnnotated';

export class XmlSchemaIdentityConstraint extends XmlSchemaAnnotated {
  private fields: XmlSchemaXPath[] = [];

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

  setFields(fields: XmlSchemaXPath[]) {
    this.fields = fields;
  }
}
