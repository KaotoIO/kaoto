export interface URIResolver {
  resolveEntity(targetNamespace: string | null, schemaLocation: string, baseUri: string | null): string;
}
