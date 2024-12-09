import type { XmlSchemaContent } from '../XmlSchemaContent';
import { XmlSchemaContentModel } from '../XmlSchemaContentModel';

/**
 * Class that represents the complex content model for complex types. Contains extensions or restrictions on a
 * complex type that has mixed content or elements only. Represents the World Wide Web Consortium (W3C)
 * complexContent element.
 */
export class XmlSchemaComplexContent extends XmlSchemaContentModel {
  /*
   * One of either the XmlSchemaComplexContentRestriction or XmlSchemaComplexContentExtension classes.
   */
  content: XmlSchemaContent | null = null;
  /*
   * Indicates that this type has a mixed content model. Character data is allowed to appear between the
   * child elements of the complex type.
   */
  private mixed: boolean = false;

  getContent() {
    return this.content;
  }

  setContent(content: XmlSchemaContent) {
    this.content = content;
  }

  isMixed() {
    return this.mixed;
  }

  setMixed(mixed: boolean) {
    this.mixed = mixed;
  }
}
