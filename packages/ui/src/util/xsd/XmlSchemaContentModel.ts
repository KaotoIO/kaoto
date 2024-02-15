/**
 * An abstract class for the schema content model.
 */
import { XmlSchemaAnnotated, XmlSchemaContent } from '.';

export abstract class XmlSchemaContentModel extends XmlSchemaAnnotated {
  abstract setContent(content: XmlSchemaContent | null): void;
  abstract getContent(): XmlSchemaContent | null;
}
