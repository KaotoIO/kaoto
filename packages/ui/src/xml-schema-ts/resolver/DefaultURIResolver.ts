import { CollectionURIResolver } from './CollectionURIResolver';

export class DefaultURIResolver implements CollectionURIResolver {
  private collectionBaseUri?: string;

  getCollectionBaseURI(): string | undefined {
    return this.collectionBaseUri;
  }

  resolveEntity(targetNamespace: string | null, schemaLocation: string, baseUri: string | null): string {
    throw new Error(
      `XML schema External entity resolution is not yet supported: [namespace:${targetNamespace}, schemaLocation:${schemaLocation}, baseUri:${baseUri}]`,
    );
  }

  setCollectionBaseURI(uri: string): void {
    this.collectionBaseUri = uri;
  }
}
