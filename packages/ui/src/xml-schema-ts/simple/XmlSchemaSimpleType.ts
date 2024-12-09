import type { XmlSchemaSimpleTypeContent } from './XmlSchemaSimpleTypeContent';

import { XmlSchemaType } from '../XmlSchemaType';

export class XmlSchemaSimpleType extends XmlSchemaType {
  content?: XmlSchemaSimpleTypeContent;

  getContent() {
    return this.content;
  }
  setContent(content: XmlSchemaSimpleTypeContent) {
    this.content = content;
  }
}
