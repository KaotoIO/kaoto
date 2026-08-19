import type { XmlSchema } from '../XmlSchema';
import { XmlSchemaExternal } from './XmlSchemaExternal';

export class XmlSchemaInclude extends XmlSchemaExternal {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(parent: XmlSchema) {
    super(parent);
  }
}
