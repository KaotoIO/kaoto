import type { XmlSchema } from '../XmlSchema';
import { XmlSchemaExternal } from './XmlSchemaExternal';

export class XmlSchemaImport extends XmlSchemaExternal {
  namespace: string | null = null;

  getNamespace(): string | null {
    return this.namespace;
  }

  setNamespace(namespace: string) {
    this.namespace = namespace;
  }
}
