import { XmlSchemaExternal } from './XmlSchemaExternal';
import { XmlSchema } from './XmlSchema';

export class XmlSchemaInclude extends XmlSchemaExternal {
  /**
   * Creates new XmlSchemaInclude
   */
  constructor(parent: XmlSchema) {
    super(parent);
  }
}
