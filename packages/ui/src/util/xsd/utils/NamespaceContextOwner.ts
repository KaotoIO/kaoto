import { NamespacePrefixList } from '.';

export interface NamespaceContextOwner {
  getNamespaceContext(): NamespacePrefixList | null;
}
