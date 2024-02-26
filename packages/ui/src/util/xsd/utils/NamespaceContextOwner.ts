import { NamespacePrefixList } from './NamespacePrefixList';

export interface NamespaceContextOwner {
  getNamespaceContext(): NamespacePrefixList | null;
}
