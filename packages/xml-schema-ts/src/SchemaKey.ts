export class SchemaKey {
  private namespace: string;
  private systemId: string;

  constructor(namespace?: string | null, systemId?: string | null) {
    this.namespace = namespace != null ? namespace : '';
    this.systemId = systemId != null ? systemId : '';
  }

  toString() {
    return this.namespace === '' ? this.systemId : `{${this.namespace}}${this.systemId}`;
  }

  getNamespace() {
    return this.namespace;
  }

  getSystemId() {
    return this.systemId;
  }
}
