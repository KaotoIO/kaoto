import type { XmlSchema } from '../XmlSchema';
import { XmlSchemaExternal } from './XmlSchemaExternal';

export class XmlSchemaImport extends XmlSchemaExternal {
  namespace: string | null = null;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(parent: XmlSchema) {
    super(parent);
  }

  getNamespace(): string | null {
    return this.namespace;
  }

  setNamespace(namespace: string) {
    this.namespace = namespace;
  }
}
