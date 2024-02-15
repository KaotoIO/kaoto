export interface URIResolver {
  resolveEntity(targetNamespace: string, schemaLocation: string, baseUri: string): File;
}
export interface CollectionURIResolver extends URIResolver {
  setCollectionBaseURI(uri: string): void;
  getCollectionBaseURI(): string | undefined;
}

export class DefaultURIResolver implements CollectionURIResolver {
  private collectionBaseUri?: string;

  getCollectionBaseURI(): string | undefined {
    return this.collectionBaseUri;
  }

  resolveEntity(targetNamespace: string, schemaLocation: string, baseUri: string): File {
    throw new Error(
      `XML schema External entity resolution is not yet supported: [namespace:${targetNamespace}, schemaLocation:${schemaLocation}, baseUri:${baseUri}]`,
    );
  }

  setCollectionBaseURI(uri: string): void {
    this.collectionBaseUri = uri;
  }
}
