import { XmlSchemaExternal } from './XmlSchemaExternal';
import type { XmlSchema } from '../XmlSchema';

export class XmlSchemaInclude extends XmlSchemaExternal {
  /**
   * Creates new XmlSchemaInclude
   */
  constructor(parent: XmlSchema) {
    super(parent);
  }
}
