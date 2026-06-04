export interface EntityResolveResult {
  content: string;
  resolvedPath: string;
}

export interface URIResolver {
  resolveEntity(targetNamespace: string | null, schemaLocation: string, baseUri: string | null): EntityResolveResult;
}
