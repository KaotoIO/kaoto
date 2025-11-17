import type { XmlSchema } from '../XmlSchema';
import { XmlSchemaExternal } from './XmlSchemaExternal';

export class XmlSchemaInclude extends XmlSchemaExternal {
  /**
   * Creates new XmlSchemaInclude
   */
  constructor(parent: XmlSchema) {
    super(parent);
  }
}
