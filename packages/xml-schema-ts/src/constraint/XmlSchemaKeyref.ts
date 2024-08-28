import type { QName } from '../QName';
import { XmlSchemaIdentityConstraint } from './XmlSchemaIdentityConstraint';

export class XmlSchemaKeyref extends XmlSchemaIdentityConstraint {
  refer: QName | null = null;

  getRefer() {
    return this.refer;
  }

  setRefer(refer: QName) {
    this.refer = refer;
  }
}
