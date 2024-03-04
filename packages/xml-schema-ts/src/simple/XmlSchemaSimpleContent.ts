/**
 * Class for simple types and complex types with a simple content model. Represents the World Wide Web
 * Consortium (W3C) simpleContent element.
 */
import type { XmlSchemaContent } from '../XmlSchemaContent';
import { XmlSchemaContentModel } from '../XmlSchemaContentModel';

export class XmlSchemaSimpleContent extends XmlSchemaContentModel {
  /* One of XmlSchemaSimpleContentRestriction or XmlSchemaSimpleContentExtension. */
  content: XmlSchemaContent | null = null;

  getContent() {
    return this.content;
  }

  setContent(content: XmlSchemaContent) {
    this.content = content;
  }
}
