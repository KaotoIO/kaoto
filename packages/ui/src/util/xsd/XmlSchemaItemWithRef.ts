import { XmlSchemaNamed, XmlSchemaRef } from './utils';
import { XmlSchemaItemWithRefBase } from '.';
export interface XmlSchemaItemWithRef<T extends XmlSchemaNamed> extends XmlSchemaItemWithRefBase {
  getRef(): XmlSchemaRef<T>;
}
