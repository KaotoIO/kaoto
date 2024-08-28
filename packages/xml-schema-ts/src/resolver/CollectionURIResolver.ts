import { URIResolver } from './URIResolver';

export interface CollectionURIResolver extends URIResolver {
  setCollectionBaseURI(uri: string): void;

  getCollectionBaseURI(): string | undefined;
}
