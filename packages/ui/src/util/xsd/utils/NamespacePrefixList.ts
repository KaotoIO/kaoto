import { NamespaceContext } from '.';

export interface NamespacePrefixList extends NamespaceContext {
  getDeclaredPrefixes(): string[];
}
