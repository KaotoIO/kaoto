import { NamespaceContext } from './NamespaceContext';

export interface NamespacePrefixList extends NamespaceContext {
  getDeclaredPrefixes(): string[];
}
