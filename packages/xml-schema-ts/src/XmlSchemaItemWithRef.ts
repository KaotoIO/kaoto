import { XmlSchemaNamed } from './utils/XmlSchemaNamed';
import { XmlSchemaRef } from './utils/XmlSchemaRef';
import { XmlSchemaItemWithRefBase } from './XmlSchemaItemWithRefBase';

export interface XmlSchemaItemWithRef<T extends XmlSchemaNamed> extends XmlSchemaItemWithRefBase {
  getRef(): XmlSchemaRef<T>;
}
