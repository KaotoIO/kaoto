import { XmlSchemaType } from '../XmlSchemaType';
import type { XmlSchemaSimpleTypeContent } from './XmlSchemaSimpleTypeContent';

export class XmlSchemaSimpleType extends XmlSchemaType {
  content?: XmlSchemaSimpleTypeContent;

  getContent() {
    return this.content;
  }
  setContent(content: XmlSchemaSimpleTypeContent) {
    this.content = content;
  }
}
