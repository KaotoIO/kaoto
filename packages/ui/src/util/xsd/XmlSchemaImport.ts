import { XmlSchema, XmlSchemaExternal } from '.';

export class XmlSchemaImport extends XmlSchemaExternal {
  namespace: string | null = null;

  /**
   * Creates new XmlSchemaImport
   */
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
