import { XmlSchemaAnnotated } from './XmlSchemaAnnotated';
import type { XmlSchemaContent } from './XmlSchemaContent';

/**
 * An abstract class for the schema content model.
 */
export abstract class XmlSchemaContentModel extends XmlSchemaAnnotated {
  abstract setContent(content: XmlSchemaContent | null): void;
  abstract getContent(): XmlSchemaContent | null;
}
