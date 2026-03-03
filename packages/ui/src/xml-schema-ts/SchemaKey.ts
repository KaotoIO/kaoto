export class SchemaKey {
  private readonly namespace: string;
  private readonly systemId: string;

  constructor(namespace?: string | null, systemId?: string | null) {
    this.namespace = namespace ?? '';
    this.systemId = systemId ?? '';
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
